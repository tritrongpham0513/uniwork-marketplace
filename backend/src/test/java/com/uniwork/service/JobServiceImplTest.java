package com.uniwork.service;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
import com.uniwork.repository.DistrictRepository;
import com.uniwork.repository.EmployerProfileRepository;
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
    private JobNotifyService jobNotifyService;

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

    /** Tin tuyển dụng mới đăng, đang chờ duyệt. */
    private JobPost pendingJob() {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phục vụ ca đêm")
                .employer(employer)
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build())
                .status("PENDING_REVIEW")
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }
}
