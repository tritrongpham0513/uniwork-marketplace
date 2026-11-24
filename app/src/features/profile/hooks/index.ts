import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmployerProfile, StudentProfile } from "@/features/shared/types";
import { AUTH_KEYS, PROFILE_KEYS } from "@/features/shared/query-keys";
import { profileService } from "../services/profile.service";

export { PROFILE_KEYS };

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
      // Avatar ở header/sidebar lấy từ endpoint /auth/me → làm mới để
      // ảnh mới hiện ngay mà không cần F5.
      if (data.avatarUrl !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: AUTH_KEYS.currentUser(),
        });
      }
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

/** Hồ sơ NTD công khai (xem từ trang chi tiết việc làm) */
export const usePublicEmployerProfile = (id: string) =>
  useQuery({
    queryKey: PROFILE_KEYS.publicEmployer(id),
    queryFn: async () => {
      const response = await profileService.getPublicEmployer(id);
      return response.data;
    },
    enabled: Boolean(id),
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
      // Logo ở header/sidebar lấy từ endpoint /auth/me → làm mới để
      // logo mới hiện ngay mà không cần F5.
      if (data.logoUrl !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: AUTH_KEYS.currentUser(),
        });
      }
    },
  });
};
