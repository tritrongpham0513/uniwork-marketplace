import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  AuthResponse,
  ErrorResponse,
  LoginRequest,
} from "../types";
import { saveLocalAccessToken } from "@/utils/authStorage";

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
      if (res?.data?.accessToken) {
        saveLocalAccessToken(res.data.accessToken);
      }
      onSuccess?.(...args);
    },
  });
};
