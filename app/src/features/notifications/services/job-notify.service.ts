import type { ApiResponse } from "@/features/shared/types";
import http from "@/lib/axios";

/**
 * Tuỳ chọn "Bật thông báo" cho tin tuyển dụng.
 */
export interface JobNotifyPreference {
  id: string;
  categoryCode: string;
  categoryName: string;
  /** Mã tỉnh — `"ALL"` nghĩa là theo dõi mọi tỉnh. */
  provinceCode: string;
  provinceName: string;
  createdAt: string;
}

export interface JobNotifyPreferencePayload {
  categoryCode: string;
  /** Bỏ trống để theo dõi mọi tỉnh. */
  provinceCode?: string | null;
}

export const jobNotifyService = {
  /**
   * GET /api/v1/student/job-notifications
   */
  list(): Promise<ApiResponse<JobNotifyPreference[]>> {
    return http.get<ApiResponse<JobNotifyPreference[]>>(
      "/api/v1/student/job-notifications"
    );
  },

  /**
   * POST /api/v1/student/job-notifications — bật thông báo
   */
  subscribe(
    payload: JobNotifyPreferencePayload
  ): Promise<ApiResponse<JobNotifyPreference>> {
    return http.post<
      ApiResponse<JobNotifyPreference>,
      JobNotifyPreferencePayload
    >("/api/v1/student/job-notifications", payload);
  },

  /**
   * DELETE /api/v1/student/job-notifications — tắt thông báo
   */
  unsubscribe(
    categoryCode: string,
    provinceCode?: string | null
  ): Promise<ApiResponse<null>> {
    return http.delete<ApiResponse<null>>("/api/v1/student/job-notifications", {
      params: {
        categoryCode,
        ...(provinceCode ? { provinceCode } : {}),
      },
    });
  },
};

export default jobNotifyService;
