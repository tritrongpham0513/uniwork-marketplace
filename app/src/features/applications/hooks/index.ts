import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Application,
  ApplicationStatus,
} from "@/features/shared/types";
import { applicationService, type CreateApplicationPayload } from "../services/applications.service";

export const APPLICATION_KEYS = {
  all: ["applications"] as const,
  student: (status?: string) =>
    [...APPLICATION_KEYS.all, "student", status ?? "ALL"] as const,
  studentDetail: (id: string) =>
    [...APPLICATION_KEYS.all, "student", "detail", id] as const,
  employer: (params?: { jobId?: string; status?: string }) =>
    [...APPLICATION_KEYS.all, "employer", params ?? {}] as const,
  employerDetail: (id: string) =>
    [...APPLICATION_KEYS.all, "employer", "detail", id] as const,
};

/** Đơn ứng tuyển của sinh viên */
export const useStudentApplications = (status?: string) =>
  useQuery({
    queryKey: APPLICATION_KEYS.student(status),
    queryFn: async () => {
      const response = await applicationService.listByStudent(status);
      return response.data;
    },
  });

/** Chi tiết đơn ứng tuyển (phía sinh viên) */
export const useStudentApplication = (id: string) =>
  useQuery({
    queryKey: APPLICATION_KEYS.studentDetail(id),
    queryFn: async () => {
      const response = await applicationService.detailForStudent(id);
      return response.data;
    },
    enabled: !!id,
  });

/** Ứng viên (phía nhà tuyển dụng) */
export const useEmployerApplications = (params?: {
  jobId?: string;
  status?: string;
}) =>
  useQuery({
    queryKey: APPLICATION_KEYS.employer(params),
    queryFn: async () => {
      const response = await applicationService.listByEmployer(params);
      return response.data;
    },
  });

/** Chi tiết ứng viên (phía nhà tuyển dụng) */
export const useEmployerApplication = (id: string) =>
  useQuery({
    queryKey: APPLICATION_KEYS.employerDetail(id),
    queryFn: async () => {
      const response = await applicationService.detailForEmployer(id);
      return response.data;
    },
    enabled: !!id,
  });

/** Nộp đơn ứng tuyển */
export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateApplicationPayload) => {
      const response = await applicationService.create(payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
};

/** Rút đơn ứng tuyển */
export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await applicationService.withdraw(id);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
};

/** Cập nhật trạng thái đơn (phía nhà tuyển dụng) */
export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ApplicationStatus;
      note?: string;
    }) => {
      const response = await applicationService.updateStatus(id, {
        status,
        note,
      });
      return response.data;
    },
    onSuccess: (data: Application) => {
      queryClient.setQueryData(
        APPLICATION_KEYS.employerDetail(data.id),
        data
      );
      void queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
};
