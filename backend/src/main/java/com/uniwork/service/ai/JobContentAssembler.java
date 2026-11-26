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
 * <p><b>Hai vùng văn bản, hai vai trò khác nhau</b>:
 *
 * <ul>
 *   <li><b>Nội dung tin</b> ({@link #assemble(JobPost, AiSalaryInfo, AiSalaryBenchmark,
 *       AiEmployerTrust, List)}) — toàn bộ khối dữ liệu gửi cho AI, gồm cả ngữ
 *       cảnh thị trường do hệ thống dựng.</li>
 *   <li><b>Nội dung do nhà tuyển dụng viết</b> ({@link #employerAuthoredContent(JobPost)}) —
 *       <b>riêng** phần AI được phép trích làm bằng chứng nguyên văn.</li>
 * </ul>
 *
 * <p>Vì sao tách: quản trị viên đối chiếu bằng chứng bằng mắt — bằng chứng phải
 * là câu <b>nhà tuyển dụng đã viết</b> trong tin. Nếu cho phép trích từ dòng
 * hệ thống dựng (mức lương quy đổi, bảng xếp hạng, uy tín) thì AI có thể gắn
 * dòng "Xep hang luong ... trung binh 28000 VND/gio" làm bằng chứng cho lý do
 * `DISCRIMINATION` — người đọc không tìm thấy câu đó trong tin, và cơ chế
 * "bằng chứng nguyên văn" trở nên vô nghĩa.
 */
public final class JobContentAssembler {

    private JobContentAssembler() {
    }

    /**
     * Phần nội dung <b>do nhà tuyển dụng viết</b> — nguồn duy nhất được phép làm
     * bằng chứng nguyên văn.
     *
     * <p>Bao gồm: tiêu đề, mô tả, yêu cầu, quyền lợi, địa điểm, nhóm việc, hình
     * thức làm việc, loại hình làm việc, số suất, kỹ năng, và <b>dòng mức lương
     * nhà tuyển dụng khai báo</b>.
     *
     * <p>Không bao gồm: dòng bảng xếp hạng lương và dòng uy tín nhà tuyển dụng —
     * vì đó là dữ liệu về <b>tin khác</b> và về <b>danh tiếng tích luỹ</b>, không
     * phải chữ nhà tuyển dụng viết. Trích dòng đó làm bằng chứng sẽ tạo ra một
     * "bằng chứng" mà quản trị viên không thể tìm thấy trong tin — và cơ chế
     * "bằng chứng nguyên văn" trở nên vô nghĩa.
     *
     * <p>Dòng mức lương thì **có** nằm trong vùng này: nhà tuyển dụng tự khai
     * báo mức lương và đơn vị trả, phần quy đổi chỉ là quy tắc công khai của
     * hệ thống (bảng quy ước 8/40/160 giờ) mà nhà tuyển dụng đã chọn đơn vị đó.
     * Quản trị viên thấy đúng con số này ở thẻ "Lương" của tin.
     *
     * @param salaryInfo mức lương đã chuẩn hoá của tin (có thể {@code null})
     */
    public static String employerAuthoredContent(JobPost job, AiSalaryInfo salaryInfo) {
        StringBuilder sb = new StringBuilder();

        appendLine(sb, "Tieu de", job.getTitle());
        appendLine(sb, "Mo ta", job.getDescription());
        appendList(sb, "Yeu cau", job.getRequirements());
        appendList(sb, "Quyen loi", job.getBenefits());
        appendLine(sb, "Dia diem", location(job));
        appendLine(sb, "Nhom viec", job.getCategory() == null ? null : job.getCategory().getName());
        appendLine(sb, "Hinh thuc lam viec", job.getWorkMode());
        appendLine(sb, "Loai hinh lam viec", job.getEmploymentType());
        appendLine(sb, "So suat", job.getPositionsCount() == null
                ? null : job.getPositionsCount() + " nguoi");
        appendSalary(sb, salaryInfo);

        return sb.toString().strip();
    }

    /** Dựng nội dung tin tuyển dụng dạng văn bản (chỉ phần nội dung tin). */
    public static String assemble(JobPost job) {
        return assemble(job, null, null, null, List.of());
    }

    /**
     * Dựng nội dung tin tuyển dụng kèm ngữ cảnh thị trường.
     *
     * <p>Ba khối ngữ cảnh phía sau là dữ liệu tham chiếu cho AI:
     * mức lương đã quy đổi về đồng/giờ, bảng xếp hạng lương của nhóm việc ×
     * tỉnh, và uy tín nhà tuyển dụng. Thiếu khối nào thì bỏ trống khối đó —
     * tin vẫn kiểm tra được.
     *
     * @param skills tên kỹ năng yêu cầu của tin (spec.md mục 6)
     */
    public static String assemble(JobPost job,
                                  AiSalaryInfo salaryInfo,
                                  AiSalaryBenchmark salaryBenchmark,
                                  AiEmployerTrust employerTrust,
                                  List<String> skills) {
        StringBuilder sb = new StringBuilder();

        appendLine(sb, "Tieu de", job.getTitle());
        appendLine(sb, "Mo ta", job.getDescription());
        appendList(sb, "Yeu cau", job.getRequirements());
        appendList(sb, "Quyen loi", job.getBenefits());
        appendLine(sb, "Dia diem", location(job));
        appendLine(sb, "Nhom viec", job.getCategory() == null ? null : job.getCategory().getName());
        appendLine(sb, "Hinh thuc lam viec", job.getWorkMode());
        appendLine(sb, "Loai hinh lam viec", job.getEmploymentType());
        appendLine(sb, "So suat", job.getPositionsCount() == null
                ? null : job.getPositionsCount() + " nguoi");
        appendSalary(sb, salaryInfo);
        appendBenchmark(sb, salaryBenchmark);
        appendTrust(sb, employerTrust);
        appendList(sb, "Ky nang", skills);

        return sb.toString().strip();
    }

    /**
     * Địa điểm làm việc — tỉnh + xã/phường + chi nhánh (nếu có).
     *
     * <p>Cần cho AI vì tin tuyển ngoài nền tảng thường nêu địa điểm rõ ràng;
     * thiếu nó thì AI không đối chiếu được tin với nhóm việc × tỉnh trong bảng
     * xếp hạng lương.
     */
    private static String location(JobPost job) {
        StringBuilder sb = new StringBuilder();

        if (job.getProvince() != null && job.getProvince().getName() != null) {
            sb.append(job.getProvince().getName());
        }
        if (job.getWard() != null && job.getWard().getName() != null) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(job.getWard().getName());
        }
        if (job.getAddressDetail() != null && !job.getAddressDetail().isBlank()) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(job.getAddressDetail().strip());
        }
        if (job.getBranchName() != null && !job.getBranchName().isBlank()) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(job.getBranchName().strip());
        }

        return sb.length() == 0 ? null : sb.toString();
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
