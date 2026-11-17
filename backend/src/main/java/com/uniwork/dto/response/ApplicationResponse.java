package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Đơn ứng tuyển — khớp 100% với `Application` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationResponse {

    private String id;

    private String jobId;

    private String jobTitle;

    private String employerId;

    private String employerName;

    private String employerLogoVariant;

    private Boolean employerVerified;

    private String studentId;

    private String studentName;

    private String studentAvatarUrl;

    private String studentUniversity;

    private String studentMajor;

    private Integer studentYear;

    private String studentPhone;

    private String studentEmail;

    /** Danh sách public id kỹ năng của sinh viên */
    private List<String> studentSkills;

    private String studentBio;

    private String cvUrl;

    private String cvFileName;

    private String coverLetter;

    private Integer expectedSalary;

    /** Kinh nghiệm liên quan do sinh viên khai báo khi ứng tuyển */
    private String experience;

    /** Ngày có thể bắt đầu làm việc (yyyy-MM-dd) */
    private String availableFrom;

    private String status;

    private String employerNote;

    private List<ApplicationStatusEventResponse> timeline;

    private String createdAt;

    private String updatedAt;
}
