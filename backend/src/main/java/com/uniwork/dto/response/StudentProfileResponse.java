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

    /** Danh sách public id kỹ năng */
    private List<String> skills;

    private List<StudentExperienceResponse> experiences;

    private StudentJobPreferenceResponse jobPreferences;

    private Double avgRating;

    private Integer ratingCount;

    private String createdAt;
}
