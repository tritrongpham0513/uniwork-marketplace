import { useState } from "react";
import { Link } from "react-router";
import {
  Calculator,
  Coins,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Check,
  Calendar,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { cn } from "cn";

interface JobTypeOption {
  id: string;
  label: string;
  baseRate: number; // VND per hour
  defaultHours: number;
  highlight: string;
}

const JOB_OPTIONS: JobTypeOption[] = [
  {
    id: "fb",
    label: "☕ Barista & Phục vụ F&B",
    baseRate: 32000,
    defaultHours: 18,
    highlight: "Bao cơm ca, tip thêm & hỗ trợ gửi xe",
  },
  {
    id: "tutor",
    label: "📚 Gia sư & Trợ giảng tiếng Anh",
    baseRate: 85000,
    defaultHours: 10,
    highlight: "Thu nhập cao, chỉ cần làm tối & cuối tuần",
  },
  {
    id: "retail",
    label: "🛍️ Bán hàng & Cửa hàng tiện lợi",
    baseRate: 30000,
    defaultHours: 20,
    highlight: "Ca linh hoạt 4h, xoay ca theo tuần",
  },
  {
    id: "intern",
    label: "💻 Thực tập / Marketing Online",
    baseRate: 45000,
    defaultHours: 16,
    highlight: "Học hỏi kinh nghiệm thực chiến + dấu mộc CV",
  },
];

export function EarningsCalculator() {
  const [selectedJob, setSelectedJob] = useState<JobTypeOption>(JOB_OPTIONS[0]);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(selectedJob.defaultHours);
  const [customRate, setCustomRate] = useState<number>(selectedJob.baseRate);

  const handleSelectJob = (job: JobTypeOption) => {
    setSelectedJob(job);
    setCustomRate(job.baseRate);
    setHoursPerWeek(job.defaultHours);
  };

  // 1 month = 4.3 weeks on average
  const monthlyEarnings = Math.round(hoursPerWeek * customRate * 4.3);
  const formattedMonthly = new Intl.NumberFormat("vi-VN").format(monthlyEarnings);
  const formattedHourly = new Intl.NumberFormat("vi-VN").format(customRate);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-8 lg:p-10 shadow-lg">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Cột trái: Điều khiển tương tác */}
        <div className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Calculator className="size-3.5" />
            Công cụ ước tính thu nhập sinh viên
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Bạn có thể kiếm được bao nhiêu tiền từ thời gian rảnh?
            </h3>
            <p className="text-sm text-muted-foreground">
              Không cần làm full-time, chỉ cần tận dụng các khung giờ trống giữa các tiết học hoặc buổi tối để tự chủ sinh hoạt phí.
            </p>
          </div>

          {/* Chọn vị trí công việc */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Chọn loại công việc mong muốn:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JOB_OPTIONS.map((job) => {
                const isSelected = selectedJob.id === job.id;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => handleSelectJob(job)}
                    className={cn(
                      "flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left text-xs sm:text-sm font-medium transition-all cursor-pointer",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500/50 shadow-xs"
                        : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <span className="font-semibold text-foreground">{job.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      Mức lương sàn: ~{new Intl.NumberFormat("vi-VN").format(job.baseRate)}đ/h
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider chọn số giờ rảnh mỗi tuần */}
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-4 text-amber-500" />
                2. Số giờ bạn rảnh mỗi tuần:
              </span>
              <span className="rounded-xl bg-amber-500/15 px-3 py-1 font-bold text-amber-600 dark:text-amber-400">
                {hoursPerWeek} giờ / tuần
              </span>
            </div>

            <input
              type="range"
              min={6}
              max={32}
              step={2}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-border accent-amber-500"
            />

            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>6 giờ (1-2 buổi rảnh)</span>
              <span>18 giờ (Lý tưởng cho sinh viên)</span>
              <span>32 giờ (Bán thời gian tối đa)</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Card kết quả nổi bật */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-card to-card p-6 sm:p-8 shadow-md">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                    <Coins className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ước tính thu nhập</p>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Mỗi tháng nhận về
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-3" />
                  Đúng hạn 100%
                </span>
              </div>

              {/* Số tiền lớn gây ấn tượng */}
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
                  ~{formattedMonthly}{" "}
                  <span className="text-lg sm:text-xl font-bold text-amber-500">
                    đ
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tính trên đơn giá trung bình <strong>{formattedHourly}đ/giờ</strong> cho vị trí {selectedJob.label.split(" ")[1]}.
                </p>
              </div>

              {/* Lợi ích thực tế tương đương */}
              <div className="space-y-2.5 rounded-2xl bg-muted/40 p-3.5 text-xs">
                <div className="flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    <strong>Tự chủ tài chính:</strong> Đủ trả tiền phòng trọ, tiền xăng xe & cafe sinh hoạt mà không phụ thuộc phụ cấp.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    <strong>Không lo nợ môn:</strong> Lịch làm việc cam kết linh động theo kỳ thi học kỳ và lịch thi lại.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    <strong>Làm đẹp hồ sơ:</strong> Tích lũy kinh nghiệm mềm và cơ hội nhận thư giới thiệu việc làm sau tốt nghiệp.
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={PATHS.AUTH.REGISTER}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full rounded-2xl h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 group"
                )}
              >
                <Sparkles className="size-4 mr-2" />
                Đăng ký nhận việc làm ngay
                <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

