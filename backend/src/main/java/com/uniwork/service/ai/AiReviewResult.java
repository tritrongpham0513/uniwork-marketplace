package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Kết quả thô do nhà cung cấp AI trả về.
 *
 * <p>Đây là dữ liệu <b>chưa được kiểm chứng</b> — {@link AiReviewService} mới là
 * nơi áp dụng luật (mã hợp lệ, bằng chứng nguyên văn, verdict OK không kèm lý do).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewResult {

    /** "OK" | "WARN" | "SUSPECT". */
    private String verdict;

    /** Một câu tóm tắt tiếng Việt. */
    private String summary;

    /** Danh sách lý do vi phạm (có thể rỗng). */
    private List<AiReason> reasons;
}
