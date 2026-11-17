package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tỉnh / thành phố — khớp 100% với `Province` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceResponse {

    private String id;

    private String name;
}
