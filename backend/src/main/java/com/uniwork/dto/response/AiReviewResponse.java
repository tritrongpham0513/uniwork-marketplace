package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Kết quả kiểm duyệt AI của một tin tuyển dụng.
 *
 * <p>Cùng hình dạng với kết quả lưu trên bản ghi tin tuyển dụng, để giao diện
 * render một chỗ (CONTRACT.md mục 5.6).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewResponse {

    /** "OK" | "WARN" | "SUSPECT". */
    private String verdict;

    /** Một câu tóm tắt tiếng Việt. */
    private String summary;

    private List<AiReasonResponse> reasons;

    /** ISO-8601 — thời điểm AI kiểm tra tin. */
    private String aiCheckedAt;
}
