import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Search, Sparkles, XCircle } from "lucide-react";
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
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import {
  useAdminJobs,
  useAdminSalaryBenchmarks,
  useAiFeatureStatus,
  useAiReviewJob,
  useEmployerTrust,
  useReviewJob,
} from "@/features/admin/hooks";
import { AiReviewBadge } from "@/features/admin/components/ai-review-badge";
import { AiReviewPanel } from "@/features/admin/components/ai-review-panel";
import { JobTrustInfo } from "@/features/admin/components/job-trust-info";
import { sortJobsByAiSeverity } from "@/features/admin/lib/ai-review";
import { compareSalary, findBenchmarkFor } from "@/features/shared/lib/salary";
import {
  JOB_STATUS_LABELS,
  type AdminJob,
  type AiReview,
  type JobStatus,
  type SalaryComparison,
} from "@/features/shared/types";
import { formatSalary, formatPostedAgo } from "@/features/jobs/lib/format";

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
  const [preview, setPreview] = useState<AdminJob | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminJob | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  /**
   * Kết quả kiểm tra AI trả về ngay trong phiên xem nội dung.
   *
   * <p>Tách riêng khỏi dữ liệu trong `preview` vì endpoint kiểm tra thủ công
   * trả kết quả mới, còn list thì chỉ refresh sau khi invalidate.
   */
  const [manualReview, setManualReview] = useState<AiReview | null>(null);
  /** Đã bấm "Kiểm tra bằng AI" trong phiên xem nội dung hiện tại. */
  const [hasManualCheck, setHasManualCheck] = useState(false);
  /**
   * Lần kiểm tra AI vừa rồi thất bại.
   *
   * <p>Khi đúng, khối "Đánh giá của AI" hiện "chưa kiểm tra" thay vì lỗi kỹ
   * thuật (ticket 07). Lỗi AI là vấn đề của hệ thống — không phải thông báo
   * lỗi cho người dùng.
   */
  const [hasAiFailed, setHasAiFailed] = useState(false);

  const { data: jobs = [], isPending, isError, refetch } = useAdminJobs();
  const reviewJob = useReviewJob();
  const aiReviewJob = useAiReviewJob();
  const { data: aiStatus } = useAiFeatureStatus();
  const { data: benchmarks = [] } = useAdminSalaryBenchmarks();
  // Chỉ tải hồ sơ của nhà tuyển dụng đang xem trong dialog — tránh gọi
  // N request cho cả danh sách.
  const { data: employerTrust } = useEmployerTrust(preview?.employer.id);

  // Backend tự ẩn tính năng khi thiếu khoá API -> nút phải biến mất,
  // không phải hiện rồi báo lỗi khi bấm.
  const isAiEnabled = aiStatus?.enabled === true;

  /**
   * So lương từng tin với bảng xếp hạng lương của ngành + tỉnh.
   *
   * <p>Tính 1 lần cho cả danh sách vì bảng xếp hạng là 1 request chung.
   */
  const comparisons = useMemo(() => {
    const map = new Map<string, SalaryComparison | null>();

    for (const job of jobs) {
      const benchmark = findBenchmarkFor(
        benchmarks,
        job.category.id,
        job.location.provinceId
      );
      map.set(job.id, compareSalary(job, benchmark));
    }

    return map;
  }, [jobs, benchmarks]);

  /**
   * Kết quả AI đã lưu trên bản ghi tin tuyển dụng.
   *
   * <p>Dùng khi quản trị viên mở dialog mà chưa bấm kiểm tra thủ công —
   * `manualReview` (kết quả vừa gọi) được ưu tiên hơn.
   */
  const previewAiReview = useMemo<AiReview | null>(() => {
    if (!preview || !preview.aiVerdict) return null;

    return {
      verdict: preview.aiVerdict,
      summary: preview.aiSummary ?? "",
      reasons: preview.aiReasons ?? [],
      aiCheckedAt: preview.aiCheckedAt ?? "",
    };
  }, [preview]);

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filtered = jobs.filter((job) => {
      if (status !== "ALL" && job.status !== status) return false;
      if (!query) return true;
      return (
        job.title.toLowerCase().includes(query) ||
        job.employer.name.toLowerCase().includes(query) ||
        job.category.name.toLowerCase().includes(query)
      );
    });

    // Tin bị gắn cờ nổi lên đầu — quản trị viên soi tin đáng ngờ trước.
    return sortJobsByAiSeverity(filtered);
  }, [jobs, status, keyword]);

  const pendingCount = jobs.filter(
    (job) => job.status === "PENDING_REVIEW"
  ).length;

  const handleApprove = async (job: AdminJob) => {
    try {
      await reviewJob.mutateAsync({ id: job.id, action: "APPROVE" });
      toast.success("Đã duyệt tin tuyển dụng.", {
        description: `Tin "${job.title}" đã hiển thị công khai.`,
      });
    } catch (error) {
      showApiError(error);
    }
  };

  /** Mở dialog xem nội dung — reset kết quả kiểm tra AI của tin trước đó. */
  const handleOpenPreview = (job: AdminJob) => {
    setPreview(job);
    setManualReview(null);
    setHasManualCheck(false);
    setHasAiFailed(false);
  };

  /**
   * Kiểm tra thủ công 1 tin bằng AI.
   *
   * <p>Dùng được cho cả tin chưa kiểm tra lẫn tin đã có kết quả (kiểm tra
   * lại) — mỗi lần bấm là một lượt AI.
   */
  const handleAiCheck = async (job: AdminJob) => {
    try {
      const review = await aiReviewJob.mutateAsync(job.id);
      setManualReview(review);
      setHasManualCheck(true);
      setHasAiFailed(false);
      toast.success("Đã kiểm tra tin tuyển dụng bằng AI.");
    } catch {
      // KHÔNG hiện lỗi kỹ thuật cho quản trị viên. Khối "Đánh giá của AI"
      // sẽ hiện "chưa kiểm tra" — tin vẫn được duyệt / từ chối bình thường.
      setHasManualCheck(true);
      setHasAiFailed(true);
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

  return (
    <DashboardLayout
      title="Duyệt tin tuyển dụng"
      description="Kiểm tra nội dung trước khi tin được hiển thị công khai."
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
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl bg-muted/60"
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
                          <AiReviewBadge verdict={job.aiVerdict} />
                        </div>

                        <p className="font-heading text-base font-semibold text-foreground">
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {job.employer.name} · {formatPostedAgo(job.postedAt)}{" "}
                          · {job.location.ward || job.location.district},{" "}
                          {job.location.province}
                        </p>

                        {job.aiCheckedAt && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            AI đã kiểm tra lúc{" "}
                            {new Date(job.aiCheckedAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}

                        <JobTrustInfo
                          comparison={comparisons.get(job.id) ?? null}
                          verified={job.employer.verified}
                        />

                        <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
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
                          onClick={() => handleOpenPreview(job)}
                        >
                          <Eye className="size-4" />
                          Xem nội dung
                        </Button>

                        {/* Nút này chỉ hiện khi backend báo tính năng đang bật
                            (tức là có khoá API). Mỗi lần bấm là 1 lượt AI. */}
                        {isAiEnabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Mỗi lần kiểm tra sẽ dùng 1 lượt AI."
                            onClick={() => void handleAiCheck(job)}
                            disabled={aiReviewJob.isPending}
                          >
                            <Sparkles className="size-4" />
                            {aiReviewJob.isPending
                              ? "Đang kiểm tra..."
                              : "Kiểm tra bằng AI"}
                          </Button>
                        )}

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
                    {preview.location.ward || preview.location.district}
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
                    <>{preview.location.branchName} — </>
                  )}
                  {preview.location.address},{" "}
                  {preview.location.ward || preview.location.district},{" "}
                  {preview.location.province}
                </p>
              </div>

              {/* Điểm uy tín + mức lương so với thị trường — cùng dữ liệu mà
                  AI dùng để suy luận, để quản trị viên tự đối chiếu. */}
              <JobTrustInfo
                comparison={comparisons.get(preview.id) ?? null}
                trust={employerTrust}
                verified={preview.employer.verified}
              />

              {/* Đánh giá của AI đặt SAU nội dung tin — quản trị viên đọc
                  nội dung thật trước rồi mới đối chiếu với góp ý AI. */}
              <AiReviewPanel
                review={manualReview ?? previewAiReview}
                checkedAt={
                  manualReview?.aiCheckedAt ?? preview.aiCheckedAt ?? null
                }
                isChecking={aiReviewJob.isPending}
                hasChecked={hasManualCheck}
                hasFailed={hasAiFailed}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Đóng
            </Button>

            {/* Ẩn hoàn toàn khi backend tắt tính năng (thiếu khoá API). */}
            {isAiEnabled && preview && (
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="outline"
                  onClick={() => void handleAiCheck(preview)}
                  disabled={aiReviewJob.isPending}
                >
                  <Sparkles className="size-4" />
                  {aiReviewJob.isPending
                    ? "Đang kiểm tra..."
                    : "Kiểm tra bằng AI"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Mỗi lần kiểm tra sẽ dùng 1 lượt AI.
                </p>
              </div>
            )}

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
              Tin: {rejectTarget?.title}. Lý do sẽ được gửi tới nhà tuyển dụng.
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
