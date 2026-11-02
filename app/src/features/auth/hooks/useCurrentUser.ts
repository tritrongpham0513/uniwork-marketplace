import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authService } from "../services/auth.services";
import type { ApiResponse, ErrorResponse, UserSummaryResponse } from "../types";
import { getLocalAccessToken } from "@/utils/authStorage";

export const AUTH_KEYS = {
  all: ["auth"] as const,
  currentUser: () => [...AUTH_KEYS.all, "me"] as const,
};

export const useCurrentUser = (
  options?: Partial<
    UseQueryOptions<ApiResponse<UserSummaryResponse>, AxiosError<ErrorResponse>>
  >
) => {
  const token = getLocalAccessToken();
  return useQuery({
    queryKey: AUTH_KEYS.currentUser(),
    queryFn: () => authService.getMe(),
    enabled: !!token,
    ...options,
  });
};

