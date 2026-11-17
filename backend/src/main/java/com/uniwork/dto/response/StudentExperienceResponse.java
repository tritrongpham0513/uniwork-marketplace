package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kinh nghiệm làm việc của sinh viên — khớp 100% với `StudentExperience` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentExperienceResponse {

    private String id;

    private String company;

    private String position;

    private String startDate;

    private String endDate;

    private String description;
}
