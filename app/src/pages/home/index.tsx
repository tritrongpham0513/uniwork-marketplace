import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobCardSkeleton } from "@/features/jobs/components/job-card-skeleton";
import { CategoryGrid, ProvinceGrid, SeeAllLink } from "@/features/jobs/components/category-grid";
import type { Job } from "@/features/jobs/types";
import {
  useJobCategories,
  useJobs,
  useProvinces,
  useSalaryBenchmarks,
} from "@/features/jobs/hooks/useJobs";
import { DEFAULT_FILTERS } from "@/features/jobs/hooks/useJobFilters";
import { compareSalary, findBenchmarkFor } from "@/features/jobs/lib/salary";
import { PATHS } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";

/** Thống kê nổi bật — layout Chốt Ca */
const STATS = [
  { value: "1.200+", label: "Việc làm đang tuyển" },
  { value: "480+", label: "Doanh nghiệp uy tín" },
  { value: "35.000+", label: "Sinh viên đã ứng tuyển" },
  { value: "92%", label: "Hoàn thành công việc" },
];

const FEATURES = [
  {
    icon: Wallet,
    title: "Lương minh bạch, xếp hạng rõ ràng",
    description:
      "Mỗi tin tuyển dụng đều có mức lương công khai kèm xếp hạng so với trung bình ngành — không còn tin tuyển dụng 'lương thỏa thuận' mơ hồ.",
  },
  {
    icon: CalendarClock,
    title: "Ca làm việc rõ ràng theo tuần",
    description:
      "Xem trước lịch làm cụ thể từng ngày, mức lương theo giờ và số suất tuyển — biết chắc công việc có hợp lịch học không.",
  },
  {
    icon: ShieldCheck,
    title: "Nhà tuyển dụng được xác minh",
    description:
      "Hồ sơ doanh nghiệp và cá nhân đều qua bước xác minh trước khi đăng tin, giúp sinh viên yên tâm ứng tuyển.",
  },
  {
    icon: BadgeCheck,
    title: "Đánh giá 2 chiều minh bạch",
    description:
      "Cả nhà tuyển dụng và sinh viên đều có thể đánh giá nhau sau khoảng làm việc, xây dựng uy tín cho cả hai phía.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tạo hồ sơ sinh viên",
    description:
      "Điền thông tin học vấn, kỹ năng và tải CV lên trong 3 phút.",
  },
  {
    step: "02",
    title: "Tìm & ứng tuyển",
    description:
      "Lọc theo ngành, ca làm, khu vực và mức lương. Ứng tuyển 1 chạm.",
  },
  {
    step: "03",
    title: "Theo dõi & đánh giá",
    description:
      "Nhận thông báo khi hồ sơ được xem, duyệt hoặc nhận. Đánh giá sau khi làm xong.",
  },
];

export function HomePage() {
  const { user } = useAuth();
  const { data: categories = [] } = useJobCategories();
  const { data: provinces = [] } = useProvinces();
  const { data: benchmarks = [] } = useSalaryBenchmarks();

  const { data: latestJobs, isLoading } = useJobs({
    ...DEFAULT_FILTERS,
    pageSize: 6,
    sort: "newest",
  });

  const { data: popularJobs } = useJobs({
    ...DEFAULT_FILTERS,
    pageSize: 6,
    sort: "popular",
  });

  const { data: highPayJobs } = useJobs({
    ...DEFAULT_FILTERS,
    pageSize: 6,
    sort: "salary_desc",
  });

  const provinceCounts = (latestJobs?.items ?? []).reduce<
    Record<string, number>
  >((acc, job) => {
    acc[job.location.provinceId] = (acc[job.location.provinceId] ?? 0) + 1;
    return acc;
  }, {});

  const renderJobList = (
    jobs: Job[] | undefined,
    isPending = false
  ) => {
    if (isPending) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <JobCardSkeleton key={index} />
          ))}
        </div>
      );
    }
    if (!jobs || jobs.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Chưa có việc làm nào.
        </p>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.slice(0, 4).map((job) => {
          const benchmark = findBenchmarkFor(
            benchmarks,
            job.category.id,
            job.location.provinceId
          );
          return (
            <JobCard
              key={job.id}
              job={job}
              comparison={compareSalary(job, benchmark)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            {/* Nội dung trái */}
            <div className="max-w-xl">
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Sparkles className="size-3" />
                Nền tảng việc làm bán thời gian cho sinh viên
              </Badge>

              <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Việc làm thêm{" "}
                <span className="text-primary">phù hợp lịch học</span> cho
                sinh viên
              </h1>

              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Tìm việc làm part-time tại quán cà phê, nhà hàng, cửa hàng hay
                làm thực tập sinh — với mức lương minh bạch, ca làm rõ ràng và
                nhà tuyển dụng đã xác minh.
              </p>

              {/* Ô tìm kiếm */}
              <div className="mt-6">
                <InputGroup className="shadow-sm">
                  <InputGroupAddon>
                    <Search className="size-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Tìm việc làm theo vị trí, quán ăn, khu vực..."
                    aria-label="Tìm việc làm"
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      nativeButton={false}
                      render={<Link to={PATHS.JOBS.ROOT} />}
                    >
                      Tìm việc
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {/* Gợi ý nhanh */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Phổ biến:</span>
                {["Phục vụ", "Barista", "Thu ngân", "Gia sư"].map((keyword) => (
                  <Link
                    key={keyword}
                    to={`${PATHS.JOBS.ROOT}?keyword=${encodeURIComponent(keyword)}`}
                    className="rounded-md border border-border bg-card px-2 py-1 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {keyword}
                  </Link>
                ))}
              </div>

              {/* CTA theo vai trò */}
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <Button
                    className="cursor-pointer"
                    nativeButton={false}
                    render={
                      <Link
                        to={
                          user.role === "EMPLOYER"
                            ? PATHS.EMPLOYER.ROOT
                            : user.role === "ADMIN"
                              ? PATHS.ADMIN.ROOT
                              : PATHS.STUDENT.ROOT
                        }
                      />
                    }
                  >
                    Đi tới bảng điều khiển
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      className="cursor-pointer"
                      nativeButton={false}
                      render={<Link to={PATHS.AUTH.REGISTER} />}
                    >
                      Tìm việc làm ngay
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      nativeButton={false}
                      render={<Link to={PATHS.AUTH.REGISTER} />}
                    >
                      <Building2 className="size-4" />
                      Đăng tin tuyển dụng
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Bảng điều khiển minh hoạ */}
            <div className="relative hidden lg:block">
              <Card className="overflow-hidden shadow-lg">
                <CardHeader className="border-b border-border/60 bg-muted/40 pb-3">
                  <CardTitle className="text-sm">Việc làm nổi bật hôm nay</CardTitle>
                  <CardDescription className="text-xs">
                    Cập nhật theo thời gian thực
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/60 p-0">
                  {(latestJobs?.items ?? []).slice(0, 4).map((job) => (
                    <Link
                      key={job.id}
                      to={PATHS.JOBS.DETAIL(job.id)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <TrendingUp className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {job.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.location.district} ·{" "}
                          {job.employer.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {job.salaryMin >= 1000
                          ? `${Math.round(job.salaryMin / 1000)}k`
                          : job.salaryMin}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              {/* Thẻ số liệu nổi */}
              <div className="absolute -bottom-5 -left-5 hidden w-52 rounded-xl border border-border/60 bg-card p-4 shadow-xl xl:block">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Star className="size-4" />
                  </div>
                  <div>
                    <p className="text-lg leading-none font-bold text-foreground">
                      4.6/5
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Đánh giá từ sinh viên
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Số liệu */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border/60 pt-8 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="font-heading text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= NHÓM VIỆC ================= */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Nhóm việc phổ biến
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn nhóm ngành để xem các vị trí tương ứng
            </p>
          </div>
          <SeeAllLink to={PATHS.JOBS.ROOT} label="Xem tất cả" />
        </div>

        <CategoryGrid categories={categories} />
      </section>

      {/* ================= VIỆC LÀM MỚI NHẤT ================= */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Việc làm mới nhất
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tin tuyển dụng vừa được đăng trên hệ thống
              </p>
            </div>
            <SeeAllLink to={PATHS.JOBS.ROOT} label="Xem tất cả" />
          </div>

          {renderJobList(latestJobs?.items, isLoading)}
        </div>
      </section>

      {/* ================= ĐỊA ĐIỂM ================= */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Việc làm theo địa điểm
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tìm việc gần trường hoặc gần nhà
            </p>
          </div>
        </div>

        <ProvinceGrid provinces={provinces} counts={provinceCounts} />
      </section>

      {/* ================= VÌ TRÍ ĐƯỢC XEM NHIỀU ================= */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Đang được quan tâm
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Những tin tuyển dụng có lượt xem cao nhất
              </p>
            </div>
            <SeeAllLink to={PATHS.JOBS.ROOT} label="Xem tất cả" />
          </div>

          {renderJobList(popularJobs?.items)}
        </div>
      </section>

      {/* ================= LƯƠNG CAO ================= */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Cơ hội lương cao
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Những tin tuyển dụng đang trả lương nổi bật trên thị trường
            </p>
          </div>
          <SeeAllLink
            to={`${PATHS.JOBS.ROOT}?sort=salary_desc`}
            label="Xem tất cả"
          />
        </div>

        {renderJobList(highPayJobs?.items)}
      </section>

      {/* ================= CÁCH HOẠT ĐỘNG ================= */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Ứng tuyển chỉ trong 3 bước
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Không mất quá 3 phút để bắt đầu
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step} className="relative overflow-hidden">
              <CardContent className="p-6">
                <span className="font-heading text-4xl font-bold text-primary/15">
                  {item.step}
                </span>
                <h3 className="mt-2 font-heading text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= TÍNH NĂNG ================= */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Vì sao chọn VieJob?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Chúng tôi giải quyết đúng những gì sinh viên và nhà tuyển dụng
              cần
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="h-full">
                  <CardContent className="flex h-full gap-4 p-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA CUỐI ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="overflow-hidden">
          <CardContent className="relative p-8 text-center sm:p-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Sẵn sàng bắt đầu?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {user
                  ? "Khám phá cơ hội việc làm phù hợp ngay trên bảng điều khiển của bạn."
                  : "Tạo tài khoản miễn phí và bắt đầu ứng tuyển việc làm phù hợp lịch học của bạn ngay hôm nay."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {user ? (
                  <Button
                    className="cursor-pointer"
                    nativeButton={false}
                    render={<Link to={PATHS.JOBS.ROOT} />}
                  >
                    Tìm việc làm ngay
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      className="cursor-pointer"
                      nativeButton={false}
                      render={<Link to={PATHS.AUTH.REGISTER} />}
                    >
                      Tạo tài khoản sinh viên
                    </Button>
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      nativeButton={false}
                      render={<Link to={PATHS.AUTH.REGISTER} />}
                    >
                      Đăng tin tuyển dụng
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  Hoạt động tại 6 tỉnh thành
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  Nhà tuyển dụng đã xác minh
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="size-3.5" />
                  Không thu phí ứng tuyển
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default HomePage;
