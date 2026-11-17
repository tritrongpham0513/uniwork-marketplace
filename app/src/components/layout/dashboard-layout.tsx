import type { ReactNode } from "react";

interface DashboardLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Đầu trang + vùng nội dung của một màn trong không gian làm việc.
 *
 * Vỏ trang (sidebar + thanh trên) do `WorkspaceLayout` đảm nhiệm.
 * Ở đây chỉ còn:
 * - Tiêu đề / mô tả / nút hành động của riêng màn.
 * - Khung nội dung giới hạn ở `max-w-[1600px]` và **canh trái** (không
 *   `mx-auto`) để nội dung bám sát sidebar, không trôi giữa màn rộng.
 */
export function DashboardLayout({
  title,
  description,
  actions,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header trang */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
}

export default DashboardLayout;
