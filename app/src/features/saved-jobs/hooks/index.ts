import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedJobService } from "../services/saved-jobs.service";
import { getLocalAccessToken } from "@/utils/authStorage";

export const SAVED_JOB_KEYS = {
  all: ["saved-jobs"] as const,
  list: () => [...SAVED_JOB_KEYS.all, "list"] as const,
  ids: () => [...SAVED_JOB_KEYS.all, "ids"] as const,
};

/** Danh sách tin đã lưu */
export const useSavedJobs = () =>
  useQuery({
    queryKey: SAVED_JOB_KEYS.list(),
    queryFn: async () => {
      const response = await savedJobService.list();
      return response.data;
    },
    enabled: !!getLocalAccessToken(),
  });

/** Danh sách id tin đã lưu (dùng để đánh dấu bookmark) */
export const useSavedJobIds = () =>
  useQuery({
    queryKey: SAVED_JOB_KEYS.ids(),
    queryFn: async () => {
      // Endpoint `ids` trả về danh sách id — nhẹ hơn nhiều so với tải
      // toàn bộ object SavedJob rồi map.
      const response = await savedJobService.ids();
      return response.data;
    },
    // Chỉ sinh viên đã đăng nhập mới lưu/đánh dấu tin được
    enabled: !!getLocalAccessToken(),
    staleTime: 60_000,
  });

/** Lưu / bỏ lưu tin */
export const useToggleSavedJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      saved,
    }: {
      jobId: string;
      saved: boolean;
    }) => {
      if (saved) {
        await savedJobService.remove(jobId);
      } else {
        await savedJobService.save(jobId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_JOB_KEYS.all });
    },
  });
};
