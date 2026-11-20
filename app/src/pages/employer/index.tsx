import { useMemo } from "react";
import { Link } from "react-router";
import { Briefcase, CheckCircle2, Clock, Plus, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useEmployerApplications } from "@/features/applications/hooks";
import { useEmployerProfile } from "@/features/profile/hooks";
import { useEmployerJobs } from "@/features/employer/hooks";
import {
  APPLICATION_STATUS_LABELS,
  JOB_STATUS_LABELS,
} from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { formatPostedAgo } from "@/features/jobs/lib/format";
import { cn } from "cn";

/** Mốc thời gian tham chiếu (tính 1 lần ngoài render để giữ render thuần khiết) */
const REFERENCE_NOW = Date.now();

/** Nhãn thứ trong tuần theo `Date.getDay()` (0 = Chủ nhật) */
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Khoá ngày dạng `YYYY-M-D` theo giờ địa phương — dùng để so khớp ngày đăng */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export default function EmployerDashboardPage() {
  const { data: jobs = [], isPending: jobsPending } = useEmployerJobs();
  const { data: applications = [], isPending: appsPending } =
    useEmployerApplications();
  const { data: profile } = useEmployerProfile();

  const stats = useMemo(() => {
    const openJobs = jobs.filter(
      (job) => job.status === "OPEN" || job.status === "IN_PROGRESS"
    ).length;
    const pendingApplicants = applications.filter(
      (application) => application.status === "PENDING"
    ).length;
    const hired = applications.filter(
      (application) =>
        application.status === "ACCEPTED" || application.status === "COMPLETED"
    ).length;
    const acceptRate =
      applications.length > 0
        ? Math.round((hired / applications.length) * 100)
        : 0;

    return { openJobs, pendingApplicants, hired, acceptRate };
  }, [jobs, applications]);

  // Biểu đồ cột: số tin đăng theo 7 ngày gần nhất
  const chart = useMemo(() => {
    // Dựng 7 bucket theo ngày thực tế: từ 6 ngày trước tới hôm nay
    const today = new Date(REFERENCE_NOW);
    const buckets = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - offset));
      return {
        label: WEEKDAY_LABELS[date.getDay()],
        count: 0,
        key: dayKey(date),
      };
    });

    const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));

    for (const job of jobs) {
      const posted = new Date(job.postedAt);
      if (Number.isNaN(posted.getTime())) continue;

      const index = bucketIndex.get(dayKey(posted));
      // Tin đăng ngoài 7 ngày gần nhất → bỏ qua (không gộp nhầm vào ô đầu)
      if (index !== undefined) buckets[index].count += 1;
    }

    const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
    return { buckets, max };
  }, [jobs]);

  const recentApplicants = applications.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);

  const isPending = jobsPending || appsPending;

  return (
    <DashboardLayout
      title={profile?.displayName ?? "Bảng điều khiển"}
      description="Tổng quan tin tuyển dụng và ứng viên của tổ chức bạn."
      actions={
        <Button size="sm" nativeButton={false} render={<Link to={PATHS.EMPLOYER.JOB_NEW} />}>
          <Plus className="size-4" />
          Đăng tin mới
        </Button>
      }
    >
      <div className="space-y-6">
        {/* THẺ KPI */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tin đang mở"
            value={stats.openJobs}
            hint={`Tổng ${jobs.length} tin đã đăng`}
            icon={<Briefcase className="size-4" />}
          />
          <StatCard
            label="Ứng viên chờ duyệt"
            value={stats.pendingApplicants}
            hint="Cần xử lý hồ sơ"
            icon={<Clock className="size-4" />}
            highlight={stats.pendingApplicants > 0}
          />
          <StatCard
            label="Đã tuyển"
            value={stats.hired}
            hint="Ứng viên đã được nhận"
            icon={<CheckCircle2 className="size-4" />}
          />
          <StatCard
            label="Tỷ lệ được duyệt"
            value={`${stats.acceptRate}%`}
            hint="Ứng tuyển → được nhận"
            icon={<TrendingUp className="size-4" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* CỘT TRÁI */}
          <div className="space-y-6 lg:col-span-2">
            {/* BIỂU ĐỒ CỘT — SVG thuần */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Tin đăng theo tuần
                </CardTitle>
                <CardDescription>
                  Số tin tuyển dụng bạn đăng trong 7 ngày gần nhất
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
                ) : (
                  <div className="flex h-48 items-stretch gap-2 sm:gap-4">
                    {chart.buckets.map((bucket) => {
                      const heightPercent = (bucket.count / chart.max) * 100;

                      return (
                        <div
                          key={bucket.key}
                          className="flex flex-1 flex-col items-center gap-2"
                        >
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            {bucket.count > 0 ? bucket.count : ""}
                          </span>
                          <div className="flex w-full flex-1 flex-col justify-end">
                            <div
                              className={cn(
                                "w-full rounded-t-lg transition-all",
                                bucket.count > 0
                                  ? "bg-primary"
                                  : "bg-muted"
                              )}
                              style={{
                                height: `${Math.max(bucket.count > 0 ? 8 : 3, heightPercent)}%`,
                              }}
                              role="img"
                              aria-label={`${bucket.label}: ${bucket.count} tin đăng`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {bucket.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ỨNG VIÊN MỚI */}
            <Card className="border-border/60">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading text-base">
                    Ứng viên mới cần xử lý
                  </CardTitle>
                  <CardDescription>
                    {applications.length > 0
                      ? `Tổng cộng ${applications.length} hồ sơ`
                      : "Chưa có ứng viên nào"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link to={PATHS.EMPLOYER.APPLICATIONS} />}
                >
                  Xem tất cả
                </Button>
              </CardHeader>

              <CardContent>
                {appsPending ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-14 animate-pulse rounded-lg bg-muted/60"
                      />
                    ))}
                  </div>
                ) : recentApplicants.length === 0 ? (
                  <EmptyState
                    icon="inbox"
                    title="Chưa có ứng viên nào"
                    description="Ứng viên sẽ xuất hiện ở đây khi họ ứng tuyển vào tin của bạn."
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentApplicants.map((application) => (
                      <li key={application.id}>
                        <Link
                          to={PATHS.EMPLOYER.APPLICATION_DETAIL(application.id)}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                            {application.studentName.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {application.studentName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {application.jobTitle} ·{" "}
                              {formatPostedAgo(application.createdAt)}
                            </p>
                          </div>

                          <StatusBadge
                            status={application.status}
                            label={APPLICATION_STATUS_LABELS[application.status]}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CỘT PHẢI */}
          <div className="space-y-6">
            {/* TIN ĐĂNG GẦN ĐÂY */}
            <Card className="border-border/60">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-heading text-base">
                  Tin đăng gần đây
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link to={PATHS.EMPLOYER.JOBS} />}
                >
                  Xem tất cả
                </Button>
              </CardHeader>

              <CardContent>
                {jobsPending ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-14 animate-pulse rounded-lg bg-muted/60"
                      />
                    ))}
                  </div>
                ) : recentJobs.length === 0 ? (
                  <EmptyState
                    icon="inbox"
                    title="Chưa có tin tuyển dụng"
                    description="Đăng tin đầu tiên để bắt đầu tuyển ứng viên."
                    action={
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link to={PATHS.EMPLOYER.JOB_NEW} />}
                      >
                        <Plus className="size-4" />
                        Đăng tin
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentJobs.map((job) => (
                      <li key={job.id}>
                        <Link
                          to={PATHS.EMPLOYER.JOB_EDIT(job.id)}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {job.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {job.applicantCount} ứng viên ·{" "}
                              {formatPostedAgo(job.postedAt)}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {JOB_STATUS_LABELS[job.status]}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* HỒ SƠ TỔ CHỨC */}
            <Card className="border-border/60 bg-primary/5">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Hồ sơ tổ chức
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trạng thái xác minh</span>
                  {profile?.isVerified ? (
                    <Badge className="gap-1 text-[10px]">
                      <CheckCircle2 className="size-3" />
                      Đã xác minh
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Chờ xác minh
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Điểm đánh giá</span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Star className="size-3.5 fill-primary text-primary" />
                    {profile?.avgRating?.toFixed(1) ?? "—"}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({profile?.ratingCount ?? 0})
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  nativeButton={false}
                  render={<Link to={PATHS.EMPLOYER.ORGANIZATION} />}
                >
                  Quản lý thông tin tổ chức
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
