import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import {
  Bell,
  BookmarkCheck,
  Briefcase,
  Building2,
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ThemeToggle,
  ThemeModeToggleGroup,
} from "@/components/shared/theme-toggle";
import { PATHS, ROLE_HOME } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";
import { useNotificationCount } from "@/features/notifications/hooks";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "cn";

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Sinh viên",
  EMPLOYER: "Nhà tuyển dụng",
  ADMIN: "Quản trị viên",
};

interface HeaderNavItem {
  label: string;
  to: string;
  /** Chỉ active khi khớp đúng path (dùng cho mục gốc) */
  end?: boolean;
}

/**
 * Điều hướng cấp site — chỉ chứa các khu vực dùng chung.
 *
 * Danh sách này **không đổi** theo trạng thái đăng nhập: sau khi đăng nhập,
 * các mục riêng của vai trò (bảng điều khiển, hồ sơ, đơn ứng tuyển…) đã
 * nằm trong menu tài khoản và trong sidebar của không gian làm việc, nên
 * lặp lại ở header chỉ gây rối.
 */
const SITE_NAV: HeaderNavItem[] = [
  { label: "Trang chủ", to: PATHS.HOME, end: true },
  { label: "Tìm việc làm", to: PATHS.JOBS.ROOT },
  { label: "Về chúng tôi", to: PATHS.ABOUT },
];

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useNotificationCount();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const role = user?.role ?? "";
  const isStudent = role === "STUDENT";
  const isEmployer = role === "EMPLOYER";
  const isAdmin = role === "ADMIN";

  /** Đường dẫn hồ sơ theo vai trò */
  const profilePath = isEmployer
    ? PATHS.EMPLOYER.ORGANIZATION
    : isAdmin
      ? PATHS.ADMIN.USERS
      : PATHS.STUDENT.PROFILE;

  const handleLogout = () => {
    // Chỉ đăng xuất tại chỗ, không chuyển hướng.
    logout();
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      {/* Skip link — hỗ trợ bàn phím & screen reader */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO BRAND */}
        <div className="flex items-center gap-8">
          <Link to={PATHS.HOME} className="group flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
              <Briefcase className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Vie<span className="text-primary">Job</span>
              </span>
              <span className="-mt-1 hidden text-[10px] font-medium text-muted-foreground sm:block">
                Việc làm sinh viên
              </span>
            </div>
          </Link>

          {/* MENU ĐIỀU HƯỚNG CHÍNH */}
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {SITE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "transition-colors",
                    isActive
                      ? "font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* KHU VỰC TÀI KHOẢN (BÊN PHẢI) */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {isAuthenticated && user ? (
            <>
              {/* Chuông thông báo */}
              <Link
                to={PATHS.NOTIFICATIONS}
                className="relative hidden size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
                aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ""}`}
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-destructive-foreground tabular-nums ring-2 ring-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* USER DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border border-border/80 bg-background/80 p-1.5 pr-3 text-left transition-all hover:border-border hover:bg-muted/60 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  aria-expanded={isDropdownOpen}
                >
                  <UserAvatar
                    name={user.fullName || user.email}
                    imageUrl={user.avatarUrl}
                    size="sm"
                    className="shadow-xs"
                  />

                  <div className="hidden flex-col text-xs leading-tight sm:flex">
                    <span className="max-w-[120px] truncate font-semibold text-foreground">
                      {user.fullName || user.email}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {isStudent && (
                        <GraduationCap className="size-2.5 text-primary" />
                      )}
                      {isEmployer && (
                        <Building2 className="size-2.5 text-primary" />
                      )}
                      {isAdmin && (
                        <ShieldCheck className="size-2.5 text-primary" />
                      )}
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  </div>

                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200",
                      isDropdownOpen && "rotate-180"
                    )}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-in rounded-2xl border border-border/80 bg-card p-1.5 text-card-foreground shadow-xl duration-150 fade-in-0 zoom-in-95">
                    {/* Header thông tin user */}
                    <div className="mb-1 border-b border-border/60 px-3 py-2.5">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {user.fullName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px]"
                        >
                          {isStudent && <GraduationCap className="size-3" />}
                          {isEmployer && <Building2 className="size-3" />}
                          {isAdmin && <ShieldCheck className="size-3" />}
                          {ROLE_LABELS[role] ?? role}
                        </Badge>
                        {user.status === "ACTIVE" && (
                          <Badge
                            variant="outline"
                            className="gap-0.5 border-border text-[10px] text-muted-foreground"
                          >
                            <ShieldCheck className="size-2.5" />
                            Đã xác minh
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action items */}
                    <div className="space-y-0.5">
                      <Link
                        to={profilePath}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <User className="size-4 text-muted-foreground" />
                        {isEmployer ? "Thông tin tổ chức" : "Hồ sơ cá nhân"}
                      </Link>

                      <Link
                        to={ROLE_HOME[role] ?? PATHS.HOME}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <LayoutDashboard className="size-4 text-muted-foreground" />
                        Bảng điều khiển
                      </Link>

                      {isStudent && (
                        <>
                          <Link
                            to={PATHS.STUDENT.APPLICATIONS}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <BookmarkCheck className="size-4 text-muted-foreground" />
                            Việc làm đã ứng tuyển
                          </Link>
                          <Link
                            to={PATHS.SAVED}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Briefcase className="size-4 text-muted-foreground" />
                            Việc làm đã lưu
                          </Link>
                        </>
                      )}

                      {isEmployer && (
                        <>
                          <Link
                            to={PATHS.EMPLOYER.JOBS}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <FileText className="size-4 text-muted-foreground" />
                            Quản lý tin đăng
                          </Link>
                          <Link
                            to={PATHS.EMPLOYER.APPLICATIONS}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <BookmarkCheck className="size-4 text-muted-foreground" />
                            Ứng viên
                          </Link>
                        </>
                      )}

                      <Link
                        to={PATHS.NOTIFICATIONS}
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Bell className="size-4 text-muted-foreground" />
                        Thông báo
                        {unreadCount > 0 && (
                          <span className="ml-auto rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    {/* Đăng xuất */}
                    <div className="my-1 border-t border-border/60 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" />
                        Đăng xuất tài khoản
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* CHƯA ĐĂNG NHẬP */
            <div className="flex items-center gap-2">
              <Link
                to={PATHS.AUTH.LOGIN}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-xl text-xs font-medium"
                )}
              >
                Đăng nhập
              </Link>

              <Link
                to={PATHS.AUTH.REGISTER}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-xl text-xs font-medium shadow-xs"
                )}
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Nút menu mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Mở menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMobileOpen && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {SITE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAuthenticated && (
              <NavLink
                to={PATHS.NOTIFICATIONS}
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Bell className="size-4" />
                Thông báo
                {unreadCount > 0 && (
                  <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            )}

            <div className="mt-1 border-t border-border/60 pt-3">
              <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                Giao diện
              </p>
              <div className="px-1 pb-1">
                <ThemeModeToggleGroup />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
