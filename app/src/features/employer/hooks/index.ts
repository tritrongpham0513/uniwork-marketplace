import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job } from "@/features/shared/types";
import { EMPLOYER_JOB_KEYS, JOB_KEYS } from "@/features/shared/query-keys";
import {
  employerJobService,
  type CreateJobPayload,
  type EmployerJobStatusAction,
} from "../services/employer-jobs.service";

export { EMPLOYER_JOB_KEYS };

/** Danh sách tin tuyển dụng của nhà tuyển dụng */
export const useEmployerJobs = (status?: string) =>
  useQuery({
    queryKey: EMPLOYER_JOB_KEYS.list(status),
    queryFn: async () => {
      const response = await employerJobService.list(status);
      return response.data;
    },
  });

/** Chi tiết tin tuyển dụng (dùng cho màn hình sửa tin) */
export const useEmployerJob = (id: string) =>
  useQuery({
    queryKey: EMPLOYER_JOB_KEYS.detail(id),
    queryFn: async () => {
      const response = await employerJobService.detail(id);
      return response.data;
    },
    enabled: !!id,
  });

/** Tạo tin tuyển dụng */
export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateJobPayload) => {
      const response = await employerJobService.create(payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMPLOYER_JOB_KEYS.all });
    },
  });
};

/** Cập nhật tin tuyển dụng */
export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreateJobPayload>;
    }) => {
      const response = await employerJobService.update(id, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMPLOYER_JOB_KEYS.all });
    },
  });
};

/** Đóng / mở lại / hoàn thành tin tuyển dụng */
export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: EmployerJobStatusAction;
    }) => {
      const response = await employerJobService.updateStatus(id, status);
      return response.data;
    },
    onSuccess: (updatedJob) => {
      void queryClient.invalidateQueries({ queryKey: EMPLOYER_JOB_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.lists() });
      void queryClient.invalidateQueries({
        queryKey: JOB_KEYS.detail(updatedJob.id),
      });
    },
  });
};

/** Huỷ tin tuyển dụng */
export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await employerJobService.remove(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMPLOYER_JOB_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
    },
  });
};

export type { Job, EmployerJobStatusAction };
