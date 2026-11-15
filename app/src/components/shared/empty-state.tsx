import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Inbox,
  MessageSquare,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: "inbox" | "search" | "error" | "message";
  action?: React.ReactNode;
  className?: string;
}

const ICONS = {
  inbox: Inbox,
  search: SearchX,
  error: AlertCircle,
  message: MessageSquare,
} as const;

/** Trạng thái rỗng dùng chung */
export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
  className,
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card/50",
        className
      )}
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="default">
            <Icon className="size-5 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {action && <EmptyContent>{action}</EmptyContent>}
      </Empty>
    </div>
  );
}

/** Trạng thái lỗi kèm nút thử lại */
export function ErrorState({
  title = "Đã có lỗi xảy ra",
  description = "Không thể tải dữ liệu. Vui lòng thử lại sau.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="error"
      title={title}
      description={description}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        )
      }
    />
  );
}

/** Trạng thái rỗng kèm link về trang liên quan */
export function EmptyStateWithLink({
  title,
  description,
  linkTo,
  linkLabel,
}: {
  title: string;
  description?: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button size="sm" render={<Link to={linkTo} />}>
          {linkLabel}
        </Button>
      }
    />
  );
}

export default EmptyState;
