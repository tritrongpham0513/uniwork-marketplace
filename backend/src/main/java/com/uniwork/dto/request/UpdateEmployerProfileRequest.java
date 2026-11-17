package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cập nhật hồ sơ nhà tuyển dụng — nhận `Partial<EmployerProfile>` của frontend.
 * Trường null bị bỏ qua (không ghi đè dữ liệu cũ).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployerProfileRequest {

    /** COMPANY | INDIVIDUAL */
    private String employerType;

    private String displayName;

    private String contactName;

    private String contactPhone;

    private String taxCode;

    private String description;

    private String logoUrl;

    private String logoVariant;

    private String website;

    private String provinceId;

    private String address;
}
