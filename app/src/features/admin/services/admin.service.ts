import type {
  AdminUser,
  ApiResponse,
  Job,
  JobCategory,
  JobStatus,
} from "@/features/shared/types";
import http from "@/lib/axios";

export interface AdminDashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalEmployers: number;
  totalJobs: number;
  openJobs: number;
  pendingJobs: number;
  totalApplications: number;
  pendingApplications: number;
  hiddenReviews: number;
  categories: number;
}

export interface AdminCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
}

export const adminService = {
  /**
   * GET /api/v1/admin/dashboard — số liệu tổng quan hệ thống.
   */
  dashboard(): Promise<ApiResponse<AdminDashboardStats>> {
    return http.get<ApiResponse<AdminDashboardStats>>(
      "/api/v1/admin/dashboard"
    );
  },

  /**
   * GET /api/v1/admin/users — danh sách người dùng.
   */
  listUsers(params?: {
    role?: string;
    keyword?: string;
  }): Promise<ApiResponse<AdminUser[]>> {
    return http.get<ApiResponse<AdminUser[]>>("/api/v1/admin/users", {
      params,
    });
  },

  /**
   * PATCH /api/v1/admin/users/{id} — khoá/mở khoá, đổi role.
   */
  updateUser(
    id: string,
    payload: { isLocked?: boolean; role?: AdminUser["role"] }
  ): Promise<ApiResponse<AdminUser>> {
    return http.patch<ApiResponse<AdminUser>, typeof payload>(
      `/api/v1/admin/users/${id}`,
      payload
    );
  },

  /**
   * GET /api/v1/admin/jobs — danh sách tin theo trạng thái.
   */
  listJobs(status?: string): Promise<ApiResponse<Job[]>> {
    return http.get<ApiResponse<Job[]>>("/api/v1/admin/jobs", {
      params: status && status !== "ALL" ? { status } : undefined,
    });
  },

  /**
   * PATCH /api/v1/admin/jobs/{id}/review — duyệt / từ chối tin.
   */
  reviewJob(
    id: string,
    payload: { action: "APPROVE" | "REJECT"; reason?: string }
  ): Promise<ApiResponse<Job>> {
    return http.patch<ApiResponse<Job>, typeof payload>(
      `/api/v1/admin/jobs/${id}/review`,
      payload
    );
  },

  /**
   * GET /api/v1/admin/categories — danh sách nhóm việc.
   */
  listCategories(): Promise<ApiResponse<JobCategory[]>> {
    return http.get<ApiResponse<JobCategory[]>>("/api/v1/admin/categories");
  },

  /**
   * POST /api/v1/admin/categories — tạo nhóm việc.
   */
  createCategory(
    payload: AdminCategoryPayload
  ): Promise<ApiResponse<JobCategory>> {
    return http.post<ApiResponse<JobCategory>, AdminCategoryPayload>(
      "/api/v1/admin/categories",
      payload
    );
  },

  /**
   * PUT /api/v1/admin/categories/{id} — cập nhật nhóm việc.
   */
  updateCategory(
    id: string,
    payload: Partial<JobCategory>
  ): Promise<ApiResponse<JobCategory>> {
    return http.put<ApiResponse<JobCategory>, Partial<JobCategory>>(
      `/api/v1/admin/categories/${id}`,
      payload
    );
  },

  /**
   * DELETE /api/v1/admin/categories/{id} — xoá mềm nhóm việc.
   */
  removeCategory(id: string): Promise<ApiResponse<JobCategory>> {
    return http.delete<ApiResponse<JobCategory>>(
      `/api/v1/admin/categories/${id}`
    );
  },
};

export type { JobStatus };
export default adminService;
