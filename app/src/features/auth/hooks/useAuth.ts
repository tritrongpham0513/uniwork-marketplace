import { useCallback, useSyncExternalStore } from "react";
import { useCurrentUser } from "./useCurrentUser";
import {
  clearAuthSession,
  getLocalAccessToken,
  getLocalUserRaw,
  subscribeAuth,
} from "@/utils/authStorage";
import { useQueryClient } from "@tanstack/react-query";
import type { UserSummaryResponse } from "@/features/auth/types";

/**
 * Đọc user từ localStorage (cache offline) — parse an toàn.
 */
const parseLocalUser = (raw: string | null): UserSummaryResponse | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSummaryResponse;
  } catch {
    return null;
  }
};

/**
 * Hook quản lý trạng thái đăng nhập.
 *
 * Vì sao dùng `useSyncExternalStore` thay vì đọc thẳng `localStorage`
 * trong lúc render: `localStorage` không reactive. Nếu đăng xuất chỉ xoá
 * token mà không thông báo, React không biết phải render lại -> header vẫn
 * hiện tài khoản cho tới khi F5. `subscribeAuth` giải quyết đúng chỗ này.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  // Reactive snapshot của phiên đăng nhập trong localStorage.
  // `token` cũng phải reactive: sau khi đăng xuất, token bị xoá -> `token`
  // phải là `null` ngay lập tức, nếu không `user` vẫn lấy từ query cache.
  const token = useSyncExternalStore(
    subscribeAuth,
    getLocalAccessToken,
    getLocalAccessToken
  );

  const userRaw = useSyncExternalStore(
    subscribeAuth,
    getLocalUserRaw,
    getLocalUserRaw
  );

  const { data: userResponse, isLoading } = useCurrentUser();
  const localUser = parseLocalUser(userRaw);

  // Chỉ coi là đã đăng nhập khi còn token. Sau khi logout, token bị xoá ->
  // `userResponse` có thể còn dữ liệu cache cũ trong query cache.
  const user = token ? (userResponse?.data || localUser) : null;
  const isAuth = Boolean(token && user);

  const logout = useCallback(() => {
    clearAuthSession();
    // Xoá cache của toàn bộ dữ liệu thuộc phiên đăng nhập: không được để
    // lại dữ liệu của người dùng vừa đăng xuất (thông báo, hồ sơ, đơn ứng
    // tuyển, việc đã lưu...) trong bộ nhớ đệm của TanStack Query.
    queryClient.clear();
    // Không chuyển hướng sang trang đăng nhập — chỉ cập nhật lại UI
    // (header hiện nút "Đăng nhập"). Các route được bảo vệ vẫn tự điều
    // hướng về /login qua guard `RequireAuth` nếu người dùng đang ở khu
    // vực cần đăng nhập.
  }, [queryClient]);

  return {
    user,
    token,
    isAuthenticated: isAuth,
    isLoading: Boolean(token && isLoading && !localUser),
    logout,
  };
};

export default useAuth;
