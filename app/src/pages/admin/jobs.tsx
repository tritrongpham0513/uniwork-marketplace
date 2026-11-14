import { useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Eye,
  FileText,
  FolderKanban,
  Search,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout, navItem } from "@/components/layout/dashboard-layout";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { useAdminJobs, useReviewJob } from "@/features/admin/hooks";
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobStatus,
} from "@/features/shared/types";
import { formatSalary, formatPostedAgo } from "@/features/jobs/lib/format";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";

const STATUS_FILTERS: Array<{ value: JobStatus | "ALL"; label: string }> = [
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "ALL", label: "Tất cả" },
  { value: "OPEN", label: "Đang tuyển" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "CLOSED", label: "Đã đóng" },
];

export default function AdminJobsPage() {
  const [status, setStatus] = useState<JobStatus | "ALL">("PENDING_REVIEW");
  const [keyword, setKeyword] = useState("");
  const [preview, setPreview] = useState<Job | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: jobs = [], isPending, isError, refetch } = useAdminJobs();
  const reviewJob = useReviewJob();

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return jobs.filter((job) => {
      if (status !== "ALL" && job.status !== status) return false;
      if (!query) return true;
      return (
        job.title.toLowerCase().includes(query) ||
        job.employer.name.toLowerCase().includes(query) ||
        job.category.name.toLowerCase().includes(query)
      );
    });
  }, [jobs, status, keyword]);

  const pendingCount = jobs.filter((job) => job.status === "PENDING_REVIEW").length;

  const handleApprove = async (job: Job) => {
    try {
      await reviewJob.mutateAsync({ id: job.id, action: "APPROVE" });
      toast.success("Đã duyệt tin tuyển dụng.", {
        description: `Tin "${job.title}" đã hiển thị công khai.`,
      });
    } catch (error) {
      showApiError(error);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await reviewJob.mutateAsync({
        id: rejectTarget.id,
        action: "REJECT",
        reason: rejectReason.trim() || undefined,
      });
      toast.success("Đã từ chối tin tuyển dụng.", {
        description: "Nhà tuyển dụng sẽ nhận được thông báo.",
      });
      setRejectTarget(null);
      setRejectReason("");
    } catch (error) {
      showApiError(error);
    }
  };

  const navItems = [
    navItem("Bảng điều khiển", PATHS.ADMIN.ROOT, FileText),
    navItem("Duyệt tin đăng", PATHS.ADMIN.JOBS, Briefcase, pendingCount),
    navItem("Danh mục", PATHS.ADMIN.CATEGORIES, FolderKanban),
    navItem("Người dùng", PATHS.ADMIN.USERS, Users),
    navItem("Kiểm duyệt đánh giá", PATHS.ADMIN.REVIEWS, Star),
  ];

  return (
    <DashboardLayout
      role="ADMIN"
      title="Duyệt tin tuyển dụng"
      description="Kiểm tra nội dung trước khi tin được hiển thị công khai."
      navItems={navItems}
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {pendingCount > 0
              ? `${pendingCount} tin đang chờ duyệt`
              : "Không có tin nào chờ duyệt"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tiêu đề, nhà tuyển dụng hoặc nhóm việc"
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value as JobStatus | "ALL")}
            items={STATUS_FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách tin tuyển dụng"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="search"
            title={
              status === "PENDING_REVIEW"
                ? "Không có tin nào chờ duyệt"
                : "Không tìm thấy tin tuyển dụng"
            }
            description={
              status === "PENDING_REVIEW"
                ? "Tất cả tin tuyển dụng đã được xử lý."
                : "Thử đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((job) => (
              <li key={job.id}>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{job.category.name}</Badge>
                          {job.position && (
                            <Badge variant="outline">{job.position.name}</Badge>
                          )}
                          <JobStatusBadge
                            status={job.status}
                            label={JOB_STATUS_LABELS[job.status]}
                          />
                        </div>

                        <p className="font-heading text-base font-semibold text-foreground">
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {job.employer.name} · {formatPostedAgo(job.postedAt)} ·{" "}
                          {job.location.district}, {job.location.province}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              Lương
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {formatSalary(job)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              Số suất
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {job.positionsCount} người
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              Ứng viên
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {job.applicantCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              Lượt xem
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {job.viewCount}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreview(job)}
                        >
                          <Eye className="size-4" />
                          Xem nội dung
                        </Button>

                        {job.status === "PENDING_REVIEW" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(job)}
                              disabled={reviewJob.isPending}
                            >
                              <CheckCircle2 className="size-4" />
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setRejectTarget(job);
                                setRejectReason("");
                              }}
                              disabled={reviewJob.isPending}
                            >
                              <XCircle className="size-4" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DIALOG XEM NỘI DUNG */}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.employer.name} · {preview?.category.name}
              {preview?.position && ` · ${preview.position.name}`}
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Lương
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {formatSalary(preview)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Số suất
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {preview.positionsCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Địa điểm
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {preview.location.district}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Ca làm
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {preview.schedules.length} ca
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 font-semibold text-foreground">
                  Mô tả công việc
                </p>
                <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                  {preview.description || "Không có mô tả."}
                </p>
              </div>

              {preview.requirements.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold text-foreground">
                    Yêu cầu ứng tuyển
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    {preview.requirements.map((item, index) => (
                      <li key={`${item}-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.benefits.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold text-foreground">
                    Quyền lợi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.benefits.map((item, index) => (
                      <Badge key={`${item}-${index}`} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {preview.schedules.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold text-foreground">
                    Ca làm việc
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    {preview.schedules.map((schedule, index) => (
                      <li key={`${schedule.dayOfWeek}-${index}`}>
                        • Thứ {schedule.dayOfWeek}: {schedule.startTime} –{" "}
                        {schedule.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="mb-1 font-semibold text-foreground">
                  Địa đỉa làm việc
                </p>
                <p className="text-muted-foreground">
                  {preview.location.branchName && (
                    <>
                      {preview.location.branchName} —{" "}
                    </>
                  )}
                  {preview.location.address}, {preview.location.district},{" "}
                  {preview.location.province}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Đóng
            </Button>
            {preview && preview.status === "PENDING_REVIEW" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setRejectTarget(preview);
                    setPreview(null);
                    setRejectReason("");
                  }}
                >
                  <XCircle className="size-4" />
                  Từ chối
                </Button>
                <Button
                  onClick={() => {
                    void handleApprove(preview);
                    setPreview(null);
                  }}
                  disabled={reviewJob.isPending}
                >
                  <CheckCircle2 className="size-4" />
                  Duyệt tin
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TỪ CHỐI */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối tin tuyển dụng</DialogTitle>
            <DialogDescription>
              Tin: {rejectTarget?.title}. Lý do sẽ được gửi tới nhà tuyển
              dụng.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            maxLength={300}
            placeholder="VD: Mức lương không khớp với thị trường, thông tin không đầy đủ..."
          />
          <p className="text-xs text-muted-foreground">
            {rejectReason.length}/300 ký tự
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={reviewJob.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reviewJob.isPending}
            >
              {reviewJob.isPending ? "Đang xử lý..." : "Từ chối tin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}