package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cặp token làm mới — khớp với `RefreshTokenResponse` mà frontend đọc
 * trong `app/src/lib/axios.ts` (`response.data.data.access_token`).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenResponse {

    private String access_token;

    private String refresh_token;

    /** Token type — luôn là "Bearer" */
    private String token_type;

    /** Thời hạn access token (giây) */
    private Long expires_in;
}
