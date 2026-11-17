package com.uniwork.service;

import com.uniwork.dto.request.UpdateEmployerProfileRequest;
import com.uniwork.dto.request.UpdateStudentProfileRequest;
import com.uniwork.dto.response.EmployerProfileResponse;
import com.uniwork.dto.response.PublicEmployerProfileResponse;
import com.uniwork.dto.response.StudentProfileResponse;

/**
 * Nghiệp vụ hồ sơ (sinh viên & nhà tuyển dụng).
 */
public interface ProfileService {

    /** Hồ sơ sinh viên đang đăng nhập. */
    StudentProfileResponse getStudentProfile(Long userId);

    /** Cập nhật hồ sơ sinh viên (chỉ ghi đè trường khác null). */
    StudentProfileResponse updateStudentProfile(Long userId, UpdateStudentProfileRequest request);

    /** Hồ sơ nhà tuyển dụng đang đăng nhập. */
    EmployerProfileResponse getEmployerProfile(Long userId);

    /** Cập nhật hồ sơ nhà tuyển dụng (chỉ ghi đè trường khác null). */
    EmployerProfileResponse updateEmployerProfile(Long userId, UpdateEmployerProfileRequest request);

    /** Hồ sơ công khai của nhà tuyển dụng + tin đang mở + đánh giá. */
    PublicEmployerProfileResponse getPublicEmployerProfile(String employerId);
}
