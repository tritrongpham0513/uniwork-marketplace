package com.uniwork.service;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Role;
import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.DistrictRepository;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobPositionRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.JobPostScheduleRepository;
import com.uniwork.repository.JobPostSkillRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SkillRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WardRepository;
import com.uniwork.service.impl.JobServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test cho {@link JobServiceImpl} — tập trung vào
 * <b>vòng đời tin tuyển dụng</b>: đăng tin -> chờ duyệt -> quản trị viên
 * duyệt/từ chối.
 *
 * <p>Quy trình duyệt là quyết định kiến trúc (xem
 * {@code docs/adr/0003-job-requires-admin-review-before-going-live.md}):
 * tin mới đăng luôn ở {@code PENDING_REVIEW}, chỉ khi quản trị viên duyệt
 * mới chuyển sang {@code OPEN} và hiện công khai.
 */
@ExtendWith(MockitoExtension.class)
class JobServiceImplTest {

    private static final Long EMPLOYER_USER_ID = 100L;
    private static final Long ADMIN_USER_ID = 1L;
    private static final String JOB_SLUG = "job-abc123";

    @Mock
    private JobPostRepository jobPostRepository;

    @Mock
    private JobPostScheduleRepository scheduleRepository;

    @Mock
    private JobPostSkillRepository jobSkillRepository;

    @Mock
    private JobCategoryRepository jobCategoryRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private ProvinceRepository provinceRepository;

    @Mock
    private DistrictRepository districtRepository;

    @Mock
    private WardRepository wardRepository;

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private EmployerProfileRepository employerProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private FileUploadRepository fileUploadRepository;

    @Mock
    private JobNotifyService jobNotifyService;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private JobServiceImpl jobService;

    private EmployerProfile employer;

    @BeforeEach
    void setUp() {
        employer = EmployerProfile.builder()
                .userId(EMPLOYER_USER_ID)
                .displayName("Quán Cà Phê Xinh")
                .user(User.builder().id(EMPLOYER_USER_ID).email("employer@uniwork.vn").build())
                .build();
    }

    /** Yêu cầu đăng tin hợp lệ tối thiểu. */
    private JobUpsertRequest validRequest() {
        return JobUpsertRequest.builder()
                .title("Phục vụ ca đêm")
                .description("Phục vụ bàn, thu ngân")
                .category(JobUpsertRequest.CategoryRef.builder().id("CAT01").name("Nhà hàng").build())
                .employmentType("PART_TIME")
                .workMode("ONSITE")
                .salaryType("HOURLY")
                .salaryMin(25000)
                .salaryMax(30000)
                .positionsCount(2)
                .build();
    }

    // ================================================================
    // A. ĐĂNG TIN — VALIDATION
    // ================================================================

    @Test
    @DisplayName("Đăng tin thiếu tiêu đề -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenTitleMissing() {
        JobUpsertRequest req = validRequest();
        req.setTitle("  ");

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng tin thiếu nhóm việc -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenCategoryMissing() {
        JobUpsertRequest req = validRequest();
        req.setCategory(null);

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Đăng tin với lương âm -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenSalaryNegative() {
        JobUpsertRequest req = validRequest();
        req.setSalaryMin(-1);

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(req, EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Đăng tin khi không có hồ sơ nhà tuyển dụng -> Ném 404 NOT_FOUND")
    void create_ThrowsNotFound_WhenEmployerProfileMissing() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(validRequest(), EMPLOYER_USER_ID));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ================================================================
    // B. ĐĂNG TIN — VÒNG ĐỜI
    // ================================================================

    @Test
    @DisplayName("Đăng tin -> lưu với trạng thái PENDING_REVIEW (chưa hiện công khai)")
    void create_SetsStatusPendingReview() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            return job;
        });

        jobService.create(validRequest(), EMPLOYER_USER_ID);

        verify(jobPostRepository).save(argThat(job ->
                "PENDING_REVIEW".equals(job.getStatus())
                        && "Phục vụ ca đêm".equals(job.getTitle())
                        && job.getPositionsFilled() == 0));
    }

    @Test
    @DisplayName("Đăng tin -> báo cho các quản trị viên xử lý")
    void create_NotifiesAdmins() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            return job;
        });
        when(userRepository.findByRoleCode("ADMIN")).thenReturn(List.of(User.builder().id(ADMIN_USER_ID).build()));

        jobService.create(validRequest(), EMPLOYER_USER_ID);

        verify(notificationService).pushToAll(
                eq(List.of(ADMIN_USER_ID)),
                eq("JOB"),
                anyString(),
                anyString(),
                eq("/admin/jobs"));
    }

    @Test
    @DisplayName("Đăng tin -> tin mới chưa có publishedAt (chỉ set khi duyệt)")
    void create_DoesNotSetPublishedAt() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            return job;
        });

        jobService.create(validRequest(), EMPLOYER_USER_ID);

        verify(jobPostRepository).save(argThat(job -> job.getPublishedAt() == null));
    }

    // ================================================================
    // C. DUYỆT TIN
    // ================================================================

    @Test
    @DisplayName("Duyệt tin -> chuyển sang OPEN, set reviewedAt + publishedAt")
    void review_Approve_SetsStatusOpen() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        jobService.review(JOB_SLUG, "APPROVE", null, ADMIN_USER_ID);

        assertEquals("OPEN", job.getStatus());
        assertNotNull(job.getReviewedAt());
        assertNotNull(job.getPublishedAt());
        assertNull(job.getRejectReason());
    }

    @Test
    @DisplayName("Duyệt tin -> báo cho nhà tuyển dụng và báo các sinh viên đang theo dõi")
    void review_Approve_NotifiesEmployerAndSubscribers() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        jobService.review(JOB_SLUG, "APPROVE", null, ADMIN_USER_ID);

        verify(notificationService).push(
                eq(EMPLOYER_USER_ID), eq("JOB"), anyString(), anyString(), eq("/employer/jobs"));
        verify(jobNotifyService).notifySubscribers(any(JobPost.class));
    }

    @Test
    @DisplayName("Từ chối tin -> chuyển sang REJECTED, lưu lý do, KHÔNG báo subscribers")
    void review_Reject_SetsStatusRejected() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        jobService.review(JOB_SLUG, "REJECT", "Thiếu thông tin lương", ADMIN_USER_ID);

        assertEquals("REJECTED", job.getStatus());
        assertEquals("Thiếu thông tin lương", job.getRejectReason());
        assertNotNull(job.getReviewedAt());
        verify(jobNotifyService, never()).notifySubscribers(any());
    }

    @Test
    @DisplayName("Từ chối tin không nêu lý do -> dùng lý do mặc định")
    void review_Reject_UsesDefaultReason() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        jobService.review(JOB_SLUG, "REJECT", null, ADMIN_USER_ID);

        assertEquals("Tin không đáp ứng yêu cầu.", job.getRejectReason());
    }

    @Test
    @DisplayName("Hành động duyệt không hợp lệ -> Ném 400 BAD_REQUEST")
    void review_ThrowsBadRequest_WhenActionInvalid() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        AppException ex = assertThrows(AppException.class,
                () -> jobService.review(JOB_SLUG, "XOA", null, ADMIN_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Duyệt tin không tồn tại -> Ném 404 NOT_FOUND")
    void review_ThrowsNotFound_WhenJobMissing() {
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> jobService.review(JOB_SLUG, "APPROVE", null, ADMIN_USER_ID));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    // ================================================================
    // D. XEM CHI TIẾT TIN — KIỂM SOÁT TRẠNG THÁI & QUYỀN XEM TRƯỚC
    // ================================================================

    @Test
    @DisplayName("Khách ẩn danh xem tin OPEN -> thành công và tăng viewCount")
    void detail_AnonymousCanViewOpenJob_AndIncrementsViewCount() {
        JobPost job = jobWithStatus("OPEN");
        job.setViewCount(5);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        var res = jobService.detail(JOB_SLUG);

        assertEquals(JOB_SLUG, res.getId());
        assertEquals(6, job.getViewCount());
        verify(jobPostRepository).save(job);
    }

    @Test
    @DisplayName("Khách ẩn danh xem tin IN_PROGRESS (Đang tuyển thêm) -> thành công và tăng viewCount")
    void detail_AnonymousCanViewInProgressJob_AndIncrementsViewCount() {
        JobPost job = jobWithStatus("IN_PROGRESS");
        job.setViewCount(2);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        var res = jobService.detail(JOB_SLUG);

        assertEquals(JOB_SLUG, res.getId());
        assertEquals(3, job.getViewCount());
        verify(jobPostRepository).save(job);
    }

    @Test
    @DisplayName("Sửa tin đang IN_PROGRESS (Đang tuyển thêm) -> quay lại PENDING_REVIEW để duyệt lại")
    void update_InProgressJob_MovesBackToPendingReview() {
        JobPost job = jobWithStatus("IN_PROGRESS");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.update(JOB_SLUG, validRequest(), EMPLOYER_USER_ID);

        assertEquals("PENDING_REVIEW", res.getStatus());
        assertEquals("PENDING_REVIEW", job.getStatus());
    }

    @Test
    @DisplayName("Khách ẩn danh xem tin REJECTED -> Ném 404 NOT_FOUND")
    void detail_AnonymousCannotViewRejectedJob() {
        JobPost job = jobWithStatus("REJECTED");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        AppException ex = assertThrows(AppException.class, () -> jobService.detail(JOB_SLUG));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sinh viên hoặc NTD khác xem tin PENDING_REVIEW / REJECTED -> Ném 404 NOT_FOUND")
    void detail_NonOwnerNonAdminCannotViewNonOpenJob() {
        JobPost job = jobWithStatus("PENDING_REVIEW");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        User student = userWithRole(200L, "STUDENT");
        User otherEmployer = userWithRole(300L, "EMPLOYER");

        assertEquals(HttpStatus.NOT_FOUND,
                assertThrows(AppException.class, () -> jobService.detail(JOB_SLUG, student)).getStatus());
        assertEquals(HttpStatus.NOT_FOUND,
                assertThrows(AppException.class, () -> jobService.detail(JOB_SLUG, otherEmployer)).getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chính nhà tuyển dụng sở hữu xem trước tin REJECTED -> trả về kèm rejectReason, không tăng viewCount")
    void detail_OwnerEmployerCanPreviewRejectedJob_WithoutIncrementingViews() {
        JobPost job = jobWithStatus("REJECTED");
        job.setRejectReason("Thiếu mức lương rõ ràng");
        job.setViewCount(3);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        User owner = userWithRole(EMPLOYER_USER_ID, "EMPLOYER");

        var res = jobService.detail(JOB_SLUG, owner);

        assertEquals("REJECTED", res.getStatus());
        assertEquals("Thiếu mức lương rõ ràng", res.getRejectReason());
        assertEquals(3, job.getViewCount());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Quản trị viên xem trước tin PENDING_REVIEW -> thành công, không tăng viewCount")
    void detail_AdminCanPreviewPendingJob_WithoutIncrementingViews() {
        JobPost job = jobWithStatus("PENDING_REVIEW");
        job.setViewCount(0);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        User admin = userWithRole(ADMIN_USER_ID, "ADMIN");

        var res = jobService.detail(JOB_SLUG, admin);

        assertEquals("PENDING_REVIEW", res.getStatus());
        assertEquals(0, job.getViewCount());
        verify(jobPostRepository, never()).save(any());
    }

    // ================================================================
    // E. CHUYỂN TRẠNG THÁI TIN TUYỂN DỤNG (NHÀ TUYỂN DỤNG)
    // ================================================================

    @Test
    @DisplayName("Đóng tin đang OPEN -> chuyển sang CLOSED, cập nhật closedAt, không gán deletedAt")
    void updateStatus_Close_FromOpen_SetsClosedAndClosedAt() {
        JobPost job = jobWithStatus("OPEN");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.updateStatus(JOB_SLUG, "CLOSED", EMPLOYER_USER_ID);

        assertEquals("CLOSED", res.getStatus());
        assertEquals("CLOSED", job.getStatus());
        assertNotNull(job.getClosedAt());
        assertNull(job.getDeletedAt());
    }

    @Test
    @DisplayName("Đóng tin đang IN_PROGRESS -> chuyển sang CLOSED, cập nhật closedAt")
    void updateStatus_Close_FromInProgress_SetsClosed() {
        JobPost job = jobWithStatus("IN_PROGRESS");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.updateStatus(JOB_SLUG, "CLOSED", EMPLOYER_USER_ID);

        assertEquals("CLOSED", res.getStatus());
        assertNotNull(job.getClosedAt());
        assertNull(job.getDeletedAt());
    }

    @Test
    @DisplayName("Đóng tin ở trạng thái không hợp lệ (PENDING_REVIEW, FILLED, COMPLETED, CLOSED, REJECTED) -> Ném 400")
    void updateStatus_Close_ThrowsBadRequest_WhenInvalidCurrentStatus() {
        for (String invalidStatus : List.of("PENDING_REVIEW", "FILLED", "COMPLETED", "CLOSED", "REJECTED")) {
            JobPost job = jobWithStatus(invalidStatus);
            when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

            AppException ex = assertThrows(AppException.class,
                    () -> jobService.updateStatus(JOB_SLUG, "CLOSED", EMPLOYER_USER_ID));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus(), "Status: " + invalidStatus);
        }
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mở lại tin CLOSED với 0 suất đã nhận -> về OPEN và xoá closedAt")
    void updateStatus_Reopen_WithZeroFilled_SetsOpenAndClearsClosedAt() {
        JobPost job = jobWithStatus("CLOSED");
        job.setClosedAt(LocalDateTime.now().minusDays(1));
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(0L);
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "COMPLETED")).thenReturn(0L);
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.updateStatus(JOB_SLUG, "OPEN", EMPLOYER_USER_ID);

        assertEquals("OPEN", res.getStatus());
        assertEquals("OPEN", job.getStatus());
        assertNull(job.getClosedAt());
        assertEquals((short) 0, job.getPositionsFilled());
    }

    @Test
    @DisplayName("Mở lại tin CLOSED với 1/2 suất đã nhận (ACCEPTED + COMPLETED) -> về IN_PROGRESS và xoá closedAt")
    void updateStatus_Reopen_WithPartialFilled_SetsInProgressAndClearsClosedAt() {
        JobPost job = jobWithStatus("CLOSED");
        job.setPositionsCount((short) 2);
        job.setClosedAt(LocalDateTime.now().minusDays(1));
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(0L);
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "COMPLETED")).thenReturn(1L);
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.updateStatus(JOB_SLUG, "OPEN", EMPLOYER_USER_ID);

        assertEquals("IN_PROGRESS", res.getStatus());
        assertEquals("IN_PROGRESS", job.getStatus());
        assertNull(job.getClosedAt());
        assertEquals((short) 1, job.getPositionsFilled());
    }

    @Test
    @DisplayName("Mở lại tin CLOSED khi đã nhận đủ suất (ACCEPTED + COMPLETED >= positionsCount) -> Ném 400")
    void updateStatus_Reopen_ThrowsBadRequest_WhenPositionsFull() {
        JobPost job = jobWithStatus("CLOSED");
        job.setPositionsCount((short) 2);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(1L);
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "COMPLETED")).thenReturn(1L);

        AppException ex = assertThrows(AppException.class,
                () -> jobService.updateStatus(JOB_SLUG, "OPEN", EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mở lại tin không ở trạng thái CLOSED -> Ném 400")
    void updateStatus_Reopen_ThrowsBadRequest_WhenNotClosed() {
        for (String status : List.of("OPEN", "IN_PROGRESS", "PENDING_REVIEW", "FILLED", "COMPLETED", "REJECTED")) {
            JobPost job = jobWithStatus(status);
            when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

            AppException ex = assertThrows(AppException.class,
                    () -> jobService.updateStatus(JOB_SLUG, "OPEN", EMPLOYER_USER_ID));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus(), "Status: " + status);
        }
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hoàn thành tin thủ công từ OPEN / IN_PROGRESS / FILLED (không còn ACCEPTED) -> chuyển COMPLETED, set closedAt")
    void updateStatus_Complete_FromAllowedStatuses_SetsCompletedAndClosedAt() {
        for (String status : List.of("OPEN", "IN_PROGRESS", "FILLED")) {
            JobPost job = jobWithStatus(status);
            when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
            when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(0L);
            when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

            var res = jobService.updateStatus(JOB_SLUG, "COMPLETED", EMPLOYER_USER_ID);

            assertEquals("COMPLETED", res.getStatus(), "From status: " + status);
            assertNotNull(job.getClosedAt());
        }
    }

    @Test
    @DisplayName("Hoàn thành tin thủ công từ CLOSED -> chuyển COMPLETED và giữ nguyên closedAt cũ")
    void updateStatus_Complete_FromClosed_PreservesExistingClosedAt() {
        JobPost job = jobWithStatus("CLOSED");
        LocalDateTime closedAt = LocalDateTime.now().minusDays(3);
        job.setClosedAt(closedAt);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(0L);
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.updateStatus(JOB_SLUG, "COMPLETED", EMPLOYER_USER_ID);

        assertEquals("COMPLETED", res.getStatus());
        assertEquals(closedAt, job.getClosedAt());
    }

    @Test
    @DisplayName("Hoàn thành tin thủ công khi vẫn còn đơn ACCEPTED -> Ném 400")
    void updateStatus_Complete_ThrowsBadRequest_WhenAcceptedApplicationsRemain() {
        JobPost job = jobWithStatus("FILLED");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED")).thenReturn(1L);

        AppException ex = assertThrows(AppException.class,
                () -> jobService.updateStatus(JOB_SLUG, "COMPLETED", EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hoàn thành tin từ trạng thái không hợp lệ (PENDING_REVIEW, REJECTED, COMPLETED) -> Ném 400")
    void updateStatus_Complete_ThrowsBadRequest_WhenInvalidCurrentStatus() {
        for (String status : List.of("PENDING_REVIEW", "REJECTED", "COMPLETED", "CANCELLED")) {
            JobPost job = jobWithStatus(status);
            when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

            AppException ex = assertThrows(AppException.class,
                    () -> jobService.updateStatus(JOB_SLUG, "COMPLETED", EMPLOYER_USER_ID));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus(), "Status: " + status);
        }
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("User không phải chủ tin gọi đổi trạng thái -> Ném 404 và không lưu")
    void updateStatus_ThrowsNotFound_WhenNotOwner() {
        JobPost job = jobWithStatus("OPEN");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        AppException ex = assertThrows(AppException.class,
                () -> jobService.updateStatus(JOB_SLUG, "CLOSED", 999L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Trạng thái đích rỗng hoặc không hỗ trợ (DRAFT / INVALID) -> Ném 400")
    void updateStatus_ThrowsBadRequest_WhenTargetStatusInvalid() {
        JobPost job = jobWithStatus("OPEN");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(AppException.class,
                        () -> jobService.updateStatus(JOB_SLUG, null, EMPLOYER_USER_ID)).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(AppException.class,
                        () -> jobService.updateStatus(JOB_SLUG, "DRAFT", EMPLOYER_USER_ID)).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(AppException.class,
                        () -> jobService.updateStatus(JOB_SLUG, "INVALID", EMPLOYER_USER_ID)).getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sửa nội dung tin đang CLOSED -> quay lại PENDING_REVIEW để đảm bảo ADR 0003")
    void update_ClosedJob_MovesBackToPendingReview() {
        JobPost job = jobWithStatus("CLOSED");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = jobService.update(JOB_SLUG, validRequest(), EMPLOYER_USER_ID);

        assertEquals("PENDING_REVIEW", res.getStatus());
        assertEquals("PENDING_REVIEW", job.getStatus());
    }

    /** Tạo user giả lập với role code tương ứng. */
    private static User userWithRole(Long id, String roleCode) {
        Role role = new Role();
        role.setCode(roleCode);
        return User.builder().id(id).role(role).build();
    }

    /** Tin tuyển dụng mới đăng, đang chờ duyệt. */
    private JobPost pendingJob() {
        return jobWithStatus("PENDING_REVIEW");
    }

    private JobPost jobWithStatus(String status) {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phục vụ ca đêm")
                .employer(employer)
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build())
                .status(status)
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }
}
