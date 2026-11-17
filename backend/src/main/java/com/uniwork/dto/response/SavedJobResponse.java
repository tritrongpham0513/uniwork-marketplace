package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tin đã lưu — khớp 100% với `SavedJob` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedJobResponse {

    private String id;

    /** Public id của tin tuyển dụng */
    private String jobId;

    private Long userId;

    private String createdAt;
}
