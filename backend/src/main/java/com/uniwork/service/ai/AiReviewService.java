package com.uniwork.service.ai;

import com.uniwork.dto.response.AiReasonResponse;
import com.uniwork.dto.response.AiReviewResponse;
import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Skill;
import com.uniwork.exception.AppException;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.JobPostSkillRepository;
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
    private final JobPostSkillRepository jobPostSkillRepository;
    private final AiContextAssembler contextAssembler;
    private final AiProviderRegistry providerRegistry;
    private final boolean enabled;

    public AiReviewService(
            JobPostRepository jobPostRepository,
            JobPostSkillRepository jobPostSkillRepository,
            AiContextAssembler contextAssembler,
            AiProviderRegistry providerRegistry,
            @Value("${app.ai.enabled:false}") boolean enabled) {

        this.jobPostRepository = jobPostRepository;
        this.jobPostSkillRepository = jobPostSkillRepository;
        this.contextAssembler = contextAssembler;
        this.providerRegistry = providerRegistry;
        this.enabled = enabled;
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

        AiProvider provider;
        try {
            provider = providerRegistry.resolve();
        } catch (AiProviderException ex) {
            log.warn("Bo kiem duyet AI khong chay cho tin {} (admin {}): reason={}",
                    jobId, adminUserId, ex.getReason());
            throw toAppException(ex);
        }

        AiReviewResult raw;
        try {
            raw = provider.review(input);
        } catch (AiProviderException ex) {
            log.warn("AI review that bai cho tin {} (admin {}): reason={}",
                    jobId, adminUserId, ex.getReason());
            throw toAppException(ex);
        }

        AiReviewResult validated = validate(raw, input.getEmployerAuthoredContent());
        if (validated == null) {
            throw new AppException("Kết quả kiểm duyệt AI không hợp lệ. Vui lòng thử lại sau.",
                    HttpStatus.SERVICE_UNAVAILABLE, "AI_INVALID_RESULT");
        }

        LocalDateTime checkedAt = LocalDateTime.now();
        job.setAiVerdict(validated.getVerdict());
        job.setAiSummary(validated.getSummary());
        job.setAiReasons(validated.getReasons());
        job.setAiCheckedAt(checkedAt);
        jobPostRepository.save(job);

        log.info("AI review cho tin {}: verdict={}", jobId, validated.getVerdict());

        return toResponse(validated.getVerdict(), validated.getSummary(),
                validated.getReasons(), checkedAt);
    }

    /** Trạng thái tính năng — frontend dùng để ẩn/hiện nút "Kiểm tra bằng AI". */
    public AiStatusResponse status() {
        return new AiStatusResponse(isEnabled(), providerRegistry.configuredName());
    }

    /**
     * Tính năng chỉ chạy khi vừa bật cờ vừa có khoá API.
     *
     * <p>Endpoint kiểm tra thủ công cũng phải qua cổng này: cờ tắt thì
     * <b>không gọi AI</b> — nếu không, cờ chỉ ẩn nút ở giao diện mà vẫn tiêu
     * hạn mức (spec.md mục 15, CONTRACT.md mục 8).
     */
    public boolean isEnabled() {
        if (!enabled) {
            return false;
        }
        try {
            return providerRegistry.resolve().isConfigured();
        } catch (AiProviderException ex) {
            // Cấu hình trỏ tới nhà cung cấp không tồn tại -> tính năng ẩn.
            return false;
        }
    }

    /**
     * Chặn cổng khi tính năng đang tắt.
     *
     * @throws AppException 503 {@code AI_DISABLED} khi tính năng không bật
     */
    public void requireEnabled() {
        if (!isEnabled()) {
            throw new AppException("Tính năng kiểm duyệt AI hiện không khả dụng.",
                    HttpStatus.SERVICE_UNAVAILABLE, "AI_DISABLED");
        }
    }

    /**
     * Kiểm chứng kết quả thô trước khi ghi.
     *
     * @param raw                    kết quả thô từ nhà cung cấp AI
     * @param employerAuthoredContent phần nội dung <b>do nhà tuyển dụng viết</b> —
     *                              nguồn duy nhất được phép làm bằng chứng nguyên văn
     * @return kết quả đã lọc, hoặc {@code null} nếu sai cấu trúc (không ghi gì)
     */
    private AiReviewResult validate(AiReviewResult raw, String employerAuthoredContent) {
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
            if (!AiEvidenceMatcher.isVerbatim(reason.getEvidence(), employerAuthoredContent)) {
                log.warn("Bo kiem duyet AI tra ve bang chung khong nguyen van trong noi dung "
                        + "nha tuyen dung viet - bo ly do nay.");
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

    /**
     * Dựng đầu vào cho AI từ bản ghi tin tuyển dụng.
     *
     * <p>Kèm ngữ cảnh thị trường (mức lương quy đổi, bảng xếp hạng lương, uy tín
     * nhà tuyển dụng) để AI đối chiếu được mức lương với thị trường — nhờ đó mã
     * {@code SALARY_ANOMALY} phát hiện được. Thiếu bảng xếp hạng thì tin vẫn
     * kiểm tra được, chỉ thiếu căn cứ so sánh.
     */
    private AiReviewInput buildInput(JobPost job) {
        AiSalaryInfo salaryInfo = contextAssembler.salaryInfo(job);
        AiSalaryBenchmark benchmark = contextAssembler.benchmark(job);
        AiEmployerTrust trust = contextAssembler.employerTrust(job);

        return AiReviewInput.builder()
                .jobContent(JobContentAssembler.assemble(
                        job, salaryInfo, benchmark, trust, skillNames(job)))
                .employerAuthoredContent(JobContentAssembler.employerAuthoredContent(job, salaryInfo))
                .salaryInfo(salaryInfo)
                .salaryBenchmark(benchmark)
                .employerTrust(trust)
                .build();
    }

    /**
     * Tên các kỹ năng yêu cầu của tin — spec.md mục 6 yêu cầu gửi kỹ năng yêu
     * cầu cho AI (giúp đối chiếu tin với nhóm việc × tỉnh trong bảng xếp hạng).
     */
    private List<String> skillNames(JobPost job) {
        if (job.getId() == null) {
            return List.of();
        }
        return jobPostSkillRepository.findByJobPostId(job.getId()).stream()
                .map(link -> link.getSkill())
                .filter(skill -> skill != null && skill.getName() != null)
                .map(Skill::getName)
                .toList();
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
