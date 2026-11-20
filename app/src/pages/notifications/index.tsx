import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Briefcase,
  CheckCheck,
  FileCheck2,
  Info,
  MessageSquareQuote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/empty-state";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "@/features/notifications/hooks";
import { invalidateByNotificationType } from "@/features/notifications/hooks/invalidate";
import {
  NOTIFICATION_TYPE_LABELS,
  type Notification,
  type NotificationType,
} from "@/features/shared/types";
import { cn } from "cn";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  APPLICATION: FileCheck2,
  APPLICATION_STATUS: FileCheck2,
  JOB: Briefcase,
  REVIEW: MessageSquareQuote,
  SYSTEM: Info,
};

const formatRelative = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return new Date(iso).toLocaleDateString("vi-VN");
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isPending,
    isError,
    refetch,
  } = useNotifications(false);

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visible =
    tab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  /**
   * Mở một thông báo.
   *
   * Invalidate dữ liệu liên quan (theo loại thông báo) **trước** khi điều hướng —
   * kể cả khi thông báo đã đọc — để trang đích luôn hiển thị dữ liệu mới nhất.
   * Nếu chỉ invalidate trong `onSuccess` của mutation thì sẽ chậm tới lúc
   * API "đánh dấu đã đọc" trả về, và trang đích có thể render cache cũ.
   */
  const handleOpen = (notification: Notification) => {
    invalidateByNotificationType(queryClient, notification.type);

    if (!notification.isRead) {
      markRead.mutate({ id: notification.id, type: notification.type });
    }
  };

  return (
    <DashboardLayout
      title="Trung tâm thông báo"
      description="Theo dõi cập nhật đơn ứng tuyển, tin tuyển dụng mới và thông báo hệ thống."
      actions={
        unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="size-4" />
            Đọc tất cả
          </Button>
        )
      }
    >

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "all" | "unread")}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="all">
            Tất cả
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Chưa đọc
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-border/60">
                <CardContent className="flex gap-4 p-4">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được thông báo"
            description="Vui lòng kiểm tra kết nối và thử lại."
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="inbox"
            title={
              tab === "unread"
                ? "Không có thông báo chưa đọc"
                : "Chưa có thông báo nào"
            }
            description={
              tab === "unread"
                ? "Bạn đã đọc hết thông báo. Tuyệt vời!"
                : "Thông báo về đơn ứng tuyển và tin tuyển dụng sẽ hiển thị tại đây."
            }
            action={
              <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/jobs" />}>
                Tìm việc làm
              </Button>
            }
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((notification) => {
              const Icon = TYPE_ICON[notification.type] ?? Bell;

              const content = (
                <Card
                  className={cn(
                    "border-border/60 transition-colors",
                    !notification.isRead && "border-primary/30 bg-primary/5",
                    notification.link && "hover:bg-muted/40"
                  )}
                >
                  <CardContent className="flex gap-4 p-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        notification.isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.body}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">
                          {NOTIFICATION_TYPE_LABELS[notification.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label="Đánh dấu đã đọc"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          markRead.mutate({
                            id: notification.id,
                            type: notification.type,
                          });
                        }}
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );

              return (
                <li key={notification.id}>
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => handleOpen(notification)}
                      className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {notifications.length > 0 && unreadCount === 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <BellOff className="size-3.5" />
          Bạn đã đọc hết thông báo.
        </p>
      )}
    </DashboardLayout>
  );
}
