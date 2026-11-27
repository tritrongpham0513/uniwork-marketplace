import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  GoogleAuthResponse,
  GoogleLoginRequest,
} from "../types";
import { saveAuthSession } from "@/utils/authStorage";
import { queryClient } from "@/lib/query-client";
import { AUTH_KEYS } from "./useCurrentUser";
import type { ApiError } from "@/lib/api-error";
import { resetSessionRedirectFlag } from "@/lib/axios";

export const useGoogleLogin = (
  options?: UseMutationOptions<
    ApiResponse<GoogleAuthResponse>,
    ApiError,
    GoogleLoginRequest
  >
) => {
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (data: GoogleLoginRequest) => authService.googleLogin(data),
    onSuccess: (...args) => {
      const [res] = args;
      if (res?.data?.accessToken && res.data?.user) {
        // 🔐 Lưu access/refresh token và profile user khi đăng nhập Google thành công
        saveAuthSession({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          tokenType: res.data.tokenType || "Bearer",
          expiresIn: res.data.expiresIn || 86400,
          user: res.data.user,
        });

        // Cho phép chuyển hướng về /login lần sau nếu phiên hết hạn
        resetSessionRedirectFlag();

        // 🔄 Làm mới cache TanStack Query
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.all });
      }
      onSuccess?.(...args);
    },
  });
};
