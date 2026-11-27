import { cn } from "cn";
import { splitTextByEvidences } from "@/features/admin/lib/ai-review";
import type { AiVerdict } from "@/features/shared/types";

interface HighlightedTextProps {
  text: string;
  evidences: string[];
  verdict?: AiVerdict | null;
  className?: string;
}

/**
 * Tô sáng các câu trích dẫn nguyên văn của AI ngay bên trong nội dung tin tuyển dụng
 * để quản trị viên đối chiếu trực tiếp mà không phải cuộn tìm thủ công.
 */
export function HighlightedText({
  text,
  evidences,
  verdict,
  className,
}: HighlightedTextProps) {
  const segments = splitTextByEvidences(text, evidences);

  const markClass =
    verdict === "SUSPECT"
      ? "rounded bg-destructive/15 px-1 py-0.5 font-medium text-destructive underline decoration-destructive/40 underline-offset-2"
      : verdict === "WARN"
        ? "rounded bg-amber-500/20 px-1 py-0.5 font-medium text-amber-900 underline decoration-amber-500/40 underline-offset-2 dark:text-amber-300"
        : "rounded bg-primary/15 px-1 py-0.5 font-medium text-primary";

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.isHighlighted ? (
          <mark key={index} className={cn(markClass)}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

export default HighlightedText;
