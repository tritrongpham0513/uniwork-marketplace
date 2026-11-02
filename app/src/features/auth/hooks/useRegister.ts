import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type { ApiResponse, ErrorResponse, RegisterRequest } from "../types";

export const useRegister = (
  options?: UseMutationOptions<
    ApiResponse<null>,
    AxiosError<ErrorResponse>,
    RegisterRequest
  >
) => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    ...options,
  });
};

