import { useMemo } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Search,
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
import { Progress } from "@/components/ui/progress";
import { DashboardLayout, navItem } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { ApplicationTimeline } from "@/components/shared/application-timeline";
import { JobCard } from "@/features/jobs/components/job-card";
import { useStudentApplications } from "@/features/applications/hooks";
import { useStudentProfile } from "@/features/profile/hooks";
import { useJobs } from "@/features/jobs/hooks/useJobs";
import {
  APPLICATION_STATUS_LABELS,
  type Application,
} from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { formatPostedAgo } from "@/features/jobs/lib/format";

/** Mốc thời gian tham chiếu (tính 1 lần ngoài render để giữ render thuần khiết) */
const REFERENCE_NOW = Date.now();

/** Bước vòng đời đơn ứng tuyển (rút gọn cho dashboard) */
const LIFECYCLE: Application["status"][] = [
  "PENDING",
  "VIEWED",
  "SHORTLISTED",
  "ACCEPTED",
  "COMPLETED",
];

export default function StudentDashboardPage() {
  const { data: applications = [], isPending, isError, refetch } =
    useStudentApplications();
  const { data: profile } = useStudentProfile();

  const stats = useMemo(() => {
    const pending = applications.filter(
      (a) => a.status === "PENDING" || a.status === "VIEWED"
    ).length;
    const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
    const completed = applications.filter((a) => a.status === "COMPLETED").length;

    // Thu nhập ước tính từ các đơn đã nhận / hoàn thành
    const estimatedIncome = applications
      .filter((a) => a.status === "ACCEPTED" || a.status === "COMPLETED")
      .reduce((total, application) => {
        const perHour =
          application.expectedSalary && application.expectedSalary > 100000
            ? application.expectedSalary / 160
            : (application.expectedSalary ?? 0);
        return total + perHour * 24;
      }, 0);

    return { pending, accepted, completed, estimatedIncome };
  }, [applications]);

  const recentApplications = applications.slice(0, 5);

  // Việc làm gợi ý theo nhóm việc trong hồ sơ sinh viên
  const preferredCategoryIds = profile?.jobPreferences.categoryIds ?? [];

  const { data: suggestedJobs, isPending: suggestedPending } = useJobs(
    {
      keyword: "",
      categoryIds: preferredCategoryIds,
      positionIds: [],
      provinceIds: profile?.jobPreferences.provinceIds ?? [],
      districtIds: [],
      employmentTypes: [],
      workModes: [],
      salaryMin: 0,
      salaryMax: 200000,
      sort: "newest",
      page: 1,
      pageSize: 4,
    },
    { enabled: preferredCategoryIds.length > 0 }
  );

  const navItems = [
    navItem("Bảng điều khiển", PATHS.STUDENT.ROOT, ClipboardList),
    navItem("Hồ sơ tìm việc", PATHS.STUDENT.PROFILE, FileText),
    navItem("Đơn ứng tuyển", PATHS.STUDENT.APPLICATIONS, CheckCircle2, stats.pending),
    navItem("Việc đã lưu", PATHS.SAVED, Star),
    navItem("Tìm việc làm", PATHS.JOBS.ROOT, Search),
  ];

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.avatarUrl),
      Boolean(profile.phone),
      Boolean(profile.studentCode),
      Boolean(profile.university && profile.major),
      profile.skills.length > 0,
      Boolean(profile.bio),
      Boolean(profile.cvUrl),
      profile.experiences.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  return (
    <DashboardLayout
      role="STUDENT"
      title={`Xin chào, ${profile?.fullName?.split(" ")[0] ?? "bạn"}`}
      description="Theo dõi hành trình ứng tuyển và cơ hội việc làm dành riêng cho bạn."
      navItems={navItems}
      actions={
        <Button size="sm" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
          <Search className="size-4" />
          Tìm việc làm
        </Button>
      }
    >
      <div className="space-y-6">
        {/* THẺ SỐ LIỆU */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Đơn đang chờ"
            value={stats.pending}
            hint="Đang chờ nhà tuyển dụng phản hồi"
            icon={<CalendarClock className="size-4" />}
          />
          <StatCard
            label="Đã được nhận"
            value={stats.accepted}
            hint="Công việc đang chờ bạn bắt đầu"
            icon={<BadgeCheck className="size-4" />}
            highlight={stats.accepted > 0}
          />
          <StatCard
            label="Đã hoàn thành"
            value={stats.completed}
            hint="Có thể đánh giá trải nghiệm"
            icon={<CheckCircle2 className="size-4" />}
          />
          <StatCard
            label="Thu nhập ước tính"
            value={`${(stats.estimatedIncome / 1_000_000).toFixed(1)}tr`}
            hint="Tính trên 24 giờ/đơn"
            icon={<Wallet className="size-4" />}
            highlight={stats.estimatedIncome > 0}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* CỘT TRÁI */}
          <div className="space-y-6 lg:col-span-2">
            {/* ĐƠN ỨNG TUYỂN GẦN ĐÂY */}
            <Card className="border-border/60">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading text-base">
                    Đơn ứng tuyển gần đây
                  </CardTitle>
                  <CardDescription>
                    {applications.length > 0
                      ? `Bạn đã ứng tuyển ${applications.length} vị trí`
                      : "Bạn chưa ứng tuyển vị trí nào"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link to={PATHS.STUDENT.APPLICATIONS} />}
                >
                  Xem tất cả
                  <ArrowRight className="size-4" />
                </Button>
              </CardHeader>

              <CardContent>
                {isPending && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-14 animate-pulse rounded-lg bg-muted/60" />
                    ))}
                  </div>
                )}

                {isError && (
                  <ErrorState
                    title="Không tải được danh sách đơn"
                    onRetry={() => void refetch()}
                  />
                )}

                {!isPending && !isError && recentApplications.length === 0 && (
                  <EmptyState
                    icon="inbox"
                    title="Chưa có đơn ứng tuyển nào"
                    description="Khám phá các tin tuyển dụng đang mở và gửi đơn đầu tiên của bạn."
                    action={
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link to={PATHS.JOBS.ROOT} />}
                      >
                        Tìm việc làm
                      </Button>
                    }
                  />
                )}

                {!isPending && !isError && recentApplications.length > 0 && (
                  <ul className="divide-y divide-border/60">
                    {recentApplications.map((application) => (
                      <li key={application.id}>
                        <Link
                          to={PATHS.STUDENT.APPLICATION_DETAIL(application.id)}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                            {application.employerName.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {application.jobTitle}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {application.employerName} ·{" "}
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

            {/* VIỆC LÀM GỢI Ý */}
            {preferredCategoryIds.length > 0 && (
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      Việc làm gợi ý cho bạn
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dựa trên nhóm việc và địa điểm trong hồ sơ của bạn
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link to={PATHS.JOBS.ROOT} />}
                  >
                    Xem tất cả
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                {suggestedPending ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-56 animate-pulse rounded-xl bg-muted/60"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(suggestedJobs?.items ?? []).map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CỘT PHẢI */}
          <div className="space-y-6">
            {/* MỨC ĐỘ HOÀN THIỆN HỒ SƠ */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Mức độ hoàn thiện hồ sơ
                </CardTitle>
                <CardDescription>
                  Hồ sơ đầy đủ giúp bạn nhận được nhiều lượt xem hơn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="font-heading text-3xl font-bold text-primary tabular-nums">
                    {profileCompletion}%
                  </span>
                  <TrendingUp className="size-5 text-muted-foreground" />
                </div>

                <Progress value={profileCompletion} />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  nativeButton={false}
                  render={<Link to={PATHS.STUDENT.PROFILE} />}
                >
                  Hoàn thiện hồ sơ
                </Button>

                {profileCompletion < 100 && (
                  <p className="text-xs text-muted-foreground">
                    Bạn còn thiếu ảnh đại diện, CV hoặc kinh nghiệm làm việc.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* VÒNG ĐỜI ĐƠN ỨNG TUYỂN */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Vòng đời đơn ứng tuyển
                </CardTitle>
                <CardDescription>
                  Quy trình xử lý đơn tại VieJob
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationTimeline
                  timeline={LIFECYCLE.map((status, index) => ({
                    status,
                    at: new Date(
                      REFERENCE_NOW - (LIFECYCLE.length - index) * 86400_000
                    ).toISOString(),
                    note: null,
                  }))}
                  currentStatus={
                    applications[0]?.status ?? LIFECYCLE[0]
                  }
                />
              </CardContent>
            </Card>

            {/* MẸO NHANH */}
            <Card className="border-border/60 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <Briefcase className="size-4 text-primary" />
                  Mẹo tìm việc
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Ứng tuyển sớm — tin mới có tỷ lệ được duyệt cao hơn.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Đính kèm CV và viết thư giới thiệu riêng cho từng tin.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Kiểm tra xếp hạng lương trước khi ứng tuyển.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
