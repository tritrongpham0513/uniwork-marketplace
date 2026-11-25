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

    /** Dựng nội dung tin tuyển dụng dạng văn bản (chỉ phần nội dung tin). */
    public static String assemble(JobPost job) {
        return assemble(job, null, null, null);
    }

    /**
     * Dựng nội dung tin tuyển dụng kèm ngữ cảnh thị trường.
     *
     * <p>Ba khối ngữ cảnh phía sau là dữ liệu tham chiếu cho AI:
     * mức lương đã quy đổi về đồng/giờ, bảng xếp hạng lương của nhóm việc ×
     * tỉnh, và uy tín nhà tuyển dụng. Thiếu khối nào thì bỏ trống khối đó —
     * tin vẫn kiểm tra được.
     */
    public static String assemble(JobPost job,
                                  AiSalaryInfo salaryInfo,
                                  AiSalaryBenchmark salaryBenchmark,
                                  AiEmployerTrust employerTrust) {
        StringBuilder sb = new StringBuilder();

        appendLine(sb, "Tieu de", job.getTitle());
        appendLine(sb, "Mo ta", job.getDescription());
        appendList(sb, "Yeu cau", job.getRequirements());
        appendList(sb, "Quyen loi", job.getBenefits());
        appendLine(sb, "Hinh thuc lam viec", job.getWorkMode());
        appendLine(sb, "Loai hinh lam viec", job.getEmploymentType());
        appendLine(sb, "So suat", job.getPositionsCount() == null
                ? null : job.getPositionsCount() + " nguoi");
        appendSalary(sb, salaryInfo);
        appendBenchmark(sb, salaryBenchmark);
        appendTrust(sb, employerTrust);

        return sb.toString().strip();
    }

    /**
     * Dòng mức lương: đơn vị gốc nhà tuyển dụng khai báo + mức quy đổi về
     * đồng/giờ.
     *
     * <p>Đơn vị không quy đổi được ({@code PER_TASK}, {@code NEGOTIABLE}) ghi rõ
     * là không quy đổi được — để AI không suy luận {@code SALARY_ANOMALY} từ chúng.
     */
    private static void appendSalary(StringBuilder sb, AiSalaryInfo salary) {
        if (salary == null || salary.getSalaryType() == null || salary.getSalaryType().isBlank()) {
            return;
        }
        sb.append("Muc luong: ").append(salary.getSalaryType());
        if (salary.getOriginalMin() != null || salary.getOriginalMax() != null) {
            sb.append(", tu ").append(salary.getOriginalMin() == null ? "?" : salary.getOriginalMin())
                    .append(" den ")
                    .append(salary.getOriginalMax() == null ? "?" : salary.getOriginalMax())
                    .append(" VND");
        }
        if (salary.isConvertible()) {
            sb.append(" (quy doi ")
                    .append(salary.getHourlyMin() == null ? "?" : salary.getHourlyMin())
                    .append(" - ")
                    .append(salary.getHourlyMax() == null ? "?" : salary.getHourlyMax())
                    .append(" VND/gio)");
        } else {
            sb.append(" (khong quy doi duoc sang VND/gio)");
        }
        sb.append('\n');
    }

    /**
     * Dòng bảng xếp hạng lương của nhóm việc × tỉnh — bốn số AI cần để đối
     * chiếu: trung bình, thấp nhất, cao nhất, cỡ mẫu.
     */
    private static void appendBenchmark(StringBuilder sb, AiSalaryBenchmark benchmark) {
        if (benchmark == null) {
            return;
        }
        sb.append("Xep hang luong nhom viec");
        if (benchmark.getCategoryName() != null && !benchmark.getCategoryName().isBlank()) {
            sb.append(" \"").append(benchmark.getCategoryName()).append('"');
        }
        if (benchmark.getProvinceName() != null && !benchmark.getProvinceName().isBlank()) {
            sb.append(" tai ").append(benchmark.getProvinceName());
        }
        sb.append(": trung binh ").append(benchmark.getAvgHourly()).append(" VND/gio")
                .append(", thap nhat ").append(benchmark.getMinHourly())
                .append(", cao nhat ").append(benchmark.getMaxHourly())
                .append(", co mau ").append(benchmark.getSampleSize()).append(" tin")
                .append('\n');
    }

    /** Dòng uy tín nhà tuyển dụng: trạng thái xác minh, điểm uy tín, số đánh giá. */
    private static void appendTrust(StringBuilder sb, AiEmployerTrust trust) {
        if (trust == null) {
            return;
        }
        sb.append("Uy tin nha tuyen dung: ")
                .append(Boolean.TRUE.equals(trust.getVerified()) ? "da xac minh" : "chua xac minh")
                .append(", diem uy tin trung binh ")
                .append(trust.getAvgRating() == null ? "chua co danh gia" : trust.getAvgRating())
                .append("/5 tren ")
                .append(trust.getRatingCount() == null ? 0 : trust.getRatingCount())
                .append(" danh gia")
                .append('\n');
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
