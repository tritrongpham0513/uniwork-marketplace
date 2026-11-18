import type { SavedJob } from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export const savedJobService = {
  /**
   * GET /api/v1/student/saved-jobs
   */
  list(): Promise<ApiResponse<SavedJob[]>> {
    return http.get<ApiResponse<SavedJob[]>>("/api/v1/student/saved-jobs");
  },

  /**
   * GET /api/v1/student/saved-jobs/ids
   */
  ids(): Promise<ApiResponse<string[]>> {
    return http.get<ApiResponse<string[]>>("/api/v1/student/saved-jobs/ids");
  },

  /**
   * POST /api/v1/student/saved-jobs — lưu tin
   */
  save(jobId: string): Promise<ApiResponse<SavedJob>> {
    return http.post<ApiResponse<SavedJob>, { jobId: string }>(
      "/api/v1/student/saved-jobs",
      { jobId }
    );
  },

  /**
   * DELETE /api/v1/student/saved-jobs/{jobId} — bỏ lưu tin
   */
  remove(jobId: string): Promise<ApiResponse<null>> {
    return http.delete<ApiResponse<null>>(
      `/api/v1/student/saved-jobs/${jobId}`
    );
  },
};

export default savedJobService;
