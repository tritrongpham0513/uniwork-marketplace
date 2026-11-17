package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Cập nhật hồ sơ sinh viên — nhận `Partial<StudentProfile>` của frontend.
 * Trường null bị bỏ qua (không ghi đè dữ liệu cũ).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentProfileRequest {

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

    /** Kinh nghiệm làm việc */
    private List<ExperienceItem> experiences;

    /** Mục tiêu việc làm */
    private JobPreferenceItem jobPreferences;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExperienceItem {
        private String id;
        private String company;
        private String position;
        private String startDate;
        private String endDate;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobPreferenceItem {
        private List<String> categoryIds;
        private List<String> employmentTypes;
        private Integer salaryMin;
        private Integer salaryMax;
        private List<String> provinceIds;
    }
}
