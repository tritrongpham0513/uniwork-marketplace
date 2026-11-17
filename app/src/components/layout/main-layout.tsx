import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "./header";
import { Footer } from "./footer";
import { NotificationSocket } from "./notification-socket";

/**
 * Khôi phục vị trí cuộn + đưa focus về đầu trang khi điều hướng.
 * - Điều hướng mới: cuộn lên đầu và focus vào `<main>` (giúp screen reader đọc nội dung mới).
 * - Quay lại trang trước (POP): giữ vị trí cuộn đã lưu của lịch sử trình duyệt.
 */
function ScrollRestoration() {
  const { pathname, search } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Điều hướng có thay đổi query string (đổi bộ lọc) -> cũng cuộn lên đầu
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    // Focus management: chuyển focus sang vùng nội dung chính
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, search]);

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      className="flex-1 outline-none"
      id="main-content"
    >
      <Outlet />
    </main>
  );
}

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header điều hướng chung với User Dropdown */}
      <Header />

      {/* Kết nối WebSocket thông báo realtime (chỉ sống khi đã đăng nhập) */}
      <NotificationSocket />

      {/* Nội dung trang + khôi phục cuộn */}
      <ScrollRestoration />

      {/* Footer đầy đủ uy tín */}
      <Footer />
    </div>
  );
}

export default MainLayout;
