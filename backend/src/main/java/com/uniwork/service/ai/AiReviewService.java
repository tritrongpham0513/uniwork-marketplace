package com.uniwork.service.ai;

import com.uniwork.dto.response.AiReasonResponse;
import com.uniwork.dto.response.AiReviewResponse;
import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.entity.JobPost;
import com.uniwork.exception.AppException;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.util.DateTimeUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Điều phối kiểm duyệt nội dung tin tuyển dụng bằng AI.
 *
 * <p>Luồng: tải tin → dựng đầu vào → gọi nhà cung cấp → <b>kiểm chứng</b> →
 * ghi vào bản ghi tin tuyển dụng.
 *
 * <p>Nguyên tắc bất di bất dịch: <b>sai cấu trúc thì không ghi gì</b>. Lỗi AI
 * không được làm hỏng dữ liệu tin tuyển dụng đang có.
 */
@Slf4j
@Service
public class AiReviewService {

    /** Thông điệp tiếng Việt theo từng nguyên nhân lỗi (CONTRACT.md mục 5.2). */
    private static final String MSG_QUOTA = "Đã hết hạn mức gọi AI. Vui lòng thử lại sau.";
    private static final String MSG_SERVICE = "Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.";
    private static final String MSG_NOT_CONFIGURED = "Tính năng kiểm duyệt AI chưa được cấu hình.";
    private static final String MSG_TIMEOUT = "AI không phản hồi trong thời gian cho phép. Vui lòng thử lại sau.";

    private final JobPostRepository jobPostRepository;
    private final AiProvider provider;
    private final boolean enabled;
    private final String providerName;

    public AiReviewService(
            JobPostRepository jobPostRepository,
            AiProvider provider,
            @Value("${app.ai.enabled:false}") boolean enabled,
            @Value("${app.ai.provider:gemini}") String providerName) {

        this.jobPostRepository = jobPostRepository;
        this.provider = provider;
        this.enabled = enabled;
        this.providerName = providerName;
    }

    /**
     * Kiểm tra thủ công 1 tin tuyển dụng bằng AI (chỉ quản trị viên).
     *
     * @param jobId       public id (slug) của tin tuyển dụng
     * @param adminUserId id quản trị viên (để ghi log)
     * @return kết quả kiểm duyệt đã lưu
     */
    @Transactional
    public AiReviewResponse reviewJob(String jobId, Long adminUserId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> new AppException("Không tìm thấy tin tuyển dụng này.",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        AiReviewInput input = buildInput(job);

        AiReviewResult raw;
        try {
            raw = provider.review(input);
        } catch (AiProviderException ex) {
            log.warn("AI review that bai cho tin {} (admin {}): reason={}",
                    jobId, adminUserId, ex.getReason());
            throw toAppException(ex);
        }

        AiReviewResult validated = validate(raw, input.getJobContent());
        if (validated == null) {
            throw new AppException("Kết quả kiểm duyệt AI không hợp lệ. Vui lòng thử lại sau.",
                    HttpStatus.SERVICE_UNAVAILABLE, "AI_INVALID_RESULT");
        }

        LocalDateTime checkedAt = LocalDateTime.now();
        job.setAiVerdict(validated.getVerdict());
        job.setAiReasons(validated.getReasons());
        job.setAiCheckedAt(checkedAt);
        jobPostRepository.save(job);

        log.info("AI review cho tin {}: verdict={}", jobId, validated.getVerdict());

        return toResponse(validated.getVerdict(), validated.getSummary(),
                validated.getReasons(), checkedAt);
    }

    /** Trạng thái tính năng — frontend dùng để ẩn/hiện nút "Kiểm tra bằng AI". */
    public AiStatusResponse status() {
        return new AiStatusResponse(isEnabled(), providerName);
    }

    /** Tính năng chỉ chạy khi vừa bật cờ vừa có khoá API. */
    public boolean isEnabled() {
        return enabled && provider.isConfigured();
    }

    /**
     * Kiểm chứng kết quả thô trước khi ghi.
     *
     * @return kết quả đã lọc, hoặc {@code null} nếu sai cấu trúc (không ghi gì)
     */
    private AiReviewResult validate(AiReviewResult raw, String jobContent) {
        if (raw == null) {
            log.warn("Bo kiem duyet AI tra ve ket qua rong - bo qua, khong ghi gi.");
            return null;
        }

        String verdict = raw.getVerdict() == null ? "" : raw.getVerdict().trim().toUpperCase();
        if (!AiPromptBuilder.VALID_VERDICTS.contains(verdict)) {
            log.warn("Bo kiem duyet AI tra ve verdict khong hop le: {} - bo qua, khong ghi gi.",
                    raw.getVerdict());
            return null;
        }

        List<AiReason> reasons = raw.getReasons() == null ? List.of() : raw.getReasons();

        // Quy tắc bất buộc: verdict OK thì danh sách lý do phải rỗng.
        if ("OK".equals(verdict) && !reasons.isEmpty()) {
            log.warn("Bo kiem duyet AI tra ve verdict OK kem {} ly do - bo qua, khong ghi gi.",
                    reasons.size());
            return null;
        }

        List<AiReason> validReasons = new ArrayList<>();
        for (AiReason reason : reasons) {
            if (reason == null) {
                continue;
            }
            String code = reason.getCode() == null ? "" : reason.getCode().trim().toUpperCase();
            if (!AiPromptBuilder.VALID_CODES.contains(code)) {
                log.warn("Bo kiem duyet AI tra ve ma vi pham khong hop le: {} - bo ly do nay.",
                        reason.getCode());
                continue;
            }
            if (!AiEvidenceMatcher.isVerbatim(reason.getEvidence(), jobContent)) {
                log.warn("Bo kiem duyet AI tra ve bang chung khong nguyen van - bo ly do nay.");
                continue;
            }
            validReasons.add(AiReason.builder()
                    .code(code)
                    .evidence(reason.getEvidence().trim())
                    .detail(reason.getDetail() == null ? "" : reason.getDetail().trim())
                    .build());
        }

        return AiReviewResult.builder()
                .verdict(verdict)
                .summary(raw.getSummary() == null ? "" : raw.getSummary().trim())
                .reasons(validReasons)
                .build();
    }

    /** Dịch lỗi nhà cung cấp thành {@link AppException} 503 kèm thông điệp tiếng Việt. */
    private AppException toAppException(AiProviderException ex) {
        String message = switch (ex.getReason() == null ? "" : ex.getReason()) {
            case "QUOTA_EXCEEDED" -> MSG_QUOTA;
            case "NOT_CONFIGURED" -> MSG_NOT_CONFIGURED;
            case "TIMEOUT" -> MSG_TIMEOUT;
            default -> MSG_SERVICE;
        };
        return new AppException(message, HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE");
    }

    /** Dựng đầu vào cho AI từ bản ghi tin tuyển dụng. */
    private AiReviewInput buildInput(JobPost job) {
        return AiReviewInput.builder()
                .jobContent(JobContentAssembler.assemble(job))
                .build();
    }

    /** Chuyển kết quả đã kiểm chứng sang DTO trả về. */
    private AiReviewResponse toResponse(String verdict, String summary,
                                       List<AiReason> reasons, LocalDateTime checkedAt) {
        List<AiReasonResponse> reasonResponses = reasons.stream()
                .map(r -> AiReasonResponse.builder()
                        .code(r.getCode())
                        .evidence(r.getEvidence())
                        .detail(r.getDetail())
                        .build())
                .toList();

        return AiReviewResponse.builder()
                .verdict(verdict)
                .summary(summary)
                .reasons(reasonResponses)
                .aiCheckedAt(DateTimeUtils.toIso(checkedAt))
                .build();
    }
}
