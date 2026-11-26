package com.uniwork.controller;

import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.dto.response.AiReasonResponse;
import com.uniwork.dto.response.EmployerProfileResponse;
import com.uniwork.dto.response.EmployerSummaryResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobListResponse;
import com.uniwork.dto.response.JobLocationResponse;
import com.uniwork.dto.response.JobPositionResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.dto.response.PublicEmployerProfileResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.User;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.JobPostScheduleRepository;
import com.uniwork.repository.JobPostSkillRepository;
import com.uniwork.repository.JobPositionRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SkillRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WardRepository;
import com.uniwork.service.JobNotifyService;
import com.uniwork.service.JobService;
import com.uniwork.service.NotificationService;
import com.uniwork.service.impl.JobServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hồi quy: kết quả kiểm duyệt AI KHÔNG BAO GIỜ lộ ra ngoài phạm vi quản trị viên.
 *
 * <p>Ranh giới theo CONTRACT.md mục 6:
 * <ul>
 *   <li>{@code GET /api/v1/admin/jobs} → {@code AdminJobResponse} — <b>CÓ</b> trường AI</li>
 *   <li>{@code GET /api/v1/jobs/public/**} → {@code JobResponse} — <b>KHÔNG</b></li>
 *   <li>{@code GET /api/v1/employer/jobs} → {@code JobResponse} — <b>KHÔNG</b></li>
 *   <li>{@code GET /api/v1/public/employers/{id}} → {@code PublicEmployerProfileResponse} — <b>KHÔNG</b></li>
 * </ul>
 *
 * <p><b>Điểm mấu chốt của cơ chế bảo vệ:</b> Jackson serialize theo <i>kiểu lúc
 * chạy</i> (runtime type) của phần tử trong collection. Nghĩa là nếu service
 * trả về một instance {@code AdminJobResponse} (lớp con) cho endpoint của nhà
 * tuyển dụng, các khóa AI <i>vẫn sẽ</i> xuất hiện trong JSON. Vì vậy lớp bảo vệ
 * thật sự nằm ở <b>tầng mapping của service</b>: {@code JobServiceImpl.toResponse()}
 * phải luôn trả về đúng kiểu {@code JobResponse} — không phải lớp con.
 *
 * <p>Do đó test ở đây kiểm chứng <b>cả hai</b> tầng:
 * <ol>
 *   <li><b>Tầng service</b>: {@code toResponse()} / {@code listByEmployer()} /
 *       {@code list()} trả về đúng kiểu {@code JobResponse} (runtime type check).</li>
 *   <li><b>Tầng HTTP</b>: JSON thô từ các endpoint công khai & của nhà tuyển dụng
 *       không chứa bất kỳ khóa nào bắt đầu bằng {@code "ai"}.</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
class PublicJobNoAiLeakTest {

    /** Các khóa kết quả AI không được xuất hiện ở bất kỳ response nào của NTD/khách. */
    private static final List<String> AI_KEYS = List.of(
            "aiVerdict", "aiReasons", "aiCheckedAt", "aiSummary", "aiProvider");

    private MockMvc mockMvc;

    // ------------------------------------------------------------------
    // Mocks cho tầng service
    // ------------------------------------------------------------------

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
    private SkillRepository skillRepository;

    @Mock
    private EmployerProfileRepository employerProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private JobNotifyService jobNotifyService;

    /** Service thật — dùng để kiểm chứng lớp bảo vệ ở tầng mapping. */
    @InjectMocks
    private JobServiceImpl jobServiceImpl;

    // ------------------------------------------------------------------
    // Mocks cho tầng HTTP
    // ------------------------------------------------------------------

    /** Service giả lập — controller dùng bản này để trả về DTO đã biết trước. */
    @Mock
    private JobService jobService;

    @Mock
    private com.uniwork.service.ProfileService profileService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new PublicJobController(jobService),
                        new EmployerController(jobService, null, profileService, null, null),
                        new PublicMasterDataController(null, profileService),
                        new AdminController(null, jobService, null, null, null))
                .setCustomArgumentResolvers(new CurrentUserArgumentResolver())
                .build();
    }

    // ------------------------------------------------------------------
    // DỰNG DỮ LIỆU
    // ------------------------------------------------------------------

    /** Bản ghi tin tuyển dụng đã có kết quả AI trong DB. */
    private static JobPost jobWithAiVerdict() {
        JobCategory category = JobCategory.builder()
                .id((short) 1).code("CAT01").name("Nhà hàng").build();
        JobPosition position = JobPosition.builder()
                .id(1).code("POS01").name("Phục vụ").category(category).build();
        EmployerProfile employer = EmployerProfile.builder()
                .userId(100L).displayName("Quán Cà Phê")
                .user(User.builder().id(100L).email("employer@uniwork.vn").build())
                .build();

        return JobPost.builder()
                .id(1L)
                .slug("job-abc123")
                .title("Phục vụ ca đêm")
                .description("Thuê nhân viên phục vụ ca đêm tại quán cà phê.")
                .category(category)
                .position(position)
                .employer(employer)
                .status("OPEN")
                .aiVerdict("SUSPECT")
                .aiReasons(List.of(com.uniwork.service.ai.AiReason.builder()
                        .code("FEE_ADVANCE")
                        .evidence("Yêu cầu đặt cọc 500.000đ để giữ chỗ")
                        .detail("Yêu cầu đặt cọc trước khi làm việc.")
                        .build()))
                .aiCheckedAt(java.time.LocalDateTime.of(2026, 11, 25, 10, 0))
                .build();
    }

    /** Tin tuyển dụng đã gắn sẵn kết quả AI — dùng để chứng minh DTO lọc nó ra. */
    private static AdminJobResponse jobDtoWithAiVerdict() {
        return AdminJobResponse.builder()
                .id("job-abc123")
                .title("Phục vụ ca đêm")
                .description("Thuê nhân viên phục vụ ca đêm tại quán cà phê.")
                .category(JobCategoryResponse.builder().id("cat-1").name("Phục vụ").build())
                .position(JobPositionResponse.builder().id("pos-1").name("Phục vụ").build())
                .employer(EmployerSummaryResponse.builder().id("emp-1").name("Quán Cà Phê").build())
                .location(JobLocationResponse.builder().provinceId("hcm").address("12 Nguyễn Huệ").build())
                .status("OPEN")
                .postedAt("2026-11-20T08:00:00Z")
                .aiVerdict("SUSPECT")
                .aiReasons(List.of(AiReasonResponse.builder()
                        .code("FEE_ADVANCE")
                        .evidence("Yêu cầu đặt cọc 500.000đ để giữ chỗ")
                        .detail("Yêu cầu đặt cọc trước khi làm việc.")
                        .build()))
                .aiCheckedAt("2026-11-25T10:00:00Z")
                .build();
    }

    /** Bản `JobResponse` (không trường AI) — dùng cho các endpoint công khai. */
    private static JobResponse plainJob() {
        return JobResponse.builder()
                .id("job-abc123")
                .title("Phục vụ ca đêm")
                .description("Thuê nhân viên phục vụ ca đêm tại quán cà phê.")
                .category(JobCategoryResponse.builder().id("cat-1").name("Phục vụ").build())
                .position(JobPositionResponse.builder().id("pos-1").name("Phục vú").build())
                .employer(EmployerSummaryResponse.builder().id("emp-1").name("Quán Cà Phê").build())
                .location(JobLocationResponse.builder().provinceId("hcm").address("12 Nguyễn Huệ").build())
                .status("OPEN")
                .postedAt("2026-11-20T08:00:00Z")
                .build();
    }

    // ==================================================================
    // TẦNG 1 — SERVICE: bảo đảm kiểu runtime là JobResponse (không lớp con)
    // ==================================================================

    @Test
    @DisplayName("JobServiceImpl.toResponse() trả về ĐÚNG kiểu JobResponse (không phải lớp con)")
    void toResponse_ReturnsExactJobResponseType() {
        // Đây là bảo đảm then chốt: nếu toResponse() trả về AdminJobResponse,
        // Jackson sẽ đưa khóa ai* vào JSON của endpoint nhà tuyển dụng.
        JobResponse result = jobServiceImpl.toResponse(jobWithAiVerdict());

        assertThat(result.getClass())
                .as("toResponse() phải trả về JobResponse đúng nguyên bản — không phải lớp con, "
                        + "vì Jackson serialize theo kiểu runtime")
                .isEqualTo(JobResponse.class);
    }

    @Test
    @DisplayName("JobServiceImpl.toResponse() không đưa trường AI vào DTO")
    void toResponse_DoesNotCarryAiFields() {
        JobResponse result = jobServiceImpl.toResponse(jobWithAiVerdict());

        assertNoAiLeak(serialize(result));
    }

    @Test
    @DisplayName("JobServiceImpl.listByEmployer() trả về List<JobResponse> — không lớp con")
    void listByEmployer_ReturnsExactJobResponseType() {
        when(jobPostRepository
                .findByEmployerUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(100L))
                .thenReturn(List.of(jobWithAiVerdict()));

        List<JobResponse> jobs = jobServiceImpl.listByEmployer(100L, null);

        assertThat(jobs).isNotEmpty();
        assertThat(jobs).allSatisfy(job ->
                assertThat(job.getClass()).isEqualTo(JobResponse.class));
        assertNoAiLeak(serialize(jobs));
    }

    @Test
    @DisplayName("JobServiceImpl.list() (danh sách công khai) trả về List<JobResponse> — không lớp con")
    void publicList_ReturnsExactJobResponseType() {
        when(jobPostRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class))).thenReturn(
                new org.springframework.data.domain.PageImpl<>(
                        List.of(jobWithAiVerdict()),
                        org.springframework.data.domain.PageRequest.of(0, 10),
                        1));

        JobListResponse result = jobServiceImpl.list(
                null, null, null, null, null, null, null, null,
                null, null, "newest", 1, 10, null, null);

        assertThat(result.getItems()).isNotEmpty();
        assertThat(result.getItems()).allSatisfy(job ->
                assertThat(job.getClass()).isEqualTo(JobResponse.class));
        assertNoAiLeak(serialize(result));
    }

    @Test
    @DisplayName("JobServiceImpl.toAdminResponse() mới là nơi DUY NHẤT gắn trường AI")
    void toAdminResponse_IsTheOnlyPlaceCarryingAiFields() {
        AdminJobResponse result = jobServiceImpl.toAdminResponse(jobWithAiVerdict());

        assertThat(result.getAiVerdict()).isEqualTo("SUSPECT");
        assertThat(result.getAiCheckedAt()).isNotNull();
        assertThat(result.getAiReasons()).hasSize(1);
    }

    // ==================================================================
    // TẦNG 2 — HÌNH DẠNG DTO
    // ==================================================================

    @Test
    @DisplayName("JobResponse gốc không có bất kỳ trường AI nào (hình dạng tách biệt)")
    void jobResponse_HasNoAiProperties() {
        assertThat(JobResponse.class.getDeclaredFields())
                .allSatisfy(field -> assertThat(AI_KEYS)
                        .as("JobResponse không được có trường %s", field.getName())
                        .doesNotContain(field.getName()));
    }

    @Test
    @DisplayName("PublicEmployerProfileResponse không có bất kỳ trường AI nào")
    void publicEmployerProfileResponse_HasNoAiProperties() {
        assertThat(PublicEmployerProfileResponse.class.getDeclaredFields())
                .allSatisfy(field -> assertThat(AI_KEYS)
                        .as("PublicEmployerProfileResponse không được có trường %s", field.getName())
                        .doesNotContain(field.getName()));
    }

    @Test
    @DisplayName("AdminJobResponse CÓ đủ 3 trường AI (hình dạng riêng của quản trị viên)")
    void adminJobResponse_HasAiProperties() {
        assertThat(AdminJobResponse.class.getDeclaredFields())
                .extracting("name")
                .contains("aiVerdict", "aiReasons", "aiCheckedAt");
    }

    // ==================================================================
    // TẦNG 3 — HTTP: JSON thô từ các endpoint công khai & của nhà tuyển dụng
    // ==================================================================

    @Test
    @DisplayName("GET /api/v1/employer/jobs -> JSON không chứa khóa AI nào")
    void employerJobs_HasNoAiFields() throws Exception {
        when(jobService.listByEmployer(any(), any())).thenReturn(List.of(plainJob()));

        String json = performAndGetJson(get(com.uniwork.constant.ApiEndpoints.V1_EMPLOYER + "/jobs"));

        assertNoAiLeak(json);
        assertThat(json).contains("job-abc123");
    }

    @Test
    @DisplayName("GET /api/v1/jobs/public -> JSON không chứa khóa AI nào")
    void publicJobList_HasNoAiFields() throws Exception {
        when(jobService.list(any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(JobListResponse.builder()
                        .items(List.of(plainJob()))
                        .totalItems(1)
                        .currentPage(1)
                        .totalPages(1)
                        .build());

        String json = performAndGetJson(get(com.uniwork.constant.ApiEndpoints.V1_PUBLIC_JOBS));

        assertNoAiLeak(json);
        assertThat(json).contains("job-abc123");
    }

    @Test
    @DisplayName("GET /api/v1/jobs/public/{id} -> JSON không chứa khóa AI nào")
    void publicJobDetail_HasNoAiFields() throws Exception {
        when(jobService.detail("job-abc123")).thenReturn(plainJob());

        String json = performAndGetJson(get(com.uniwork.constant.ApiEndpoints.V1_PUBLIC_JOBS + "/job-abc123"));

        assertNoAiLeak(json);
        assertThat(json).contains("job-abc123");
    }

    @Test
    @DisplayName("GET /api/v1/jobs/public/related -> JSON không chứa khóa AI nào")
    void publicRelatedJobs_HasNoAiFields() throws Exception {
        when(jobService.related(any(), any(), any())).thenReturn(List.of(plainJob()));

        String json = performAndGetJson(get(com.uniwork.constant.ApiEndpoints.V1_PUBLIC_JOBS + "/related"));

        assertNoAiLeak(json);
        assertThat(json).contains("job-abc123");
    }

    @Test
    @DisplayName("GET /api/v1/public/employers/{id} -> Hồ sơ công khai không chứa khóa AI nào")
    void publicEmployerProfile_HasNoAiFields() throws Exception {
        PublicEmployerProfileResponse profile = PublicEmployerProfileResponse.builder()
                .profile(EmployerProfileResponse.builder()
                        .id("emp-1")
                        .displayName("Quán Cà Phê")
                        // Trường uy tín NTD — công khai hợp lệ, KHÔNG phải kết quả AI.
                        .isVerified(true)
                        .avgRating(4.5)
                        .ratingCount(12)
                        .build())
                .jobs(List.of(plainJob()))
                .reviews(List.of(ReviewResponse.builder().id("rev-1").rating(5).build()))
                .build();

        when(profileService.getPublicEmployerProfile("emp-1")).thenReturn(profile);

        String json = performAndGetJson(
                get(com.uniwork.constant.ApiEndpoints.V1_PUBLIC_MASTER + "/employers/emp-1"));

        assertNoAiLeak(json);
        // Trường uy tin vẫn phải còn (không xoá nhầm).
        assertThat(json).contains("isVerified").contains("avgRating").contains("ratingCount");
    }

    @Test
    @DisplayName("GET /api/v1/admin/jobs -> CÓ trường AI (quản trị viên được thấy)")
    void adminJobs_HasAiFields() throws Exception {
        when(jobService.listForAdmin(any())).thenReturn(List.of(jobDtoWithAiVerdict()));

        String json = performAndGetJson(get(com.uniwork.constant.ApiEndpoints.V1_ADMIN + "/jobs"));

        assertThat(json).contains("aiVerdict")
                .contains("aiReasons")
                .contains("aiCheckedAt")
                .contains("SUSPECT");
    }

    // ==================================================================
    // HELPERS
    // ==================================================================

    /** Chạy request, kiểm tra HTTP 200 và trả về JSON thô. */
    private String performAndGetJson(org.springframework.test.web.servlet.RequestBuilder request)
            throws Exception {
        MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
        return result.getResponse().getContentAsString();
    }

    /** Serialize một đối tượng bất kỳ ra JSON (dùng ObjectMapper của Spring). */
    private static String serialize(Object value) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .findAndRegisterModules()
                    .writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Không serialize được đối tượng để kiểm tra rò rỉ AI", ex);
        }
    }

    /** Assert JSON không chứa bất kỳ khóa kết quả AI nào. */
    private static void assertNoAiLeak(String json) {
        for (String key : AI_KEYS) {
            assertThat(json)
                    .as("Response cho nhà tuyển dụng / khách không được chứa khóa AI '%s'. JSON: %s",
                            key, json)
                    .doesNotContain(key);
        }
        // Chặn chung: không được có khóa nào bắt đầu bằng "ai" (case-insensitive).
        assertThat(json)
                .as("Response không được chứa trường AI nào. JSON: %s", json)
                .doesNotContainPattern("\"ai[A-Za-z]*\"");
    }

    /**
     * Bộ giải lập tham số {@code @CurrentUser} — trả về nhà tuyển dụng giả.
     *
     * <p>Trong app thật, {@code CurrentUserArgumentResolver} của Spring đọc
     * SecurityContext. Ở test standalone MockMvc không có SecurityContext nên
     * cần bộ giải lập riêng.
     */
    private static final class CurrentUserArgumentResolver
            implements org.springframework.web.method.support.HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
            return parameter.hasParameterAnnotation(com.uniwork.security.CurrentUser.class);
        }

        @Override
        public Object resolveArgument(org.springframework.core.MethodParameter parameter,
                                      org.springframework.web.method.support.ModelAndViewContainer mavContainer,
                                      org.springframework.web.context.request.NativeWebRequest webRequest,
                                      org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return User.builder().id(100L).email("employer@uniwork.vn").build();
        }
    }
}
