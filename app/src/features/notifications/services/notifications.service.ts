import type {
  ApiResponse,
  Notification,
  NotificationType,
} from "@/features/shared/types";
import http from "@/lib/axios";

export const notificationService = {
  /**
   * GET /api/v1/notifications
   */
  list(unreadOnly = false): Promise<ApiResponse<Notification[]>> {
    return http.get<ApiResponse<Notification[]>>("/api/v1/notifications", {
      params: unreadOnly ? { unreadOnly: "true" } : undefined,
    });
  },

  /**
   * GET /api/v1/notifications/unread-count
   */
  unreadCount(): Promise<ApiResponse<{ count: number }>> {
    return http.get<ApiResponse<{ count: number }>>(
      "/api/v1/notifications/unread-count"
    );
  },

  /**
   * PATCH /api/v1/notifications/{id}/read
   */
  markRead(id: string): Promise<ApiResponse<Notification>> {
    return http.patch<ApiResponse<Notification>>(
      `/api/v1/notifications/${id}/read`
    );
  },

  /**
   * POST /api/v1/notifications/read-all
   */
  markAllRead(): Promise<ApiResponse<{ count: number }>> {
    return http.post<ApiResponse<{ count: number }>>(
      "/api/v1/notifications/read-all"
    );
  },

  /**
   * POST /api/v1/ws/ticket
   *
   * Xin vé dùng một lần để mở kết nối WebSocket. Vé hạn 60 giây — nhờ đó JWT
   * không bao giờ phải đi trong query string của WebSocket.
   */
  requestSocketTicket(): Promise<
    ApiResponse<{ ticket: string; expiresIn: number }>
  > {
    return http.post<ApiResponse<{ ticket: string; expiresIn: number }>>(
      "/api/v1/ws/ticket"
    );
  },
};

export type { Notification, NotificationType };
export default notificationService;
