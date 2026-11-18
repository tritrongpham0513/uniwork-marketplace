import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationStatusEvent,
} from "@/features/shared/types";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "cn";

/** Thứ tự chuẩn của vòng đời đơn ứng tuyển */
const FLOW: ApplicationStatus[] = [
  "PENDING",
  "SHORTLISTED",
  "ACCEPTED",
  "COMPLETED",
];

const STATUS_ICON: Partial<
  Record<ApplicationStatus, typeof CheckCircle2>
> = {
  REJECTED: XCircle,
  WITHDRAWN: XCircle,
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface ApplicationTimelineProps {
  timeline: ApplicationStatusEvent[];
  className?: string;
  /** Bước hiện tại để đánh dấu */
  currentStatus?: ApplicationStatus;
}

/**
 * Timeline trạng thái đơn ứng tuyển.
 * Hiển thị đầy đủ các bước trong luồng (kể cả bước chưa tới) để sinh viên
 * nhìn thấy rõ điều kiện cần đạt — bám theo luồng của Chốt Ca.
 */
export function ApplicationTimeline({
  timeline,
  className,
  currentStatus,
}: ApplicationTimelineProps) {
  const byStatus = new Map(timeline.map((event) => [event.status, event]));

  const isTerminal = currentStatus === "REJECTED" || currentStatus === "WITHDRAWN";
  const currentIndex = FLOW.indexOf(currentStatus ?? "PENDING");

  return (
    <ol className={cn("relative space-y-5", className)}>
      {FLOW.map((status, index) => {
        const event = byStatus.get(status);
        const reached = Boolean(event);
        const isCurrent =
          status === currentStatus ||
          (currentStatus === undefined && reached && !byStatus.get(FLOW[index + 1]));

        const Icon = STATUS_ICON[status] ?? (reached ? CheckCircle2 : Circle);
        const isNegative = isTerminal && index > currentIndex && !reached;

        return (
          <li key={status} className="relative flex gap-3">
            {/* Đường nối */}
            {index < FLOW.length - 1 && (
              <span
                className="absolute top-6 left-[11px] h-full w-px bg-border"
                aria-hidden
              />
            )}

            <Icon
              className={cn(
                "relative z-10 mt-0.5 size-6 shrink-0 rounded-full bg-card",
                reached
                  ? "text-primary"
                  : isNegative
                    ? "text-destructive/50"
                    : "text-muted-foreground/40"
              )}
              aria-hidden
            />

            <div className="min-w-0 flex-1 pb-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  reached
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {APPLICATION_STATUS_LABELS[status]}
              </p>

              {event ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.at)}
                  </p>
                  {event.note && (
                    <p className="mt-1 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                      {event.note}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground/70">
                  {isNegative ? "Không áp dụng" : "Chưa diễn ra"}
                </p>
              )}

              {isCurrent && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Trạng thái hiện tại
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ApplicationTimeline;
