import type { Review } from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export interface CreateReviewPayload {
  applicationId: string;
  rating: number;
  comment: string;
}

export const reviewService = {
  /**
   * POST /api/v1/reviews — tạo đánh giá 2 chiều.
   */
  create(payload: CreateReviewPayload): Promise<ApiResponse<Review>> {
    return http.post<ApiResponse<Review>, CreateReviewPayload>(
      "/api/v1/reviews",
      payload
    );
  },

  /**
   * GET /api/v1/reviews?targetType=&targetUserId=
   */
  list(params?: {
    targetType?: string;
    targetUserId?: string | number;
    hideHidden?: boolean;
  }): Promise<ApiResponse<Review[]>> {
    return http.get<ApiResponse<Review[]>>("/api/v1/reviews", { params });
  },

  /**
   * POST /api/v1/employer/reviews/{id}/reply — trả lời đánh giá.
   */
  reply(id: string, reply: string): Promise<ApiResponse<Review>> {
    return http.post<ApiResponse<Review>, { reply: string }>(
      `/api/v1/employer/reviews/${id}/reply`,
      { reply }
    );
  },

  /**
   * PATCH /api/v1/admin/reviews/{id} — ẩn/hiện đánh giá.
   */
  setHidden(id: string, isHidden: boolean): Promise<ApiResponse<Review>> {
    return http.patch<ApiResponse<Review>, { isHidden: boolean }>(
      `/api/v1/admin/reviews/${id}`,
      { isHidden }
    );
  },
};

export default reviewService;
