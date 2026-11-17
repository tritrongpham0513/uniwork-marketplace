package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Mục tiêu việc làm của sinh viên — khớp 100% với `StudentJobPreference` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentJobPreferenceResponse {

    private List<String> categoryIds;

    private List<String> employmentTypes;

    private Integer salaryMin;

    private Integer salaryMax;

    private List<String> provinceIds;
}
