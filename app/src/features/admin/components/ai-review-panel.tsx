import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { AiReviewBadge } from "@/features/admin/components/ai-review-badge";
import {
  AI_PANEL_MESSAGES,
  AI_VIOLATION_LABELS,
  getAiPanelState,
} from "@/features/admin/lib/ai-review";
import type { AiReason, AiReview, AiVerdict } from "@/features/shared/types";

interface AiReviewPanelProps {
  /** Kết quả kiểm duyệt AI — `null` nghĩa là tin chưa được kiểm tra. */
  review: AiReview | null;
  /** Thời điểm AI kiểm tra (ISO-8601) — lấy từ bản ghi tin tuyển dụng. */
  checkedAt?: string | null;
  /** Đang chờ kết quả từ lần kiểm tra thủ công. */
  isChecking?: boolean;
  /** Đã bấm "Kiểm tra bằng AI" ít nhất một lần trong phiên xem nội dung. */
  hasChecked?: boolean;
  /**
   * Lần kiểm tra vừa rồi thất bại (AI hết hạn mức / lỗi dịch vụ).
   *
   * <p>Khi đúng, khối này hiện "chưa kiểm tra" — **không** hiện lỗi kỹ thuật.
   * Lý do: quản trị viên không cần biết AI đang lỗi; họ cần biết tin này
   * *chưa* có góp ý nào để tự soi. Lỗi kỹ thuật là vấn đề của hệ thống, không
   * phải của người dùng.
   */
  hasFailed?: boolean;
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
        {AI_VIOLATION_LABELS[reason.code]}
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
  hasFailed = false,
}: AiReviewPanelProps) {
  const verdict: AiVerdict | null = review?.verdict ?? null;
  const reasons = review?.reasons ?? [];

  const state = getAiPanelState({
    hasReview: review !== null,
    isChecking,
    hasChecked,
    hasFailed,
  });

  return (
    <section className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <p className="font-semibold text-foreground">Đánh giá của AI</p>
        <AiReviewBadge verdict={verdict} />
      </div>

      {state === "REVIEW" ? (
        <div className="space-y-3">
          {review?.summary && (
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
      ) : (
        // Mọi trạng thái còn lại đều hiện "chưa kiểm tra" — KHÔNG hiện lỗi
        // kỹ thuật cho quản trị viên (ticket 07).
        <p className="text-xs text-muted-foreground">
          {AI_PANEL_MESSAGES[state]}
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
