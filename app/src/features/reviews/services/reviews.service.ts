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
   *
   * <p>Backend đã ràng buộc theo vai trò: sinh viên chỉ thấy đánh giá dành
   * cho mình, NTD chỉ thấy đánh giá dành cho mình.
   */
  list(params?: {
    targetType?: string;
    targetUserId?: string | number;
    hideHidden?: boolean;
  }): Promise<ApiResponse<Review[]>> {
    return http.get<ApiResponse<Review[]>>("/api/v1/reviews", { params });
  },

  /**
   * GET /api/v1/student/reviews — đánh giá sinh viên đã nhận từ nhà tuyển dụng.
   */
  listForStudent(): Promise<ApiResponse<Review[]>> {
    return http.get<ApiResponse<Review[]>>("/api/v1/student/reviews");
  },

  /**
   * GET /api/v1/employer/reviews — đánh giá dành cho nhà tuyển dụng đang đăng nhập.
   */
  listForEmployer(): Promise<ApiResponse<Review[]>> {
    return http.get<ApiResponse<Review[]>>("/api/v1/employer/reviews");
  },

  /**
   * GET /api/v1/employer/applications/{applicationId}/reviews
   * — đánh giá mà sinh viên ứng tuyển đó đã nhận từ nhà tuyển dụng khác.
   */
  listForApplication(applicationId: string): Promise<ApiResponse<Review[]>> {
    return http.get<ApiResponse<Review[]>>(
      `/api/v1/employer/applications/${applicationId}/reviews`
    );
  },

  /**
   * POST /api/v1/employer/reviews/{id}/reply — NTD phản hồi đánh giá mà mình
   * đã nhận (tức NTD là reviewee của chiều đánh giá đó).
   */
  reply(id: string, reply: string): Promise<ApiResponse<Review>> {
    return http.post<ApiResponse<Review>, { reply: string }>(
      `/api/v1/employer/reviews/${id}/reply`,
      { reply }
    );
  },

  /**
   * POST /api/v1/employer/reviews/{id}/reviewer-reply — NTD phản hồi lại đánh giá
   * mà chính NTD đã viết (khi NTD đánh giá sinh viên).
   */
  replyAsReviewer(id: string, reply: string): Promise<ApiResponse<Review>> {
    return http.post<ApiResponse<Review>, { reply: string }>(
      `/api/v1/employer/reviews/${id}/reviewer-reply`,
      { reply }
    );
  },

  /**
   * POST /api/v1/student/reviews/{id}/reply — sinh viên phản hồi lại nhà tuyển dụng
   * đã đánh giá mình.
   */
  replyAsStudent(id: string, reply: string): Promise<ApiResponse<Review>> {
    return http.post<ApiResponse<Review>, { reply: string }>(
      `/api/v1/student/reviews/${id}/reply`,
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
