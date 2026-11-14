import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/features/auth/hooks";
import type { RoleType } from "@/features/shared/types";
import { PATHS } from "@/config/paths";

/**
 * Chặn truy cập khi chưa đăng nhập.
 * Chuyển hướng về trang đăng nhập & lưu lại đường dẫn đã truy cập.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={PATHS.AUTH.LOGIN}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <>{children}</>;
}

/**
 * Chặn truy cập nếu vai trò không khớp.
 * Ví dụ: `/admin/*` chỉ dành cho ADMIN.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: RoleType[];
  children: ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={PATHS.AUTH.LOGIN}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={PATHS.FORBIDDEN} replace />;
  }

  return <>{children}</>;
}

/** Full-page spinner dùng chung cho các trạng thái chờ */
export function FullPageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}

export default RequireAuth;
