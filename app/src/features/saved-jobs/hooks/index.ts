import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedJobService } from "../services/saved-jobs.service";

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
  });

/** Danh sách id tin đã lưu (dùng để đánh dấu bookmark) */
export const useSavedJobIds = () =>
  useQuery({
    queryKey: SAVED_JOB_KEYS.ids(),
    queryFn: async () => {
      const response = await savedJobService.list();
      return response.data.map((saved) => saved.jobId);
    },
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
