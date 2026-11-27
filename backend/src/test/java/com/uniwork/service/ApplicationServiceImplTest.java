package com.uniwork.service;

import com.uniwork.dto.request.CreateApplicationRequest;
import com.uniwork.dto.request.UpdateApplicationStatusRequest;
import com.uniwork.entity.Application;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.ApplicationStatusHistoryRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.impl.ApplicationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test cho {@link ApplicationServiceImpl} — tập trung vào
 * <b>chuyển trạng thái đơn ứng tuyển</b> (pipeline trạng thái), vì đây là
 * phần có nhiều luật nghiệp vụ nhất: quyền của nhà tuyển dụng, trạng thái
 * hợp lệ, ghi chú mặc định, ghi nhận kinh nghiệm làm việc và thông báo.
 */
@ExtendWith(MockitoExtension.class)
class ApplicationServiceImplTest {

    private static final Long EMPLOYER_USER_ID = 100L;
    private static final Long STUDENT_USER_ID = 200L;
    private static final String APPLICATION_SLUG = "app-abc123";

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationStatusHistoryRepository historyRepository;

    @Mock
    private JobPostRepository jobPostRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private WorkHistoryService workHistoryService;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private ApplicationServiceImpl applicationService;

    private Application application;
    private JobPost jobPost;

    @BeforeEach
    void setUp() {
        User employerUser = User.builder().id(EMPLOYER_USER_ID).email("employer@uniwork.vn").build();
        EmployerProfile employer = EmployerProfile.builder()
                .userId(EMPLOYER_USER_ID)
                .user(employerUser)
                .displayName("Quán Cà Phê Xinh")
                .build();

        jobPost = JobPost.builder()
                .id(1L)
                .slug("job-1")
                .title("Phục vụ ca đêm")
                .employer(employer)
                .status("OPEN")
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();

        StudentProfile student = StudentProfile.builder()
                .userId(STUDENT_USER_ID)
                .fullName("Nguyễn Văn A")
                .user(User.builder().id(STUDENT_USER_ID).email("student@uniwork.vn").build())
                .build();

        application = Application.builder()
                .id(10L)
                .slug(APPLICATION_SLUG)
                .jobPost(jobPost)
                .student(student)
                .status("PENDING")
                .build();
    }

    // ================================================================
    // A. QUYỀN
    // ================================================================

    @Test
    @DisplayName("NTD khác xử lý đơn -> Ném 403 FORBIDDEN")
    void updateStatus_ThrowsForbidden_WhenEmployerNotOwner() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("ACCEPTED")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> applicationService.updateStatus(APPLICATION_SLUG, req, 999L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn không tồn tại -> Ném 404 NOT_FOUND")
    void updateStatus_ThrowsNotFound_WhenApplicationMissing() {
        when(applicationRepository.findBySlug("khong-ton-tai")).thenReturn(Optional.empty());

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("ACCEPTED")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> applicationService.updateStatus("khong-ton-tai", req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ================================================================
    // B. TRẠNG THÁI HỢP LỆ
    // ================================================================

    @Test
    @DisplayName("Trạng thái không hợp lệ -> Ném 400 BAD_REQUEST")
    void updateStatus_ThrowsBadRequest_WhenStatusInvalid() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("KHONG_CO_TRANG_THAI")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Trạng thái null -> Ném 400 BAD_REQUEST")
    void updateStatus_ThrowsBadRequest_WhenStatusNull() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder().build();

        AppException ex = assertThrows(AppException.class,
                () -> applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    // ================================================================
    // C. CHUYỂN TRẠNG THÁI
    // ================================================================

    @Test
    @DisplayName("Chuyển sang SHORTLISTED -> Lưu đơn, ghi lịch sử, báo sinh viên")
    void updateStatus_Success_Shortlisted() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("shortlisted")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("SHORTLISTED", application.getStatus());
        verify(applicationRepository).save(any(Application.class));
        verify(historyRepository).save(any());
        verify(notificationService).push(
                eq(STUDENT_USER_ID),
                eq("APPLICATION_STATUS"),
                anyString(),
                anyString(),
                anyString());
    }

    @Test
    @DisplayName("Chuyển sang COMPLETED -> Ghi nhận kinh nghiệm làm việc cho sinh viên")
    void updateStatus_RecordsWorkHistory_WhenCompleted() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        verify(workHistoryService).recordCompletion(any(Application.class), anyString());
    }

    @Test
    @DisplayName("Đơn đã COMPLETED, chuyển sang COMPLETED lần nữa -> Không ghi nhận lại kinh nghiệm")
    void updateStatus_DoesNotRecordWorkHistory_WhenAlreadyCompleted() {
        application.setStatus("COMPLETED");

        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        verify(workHistoryService, never()).recordCompletion(any(), anyString());
    }

    @Test
    @DisplayName("Chuyển sang trạng thái khác (không phải COMPLETED) -> Không ghi nhận kinh nghiệm")
    void updateStatus_DoesNotRecordWorkHistory_WhenNotCompleted() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("REJECTED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        verify(workHistoryService, never()).recordCompletion(any(), anyString());
    }

    @Test
    @DisplayName("Chuyển sang ACCEPTED -> Không ghi nhận kinh nghiệm làm việc")
    void updateStatus_DoesNotRecordWorkHistory_WhenAccepted() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("ACCEPTED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("ACCEPTED", application.getStatus());
        verify(workHistoryService, never()).recordCompletion(any(), anyString());
    }

    @Test
    @DisplayName("Ghi chú do NTD nhập được giữ nguyên trong lịch sử trạng thái")
    void updateStatus_UsesCustomNote_WhenProvided() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("REJECTED")
                .note("Kinh nghiệm chưa phù hợp")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        verify(historyRepository).save(argThat(history ->
                "Kinh nghiệm chưa phù hợp".equals(history.getNote())));
    }

    @Test
    @DisplayName("Nhận 1/2 ứng viên -> tin chuyển từ OPEN sang IN_PROGRESS (Đang tuyển thêm)")
    void updateStatus_Accepted_SetsJobInProgress_WhenPartiallyFilled() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(1L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("ACCEPTED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("IN_PROGRESS", jobPost.getStatus());
        assertEquals((short) 1, jobPost.getPositionsFilled());
        verify(jobPostRepository).save(jobPost);
    }

    @Test
    @DisplayName("Nhận đủ 2/2 ứng viên từ IN_PROGRESS -> tin chuyển sang FILLED (Đã nhận đủ người)")
    void updateStatus_Accepted_SetsJobFilled_WhenAllPositionsFilled() {
        jobPost.setStatus("IN_PROGRESS");
        jobPost.setPositionsFilled((short) 1);
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(2L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("ACCEPTED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("FILLED", jobPost.getStatus());
        assertEquals((short) 2, jobPost.getPositionsFilled());
        verify(jobPostRepository).save(jobPost);
    }

    @Test
    @DisplayName("Sinh viên vẫn ứng tuyển được vào tin đang ở trạng thái IN_PROGRESS (Đang tuyển thêm)")
    void create_AllowsApplyingToInProgressJob() {
        jobPost.setStatus("IN_PROGRESS");
        StudentProfile student = application.getStudent();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull("job-1")).thenReturn(Optional.of(jobPost));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(student));
        when(applicationRepository.existsByJobPostIdAndStudentUserId(jobPost.getId(), STUDENT_USER_ID))
                .thenReturn(false);
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });
        when(userRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(student.getUser()));

        CreateApplicationRequest req = CreateApplicationRequest.builder()
                .jobId("job-1")
                .coverLetter("Em muốn ứng tuyển suất còn lại")
                .build();

        var res = applicationService.create(req, STUDENT_USER_ID);

        assertEquals("PENDING", res.getStatus());
        verify(applicationRepository).save(any(Application.class));
    }

    // ================================================================
    // D. ĐỒNG BỘ SUẤT & TỰ ĐỘNG HOÀN THÀNH TIN
    // ================================================================

    @Test
    @DisplayName("Đơn chuyển COMPLETED khi tin IN_PROGRESS (còn suất) -> positionsFilled giữ nguyên (tính cả COMPLETED), tin vẫn IN_PROGRESS")
    void updateStatus_Completed_KeepsPositionsFilledAndInProgress_WhenSlotsRemain() {
        application.setStatus("ACCEPTED");
        jobPost.setStatus("IN_PROGRESS");
        jobPost.setPositionsCount((short) 2);
        jobPost.setPositionsFilled((short) 1);

        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(0L);
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "COMPLETED")).thenReturn(1L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals((short) 1, jobPost.getPositionsFilled());
        assertEquals("IN_PROGRESS", jobPost.getStatus());
        assertNull(jobPost.getClosedAt());
        verify(jobPostRepository).save(jobPost);
    }

    @Test
    @DisplayName("Đơn chuyển COMPLETED khi tin FILLED vẫn còn đơn ACCEPTED khác -> positionsFilled không tụt, tin vẫn FILLED")
    void updateStatus_Completed_KeepsFilledStatus_WhenAnotherAcceptedRemains() {
        application.setStatus("ACCEPTED");
        jobPost.setStatus("FILLED");
        jobPost.setPositionsCount((short) 2);
        jobPost.setPositionsFilled((short) 2);

        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(1L);
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "COMPLETED")).thenReturn(1L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals((short) 2, jobPost.getPositionsFilled());
        assertEquals("FILLED", jobPost.getStatus());
        assertNull(jobPost.getClosedAt());
    }

    @Test
    @DisplayName("Tất cả đơn của tin FILLED đã COMPLETED (ACCEPTED == 0) -> tự động chuyển tin sang COMPLETED và cập nhật closedAt")
    void updateStatus_Completed_AutoCompletesFilledJob_WhenNoAcceptedRemains() {
        application.setStatus("ACCEPTED");
        jobPost.setStatus("FILLED");
        jobPost.setPositionsCount((short) 2);
        jobPost.setPositionsFilled((short) 2);

        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(0L);
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "COMPLETED")).thenReturn(2L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("COMPLETED", jobPost.getStatus());
        assertEquals((short) 2, jobPost.getPositionsFilled());
        assertNotNull(jobPost.getClosedAt());
    }

    @Test
    @DisplayName("Đơn cuối cùng của tin CLOSED chuyển sang COMPLETED (ACCEPTED == 0) -> tự động chuyển tin sang COMPLETED và giữ nguyên closedAt")
    void updateStatus_Completed_AutoCompletesClosedJob_AndPreservesClosedAt() {
        application.setStatus("ACCEPTED");
        java.time.LocalDateTime originalClosedAt = java.time.LocalDateTime.now().minusDays(2);
        jobPost.setStatus("CLOSED");
        jobPost.setPositionsCount((short) 3);
        jobPost.setPositionsFilled((short) 1);
        jobPost.setClosedAt(originalClosedAt);

        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "ACCEPTED")).thenReturn(0L);
        when(applicationRepository.countByJobPostIdAndStatus(jobPost.getId(), "COMPLETED")).thenReturn(1L);

        UpdateApplicationStatusRequest req = UpdateApplicationStatusRequest.builder()
                .status("COMPLETED")
                .build();

        applicationService.updateStatus(APPLICATION_SLUG, req, EMPLOYER_USER_ID);

        assertEquals("COMPLETED", jobPost.getStatus());
        assertEquals((short) 1, jobPost.getPositionsFilled());
        assertEquals(originalClosedAt, jobPost.getClosedAt());
    }
}
