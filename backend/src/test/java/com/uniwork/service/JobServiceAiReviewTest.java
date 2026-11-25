package com.uniwork.service;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.dto.response.AiReviewResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
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
import com.uniwork.service.ai.AiProviderException;
import com.uniwork.service.ai.AiReviewService;
import com.uniwork.service.ai.JobAiReviewScheduler;
import com.uniwork.service.impl.JobServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test cho {@link JobServiceImpl} — kiểm duyệt AI ở nền (ticket 04).
 *
 * <p>Kiểm tra ở <b>lớp nghiệp vụ tin tuyển dụng</b>: lớp này có phát sinh lệnh
 * kiểm duyệt AI hay không, chứ không kiểm tra bên trong AI.
 *
 * <p>Quy tắc (CONTRACT.md mục 6.1):
 * <ul>
 *   <li>Đăng tin mới → có lệnh kiểm duyệt.</li>
 *   <li>Sửa tin đã được duyệt (quay lại hàng đợi duyệt) → có lệnh kiểm duyệt.</li>
 *   <li>Sửa tin vốn đang chờ duyệt → không có lệnh kiểm duyệt.</li>
 *   <li>Xoá tin → không có lệnh kiểm duyệt.</li>
 *   <li>AI lỗi → luồng đăng tin vẫn thành công.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class JobServiceAiReviewTest {

    private static final Long EMPLOYER_USER_ID = 100L;
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

    /** Lớp cửa chạy nền — điểm mà lớp nghiệp vụ phát sinh lệnh kiểm duyệt. */
    @Mock
    private JobAiReviewScheduler jobAiReviewScheduler;

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

        // Lớp cửa AI được tiêm bằng setter (không bắt buộc) nên Mockito không tự
        // điền — phải gán tay để test bắt được lệnh kiểm duyệt phát sinh.
        ReflectionTestUtils.setField(jobService, "jobAiReviewScheduler", jobAiReviewScheduler);
    }

    /** Các phụ thuộc cần cho luồng đăng tin. */
    private void stubCreateDependencies() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            return job;
        });
    }

    /** Các phụ thuộc cần cho luồng sửa tin (tin đã có trong DB). */
    private void stubUpdateDependencies(JobPost job) {
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ================================================================
    // A. ĐĂNG TIN MỚI → CÓ LỆNH KIỂM DUYỆT AI
    // ================================================================

    @Test
    @DisplayName("Đăng tin mới -> phát sinh lệnh kiểm duyệt AI với slug của tin vừa tạo")
    void create_SchedulesAiReview() {
        stubCreateDependencies();

        jobService.create(validRequest(), EMPLOYER_USER_ID);

        verify(jobAiReviewScheduler).scheduleReview(anyString());
    }

    @Test
    @DisplayName("Đăng tin mới -> lệnh kiểm duyệt mang đúng slug của tin (không phải id số)")
    void create_SchedulesAiReview_WithJobSlug() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            job.setSlug("job-xyz789");
            return job;
        });

        jobService.create(validRequest(), EMPLOYER_USER_ID);

        verify(jobAiReviewScheduler).scheduleReview("job-xyz789");
    }

    // ================================================================
    // B. SỬA TIN ĐÃ ĐƯỢC DUYỆT → CÓ LỆNH KIỂM DUYỆT AI
    // ================================================================

    @Test
    @DisplayName("Sửa tin đã được duyệt (OPEN) -> tin quay lại hàng đợi duyệt VÀ phát sinh lệnh kiểm duyệt AI")
    void update_SchedulesAiReview_WhenJobWasOpen() {
        JobPost job = jobWithStatus("OPEN");
        stubUpdateDependencies(job);

        jobService.update(JOB_SLUG, validRequest(), EMPLOYER_USER_ID);

        assertEquals("PENDING_REVIEW", job.getStatus());
        verify(jobAiReviewScheduler).scheduleReview(JOB_SLUG);
    }

    // ================================================================
    // C. SỬA TIN VẪN ĐANG CHỜ DUYỆT → KHÔNG GỌI LẠI AI
    // ================================================================

    @Test
    @DisplayName("Sửa tin vốn đang chờ duyệt -> KHÔNG phát sinh lệnh kiểm duyệt AI (giữ hạn mức)")
    void update_DoesNotScheduleAiReview_WhenJobAlreadyPending() {
        JobPost job = jobWithStatus("PENDING_REVIEW");
        stubUpdateDependencies(job);

        jobService.update(JOB_SLUG, validRequest(), EMPLOYER_USER_ID);

        assertEquals("PENDING_REVIEW", job.getStatus());
        verify(jobAiReviewScheduler, never()).scheduleReview(anyString());
    }

    // ================================================================
    // D. XOÁ TIN → KHÔNG GỌI AI
    // ================================================================

    @Test
    @DisplayName("Xoá tin -> KHÔNG phát sinh lệnh kiểm duyệt AI")
    void remove_DoesNotScheduleAiReview() {
        JobPost job = jobWithStatus("OPEN");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        jobService.remove(JOB_SLUG, EMPLOYER_USER_ID);

        verify(jobAiReviewScheduler, never()).scheduleReview(anyString());
    }

    // ================================================================
    // E. AI LỖI → LUỒNG ĐĂNG TIN VẪN THÀNH CÔNG
    // ================================================================

    @Test
    @DisplayName("AI lỗi (hết hạn mức) -> luồng đăng tin vẫn thành công, không lỗi 500 cho nhà tuyển dụng")
    void create_Succeeds_EvenWhenAiFails() {
        stubCreateDependencies();
        doThrow(new AiProviderException("QUOTA_EXCEEDED", "Đã hết hạn mức gọi AI."))
                .when(jobAiReviewScheduler).scheduleReview(anyString());

        assertDoesNotThrow(() -> jobService.create(validRequest(), EMPLOYER_USER_ID));

        // Tin vẫn được lưu với trạng thái chờ duyệt — AI không được tự chuyển trạng thái.
        verify(jobPostRepository).save(argThat(job -> "PENDING_REVIEW".equals(job.getStatus())));
    }

    @Test
    @DisplayName("AI lỗi (503 AI_UNAVAILABLE) -> luồng sửa tin vẫn thành công")
    void update_Succeeds_EvenWhenAiUnavailable() {
        JobPost job = jobWithStatus("OPEN");
        stubUpdateDependencies(job);
        doThrow(new AppException("Dịch vụ AI đang gặp sự cố.",
                HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE"))
                .when(jobAiReviewScheduler).scheduleReview(anyString());

        assertDoesNotThrow(() -> jobService.update(JOB_SLUG, validRequest(), EMPLOYER_USER_ID));
        assertEquals("PENDING_REVIEW", job.getStatus());
    }

    // ================================================================
    // F. LỚP CỬA CHẠY NỀN — NUỐT LỖI, KHÔNG GHI KHOÁ API
    // ================================================================

    @Test
    @DisplayName("Lớp cửa chạy nền -> nuốt lỗi nhà cung cấp AI, không ném ra ngoài")
    void scheduler_SwallowsProviderError() {
        AiReviewService aiReviewService = mock(AiReviewService.class);
        when(aiReviewService.reviewJob(anyString(), isNull()))
                .thenThrow(new AiProviderException("SERVICE_ERROR", "Dịch vụ AI đang gặp sự cố."));

        JobAiReviewScheduler scheduler = new JobAiReviewScheduler(aiReviewService);

        assertDoesNotThrow(() -> scheduler.scheduleReview(JOB_SLUG));
    }

    @Test
    @DisplayName("Lớp cửa chạy nền -> nuốt lỗi AppException, không ném ra ngoài")
    void scheduler_SwallowsAppException() {
        AiReviewService aiReviewService = mock(AiReviewService.class);
        when(aiReviewService.reviewJob(anyString(), isNull()))
                .thenThrow(new AppException("Kết quả kiểm duyệt AI không hợp lệ.",
                        HttpStatus.SERVICE_UNAVAILABLE, "AI_INVALID_RESULT"));

        JobAiReviewScheduler scheduler = new JobAiReviewScheduler(aiReviewService);

        assertDoesNotThrow(() -> scheduler.scheduleReview(JOB_SLUG));
    }

    @Test
    @DisplayName("Lớp cửa chạy nền -> gọi AI đúng 1 lần cho 1 tin, truyền adminUserId = null")
    void scheduler_CallsReviewJob_Once() {
        AiReviewService aiReviewService = mock(AiReviewService.class);
        when(aiReviewService.reviewJob(anyString(), isNull()))
                .thenReturn(AiReviewResponse.builder().verdict("OK").build());

        JobAiReviewScheduler scheduler = new JobAiReviewScheduler(aiReviewService);
        scheduler.scheduleReview(JOB_SLUG);

        verify(aiReviewService).reviewJob(JOB_SLUG, null);
    }

    @Test
    @DisplayName("Lớp cửa chạy nền -> slug rỗng thì không gọi AI")
    void scheduler_Skips_BlankSlug() {
        AiReviewService aiReviewService = mock(AiReviewService.class);

        JobAiReviewScheduler scheduler = new JobAiReviewScheduler(aiReviewService);
        scheduler.scheduleReview("  ");

        verify(aiReviewService, never()).reviewJob(anyString(), isNull());
    }

    // ================================================================
    // HELPERS
    // ================================================================

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

    /** Tin tuyển dụng thuộc về nhà tuyển dụng, ở trạng thái cho trước. */
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
