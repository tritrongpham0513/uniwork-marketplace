package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Đầu vào cho nhà cung cấp AI — nội dung tin tuyển dụng đã dựng sẵn thành văn bản.
 *
 * <p>Đây là hợp đồng giữa {@link AiReviewService} và {@link AiProvider}. Tách
 * "dữ liệu đầu vào" khỏi "cách dựng prompt" để provider không phải biết về
 * nghiệp vụ tin tuyển dụng.
 *
 * <p>Ngoài {@link #jobContent} (nội dung tin: tiêu đề, mô tả, yêu cầu, quyền lợi,
 * địa điểm, mức lương...), đầu vào còn mang ngữ cảnh thị trường:
 * mức lương đã quy đổi về đồng/giờ, bảng xếp hạng lương của nhóm việc × tỉnh,
 * và uy tín nhà tuyển dụng — nhờ đó mã {@code SALARY_ANOMALY} trở nên phát hiện được.
 *
 * <p>Không có trường nào chứa dữ liệu cá nhân của sinh viên: không CV, không hồ
 * sơ sinh viên, không đơn ứng tuyển.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewInput {

    /** Nội dung tin tuyển dụng dạng văn bản — nguồn duy nhất để AI đối chiếu bằng chứng. */
    private String jobContent;

    /**
     * Phần nội dung <b>do nhà tuyển dụng viết</b> — nguồn duy nhất được phép làm
     * bằng chứng nguyên văn.
     *
     * <p>Tách khỏi {@link #jobContent} vì {@code jobContent} còn chứa ngữ cảnh
     * thị trường do hệ thống dựng (mức lương quy đổi, bảng xếp hạng, uy tín).
     * Những dòng đó không phải chữ nhà tuyển dụng — quản trị viên đối chiếu
     * bằng mắt sẽ không tìm thấy, nên không được làm bằng chứng.
     */
    private String employerAuthoredContent;

    /** Mức lương của tin: đơn vị trả gốc + mức đã quy đổi về đồng/giờ. */
    private AiSalaryInfo salaryInfo;

    /** Bảng xếp hạng lương của nhóm việc × tỉnh — {@code null} khi không có dòng tương ứng. */
    private AiSalaryBenchmark salaryBenchmark;

    /** Uy tín nhà tuyển dụng — trạng thái xác minh, điểm uy tín, số đánh giá. */
    private AiEmployerTrust employerTrust;
}
