package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Hồ sơ NTD công khai — khớp 100% với `PublicEmployerProfile` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicEmployerProfileResponse {

    private EmployerProfileResponse profile;

    private List<JobResponse> jobs;

    private List<ReviewResponse> reviews;
}
