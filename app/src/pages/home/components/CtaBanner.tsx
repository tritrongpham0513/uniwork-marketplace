import { Link } from "react-router";
import { Sparkles, ArrowRight, GraduationCap, Building2, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { cn } from "cn";

export function CtaBanner() {
  return (
    <section className="py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 sm:p-12 lg:p-16 text-white shadow-xl">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-80 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <Sparkles className="size-3.5" />
            Cơ hội không chờ đợi ai
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Đừng để thời gian rảnh trôi qua lãng phí. Tạo tài khoản ngay!
          </h2>

          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
            Hơn 1,500 việc làm bán thời gian đang chờ đón bạn. Nhận việc nhanh trong 24h, bảo vệ quyền lợi và không lo xung đột lịch học.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to={PATHS.AUTH.REGISTER}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-2xl h-12 px-8 text-sm font-bold bg-white text-zinc-900 hover:bg-zinc-100 shadow-lg shadow-black/10 group cursor-pointer"
              )}
            >
              <GraduationCap className="size-4 mr-2 text-amber-600" />
              Đăng ký tài khoản Sinh viên (0đ)
              <ArrowRight className="size-4 ml-2 text-amber-600 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to={PATHS.AUTH.REGISTER}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-2xl h-12 px-7 text-sm font-bold text-white border-white/40 hover:bg-white/15 backdrop-blur-sm cursor-pointer"
              )}
            >
              <Building2 className="size-4 mr-2" />
              Dành cho Nhà tuyển dụng
            </Link>
          </div>

          {/* Quick reassurance points */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/20 text-xs text-white/80">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-white" />
              Không phí cọc giữ chỗ
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-white" />
              Xác minh danh tính an toàn
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-white" />
              Hỗ trợ 24/7 qua Hotline
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
