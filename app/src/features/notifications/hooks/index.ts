import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { notificationService } from "../services/notifications.service";
import { jobNotifyService } from "../services/job-notify.service";
import { getLocalAccessToken } from "@/utils/authStorage";
import { NOTIFICATION_KEYS } from "./keys";
import { invalidateByNotificationType } from "./invalidate";

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

/**
 * Đánh dấu 1 thông báo đã đọc.
 *
 * `type` là loại thông báo (`REVIEW`, `APPLICATION`, ...) để invalidate đúng
 * nhóm dữ liệu liên quan. Ví dụ bấm thông báo "Bạn nhận được đánh giá mới"
 * -> phải refetch danh sách đánh giá, nếu không trang đích vẫn hiện cache cũ.
 */
export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; type?: string | null }) => {
      await notificationService.markRead(id);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      invalidateByNotificationType(queryClient, variables.type);
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

/**
 * Danh sách tuỳ chọn "Bật thông báo" tin tuyển dụng đang bật.
 */
export const useJobNotifyPreferences = () =>
  useQuery({
    queryKey: NOTIFICATION_KEYS.jobNotify,
    queryFn: async () => {
      const response = await jobNotifyService.list();
      return response.data;
    },
    enabled: !!getLocalAccessToken(),
    staleTime: 60_000,
  });

/**
 * Bật/tắt thông báo tin tuyển dụng.
 *
 * `onError` rollback — cache được cập nhật lại về trạng thái trước đó để
 * nút không hiển thị sai.
 */
export const useToggleJobNotify = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryCode,
      provinceCode,
      enabled,
    }: {
      categoryCode: string;
      provinceCode?: string | null;
      enabled: boolean;
    }) => {
      if (enabled) {
        const response = await jobNotifyService.subscribe({
          categoryCode,
          provinceCode: provinceCode ?? null,
        });
        return response.data;
      }
      await jobNotifyService.unsubscribe(categoryCode, provinceCode);
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_KEYS.jobNotify,
      });
    },
  });
};
