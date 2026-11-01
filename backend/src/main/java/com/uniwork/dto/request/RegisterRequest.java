package com.uniwork.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO đăng ký tài khoản người dùng mới (FR-01).
 * Hỗ trợ kiểm tra xác nhận mật khẩu và chỉ cho phép vai trò STUDENT hoặc EMPLOYER.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 150, message = "Họ tên không vượt quá 150 ký tự")
    private String fullName;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu phải từ 8 ký tự trở lên")
    private String password;

    @NotBlank(message = "Xác nhận mật khẩu không được để trống")
    @Size(min = 8, max = 100, message = "Xác nhận mật khẩu phải từ 8 ký tự trở lên")
    private String confirmPassword;

    /**
     * Vai trò khi đăng ký.
     * CHỈ chấp nhận STUDENT hoặc EMPLOYER. Tuyệt đối không cho phép ADMIN.
     */
    @NotBlank(message = "Vai trò không được để trống")
    @Pattern(regexp = "^(STUDENT|EMPLOYER)$", message = "Vai trò đăng ký phải là STUDENT hoặc EMPLOYER")
    private String role;

    /**
     * Loại nhà tuyển dụng: COMPANY | INDIVIDUAL (chỉ áp dụng khi role = EMPLOYER).
     */
    @Pattern(regexp = "^(COMPANY|INDIVIDUAL)?$", message = "Loại nhà tuyển dụng phải là COMPANY hoặc INDIVIDUAL")
    private String employerType;
}
