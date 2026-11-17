import { Link, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Briefcase,
  Building2,
  ChevronUp,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PATHS, ROLE_HOME } from "@/config/paths";
import {
  PROFILE_PATH_BY_ROLE,
  ROLE_LABEL,
  WORKSPACE_NAV,
  type WorkspaceNavItem,
} from "@/config/workspace-nav";
import { useAuth } from "@/features/auth/hooks";
import { useNotificationCount } from "@/features/notifications/hooks";
import { useStudentApplications } from "@/features/applications/hooks";
import { useEmployerApplications } from "@/features/applications/hooks";
import { useEmployerJobs } from "@/features/employer/hooks";
import { useAdminDashboard } from "@/features/admin/hooks";
import { useSavedJobIds } from "@/features/saved-jobs/hooks";
import type { RoleType } from "@/features/shared/types";
import { cn } from "cn";

/** Lấy 2 chữ cái đầu của tên để làm Avatar */
const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ROLE_ICON: Record<RoleType, LucideIcon> = {
  STUDENT: GraduationCap,
  EMPLOYER: Building2,
  ADMIN: ShieldCheck,
};

/**
 * Số đếm trên menu — tách riêng từng vai trò vì mỗi vai trò gọi
 * một bộ API khác nhau (React Hooks không được gọi có điều kiện).
 */
function StudentNavBadge({ itemId }: { itemId: string }) {
  const { data: applications = [] } = useStudentApplications();
  const { data: savedIds = [] } = useSavedJobIds();

  if (itemId === "student-applications") {
    const pending = applications.filter(
      (a) => a.status === "PENDING" || a.status === "VIEWED"
    ).length;
    return pending > 0 ? <SidebarMenuBadge>{pending}</SidebarMenuBadge> : null;
  }

  if (itemId === "student-saved") {
    return savedIds.length > 0 ? (
      <SidebarMenuBadge>{savedIds.length}</SidebarMenuBadge>
    ) : null;
  }

  return null;
}

function EmployerNavBadge({ itemId }: { itemId: string }) {
  const { data: jobs = [] } = useEmployerJobs();
  const { data: applications = [] } = useEmployerApplications();

  if (itemId === "employer-jobs") {
    const open = jobs.filter(
      (job) => job.status === "OPEN" || job.status === "IN_PROGRESS"
    ).length;
    return open > 0 ? <SidebarMenuBadge>{open}</SidebarMenuBadge> : null;
  }

  if (itemId === "employer-applications") {
    const pending = applications.filter(
      (a) => a.status === "PENDING" || a.status === "VIEWED"
    ).length;
    return pending > 0 ? (
      <SidebarMenuBadge>{pending}</SidebarMenuBadge>
    ) : null;
  }

  return null;
}

function AdminNavBadge({ itemId }: { itemId: string }) {
  const { data: stats } = useAdminDashboard();

  if (itemId === "admin-jobs" && stats?.pendingJobs) {
    return <SidebarMenuBadge>{stats.pendingJobs}</SidebarMenuBadge>;
  }

  if (itemId === "admin-reviews" && stats?.hiddenReviews) {
    return <SidebarMenuBadge>{stats.hiddenReviews}</SidebarMenuBadge>;
  }

  return null;
}

function NavBadge({ role, itemId }: { role: RoleType; itemId: string }) {
  if (role === "STUDENT") return <StudentNavBadge itemId={itemId} />;
  if (role === "EMPLOYER") return <EmployerNavBadge itemId={itemId} />;
  return <AdminNavBadge itemId={itemId} />;
}

/** Một mục điều hướng trong sidebar */
function NavEntry({
  item,
  role,
}: {
  item: WorkspaceNavItem;
  role: RoleType;
}) {
  const { pathname } = useLocation();
  const isActive = item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);

  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        render={<Link to={item.to} />}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      <NavBadge role={role} itemId={item.id} />
    </SidebarMenuItem>
  );
}

/** Khối tài khoản ở chân sidebar */
function UserMenu() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();

  if (!user) return null;

  const RoleIcon = ROLE_ICON[user.role];
  const profilePath = PROFILE_PATH_BY_ROLE[user.role];

  const handleLogout = () => {
    logout();
    navigate(PATHS.AUTH.LOGIN);
  };

  const avatar = (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
      {getInitials(user.fullName || user.email)}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
              state === "collapsed" && "justify-center"
            )}
            aria-label="Tài khoản"
          />
        }
      >
        {avatar}
        {state !== "collapsed" && (
          <div className="flex min-w-0 flex-1 flex-col text-xs leading-tight">
            <span className="truncate font-semibold text-sidebar-foreground">
              {user.fullName || user.email}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-sidebar-foreground/70">
              <RoleIcon className="size-2.5" />
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        )}
        {state !== "collapsed" && (
          <ChevronUp className="size-4 shrink-0 text-sidebar-foreground/60" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-60 min-w-0"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs font-normal">
          <span className="block truncate font-semibold text-foreground">
            {user.fullName || user.email}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {user.email}
          </span>
          <Badge variant="secondary" className="mt-2 gap-1 text-[10px]">
            <RoleIcon className="size-3" />
            {ROLE_LABEL[user.role]}
          </Badge>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link to={profilePath} />}
            className="cursor-pointer"
          >
            <User />
            {user.role === "EMPLOYER" ? "Thông tin tổ chức" : "Hồ sơ cá nhân"}
          </DropdownMenuItem>

          <DropdownMenuItem
            render={<Link to={ROLE_HOME[user.role] ?? PATHS.HOME} />}
            className="cursor-pointer"
          >
            <LayoutDashboard />
            Bảng điều khiển
          </DropdownMenuItem>

          <DropdownMenuItem
            render={<Link to={PATHS.NOTIFICATIONS} />}
            className="cursor-pointer"
          >
            <Bell />
            Thông báo
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          className="cursor-pointer"
        >
          <LogOut />
          Đăng xuất tài khoản
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sidebar của không gian làm việc.
 *
 * Bố cục (theo mẫu shadcn/ui):
 * - Đầu: logo + tên sản phẩm.
 * - Giữa: điều hướng theo vai trò + liên kết thông báo.
 * - Chân: menu tài khoản.
 */
export function WorkspaceSidebar() {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useNotificationCount();

  if (!user) return null;

  const config = WORKSPACE_NAV[user.role];

  return (
    <Sidebar collapsible="icon">
      {/* ĐẦU — LOGO */}
      <SidebarHeader>
        <Link
          to={PATHS.HOME}
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-opacity hover:opacity-80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Briefcase className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Vie<span className="text-primary">Job</span>
            </span>
            <span className="-mt-0.5 truncate text-[10px] font-medium text-sidebar-foreground/60">
              Việc làm sinh viên
            </span>
          </div>
        </Link>

        {/* Đường kẻ nằm trong header (đã có padding) để không tràn rail */}
        <SidebarSeparator />
      </SidebarHeader>

      {/* GIỮA — ĐIỀU HƯỚNG */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{config.areaLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {config.items.map((item) => (
                <NavEntry key={item.id} item={item} role={user.role} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Khác</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={false}
                  tooltip="Thông báo"
                  render={<Link to={PATHS.NOTIFICATIONS} />}
                >
                  <Bell />
                  <span>Thông báo</span>
                </SidebarMenuButton>
                {unreadCount > 0 && (
                  <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* CHÂN — TÀI KHOẢN */}
      <SidebarFooter>
        <SidebarSeparator />
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default WorkspaceSidebar;
