import { useState } from "react";
import { Link } from "react-router";
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { PATHS } from "@/config/paths";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function RoleTabsSection() {
  const [role, setRole] = useState<"student" | "employer">("student");

  return (
    <section className="py-12 sm:py-16">
      {/* Switch role toggle buttons */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-2xl bg-muted/70 p-1.5 border border-border/70 shadow-xs">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              role === "student"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-4 text-amber-500" />
            Dành cho Sinh viên
          </button>

          <button
            type="button"
            onClick={() => setRole("employer")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              role === "employer"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="size-4 text-amber-500" />
            Dành cho Nhà tuyển dụng & Chủ quán
          </button>
        </div>
      </div>

      {role === "student" ? (
        /* STUDENT VIEW */
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-10 lg:p-12 shadow-sm animate-in fade-in-50 duration-300">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3.5" />
                Đặc quyền thành viên sinh viên
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Vừa học vừa kiếm tiền mà không lo áp lực điểm số
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                UniWork sinh ra từ chính sự thấu hiểu lịch học thất thường của sinh viên đại học. Bạn không phải cam kết ca cố định cả năm như nhân sự chính thức.
              </p>

              <div className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Đổi ca linh hoạt:</strong> Bận thuyết trình hay thi đột xuất? Đổi ca dễ dàng qua thông báo trước 24-48h.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Nhận việc gần trường & phòng trọ:</strong> Tìm việc trong bán kính 1 - 3km để tiết kiệm xăng xe và thời gian đi lại.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Tích lũy hồ sơ nghề nghiệp:</strong> Mỗi công việc hoàn thành tốt sẽ được cấp huy hiệu và chứng nhận điện tử giúp CV xin việc sau này cực sáng.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={PATHS.AUTH.REGISTER}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-2xl h-11 px-7 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  )}
                >
                  Đăng ký tài khoản Sinh viên ngay
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Kỳ thi học kỳ sắp tới?</span>
                  <span className="rounded-full bg-blue-500/10 text-blue-500 font-bold px-2 py-0.5">Chế độ ôn thi</span>
                </div>
                <p className="text-xs text-foreground font-medium">
                  Bật tính năng tạm dừng nhận ca mới trong 2 tuần thi cử để tập trung điểm số tuyệt đối mà không bị phạt uy tín.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Bảo hiểm ngày công</span>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5">Bảo chứng</span>
                </div>
                <p className="text-xs text-foreground font-medium">
                  Chấm công bằng định vị GPS hoặc mã QR tại ca làm, chống sai sót giờ công và đối chiếu tức thì khi nhận lương.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EMPLOYER VIEW */
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-10 lg:p-12 shadow-sm animate-in fade-in-50 duration-300">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Zap className="size-3.5" />
                Dành cho Quản lý & Chủ kinh doanh
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Tuyển đúng người, lấp đầy ca trống chỉ trong vài giờ
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Đăng bài lên group Facebook bị trôi bài, spam tin nhắn và ứng viên &quot;bùng kèo&quot;? UniWork giúp bạn quản lý ứng viên chuyên nghiệp, lọc theo trường đại học và độ phù hợp ca làm.
              </p>

              <div className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Đăng tin nhanh 2 phút:</strong> Mẫu tin đăng chuẩn F&B, Bán lẻ, Gia sư có sẵn, chỉ cần điền mức lương và ca cần tuyển.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Xem hồ sơ & lịch học ứng viên:</strong> Biết trước ứng viên rảnh khung giờ nào để xếp lịch làm việc khớp 100%, không bị xung đột.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <strong className="text-foreground">Đánh giá kỷ luật ứng viên:</strong> Xem lịch sử làm việc của sinh viên từ các quán khác để an tâm tuyệt đối về thái độ.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={PATHS.AUTH.REGISTER}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-2xl h-11 px-7 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  )}
                >
                  Tạo tài khoản Doanh nghiệp & Đăng tin
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Tốc độ nhận hồ sơ</span>
                  <span className="text-amber-500">Trung bình 2.5 giờ</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-amber-500 w-[88%]" />
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  88% tin đăng được lấp đầy ứng viên trong vòng 24 giờ đầu tiên.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Chi phí tuyển dụng</span>
                  <span className="text-emerald-500">Tiết kiệm 70%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Đăng tin tuyển dụng khởi tạo miễn phí, không phát sinh chi phí môi giới ẩn.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
