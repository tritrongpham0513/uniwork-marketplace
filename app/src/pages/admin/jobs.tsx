import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { JobImageLightbox } from "@/components/shared/job-image-lightbox";
import { AdminJobsTable } from "@/features/admin/components/admin-jobs-table";
import { JobReviewDialog } from "@/features/admin/components/job-review-dialog";
import {
  useAdminJobs,
  useAdminSalaryBenchmarks,
  useAiFeatureStatus,
  useAiReviewJob,
  useEmployerTrust,
  useReviewJob,
} from "@/features/admin/hooks";
import {
  buildRejectSuggestions,
  countJobsByAiSignal,
  filterAdminJobs,
  type AiSignalFilter,
} from "@/features/admin/lib/ai-review";
import { formatPostedAgo, formatSalary } from "@/features/jobs/lib/format";
import { compareSalary, findBenchmarkFor } from "@/features/shared/lib/salary";
import type {
  AdminJob,
  AiReview,
  JobStatus,
  SalaryComparison,
} from "@/features/shared/types";
import { showApiError, toast } from "@/lib/toast";
import { cn } from "cn";

const STATUS_TABS: Array<{ value: JobStatus | "ALL"; label: string }> = [
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "ALL", label: "Tất cả" },
];

export default function AdminJobsPage() {
  const [status, setStatus] = useState<JobStatus | "ALL">("PENDING_REVIEW");
  const [aiFilter, setAiFilter] = useState<AiSignalFilter>("ALL");
  const [keyword, setKeyword] = useState("");
  const [preview, setPreview] = useState<AdminJob | null>(null);

  /** Hộp thoại phóng to ảnh preview trong màn duyệt. */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminJob | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  /**
   * Kết quả kiểm tra AI trả về ngay trong phiên xem nội dung.
   *
   * <p>Tách riêng khỏi dữ liệu trong `preview` vì endpoint kiểm tra thủ công
   * trả kết quả mới, còn list thì chỉ refresh sau khi invalidate.
   */
  const [manualReview, setManualReview] = useState<AiReview | null>(null);
  const [hasManualCheck, setHasManualCheck] = useState(false);
  const [hasAiFailed, setHasAiFailed] = useState(false);
  /** Id của tin đang chạy kiểm tra AI để chỉ hiển thị trạng thái bận trên đúng dòng đó. */
  const [checkingJobId, setCheckingJobId] = useState<string | null>(null);

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

  const statusCounts = useMemo(() => {
    const counts: Record<JobStatus | "ALL", number> = {
      ALL: jobs.length,
      DRAFT: 0,
      PENDING_REVIEW: 0,
      OPEN: 0,
      FILLED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };

    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }

    return counts;
  }, [jobs]);

  const jobsInSelectedStatus = useMemo(
    () =>
      status === "ALL" ? jobs : jobs.filter((job) => job.status === status),
    [jobs, status]
  );

  const aiCounts = useMemo(
    () => countJobsByAiSignal(jobsInSelectedStatus),
    [jobsInSelectedStatus]
  );

  const visible = useMemo(
    () => filterAdminJobs(jobs, { status, aiFilter, keyword }),
    [jobs, status, aiFilter, keyword]
  );

  const previewAiReview = useMemo<AiReview | null>(() => {
    if (!preview || !preview.aiVerdict) return null;

    return {
      verdict: preview.aiVerdict,
      summary: preview.aiSummary ?? "",
      reasons: preview.aiReasons ?? [],
      aiCheckedAt: preview.aiCheckedAt ?? "",
    };
  }, [preview]);

  const rejectSuggestions = useMemo(
    () => buildRejectSuggestions(rejectTarget?.aiReasons),
    [rejectTarget]
  );

  const handleApprove = async (job: AdminJob) => {
    try {
      await reviewJob.mutateAsync({ id: job.id, action: "APPROVE" });
      toast.success("Đã duyệt tin tuyển dụng.", {
        description: `Tin "${job.title}" đã hiển thị công khai.`,
      });
      if (preview?.id === job.id) {
        setPreview(null);
      }
    } catch (error) {
      showApiError(error);
    }
  };

  const handleOpenPreview = (job: AdminJob) => {
    setPreview(job);
    setManualReview(null);
    setHasManualCheck(false);
    setHasAiFailed(false);
  };

  const handleAiCheck = async (job: AdminJob) => {
    setCheckingJobId(job.id);
    try {
      const review = await aiReviewJob.mutateAsync(job.id);
      if (preview?.id === job.id) {
        setManualReview(review);
        setHasManualCheck(true);
        setHasAiFailed(false);
      }
      toast.success("Đã kiểm tra tin tuyển dụng bằng AI.");
    } catch {
      // KHÔNG hiện lỗi kỹ thuật cho quản trị viên. Khối "Đánh giá của AI"
      // sẽ hiện "chưa kiểm tra" — tin vẫn được duyệt / từ chối bình thường.
      if (preview?.id === job.id) {
        setHasManualCheck(true);
        setHasAiFailed(true);
      }
    } finally {
      setCheckingJobId(null);
    }
  };

  const openRejectDialog = (job: AdminJob) => {
    setRejectTarget(job);
    setRejectReason("");
    setPreview(null);
  };

  const handleAppendRejectTemplate = (template: string) => {
    setRejectReason((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return template.slice(0, 300);
      if (trimmed.includes(template)) return prev;
      return `${trimmed}\n${template}`.slice(0, 300);
    });
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

  const aiFilterOptions: Array<{
    value: AiSignalFilter;
    label: string;
    count: number;
    highlight?: boolean;
  }> = [
    { value: "ALL", label: "Tất cả", count: aiCounts.all },
    {
      value: "FLAGGED",
      label: "AI gắn cờ",
      count: aiCounts.flagged,
      highlight: aiCounts.flagged > 0,
    },
    { value: "OK", label: "Ổn", count: aiCounts.ok },
    {
      value: "NOT_CHECKED",
      label: "Chưa kiểm tra",
      count: aiCounts.notChecked,
    },
  ];

  const activeReview = manualReview ?? previewAiReview;
  const activeCheckedAt =
    manualReview?.aiCheckedAt ?? preview?.aiCheckedAt ?? null;

  return (
    <DashboardLayout
      title="Duyệt tin tuyển dụng"
      description="Ưu tiên rà soát các tin có tín hiệu cảnh báo từ AI trước khi hiển thị công khai."
    >
      {/* TAB TRẠNG THÁI + BỘ ĐẾM */}
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as JobStatus | "ALL");
          setAiFilter("ALL");
        }}
        className="gap-4"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-2xl p-1">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.value] ?? 0;
              const isPendingHighlight =
                tab.value === "PENDING_REVIEW" && count > 0;

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="py-1.5"
                >
                  <span>{tab.label}</span>
                  <Badge
                    variant={isPendingHighlight ? "default" : "secondary"}
                    className={cn(
                      "h-5 min-w-5 px-1.5 text-[11px] tabular-nums",
                      isPendingHighlight &&
                        "bg-amber-500 text-white hover:bg-amber-500"
                    )}
                  >
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* THANH LỌC TÍN HIỆU AI + TÌM KIẾM */}
        <Card className="border-border/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Tín hiệu AI:
              </span>
              {aiFilterOptions.map((option) => {
                const isSelected = aiFilter === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setAiFilter(option.value)}
                    className="h-8 gap-1.5 rounded-full px-3 text-xs"
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : option.highlight
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {option.count}
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo tiêu đề, nhà tuyển dụng, nhóm việc hoặc vị trí"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      </Tabs>

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
            title="Không tải được danh sách tin tuyển dụng"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="search"
            title={
              status === "PENDING_REVIEW" &&
              aiFilter === "ALL" &&
              !keyword.trim()
                ? "Không có tin nào chờ duyệt"
                : "Không tìm thấy tin tuyển dụng"
            }
            description={
              status === "PENDING_REVIEW" &&
              aiFilter === "ALL" &&
              !keyword.trim()
                ? "Tất cả tin tuyển dụng đã được xử lý."
                : "Thử đổi bộ lọc tín hiệu AI hoặc tìm kiếm với từ khoá khác."
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <AdminJobsTable
            jobs={visible}
            comparisons={comparisons}
            showStatusBadge={status === "ALL"}
            isAiEnabled={isAiEnabled}
            checkingJobId={checkingJobId}
            isReviewSubmitting={reviewJob.isPending}
            formatSalary={formatSalary}
            formatPostedAgo={formatPostedAgo}
            onInspect={handleOpenPreview}
            onAiCheck={(job) => void handleAiCheck(job)}
            onApprove={(job) => void handleApprove(job)}
            onRequestReject={openRejectDialog}
          />
        )}
      </div>

      <JobReviewDialog
        job={preview}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        comparison={preview ? (comparisons.get(preview.id) ?? null) : null}
        employerTrust={employerTrust}
        isAiEnabled={isAiEnabled}
        activeReview={activeReview}
        checkedAt={activeCheckedAt}
        isCheckingAi={
          preview !== null &&
          checkingJobId === preview.id &&
          aiReviewJob.isPending
        }
        hasManualCheck={hasManualCheck}
        hasAiFailed={hasAiFailed}
        isReviewSubmitting={reviewJob.isPending}
        formatSalary={formatSalary}
        formatPostedAgo={formatPostedAgo}
        onAiCheck={(job) => void handleAiCheck(job)}
        onApprove={(job) => void handleApprove(job)}
        onRequestReject={openRejectDialog}
        onOpenLightbox={() => setLightboxOpen(true)}
      />

      {preview?.previewImageUrl && (
        <JobImageLightbox
          src={preview.previewImageUrl}
          alt={preview.title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}

      {/* DIALOG TỪ CHỐI CÓ GỢI Ý NHANH */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Từ chối tin tuyển dụng</DialogTitle>
            <DialogDescription>
              Tin: {rejectTarget?.title}. Lý do sẽ được gửi tới nhà tuyển dụng.
            </DialogDescription>
          </DialogHeader>

          {rejectSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Chèn nhanh lý do gợi ý:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rejectSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.code}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 rounded-full px-2.5 text-xs"
                    onClick={() =>
                      handleAppendRejectTemplate(suggestion.template)
                    }
                  >
                    <Plus className="size-3" />
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
