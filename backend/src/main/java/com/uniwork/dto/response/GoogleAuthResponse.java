package com.uniwork.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO phản hồi cho endpoint đăng nhập Google (POST /api/v1/auth/google).
 * Nếu tài khoản chưa có trong hệ thống và chưa chọn role -> needsRole = true.
 * Nếu đã hoàn tất đăng nhập -> trả về accessToken và thông tin user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GoogleAuthResponse {

    private Boolean needsRole;
    private String email;
    private String fullName;
    private String accessToken;
    private String tokenType;
    private Long expiresIn;
    private UserSummaryResponse user;
}

