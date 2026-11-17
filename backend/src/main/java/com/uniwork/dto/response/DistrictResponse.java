package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Quận / huyện — khớp 100% với `District` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistrictResponse {

    private String id;

    private String provinceId;

    private String name;
}
