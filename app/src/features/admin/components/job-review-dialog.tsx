import {
  CheckCircle2,
  Highlighter,
  Sparkles,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { AiReviewBadge } from "@/features/admin/components/ai-review-badge";
import { AiReviewPanel } from "@/features/admin/components/ai-review-panel";
import { HighlightedText } from "@/features/admin/components/highlighted-text";
import { JobTrustInfo } from "@/features/admin/components/job-trust-info";
import {
  JOB_STATUS_LABELS,
  type AdminJob,
  type AiReview,
  type EmployerProfile,
  type SalaryComparison,
} from "@/features/shared/types";

interface JobReviewDialogProps {
  job: AdminJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: SalaryComparison | null;
  employerTrust?: EmployerProfile;
  isAiEnabled: boolean;
  activeReview: AiReview | null;
  checkedAt: string | null;
  isCheckingAi: boolean;
  hasManualCheck: boolean;
  hasAiFailed: boolean;
  isReviewSubmitting: boolean;
  formatSalary: (job: AdminJob) => string;
  formatPostedAgo: (postedAt: string) => string;
  onAiCheck: (job: AdminJob) => void;
  onApprove: (job: AdminJob) => void;
  onRequestReject: (job: AdminJob) => void;
  onOpenLightbox: () => void;
}

/**
 * Hộp thoại duyệt tin 2 cột (Split View):
 * - Cột trái: nội dung tin tuyển dụng, tự động tô sáng các câu AI trích dẫn.
 * - Cột phải: đối chiếu lương/uy tín + đánh giá AI + nút quyết định.
 *
 * <p>Thiết kế để quản trị viên đọc tin và đối chiếu bằng chứng nguyên văn
 * ngang tầm mắt mà không phải cuộn lên xuống.
 */
export function JobReviewDialog({
  job,
  open,
  onOpenChange,
  comparison,
  employerTrust,
  isAiEnabled,
  activeReview,
  checkedAt,
  isCheckingAi,
  hasManualCheck,
  hasAiFailed,
  isReviewSubmitting,
  formatSalary,
  formatPostedAgo,
  onAiCheck,
  onApprove,
  onRequestReject,
  onOpenLightbox,
}: JobReviewDialogProps) {
  const evidences =
    activeReview?.reasons
      .map((reason) => reason.evidence)
      .filter((item) => item.trim().length > 0) ?? [];

  const verdict = activeReview?.verdict ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4 pr-14">
          {job && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{job.category.name}</Badge>
              {job.position && (
                <Badge variant="outline">{job.position.name}</Badge>
              )}
              <JobStatusBadge
                status={job.status}
                label={JOB_STATUS_LABELS[job.status]}
              />
              <AiReviewBadge verdict={verdict} />
            </div>
          )}
          <DialogTitle className="text-lg">
            {job ? (
              <HighlightedText
                text={job.title}
                evidences={evidences}
                verdict={verdict}
              />
            ) : (
              ""
            )}
          </DialogTitle>
          {job && (
            <DialogDescription>
              {job.employer.name} · Đăng {formatPostedAgo(job.postedAt)} ·{" "}
              {job.location.ward || job.location.district},{" "}
              {job.location.province}
            </DialogDescription>
          )}
        </DialogHeader>

        {job && (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1.25fr_0.95fr] lg:overflow-hidden">
            {/* CỘT TRÁI: NỘI DUNG TIN TUYỂN DỤNG */}
            <div className="space-y-5 p-6 lg:overflow-y-auto lg:border-r lg:border-border/60">
              {evidences.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Highlighter className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Đã tô sáng{" "}
                    <strong className="font-semibold text-foreground">
                      {evidences.length}
                    </strong>{" "}
                    đoạn nội dung được AI trích dẫn làm bằng chứng để bạn đối
                    chiếu nhanh.
                  </span>
                </div>
              )}

              {job.previewImageUrl && (
                <button
                  type="button"
                  className="group relative block w-full overflow-hidden rounded-lg border border-border"
                  onClick={onOpenLightbox}
                  aria-label="Xem ảnh preview"
                >
                  <img
                    src={job.previewImageUrl}
                    alt={job.title}
                    loading="lazy"
                    className="max-h-60 w-full bg-muted/30 object-contain transition-transform group-hover:scale-[1.02]"
                  />
                  <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm">
                    <ZoomIn className="size-3.5" />
                    Phóng to
                  </span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
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
                    Địa điểm
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {job.location.ward || job.location.district}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Ca làm
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {job.schedules.length} ca
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-foreground">
                  Mô tả công việc
                </p>
                {job.description ? (
                  <HighlightedText
                    text={job.description}
                    evidences={evidences}
                    verdict={verdict}
                    className="block text-sm leading-relaxed whitespace-pre-line text-muted-foreground"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Không có mô tả.
                  </p>
                )}
              </div>

              {job.requirements.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">
                    Yêu cầu ứng tuyển
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {job.requirements.map((item, index) => (
                      <li key={`${item}-${index}`}>
                        •{" "}
                        <HighlightedText
                          text={item}
                          evidences={evidences}
                          verdict={verdict}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.benefits.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">
                    Quyền lợi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.benefits.map((item, index) => (
                      <Badge key={`${item}-${index}`} variant="secondary">
                        <HighlightedText
                          text={item}
                          evidences={evidences}
                          verdict={verdict}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {job.schedules.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">
                    Ca làm việc
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {job.schedules.map((schedule, index) => (
                      <li key={`${schedule.dayOfWeek}-${index}`}>
                        • Thứ {schedule.dayOfWeek}: {schedule.startTime} –{" "}
                        {schedule.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-semibold text-foreground">
                  Địa điểm làm việc
                </p>
                <p className="text-muted-foreground">
                  {job.location.branchName && <>{job.location.branchName} — </>}
                  {job.location.address},{" "}
                  {job.location.ward || job.location.district},{" "}
                  {job.location.province}
                </p>
              </div>
            </div>

            {/* CỘT PHẢI: ĐỐI CHIẾU THỊ TRƯỜNG & ĐÁNH GIÁ AI */}
            <div className="flex flex-col gap-4 bg-muted/20 p-6 lg:overflow-y-auto">
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-sm font-semibold text-foreground">
                  Đối chiếu thị trường &amp; uy tín
                </p>
                <JobTrustInfo
                  comparison={comparison}
                  trust={employerTrust}
                  verified={job.employer.verified}
                />
              </div>

              <div className="rounded-lg bg-background">
                <AiReviewPanel
                  review={activeReview}
                  checkedAt={checkedAt}
                  isChecking={isCheckingAi}
                  hasChecked={hasManualCheck}
                  hasFailed={hasAiFailed}
                />
              </div>

              {/* Ẩn hoàn toàn khi backend tắt tính năng (thiếu khoá API). */}
              {isAiEnabled && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background p-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onAiCheck(job)}
                    disabled={isCheckingAi}
                  >
                    <Sparkles className="size-4" />
                    {isCheckingAi
                      ? "Đang kiểm tra..."
                      : activeReview
                        ? "Kiểm tra lại bằng AI"
                        : "Kiểm tra bằng AI"}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Mỗi lần kiểm tra sẽ dùng 1 lượt AI.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-3.5">
          <p className="text-xs text-muted-foreground">
            Quyết định duyệt tin luôn thuộc về quản trị viên.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>

            {job && job.status === "PENDING_REVIEW" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => onRequestReject(job)}
                  disabled={isReviewSubmitting}
                >
                  <XCircle className="size-4" />
                  Từ chối
                </Button>
                <Button
                  onClick={() => onApprove(job)}
                  disabled={isReviewSubmitting}
                >
                  <CheckCircle2 className="size-4" />
                  Duyệt tin
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default JobReviewDialog;
