import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type {
  ApiResponse,
  ErrorResponse,
  ResendVerificationRequest,
} from "../types";

export const useResendVerification = (
  options?: UseMutationOptions<
    ApiResponse<null>,
    AxiosError<ErrorResponse>,
    ResendVerificationRequest
  >
) => {
  return useMutation({
    mutationFn: (data: ResendVerificationRequest) =>
      authService.resendVerification(data),
    ...options,
  });
};

