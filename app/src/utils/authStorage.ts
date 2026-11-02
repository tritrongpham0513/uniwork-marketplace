/**
 * 💾 Utility functions để quản lý authentication data trong localStorage
 *
 * Bao gồm:
 * - Tokens (access_token, refresh_token)
 * - User Profile
 */

// ============================================
// 🔐 TOKEN MANAGEMENT
// ============================================
export const saveLocalAccessToken = (token: string) =>
  localStorage.setItem("access_token", token);

export const saveLocalRefreshToken = (token: string) =>
  localStorage.setItem("refresh_token", token);

export const getLocalAccessToken = () => localStorage.getItem("access_token");

export const getLocalRefreshToken = () => localStorage.getItem("refresh_token");

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};
