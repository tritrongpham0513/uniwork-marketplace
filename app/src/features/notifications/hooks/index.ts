import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { notificationService } from "../services/notifications.service";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (unreadOnly?: boolean) => ["notifications", "list", unreadOnly] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

/** Danh sách thông báo của người đang đăng nhập */
export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: NOTIFICATION_KEYS.list(unreadOnly),
    queryFn: async () => {
      const response = await notificationService.list(unreadOnly);
      return response.data;
    },
  });

/** Số thông báo chưa đọc (dùng cho badge trên header) */
export const useNotificationCount = () =>
  useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: async () => {
      const response = await notificationService.unreadCount();
      return response.data.count;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

/** Đánh dấu 1 thông báo đã đọc */
export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await notificationService.markRead(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
};

/** Đánh dấu toàn bộ thông báo đã đọc */
export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await notificationService.markAllRead();
      return response.data.count;
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      toast.success(
        count > 0
          ? `Đã đánh dấu ${count} thông báo là đã đọc.`
          : "Không có thông báo chưa đọc."
      );
    },
  });
};
