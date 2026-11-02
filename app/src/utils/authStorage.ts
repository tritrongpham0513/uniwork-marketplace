import type { AuthResponse, UserSummaryResponse } from "@/features/auth/types";

/**
 * 💾 Utility functions để quản lý authentication data trong localStorage
 *
 * Bao gồm:
 * - Tokens (access_token, refresh_token)
 * - User Profile (user_profile)
 * - Quản lý phiên đăng nhập (saveAuthSession, clearAuthSession)
 */

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_PROFILE_KEY = "user_profile";

// ============================================
// 🔐 TOKEN MANAGEMENT
// ============================================
export const saveLocalAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const saveLocalRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getLocalAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getLocalRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ============================================
// 👤 USER PROFILE MANAGEMENT
// ============================================
export const saveLocalUser = (user: UserSummaryResponse): void => {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
};

export const getLocalUser = (): UserSummaryResponse | null => {
  const user = localStorage.getItem(USER_PROFILE_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user) as UserSummaryResponse;
  } catch {
    return null;
  }
};

export const removeLocalUser = (): void => {
  localStorage.removeItem(USER_PROFILE_KEY);
};

// ============================================
// 📦 COMPLETE AUTH SESSION (TOKEN + USER)
// ============================================
export const saveAuthSession = (authData: AuthResponse): void => {
  if (authData.accessToken) {
    saveLocalAccessToken(authData.accessToken);
  }
  if (authData.user) {
    saveLocalUser(authData.user);
  }
};

export const clearAuthSession = (): void => {
  clearTokens();
  removeLocalUser();
};

export const isAuthenticated = (): boolean => {
  return !!getLocalAccessToken();
};
