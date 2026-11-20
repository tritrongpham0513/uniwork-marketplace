import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Review } from "@/features/shared/types";
import { reviewService, type CreateReviewPayload } from "../services/reviews.service";

export const REVIEW_KEYS = {
  all: ["reviews"] as const,
  list: (params?: Record<string, unknown>) =>
    [...REVIEW_KEYS.all, "list", params ?? {}] as const,
  student: () => [...REVIEW_KEYS.all, "student"] as const,
  employer: () => [...REVIEW_KEYS.all, "employer"] as const,
  application: (applicationId: string) =>
    [...REVIEW_KEYS.all, "application", applicationId] as const,
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

/** Đánh giá sinh viên đã nhận từ nhà tuyển dụng */
export const useStudentReviews = () =>
  useQuery({
    queryKey: REVIEW_KEYS.student(),
    queryFn: async () => {
      const response = await reviewService.listForStudent();
      return response.data;
    },
  });

/** Đánh giá dành cho nhà tuyển dụng đang đăng nhập */
export const useEmployerReviews = () =>
  useQuery({
    queryKey: REVIEW_KEYS.employer(),
    queryFn: async () => {
      const response = await reviewService.listForEmployer();
      return response.data;
    },
  });

/** Đánh giá của ứng viên trong một đơn ứng tuyển (phía nhà tuyển dụng) */
export const useApplicationReviews = (applicationId: string) =>
  useQuery({
    queryKey: REVIEW_KEYS.application(applicationId),
    queryFn: async () => {
      const response = await reviewService.listForApplication(applicationId);
      return response.data;
    },
    enabled: Boolean(applicationId),
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

/** Trả lời đánh giá (người bị đánh giá — ví dụ NTD trả lời SV đã đánh giá NTD) */
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

/**
 * Phản hồi lại đánh giá với tư cách người VIẾT đánh giá.
 *
 * <p>NTD dùng khi đã đánh giá sinh viên và muốn phản hồi lại (ô `reviewerReply`).
 */
export const useReplyReviewAsReviewer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const response = await reviewService.replyAsReviewer(id, reply);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
};

/**
 * Sinh viên phản hồi lại đánh giá đã nhận từ nhà tuyển dụng.
 *
 * <p>Ghi vào ô `reply` (phía người bị đánh giá).
 */
export const useReplyReviewAsStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const response = await reviewService.replyAsStudent(id, reply);
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
