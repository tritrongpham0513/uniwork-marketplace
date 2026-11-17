package com.uniwork.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation đánh dấu tham số controller cần inject người dùng hiện tại.
 *
 * <p>Ví dụ:
 * <pre>{@code
 * @GetMapping("/profile")
 * public ApiResponse<StudentProfileResponse> profile(@CurrentUser User user) { ... }
 * }</pre>
 *
 * <p>Nếu chưa đăng nhập, hệ thống trả về 401 với envelope lỗi chuẩn.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface CurrentUser {
}
