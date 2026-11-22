package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Người dùng trong màn hình quản trị — khớp 100% với `AdminUser` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {

    private Long id;

    private String email;

    /** STUDENT | EMPLOYER | ADMIN */
    private String role;

    private String fullName;

    /** ACTIVE | PENDING_VERIFY | LOCKED */
    private String status;

    private String emailVerifiedAt;

    /** LOCAL | GOOGLE */
    private String authProvider;

    private String phone;

    private String companyName;

    private String university;

    /** Ảnh đại diện — sinh viên: avatar, nhà tuyển dụng: logo (có thể null). */
    private String avatarUrl;

    private Boolean isLocked;

    private String joinedAt;

    private String lastLoginAt;

    private Long totalApplications;

    private Long totalJobs;
}
