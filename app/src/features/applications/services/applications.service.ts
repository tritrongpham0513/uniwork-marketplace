import type {
  Application,
  ApplicationStatus,
} from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export interface CreateApplicationPayload {
  jobId: string;
  cvUrl?: string | null;
  cvFileName?: string | null;
  coverLetter?: string;
  expectedSalary?: number | null;
  /** Kinh nghiệm liên quan */
  experience?: string;
  /** Ngày có thể bắt đầu làm việc (ISO date) */
  availableFrom?: string | null;
}

export interface UpdateApplicationPayload {
  status: ApplicationStatus;
  note?: string;
}

export const applicationService = {
  /**
   * GET /api/v1/student/applications — đơn ứng tuyển của sinh viên.
   */
  listByStudent(status?: string): Promise<ApiResponse<Application[]>> {
    return http.get<ApiResponse<Application[]>>("/api/v1/student/applications", {
      params: status && status !== "ALL" ? { status } : undefined,
    });
  },

  /**
   * GET /api/v1/student/applications/{id}
   */
  detailForStudent(id: string): Promise<ApiResponse<Application>> {
    return http.get<ApiResponse<Application>>(
      `/api/v1/student/applications/${id}`
    );
  },

  /**
   * POST /api/v1/student/applications — nộp đơn ứng tuyển.
   */
  create(
    payload: CreateApplicationPayload
  ): Promise<ApiResponse<Application>> {
    return http.post<ApiResponse<Application>, CreateApplicationPayload>(
      "/api/v1/student/applications",
      payload
    );
  },

  /**
   * PATCH /api/v1/student/applications/{id}/withdraw — rút đơn.
   */
  withdraw(id: string): Promise<ApiResponse<Application>> {
    return http.patch<ApiResponse<Application>>(
      `/api/v1/student/applications/${id}/withdraw`
    );
  },

  /**
   * GET /api/v1/employer/applications — danh sách ứng viên.
   */
  listByEmployer(
    params?: { jobId?: string; status?: string }
  ): Promise<ApiResponse<Application[]>> {
    return http.get<ApiResponse<Application[]>>(
      "/api/v1/employer/applications",
      { params }
    );
  },

  /**
   * GET /api/v1/employer/applications/{id}
   */
  detailForEmployer(id: string): Promise<ApiResponse<Application>> {
    return http.get<ApiResponse<Application>>(
      `/api/v1/employer/applications/${id}`
    );
  },

  /**
   * PATCH /api/v1/employer/applications/{id} — duyệt / từ chối.
   */
  updateStatus(
    id: string,
    payload: UpdateApplicationPayload
  ): Promise<ApiResponse<Application>> {
    return http.patch<ApiResponse<Application>, UpdateApplicationPayload>(
      `/api/v1/employer/applications/${id}`,
      payload
    );
  },
};

export default applicationService;
