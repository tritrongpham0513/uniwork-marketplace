import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../services/auth.services";
import type { ApiResponse, RegisterRequest } from "../types";
import type { ApiError } from "@/lib/api-error";

export const useRegister = (
  options?: UseMutationOptions<ApiResponse<null>, ApiError, RegisterRequest>
) => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    ...options,
  });
};
