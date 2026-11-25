// ============================================
// QUERY KEYS — hợp đồng dùng chung giữa các feature
//
// Vì sao file này tồn tại?
// - `features/notifications` cần invalidate cache của feature khác khi có
//   thông báo mới (đơn ứng tuyển đổi trạng thái -> danh sách đơn đổi theo).
// - `features/profile` cần invalidate cache của `auth` sau khi đổi avatar/logo.
//
// Nếu mỗi feature giữ query key riêng thì các feature đó phải import chéo
// vào nhau, vi phạm ranh giới module (xem AGENTS.md > Ranh giới import).
// Vì vậy toàn bộ định nghĩa query key nằm ở đây — `features/shared` là
// điểm neo duy nhất — và mỗi feature chỉ re-export phần của mình.
//
// Thêm feature mới -> thêm key vào đây, không tạo import chéo.
// ============================================

// ============================================
// AUTH
// ============================================

export const AUTH_KEYS = {
  all: ["auth"] as const,
  currentUser: () => [...AUTH_KEYS.all, "me"] as const,
};

// ============================================
// JOBS
// ============================================

export const JOB_KEYS = {
  all: ["jobs"] as const,
  lists: () => [...JOB_KEYS.all, "list"] as const,
  /**
   * Filter là đối tượng `JobFilters` của feature jobs — khai báo generic
   * để `shared` không phải import chéo từ `features/jobs`.
   */
  list: <T extends object>(filters: T) =>
    [...JOB_KEYS.lists(), filters] as const,
  details: () => [...JOB_KEYS.all, "detail"] as const,
  detail: (id: string) => [...JOB_KEYS.details(), id] as const,
  detailsByIds: (ids: string[]) =>
    [...JOB_KEYS.details(), "by-ids", ...ids] as const,
  related: (categoryId: string, excludeId: string) =>
    [...JOB_KEYS.details(), "related", categoryId, excludeId] as const,
  meta: () => [...JOB_KEYS.all, "meta"] as const,
  categories: () => [...JOB_KEYS.all, "categories"] as const,
  positions: () => [...JOB_KEYS.all, "positions"] as const,
  provinces: () => [...JOB_KEYS.all, "provinces"] as const,
  districts: (provinceId?: string) =>
    [...JOB_KEYS.all, "districts", provinceId ?? "all"] as const,
  wards: (provinceId?: string) =>
    [...JOB_KEYS.all, "wards", provinceId ?? "all"] as const,
  skills: () => [...JOB_KEYS.all, "skills"] as const,
  benchmarks: () => [...JOB_KEYS.all, "salary-benchmarks"] as const,
};

// ============================================
// APPLICATIONS
// ============================================

export const APPLICATION_KEYS = {
  all: ["applications"] as const,
  student: (status?: string) =>
    [...APPLICATION_KEYS.all, "student", status ?? "ALL"] as const,
  studentDetail: (id: string) =>
    [...APPLICATION_KEYS.all, "student", "detail", id] as const,
  /** Đơn của SV cho 1 tin — dùng để biết đã ứng tuyển tin đó chưa. */
  studentByJob: (jobId: string) =>
    [...APPLICATION_KEYS.all, "student", "by-job", jobId] as const,
  employer: (params?: { jobId?: string; status?: string }) =>
    [...APPLICATION_KEYS.all, "employer", params ?? {}] as const,
  employerDetail: (id: string) =>
    [...APPLICATION_KEYS.all, "employer", "detail", id] as const,
};

// ============================================
// PROFILE
// ============================================

export const PROFILE_KEYS = {
  all: ["profile"] as const,
  student: () => [...PROFILE_KEYS.all, "student"] as const,
  employer: () => [...PROFILE_KEYS.all, "employer"] as const,
  publicEmployer: (id: string) =>
    [...PROFILE_KEYS.all, "public-employer", id] as const,
};

// ============================================
// EMPLOYER JOBS
// ============================================

export const EMPLOYER_JOB_KEYS = {
  all: ["employer-jobs"] as const,
  list: (status?: string) =>
    [...EMPLOYER_JOB_KEYS.all, "list", status ?? "ALL"] as const,
  detail: (id: string) => [...EMPLOYER_JOB_KEYS.all, "detail", id] as const,
};

// ============================================
// REVIEWS
// ============================================

export const REVIEW_KEYS = {
  all: ["reviews"] as const,
  list: (params?: Record<string, unknown>) =>
    [...REVIEW_KEYS.all, "list", params ?? {}] as const,
  student: () => [...REVIEW_KEYS.all, "student"] as const,
  employer: () => [...REVIEW_KEYS.all, "employer"] as const,
  application: (applicationId: string) =>
    [...REVIEW_KEYS.all, "application", applicationId] as const,
};

// ============================================
// SAVED JOBS
// ============================================

export const SAVED_JOB_KEYS = {
  all: ["saved-jobs"] as const,
  list: () => [...SAVED_JOB_KEYS.all, "list"] as const,
  ids: () => [...SAVED_JOB_KEYS.all, "ids"] as const,
};

// ============================================
// WORK HISTORY
// ============================================

export const WORK_HISTORY_KEYS = {
  all: ["work-history"] as const,
  student: () => [...WORK_HISTORY_KEYS.all, "student"] as const,
  application: (applicationId: string) =>
    [...WORK_HISTORY_KEYS.all, "application", applicationId] as const,
};

// ============================================
// ADMIN
// ============================================

export const ADMIN_KEYS = {
  all: ["admin"] as const,
  dashboard: () => [...ADMIN_KEYS.all, "dashboard"] as const,
  users: (role?: string, keyword?: string) =>
    [...ADMIN_KEYS.all, "users", role ?? "ALL", keyword ?? ""] as const,
  jobs: (status?: string) =>
    [...ADMIN_KEYS.all, "jobs", status ?? "ALL"] as const,
  categories: () => [...ADMIN_KEYS.all, "categories"] as const,
  /**
   * Trạng thái tính năng kiểm duyệt AI.
   *
   * <p>Backend tự trả `enabled = false` khi thiếu khoá API -> frontend ẩn
   * nút "Kiểm tra bằng AI" thay vì báo lỗi cho quản trị viên.
   */
  aiStatus: () => [...ADMIN_KEYS.all, "ai-status"] as const,
  /** Bảng xếp hạng lương theo ngành × tỉnh — để so lương tin với thị trường. */
  benchmarks: () => [...ADMIN_KEYS.all, "salary-benchmarks"] as const,
  /** Điểm uy tín nhà tuyển dụng — để quản trị viên cân nhắc khi duyệt tin. */
  employerTrust: (id: string) =>
    [...ADMIN_KEYS.all, "employer-trust", id] as const,
};

// ============================================
// FILES
// ============================================

export const FILE_KEYS = {
  all: ["files"] as const,
};

// ============================================
// NOTIFICATIONS
// ============================================

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (unreadOnly?: boolean) =>
    ["notifications", "list", unreadOnly] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  /** Tuỳ chọn "Bật thông báo" tin tuyển dụng. */
  jobNotify: ["notifications", "job-notify"] as const,
};
