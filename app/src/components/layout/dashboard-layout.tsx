import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  Bell,
  Building2,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PATHS } from "@/config/paths";
import { useNotificationCount } from "@/features/notifications/hooks";
import { cn } from "cn";

export interface DashboardNavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

interface DashboardLayoutProps {
  title: string;
  description?: string;
  role: "STUDENT" | "EMPLOYER" | "ADMIN";
  navItems: DashboardNavItem[];
  actions?: ReactNode;
  children: ReactNode;
}

const ROLE_META = {
  STUDENT: {
    label: "Sinh viên",
    icon: GraduationCap,
    accent: "bg-primary/10 text-primary",
  },
  EMPLOYER: {
    label: "Nhà tuyển dụng",
    icon: Building2,
    accent: "bg-primary/10 text-primary",
  },
  ADMIN: {
    label: "Quản trị viên",
    icon: ShieldCheck,
    accent: "bg-primary/10 text-primary",
  },
} as const;

/**
 * Layout chung cho 3 khu vực sau đăng nhập:
 * sidebar điều hướng + tiêu đề + nội dung.
 */
export function DashboardLayout({
  title,
  description,
  role,
  navItems,
  actions,
  children,
}: DashboardLayoutProps) {
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;
  const { data: unreadCount = 0 } = useNotificationCount();

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <NavLink
            end={index === 0}
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* SIDEBAR — desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    meta.accent
                  )}
                >
                  <RoleIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Không gian làm việc
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {meta.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-2">
              {nav}
            </div>

            <Link
              to={PATHS.NOTIFICATIONS}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Bell className="size-4 text-muted-foreground" />
              <span className="flex-1">Thông báo</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </div>
        </aside>

        {/* NỘI DUNG */}
        <div className="min-w-0 flex-1">
          {/* Header trang */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Menu mobile */}
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <Menu className="size-4" />
                      Menu
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <RoleIcon className="size-4 text-primary" />
                      {meta.label}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6">{nav}</div>
                </SheetContent>
              </Sheet>

              {actions}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

/** Helper tạo nav item chuẩn */
export const navItem = (
  label: string,
  to: string,
  icon: typeof LayoutDashboard,
  badge?: number
): DashboardNavItem => ({ label, to, icon, badge });

export const DASHBOARD_ICONS = {
  dashboard: LayoutDashboard,
  jobs: FileText,
  applications: FolderKanban,
  users: Users,
  reviews: Star,
} as const;

export { X };
export default DashboardLayout;
