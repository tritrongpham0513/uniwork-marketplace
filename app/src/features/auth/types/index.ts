// ============================================
// CHUNG (API RESPONSE WRAPPER)
// Khớp với com.uniwork.dto.response.ApiResponse
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================
// ERROR TYPES
// Dùng chung với @/lib/api-error để tránh khai báo trùng lặp
// ============================================
export type {
  ApiError,
  ApiErrorKind,
  ErrorResponse,
  FieldErrorDetail,
} from "@/lib/api-error";

import type {
  EmployerType,
  UserSummaryResponse,
} from "@/features/shared/types";

// ============================================
// ROLES & ENUMS
// Nguồn sự thật: @/features/shared/types
// ============================================
export type {
  AuthProvider,
  EmployerType,
  RoleType,
  UserStatus,
} from "@/features/shared/types";

/** Chỉ 2 role được đăng ký (Admin do hệ thống quản lý) */
export type RegisterRoleType = "STUDENT" | "EMPLOYER";

// ============================================
// USER DTO
// Khớp với com.uniwork.dto.response.UserSummaryResponse
// ============================================
export type { UserSummaryResponse };

// Khớp với com.uniwork.dto.request.RegisterRequest
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: RegisterRoleType;
  employerType?: EmployerType;
}

// Khớp với com.uniwork.dto.request.LoginRequest
export interface LoginRequest {
  email: string;
  password: string;
}

// Khớp với com.uniwork.dto.request.GoogleLoginRequest
export interface GoogleLoginRequest {
  idToken: string;
  role?: RegisterRoleType;
}

// Khớp với com.uniwork.dto.request.VerifyEmailRequest
export interface VerifyEmailRequest {
  token: string;
}

// Khớp với com.uniwork.dto.request.ResendVerificationRequest
export interface ResendVerificationRequest {
  email: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

// Khớp với com.uniwork.dto.response.AuthResponse
export interface AuthResponse {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // 86400 (giây)
  user: UserSummaryResponse;
}

// Khớp với com.uniwork.dto.response.GoogleAuthResponse
export interface GoogleAuthResponse {
  needsRole?: boolean;
  email?: string;
  fullName?: string;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserSummaryResponse;
}

// Legacy alias nếu có component cũ đang dùng
export type LoginResponse = AuthResponse;
