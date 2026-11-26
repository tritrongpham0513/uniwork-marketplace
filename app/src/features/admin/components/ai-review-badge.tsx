import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import {
  AI_NOT_CHECKED_LABEL,
  AI_VERDICT_META,
} from "@/features/admin/lib/ai-review";
import type { AiVerdict } from "@/features/shared/types";

/**
 * Class màu cho tin chưa được kiểm tra.
 *
 * <p>Các verdict đã có sẵn class trong {@link AI_VERDICT_META} — không lặp
 * lại ở đây.
 */
const NOT_CHECKED_CLASS = "bg-muted text-muted-foreground";

interface AiReviewBadgeProps {
  /** `null` = tin chưa được AI kiểm tra. */
  verdict: AiVerdict | null;
  className?: string;
}

/**
 * Badge mức độ kiểm duyệt AI trên thẻ tin tuyển dụng.
 *
 * <p>Nhãn cố ý ghi rõ "AI:" để quản trị viên hiểu đây là góp ý của máy,
 * không phải kết luận của hệ thống.
 */
export function AiReviewBadge({ verdict, className }: AiReviewBadgeProps) {
  if (!verdict) {
    return (
      <Badge className={cn(NOT_CHECKED_CLASS, className)}>
        {AI_NOT_CHECKED_LABEL}
      </Badge>
    );
  }

  const meta = AI_VERDICT_META[verdict];

  return (
    <Badge className={cn(meta.badgeClassName, className)}>{meta.label}</Badge>
  );
}

export default AiReviewBadge;
