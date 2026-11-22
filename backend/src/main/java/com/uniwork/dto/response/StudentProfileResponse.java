package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Hồ sơ sinh viên — khớp 100% với `StudentProfile` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfileResponse {

    private String id;

    private Long userId;

    private String fullName;

    private String phone;

    private String dateOfBirth;

    /** MALE | FEMALE | OTHER */
    private String gender;

    private String studentCode;

    private String university;

    private String major;

    private Integer yearOfStudy;

    private String provinceId;

    private String address;

    private String bio;

    private String avatarUrl;

    private String cvUrl;

    /** Tên file CV gốc (để hiển thị, ví dụ "CV-NguyenVanA.pdf"). */
    private String cvFileName;

    /**
     * MIME type thật của CV (đã xác minh bằng magic bytes lúc upload).
     *
     * <p>Frontend dùng để biết có render nội dung PDF trực tiếp hay chỉ cho
     * tải xuống (DOC/DOCX không render được).
     */
    private String cvMimeType;

    /** Danh sách public id kỹ năng */
    private List<String> skills;

    private List<StudentExperienceResponse> experiences;

    /** Lịch sử làm việc do hệ thống tự ghi khi đơn ứng tuyển hoàn thành */
    private List<WorkHistoryResponse> workHistories;

    private StudentJobPreferenceResponse jobPreferences;

    private Double avgRating;

    private Integer ratingCount;

    private String createdAt;
}
