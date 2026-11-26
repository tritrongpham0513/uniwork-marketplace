import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminJob,
  AdminUser,
  AiFeatureStatus,
  AiReview,
  EmployerProfile,
  JobCategory,
  SalaryBenchmark,
} from "@/features/shared/types";
import { ADMIN_KEYS } from "@/features/shared/query-keys";
import {
  adminService,
  type AdminCategoryPayload,
  type AdminDashboardStats,
} from "../services/admin.service";

export { ADMIN_KEYS };

/** Số liệu tổng quan hệ thống */
export const useAdminDashboard = () =>
  useQuery({
    queryKey: ADMIN_KEYS.dashboard(),
    queryFn: async () => {
      const response = await adminService.dashboard();
      return response.data;
    },
  });

/** Danh sách người dùng */
export const useAdminUsers = (role?: string, keyword?: string) =>
  useQuery({
    queryKey: ADMIN_KEYS.users(role, keyword),
    queryFn: async () => {
      const response = await adminService.listUsers({ role, keyword });
      return response.data;
    },
  });

/** Khoá / mở khoá / đổi role */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { isLocked?: boolean; role?: AdminUser["role"] };
    }) => {
      const response = await adminService.updateUser(id, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

/**
 * Danh sách tin tuyển dụng theo trạng thái.
 *
 * <p>Kiểu {@link AdminJob} — có kèm kết quả kiểm duyệt AI (chỉ endpoint
 * dành riêng cho quản trị viên mới có).
 */
export const useAdminJobs = (status?: string) =>
  useQuery({
    queryKey: ADMIN_KEYS.jobs(status),
    queryFn: async () => {
      const response = await adminService.listJobs(status);
      return response.data;
    },
  });

/** Duyệt / từ chối tin tuyển dụng */
export const useReviewJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "APPROVE" | "REJECT";
      reason?: string;
    }) => {
      const response = await adminService.reviewJob(id, { action, reason });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

/**
 * Kiểm tra thủ công 1 tin tuyển dụng bằng AI.
 *
 * <p>Mỗi lần mutate là **một lượt AI** — nên gọi có chủ đích.
 * <p>Hook này **không** thay đổi trạng thái tin tuyển dụng; AI chỉ gợi ý.
 */
export const useAiReviewJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AiReview> => {
      const response = await adminService.reviewJobWithAi(id);
      return response.data;
    },
    onSuccess: () => {
      // Kết quả lưu trên bản ghi tin -> danh sách cần được làm mới để
      // badge và thứ tự sắp xếp cập nhật theo.
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

/**
 * Trạng thái tính năng kiểm duyệt AI.
 *
 * <p>Khi `enabled === false` (backend thiếu khoá API) thì nút
 * "Kiểm tra bằng AI" phải **ẩn hoàn toàn** — không phải báo lỗi.
 */
export const useAiFeatureStatus = () =>
  useQuery({
    queryKey: ADMIN_KEYS.aiStatus(),
    queryFn: async (): Promise<AiFeatureStatus> => {
      const response = await adminService.aiStatus();
      return response.data;
    },
    // Trạng thái tính năng hầu như không đổi -> không cần refetch liên tục.
    staleTime: 5 * 60_000,
  });

/**
 * Bảng xếp hạng lương theo ngành × tỉnh.
 *
 * <p>Dữ liệu thay đổi rất chậm -> cache lâu để không gọi lại mỗi lần lọc.
 */
export const useAdminSalaryBenchmarks = () =>
  useQuery({
    queryKey: ADMIN_KEYS.benchmarks(),
    queryFn: async (): Promise<SalaryBenchmark[]> => {
      const response = await adminService.salaryBenchmarks();
      return response.data;
    },
    staleTime: 60 * 60_000,
  });

/**
 * Điểm uy tín + trạng thái xác minh của nhà tuyển dụng.
 *
 * <p>Quản trị viên cần biết nhà tuyển dụng có đáng tin không khi cân nhắc
 * duyệt tin (spec mục 13).
 */
export const useEmployerTrust = (employerId: string | undefined) =>
  useQuery({
    queryKey: ADMIN_KEYS.employerTrust(employerId ?? ""),
    queryFn: async (): Promise<EmployerProfile> => {
      const response = await adminService.publicEmployer(employerId ?? "");
      return response.data.profile;
    },
    enabled: Boolean(employerId),
    staleTime: 10 * 60_000,
  });

/** Danh sách nhóm việc */
export const useAdminCategories = () =>
  useQuery({
    queryKey: ADMIN_KEYS.categories(),
    queryFn: async () => {
      const response = await adminService.listCategories();
      return response.data;
    },
  });

/** Tạo nhóm việc */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminCategoryPayload) => {
      const response = await adminService.createCategory(payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

/** Cập nhật nhóm việc */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<JobCategory>;
    }) => {
      const response = await adminService.updateCategory(id, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

/** Xoá mềm nhóm việc */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.removeCategory(id);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
    },
  });
};

export type {
  AdminDashboardStats,
  AdminJob,
  AdminUser,
  AiFeatureStatus,
  AiReview,
  JobCategory,
};
