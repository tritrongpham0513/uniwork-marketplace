package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Trả lời đánh giá — body `{ "reply": "..." }`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplyReviewRequest {

    private String reply;
}
