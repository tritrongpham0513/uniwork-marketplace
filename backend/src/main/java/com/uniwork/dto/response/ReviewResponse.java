package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Đánh giá 2 chiều — khớp 100% với `Review` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private String id;

    private String jobId;

    private String jobTitle;

    private String applicationId;

    private Long fromUserId;

    /** STUDENT | EMPLOYER | ADMIN */
    private String fromRole;

    private String fromName;

    private String fromAvatarUrl;

    /** EMPLOYER | STUDENT */
    private String targetType;

    private Long targetUserId;

    private String targetName;

    private Integer rating;

    private String comment;

    private String reply;

    private Boolean isHidden;

    private String createdAt;
}
