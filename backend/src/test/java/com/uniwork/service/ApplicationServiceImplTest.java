package com.uniwork.service;

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
}
