// ============================================
// DOMAIN TYPES — nguồn sự thật duy nhất cho toàn bộ app
// Nguồn: entity JPA của backend (com.uniwork.entity.*)
// Lưu ý: file này KHÔNG import từ features/jobs để tránh vòng tròn phụ thuộc.
//        features/jobs/types sẽ re-export lại từ đây.
// ============================================

export type {
  ApiError,
  ApiErrorKind,
  ApiResponse,
  ErrorResponse,
  FieldErrorDetail,
} from "@/features/auth/types";

// ============================================
// ENUMS — mirror trực tiếp giá trị trong DB
// ============================================

export type RoleType = "STUDENT" | "EMPLOYER" | "ADMIN";
export type EmployerType = "COMPANY" | "INDIVIDUAL";
export type UserStatus = "ACTIVE" | "PENDING_VERIFY" | "LOCKED";
export type AuthProvider = "LOCAL" | "GOOGLE";
export type GenderType = "MALE" | "FEMALE" | "OTHER";

/** Hình thức làm việc */
export type WorkMode = "ONSITE" | "REMOTE" | "HYBRID";

/** Kiểu trả lương */
export type SalaryType =
  | "HOURLY"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "PER_TASK"
  | "NEGOTIABLE";

/** Loại hình làm việc */
export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "FLEXIBLE"
  | "CASUAL";

/** Trạng thái tin tuyển dụng */
export type JobStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "OPEN"
  | "FILLED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED";

/** Trạng thái đơn ứng tuyển */
export type ApplicationStatus =
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "COMPLETED"
  | "REJECTED"
  | "WITHDRAWN";

/** Ca làm trong tuần — 1: Thứ 2 ... 7: Chủ nhật */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ReviewTargetType = "EMPLOYER" | "STUDENT";

export type NotificationType =
  | "APPLICATION"
  | "APPLICATION_STATUS"
  | "JOB"
  | "REVIEW"
  | "SYSTEM";

// ============================================
// MASTER DATA
// ============================================

/** Nhóm việc (ngành nghề) — mirror bảng `job_categories` */
export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Icon lucide dùng để hiển thị (tên component) */
  icon: string;
  jobCount: number;
  isActive: boolean;
  sortOrder: number;
}

/** Vị trí công việc — chi tiết hơn nhóm việc (mô phỏng bảng `job_positions`) */
export interface JobPosition {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  jobCount: number;
}

export interface Province {
  id: string;
  name: string;
}

export interface District {
  id: string;
  provinceId: string;
  name: string;
}

/**
 * Xã / phường / đặc khu — cấp hành chính chính thức từ 01/07/2025
 * (Quyết định 19/2025/QĐ-TTg bỏ cấp huyện).
 *
 * `id` là mã đơn vị hành chính 5 chữ số (ví dụ "00004" = Phường Ba Đình).
 */
export interface Ward {
  id: string;
  provinceId: string;
  /** Tên đầy đủ (ví dụ "Phường Ba Đình") */
  name: string;
  /** Tên ngắn (ví dụ "Ba Đình") */
  shortName: string;
  /** Slug không dấu (ví dụ "ba_dinh") */
  slug: string;
}

export interface Skill {
  id: string;
  name: string;
}

// ============================================
// ENTITY — JOB
// ============================================

export interface JobSchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface JobLocation {
  provinceId: string;
  province: string;
  /**
   * Quận/huyện (cấp cũ — vẫn trả để tương thích ngược).
   *
   * Từ 01/07/2025 cấp huyện bị bỏ → form đăng tin chỉ chọn xã/phường, nên
   * 2 trường này **có thể null**. Backend `JobUpsertRequest.LocationRef` cũng
   * cho phép null → khớp với hợp đồng thực tế.
   */
  districtId?: string | null;
  district?: string | null;
  /** Mã xã/phường (5 chữ số) — cấp hành chính chính thức từ 01/07/2025 */
  wardId: string;
  /** Tên xã/phường (ví dụ "Phường Ba Đình") */
  ward: string;
  address: string;
  /** Tên chi nhánh / địa điểm cụ thể (Chốt Ca: "Chi nhánh chính") */
  branchName: string | null;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  category: JobCategory;
  /** Vị trí công việc chi tiết (lồng trong nhóm việc) */
  position: JobPosition | null;
  employer: EmployerSummary;
  employmentType: EmploymentType;
  workMode: WorkMode;
  salaryType: SalaryType;
  salaryMin: number;
  salaryMax: number | null;
  location: JobLocation;
  positionsCount: number;
  positionsFilled: number;
  schedules: JobSchedule[];
  skills: Skill[];
  status: JobStatus;
  postedAt: string;
  deadline: string | null;
  applicantCount: number;
  isUrgent: boolean;
  /** Số lượt xem tin (Viecoday hiển thị "Địa điểm · Báo cáo") */
  viewCount: number;
  /** Người đăng — dùng cho phân quyền NTD */
  employerId: string;
}

// ============================================
// EMPLOYER
// ============================================

export interface EmployerSummary {
  id: string;
  name: string;
  /** Màu nền avatar dạng token-safe (dùng class, không dùng hex thẳng) */
  logoVariant: "primary" | "secondary" | "muted" | "accent";
  /** URL logo tổ chức — null nếu chưa tải logo lên */
  logoUrl: string | null;
  verified: boolean;
}

/** Hồ sơ nhà tuyển dụng — mirror `EmployerProfile` */
export interface EmployerProfile {
  id: string;
  userId: number;
  employerType: EmployerType;
  displayName: string;
  contactName: string;
  contactPhone: string;
  taxCode: string | null;
  description: string;
  logoUrl: string | null;
  website: string | null;
  provinceId: string | null;
  address: string;
  isVerified: boolean;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
}

// ============================================
// STUDENT
// ============================================

export interface StudentExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

/**
 * Kinh nghiệm làm việc do hệ thống tự ghi nhận.
 *
 * <p>Mỗi lần nhà tuyển dụng đánh dấu đơn ứng tuyển là `COMPLETED`, VieJob
 * tự tạo 1 mục kinh nghiệm cho ứng viên — nhà tuyển dụng khác có thể xem
 * để đánh giá uy tín người ứng tuyển.
 */
export interface WorkHistory {
  id: string;
  /** Id hồ sơ sinh viên (slug) — dùng để lọc theo ứng viên */
  studentId: string;
  /** Slug của đơn ứng tuyển đã sinh ra kinh nghiệm này */
  applicationId: string | null;
  /** Slug của tin tuyển dụng (null nếu tin đã bị xoá) */
  jobId: string | null;
  /** Tên tin tuyển dụng tại thời điểm hoàn thành */
  jobTitle: string;
  /** Tên nhà tuyển dụng tại thời điểm hoàn thành */
  companyName: string;
  /** Chức danh tại thời điểm hoàn thành */
  positionName: string;
  /** Thời điểm bắt đầu làm việc (ISO-8601) */
  startedAt: string | null;
  /** Thời điểm hoàn thành công việc (ISO-8601) */
  completedAt: string;
  salaryType: SalaryType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  /** Ghi chú của nhà tuyển dụng khi đánh dấu hoàn thành */
  note: string | null;
  /** Điểm đánh giá (1–5) nếu đã có đánh giá */
  rating: number | null;
}

export interface StudentJobPreference {
  categoryIds: string[];
  employmentTypes: EmploymentType[];
  salaryMin: number;
  salaryMax: number;
  provinceIds: string[];
}

/** Hồ sơ sinh viên — mirror `StudentProfile` */
export interface StudentProfile {
  id: string;
  userId: number;
  fullName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: GenderType | null;
  studentCode: string;
  university: string;
  major: string;
  yearOfStudy: number | null;
  provinceId: string | null;
  address: string;
  bio: string;
  avatarUrl: string | null;
  cvUrl: string | null;
  /** Tên file CV gốc do backend trả về (để hiển thị). */
  cvFileName: string | null;
  /**
   * MIME type thật của CV (đã xác minh bằng magic bytes lúc upload).
   *
   * <p>Dùng để biết có render nội dung PDF trực tiếp hay chỉ cho tải xuống
   * (DOC/DOCX không render được trong trình duyệt).
   */
  cvMimeType: string | null;
  skills: string[];
  experiences: StudentExperience[];
  /** Lịch sử làm việc do hệ thống tự ghi nhận (đơn ứng tuyển hoàn thành) */
  workHistories: WorkHistory[];
  jobPreferences: StudentJobPreference;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
}

// ============================================
// USER
// ============================================

export interface UserSummaryResponse {
  id: number;
  email: string;
  role: RoleType;
  fullName: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  authProvider: AuthProvider;
  /**
   * Ảnh đại diện của người dùng.
   * Sinh viên → avatar; nhà tuyển dụng → logo tổ chức. Null nếu chưa có ảnh.
   */
  avatarUrl: string | null;
}

/** User đầy đủ cho màn hình quản trị */
export interface AdminUser extends UserSummaryResponse {
  phone: string;
  companyName: string | null;
  university: string | null;
  isLocked: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  totalApplications: number;
  totalJobs: number;
}

// ============================================
// APPLICATION (ĐƠN ỨNG TUYỂN)
// ============================================

export interface ApplicationStatusEvent {
  status: ApplicationStatus;
  at: string;
  note: string | null;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  employerId: string;
  employerName: string;
  employerLogoVariant: EmployerSummary["logoVariant"];
  /** Logo tổ chức — ảnh đại diện của nhà tuyển dụng (null nếu chưa có logo). */
  employerLogoUrl: string | null;
  employerVerified: boolean;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string | null;
  studentUniversity: string;
  studentMajor: string;
  studentYear: number | null;
  studentPhone: string;
  studentEmail: string;
  studentSkills: string[];
  studentBio: string;
  cvUrl: string | null;
  cvFileName: string | null;
  /**
   * MIME type thật của CV (đã xác minh bằng magic bytes lúc upload).
   *
   * <p>Dùng để biết có render nội dung PDF trực tiếp hay chỉ cho tải xuống
   * (DOC/DOCX không render được trong trình duyệt).
   */
  cvMimeType: string | null;
  coverLetter: string;
  expectedSalary: number | null;
  /** Kinh nghiệm liên quan do sinh viên khai báo khi ứng tuyển */
  experience: string;
  /** Ngày có thể bắt đầu làm việc */
  availableFrom: string | null;
  status: ApplicationStatus;
  employerNote: string | null;
  timeline: ApplicationStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REVIEW (ĐÁNH GIÁ 2 CHIỀU)
// ============================================

export interface Review {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  applicationId: string | null;
  fromUserId: number;
  fromRole: RoleType;
  fromName: string;
  fromAvatarUrl: string | null;
  targetType: ReviewTargetType;
  targetUserId: number;
  targetName: string;
  rating: number;
  comment: string;
  /** Phản hồi của người BỊ đánh giá (reviewee) */
  reply: string | null;
  /** Phản hồi của người VIẾT đánh giá (reviewer) — đánh giá 2 chiều */
  reviewerReply: string | null;
  isHidden: boolean;
  createdAt: string;
}

// ============================================
// NOTIFICATION
// ============================================

export interface Notification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

// ============================================
// SAVED JOB
// ============================================

export interface SavedJob {
  id: string;
  jobId: string;
  userId: number;
  createdAt: string;
}

// ============================================
// SALARY BENCHMARK — "XẾP HẠNG LƯƠNG" (Viecoday)
// ============================================

export interface SalaryBenchmark {
  categoryId: string;
  provinceId: string;
  avgHourly: number;
  minHourly: number;
  maxHourly: number;
  sampleSize: number;
  updatedAt: string;
}

/** Kết quả so sánh lương của 1 tin tuyển dụng với benchmark */
export interface SalaryComparison {
  benchmark: SalaryBenchmark;
  /**
   * Phần trăm xếp hạng, hiển thị dạng "Top X%".
   *
   * <p>Nghĩa: mức lương này **cao hơn (100 − X)%** tin cùng nhóm. Số nhỏ =
   * lương càng cao. Cụ thể: `percentile = 93` → "Top 93%" (thấp hơn trung
   * bình), `percentile = 8` → "Top 8%" (cao hơn trung bình).
   */
  percentile: number;
  /** "Cao hơn trung bình" | "Thấp hơn trung bình" | "Trung bình" */
  verdict: "ABOVE" | "BELOW" | "AVERAGE";
  /** Chênh lệch (đ/giờ) so với trung bình */
  diff: number;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ============================================
// CONSTANTS
// ============================================

export const GENDER_LABELS: Record<GenderType, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  FLEXIBLE: "Thoáng / Linh hoạt",
  CASUAL: "Thời vụ",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ONSITE: "Tại địa điểm",
  REMOTE: "Từ xa",
  HYBRID: "Linh hoạt",
};

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  HOURLY: "Theo giờ",
  DAILY: "Theo ngày",
  WEEKLY: "Theo tuần",
  MONTHLY: "Theo tháng",
  PER_TASK: "Theo tác vụ",
  NEGOTIABLE: "Thỏa thuận",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Bị từ chối",
  OPEN: "Đang tuyển",
  FILLED: "Đã nhận người",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã huỷ",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Đang chờ",
  SHORTLISTED: "Được duyệt sơ bộ",
  ACCEPTED: "Đã nhận",
  COMPLETED: "Hoàn thành",
  REJECTED: "Không phù hợp",
  WITHDRAWN: "Đã rút",
};

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

export const EMPLOYER_TYPE_LABELS: Record<EmployerType, string> = {
  COMPANY: "Doanh nghiệp",
  INDIVIDUAL: "Cá nhân",
};

export const REVIEW_TARGET_LABELS: Record<ReviewTargetType, string> = {
  EMPLOYER: "Nhà tuyển dụng",
  STUDENT: "Sinh viên",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  APPLICATION: "Ứng tuyển mới",
  APPLICATION_STATUS: "Cập nhật đơn ứng tuyển",
  JOB: "Tin tuyển dụng",
  REVIEW: "Đánh giá",
  SYSTEM: "Hệ thống",
};
