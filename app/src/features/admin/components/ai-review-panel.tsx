import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { AiReviewBadge } from "@/features/admin/components/ai-review-badge";
import type {
  AiReason,
  AiReview,
  AiVerdict,
  AiViolationCode,
} from "@/features/shared/types";

/**
 * Nhãn tiếng Việt cho 6 mã vi phạm — cố định theo `CONTRACT.md` mục 1.
 *
 * <p>Hiển thị mã + nhãn để quản trị viên đối chiếu được với hợp đồng,
 * nhưng không bắt buộc phải nhớ mã.
 */
const VIOLATION_LABELS: Record<AiViolationCode, string> = {
  FEE_ADVANCE: "Yêu cầu tiền trước",
  UNREGISTERED_WORK: "Tuyển lao động phi chính quyền",
  OFF_PLATFORM: "Tuyển ngoài nền tảng",
  SALARY_ANOMALY: "Mức lương bất thường",
  DISCRIMINATION: "Phân biệt đối xử",
  ILLEGAL_WORK: "Công việc vi phạm pháp luật",
};

interface AiReviewPanelProps {
  /** Kết quả kiểm duyệt AI — `null` nghĩa là tin chưa được kiểm tra. */
  review: AiReview | null;
  /** Thời điểm AI kiểm tra (ISO-8601) — lấy từ bản ghi tin tuyển dụng. */
  checkedAt?: string | null;
  /** Đang chờ kết quả từ lần kiểm tra thủ công. */
  isChecking?: boolean;
  /** Đã bấm "Kiểm tra bằng AI" ít nhất một lần trong phiên xem nội dung. */
  hasChecked?: boolean;
}

/** Định dạng thời điểm kiểm tra theo kiểu Việt Nam — có giờ để biết còn giá trị không. */
const formatCheckedAt = (checkedAt: string): string => {
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return checkedAt;

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReasonItem = ({ reason }: { reason: AiReason }) => (
  <li className="rounded-lg border border-border/60 p-3">
    <div className="mb-1.5 flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="font-mono text-[10px]">
        {reason.code}
      </Badge>
      <span className="text-xs font-medium text-foreground">
        {VIOLATION_LABELS[reason.code]}
      </span>
    </div>

    {reason.evidence && (
      <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground italic">
        “{reason.evidence}”
      </blockquote>
    )}

    {reason.detail && (
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {reason.detail}
      </p>
    )}
  </li>
);

/**
 * Khối "Đánh giá của AI" trong dialog xem nội dung tin tuyển dụng.
 *
 * <p>Hiển thị SAU nội dung tin (spec mục 13) để quản trị viên tự đối chiếu
 * bằng chứng nguyên văn với nội dung thật của tin.
 */
export function AiReviewPanel({
  review,
  checkedAt,
  isChecking = false,
  hasChecked = false,
}: AiReviewPanelProps) {
  const verdict: AiVerdict | null = review?.verdict ?? null;
  const reasons = review?.reasons ?? [];

  return (
    <section className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <p className="font-semibold text-foreground">Đánh giá của AI</p>
        <AiReviewBadge verdict={verdict} />
      </div>

      {isChecking ? (
        <p className="text-xs text-muted-foreground">
          Đang kiểm tra bằng AI...
        </p>
      ) : review ? (
        <div className="space-y-3">
          {review.summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {review.summary}
            </p>
          )}

          {reasons.length > 0 ? (
            <ul className="space-y-2">
              {reasons.map((reason, index) => (
                <ReasonItem key={`${reason.code}-${index}`} reason={reason} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {verdict === "OK"
                ? "AI không phát hiện dấu hiệu vi phạm nội dung."
                : "AI không nêu được lý do cụ thể cho mức độ này."}
            </p>
          )}
        </div>
      ) : hasChecked ? (
        <p className="text-xs text-muted-foreground">
          Chưa có kết quả kiểm tra AI cho tin này.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tin này chưa được kiểm tra bằng AI.
        </p>
      )}

      {checkedAt && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          AI kiểm tra lúc {formatCheckedAt(checkedAt)}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Đây là góp ý của AI, quyết định duyệt vẫn là của quản trị viên.
      </p>
    </section>
  );
}

export default AiReviewPanel;
