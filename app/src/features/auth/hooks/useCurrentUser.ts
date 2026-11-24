import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { authService } from "../services/auth.services";
import type { ApiResponse, UserSummaryResponse } from "../types";
import { getLocalAccessToken } from "@/utils/authStorage";
import type { ApiError } from "@/lib/api-error";
import { AUTH_KEYS } from "@/features/shared/query-keys";

export { AUTH_KEYS };

export const useCurrentUser = (
  options?: Partial<UseQueryOptions<ApiResponse<UserSummaryResponse>, ApiError>>
) => {
  const token = getLocalAccessToken();
  return useQuery({
    queryKey: AUTH_KEYS.currentUser(),
    queryFn: () => authService.getMe(),
    enabled: !!token,
    // Không retry khi token hết hạn (401) -> tránh spam request và toast
    retry: (failureCount, error) => {
      if (error.status === 401) return false;
      return failureCount < 1;
    },
    ...options,
  });
};
