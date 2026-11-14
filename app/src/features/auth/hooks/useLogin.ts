import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../services/auth.services";
import type { ApiResponse, AuthResponse, LoginRequest } from "../types";
import { saveAuthSession } from "@/utils/authStorage";
import { queryClient } from "@/lib/query-client";
import { AUTH_KEYS } from "./useCurrentUser";
import type { ApiError } from "@/lib/api-error";
import { resetSessionRedirectFlag } from "@/lib/axios";

export const useLogin = (
  options?: UseMutationOptions<ApiResponse<AuthResponse>, ApiError, LoginRequest>
) => {
  const { onSuccess, ...restOptions } = options || {};

  return useMutation({
    ...restOptions,
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (...args) => {
      const [res] = args;
      if (res?.data) {
        // 🔐 Lưu accessToken & thông tin User vào localStorage
        saveAuthSession(res.data);

        // Cho phép chuyển hướng về /login lần sau nếu phiên hết hạn
        resetSessionRedirectFlag();

        // 🔄 Làm mới cache thông tin user trong TanStack Query
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.all });
      }
      onSuccess?.(...args);
    },
  });
};
