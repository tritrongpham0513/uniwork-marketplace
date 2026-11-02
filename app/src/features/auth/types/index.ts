// ============================================
// CHUNG (API RESPONSE WRAPPER)
// Khớp với com.uniwork.dto.response.ApiResponse
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

// Khớp với com.uniwork.dto.response.ErrorResponse
export interface FieldErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  code?: string;
  message: string;
  errors?: FieldErrorDetail[];
}

// ============================================
// ROLES & ENUMS
// ============================================
export type RoleType = "STUDENT" | "EMPLOYER" | "ADMIN";
export type RegisterRoleType = "STUDENT" | "EMPLOYER";
export type EmployerType = "COMPANY" | "INDIVIDUAL";
export type UserStatus = "ACTIVE" | "PENDING_VERIFY" | "LOCKED";
export type AuthProvider = "LOCAL" | "GOOGLE";

// ============================================
// USER DTO
// Khớp với com.uniwork.dto.response.UserSummaryResponse
// ============================================
export interface UserSummaryResponse {
  id: number;
  email: string;
  role: RoleType;
  fullName: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  authProvider: AuthProvider;
}

// ============================================
// REQUEST DTOs
// ============================================

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
