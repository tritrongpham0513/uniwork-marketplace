package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO tóm tắt thông tin người dùng (trả về trong AuthResponse và endpoint /api/v1/auth/me).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {

    private Long id;
    private String email;
    private String role;
    private String fullName;
    private String status;
    private LocalDateTime emailVerifiedAt;
    private String authProvider;
}

