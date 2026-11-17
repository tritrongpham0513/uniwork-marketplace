package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO trả về sau khi đăng nhập thành công.
 * Định dạng: { accessToken, tokenType: "Bearer", expiresIn: 86400, user: { ... } }
 *
 * <p>`refreshToken` là trường bổ sung để frontend lưu vào localStorage
 * (dùng cho {@code POST /api/v1/auth/refresh}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;

    /** Refresh token (plain) — frontend lưu vào localStorage để làm mới phiên */
    private String refreshToken;

    @Builder.Default
    private String tokenType = "Bearer";

    @Builder.Default
    private Long expiresIn = 86400L; // 24 giờ tính bằng giây

    private UserSummaryResponse user;
}
