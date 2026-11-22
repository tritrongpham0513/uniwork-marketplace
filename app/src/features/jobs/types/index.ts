// ============================================
// TYPES CHO FEATURE JOBS
// Nguồn sự thật: @/features/shared/types — file này chỉ re-export
// để giữ import path cũ (@/features/jobs/types) hoạt động.
// ============================================

import type {
  EmploymentType,
  Job,
  WorkMode,
} from "@/features/shared/types";

// ---- Types ----
export type {
  ApplicationStatus,
  DayOfWeek,
  District,
  EmployerSummary,
  EmploymentType,
  Job,
  JobCategory,
  JobLocation,
  JobPosition,
  JobSchedule,
  JobStatus,
  Province,
  SalaryBenchmark,
  SalaryComparison,
  SalaryType,
  Skill,
  Ward,
  WorkMode,
} from "@/features/shared/types";

// ---- Constants (giá trị, không phải type) ----
export {
  APPLICATION_STATUS_LABELS,
  DAY_OF_WEEK_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  SALARY_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/features/shared/types";

// ============================================
// QUERY / FILTER
// ============================================

export type JobSort = "newest" | "salary_desc" | "salary_asc" | "popular";

/**
 * Đơn vị lương dùng để hiển thị & lọc (Chốt Ca cho phép chọn
 * giờ / ngày / tuần / tháng). "HOURLY" là mặc định.
 */
export type SalaryUnit = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";

export const SALARY_UNIT_LABELS: Record<SalaryUnit, string> = {
  HOURLY: "đồng/giờ",
  DAILY: "đồng/ngày",
  WEEKLY: "đồng/tuần",
  MONTHLY: "đồng/tháng",
};

/** Số giờ quy ước cho từng đơn vị — dùng để quy đổi về đồng/giờ */
export const HOURS_PER_SALARY_UNIT: Record<SalaryUnit, number> = {
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
};

export interface JobFilters {
  keyword: string;
  categoryIds: string[];
  positionIds: string[];
  provinceIds: string[];
  districtIds: string[];
  /** Mã xã/phường (5 chữ số) — cấp hành chính chính thức từ 01/07/2025 */
  wardIds: string[];
  employmentTypes: EmploymentType[];
  workModes: WorkMode[];
  /** Đơn vị lương đang chọn để hiển thị/lọc */
  salaryUnit: SalaryUnit;
  /** Khoảng lương tối thiểu theo `salaryUnit` */
  salaryMin: number;
  /** Khoảng lương tối đa theo `salaryUnit` */
  salaryMax: number;
  sort: JobSort;
  page: number;
  pageSize: number;
}
export interface JobListResponse {
  items: Job[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}
