import { Link } from "react-router";
import {
  Briefcase,
  GraduationCap,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  PlusCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";
import { cn } from "cn";

export function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const isStudent = user?.role === "STUDENT";
  const isEmployer = user?.role === "EMPLOYER";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* TRẠNG THÁI 1: NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP */}
      {isAuthenticated && user ? (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
          {/* Banner chào mừng cá nhân hóa */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/40 p-6 sm:p-8 md:p-10 shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {isStudent && <GraduationCap className="size-3.5" />}
                {isEmployer && <Building2 className="size-3.5" />}
                <span>
                  {isStudent
                    ? "Tài khoản Sinh viên"
                    : isEmployer
                    ? "Tài khoản Nhà tuyển dụng"
                    : user.role}
                </span>
                {user.status === "ACTIVE" && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    • <ShieldCheck className="size-3" /> Đã xác thực
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Xin chào,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  {user.fullName}
                </span>
                ! 👋
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {isStudent
                  ? "Bạn đã đăng nhập thành công. Hãy bắt đầu tìm kiếm việc làm part-time, ca làm linh hoạt hoặc quản lý hồ sơ của mình."
                  : "Bạn đã đăng nhập thành công. Bắt đầu đăng tin tuyển dụng và tìm kiếm những ứng viên sinh viên năng động nhất."}
              </p>

              {/* Nút hành động nhanh theo vai trò */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {isStudent ? (
                  <Link
                    to={PATHS.JOBS.ROOT}
                    className={cn(
                      buttonVariants(),
                      "rounded-2xl h-10 px-5 shadow-xs"
                    )}
                  >
                    <Search className="size-4 mr-2" />
                    Khám phá việc làm ngay
                  </Link>
                ) : (
                  <Link
                    to="/employer/jobs/create"
                    className={cn(
                      buttonVariants(),
                      "rounded-2xl h-10 px-5 shadow-xs"
                    )}
                  >
                    <PlusCircle className="size-4 mr-2" />
                    Đăng tin tuyển dụng mới
                  </Link>
                )}

                <Link
                  to="/profile"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-2xl h-10 px-4"
                  )}
                >
                  Xem hồ sơ cá nhân
                </Link>
              </div>
            </div>

            {/* Icon mờ trang trí phía sau */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 text-primary/5 hidden sm:block">
              <Briefcase className="size-64" />
            </div>
          </div>

          {/* Vùng placeholder nội dung trang chủ */}
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <div className="flex size-12 mx-auto items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Sparkles className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Nội dung trang chủ đang được cập nhật
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Trạng thái đăng nhập của bạn đã được xác nhận. Nhấp vào{" "}
              <strong>Avatar người dùng</strong> ở góc trên bên phải thanh
              Header để kiểm tra thông tin hoặc Đăng xuất.
            </p>
          </div>
        </div>
      ) : (
        /* TRẠNG THÁI 2: KHÁCH VÃNG LAI (CHƯA ĐĂNG NHẬP) */
        <div className="flex flex-col items-center justify-center text-center py-12 md:py-20 space-y-8 animate-in fade-in-50 duration-300">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Sparkles className="size-3.5" />
            UniWork — Nền tảng việc làm sinh viên thế hệ mới
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Tìm việc làm part-time{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
                linh hoạt theo lịch học
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Cầu nối tin cậy giữa sinh viên tìm việc làm thêm và nhà tuyển dụng
              cần nhân sự trẻ, linh hoạt và nhiệt huyết.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={PATHS.AUTH.REGISTER}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-2xl h-11 px-6 shadow-sm"
              )}
            >
              Đăng ký tài khoản ngay
              <ArrowRight className="size-4 ml-2" />
            </Link>
            <Link
              to={PATHS.AUTH.LOGIN}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-2xl h-11 px-6"
              )}
            >
              Đăng nhập
            </Link>
          </div>

          {/* Vùng placeholder trống */}
          <div className="w-full max-w-4xl pt-8">
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
              💡 Bạn hiện đang ở chế độ <strong>Chưa đăng nhập</strong>. Hãy
              nhấn <strong>Đăng nhập</strong> hoặc <strong>Đăng ký</strong> trên
              Header để trải nghiệm đầy đủ các tính năng.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
