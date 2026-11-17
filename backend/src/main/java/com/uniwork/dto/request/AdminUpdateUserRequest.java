package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cập nhật người dùng (quản trị) — khoá / mở khoá, đổi vai trò.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateUserRequest {

    private Boolean isLocked;

    /** STUDENT | EMPLOYER | ADMIN */
    private String role;
}
