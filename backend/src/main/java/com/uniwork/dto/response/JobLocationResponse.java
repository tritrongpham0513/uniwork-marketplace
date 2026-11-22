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

    /** Mã xã / phường (5 chữ số, ví dụ "00004") — cấp hành chính chính thức từ 01/07/2025. */
    private String wardId;

    /** Tên xã / phường (ví dụ "Phường Ba Đình"). */
    private String ward;

    private String address;

    /** Tên chi nhánh / địa điểm cụ thể */
    private String branchName;
}
