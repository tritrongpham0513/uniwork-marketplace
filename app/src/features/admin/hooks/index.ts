import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminUser,
  Job,
  JobCategory,
} from "@/features/shared/types";
import {
  adminService,
  type AdminCategoryPayload,
  type AdminDashboardStats,
} from "../services/admin.service";

export const ADMIN_KEYS = {
  all: ["admin"] as const,
  dashboard: () => [...ADMIN_KEYS.all, "dashboard"] as const,
  users: (role?: string, keyword?: string) =>
    [...ADMIN_KEYS.all, "users", role ?? "ALL", keyword ?? ""] as const,
  jobs: (status?: string) => [...ADMIN_KEYS.all, "jobs", status ?? "ALL"] as const,
  categories: () => [...ADMIN_KEYS.all, "categories"] as const,
};

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

/** Danh sách tin tuyển dụng theo trạng thái */
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

export type { AdminDashboardStats, AdminUser, Job, JobCategory };
