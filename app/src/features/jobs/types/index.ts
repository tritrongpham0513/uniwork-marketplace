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

export interface JobFilters {
  keyword: string;
  categoryIds: string[];
  positionIds: string[];
  provinceIds: string[];
  districtIds: string[];
  employmentTypes: EmploymentType[];
  workModes: WorkMode[];
  /** Khoảng lương tối thiểu theo đơn vị hiển thị (đ/giờ) */
  salaryMin: number;
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
