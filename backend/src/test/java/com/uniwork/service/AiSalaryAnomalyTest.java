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
import com.uniwork.service.ai.AiEmployerTrust;
import com.uniwork.service.ai.AiProvider;
import com.uniwork.service.ai.AiProviderRegistry;
import com.uniwork.service.ai.AiReason;
import com.uniwork.service.ai.AiReviewInput;
import com.uniwork.service.ai.AiReviewResult;
import com.uniwork.service.ai.AiReviewService;
import com.uniwork.service.ai.AiSalaryBenchmark;
import com.uniwork.service.ai.AiSalaryInfo;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Bộ test cho ngữ cảnh xếp hạng lương + uy tín nhà tuyển dụng đưa vào đầu vào AI
 * (ticket 03).
 *
 * <p>Mục tiêu đã chốt: mã {@code SALARY_ANOMALY} phải phát hiện được — tin trả
 * lương 500.000đ/giờ ở nhóm việc có trung bình 28.000đ/giờ phải bị gắn cờ, thay
 * vì bị bỏ qua.
 *
 * <p>Seam: nhà cung cấp AI <b>giả</b> trả kết quả cố định; lớp HTTP của Gemini
 * không bao giờ bị chạm tới.
 */
@ExtendWith(MockitoExtension.class)
class AiSalaryAnomalyTest {

    private static final String JOB_SLUG = "job-anomaly-01";
    private static final Long ADMIN_USER_ID = 1L;

    /** Mã tỉnh Hồ Chí Minh — cũng là tỉnh lùi về khi không có dòng riêng. */
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
    private AiContextAssembler contextAssembler;
    private AiReviewService aiReviewService;

    @BeforeEach
    void setUp() {
        contextAssembler = new AiContextAssembler(salaryBenchmarkRepository, provinceRepository);
        fakeProvider = new FakeAiProvider();
        aiReviewService = new AiReviewService(
                jobPostRepository,
                jobPostSkillRepository,
                contextAssembler,
                new AiProviderRegistry(List.of(fakeProvider), "fake"),
                true);
    }

    // ================================================================
    // A. LƯƠNG BẤT THƯỜNG -> GẮN CỜ SALARY_ANOMALY
    // ================================================================

    @Test
    @DisplayName("Lương bất thường so với bảng xếp hạng của nhóm việc × tỉnh -> giữ mã SALARY_ANOMALY")
    void review_KeepsSalaryAnomaly_WhenSalaryFarFromBenchmark() {
        JobPost job = jobWithSalary("HOURLY", 500_000, 500_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        // AI trích nguyên văn câu có trong nội dung tin.
        fakeProvider.result = new AiReviewResult(
                "SUSPECT",
                "Muc luong bat thuong so voi bang xep hang luong.",
                List.of(new AiReason(
                        "SALARY_ANOMALY",
                        "Muc luong: HOURLY, tu 500000 den 500000 VND (quy doi 500000 - 500000 VND/gio)",
                        "Luong cao gap 17 lan muc trung binh cua nhom viec.")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals("SUSPECT", response.getVerdict());
        assertEquals(1, response.getReasons().size());
        assertEquals("SALARY_ANOMALY", response.getReasons().get(0).getCode());
        assertEquals("SUSPECT", job.getAiVerdict());
        assertEquals(1, job.getAiReasons().size());
        assertEquals("SALARY_ANOMALY", job.getAiReasons().get(0).getCode());
    }

    @Test
    @DisplayName("Đầu vào AI có mức lương quy đổi về đồng/giờ + đơn vị gốc + bốn số của bảng xếp hạng")
    void review_SendsSalaryAndBenchmarkToProvider() {
        JobPost job = jobWithSalary("HOURLY", 500_000, 500_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiReviewInput input = fakeProvider.lastInput;
        assertNotNull(input);

        // 1) Mức lương quy đổi về đồng/giờ + đơn vị trả lương gốc.
        AiSalaryInfo salary = input.getSalaryInfo();
        assertNotNull(salary);
        assertEquals("HOURLY", salary.getSalaryType());
        assertEquals(500_000, salary.getOriginalMin());
        assertEquals(500_000, salary.getHourlyMin());
        assertTrue(salary.isConvertible());

        String content = input.getJobContent();
        assertTrue(content.contains("Muc luong: HOURLY, tu 500000 den 500000 VND"));
        assertTrue(content.contains("quy doi 500000 - 500000 VND/gio"),
                "Phải có mức lương quy đổi về đồng/giờ: " + content);

        // 2) Bốn số của bảng xếp hạng lương.
        AiSalaryBenchmark benchmark = input.getSalaryBenchmark();
        assertNotNull(benchmark);
        assertEquals(28_000, benchmark.getAvgHourly());
        assertEquals(22_000, benchmark.getMinHourly());
        assertEquals(35_000, benchmark.getMaxHourly());
        assertEquals(42, benchmark.getSampleSize());

        assertTrue(content.contains("Xep hang luong nhom viec \"Nha hang\" tai Thành phố Hồ Chí Minh"),
                "Phải nêu rõ nhóm việc và tỉnh: " + content);
        assertTrue(content.contains("trung binh 28000 VND/gio"), content);
        assertTrue(content.contains("thap nhat 22000"), content);
        assertTrue(content.contains("cao nhat 35000"), content);
        assertTrue(content.contains("co mau 42 tin"), content);
    }

    @Test
    @DisplayName("Đầu vào AI có trạng thái xác minh, điểm uy tín trung bình và số lượt đánh giá")
    void review_SendsEmployerTrustToProvider() {
        JobPost job = jobWithSalary("HOURLY", 500_000, 500_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiEmployerTrust trust = fakeProvider.lastInput.getEmployerTrust();
        assertNotNull(trust);
        assertTrue(trust.getVerified());
        assertEquals(4.2, trust.getAvgRating(), 0.001);
        assertEquals(15, trust.getRatingCount());

        String content = fakeProvider.lastInput.getJobContent();
        assertTrue(content.contains("Uy tin nha tuyen dung: da xac minh"), content);
        assertTrue(content.contains("diem uy tin trung binh 4.2/5 tren 15 danh gia"), content);
    }

    // ================================================================
    // B. TIN KHÔNG CÓ BẢNG XẾP HẠNG -> VẪN KIỂM TRA ĐƯỢC
    // ================================================================

    @Test
    @DisplayName("Không có dòng xếp hạng lương -> tin vẫn kiểm tra được, chỉ thiếu căn cứ so sánh")
    void review_StillReviews_WhenNoBenchmarkRow() {
        JobPost job = jobWithSalary("HOURLY", 25_000, 30_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        when(salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode("CAT01", PROVINCE_CODE))
                .thenReturn(Optional.empty());

        fakeProvider.result = new AiReviewResult("OK", "Tin binh thuong.", List.of());

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals("OK", response.getVerdict());
        assertNull(fakeProvider.lastInput.getSalaryBenchmark());

        String content = fakeProvider.lastInput.getJobContent();
        assertFalse(content.contains("Xep hang luong"),
                "Không có dòng xếp hạng thì không được dựng dòng so sánh: " + content);
        // Vẫn phải có mức lương và uy tín để AI còn căn cứ.
        assertTrue(content.contains("quy doi 25000 - 30000 VND/gio"), content);
        assertTrue(content.contains("Uy tin nha tuyen dung:"), content);
    }

    // ================================================================
    // C. QUY ĐỔI LƯƠNG — KHÔNG SUY LUẬN TỪ PER_TASK / NEGOTIABLE
    // ================================================================

    @Test
    @DisplayName("PER_TASK / NEGOTIABLE -> không quy đổi về đồng/giờ, không có căn cứ so sánh lương")
    void review_DoesNotConvertSalary_WhenNotConvertible() {
        JobPost job = jobWithSalary("NEGOTIABLE", 0, 0);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiSalaryInfo salary = fakeProvider.lastInput.getSalaryInfo();
        assertFalse(salary.isConvertible());
        assertNull(salary.getHourlyMin());
        assertNull(salary.getHourlyMax());

        String content = fakeProvider.lastInput.getJobContent();
        assertTrue(content.contains("Muc luong: NEGOTIABLE")
                        && content.contains("khong quy doi duoc sang VND/gio"),
                "Phải nói rõ không quy đổi được: " + content);
        assertFalse(content.contains("(quy doi "),
                "Không được dựng mức đồng/giờ cho đơn vị không quy đổi được: " + content);
    }

    @Test
    @DisplayName("Lương trả theo tháng -> quy đổi theo bảng quy ước 160 giờ")
    void review_ConvertsMonthlySalary_Using160Hours() {
        JobPost job = jobWithSalary("MONTHLY", 4_000_000, 4_000_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiSalaryInfo salary = fakeProvider.lastInput.getSalaryInfo();
        assertEquals(25_000, salary.getHourlyMin());
        assertTrue(fakeProvider.lastInput.getJobContent().contains("quy doi 25000 - 25000 VND/gio"));
    }

    // ================================================================
    // D. KHÔNG GỬI DỮ LIỆU CÁ NHÂN CỦA SINH VIÊN
    // ================================================================

    @Test
    @DisplayName("Đầu vào gửi cho AI không chứa bất kỳ dữ liệu cá nhân nào của sinh viên")
    void review_SendsNoStudentPersonalData() {
        JobPost job = jobWithSalary("HOURLY", 500_000, 500_000);
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        String content = fakeProvider.lastInput.getJobContent().toLowerCase();
        for (String forbidden : new String[]{
                "sinh vien", "student", "ho so", "profile", "cv ", "cv,", "ung vien", "applicant",
                "don ung tuyen", "application", "email", "sdt", "dien thoai", "cmnd", "cccd"}) {
            assertFalse(content.contains(forbidden),
                    "Đầu vào AI không được chứa dữ liệu sinh viên (" + forbidden + "): " + content);
        }
    }

    // ================================================================
    // E. BẢNG XẾP HẠNG LÙI VỀ TỈNH MẶC ĐỊNH — KHỚP GIAO DIỆN QUẢN TRỊ VIÊN
    // ================================================================

    @Test
    @DisplayName("Tỉnh chưa có dòng xếp hạng -> lùi về tỉnh mặc định giống giao diện quản trị viên")
    void review_FallsBackToDefaultProvince_WhenProvinceHasNoRow() {
        JobPost job = jobWithSalary("HOURLY", 25_000, 30_000);
        job.setProvince(Province.builder().id((short) 2).code("01").name("Thành phố Hà Nội").build());
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        // Tỉnh "01" chưa có dòng -> phải lùi về dòng của tỉnh mặc định "79".
        when(salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode("CAT01", "01"))
                .thenReturn(Optional.empty());
        stubBenchmark(28_000, 22_000, 35_000, 42);

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        AiSalaryBenchmark benchmark = fakeProvider.lastInput.getSalaryBenchmark();
        assertNotNull(benchmark, "Phải lùi về dòng xếp hạng của tỉnh mặc định");
        assertEquals(PROVINCE_CODE, benchmark.getProvinceId());
        assertEquals(28_000, benchmark.getAvgHourly());
    }

    @Test
    @DisplayName("Lùi về tỉnh mặc định -> dòng xếp hạng phải nêu đúng tỉnh của dữ liệu, không gắn tên tỉnh của tin")
    void review_LabelsBenchmarkWithItsOwnProvince_WhenFallingBack() {
        JobPost job = jobWithSalary("HOURLY", 25_000, 30_000);
        job.setProvince(Province.builder().id((short) 2).code("01").name("Thành phố Hà Nội").build());
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        // Tỉnh "01" chưa có dòng -> lùi về dòng của tỉnh mặc định "79".
        when(salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode("CAT01", "01"))
                .thenReturn(Optional.empty());
        stubBenchmark(28_000, 22_000, 35_000, 42);
        // Tên tỉnh của dữ liệu xếp hạng lấy từ danh sách tỉnh.
        when(provinceRepository.findByCode(PROVINCE_CODE)).thenReturn(Optional.of(
                Province.builder().id((short) 1).code(PROVINCE_CODE)
                        .name("Thành phố Hồ Chí Minh").build()));

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        String content = fakeProvider.lastInput.getJobContent();
        // Dữ liệu xếp hạng là của Hồ Chí Minh -> phải nói Hồ Chí Minh.
        // Nếu gắn nhãn "Hà Nội" thì AI đang so sánh lương Hà Nội với số liệu
        // của Hồ Chí Minh — một khẳng định sai trong đầu vào AI.
        assertTrue(content.contains("tai Thành phố Hồ Chí Minh"),
                "Dòng xếp hạng phải nêu tỉnh của dữ liệu: " + content);
        assertFalse(content.contains("tai Thành phố Hà Nội"),
                "Không được gắn tên tỉnh của tin lên dữ liệu xếp hạng của tỉnh khác: " + content);
    }

    // ================================================================
    // F. DỰNG BỐI CẢNH
    // ================================================================

    @Test
    @DisplayName("Đầu vào AI có địa điểm và kỹ năng yêu cầu (spec mục 6)")
    void review_SendsLocationAndSkillsToProvider() {
        JobPost job = jobWithSalary("HOURLY", 25_000, 30_000);
        job.setAddressDetail("So 12 Nguyen Trai");
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jobPostSkillRepository.findByJobPostId(1L)).thenReturn(List.of(
                com.uniwork.entity.JobPostSkill.builder()
                        .jobPost(job)
                        .skill(com.uniwork.entity.Skill.builder()
                                .id(1).slug("phuc-vu").name("Phuc vu").build())
                        .build()));

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        String content = fakeProvider.lastInput.getJobContent();
        assertTrue(content.contains("Dia diem: Thành phố Hồ Chí Minh"), content);
        assertTrue(content.contains("Ky nang:"), content);
        assertTrue(content.contains("Phuc vu"), content);
        assertTrue(content.contains("Nhom viec: Nha hang"), content);
    }

    /** Dựng tin tuyển dụng có mức lương và nhà tuyển dụng đã xác minh. */
    private JobPost jobWithSalary(String salaryType, Integer min, Integer max) {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phuc vu ca dem")
                .description("Phuc vu ban va thu ngan")
                .requirements(List.of("Yeu cau phuc vu khach hang"))
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
                .salaryType(salaryType)
                .salaryMin(min == null ? null : BigDecimal.valueOf(min))
                .salaryMax(max == null ? null : BigDecimal.valueOf(max))
                .status("PENDING_REVIEW")
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }

    /** Stub bảng xếp hạng lương — mô phỏng đúng dữ liệu endpoint public. */
    private void stubBenchmark(int avg, int min, int max, int sampleSize) {
        SalaryBenchmark benchmark = SalaryBenchmark.builder()
                .id(1L)
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nha hang").build())
                .province(Province.builder().id((short) 1).code(PROVINCE_CODE)
                        .name("Thành phố Hồ Chí Minh").build())
                .avgHourly(BigDecimal.valueOf(avg))
                .minHourly(BigDecimal.valueOf(min))
                .maxHourly(BigDecimal.valueOf(max))
                .sampleSize(sampleSize)
                .build();

        when(salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode("CAT01", PROVINCE_CODE))
                .thenReturn(Optional.of(benchmark));
    }

    /**
     * Nhà cung cấp AI giả — trả kết quả cố định, ghi lại đầu vào đã nhận.
     *
     * <p>Đây là implementation thật của {@link AiProvider} nên lớp điều phối được
     * test đúng như lúc chạy thật.
     */
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
