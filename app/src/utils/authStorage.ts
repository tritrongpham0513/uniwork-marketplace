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
// 🔔 REACTIVE STORE
// ============================================

/**
 * Cho phép các component theo dõi thay đổi của phiên đăng nhập.
 *
 * Vì sao cần: `localStorage` không phải là nguồn dữ liệu reactive. Nếu chỉ
 * đọc bằng `localStorage.getItem()` trong lúc render, việc đăng xuất sẽ
 * không kích hoạt render lại -> UI vẫn hiện trạng thái "đã đăng nhập" cho tới
 * khi F5. Khi có subscriber, mọi thay đổi sẽ chủ động thông báo cho React.
 */
type AuthListener = () => void;

const listeners = new Set<AuthListener>();

/** Đăng ký lắng nghe thay đổi phiên. Trả về hàm gỡ listener. */
export const subscribeAuth = (listener: AuthListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Thông báo cho các subscriber rằng phiên đăng nhập đã thay đổi. */
const notifyAuthChanged = (): void => {
  listeners.forEach((listener) => listener());
};

// ============================================
// 🔐 TOKEN MANAGEMENT
// ============================================
export const saveLocalAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  notifyAuthChanged();
};

export const saveLocalRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  notifyAuthChanged();
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
  notifyAuthChanged();
};

// ============================================
// 👤 USER PROFILE MANAGEMENT
// ============================================
export const saveLocalUser = (user: UserSummaryResponse): void => {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  notifyAuthChanged();
};

export const getLocalUser = (): UserSummaryResponse | null => {
  const user = getLocalUserRaw();
  if (!user) return null;
  try {
    return JSON.parse(user) as UserSummaryResponse;
  } catch {
    return null;
  }
};

/**
 * Đọc nguyên văn JSON của user profile trong localStorage.
 *
 * Hàm này trả về chuỗi (giá trị nguyên thuỷ) nên an toàn để dùng làm
 * `getSnapshot` của `useSyncExternalStore` — không tạo object mới mỗi lần
 * render (điều mà `getLocalUser` vốn làm và gây vòng lặp render vô hạn).
 */
export const getLocalUserRaw = (): string | null => {
  return localStorage.getItem(USER_PROFILE_KEY);
};

export const removeLocalUser = (): void => {
  localStorage.removeItem(USER_PROFILE_KEY);
  notifyAuthChanged();
};

// ============================================
// 📦 COMPLETE AUTH SESSION (TOKEN + USER)
// ============================================
export const saveAuthSession = (authData: AuthResponse): void => {
  if (authData.accessToken) {
    saveLocalAccessToken(authData.accessToken);
  }
  if (authData.refreshToken) {
    saveLocalRefreshToken(authData.refreshToken);
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
