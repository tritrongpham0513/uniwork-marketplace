import { Link } from "react-router";
import { UserCheck, Search, CreditCard, ArrowRight } from "lucide-react";
import { PATHS } from "@/config/paths";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function StepByStepSection() {
  const STEPS = [
    {
      step: "01",
      icon: UserCheck,
      title: "Tạo hồ sơ trong 60 giây",
      desc: "Chỉ cần nhập tên, trường đang học và đánh dấu các khung giờ bạn rảnh trong tuần. Không cần viết CV dài dòng.",
    },
    {
      step: "02",
      icon: Search,
      title: "Ứng tuyển 1 chạm gần nơi ở",
      desc: "Hệ thống tự động lọc ra các quán, trung tâm hoặc doanh nghiệp gần trường bạn đang tuyển đúng ca bạn rảnh.",
    },
    {
      step: "03",
      icon: CreditCard,
      title: "Nhận việc & Lĩnh lương minh bạch",
      desc: "Nhận phản hồi trong 24h, nhận ca thử việc và nhận thù lao đều đặn theo tuần hoặc tháng vào tài khoản ngân hàng.",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
          Bắt đầu kiếm thu nhập chỉ với 3 bước đơn giản
        </h2>
        <p className="text-sm text-muted-foreground">
          Quy trình tinh gọn, thân thiện và tối ưu riêng cho nhịp sống năng động của sinh viên.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs hover:border-amber-500/40 transition-all"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 font-bold">
                    <Icon className="size-6" />
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/30 font-mono">
                    {item.step}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Bước {item.step} • Hoàn tất tức thì
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link
          to={PATHS.AUTH.REGISTER}
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-2xl h-12 px-8 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 group"
          )}
        >
          Tạo tài khoản nhận việc ngay
          <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

