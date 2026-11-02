import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  ErrorResponse,
  GoogleAuthResponse,
  GoogleLoginRequest,
} from "../types";
import { saveAuthSession } from "@/utils/authStorage";
import { queryClient } from "@/lib/query-client";
import { AUTH_KEYS } from "./useCurrentUser";

export const useGoogleLogin = (
  options?: UseMutationOptions<
    ApiResponse<GoogleAuthResponse>,
    AxiosError<ErrorResponse>,
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
        // 🔐 Lưu access token và profile user khi đăng nhập Google thành công
        saveAuthSession({
          accessToken: res.data.accessToken,
          tokenType: res.data.tokenType || "Bearer",
          expiresIn: res.data.expiresIn || 86400,
          user: res.data.user,
        });

        // 🔄 Làm mới cache TanStack Query
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.all });
      }
      onSuccess?.(...args);
    },
  });
};

