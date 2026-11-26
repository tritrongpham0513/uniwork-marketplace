import type {
  AdminJob,
  AdminUser,
  AiFeatureStatus,
  AiReview,
  ApiResponse,
  EmployerProfile,
  Job,
  JobCategory,
  JobPosition,
  JobStatus,
  Review,
  SalaryBenchmark,
} from "@/features/shared/types";
import http from "@/lib/axios";

/** Hồ sơ NTD công khai — bọc gồm hồ sơ, tin tuyển dụng và đánh giá. */
export interface PublicEmployerProfile {
  profile: EmployerProfile;
  jobs: Job[];
  reviews: Review[];
}

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

export interface AdminPositionPayload {
  categoryId: string;
  name: string;
  slug?: string;
  isActive?: boolean;
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
   *
   * <p>Trả về {@link AdminJob} — **có** kèm kết quả kiểm duyệt AI. Endpoint
   * này dành riêng cho quản trị viên.
   */
  listJobs(status?: string): Promise<ApiResponse<AdminJob[]>> {
    return http.get<ApiResponse<AdminJob[]>>("/api/v1/admin/jobs", {
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
   * POST /api/v1/admin/jobs/{id}/ai-review — kiểm tra thủ công 1 tin bằng AI.
   *
   * <p>Mỗi lần gọi là **một lượt AI** — nên gọi có chủ đích.
   * <p>Endpoint **không** đổi trạng thái tin tuyển dụng.
   */
  reviewJobWithAi(id: string): Promise<ApiResponse<AiReview>> {
    return http.post<ApiResponse<AiReview>>(
      `/api/v1/admin/jobs/${id}/ai-review`
    );
  },

  /**
   * GET /api/v1/admin/ai/status — tính năng AI có đang bật không.
   *
   * <p>Backend trả `enabled = false` khi thiếu khoá API -> frontend ẩn nút
   * "Kiểm tra bằng AI" thay vì để quản trị viên bấm vào rồi nhận lỗi.
   */
  aiStatus(): Promise<ApiResponse<AiFeatureStatus>> {
    return http.get<ApiResponse<AiFeatureStatus>>("/api/v1/admin/ai/status");
  },

  /**
   * GET /api/v1/public/salary-benchmarks — bảng xếp hạng lương ngành × tỉnh.
   *
   * <p>Dùng để quản trị viên thấy mức lương của tin so với mức trung bình
   * của ngành và tỉnh — một trong những dấu hiệu AI dùng để gắn cờ.
   */
  salaryBenchmarks(): Promise<ApiResponse<SalaryBenchmark[]>> {
    return http.get<ApiResponse<SalaryBenchmark[]>>(
      "/api/v1/public/salary-benchmarks"
    );
  },

  /**
   * GET /api/v1/public/employers/{id} — hồ sơ nhà tuyển dụng công khai.
   *
   * <p>Quản trị viên cần xem điểm uy tín để cân nhắc khi duyệt tin.
   */
  publicEmployer(id: string): Promise<ApiResponse<PublicEmployerProfile>> {
    return http.get<ApiResponse<PublicEmployerProfile>>(
      `/api/v1/public/employers/${id}`
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

  /**
   * GET /api/v1/admin/positions — danh sách vị trí công việc.
   */
  listPositions(categoryId?: string): Promise<ApiResponse<JobPosition[]>> {
    const query = categoryId
      ? `?categoryId=${encodeURIComponent(categoryId)}`
      : "";
    return http.get<ApiResponse<JobPosition[]>>(
      `/api/v1/admin/positions${query}`
    );
  },

  /**
   * POST /api/v1/admin/positions — tạo vị trí công việc.
   */
  createPosition(
    payload: AdminPositionPayload
  ): Promise<ApiResponse<JobPosition>> {
    return http.post<ApiResponse<JobPosition>, AdminPositionPayload>(
      "/api/v1/admin/positions",
      payload
    );
  },

  /**
   * PUT /api/v1/admin/positions/{id} — cập nhật vị trí công việc.
   */
  updatePosition(
    id: string,
    payload: Partial<AdminPositionPayload>
  ): Promise<ApiResponse<JobPosition>> {
    return http.put<ApiResponse<JobPosition>, Partial<AdminPositionPayload>>(
      `/api/v1/admin/positions/${id}`,
      payload
    );
  },

  /**
   * DELETE /api/v1/admin/positions/{id} — xoá mềm vị trí công việc.
   */
  removePosition(id: string): Promise<ApiResponse<JobPosition>> {
    return http.delete<ApiResponse<JobPosition>>(
      `/api/v1/admin/positions/${id}`
    );
  },
};

export type { JobStatus };
export default adminService;
