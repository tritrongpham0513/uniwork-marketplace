package com.uniwork.service;

import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Province;
import com.uniwork.entity.SalaryBenchmark;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.JobPostSkillRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SalaryBenchmarkRepository;
import com.uniwork.service.ai.AiContextAssembler;
import com.uniwork.service.ai.AiProvider;
import com.uniwork.service.ai.AiProviderRegistry;
import com.uniwork.service.ai.AiReason;
import com.uniwork.service.ai.AiReviewInput;
import com.uniwork.service.ai.AiReviewResult;
import com.uniwork.service.ai.AiReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Bộ test cho ranh giới bằng chứng nguyên văn (spec mục 8, CONTRACT.md mục 5.5).
 *
 * <p>Vấn đề đang chặn: {@code AiEvidenceMatcher} trước đây so khớp trên <b>toàn bộ</b>
 * nội dung tin đã dựng, gồm cả những dòng do hệ thống tự sinh ra (mức lương quy
 * đổi, bảng xếp hạng, uy tín). Hệ quả: AI có thể gắn dòng "Xep rang luong ...
 * trung binh 28000 VND/gio" làm bằng chứng cho lý do {@code DISCRIMINATION} và
 * vẫn được chấp nhận — quản trị viên đối chiếu bằng mắt sẽ không tìm thấy câu
 * đó trong tin.
 *
 * <p>Ranh giới mới: bằng chứng chỉ được trích từ phần nội dung <b>do nhà tuyển
 * dụng viết</b> (tiêu đề, mô tả, yêu cầu, quyền lợi, địa điểm, mức lương khai
 * báo). Dòng bảng xếp hạng và dòng uy tín do hệ thống sinh ra thì không.
 */
@ExtendWith(MockitoExtension.class)
class AiEvidenceScopeTest {

    private static final String JOB_SLUG = "job-evidence-01";
    private static final Long ADMIN_USER_ID = 1L;
    private static final String PROVINCE_CODE = "79";

    @Mock
    private JobPostRepository jobPostRepository;

    @Mock
    private JobPostSkillRepository jobPostSkillRepository;

    @Mock
    private SalaryBenchmarkRepository salaryBenchmarkRepository;

    @Mock
    private ProvinceRepository provinceRepository;

    private FakeAiProvider fakeProvider;
    private AiReviewService aiReviewService;

    @BeforeEach
    void setUp() {
        AiContextAssembler contextAssembler =
                new AiContextAssembler(salaryBenchmarkRepository, provinceRepository);
        fakeProvider = new FakeAiProvider();
        aiReviewService = new AiReviewService(
                jobPostRepository,
                jobPostSkillRepository,
                contextAssembler,
                new AiProviderRegistry(List.of(fakeProvider), "fake"),
                true);
    }

    // ================================================================
    // A. BẰNG CHỨNG TỪ NỘI DUNG NHÀ TUYỂN DỤNG VIẾT -> GIỮ
    // ================================================================

    @Test
    @DisplayName("Bằng chứng trích từ yêu cầu của tin -> giữ lại")
    void review_KeepsReason_WhenEvidenceFromEmployerText() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "SUSPECT",
                "Tin co dau hieu yeu cau tien truoc.",
                List.of(new AiReason(
                        "FEE_ADVANCE",
                        "Yeu cau dat coc 500.000d de giu cho",
                        "Yeu cau dat coc tien truoc khi lam.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals("SUSPECT", response.getVerdict());
        assertEquals(1, response.getReasons().size());
        assertEquals("FEE_ADVANCE", response.getReasons().get(0).getCode());
    }

    @Test
    @DisplayName("Bằng chứng trích từ mức lương nhà tuyển dụng khai báo -> giữ lại")
    void review_KeepsReason_WhenEvidenceFromEmployerDeclaredSalary() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "SUSPECT",
                "Muc luong bat thuong so voi bang xep hang luong.",
                List.of(new AiReason(
                        "SALARY_ANOMALY",
                        "Muc luong: HOURLY, tu 500000 den 500000 VND",
                        "Luong cao gap nhieu lan muc trung binh.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals(1, response.getReasons().size());
        assertEquals("SALARY_ANOMALY", response.getReasons().get(0).getCode());
    }

    // ================================================================
    // B. BẰNG CHỨNG TỪ DÒNG HỆ THỐNG TỰ SINH -> LOẠI BỎ
    // ================================================================

    @Test
    @DisplayName("Bằng chứng trích từ dòng bảng xếp hạng lương (hệ thống sinh) -> loại bỏ")
    void review_DropsReason_WhenEvidenceFromBenchmarkLine() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark();

        fakeProvider.result = new AiReviewResult(
                "SUSPECT",
                "Tom tat.",
                List.of(new AiReason(
                        "DISCRIMINATION",
                        "Xep hang luong nhom viec \"Nha hang\" tai Thành phố Hồ Chí Minh: "
                                + "trung binh 28000 VND/gio",
                        "Bang chung khong phai do nha tuyen dung viet.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertTrue(response.getReasons().isEmpty(),
                "Dòng do hệ thống sinh ra không được làm bằng chứng: "
                        + response.getReasons());
    }

    @Test
    @DisplayName("Bằng chứng trích từ dòng uy tín nhà tuyển dụng (hệ thống sinh) -> loại bỏ")
    void review_DropsReason_WhenEvidenceFromTrustLine() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "WARN",
                "Tom tat.",
                List.of(new AiReason(
                        "OFF_PLATFORM",
                        "Uy tin nha tuyen dung: da xac minh, diem uy tin trung binh 4.2/5 tren 15 danh gia",
                        "Bang chung khong phai do nha tuyen dung viet.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertTrue(response.getReasons().isEmpty(),
                "Dòng do hệ thống sinh ra không được làm bằng chứng: "
                        + response.getReasons());
    }

    @Test
    @DisplayName("Bằng chứng tự bịa (không có trong tin) -> loại bỏ")
    void review_DropsReason_WhenEvidenceFabricated() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "WARN",
                "Tom tat.",
                List.of(new AiReason(
                        "ILLEGAL_WORK",
                        "Tin co lien quan den mai dam",
                        "Khong co cau nay trong tin.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertTrue(response.getReasons().isEmpty());
    }

    // ================================================================
    // C. RANH GIỚI HAI VÙNG VĂN BẢN
    // ================================================================

    @Test
    @DisplayName("Vùng bằng chứng có nội dung nhà tuyển dụng viết, KHÔNG có dòng hệ thống sinh")
    void review_EvidenceScope_ContainsEmployerTextOnly() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark();

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiReviewInput input = fakeProvider.lastInput;
        assertNotNull(input);

        String scope = input.getEmployerAuthoredContent();
        assertTrue(scope.contains("Yeu cau dat coc 500.000d de giu cho"), scope);
        assertTrue(scope.contains("Muc luong: HOURLY"), scope);
        assertFalse(scope.contains("Xep hang luong"),
                "Dòng bảng xếp hạng không được nằm trong vùng bằng chứng: " + scope);
        assertFalse(scope.contains("Uy tin nha tuyen dung"),
                "Dòng uy tín không được nằm trong vùng bằng chứng: " + scope);

        // Khối dữ liệu gửi cho AI vẫn phải có ngữ cảnh thị trường đầy đủ.
        String content = input.getJobContent();
        assertTrue(content.contains("Xep hang luong nhom viec"), content);
        assertTrue(content.contains("Uy tin nha tuyen dung:"), content);
    }

    /** Tin tuyển dụng có yêu cầu "dat coc" và lương 500.000đ/giờ. */
    private JobPost pendingJob() {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phuc vu ca dem")
                .description("Phuc vu ban va thu ngan")
                .requirements(List.of("Yeu cau dat coc 500.000d de giu cho"))
                .benefits(List.of("Luong thuong"))
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nha hang").build())
                .province(Province.builder().id((short) 1).code(PROVINCE_CODE)
                        .name("Thành phố Hồ Chí Minh").build())
                .employer(EmployerProfile.builder()
                        .userId(9L)
                        .slug("employer-01")
                        .employerType("COMPANY")
                        .displayName("Cong ty ABC")
                        .isVerified(true)
                        .avgRating(new BigDecimal("4.20"))
                        .ratingCount(15)
                        .build())
                .salaryType("HOURLY")
                .salaryMin(BigDecimal.valueOf(500_000))
                .salaryMax(BigDecimal.valueOf(500_000))
                .status("PENDING_REVIEW")
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }

    /** Stub bảng xếp hạng lương của nhóm việc × tỉnh. */
    private void stubBenchmark() {
        SalaryBenchmark benchmark = SalaryBenchmark.builder()
                .id(1L)
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nha hang").build())
                .province(Province.builder().id((short) 1).code(PROVINCE_CODE)
                        .name("Thành phố Hồ Chí Minh").build())
                .avgHourly(BigDecimal.valueOf(28_000))
                .minHourly(BigDecimal.valueOf(22_000))
                .maxHourly(BigDecimal.valueOf(35_000))
                .sampleSize(42)
                .build();

        when(salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode("CAT01", PROVINCE_CODE))
                .thenReturn(Optional.of(benchmark));
    }

    /** Nhà cung cấp AI giả — trả kết quả cố định, ghi lại đầu vào đã nhận. */
    static class FakeAiProvider implements AiProvider {

        AiReviewResult result = new AiReviewResult("OK", "Tin binh thuong.", List.of());

        AiReviewInput lastInput;

        @Override
        public String name() {
            return "fake";
        }

        @Override
        public AiReviewResult review(AiReviewInput input) {
            lastInput = input;
            return result;
        }
    }
}
