import { BadgeCheck, Eye, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/shared/status-badge";
import { AiReviewBadge } from "@/features/admin/components/ai-review-badge";
import { AI_VIOLATION_LABELS } from "@/features/admin/lib/ai-review";
import {
  JOB_STATUS_LABELS,
  type AdminJob,
  type AiViolationCode,
  type SalaryComparison,
} from "@/features/shared/types";

interface AdminJobsTableProps {
  jobs: AdminJob[];
  comparisons: Map<string, SalaryComparison | null>;
  showStatusBadge: boolean;
  isAiEnabled: boolean;
  checkingJobId: string | null;
  isReviewSubmitting: boolean;
  formatSalary: (job: AdminJob) => string;
  formatPostedAgo: (postedAt: string) => string;
  onInspect: (job: AdminJob) => void;
  onAiCheck: (job: AdminJob) => void;
  onApprove: (job: AdminJob) => void;
  onRequestReject: (job: AdminJob) => void;
}

const getUniqueViolationCodes = (job: AdminJob): AiViolationCode[] => {
  if (!job.aiReasons || job.aiReasons.length === 0) return [];
  return Array.from(new Set(job.aiReasons.map((reason) => reason.code)));
};

const renderSalaryComparisonHint = (comparison: SalaryComparison | null) => {
  if (!comparison) return null;

  if (comparison.verdict === "BELOW") {
    return (
      <span className="text-[11px] font-medium text-destructive">
        Thấp hơn TB (Top {comparison.percentile}%)
      </span>
    );
  }
  if (comparison.verdict === "ABOVE") {
    return (
      <span className="text-[11px] font-medium text-primary">
        Cao hơn TB (Top {comparison.percentile}%)
      </span>
    );
  }
  return (
    <span className="text-[11px] text-muted-foreground">
      Đúng mức TB (Top {comparison.percentile}%)
    </span>
  );
};

/**
 * Bảng danh sách tin tuyển dụng dành cho quản trị viên.
 *
 * <p>Hiển thị trực tiếp badge AI, các mã vi phạm và tóm tắt ngắn ngay trên
 * dòng để quản trị viên quét nhanh tin bất thường mà không phải mở từng modal.
 */
export function AdminJobsTable({
  jobs,
  comparisons,
  showStatusBadge,
  formatSalary,
  formatPostedAgo,
  onInspect,
}: AdminJobsTableProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">Tin tuyển dụng</TableHead>
              <TableHead className="min-w-[190px]">
                Nhà tuyển dụng &amp; Lương
              </TableHead>
              <TableHead className="min-w-[260px]">Tín hiệu AI</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const violationCodes = getUniqueViolationCodes(job);
              const comparison = comparisons.get(job.id) ?? null;

              return (
                <TableRow
                  key={job.id}
                  className={
                    job.aiVerdict === "SUSPECT"
                      ? "bg-destructive/[0.03] hover:bg-destructive/[0.06]"
                      : job.aiVerdict === "WARN"
                        ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                        : undefined
                  }
                >
                  <TableCell className="align-top whitespace-normal">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px]">
                          {job.category.name}
                        </Badge>
                        {job.position && (
                          <Badge variant="outline" className="text-[11px]">
                            {job.position.name}
                          </Badge>
                        )}
                        {showStatusBadge && (
                          <JobStatusBadge
                            status={job.status}
                            label={JOB_STATUS_LABELS[job.status]}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspect(job)}
                        className="text-left font-heading text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {job.title}
                      </button>

                      <p className="text-xs text-muted-foreground">
                        {formatPostedAgo(job.postedAt)} ·{" "}
                        {job.location.ward || job.location.district},{" "}
                        {job.location.province} · {job.positionsCount} suất
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="align-top whitespace-normal">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {job.employer.verified ? (
                          <BadgeCheck
                            className="size-3.5 shrink-0 text-primary"
                            aria-label="Đã xác minh"
                          />
                        ) : (
                          <ShieldCheck
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Chưa xác minh"
                          />
                        )}
                        <span className="line-clamp-1">
                          {job.employer.name}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {formatSalary(job)}
                      </p>
                      {renderSalaryComparisonHint(comparison)}
                    </div>
                  </TableCell>

                  <TableCell className="align-top whitespace-normal">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AiReviewBadge verdict={job.aiVerdict} />
                        {violationCodes.map((code) => (
                          <Badge
                            key={code}
                            variant="outline"
                            className="text-[10px] font-medium"
                          >
                            {AI_VIOLATION_LABELS[code]}
                          </Badge>
                        ))}
                      </div>

                      {job.aiSummary ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {job.aiSummary}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {job.aiVerdict === "OK"
                            ? "Không phát hiện dấu hiệu vi phạm."
                            : "Chưa có phân tích từ AI."}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right align-top">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onInspect(job)}
                      >
                        <Eye className="size-3.5" />
                        {job.status === "PENDING_REVIEW"
                          ? "Xem & duyệt"
                          : "Chi tiết"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default AdminJobsTable;
