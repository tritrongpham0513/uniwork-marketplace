package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tạo đánh giá 2 chiều — khớp 100% với `CreateReviewPayload` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewRequest {

    /** Public id của đơn ứng tuyển */
    private String applicationId;

    /** Điểm 1..5 */
    private Integer rating;

    private String comment;
}
