import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Eye,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { useDeleteJob, useEmployerJobs } from "@/features/employer/hooks";
import { JOB_STATUS_LABELS, type JobStatus } from "@/features/shared/types";
import { formatSalary } from "@/features/jobs/lib/format";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";

const STATUS_FILTERS: Array<{ value: JobStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "OPEN", label: "Đang tuyển" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "FILLED", label: "Đã nhận người" },
  { value: "CLOSED", label: "Đã đóng" },
];

export default function EmployerJobsPage() {
  const [status, setStatus] = useState<JobStatus | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: jobs = [], isPending, isError, refetch } = useEmployerJobs();
  const deleteJob = useDeleteJob();

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return jobs.filter((job) => {
      if (status !== "ALL" && job.status !== status) return false;
      if (!query) return true;
      return (
        job.title.toLowerCase().includes(query) ||
        job.category.name.toLowerCase().includes(query)
      );
    });
  }, [jobs, status, keyword]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJob.mutateAsync(deleteTarget);
      toast.success("Đã huỷ tin tuyển dụng.");
      setDeleteTarget(null);
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <DashboardLayout
      title="Tin tuyển dụng"
      description="Quản lý các tin đã đăng, theo dõi số ứng viên và cập nhật trạng thái."
      actions={
        <Button
          size="sm"
          nativeButton={false}
          render={<Link to={PATHS.EMPLOYER.JOB_NEW} />}
        >
          <Plus className="size-4" />
          Đăng tin mới
        </Button>
      }
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {jobs.length > 0
              ? `Bạn đã đăng ${jobs.length} tin tuyển dụng`
              : "Chưa có tin tuyển dụng nào"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tiêu đề tin hoặc nhóm việc"
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
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl bg-muted/60"
              />
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
              jobs.length === 0
                ? "Chưa có tin tuyển dụng nào"
                : "Không có tin tuyển dụng phù hợp"
            }
            description={
              jobs.length === 0
                ? "Đăng tin tuyển dụng đầu tiên để bắt đầu nhận hồ sơ ứng viên."
                : "Thử đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
            }
            action={
              jobs.length === 0 ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to={PATHS.EMPLOYER.JOB_NEW} />}
                >
                  <Plus className="size-4" />
                  Đăng tin mới
                </Button>
              ) : undefined
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-64">Tiêu đề tin</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-center">Ứng viên</TableHead>
                      <TableHead className="text-center">Suất tuyển</TableHead>
                      <TableHead>Lương</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {visible.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            to={PATHS.EMPLOYER.JOB_EDIT(job.id)}
                            className="block"
                          >
                            <p className="font-medium text-foreground transition-colors hover:text-primary">
                              {job.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {job.category.name}
                              {job.position && ` · ${job.position.name}`}
                            </p>
                            {!job.previewImageUrl && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
                                <ImageIcon className="size-3" />
                                Chưa có ảnh preview
                              </p>
                            )}
                          </Link>
                        </TableCell>

                        <TableCell>
                          <JobStatusBadge
                            status={job.status}
                            label={JOB_STATUS_LABELS[job.status]}
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                            <Users className="size-3.5 text-muted-foreground" />
                            {job.applicantCount}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="text-sm tabular-nums">
                            {job.positionsFilled}/{job.positionsCount}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm font-medium text-primary">
                            {formatSalary(job)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Xem tin"
                              nativeButton={false}
                              render={<Link to={PATHS.JOBS.DETAIL(job.id)} />}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Sửa tin"
                              nativeButton={false}
                              render={
                                <Link to={PATHS.EMPLOYER.JOB_EDIT(job.id)} />
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Xoá tin"
                              onClick={() => setDeleteTarget(job.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {visible.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {visible.length} tin
          </Badge>
          Tin mới sẽ ở trạng thái "Chờ duyệt" cho tới khi quản trị viên duyệt.
        </p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Huỷ tin tuyển dụng?"
        description="Tin tuyển dụng sẽ bị gỡ khỏi trang tìm việc. Các ứng viên đã ứng tuyển vẫn có thể xem lại hồ sơ."
        confirmLabel="Huỷ tin"
        destructive
        isPending={deleteJob.isPending}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
