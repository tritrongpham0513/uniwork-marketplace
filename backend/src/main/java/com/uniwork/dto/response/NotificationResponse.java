package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Thông báo — khớp 100% với `Notification` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private String id;

    private Long userId;

    /** APPLICATION | APPLICATION_STATUS | JOB | REVIEW | SYSTEM */
    private String type;

    private String title;

    private String body;

    private Boolean isRead;

    private String link;

    private String createdAt;
}
