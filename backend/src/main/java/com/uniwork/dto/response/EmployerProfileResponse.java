package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hồ sơ nhà tuyển dụng — khớp 100% với `EmployerProfile` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployerProfileResponse {

    private String id;

    private Long userId;

    /** COMPANY | INDIVIDUAL */
    private String employerType;

    private String displayName;

    private String contactName;

    private String contactPhone;

    private String taxCode;

    private String description;

    private String logoUrl;

    private String website;

    private String provinceId;

    private String address;

    private Boolean isVerified;

    private Double avgRating;

    private Integer ratingCount;

    private String createdAt;
}
