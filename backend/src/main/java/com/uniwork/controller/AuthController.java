package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.GoogleLoginRequest;
import com.uniwork.dto.request.LoginRequest;
import com.uniwork.dto.request.RegisterRequest;
import com.uniwork.dto.request.ResendVerificationRequest;
import com.uniwork.dto.request.VerifyEmailRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.AuthResponse;
import com.uniwork.dto.response.GoogleAuthResponse;
import com.uniwork.dto.response.UserSummaryResponse;
import com.uniwork.exception.AppException;
import com.uniwork.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller Xác thực phiên bản v1 (/api/v1/auth).
 * Đạt chuẩn RESTful: đăng ký, kích hoạt email Gmail, đăng nhập email/pass, đăng nhập Google, resend token.
 */
@RestController
@RequestMapping(ApiEndpoints.V1_AUTH)
@RequiredArgsConstructor
@Tag(name = "Authentication v1", description = "Các API xác thực tài khoản và phân quyền (v1)")
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/register
     * Đăng ký tài khoản người dùng mới (STUDENT hoặc EMPLOYER).
     */
    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới & gửi email kích hoạt")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.", null));
    }

    /**
     * GET /api/v1/auth/verify-email?token=...
     * Endpoint bấm từ liên kết trong email: trả về trang HTML tối giản tiếng Việt.
     */
    @GetMapping(value = "/verify-email", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    @Operation(summary = "Xác thực email qua liên kết web (trả về HTML)")
    public ResponseEntity<String> verifyEmailHtml(@RequestParam("token") String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("text/html;charset=UTF-8"));

        try {
            authService.verifyEmail(token);
            String html = """
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Xác thực thành công - UniWork</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f8fafc; }
                            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 450px; width: 90%; }
                            .icon { width: 64px; height: 64px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
                            h1 { color: #1e293b; font-size: 22px; margin-bottom: 12px; }
                            p { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="icon">✓</div>
                            <h1>Xác thực email thành công!</h1>
                            <p>Tài khoản của bạn đã được kích hoạt thành công. Bây giờ bạn có thể đăng nhập vào UniWork Marketplace để bắt đầu tìm kiếm hoặc đăng tin việc làm.</p>
                        </div>
                    </body>
                    </html>
                    """;
            return new ResponseEntity<>(html, headers, HttpStatus.OK);

        } catch (AppException ex) {
            String errorHtml = """
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Xác thực thất bại - UniWork</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f8fafc; }
                            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 450px; width: 90%; }
                            .icon { width: 64px; height: 64px; background: #fee2e2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
                            h1 { color: #1e293b; font-size: 22px; margin-bottom: 12px; }
                            p { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="icon">✕</div>
                            <h1>Xác thực không thành công</h1>
                            <p>{{ERROR_MSG}}</p>
                        </div>
                    </body>
                    </html>
                    """.replace("{{ERROR_MSG}}", ex.getMessage() != null ? ex.getMessage() : "Mã xác thực không hợp lệ.");
            return new ResponseEntity<>(errorHtml, headers, HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * POST /api/v1/auth/verify-email
     * Xác thực email bằng JSON cho client / Postman.
     */
    @PostMapping("/verify-email")
    @Operation(summary = "Xác thực email qua JSON API")
    public ResponseEntity<ApiResponse<Void>> verifyEmailJson(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.getToken());
        return ResponseEntity.ok(ApiResponse.success("Xác thực email thành công. Bạn đã có thể đăng nhập vào hệ thống.", null));
    }

    /**
     * POST /api/v1/auth/resend-verification
     * Gửi lại email xác thực (chống spam 60s/lần).
     */
    @PostMapping("/resend-verification")
    @Operation(summary = "Gửi lại email xác thực")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(
                "Nếu địa chỉ email tồn tại trên hệ thống, chúng tôi đã gửi lại liên kết kích hoạt. Vui lòng kiểm tra hộp thư.", null));
    }

    /**
     * POST /api/v1/auth/login
     * Đăng nhập bằng email và mật khẩu.
     */
    @PostMapping("/login")
    @Operation(summary = "Đăng nhập bằng Email & Mật khẩu")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    /**
     * POST /api/v1/auth/google
     * Đăng nhập / Đăng ký nhanh qua Google OAuth2 ID Token.
     */
    @PostMapping("/google")
    @Operation(summary = "Đăng nhập qua Google ID Token")
    public ResponseEntity<ApiResponse<GoogleAuthResponse>> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        GoogleAuthResponse response = authService.googleLogin(request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý xác thực Google thành công", response));
    }

    /**
     * GET /api/v1/auth/me
     * Lấy thông tin tài khoản đang đăng nhập (yêu cầu Bearer token).
     */
    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin tài khoản hiện tại")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> getCurrentUser(Authentication authentication) {
        UserSummaryResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", response));
    }
}
