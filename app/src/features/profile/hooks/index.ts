import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EmployerProfile,
  StudentProfile,
} from "@/features/shared/types";
import { profileService } from "../services/profile.service";

export const PROFILE_KEYS = {
  all: ["profile"] as const,
  student: () => [...PROFILE_KEYS.all, "student"] as const,
  employer: () => [...PROFILE_KEYS.all, "employer"] as const,
};

/** Hồ sơ sinh viên */
export const useStudentProfile = () =>
  useQuery({
    queryKey: PROFILE_KEYS.student(),
    queryFn: async () => {
      const response = await profileService.getStudent();
      return response.data;
    },
  });

/** Cập nhật hồ sơ sinh viên */
export const useUpdateStudentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<StudentProfile>) => {
      const response = await profileService.updateStudent(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_KEYS.student(), data);
    },
  });
};

/** Hồ sơ nhà tuyển dụng */
export const useEmployerProfile = () =>
  useQuery({
    queryKey: PROFILE_KEYS.employer(),
    queryFn: async () => {
      const response = await profileService.getEmployer();
      return response.data;
    },
  });

/** Cập nhật hồ sơ nhà tuyển dụng */
export const useUpdateEmployerProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<EmployerProfile>) => {
      const response = await profileService.updateEmployer(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_KEYS.employer(), data);
    },
  });
};
