package com.uniwork.service;

import com.uniwork.dto.request.GoogleLoginRequest;
import com.uniwork.dto.request.LoginRequest;
import com.uniwork.dto.request.RegisterRequest;
import com.uniwork.dto.response.AuthResponse;
import com.uniwork.dto.response.GoogleAuthResponse;
import com.uniwork.dto.response.UserSummaryResponse;

/**
 * Interface định nghĩa toàn bộ nghiệp vụ xác thực người dùng (Auth Module — v1).
 */
public interface AuthService {

    /**
     * Đăng ký tài khoản người dùng mới (STUDENT hoặc EMPLOYER).
     * Tạo User (PENDING_VERIFY) + Profile trong cùng Transaction và gửi email xác thực.
     */
    void register(RegisterRequest request);

    /**
     * Xác thực email kích hoạt tài khoản bằng token gốc.
     */
    void verifyEmail(String rawToken);

    /**
     * Gửi lại email xác thực (có cơ chế giới hạn tần suất 60s/lần).
     */
    void resendVerification(String email);

    /**
     * Đăng nhập bằng email và mật khẩu (kiểm tra mật khẩu trước, xét PENDING_VERIFY/LOCKED).
     */
    AuthResponse login(LoginRequest request);

    /**
     * Đăng nhập hoặc đăng ký nhanh bằng Google OAuth2 ID Token.
     */
    GoogleAuthResponse googleLogin(GoogleLoginRequest request);

    /**
     * Lấy thông tin tài khoản hiện tại từ Bearer JWT (/api/v1/auth/me).
     */
    UserSummaryResponse getCurrentUser(String email);
}
