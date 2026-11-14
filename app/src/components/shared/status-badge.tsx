import type { ApplicationStatus, JobStatus } from "@/features/shared/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/** Màu badge theo trạng thái — dùng token chuẩn của shadcn (không hardcode hex) */
const APPLICATION_VARIANT: Record<
  ApplicationStatus,
  "default" | "secondary" | "outline" | "destructive" | "ghost"
> = {
  PENDING: "secondary",
  VIEWED: "outline",
  SHORTLISTED: "default",
  ACCEPTED: "default",
  COMPLETED: "outline",
  REJECTED: "destructive",
  WITHDRAWN: "ghost",
};

const JOB_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "outline" | "destructive" | "ghost"
> = {
  DRAFT: "ghost",
  PENDING_REVIEW: "secondary",
  REJECTED: "destructive",
  OPEN: "default",
  FILLED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CLOSED: "ghost",
  CANCELLED: "ghost",
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  label: string;
  className?: string;
}

export function ApplicationStatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant={APPLICATION_VARIANT[status]}
      className={cn("font-medium", className)}
    >
      {label}
    </Badge>
  );
}

interface JobStatusBadgeProps {
  status: JobStatus;
  label: string;
  className?: string;
}

export function JobStatusBadge({
  status,
  label,
  className,
}: JobStatusBadgeProps) {
  return (
    <Badge variant={JOB_VARIANT[status]} className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}

/**
 * Badge trạng thái đa dạng — dùng khi component không cần biết trước loại
 * trạng thái (đơn ứng tuyển hay tin tuyển dụng).
 */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ApplicationStatus | JobStatus;
  label: string;
  className?: string;
}) {
  const variant =
    APPLICATION_VARIANT[status as ApplicationStatus] ??
    JOB_VARIANT[status as JobStatus] ??
    "outline";

  return (
    <Badge variant={variant} className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}
