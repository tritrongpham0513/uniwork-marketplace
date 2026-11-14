import type { Job, JobStatus } from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export interface CreateJobPayload {
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  category: Job["category"];
  position: Job["position"];
  employmentType: Job["employmentType"];
  workMode: Job["workMode"];
  salaryType: Job["salaryType"];
  salaryMin: number;
  salaryMax: number | null;
  location: Job["location"];
  positionsCount: number;
  positionsFilled?: number;
  schedules: Job["schedules"];
  skills: Job["skills"];
  deadline: string | null;
}

export const employerJobService = {
  /**
   * GET /api/v1/employer/jobs — danh sách tin đã đăng.
   */
  list(status?: string): Promise<ApiResponse<Job[]>> {
    return http.get<ApiResponse<Job[]>>("/api/v1/employer/jobs", {
      params: status && status !== "ALL" ? { status } : undefined,
    });
  },

  /**
   * POST /api/v1/employer/jobs — tạo tin tuyển dụng.
   */
  create(payload: CreateJobPayload): Promise<ApiResponse<Job>> {
    return http.post<ApiResponse<Job>, CreateJobPayload>(
      "/api/v1/employer/jobs",
      payload as unknown as Job
    );
  },

  /**
   * PUT /api/v1/employer/jobs/{id} — cập nhật tin tuyển dụng.
   */
  update(id: string, payload: Partial<CreateJobPayload>): Promise<ApiResponse<Job>> {
    return http.put<ApiResponse<Job>, Partial<CreateJobPayload>>(
      `/api/v1/employer/jobs/${id}`,
      payload as unknown as Partial<Job>
    );
  },

  /**
   * DELETE /api/v1/employer/jobs/{id} — huỷ tin tuyển dụng.
   */
  remove(id: string): Promise<ApiResponse<null>> {
    return http.delete<ApiResponse<null>>(`/api/v1/employer/jobs/${id}`);
  },

  /**
   * GET /api/v1/jobs/public/{id} — chi tiết tin (dùng khi sửa tin).
   */
  detail(id: string): Promise<ApiResponse<Job>> {
    return http.get<ApiResponse<Job>>(`/api/v1/jobs/public/${id}`);
  },
};

export type { JobStatus };
export default employerJobService;
