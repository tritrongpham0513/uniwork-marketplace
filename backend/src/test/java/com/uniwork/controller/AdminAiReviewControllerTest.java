package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.dto.response.AiReasonResponse;
import com.uniwork.dto.response.AiReviewResponse;
import com.uniwork.exception.AppException;
import com.uniwork.exception.GlobalExceptionHandler;
import com.uniwork.service.AdminService;
import com.uniwork.service.JobService;
import com.uniwork.service.ReviewService;
import com.uniwork.service.WorkHistoryService;
import com.uniwork.service.ai.AiReviewService;
import com.uniwork.service.ai.AiStatusResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test cho endpoint kiểm tra AI của quản trị viên.
 *
 * <p>Dùng MockMvc standalone — không chạy SecurityConfig, nên phần phân quyền
 * (403 cho tài khoản không phải quản trị viên) do {@code SecurityConfig} đảm bảo
 * ở tầng filter chain.
 */
@ExtendWith(MockitoExtension.class)
class AdminAiReviewControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdminService adminService;

    @Mock
    private JobService jobService;

    @Mock
    private ReviewService reviewService;

    @Mock
    private WorkHistoryService workHistoryService;

    @Mock
    private AiReviewService aiReviewService;

    private AdminController adminController;

    @BeforeEach
    void setUp() {
        adminController = new AdminController(
                adminService, jobService, reviewService, workHistoryService, aiReviewService);

        mockMvc = MockMvcBuilders.standaloneSetup(adminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new CurrentUserArgumentResolver())
                .build();
    }

    /**
     * Bộ giải lập tham số {@code @CurrentUser} — trả về quản trị viên giả.
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
            return com.uniwork.entity.User.builder().id(1L).email("admin@uniwork.vn").build();
        }
    }

    @Test
    @DisplayName("POST /api/v1/admin/jobs/{id}/ai-review -> Trả về 200 OK với verdict + lý do")
    void aiReview_Returns200WithResult() throws Exception {
        AiReviewResponse result = AiReviewResponse.builder()
                .verdict("SUSPECT")
                .summary("Tin có dấu hiệu yêu cầu tiền trước.")
                .reasons(List.of(AiReasonResponse.builder()
                        .code("FEE_ADVANCE")
                        .evidence("Yeu cau dat coc 500.000d de giu cho")
                        .detail("Yêu cầu đặt cọc trước khi làm việc.")
                        .build()))
                .aiCheckedAt("2026-11-25T10:00:00Z")
                .build();

        when(aiReviewService.reviewJob(eq("job-abc123"), any())).thenReturn(result);

        mockMvc.perform(post(ApiEndpoints.V1_ADMIN + "/jobs/job-abc123/ai-review"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verdict").value("SUSPECT"))
                .andExpect(jsonPath("$.data.summary").value("Tin có dấu hiệu yêu cầu tiền trước."))
                .andExpect(jsonPath("$.data.reasons[0].code").value("FEE_ADVANCE"))
                .andExpect(jsonPath("$.data.reasons[0].evidence").value("Yeu cau dat coc 500.000d de giu cho"))
                .andExpect(jsonPath("$.data.reasons[0].detail").value("Yêu cầu đặt cọc trước khi làm việc."))
                .andExpect(jsonPath("$.data.aiCheckedAt").value("2026-11-25T10:00:00Z"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/jobs/{id}/ai-review khi AI hết hạn mức -> Trả về 503 + thông điệp tiếng Việt (KHÔNG phải 500)")
    void aiReview_Returns503WithVietnameseMessage_WhenQuotaExceeded() throws Exception {
        when(aiReviewService.reviewJob(eq("job-abc123"), any()))
                .thenThrow(new AppException(
                        "Đã hết hạn mức gọi AI. Vui lòng thử lại sau.",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "AI_UNAVAILABLE"));

        mockMvc.perform(post(ApiEndpoints.V1_ADMIN + "/jobs/job-abc123/ai-review"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("AI_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("Đã hết hạn mức gọi AI. Vui lòng thử lại sau."));
    }

    @Test
    @DisplayName("POST /api/v1/admin/jobs/{id}/ai-review khi tin không tồn tại -> Trả về 404")
    void aiReview_Returns404_WhenJobMissing() throws Exception {
        when(aiReviewService.reviewJob(eq("job-abc123"), any()))
                .thenThrow(new AppException("Không tìm thấy tin tuyển dụng này.",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        mockMvc.perform(post(ApiEndpoints.V1_ADMIN + "/jobs/job-abc123/ai-review"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/ai/status -> Trả về enabled + provider")
    void aiStatus_ReturnsEnabledAndProvider() throws Exception {
        when(aiReviewService.status()).thenReturn(new AiStatusResponse(true, "gemini"));

        mockMvc.perform(get(ApiEndpoints.V1_ADMIN + "/ai/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.provider").value("gemini"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/jobs -> Trả về AdminJobResponse (có trường ai_*)")
    void listJobs_ReturnsAdminJobResponse_WithAiFields() throws Exception {
        AdminJobResponse job = AdminJobResponse.builder()
                .id("job-abc123")
                .title("Phuc vu ca dem")
                .aiVerdict("WARN")
                .aiReasons(List.of(AiReasonResponse.builder()
                        .code("OFF_PLATFORM")
                        .evidence("Ung vien lien he Zalo")
                        .detail("Ngoai nen tang.")
                        .build()))
                .aiCheckedAt("2026-11-25T10:00:00Z")
                .build();

        when(jobService.listForAdmin(any())).thenReturn(List.of(job));

        mockMvc.perform(get(ApiEndpoints.V1_ADMIN + "/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].aiVerdict").value("WARN"))
                .andExpect(jsonPath("$.data[0].aiReasons[0].code").value("OFF_PLATFORM"))
                .andExpect(jsonPath("$.data[0].aiCheckedAt").value("2026-11-25T10:00:00Z"));
    }
}
