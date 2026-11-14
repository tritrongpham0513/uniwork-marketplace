import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  /** Điểm nhấn cho giá trị (dùng token primary) */
  highlight?: boolean;
  className?: string;
}

/** Thẻ KPI dùng chung cho dashboard của cả 3 vai trò */
export function StatCard({
  label,
  value,
  hint,
  icon,
  highlight = false,
  className,
}: StatCardProps) {
  return (
    <Card size="sm" className={cn("border-border/60", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 font-heading text-2xl font-bold tracking-tight tabular-nums",
              highlight ? "text-primary" : "text-foreground"
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>

        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
