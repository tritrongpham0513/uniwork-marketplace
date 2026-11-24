import type {
  Job,
  JobFilters,
  JobListResponse,
  JobPosition,
  JobCategory,
  Province,
  District,
  Skill,
  Ward,
  SalaryBenchmark,
} from "@/features/jobs/types";
import { HOURS_PER_SALARY_UNIT } from "@/features/jobs/types";
import type { ApiResponse } from "@/features/shared/types";
import { axiosInstance } from "@/lib/axios";

// ============================================
// HELPERS
// ============================================

/** Đơn vị lương hiển thị: đồng / giờ */
export const HOURLY_MAX = 200000;

/**
 * Chuyển bộ lọc của UI sang query string của API.
 *
 * Khoảng lương luôn được gửi theo đồng/giờ (API quy đổi chung),
 * đồng thời gửi kèm `salaryUnit` để API hiểu người dùng đang
 * xem/lọc theo đơn vị nào (giờ / ngày / tuần / tháng).
 */
export const buildJobQuery = (
  filters: JobFilters
): Record<string, string | number> => {
  const unit = filters.salaryUnit ?? "HOURLY";
  const hours = HOURS_PER_SALARY_UNIT[unit];

  return {
    keyword: filters.keyword || undefined,
    categoryIds: filters.categoryIds.join(",") || undefined,
    positionIds: filters.positionIds.join(",") || undefined,
    provinceIds: filters.provinceIds.join(",") || undefined,
    districtIds: filters.districtIds.join(",") || undefined,
    wardIds: filters.wardIds.join(",") || undefined,
    employmentTypes: filters.employmentTypes.join(",") || undefined,
    workModes: filters.workModes.join(",") || undefined,
    salaryUnit: unit,
    salaryMin: Math.round((filters.salaryMin ?? 0) / hours),
    salaryMax: Math.round((filters.salaryMax ?? HOURLY_MAX) / hours),
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
  } as Record<string, string | number>;
};

// ============================================
// SERVICE
// ============================================

export const jobsService = {
  /**
   * GET /api/v1/jobs/public — danh sách tin tuyển dụng (lọc + phân trang).
   */
  async list(filters: JobFilters): Promise<JobListResponse> {
    const response = await axiosInstance.get<ApiResponse<JobListResponse>>(
      "/api/v1/jobs/public",
      { params: buildJobQuery(filters) }
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/jobs/public/{id} — chi tiết một tin tuyển dụng.
   */
  async detail(id: string): Promise<Job> {
    const response = await axiosInstance.get<ApiResponse<Job>>(
      `/api/v1/jobs/public/${id}`
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/jobs/public/related — tin gợi ý cùng nhóm việc.
   */
  async related(categoryId: string, excludeId: string): Promise<Job[]> {
    const response = await axiosInstance.get<ApiResponse<Job[]>>(
      "/api/v1/jobs/public/related",
      { params: { categoryId, excludeId, limit: 6 } }
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/categories — nhóm việc.
   */
  async categories(): Promise<JobCategory[]> {
    const response = await axiosInstance.get<ApiResponse<JobCategory[]>>(
      "/api/v1/public/categories"
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/positions — vị trí công việc.
   */
  async positions(): Promise<JobPosition[]> {
    const response = await axiosInstance.get<ApiResponse<JobPosition[]>>(
      "/api/v1/public/positions"
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/provinces — tỉnh/thành phố.
   */
  async provinces(): Promise<Province[]> {
    const response = await axiosInstance.get<ApiResponse<Province[]>>(
      "/api/v1/public/provinces"
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/districts — quận/huyện (lọc theo tỉnh).
   */
  async districts(provinceId?: string): Promise<District[]> {
    const response = await axiosInstance.get<ApiResponse<District[]>>(
      "/api/v1/public/districts",
      { params: provinceId ? { provinceId } : undefined }
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/wards — xã/phường/đặc khu (lọc theo tỉnh).
   *
   * Cấp hành chính chính thức từ 01/07/2025 (Quyết định 19/2025/QĐ-TTg bỏ cấp huyện).
   */
  async wards(provinceId?: string): Promise<Ward[]> {
    const response = await axiosInstance.get<ApiResponse<Ward[]>>(
      "/api/v1/public/wards",
      { params: provinceId ? { provinceId } : undefined }
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/skills — danh sách kỹ năng.
   */
  async skills(): Promise<Skill[]> {
    const response = await axiosInstance.get<ApiResponse<Skill[]>>(
      "/api/v1/public/skills"
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/public/salary-benchmarks — xếp hạng lương theo ngành × tỉnh.
   */
  async salaryBenchmarks(): Promise<SalaryBenchmark[]> {
    const response = await axiosInstance.get<ApiResponse<SalaryBenchmark[]>>(
      "/api/v1/public/salary-benchmarks"
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/jobs/meta — dữ liệu master data gộp cho bộ lọc.
   */
  async meta() {
    const [categories, provinces] = await Promise.all([
      this.categories(),
      this.provinces(),
    ]);
    return {
      categories,
      provinces,
      salaryBounds: { min: 0, max: HOURLY_MAX },
    };
  },
};

export default jobsService;
