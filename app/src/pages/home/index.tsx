import { Link } from "react-router";
import {
  Briefcase,
  GraduationCap,
  Building2,
  ShieldCheck,
  Search,
  PlusCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";
import { cn } from "cn";

// Landing Page Components
import { HeroSection } from "./components/HeroSection";
import { JobCategoriesSection } from "./components/JobCategoriesSection";
import { FeaturedJobsSection } from "./components/FeaturedJobsSection";
import { EarningsCalculator } from "./components/EarningsCalculator";
import { SafetyGuaranteeSection } from "./components/SafetyGuaranteeSection";
import { StepByStepSection } from "./components/StepByStepSection";
import { RoleTabsSection } from "./components/RoleTabsSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { FaqSection } from "./components/FaqSection";
import { CtaBanner } from "./components/CtaBanner";

export function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const isStudent = user?.role === "STUDENT";
  const isEmployer = user?.role === "EMPLOYER";

  return (
    <div className="relative min-h-screen">
      {/* ========================================================= */}
      {/* TRẠNG THÁI 1: NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP (AUTHENTICATED)     */}
      {/* ========================================================= */}
      {isAuthenticated && user ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 animate-in fade-in-50 duration-300">
          {/* Banner chào mừng cá nhân hóa */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-8 md:p-10 shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
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
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    • <ShieldCheck className="size-3" /> Đã xác thực hồ sơ
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Xin chào,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  {user.fullName}
                </span>
                ! 👋
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {isStudent
                  ? "Khám phá các ca làm thêm mới nhất hôm nay gần trường học của bạn. Đăng ký ca linh hoạt và bảo đảm nhận lương đúng hạn."
                  : "Quản lý các tin đăng tuyển dụng, theo dõi hồ sơ ứng viên sinh viên và sắp xếp lịch phỏng vấn nhanh chóng."}
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {isStudent ? (
                  <Link
                    to={PATHS.JOBS.ROOT}
                    className={cn(
                      buttonVariants(),
                      "rounded-2xl h-10 px-5 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
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
                      "rounded-2xl h-10 px-5 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
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
                    "rounded-2xl h-10 px-4 font-semibold"
                  )}
                >
                  Xem hồ sơ của tôi
                </Link>
              </div>
            </div>

            {/* Background icon watermark */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 text-amber-500/5 hidden sm:block">
              <Briefcase className="size-64" />
            </div>
          </div>

          {/* Quick stats / Highlights for Logged-in user */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Việc làm mới trong 24h</span>
              <p className="text-2xl font-black text-amber-500">+148 việc</p>
              <p className="text-[11px] text-muted-foreground">Ưu tiên sinh viên nộp sớm</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Mức lương trung bình</span>
              <p className="text-2xl font-black text-foreground">32.000đ/giờ</p>
              <p className="text-[11px] text-muted-foreground">Tăng 8% so với quý trước</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Tỷ lệ duyệt hồ sơ</span>
              <p className="text-2xl font-black text-emerald-500">92%</p>
              <p className="text-[11px] text-muted-foreground">Phản hồi trong 24 giờ</p>
            </div>
          </div>

          {/* Featured Jobs Section for Authenticated */}
          <FeaturedJobsSection />

          {/* Job Categories */}
          <JobCategoriesSection />

          {/* Calculator */}
          <EarningsCalculator />
        </div>
      ) : (
        /* ========================================================= */
        /* TRẠNG THÁI 2: KHÁCH VÃNG LAI (LANDING PAGE HẤP DẪN)       */
        /* ========================================================= */
        <div className="space-y-4">
          {/* 1. Hero Section cuốn hút + Tìm kiếm nhanh */}
          <HeroSection />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
            {/* 2. Công cụ tính thu nhập tương tác (Hook cực mạnh cho sinh viên) */}
            <EarningsCalculator />

            {/* 3. Danh mục công việc hot & mức lương sàn */}
            <JobCategoriesSection />

            {/* 4. Việc làm tuyển gấp hôm nay (kèm badge kiểm duyệt & mức lương giờ) */}
            <FeaturedJobsSection />

            {/* 5. Cam kết an toàn UniWork Shield (Đập tan nỗi sợ lừa đảo/cọc tiền) */}
            <SafetyGuaranteeSection />

            {/* 6. 3 Bước nhận việc siêu nhanh */}
            <StepByStepSection />

            {/* 7. Tab chuyển đổi: Quyền lợi Sinh viên vs Chủ quán/Doanh nghiệp */}
            <RoleTabsSection />

            {/* 8. Đánh giá thực tế từ sinh viên các trường ĐH lớn */}
            <TestimonialsSection />

            {/* 9. Câu hỏi thường gặp */}
            <FaqSection />

            {/* 10. Banner kêu gọi hành động cuối trang */}
            <CtaBanner />
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
