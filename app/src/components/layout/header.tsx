import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  Building2,
  ShieldCheck,
  BookmarkCheck,
  FileText,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";
import { cn } from "cn";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Lấy 2 chữ cái đầu của tên để làm Avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isStudent = user?.role === "STUDENT";
  const isEmployer = user?.role === "EMPLOYER";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO BRAND */}
        <div className="flex items-center gap-8">
          <Link to={PATHS.HOME} className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs transition-transform group-hover:scale-105">
              <Briefcase className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Uni<span className="text-amber-500">Work</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground -mt-1 hidden sm:block">
                Việc làm sinh viên
              </span>
            </div>
          </Link>

          {/* MENU ĐIỀU HƯỚNG CHÍNH */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              to={PATHS.HOME}
              className="text-foreground transition-colors hover:text-primary font-semibold"
            >
              Trang chủ
            </Link>
            <Link
              to={PATHS.JOBS.ROOT}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Tìm việc làm
            </Link>
            <Link
              to={PATHS.ABOUT}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Về chúng tôi
            </Link>
          </nav>
        </div>

        {/* KHU VỰC TÀI KHOẢN (BÊN PHẢI) */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            /* TRẠNG THÁI: ĐÃ ĐĂNG NHẬP -> USER DROPDOWN */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 p-1.5 pr-3 text-left transition-all hover:border-border hover:bg-muted/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-expanded={isDropdownOpen}
              >
                {/* Avatar */}
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 font-bold text-xs text-white shadow-xs">
                  {getInitials(user.fullName)}
                </div>

                {/* Tên & Role */}
                <div className="hidden sm:flex flex-col text-xs leading-tight">
                  <span className="font-semibold text-foreground max-w-[120px] truncate">
                    {user.fullName || user.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {isStudent && <GraduationCap className="size-2.5 text-primary" />}
                    {isEmployer && <Building2 className="size-2.5 text-amber-500" />}
                    {isStudent ? "Sinh viên" : isEmployer ? "Nhà tuyển dụng" : user.role}
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-200",
                    isDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {/* DROPDOWN MENU */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border/80 bg-card p-1.5 text-card-foreground shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                  {/* Header Thông tin User trong Dropdown */}
                  <div className="border-b border-border/60 px-3 py-2.5 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {isStudent && <GraduationCap className="size-3" />}
                        {isEmployer && <Building2 className="size-3" />}
                        {isStudent ? "Sinh viên" : isEmployer ? "Nhà tuyển dụng" : user.role}
                      </span>
                      {user.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="size-2.5" />
                          Đã xác minh
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Các Action Items */}
                  <div className="space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="size-4 text-muted-foreground" />
                      Hồ sơ cá nhân
                    </Link>

                    {isStudent && (
                      <Link
                        to="/applications"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <BookmarkCheck className="size-4 text-muted-foreground" />
                        Việc làm đã ứng tuyển
                      </Link>
                    )}

                    {isEmployer && (
                      <Link
                        to="/employer/jobs"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <FileText className="size-4 text-muted-foreground" />
                        Quản lý tin đăng
                      </Link>
                    )}
                  </div>

                  {/* Phân cách & Đăng xuất */}
                  <div className="border-t border-border/60 my-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      Đăng xuất tài khoản
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TRẠNG THÁI: CHƯA ĐĂNG NHẬP -> NÚT ĐĂNG NHẬP / ĐĂNG KÝ */
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
        </div>
      </div>
    </header>
  );
}

export default Header;
