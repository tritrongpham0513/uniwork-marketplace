import { Link } from "react-router";
import {
  Coffee,
  GraduationCap,
  ShoppingBag,
  Laptop,
  Sparkles,
  Package,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { JOB_CATEGORIES, type JobCategory } from "../data/mock-data";
import { PATHS } from "@/config/paths";

const ICON_MAP: Record<string, React.ElementType> = {
  Coffee,
  GraduationCap,
  ShoppingBag,
  Laptop,
  Sparkles,
  Package,
};

export function JobCategoriesSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 sm:mb-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <TrendingUp className="size-3.5" />
            Danh mục việc làm phổ biến
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Khám phá công việc phù hợp với bạn
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Tất cả vị trí đều hỗ trợ ca làm bán thời gian từ 4 đến 6 tiếng, linh hoạt theo kỳ học của sinh viên.
          </p>
        </div>

        <Link
          to={PATHS.AUTH.REGISTER}
          className="inline-flex items-center text-xs sm:text-sm font-bold text-amber-500 hover:text-amber-600 group self-start md:self-auto"
        >
          Xem tất cả 1,500+ việc làm
          <ChevronRight className="size-4 ml-1 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {JOB_CATEGORIES.map((cat: JobCategory) => {
          const IconComponent = ICON_MAP[cat.iconName] || Coffee;
          return (
            <Link
              key={cat.id}
              to={PATHS.AUTH.REGISTER}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5"
            >
              {/* Badge nếu có */}
              {cat.badge && (
                <div className="absolute top-4 right-4 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {cat.badge}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                  <IconComponent className="size-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-amber-500 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-border/60 pt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mức lương:</span>
                  <span className="font-bold text-foreground">{cat.salaryRange}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ca thịnh hành:</span>
                  <span className="text-muted-foreground font-medium">{cat.popularShifts}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <span>{cat.jobCount}+ vị trí đang tuyển</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
