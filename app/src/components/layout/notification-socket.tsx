import { useAuth } from "@/features/auth/hooks";
import { useNotificationSocket } from "@/features/notifications/hooks";

/**
 * 🔌 Mount kết nối WebSocket thông báo.
 *
 * Đặt trong `MainLayout` để có sẵn `useNavigate` (cần cho toast điều hướng)
 * và để kết nối sống theo vòng đời đăng nhập: đăng nhập -> mở socket,
 * đăng xuất -> đóng socket.
 *
 * Component này không render gì — chỉ giữ kết nối sống.
 */
export function NotificationSocket() {
  const { isAuthenticated } = useAuth();

  useNotificationSocket({ enabled: isAuthenticated });

  return null;
}

export default NotificationSocket;
