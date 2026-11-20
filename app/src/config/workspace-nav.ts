import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PATHS } from "@/config/paths";
import type { RoleType } from "@/features/shared/types";

export interface WorkspaceNavItem {
  /** Khoá định danh — dùng để gắn số đếm động */
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Chỉ active khi khớp đúng đường dẫn (mục gốc) */
  end?: boolean;
}

export interface WorkspaceNavConfig {
  /** Tên hiển thị trên thanh trên cùng */
  areaLabel: string;
  items: WorkspaceNavItem[];
}

/**
 * Điều hướng của không gian làm việc — nguồn sự thật duy nhất.
 *
 * Trước đây mỗi page tự khai báo `navItems`, dẫn tới 16 bản danh sách gần
 * giống nhau. Nay gộp về đây để sidebar luôn khớp với nhau.
 */
export const WORKSPACE_NAV: Record<RoleType, WorkspaceNavConfig> = {
  STUDENT: {
    areaLabel: "Không gian sinh viên",
    items: [
      {
        id: "student-dashboard",
        label: "Bảng điều khiển",
        to: PATHS.STUDENT.ROOT,
        icon: ClipboardList,
        end: true,
      },
      {
        id: "student-profile",
        label: "Hồ sơ tìm việc",
        to: PATHS.STUDENT.PROFILE,
        icon: FileText,
      },
      {
        id: "student-applications",
        label: "Đơn ứng tuyển",
        to: PATHS.STUDENT.APPLICATIONS,
        icon: CheckCircle2,
      },
      {
        id: "student-reviews",
        label: "Đánh giá",
        to: PATHS.STUDENT.REVIEWS,
        icon: Star,
      },
      {
        id: "student-saved",
        label: "Việc đã lưu",
        to: PATHS.SAVED,
        icon: Star,
      },
      {
        id: "student-jobs",
        label: "Tìm việc làm",
        to: PATHS.JOBS.ROOT,
        icon: Search,
      },
    ],
  },

  EMPLOYER: {
    areaLabel: "Không gian nhà tuyển dụng",
    items: [
      {
        id: "employer-dashboard",
        label: "Bảng điều khiển",
        to: PATHS.EMPLOYER.ROOT,
        icon: FileText,
        end: true,
      },
      {
        id: "employer-jobs",
        label: "Tin tuyển dụng",
        to: PATHS.EMPLOYER.JOBS,
        icon: Briefcase,
      },
      {
        id: "employer-applications",
        label: "Ứng viên",
        to: PATHS.EMPLOYER.APPLICATIONS,
        icon: Users,
      },
      {
        id: "employer-reviews",
        label: "Đánh giá",
        to: PATHS.EMPLOYER.REVIEWS,
        icon: Star,
      },
      {
        id: "employer-organization",
        label: "Thông tin tổ chức",
        to: PATHS.EMPLOYER.ORGANIZATION,
        icon: UserCheck,
      },
    ],
  },

  ADMIN: {
    areaLabel: "Quản trị hệ thống",
    items: [
      {
        id: "admin-dashboard",
        label: "Bảng điều khiển",
        to: PATHS.ADMIN.ROOT,
        icon: FileText,
        end: true,
      },
      {
        id: "admin-jobs",
        label: "Duyệt tin đăng",
        to: PATHS.ADMIN.JOBS,
        icon: Briefcase,
      },
      {
        id: "admin-categories",
        label: "Danh mục",
        to: PATHS.ADMIN.CATEGORIES,
        icon: FolderKanban,
      },
      {
        id: "admin-users",
        label: "Người dùng",
        to: PATHS.ADMIN.USERS,
        icon: Users,
      },
      {
        id: "admin-reviews",
        label: "Kiểm duyệt đánh giá",
        to: PATHS.ADMIN.REVIEWS,
        icon: ShieldCheck,
      },
    ],
  },
};

/** Đường dẫn hồ sơ theo vai trò (dùng ở menu tài khoản trong sidebar) */
export const PROFILE_PATH_BY_ROLE: Record<RoleType, string> = {
  STUDENT: PATHS.STUDENT.PROFILE,
  EMPLOYER: PATHS.EMPLOYER.ORGANIZATION,
  ADMIN: PATHS.ADMIN.USERS,
};

export const ROLE_LABEL: Record<RoleType, string> = {
  STUDENT: "Sinh viên",
  EMPLOYER: "Nhà tuyển dụng",
  ADMIN: "Quản trị viên",
};
