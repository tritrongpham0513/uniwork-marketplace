import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  Eye,
  FileText,
  MoreHorizontal,
  Search,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CvViewer, PDF_MIME_TYPE } from "@/components/shared/cv-viewer";
import {
  useEmployerApplications,
  useUpdateApplicationStatus,
} from "@/features/applications/hooks";
import { useEmployerJobs } from "@/features/employer/hooks";
import {
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { formatPostedAgo } from "@/features/jobs/lib/format";
import { formatDateVi } from "@/lib/date";
import { showApiError, toast } from "@/lib/toast";

const STATUS_FILTERS: Array<{
  value: ApplicationStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "SHORTLISTED", label: "Duyệt sơ bộ" },
  { value: "ACCEPTED", label: "Đã nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "REJECTED", label: "Không phù hợp" },
];

export default function EmployerApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [jobId, setJobId] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  /** Ứng viên đang mở CV xem nhanh (modal). */
  const [cvTarget, setCvTarget] = useState<Application | null>(null);

  const {
    data: applications = [],
    isPending,
    isError,
    refetch,
  } = useEmployerApplications();
  const { data: jobs = [] } = useEmployerJobs();
  const updateStatus = useUpdateApplicationStatus();

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return applications.filter((application) => {
      if (status !== "ALL" && application.status !== status) return false;
      if (jobId !== "ALL" && application.jobId !== jobId) return false;
      if (!query) return true;
      return (
        application.studentName.toLowerCase().includes(query) ||
        application.jobTitle.toLowerCase().includes(query)
      );
    });
  }, [applications, status, jobId, keyword]);

  const handleStatus = async (
    id: string,
    nextStatus: ApplicationStatus,
    note?: string
  ) => {
    try {
      await updateStatus.mutateAsync({ id, status: nextStatus, note });
      toast.success(
        nextStatus === "SHORTLISTED"
          ? "Đã duyệt sơ bộ ứng viên."
          : nextStatus === "ACCEPTED"
            ? "Đã nhận ứng viên."
            : nextStatus === "COMPLETED"
              ? "Đã đánh dấu hoàn thành công việc."
              : "Đã từ chối ứng viên.",
        { description: "Ứng viên đã nhận được thông báo về thay đổi này." }
      );
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <DashboardLayout
      title="Ứng viên"
      description="Duyệt hồ sơ, phỏng vấn và cập nhật trạng thái ứng tuyển."
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {applications.length > 0
              ? `Tổng cộng ${applications.length} hồ sơ ứng tuyển`
              : "Chưa có ứng viên nào"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo tên ứng viên hoặc vị trí"
                className="pl-9"
              />
            </div>

            <Select
              value={jobId}
              onValueChange={(value) => value && setJobId(value)}
              items={[
                { value: "ALL", label: "Tất cả tin tuyển dụng" },
                ...jobs.map((job) => ({
                  value: job.id,
                  label: job.title,
                })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả tin tuyển dụng</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={status}
            onValueChange={(value) =>
              setStatus(value as ApplicationStatus | "ALL")
            }
          >
            <TabsList className="flex w-full scrollbar-thin flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl p-1 group-data-horizontal/tabs:h-auto">
              {STATUS_FILTERS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-8 flex-none"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-muted/60"
              />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách ứng viên"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="inbox"
            title={
              applications.length === 0
                ? "Chưa có ứng viên nào"
                : "Không có ứng viên phù hợp"
            }
            description={
              applications.length === 0
                ? "Ứng viên sẽ xuất hiện ở đây khi họ ứng tuyển vào tin của bạn."
                : "Thử đổi bộ lọc để xem thêm kết quả."
            }
            action={
              applications.length === 0 ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to={PATHS.EMPLOYER.JOB_NEW} />}
                >
                  Đăng tin tuyển dụng
                </Button>
              ) : undefined
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((application) => (
              <li key={application.id}>
                <Card className="border-border/60 transition-colors hover:bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <UserAvatar
                          name={application.studentName}
                          imageUrl={application.studentAvatarUrl}
                          size="md"
                          className="bg-primary/10 text-primary"
                        />

                        <div className="min-w-0">
                          <Link
                            to={PATHS.EMPLOYER.APPLICATION_DETAIL(
                              application.id
                            )}
                            className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {application.studentName}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {application.studentUniversity} ·{" "}
                            {application.studentMajor}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            Ứng tuyển: {application.jobTitle} ·{" "}
                            {formatPostedAgo(application.createdAt)}
                          </p>
                          {application.experience && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Kinh nghiệm: {application.experience}
                            </p>
                          )}
                          {application.availableFrom && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Bắt đầu: {formatDateVi(application.availableFrom)}
                            </p>
                          )}
                          {(application.studentAddress ||
                            application.studentProvince) && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Nơi sinh sống:{" "}
                              {[
                                application.studentAddress,
                                application.studentProvince,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {application.expectedSalary !== null &&
                          application.expectedSalary > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Mong muốn:{" "}
                              <span className="font-semibold text-foreground">
                                {application.expectedSalary.toLocaleString(
                                  "vi-VN"
                                )}
                                {application.expectedSalary > 100000
                                  ? "đ/tháng"
                                  : "đ/giờ"}
                              </span>
                            </span>
                          )}

                        <StatusBadge
                          status={application.status}
                          label={APPLICATION_STATUS_LABELS[application.status]}
                        />

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Thao tác"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="w-52 min-w-0"
                          >
                            <DropdownMenuItem
                              render={
                                <Link
                                  to={PATHS.EMPLOYER.APPLICATION_DETAIL(
                                    application.id
                                  )}
                                />
                              }
                              className="cursor-pointer"
                            >
                              <Eye />
                              Xem hồ sơ
                            </DropdownMenuItem>

                            {application.cvUrl &&
                              application.cvMimeType === PDF_MIME_TYPE && (
                                <DropdownMenuItem
                                  onClick={() => setCvTarget(application)}
                                  className="cursor-pointer"
                                >
                                  <FileText />
                                  Xem CV
                                </DropdownMenuItem>
                              )}

                            {(application.status === "PENDING" ||
                              application.status === "SHORTLISTED" ||
                              application.status === "ACCEPTED") && (
                              <>
                                <DropdownMenuSeparator />

                                {application.status === "PENDING" && (
                                  <DropdownMenuItem
                                    disabled={updateStatus.isPending}
                                    onClick={() =>
                                      handleStatus(
                                        application.id,
                                        "SHORTLISTED",
                                        "Hồ sơ phù hợp, đã duyệt sơ bộ"
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <ThumbsUp />
                                    Duyệt sơ bộ
                                  </DropdownMenuItem>
                                )}

                                {application.status === "SHORTLISTED" && (
                                  <DropdownMenuItem
                                    disabled={updateStatus.isPending}
                                    onClick={() =>
                                      handleStatus(
                                        application.id,
                                        "ACCEPTED",
                                        "Đã nhận ứng viên"
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle2 />
                                    Nhận ứng viên
                                  </DropdownMenuItem>
                                )}

                                {application.status === "ACCEPTED" && (
                                  <DropdownMenuItem
                                    disabled={updateStatus.isPending}
                                    onClick={() =>
                                      handleStatus(
                                        application.id,
                                        "COMPLETED",
                                        "Công việc đã hoàn thành"
                                      )
                                    }
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle2 />
                                    Đánh dấu hoàn thành
                                  </DropdownMenuItem>
                                )}

                                {(application.status === "PENDING" ||
                                  application.status === "SHORTLISTED") && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={updateStatus.isPending}
                                      onClick={() => {
                                        setRejectTarget(application);
                                        setRejectReason("");
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <ThumbsDown />
                                      Từ chối
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DIALOG TỪ CHỐI ỨNG VIÊN */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối ứng viên</DialogTitle>
            <DialogDescription>
              Ứng viên: {rejectTarget?.studentName} — vị trí{" "}
              {rejectTarget?.jobTitle}. Lý do sẽ được gửi tới ứng viên, vui lòng
              nhập rõ ràng.
            </DialogDescription>
          </DialogHeader>

          <Field className="gap-1.5">
            <FieldLabel htmlFor="reject-reason" className="text-xs font-medium">
              Lý do từ chối <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ví dụ: Hồ sơ chưa phù hợp với yêu cầu về kinh nghiệm..."
            />
            <span className="text-xs text-muted-foreground">
              {rejectReason.length}/500
            </span>
          </Field>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => {
                if (!rejectTarget) return;
                if (!rejectReason.trim()) {
                  toast.warning("Vui lòng nhập lý do từ chối.");
                  return;
                }
                void handleStatus(
                  rejectTarget.id,
                  "REJECTED",
                  rejectReason.trim()
                ).finally(() => {
                  setRejectTarget(null);
                  setRejectReason("");
                });
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL XEM CV NHANH — mở từ danh sách ứng viên */}
      <Dialog
        open={cvTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCvTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>CV — {cvTarget?.studentName}</DialogTitle>
            <DialogDescription>
              {cvTarget?.jobTitle} · {cvTarget?.cvFileName || "CV ứng viên"}
            </DialogDescription>
          </DialogHeader>

          {cvTarget?.cvUrl && (
            <CvViewer
              url={cvTarget.cvUrl}
              fileName={cvTarget.cvFileName}
              mimeType={cvTarget.cvMimeType}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
