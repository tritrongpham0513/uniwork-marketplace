package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Tin tuyển dụng — khớp 100% với `Job` của frontend.
 *
 * Mọi id đều là string (public id) để frontend so khớp trực tiếp với
 * dữ liệu đã lưu.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobResponse {

    private String id;

    private String title;

    private String description;

    private List<String> requirements;

    private List<String> benefits;

    private JobCategoryResponse category;

    private JobPositionResponse position;

    private EmployerSummaryResponse employer;

    /** FULL_TIME | PART_TIME | FLEXIBLE | CASUAL */
    private String employmentType;

    /** ONSITE | REMOTE | HYBRID */
    private String workMode;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    private String salaryType;

    private Integer salaryMin;

    private Integer salaryMax;

    private JobLocationResponse location;

    private Integer positionsCount;

    private Integer positionsFilled;

    private List<JobScheduleResponse> schedules;

    private List<SkillResponse> skills;

    private String status;

    private String postedAt;

    private String deadline;

    private Integer applicantCount;

    private Boolean isUrgent;

    private Integer viewCount;

    /** Public id của nhà tuyển dụng (dùng để phân quyền NTD) */
    private String employerId;
}
