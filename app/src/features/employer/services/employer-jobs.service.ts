import type { ApiResponse, Job, JobStatus } from "@/features/shared/types";
import http from "@/lib/axios";

export type EmployerJobStatusAction = Extract<
  JobStatus,
  "CLOSED" | "OPEN" | "COMPLETED"
>;

export interface UpdateJobStatusPayload {
  status: EmployerJobStatusAction;
}

export interface CreateJobPayload {
  title: string;
  /**
   * Ảnh preview của tin tuyển dụng.
   *
   * <p>`null` = không gửi trường này (giữ ảnh cũ khi sửa tin), chuỗi rỗng =
   * xoá ảnh. Backend kiểm tra ảnh phải thuộc về chính nhà tuyển dụng đang đăng.
   */
  previewImageUrl: string | null;
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
  update(
    id: string,
    payload: Partial<CreateJobPayload>
  ): Promise<ApiResponse<Job>> {
    return http.put<ApiResponse<Job>, Partial<CreateJobPayload>>(
      `/api/v1/employer/jobs/${id}`,
      payload as unknown as Partial<Job>
    );
  },
  /**
   * PATCH /api/v1/employer/jobs/{id}/status — đóng / mở lại / hoàn thành tin.
   */
  updateStatus(
    id: string,
    status: EmployerJobStatusAction
  ): Promise<ApiResponse<Job>> {
    return http.patch<ApiResponse<Job>, UpdateJobStatusPayload>(
      `/api/v1/employer/jobs/${id}/status`,
      { status }
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
