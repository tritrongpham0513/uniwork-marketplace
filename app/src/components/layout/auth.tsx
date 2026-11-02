import { AuroraBackground } from "@/components/ui/aurora-background";
import { Outlet } from "react-router";
import { Briefcase, Sparkles, CheckCircle2 } from "lucide-react";

function AuthLayout() {
  return (
    <AuroraBackground>
      <div className="relative flex min-h-dvh w-full items-center justify-center p-4 py-8">
        <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-3 text-card-foreground shadow-2xl backdrop-blur-md md:grid-cols-2">
          {/* Banner minh họa bên trái */}
          <div className="relative hidden flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 text-white shadow-inner md:flex min-h-[580px]">
            {/* Hiệu ứng hoa văn nền mờ */}
            <div className="absolute -top-12 -left-12 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-black/10 blur-2xl" />

            {/* Logo / Brand header */}
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
                <Briefcase className="size-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">UniWork</span>
                <span className="block text-xs font-medium text-white/80">Part-time Job Marketplace</span>
              </div>
            </div>

            {/* Content giữa banner */}
            <div className="relative z-10 space-y-4 my-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="size-3.5" />
                Cơ hội việc làm linh hoạt cho sinh viên
              </div>
              <h2 className="text-2xl font-bold leading-snug">
                Cầu nối uy tín giữa Sinh viên & Nhà tuyển dụng
              </h2>
              <p className="text-sm text-white/85 leading-relaxed">
                Khám phá hàng ngàn công việc làm thêm, thực tập theo ca linh hoạt phù hợp lịch học, hoặc kết nối ngay với nguồn nhân lực trẻ trung, năng động.
              </p>

              <div className="space-y-2 pt-2 text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-amber-200" />
                  <span>Xác minh danh tính & tin tuyển dụng an toàn</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-amber-200" />
                  <span>Lịch làm việc linh động điều chỉnh theo môn học</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-amber-200" />
                  <span>Hồ sơ năng lực trực quan cho sinh viên</span>
                </div>
              </div>
            </div>

            {/* Footer chân trang bên trái */}
            <div className="relative z-10 text-xs text-white/70">
              © {new Date().getFullYear()} UniWork Marketplace. All rights reserved.
            </div>
          </div>

          {/* Form bên phải */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-sm space-y-4">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}

export default AuthLayout;
