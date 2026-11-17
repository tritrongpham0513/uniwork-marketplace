import { Link } from "react-router";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/empty-state";
import { useAdminDashboard } from "@/features/admin/hooks";
import { PATHS } from "@/config/paths";
import { cn } from "cn";

export default function AdminDashboardPage() {
  const { data: stats, isPending, isError, refetch } = useAdminDashboard();


  const quickActions = [
    {
      label: "Tin chờ duyệt",
      value: stats?.pendingJobs ?? 0,
      description: "Cần kiểm tra nội dung trước khi hiển thị",
      to: PATHS.ADMIN.JOBS,
      icon: Clock,
    },
    {
      label: "Đơn ứng tuyển đang chờ",
      value: stats?.pendingApplications ?? 0,
      description: "Ứng viên đang chờ nhà tuyển dụng phản hồi",
      to: PATHS.ADMIN.USERS,
      icon: Users,
    },
    {
      label: "Đánh giá bị ẩn",
      value: stats?.hiddenReviews ?? 0,
      description: "Đánh giá vi phạm đã bị ẩn khỏi hệ thống",
      to: PATHS.ADMIN.REVIEWS,
      icon: Star,
    },
  ];

  return (
    <DashboardLayout
      title="Bảng điều khiển hệ thống"
      description="Tổng quan về hoạt động của VieJob Marketplace."
    >
      {isError && (
        <ErrorState
          title="Không tải được số liệu hệ thống"
          description="Vui lòng thử lại sau."
          onRetry={() => void refetch()}
        />
      )}

      {!isError && (
        <div className="space-y-6">
          {/* THẺ KPI */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng người dùng"
              value={stats?.totalUsers ?? 0}
              hint={`${stats?.totalStudents ?? 0} SV · ${
                stats?.totalEmployers ?? 0
              } NTD`}
              icon={<Users className="size-4" />}
            />
            <StatCard
              label="Tổng tin tuyển dụng"
              value={stats?.totalJobs ?? 0}
              hint={`${stats?.openJobs ?? 0} đang mở`}
              icon={<Briefcase className="size-4" />}
            />
            <StatCard
              label="Tổng đơn ứng tuyển"
              value={stats?.totalApplications ?? 0}
              hint={`${stats?.pendingApplications ?? 0} đang chờ`}
              icon={<FileText className="size-4" />}
            />
            <StatCard
              label="Nhóm việc"
              value={stats?.categories ?? 0}
              hint="Danh mục đang hoạt động"
              icon={<FolderKanban className="size-4" />}
            />
          </div>

          {/* HÀNH ĐỘNG NHANH */}
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Card className="h-full transition-colors group-hover:bg-muted/40">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {action.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {action.description}
                        </p>
                        <p
                          className={cn(
                            "mt-2 font-heading text-2xl font-bold tabular-nums",
                            action.value > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {isPending ? "—" : action.value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* PHÂN BỐ NGƯỜI DÙNG */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Phân bổ người dùng
                </CardTitle>
                <CardDescription>
                  Tỷ lệ theo vai trò trên hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Sinh viên",
                    value: stats?.totalStudents ?? 0,
                    total: stats?.totalUsers ?? 1,
                    color: "bg-primary",
                  },
                  {
                    label: "Nhà tuyển dụng",
                    value: stats?.totalEmployers ?? 0,
                    total: stats?.totalUsers ?? 1,
                    color: "bg-secondary",
                  },
                  {
                    label: "Quản trị viên",
                    value: Math.max(
                      0,
                      (stats?.totalUsers ?? 0) -
                        (stats?.totalStudents ?? 0) -
                        (stats?.totalEmployers ?? 0)
                    ),
                    total: stats?.totalUsers ?? 1,
                    color: "bg-muted-foreground",
                  },
                ].map((item) => {
                  const percent =
                    item.total > 0
                      ? Math.round((item.value / item.total) * 100)
                      : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-foreground">{item.label}</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {item.value} ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", item.color)}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* QUẢN LÝ NHANH */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Quản lý nhanh
                </CardTitle>
                <CardDescription>
                  Các tác vụ thường ngày của quản trị viên
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  {
                    label: "Duyệt tin tuyển dụng",
                    description: `${stats?.pendingJobs ?? 0} tin đang chờ duyệt`,
                    to: PATHS.ADMIN.JOBS,
                    icon: CheckCircle2,
                  },
                  {
                    label: "Quản lý người dùng",
                    description: `${stats?.totalUsers ?? 0} tài khoản trên hệ thống`,
                    to: PATHS.ADMIN.USERS,
                    icon: Users,
                  },
                  {
                    label: "Quản lý danh mục",
                    description: `${stats?.categories ?? 0} nhóm việc đang hoạt động`,
                    to: PATHS.ADMIN.CATEGORIES,
                    icon: FolderKanban,
                  },
                  {
                    label: "Kiểm duyệt đánh giá",
                    description: `${stats?.hiddenReviews ?? 0} đánh giá đang bị ẩn`,
                    to: PATHS.ADMIN.REVIEWS,
                    icon: Star,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      className="h-auto w-full justify-start gap-3 py-2.5"
                      nativeButton={false}
                      render={<Link to={item.to} />}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
