import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  MapPin,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmployerAvatar } from "@/components/shared/employer-avatar";
import { ErrorState } from "@/components/shared/empty-state";
import { JobCard } from "@/features/jobs/components/job-card";
import { useJob, useRelatedJobs, useSalaryBenchmarks } from "@/features/jobs/hooks/useJobs";
import { compareSalary, findBenchmarkFor } from "@/features/jobs/lib/salary";
import {
  DAY_OF_WEEK_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SALARY_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/features/jobs/types";
import { formatPostedAgo, formatSalary } from "@/features/jobs/lib/format";
import { useAuth } from "@/features/auth/hooks";
import { PATHS } from "@/config/paths";
import { toast } from "@/lib/toast";

export function JobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const { data: job, isLoading, isError, refetch } = useJob(id);
  const { data: benchmarks = [] } = useSalaryBenchmarks();
  const { data: related = [] } = useRelatedJobs(job?.category.id ?? "", id);

  if (isLoading) return <JobDetailSkeleton />;

  if (isError || !job) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <ErrorState
          title="Không tìm thấy tin tuyển dụng"
          description="Tin tuyển dụng này có thể đã bị gỡ hoặc đường dẫn không đúng."
          onRetry={() => void refetch()}
        />
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to={PATHS.JOBS.ROOT} />}
          >
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const benchmark = findBenchmarkFor(
    benchmarks,
    job.category.id,
    job.location.provinceId
  );
  const comparison = compareSalary(job, benchmark);
  const remaining = job.positionsCount - job.positionsFilled;

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để ứng tuyển việc làm này.",
      });
      navigate(PATHS.AUTH.LOGIN, {
        state: { from: PATHS.JOBS.APPLY(job.id) },
      });
      return;
    }
    if (user?.role !== "STUDENT") {
      toast.info("Chỉ sinh viên mới ứng tuyển được", {
        description:
          "Bạn đang đăng nhập với tài khoản nhà tuyển dụng hoặc quản trị viên.",
      });
      return;
    }
    navigate(PATHS.JOBS.APPLY(job.id));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép liên kết", {
          description: "Chia sẻ tin tuyển dụng này với bạn bè.",
        });
      }
    } catch {
      toast.error("Không chia sẻ được");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Nút quay lại */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 cursor-pointer"
        nativeButton={false}
        render={<Link to={PATHS.JOBS.ROOT} />}
      >
        <ArrowLeft className="size-4" />
        Tất cả việc làm
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* CỘT CHÍNH */}
        <div className="min-w-0 space-y-6">
          {/* TIÊU ĐỀ */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {job.isUrgent && <Badge>Tuyển gấp</Badge>}
                <Badge variant="secondary">{job.category.name}</Badge>
                {job.position && (
                  <Badge variant="outline">{job.position.name}</Badge>
                )}
              </div>

              <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
                {job.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {job.location.district}, {job.location.province}
                  {job.location.branchName && ` · ${job.location.branchName}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  Đăng {formatPostedAgo(job.postedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-4" />
                  {job.viewCount.toLocaleString("vi-VN")} lượt xem
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {job.applicantCount} ứng viên
                </span>
              </div>

              {/* Lương nổi bật */}
              <div className="mt-5 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-heading text-2xl font-bold text-primary">
                    {formatSalary(job)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SALARY_TYPE_LABELS[job.salaryType]}
                  </span>
                </div>

                {comparison && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <TrendingUp className="size-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      Top {comparison.percentile}%
                    </span>
                    <span className="text-muted-foreground">
                      {comparison.verdict === "ABOVE"
                        ? "· Cao hơn trung bình"
                        : comparison.verdict === "BELOW"
                          ? "· Thấp hơn trung bình"
                          : "· Trung bình ngành"}
                    </span>
                    <span className="text-muted-foreground">
                      · Dữ liệu {comparison.benchmark.sampleSize} tin ·{" "}
                      {new Date(
                        comparison.benchmark.updatedAt
                      ).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NỘI DUNG */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <Tabs defaultValue="description">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="description">Mô tả</TabsTrigger>
                  <TabsTrigger value="requirements">Yêu cầu</TabsTrigger>
                  <TabsTrigger value="benefits">Quyền lợi</TabsTrigger>
                  <TabsTrigger value="schedule">Ca làm việc</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Mô tả công việc
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {job.description || "Chưa có mô tả chi tiết."}
                  </p>

                  {job.skills.length > 0 && (
                    <>
                      <Separator className="my-5" />
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Kỹ năng yêu cầu
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.skills.map((skill) => (
                          <Badge key={skill.id} variant="outline">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="requirements" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Yêu cầu ứng viên
                  </h2>
                  {job.requirements.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {job.requirements.map((requirement, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Không có yêu cầu cụ thể.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="benefits" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Quyền lợi
                  </h2>
                  {job.benefits.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {job.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chưa có thông tin quyền lợi.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Lịch làm việc
                  </h2>
                  {job.schedules.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {job.schedules.map((schedule, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Clock className="size-4 text-muted-foreground" />
                            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {schedule.startTime} — {schedule.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nhà tuyển dụng chưa cập nhật lịch làm việc.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* TIN LIÊN QUAN */}
          {related.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
                Việc làm cùng nhóm ngành
              </h2>
              <div className="space-y-4">
                {related.slice(0, 4).map((item) => (
                  <JobCard key={item.id} job={item} showApply={false} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CỘT PHẢI */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* HÀNH ĐỘNG */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <Button
                size="lg"
                className="h-11 w-full cursor-pointer font-semibold"
                onClick={handleApply}
              >
                Ứng tuyển ngay
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleShare}
                >
                  <Share2 className="size-4" />
                  Chia sẻ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    toast.success("Đã lưu tin tuyển dụng", {
                      description:
                        "Bạn có thể xem lại trong mục Việc làm đã lưu.",
                    })
                  }
                >
                  <Bookmark className="size-4" />
                  Lưu tin
                </Button>
              </div>

              {job.deadline && (
                <Alert>
                  <Clock className="size-4" />
                  <AlertTitle>Hạn ứng tuyển</AlertTitle>
                  <AlertDescription>
                    {new Date(job.deadline).toLocaleDateString("vi-VN")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* TÓM TẮT */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Coins} label="Mức lương" value={formatSalary(job)} />
              <InfoRow
                icon={Building2}
                label="Loại hình"
                value={EMPLOYMENT_TYPE_LABELS[job.employmentType]}
              />
              <InfoRow
                icon={MapPin}
                label="Hình thức"
                value={WORK_MODE_LABELS[job.workMode]}
              />
              <InfoRow
                icon={Users}
                label="Số lượng tuyển"
                value={`${job.positionsCount} vị trí (còn ${remaining})`}
              />
              <InfoRow
                icon={Building2}
                label="Nhóm ngành"
                value={job.category.name}
              />
            </CardContent>
          </Card>

          {/* NHÀ TUYỂN DỤNG */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Nhà tuyển dụng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <EmployerAvatar
                  name={job.employer.name}
                  variant={job.employer.logoVariant}
                  verified={job.employer.verified}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    {job.employer.name}
                    {job.employer.verified && (
                      <CheckCircle2
                        className="size-3.5 shrink-0 text-primary"
                        aria-label="Đã xác minh"
                      />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Đang tuyển {remaining} vị trí
                  </p>
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                nativeButton={false}
                render={
                  <Link to={`/employer/${job.employerId}`} />
                }
              >
                Xem hồ sơ công ty
              </Button>
            </CardContent>
          </Card>

          {/* SAVED */}
          <Card className="hidden lg:block">
            <CardContent className="flex items-center gap-3 p-4">
              <BookmarkCheck className="size-5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Đã lưu tin này? Kiểm tra mục{" "}
                <Link
                  to={PATHS.SAVED}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Việc làm đã lưu
                </Link>
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default JobDetailPage;
