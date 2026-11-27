package com.uniwork.service;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.FileUpload;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
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

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test cho ảnh preview tin tuyển dụng.
 *
 * <p>Kiểm tra ở <b>lớp nghiệp vụ</b>: ảnh phải thuộc về chính nhà tuyển dụng
 * đang đăng tin, và việc chỉ đổi ảnh không được kích hoạt lại kiểm duyệt AI
 * (AI chỉ đọc chữ — xem {@code docs/adr/0006-job-preview-image-optional-and-uncropped.md}).
 */
@ExtendWith(MockitoExtension.class)
class JobPreviewImageTest {

    private static final Long EMPLOYER_USER_ID = 100L;
    private static final Long OTHER_EMPLOYER_ID = 200L;
    private static final String JOB_SLUG = "job-abc123";
    private static final String IMAGE_SLUG = "file-11111111";
    private static final String IMAGE_URL = "/api/v1/files/" + IMAGE_SLUG;

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
    private FileUploadRepository fileUploadRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private JobNotifyService jobNotifyService;

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

        ReflectionTestUtils.setField(jobService, "jobAiReviewScheduler", jobAiReviewScheduler);
    }

    // ================================================================
    // A. RÀNG BUỘC SỞ HỮU ẢNH
    // ================================================================

    @Test
    @DisplayName("Đăng tin với ảnh của người khác -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenImageBelongsToOtherEmployer() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(fileUploadRepository.findBySlugAndDeletedAtIsNull(IMAGE_SLUG))
                .thenReturn(Optional.of(jobImage(OTHER_EMPLOYER_ID)));

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(requestWithImage(IMAGE_URL), EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(jobPostRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng tin với ảnh không phải loại JOB_IMAGE -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenImageKindIsNotJobImage() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(fileUploadRepository.findBySlugAndDeletedAtIsNull(IMAGE_SLUG))
                .thenReturn(Optional.of(FileUpload.builder()
                        .slug(IMAGE_SLUG)
                        .ownerUserId(EMPLOYER_USER_ID)
                        .kind("LOGO")
                        .build()));

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(requestWithImage(IMAGE_URL), EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Đăng tin với URL ngoài hệ thống -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenUrlIsNotSystemFile() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));

        AppException ex = assertThrows(AppException.class,
                () -> jobService.create(requestWithImage("https://example.com/a.png"), EMPLOYER_USER_ID));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Đăng tin với ảnh hợp lệ -> lưu URL ảnh vào tin")
    void create_SavesPreviewImageUrl() {
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employer));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(fileUploadRepository.findBySlugAndDeletedAtIsNull(IMAGE_SLUG))
                .thenReturn(Optional.of(jobImage(EMPLOYER_USER_ID)));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> {
            JobPost job = inv.getArgument(0);
            job.setId(1L);
            return job;
        });

        jobService.create(requestWithImage(IMAGE_URL), EMPLOYER_USER_ID);

        verify(jobPostRepository).save(org.mockito.ArgumentMatchers.argThat(
                job -> IMAGE_URL.equals(job.getPreviewImageUrl())));
    }

    // ================================================================
    // B. BỎ ẢNH
    // ================================================================

    @Test
    @DisplayName("Gửi ảnh rỗng -> xoá ảnh khỏi tin (không giữ ảnh cũ)")
    void update_ClearsPreviewImage_WhenEmptyUrlSent() {
        JobPost job = openJob();
        stubUpdateDependencies(job);

        jobService.update(JOB_SLUG, requestWithImage(""), EMPLOYER_USER_ID);

        assertNull(job.getPreviewImageUrl());
    }

    // ================================================================
    // C. BỎ QUA KIỂM DUYỆT AI KHI CHỈ ĐỔI ẢNH
    // ================================================================

    @Test
    @DisplayName("Sửa tin chỉ đổi ảnh -> tin về chờ duyệt nhưng KHÔNG gọi lại AI")
    void update_SkipsAiReview_WhenOnlyImageChanged() {
        JobPost job = openJob();
        stubUpdateDependencies(job);
        when(fileUploadRepository.findBySlugAndDeletedAtIsNull(IMAGE_SLUG))
                .thenReturn(Optional.of(jobImage(EMPLOYER_USER_ID)));

        jobService.update(JOB_SLUG, requestWithImage(IMAGE_URL), EMPLOYER_USER_ID);

        assertEquals("PENDING_REVIEW", job.getStatus());
        assertEquals(IMAGE_URL, job.getPreviewImageUrl());
        verify(jobAiReviewScheduler, never()).scheduleReview(anyString());
    }

    @Test
    @DisplayName("Sửa tin đổi cả ảnh lẫn nội dung chữ -> vẫn gọi lại AI")
    void update_SchedulesAiReview_WhenTextAlsoChanged() {
        JobPost job = openJob();
        stubUpdateDependencies(job);
        when(fileUploadRepository.findBySlugAndDeletedAtIsNull(IMAGE_SLUG))
                .thenReturn(Optional.of(jobImage(EMPLOYER_USER_ID)));

        JobUpsertRequest request = requestWithImage(IMAGE_URL);
        request.setDescription("Mô tả mới đã thay đổi");

        jobService.update(JOB_SLUG, request, EMPLOYER_USER_ID);

        verify(jobAiReviewScheduler).scheduleReview(JOB_SLUG);
    }

    // ================================================================
    // HELPERS
    // ================================================================

    /** Tin tuyển dụng đang hiển thị công khai (đã được duyệt). */
    private JobPost openJob() {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phục vụ ca đêm")
                .description("Phục vụ bàn, thu ngân")
                .employer(employer)
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build())
                .status("OPEN")
                .employmentType("PART_TIME")
                .workMode("ONSITE")
                .salaryType("HOURLY")
                .salaryMin(BigDecimal.valueOf(25000))
                .salaryMax(BigDecimal.valueOf(30000))
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }

    /** File ảnh preview thuộc về `ownerId`. */
    private FileUpload jobImage(Long ownerId) {
        return FileUpload.builder()
                .slug(IMAGE_SLUG)
                .ownerUserId(ownerId)
                .kind("JOB_IMAGE")
                .build();
    }

    private void stubUpdateDependencies(JobPost job) {
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobCategoryRepository.findByCode("CAT01"))
                .thenReturn(Optional.of(JobCategory.builder().id((short) 1).code("CAT01").name("Nhà hàng").build()));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /** Yêu cầu đăng/sửa tin hợp lệ tối thiểu. */
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

    private JobUpsertRequest requestWithImage(String url) {
        JobUpsertRequest request = validRequest();
        request.setPreviewImageUrl(url);
        return request;
    }
}
