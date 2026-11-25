package com.uniwork.service.ai;

import com.uniwork.entity.JobPost;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Dựng nội dung tin tuyển dụng thành văn bản đưa cho AI.
 *
 * <p>Tách riêng khỏi {@link AiReviewService} để ticket 03 có thể bổ sung thêm
 * ngữ cảnh (xếp hạng lương, uy tín nhà tuyển dụng) mà không phải sửa lớp
 * điều phối.
 *
 * <p>Văn bản này cũng là nguồn đối chiếu bằng chứng nguyên văn: mọi
 * {@code evidence} AI trả về phải xuất hiện trong chính văn bản này.
 */
public final class JobContentAssembler {

    private JobContentAssembler() {
    }

    /** Dựng nội dung tin tuyển dụng dạng văn bản. */
    public static String assemble(JobPost job) {
        StringBuilder sb = new StringBuilder();

        appendLine(sb, "Tieu de", job.getTitle());
        appendLine(sb, "Mo ta", job.getDescription());
        appendList(sb, "Yeu cau", job.getRequirements());
        appendList(sb, "Quyen loi", job.getBenefits());
        appendLine(sb, "Hinh thuc lam viec", job.getWorkMode());
        appendLine(sb, "Loai hinh lam viec", job.getEmploymentType());
        appendLine(sb, "So suat", job.getPositionsCount() == null
                ? null : job.getPositionsCount() + " nguoi");

        return sb.toString().strip();
    }

    private static void appendLine(StringBuilder sb, String label, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        sb.append(label).append(": ").append(value.strip()).append('\n');
    }

    private static void appendList(StringBuilder sb, String label, List<String> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        List<String> cleaned = values.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::strip)
                .collect(Collectors.toList());
        if (cleaned.isEmpty()) {
            return;
        }
        sb.append(label).append(":\n");
        for (String value : cleaned) {
            sb.append("  - ").append(value).append('\n');
        }
    }
}
