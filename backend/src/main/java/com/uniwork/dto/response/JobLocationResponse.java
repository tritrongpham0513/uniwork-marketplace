package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Địa điểm làm việc — khớp 100% với `JobLocation` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobLocationResponse {

    private String provinceId;

    private String province;

    private String districtId;

    private String district;

    private String address;

    /** Tên chi nhánh / địa điểm cụ thể */
    private String branchName;
}
