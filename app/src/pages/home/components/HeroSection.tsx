import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  CheckCircle2,
  Star,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { POPULAR_LOCATIONS, SHIFT_TYPES } from "../data/mock-data";
import { cn } from "cn";

export function HeroSection() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState(POPULAR_LOCATIONS[0]);
  const [shift, setShift] = useState(SHIFT_TYPES[0]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to jobs search or register
    navigate(PATHS.AUTH.REGISTER);
  };

  return (
    <div className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pb-24">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-full -translate-x-1/2 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-36 -z-10 h-72 w-72 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Content Grid */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Headlines & Actions */}
          <div className="text-center lg:text-left lg:col-span-7 space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-xs">
              <Sparkles className="size-3.5 animate-pulse text-amber-500" />
              <span>Nền tảng việc làm sinh viên thế hệ mới #1 Việt Nam</span>
            </div>

            {/* Giant Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
              Việc làm part-time{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
                chuẩn sinh viên
              </span>
              <br />
              Linh hoạt theo lịch học.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Tạm biệt nỗi lo <strong>lừa đảo thu tiền cọc</strong> và <strong>bị ép làm trùng lịch thi cử</strong>. UniWork kết nối bạn với hàng ngàn quán cà phê, nhà hàng, trung tâm Anh ngữ và công ty công nghệ đã xác thực 100%.
            </p>

            {/* Quick Filter Search Bar */}
            <form
              onSubmit={handleSearch}
              className="rounded-2xl border border-border/80 bg-card/90 p-2.5 sm:p-3 shadow-lg shadow-black/5 backdrop-blur-md"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Từ khóa */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Vị trí (Barista, Thu ngân...)"
                    className="h-10 w-full rounded-xl bg-muted/40 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Địa điểm */}
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-10 w-full rounded-xl bg-muted/40 pl-9 pr-3 text-xs sm:text-sm text-foreground appearance-none focus:bg-background focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {POPULAR_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} className="bg-card text-foreground">
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ca làm */}
                <div className="relative flex items-center">
                  <Clock className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="h-10 w-full rounded-xl bg-muted/40 pl-9 pr-3 text-xs sm:text-sm text-foreground appearance-none focus:bg-background focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {SHIFT_TYPES.map((sh) => (
                      <option key={sh} value={sh} className="bg-card text-foreground">
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action buttons inside search */}
              <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                  <span>100% nhà tuyển dụng đã xác minh giấy phép/CCCD</span>
                </div>

                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "w-full sm:w-auto rounded-xl h-10 px-6 font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm cursor-pointer"
                  )}
                >
                  <Search className="size-4 mr-1.5" />
                  Tìm việc ngay
                </button>
              </div>
            </form>

            {/* Quick Action Buttons for both Roles */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1">
              <Link
                to={PATHS.AUTH.REGISTER}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-2xl h-12 px-7 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 group"
                )}
              >
                <GraduationCap className="size-4 mr-2" />
                Sinh viên tìm việc (0đ phí)
                <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to={PATHS.AUTH.REGISTER}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-2xl h-12 px-6 text-sm font-semibold border-border hover:bg-muted/50"
                )}
              >
                <Building2 className="size-4 mr-2 text-amber-500" />
                Doanh nghiệp đăng tuyển
              </Link>
            </div>

            {/* Social Proof Stats Mini */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
              <div>
                <p className="text-xl sm:text-2xl font-black text-foreground">45.000+</p>
                <p className="text-xs text-muted-foreground font-medium">Sinh viên tin dùng</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-foreground">2.500+</p>
                <p className="text-xs text-muted-foreground font-medium">Quán & Doanh nghiệp</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-500">4.9/5 ⭐</p>
                <p className="text-xs text-muted-foreground font-medium">Độ hài lòng ca làm</p>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Mockup & Live Cards */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none space-y-4">
              {/* Card 1: Job Spotlight */}
              <div className="relative rounded-3xl border border-border/80 bg-card p-5 shadow-xl backdrop-blur-sm transition-all hover:border-amber-500/40">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 font-bold text-white shadow-xs">
                      CF
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Barista Pha chế & Thu ngân
                      </h4>
                      <p className="text-xs text-muted-foreground">The Coffee House • Chi nhánh Q.10</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Đang tuyển gấp
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-lg bg-muted px-2 py-1 font-medium text-muted-foreground">
                    🕒 Ca tối 18:00 - 22:30
                  </span>
                  <span className="rounded-lg bg-muted px-2 py-1 font-medium text-muted-foreground">
                    📍 Cách ĐH Bách Khoa 800m
                  </span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-1 font-semibold text-amber-600 dark:text-amber-400">
                    💰 32.000đ - 36.000đ/giờ
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Không yêu cầu tiền cọc</span>
                  </div>
                  <Link
                    to={PATHS.AUTH.REGISTER}
                    className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                  >
                    Ứng tuyển ngay <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>

              {/* Card 2: Floating notification card */}
              <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-amber-500/5 p-4 shadow-md flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <GraduationCap className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    Nguyễn Mai Linh (Sinh viên NEU)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Vừa nhận việc <span className="text-amber-500 font-medium">Trợ giảng tiếng Anh</span> cách 15 phút
                  </p>
                </div>
                <div className="flex items-center text-amber-400 text-xs">
                  <Star className="size-3.5 fill-current" />
                  <span className="ml-1 text-[11px] font-bold text-foreground">5.0</span>
                </div>
              </div>

              {/* Card 3: Safety Promise Highlight */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Cam kết bảo vệ sinh viên 100%</p>
                    <p className="text-muted-foreground text-[11px]">
                      Hoàn tiền & hỗ trợ pháp lý nếu phát hiện doanh nghiệp vi phạm thu cọc giữ chỗ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
