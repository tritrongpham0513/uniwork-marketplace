import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { SalaryComparison } from "@/features/shared/types";
import { cn } from "cn";

interface SalaryBenchmarkCardProps {
  comparison: SalaryComparison | null;
  /** Mức lương hiển thị của tin (đã format sẵn) */
  displaySalary?: string;
  className?: string;
}

/**
 * Card "Xếp hạng lương" — bám theo Viecoday:
 * "Top 34% — Cao hơn trung bình. Tin này 31k/giờ, trung bình 29k/giờ.
 *  Dữ liệu 3 tháng gần nhất"
 */
export function SalaryBenchmarkCard({
  comparison,
  displaySalary,
  className,
}: SalaryBenchmarkCardProps) {
  if (!comparison) {
    return (
      <Card size="sm" className={cn("border-border/60", className)}>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-foreground">
            Xếp hạng lương
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chưa có đủ dữ liệu benchmark cho nhóm việc và địa điểm này.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { benchmark, percentile, verdict, diff } = comparison;
  const isAbove = verdict === "ABOVE";
  const isBelow = verdict === "BELOW";

  const verdictLabel = isAbove
    ? "Cao hơn trung bình"
    : isBelow
      ? "Thấp hơn trung bình"
      : "Trung bình ngành";

  const VerdictIcon = isAbove ? TrendingUp : isBelow ? TrendingDown : TrendingUp;

  const avgText = `${Math.round(benchmark.avgHourly / 1000)}k/giờ`;
  const diffText =
    Math.abs(diff) >= 1000
      ? `${diff > 0 ? "+" : "-"}${Math.round(Math.abs(diff) / 1000)}k`
      : `${diff > 0 ? "+" : "-"}${Math.round(Math.abs(diff))}đ`;

  return (
    <Card size="sm" className={cn("border-border/60", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Xếp hạng lương
          </p>
          <Badge
            variant={isAbove ? "default" : isBelow ? "secondary" : "outline"}
            className="gap-1 text-[10px]"
          >
            <VerdictIcon className="size-3" />
            Top {percentile}%
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Tin này trả <span className="font-semibold text-foreground">{displaySalary ?? avgText}</span>
          {", "}
          trung bình ngành là{" "}
          <span className="font-semibold text-foreground">{avgText}</span>{" "}
          <span
            className={cn(
              "font-semibold",
              isAbove
                ? "text-primary"
                : isBelow
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            ({diffText})
          </span>
        </p>

        {/* Thanh tiến độ tượng trưng "mức lương so với dải benchmark":
            đầy = lương cao. `percentile` là "Top X%" nên lương cao ⇔
            percentile nhỏ → lấy 100 - percentile. */}
        <Progress value={100 - percentile} className="gap-1" />

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{verdictLabel}</span>
          <span>
            Dữ liệu {benchmark.sampleSize} tin cùng ngành · cập nhật{" "}
            {new Date(benchmark.updatedAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default SalaryBenchmarkCard;
