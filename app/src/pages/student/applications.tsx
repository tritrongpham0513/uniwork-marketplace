import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Plus, RefreshCw, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  useStudentApplications,
  useWithdrawApplication,
} from "@/features/applications/hooks";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";

/** Chip lọc theo trạng thái */
const STATUS_FILTERS: Array<{
  value: ApplicationStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "SHORTLISTED", label: "Được duyệt sơ bộ" },
  { value: "ACCEPTED", label: "Đã nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "REJECTED", label: "Không phù hợp" },
  { value: "WITHDRAWN", label: "Đã rút" },
];

export default function StudentApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  const { data: applications = [], isPending, isError, refetch } =
    useStudentApplications();
  const withdraw = useWithdrawApplication();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const application of applications) {
      map.set(application.status, (map.get(application.status) ?? 0) + 1);
    }
    return map;
  }, [applications]);

  /**
   * Chỉ hiện tab "Tất cả" + các trạng thái đang có đơn.
   * Tab đang chọn luôn được giữ lại để không mất focus khi đếm về 0.
   * Giữ dải tab luôn vừa khít → không bao giờ phải cuộn ngang.
   */
  const visibleFilters = useMemo(
    () =>
      STATUS_FILTERS.filter(
        (item) =>
          item.value === "ALL" ||
          item.value === status ||
          (counts.get(item.value) ?? 0) > 0
      ),
    [counts, status]
  );

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return applications.filter((application) => {
      if (status !== "ALL" && application.status !== status) return false;
      if (!query) return true;
      return (
        application.jobTitle.toLowerCase().includes(query) ||
        application.employerName.toLowerCase().includes(query)
      );
    });
  }, [applications, status, keyword]);

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      await withdraw.mutateAsync(withdrawTarget);
      toast.success("Đã rút đơn ứng tuyển.");
      setWithdrawTarget(null);
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <DashboardLayout
      title="Đơn ứng tuyển của tôi"
      description="Theo dõi trạng thái và kết quả của mọi hồ sơ bạn đã gửi."
      actions={
        <Button size="sm" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
          <Plus className="size-4" />
          Ứng tuyển thêm
        </Button>
      }
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {applications.length > 0
              ? `Tổng cộng ${applications.length} đơn ứng tuyển`
              : "Chưa có đơn ứng tuyển nào"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên tin tuyển dụng hoặc nhà tuyển dụng"
              className="pl-9"
            />
          </div>

          <Tabs
            value={status}
            onValueChange={(value) =>
              setStatus(value as ApplicationStatus | "ALL")
            }
          >
            {/*
              Dải tab cuộn ngang nhưng ẩn scrollbar + fade 2 cạnh (`no-scrollbar
              scroll-fade-x`) để không bị "thô". Thêm tab rỗng đã bị lọc bỏ nên
              thường vừa khít, không phải cuộn.
            */}
            <TabsList className="no-scrollbar scroll-fade-x flex w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl p-1 group-data-horizontal/tabs:h-auto">
              {visibleFilters.map((item) => {
                const count =
                  item.value === "ALL"
                    ? applications.length
                    : (counts.get(item.value) ?? 0);

                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="h-8 flex-none"
                  >
                    {item.label}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách đơn ứng tuyển"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="inbox"
            title={
              applications.length === 0
                ? "Chưa có đơn ứng tuyển nào"
                : "Không có đơn ứng tuyển phù hợp"
            }
            description={
              applications.length === 0
                ? "Tìm việc làm phù hợp và gửi hồ sơ đầu tiên của bạn."
                : "Thử đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
            }
            action={
              <Button size="sm" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
                Tìm việc làm
              </Button>
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((application) => {
              const canWithdraw = application.status === "PENDING";
              // Đơn đã rút → cho ứng tuyển lại (tin tuyển dụng vẫn mở).
              const canReapply = application.status === "WITHDRAWN";

              return (
                <li key={application.id}>
                  <Card className="border-border/60 transition-colors hover:bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <UserAvatar
                            name={application.employerName}
                            imageUrl={application.employerLogoUrl}
                            size="md"
                            shape="rounded"
                            className="bg-primary/10 text-primary"
                          />

                          <div className="min-w-0">
                            <Link
                              to={PATHS.STUDENT.APPLICATION_DETAIL(application.id)}
                              className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                            >
                              {application.jobTitle}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {application.employerName} · Ứng tuyển{" "}
                              {new Date(application.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <StatusBadge
                            status={application.status}
                            label={APPLICATION_STATUS_LABELS[application.status]}
                          />

                          {canWithdraw && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setWithdrawTarget(application.id)}
                            >
                              <Undo2 className="size-4" />
                              Rút đơn
                            </Button>
                          )}

                          {canReapply && (
                            <Button
                              size="sm"
                              nativeButton={false}
                              render={
                                <Link to={PATHS.JOBS.APPLY(application.jobId)} />
                              }
                            >
                              <RefreshCw className="size-4" />
                              Ứng tuyển lại
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <Link
                                to={PATHS.STUDENT.APPLICATION_DETAIL(
                                  application.id
                                )}
                              />
                            }
                          >
                            Chi tiết
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={withdrawTarget !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawTarget(null);
        }}
        title="Rút đơn ứng tuyển?"
        description="Sau khi rút, nhà tuyển dụng sẽ không còn xem được hồ sơ của bạn. Bạn có thể ứng tuyển lại nếu tin tuyển dụng vẫn đang mở."
        confirmLabel="Rút đơn"
        destructive
        isPending={withdraw.isPending}
        onConfirm={handleWithdraw}
      />
    </DashboardLayout>
  );
}
