import http from "@/lib/axios";
import type {
  ApiResponse,
  AuthResponse,
  GoogleAuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  UserSummaryResponse,
  VerifyEmailRequest,
} from "../types";

const AUTH_BASE_PATH = "/api/v1/auth";

export const authService = {
  /**
   * POST /api/v1/auth/register
   * Đăng ký tài khoản mới (STUDENT hoặc EMPLOYER) và kích hoạt gửi mail xác thực.
   */
  register: (data: RegisterRequest) => {
    return http.post<ApiResponse<null>, RegisterRequest>(
      `${AUTH_BASE_PATH}/register`,
      data
    );
  },

  /**
   * POST /api/v1/auth/login
   * Đăng nhập bằng Email & Mật khẩu, trả về JWT Access Token cùng thông tin User.
   */
  login: (data: LoginRequest) => {
    return http.post<ApiResponse<AuthResponse>, LoginRequest>(
      `${AUTH_BASE_PATH}/login`,
      data
    );
  },

  /**
   * POST /api/v1/auth/google
   * Đăng nhập / Đăng ký nhanh thông qua Google OAuth2 ID Token.
   * Nếu tài khoản mới chưa có vai trò, trả về needsRole = true.
   */
  googleLogin: (data: GoogleLoginRequest) => {
    return http.post<ApiResponse<GoogleAuthResponse>, GoogleLoginRequest>(
      `${AUTH_BASE_PATH}/google`,
      data
    );
  },

  /**
   * POST /api/v1/auth/verify-email
   * Xác thực tài khoản qua chuỗi Token gửi từ email (dành cho client/giao diện).
   */
  verifyEmail: (data: VerifyEmailRequest) => {
    return http.post<ApiResponse<null>, VerifyEmailRequest>(
      `${AUTH_BASE_PATH}/verify-email`,
      data
    );
  },

  /**
   * POST /api/v1/auth/resend-verification
   * Yêu cầu gửi lại email kích hoạt (Backend có cơ chế rate limit 60 giây/lần).
   */
  resendVerification: (data: ResendVerificationRequest) => {
    return http.post<ApiResponse<null>, ResendVerificationRequest>(
      `${AUTH_BASE_PATH}/resend-verification`,
      data
    );
  },

  /**
   * GET /api/v1/auth/me
   * Lấy thông tin tài khoản hiện tại từ Bearer Token trong Authorization header.
   */
  getMe: () => {
    return http.get<ApiResponse<UserSummaryResponse>>(`${AUTH_BASE_PATH}/me`);
  },
};

export default authService;
