package com.uniwork.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO đăng nhập bằng Google ID Token (POST /api/v1/auth/google).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoogleLoginRequest {

    @NotBlank(message = "Google ID Token không được để trống")
    private String idToken;

    /**
     * Vai trò đăng ký (chỉ truyền khi người dùng mới đăng nhập Google lần đầu).
     * Chỉ chấp nhận STUDENT hoặc EMPLOYER.
     */
    @Pattern(regexp = "^(STUDENT|EMPLOYER)?$", message = "Vai trò phải là STUDENT hoặc EMPLOYER")
    private String role;
}

