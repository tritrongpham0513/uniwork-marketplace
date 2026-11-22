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

    /** Logo tổ chức — ảnh đại diện của nhà tuyển dụng (có thể null). */
    private String employerLogoUrl;

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

    /**
     * MIME type thật của CV (đã xác minh bằng magic bytes lúc upload).
     *
     * <p>Frontend dùng để biết có render nội dung PDF trực tiếp hay chỉ cho
     * tải xuống (DOC/DOCX không render được).
     */
    private String cvMimeType;

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
