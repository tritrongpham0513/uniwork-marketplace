package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO trả về sau khi đăng nhập thành công.
 * Định dạng: { accessToken, tokenType: "Bearer", expiresIn: 86400, user: { ... } }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;

    @Builder.Default
    private String tokenType = "Bearer";

    @Builder.Default
    private Long expiresIn = 86400L; // 24 giờ tính bằng giây

    private UserSummaryResponse user;
}
