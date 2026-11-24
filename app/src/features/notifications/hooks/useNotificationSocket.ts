import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "@/lib/toast";
import { env } from "@/config/env";
import {
  RealtimeNotificationClient,
  type RealtimeNotification,
  type RealtimeStatus,
} from "@/lib/realtime/notification-socket";
import {
  broadcast,
  shouldShowToast,
  subscribe,
} from "@/lib/realtime/notification-broadcast";
import { notificationService } from "../services/notifications.service";
import { NOTIFICATION_KEYS } from "./keys";
import { invalidateByNotificationType } from "./invalidate";

/**
 * 🔌 Hook kết nối realtime cho thông báo.
 *
 * Trách nhiệm:
 * 1. Mở/đóng kết nối WebSocket theo vòng đời đăng nhập.
 * 2. Khi có thông báo mới -> hiển thị toast (chỉ tab được focus) và cập nhật
 *    badge số chưa đọc.
 * 3. Invalidate các query liên quan để danh sách nguồn sự thật được đồng bộ.
 *
 * Hợp đồng dữ liệu: WebSocket chỉ mang *tín hiệu*. Danh sách thông báo luôn
 * được refetch từ REST (`/api/v1/notifications`) nên không bao giờ lệch.
 */

/**
 * Loại thông báo -> kiểu toast.
 *
 * `REVIEW` là tin tốt nên dùng `success`; còn lại dùng `info` (trung tính).
 */
const TOAST_TYPES: Record<string, "success" | "info"> = {
  REVIEW: "success",
};

/** Thời lượng toast realtime (ms) — lâu hơn toast thông thường một chút. */
const REALTIME_TOAST_DURATION = 7000;

export interface UseNotificationSocketOptions {
  /** Đang đăng nhập hay chưa — quyết định có mở socket hay không. */
  enabled: boolean;
}
export const useNotificationSocket = ({
  enabled,
}: UseNotificationSocketOptions): { status: RealtimeStatus } => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const clientRef = useRef<RealtimeNotificationClient | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");

  /**
   * Đồng bộ các query liên quan sau khi có thông báo mới.
   *
   * Invalidate theo **loại thông báo** để chỉ refetch đúng phần cần thiết.
   * Quan trọng: thông báo `REVIEW` phải invalidate `REVIEW_KEYS` + `PROFILE_KEYS`,
   * nếu không thì trang `/student/reviews` dùng cache cũ và không hiện đánh giá mới.
   */
  const invalidateRelated = useCallback(
    (type?: string | null) => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      invalidateByNotificationType(queryClient, type);
    },
    [queryClient]
  );

  /** Hiển thị toast cho một thông báo. */
  const showToast = useCallback(
    (payload: RealtimeNotification) => {
      const toastType = TOAST_TYPES[payload.type] ?? "info";

      toast[toastType](payload.title, {
        id: `realtime:${payload.id}`,
        description: payload.body ?? undefined,
        duration: REALTIME_TOAST_DURATION,
        priority: "high",
        actionProps: payload.link
          ? {
              children: "Xem",
              onClick: () => {
                // Invalidate TRƯỚC khi điều hướng. Query ở trang đích phải
                // được đánh dấu stale ngay để refetch, nếu không sẽ dùng
                // cache cũ (còn "fresh" trong `staleTime`) và người dùng không
                // thấy dữ liệu mới — đúng lỗi "bấm thông báo đánh giá mới
                // nhưng danh sách review không có".
                invalidateRelated(payload.type);

                // Đánh dấu đã đọc rồi điều hướng — thứ tự này quan trọng để
                // badge không bật lại sau khi người dùng đã xem.
                void notificationService.markRead(payload.id).catch(() => {
                  /* Không chặn điều hướng vì lỗi đánh dấu đã đọc. */
                });

                navigate(payload.link as string);
              },
            }
          : undefined,
      });

      // Tabs khác cũng cần cập nhật badge -> broadcast.
      broadcast({ kind: "notification", payload });
    },
    [invalidateRelated, navigate]
  );

  /** Xử lý một thông báo đến (từ socket hoặc từ tab khác). */
  const handleNotification = useCallback(
    (payload: RealtimeNotification) => {
      invalidateRelated(payload.type);

      // Chỉ tab đang được focus mới hiển thị toast để tránh trùng lặp.
      if (!shouldShowToast()) return;

      showToast(payload);
    },
    [invalidateRelated, showToast]
  );

  useEffect(() => {
    // Chỉ mở socket khi đã đăng nhập.
    if (!enabled) {
      clientRef.current?.close();
      clientRef.current = null;
      return;
    }

    const client = new RealtimeNotificationClient({
      apiBaseUrl: env.API_URL_DEV,
      // Vercel không proxy được WebSocket sang origin ngoài -> socket trỏ
      // thẳng về Render khi `VITE_WS_URL` được đặt.
      wsUrl: env.WS_URL,
      requestTicket: async () => {
        const response = await notificationService.requestSocketTicket();
        return response.data.ticket;
      },
      onNotification: handleNotification,
      onReconnect: () => {
        // Bù cho các thông báo bị lỡ trong lúc mất kết nối.
        invalidateRelated();
      },
      onStatusChange: (nextStatus) => {
        setStatus(nextStatus);
      },
    });

    clientRef.current = client;
    void client.connect();

    // Nhận thông báo từ các tab khác (tab này có thể không được focus).
    const unsubscribe = subscribe((event) => {
      if (event.kind !== "notification") return;
      handleNotification(event.payload as RealtimeNotification);
    });

    return () => {
      unsubscribe();
      client.close();
      clientRef.current = null;
    };
  }, [enabled, handleNotification, invalidateRelated]);

  return { status };
};

export default useNotificationSocket;
