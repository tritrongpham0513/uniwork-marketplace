package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

/**
 * Tin tuyển dụng — dành riêng cho quản trị viên.
 *
 * <p>Mở rộng {@link JobResponse} bằng 3 trường kết quả kiểm duyệt AI. Vì
 * {@code JobResponse} gốc <b>không</b> có các trường này, mọi endpoint công khai
 * và endpoint dành cho nhà tuyển dụng không thể vô tình lộ ra kết quả AI
 * (CONTRACT.md mục 6).
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class AdminJobResponse extends JobResponse {

    /** Kết quả kiểm duyệt AI — null nghĩa là CHƯA KIỂM TRA (khác với `OK`). */
    private String aiVerdict;

    /** Danh sách lý do vi phạm kèm bằng chứng nguyên văn. */
    private List<AiReasonResponse> aiReasons;

    /**
     * Câu tóm tắt tiếng Việt của AI.
     *
     * <p>Khác {@code null} với {@code ""}: chuỗi rỗng nghĩa là AI đã kiểm tra
     * nhưng không tóm tắt; {@code null} nghĩa là chưa kiểm tra.
     */
    private String aiSummary;

    /** Thời điểm AI kiểm tra tin (ISO-8601). */
    private String aiCheckedAt;
}
