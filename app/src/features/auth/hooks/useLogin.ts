import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  AuthResponse,
  ErrorResponse,
  LoginRequest,
} from "../types";
import { saveAuthSession } from "@/utils/authStorage";
import { queryClient } from "@/lib/query-client";
import { AUTH_KEYS } from "./useCurrentUser";

export const useLogin = (
  options?: UseMutationOptions<
    ApiResponse<AuthResponse>,
    AxiosError<ErrorResponse>,
    LoginRequest
  >
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

        // 🔄 Làm mới cache thông tin user trong TanStack Query
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.all });
      }
      onSuccess?.(...args);
    },
  });
};
