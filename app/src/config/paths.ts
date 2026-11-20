// src/config/paths.ts

export const PATHS = {
  HOME: "/",
  ABOUT: "/about",
  FORBIDDEN: "/403",

  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFY_EMAIL: "/verify-email",
  },

  // Hỗ trợ cả route có param động cho sau này (job detail, profile, v.v.)
  JOBS: {
    ROOT: "/jobs",
    DETAIL: (id: string | number = ":id") => `/jobs/${id}`,
    APPLY: (id: string | number = ":id") => `/jobs/${id}/apply`,
  },

  // ---------- SINH VIÊN ----------
  STUDENT: {
    ROOT: "/student",
    PROFILE: "/student/profile",
    APPLICATIONS: "/student/applications",
    APPLICATION_DETAIL: (id: string | number = ":id") =>
      `/student/applications/${id}`,
    /** Đánh giá sinh viên đã nhận từ nhà tuyển dụng */
    REVIEWS: "/student/reviews",
  },

  // ---------- NHÀ TUYỂN DỤNG ----------
  EMPLOYER: {
    ROOT: "/employer",
    JOBS: "/employer/jobs",
    JOB_NEW: "/employer/jobs/new",
    JOB_EDIT: (id: string | number = ":id") => `/employer/jobs/${id}/edit`,
    APPLICATIONS: "/employer/applications",
    APPLICATION_DETAIL: (id: string | number = ":id") =>
      `/employer/applications/${id}`,
    ORGANIZATION: "/employer/organization",
    REVIEWS: "/employer/reviews",
    /** Hồ sơ NTD công khai — xem được bởi mọi vai trò (không guard) */
    PUBLIC_PROFILE: (id: string | number = ":id") => `/employer/${id}`,
  },

  // ---------- QUẢN TRỊ VIÊN ----------
  ADMIN: {
    ROOT: "/admin",
    JOBS: "/admin/jobs",
    CATEGORIES: "/admin/categories",
    USERS: "/admin/users",
    REVIEWS: "/admin/reviews",
  },

  NOTIFICATIONS: "/notifications",
  SAVED: "/saved",
} as const;

/**
 * Trang hồ sơ nhà tuyển dụng công khai (xem bởi sinh viên/khách).
 * Đặt ngoài `PATHS.EMPLOYER` vì khu vực đó được guard theo role EMPLOYER.
 */
export const PUBLIC_EMPLOYER_PROFILE = (id: string | number = ":id") =>
  `/employer/${id}`;

/** Trang chủ theo vai trò sau khi đăng nhập */
export const ROLE_HOME: Record<string, string> = {
  STUDENT: PATHS.STUDENT.ROOT,
  EMPLOYER: PATHS.EMPLOYER.ROOT,
  ADMIN: PATHS.ADMIN.ROOT,
};
