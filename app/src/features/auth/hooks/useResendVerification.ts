import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  ResendVerificationRequest,
} from "../types";
import type { ApiError } from "@/lib/api-error";

export const useResendVerification = (
  options?: UseMutationOptions<
    ApiResponse<null>,
    ApiError,
    ResendVerificationRequest
  >
) => {
  return useMutation({
    mutationFn: (data: ResendVerificationRequest) =>
      authService.resendVerification(data),
    ...options,
  });
};
