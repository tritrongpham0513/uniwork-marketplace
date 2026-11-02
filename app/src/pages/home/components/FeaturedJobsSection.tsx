import { useState } from "react";
import { Link } from "react-router";
import {
  MapPin,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { FEATURED_JOBS, type JobItem } from "../data/mock-data";
import { PATHS } from "@/config/paths";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const TABS = [
  { id: "all", label: "Tất cả việc làm" },
  { id: "f-and-b", label: "☕ F&B / Pha chế" },
  { id: "gia-su", label: "📚 Gia sư & Trợ giảng" },
  { id: "thuc-tap", label: "💻 Thực tập & Marketing" },
  { id: "ban-hang", label: "🛍️ Bán hàng & Sự kiện" },
];

export function FeaturedJobsSection() {
  const [activeTab, setActiveTab] = useState("all");
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSavedJobs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredJobs = FEATURED_JOBS.filter((job) => {
    if (activeTab === "all") return true;
    if (activeTab === "ban-hang") {
      return job.category === "ban-hang" || job.category === "su-kien";
    }
    return job.category === activeTab;
  });

  return (
    <section className="py-12 sm:py-16">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
            <Flame className="size-3.5 fill-current" />
            Tuyển gấp hôm nay
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Việc làm hot gần trường bạn
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Các tin đăng được kiểm duyệt nghiêm ngặt, ưu tiên tuyển dụng sinh viên nhận việc đi làm ngay.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60 self-start md:self-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredJobs.map((job: JobItem) => {
          const isSaved = !!savedJobs[job.id];
          return (
            <div
              key={job.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-lg"
            >
              {/* Header card info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-xs",
                        job.logoBg
                      )}
                    >
                      {job.logoLetter}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-amber-500 transition-colors">
                        {job.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {job.company}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleSave(job.id, e)}
                    className="p-1 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                    title={isSaved ? "Bỏ lưu việc" : "Lưu việc làm"}
                  >
                    <Bookmark
                      className={cn(
                        "size-4",
                        isSaved && "fill-amber-500 text-amber-500"
                      )}
                    />
                  </button>
                </div>

                {/* Salary & Urgent Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                    💰 {job.salary} / {job.period}
                  </span>

                  {job.urgent && (
                    <span className="rounded-xl bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                      ⚡ Cần gấp
                    </span>
                  )}

                  {job.verified && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3" /> Đã kiểm duyệt
                    </span>
                  )}
                </div>

                {/* Location & Shifts */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 line-clamp-1">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>{job.shifts.join(" • ")}</span>
                  </div>
                </div>

                {/* Perks tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {job.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                <span className="text-[11px] text-muted-foreground">
                  Đăng {job.postedAgo}
                </span>

                <Link
                  to={PATHS.AUTH.REGISTER}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "rounded-xl h-8 px-3.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs group/btn"
                  )}
                >
                  <span>Ứng tuyển</span>
                  <ArrowRight className="size-3 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Box under jobs */}
      <div className="mt-10 rounded-2xl border border-dashed border-border p-6 text-center bg-muted/10">
        <p className="text-sm font-semibold text-foreground">
          Bạn chưa tìm thấy việc làm đúng theo khung giờ rảnh của mình?
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Tạo tài khoản sinh viên chỉ mất 30 giây để bật thông báo tự động khi có quán hoặc công ty gần bạn đăng tin mới!
        </p>
        <div className="mt-4">
          <Link
            to={PATHS.AUTH.REGISTER}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-xl h-9 px-5 text-xs font-bold hover:border-amber-500 hover:text-amber-500"
            )}
          >
            <Sparkles className="size-3.5 mr-1.5 text-amber-500" />
            Nhận thông báo việc làm mới nhất
          </Link>
        </div>
      </div>
    </section>
  );
}
