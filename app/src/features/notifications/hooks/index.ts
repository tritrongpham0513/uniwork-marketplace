import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { notificationService } from "../services/notifications.service";
import { getLocalAccessToken } from "@/utils/authStorage";
import { NOTIFICATION_KEYS } from "./keys";

export { NOTIFICATION_KEYS };
export { useNotificationSocket } from "./useNotificationSocket";

/** Danh sách thông báo của người đang đăng nhập */
export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: NOTIFICATION_KEYS.list(unreadOnly),
    queryFn: async () => {
      const response = await notificationService.list(unreadOnly);
      return response.data;
    },
    enabled: !!getLocalAccessToken(),
  });

/** Số thông báo chưa đọc (dùng cho badge trên header) */
export const useNotificationCount = () =>
  useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: async () => {
      const response = await notificationService.unreadCount();
      return response.data.count;
    },
    // Không gọi API khi chưa đăng nhập -> tránh 401 vô ích trên header
    enabled: !!getLocalAccessToken(),
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
