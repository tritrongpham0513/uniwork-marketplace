import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { AI_VERDICT_LABELS } from "@/features/admin/lib/ai-review";
import type { AiVerdict } from "@/features/shared/types";

/**
 * Class màu theo mức độ — khoá vựng theo `notes/01-ket-qua-thu.md` mục 4.1.
 *
 * <p>Dùng token Tailwind của app để tự đổi theo theme sáng/tối.
 */
const VERDICT_CLASS: Record<AiVerdict | "NOT_CHECKED", string> = {
  SUSPECT: "bg-destructive/10 text-destructive",
  WARN: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  OK: "bg-primary/10 text-primary",
  NOT_CHECKED: "bg-muted text-muted-foreground",
};

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
  const key = verdict ?? "NOT_CHECKED";

  return (
    <Badge className={cn(VERDICT_CLASS[key], className)}>
      {AI_VERDICT_LABELS[key]}
    </Badge>
  );
}

export default AiReviewBadge;
