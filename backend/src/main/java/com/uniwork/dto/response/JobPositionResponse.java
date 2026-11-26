package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vị trí công việc — khớp 100% với `JobPosition` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPositionResponse {

    private String id;

    /** Public id của nhóm việc chứa vị trí này */
    private String categoryId;

    private String name;

    private String slug;

    private Integer jobCount;

    private Boolean isActive;
}
