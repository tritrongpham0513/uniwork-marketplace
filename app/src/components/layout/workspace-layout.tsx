import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Bell } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { NotificationSocket } from "./notification-socket";
import { PATHS } from "@/config/paths";
import { WORKSPACE_NAV } from "@/config/workspace-nav";
import { useAuth } from "@/features/auth/hooks";
import { useNotificationCount } from "@/features/notifications/hooks";

/** Cookie lưu trạng thái sidebar (dùng chung với component `ui/sidebar`) */
const SIDEBAR_COOKIE_NAME = "sidebar_state";

/** Đọc trạng thái sidebar đã lưu để giữ nguyên khi tải lại trang */
const readSidebarCookie = (): boolean => {
  if (typeof document === "undefined") return true;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  return match ? match.split("=")[1] !== "false" : true;
};

/**
 * Khôi phục vị trí cuộn + đưa focus về đầu trang khi điều hướng.
 */
function ScrollRestoration() {
  const { pathname, search } = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, search]);

  return (
    <div ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
      <Outlet />
    </div>
  );
}

/**
 * Thanh trên cùng của không gian làm việc — gọn, nằm trong vùng nội dung.
 *
 * Chỉ giữ những thứ thật sự cần ở mọi trang: nút mở/thu sidebar, tên khu
 * vực, chuông thông báo và nút đổi giao diện. Logo nằm ở đầu sidebar.
 */
function WorkspaceTopbar() {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useNotificationCount();

  const areaLabel = user
    ? (WORKSPACE_NAV[user.role]?.areaLabel ?? "Không gian làm việc")
    : "Không gian làm việc";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="text-muted-foreground" />

      <span className="truncate text-sm font-semibold text-foreground">
        {areaLabel}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Link
          to={PATHS.NOTIFICATIONS}
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-destructive-foreground tabular-nums ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * App shell của các khu vực sau đăng nhập (`/student`, `/employer`, `/admin`).
 *
 * - Sidebar cố định bên trái (16rem, thu gọn còn 4rem dải icon).
 * - Vùng nội dung chiếm phần còn lại, **không canh giữa**: nội dung bám
 *   sát sidebar và tự giới hạn ở `max-w-[1600px]` để tránh trôi giữa
 *   màn trên màn hình rộng.
 */
export function WorkspaceLayout() {
  // Đọc cookie ở state khởi tạo -> sidebar giữ đúng trạng thái sau F5.
  const [defaultOpen] = useState(readSidebarCookie);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <WorkspaceSidebar />

      <SidebarInset className="min-w-0 bg-background">
        <WorkspaceTopbar />
        <NotificationSocket />
        <ScrollRestoration />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default WorkspaceLayout;
