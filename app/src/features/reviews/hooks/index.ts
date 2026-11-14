import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Review } from "@/features/shared/types";
import { reviewService, type CreateReviewPayload } from "../services/reviews.service";

export const REVIEW_KEYS = {
  all: ["reviews"] as const,
  list: (params?: Record<string, unknown>) =>
    [...REVIEW_KEYS.all, "list", params ?? {}] as const,
};

/** Danh sách đánh giá */
export const useReviews = (params?: {
  targetType?: string;
  targetUserId?: string | number;
  hideHidden?: boolean;
}) =>
  useQuery({
    queryKey: REVIEW_KEYS.list(params),
    queryFn: async () => {
      const response = await reviewService.list(params);
      return response.data;
    },
  });

/** Tạo đánh giá 2 chiều */
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const response = await reviewService.create(payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
};

/** Trả lời đánh giá (nhà tuyển dụng) */
export const useReplyReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const response = await reviewService.reply(id, reply);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
};

/** Ẩn/hiện đánh giá (admin) */
export const useToggleReviewVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const response = await reviewService.setHidden(id, isHidden);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
};

export type { Review };
