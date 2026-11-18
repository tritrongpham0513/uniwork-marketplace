import type {
  EmploymentType,
  Job,
  JobListResponse,
  SalaryType,
  WorkMode,
} from "@/features/jobs/types";
import { getDb, nextId, nowIso } from "../db";
import { badRequest, notFound } from "../errors";

// ============================================
// HELPERS
// ============================================

/** Số giờ làm việc quy ước cho từng kiểu trả lương, dùng để quy đổi về đ/giờ */
export const HOURS_PER_UNIT: Record<SalaryType, number> = {
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
  PER_TASK: 3,
  NEGOTIABLE: 0,
};

/** Quy đổi mức lương về đồng/giờ để so sánh & lọc nhất quán */
export const toHourly = (
  job: Pick<Job, "salaryType" | "salaryMin" | "salaryMax">
): number => {
  if (job.salaryType === "NEGOTIABLE") return 0;
  return job.salaryMin / HOURS_PER_UNIT[job.salaryType];
};

/** Quy đổi mức lương tối đa về đồng/giờ */
export const toHourlyMax = (
  job: Pick<Job, "salaryType" | "salaryMin" | "salaryMax">
): number => {
  if (job.salaryType === "NEGOTIABLE") return 0;
  const hourlyMin = toHourly(job);
  if (job.salaryMax == null) return hourlyMin;
  return job.salaryMax / HOURS_PER_UNIT[job.salaryType];
};

// ============================================
// QUERY PARAMS
// ============================================

export interface JobQuery {
  keyword?: string;
  categoryIds?: string;
  positionIds?: string;
  provinceIds?: string;
  districtIds?: string;
  employmentTypes?: string;
  workModes?: string;
  salaryMin?: string | number;
  salaryMax?: string | number;
  /** Đơn vị lương người dùng đang xem: giờ / ngày / tuần / tháng */
  salaryUnit?: string;
  sort?: string;
  page?: string | number;
  pageSize?: string | number;
  status?: string;
  employerId?: string;
}

/** Đọc 1 danh sách id từ query string ("a,b,c") */
const readList = (value?: string | number): string[] =>
  value === undefined || value === null
    ? []
    : String(value)
        .split(",")
        .filter(Boolean);

const readNumber = (
  value: string | number | undefined,
  fallback: number
): number => {
  if (value === undefined || value === null) return fallback;
  const raw = String(value).trim();
  if (raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ============================================
// FILTER & SORT
// ============================================

const matchesSalary = (
  job: Job,
  salaryMin: number,
  salaryMax: number
): boolean => {
  if (job.salaryType === "NEGOTIABLE") return true;
  const min = toHourly(job);
  const max = toHourlyMax(job);
  return max >= salaryMin && min <= salaryMax;
};

const sortJobs = (jobs: Job[], sort: string): Job[] => {
  const list = [...jobs];
  switch (sort) {
    case "salary_desc":
      return list.sort((a, b) => toHourly(b) - toHourly(a));
    case "salary_asc":
      return list.sort((a, b) => toHourly(a) - toHourly(b));
    case "popular":
      return list.sort((a, b) => b.viewCount - a.viewCount);
    case "newest":
    default:
      return list.sort(
        (a, b) =>
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      );
  }
};

// ============================================
// HANDLERS
// ============================================

export const jobHandlers = {
  /**
   * GET /api/v1/jobs/public — danh sách tin tuyển dụng công khai.
   */
  list(query: JobQuery): JobListResponse {
    const db = getDb();
    const keyword = (query.keyword ?? "").trim().toLowerCase();

    const categoryIds = readList(query.categoryIds);
    const positionIds = readList(query.positionIds);
    const provinceIds = readList(query.provinceIds);
    const districtIds = readList(query.districtIds);
    const employmentTypes = readList(query.employmentTypes) as EmploymentType[];
    const workModes = readList(query.workModes) as WorkMode[];
    const salaryMin = readNumber(query.salaryMin, 0);
    const salaryMax = readNumber(query.salaryMax, 200000);

    const page = Math.max(1, readNumber(query.page, 1));
    const pageSize = Math.min(
      100,
      Math.max(1, readNumber(query.pageSize, 10))
    );

    const filtered = db.jobs.filter((job) => {
      // Chỉ hiện tin đang mở, trừ khi NTD/Admin xem theo trạng thái cụ thể
      if (!query.status && job.status !== "OPEN") return false;

      if (query.status && query.status !== "ALL" && job.status !== query.status) {
        return false;
      }

      if (query.employerId && job.employerId !== query.employerId) {
        return false;
      }

      if (categoryIds.length && !categoryIds.includes(job.category.id)) {
        return false;
      }

      if (
        positionIds.length &&
        (!job.position || !positionIds.includes(job.position.id))
      ) {
        return false;
      }

      if (provinceIds.length && !provinceIds.includes(job.location.provinceId)) {
        return false;
      }

      if (districtIds.length && !districtIds.includes(job.location.districtId)) {
        return false;
      }

      if (
        employmentTypes.length &&
        !employmentTypes.includes(job.employmentType)
      ) {
        return false;
      }

      if (workModes.length && !workModes.includes(job.workMode)) return false;

      if (!matchesSalary(job, salaryMin, salaryMax)) return false;

      if (keyword) {
        const haystack = [
          job.title,
          job.employer.name,
          job.category.name,
          job.position?.name ?? "",
          job.description,
          job.location.district,
          job.location.province,
          job.skills.map((s) => s.name).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      return true;
    });

    const sorted = sortJobs(filtered, query.sort ?? "newest");
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      totalItems,
      currentPage,
      totalPages,
    };
  },

  /**
   * GET /api/v1/jobs/public/{id} — chi tiết tin tuyển dụng.
   */
  detail(id: string): Job {
    const job = getDb().jobs.find((j) => j.id === id);
    if (!job) {
      throw notFound("Không tìm thấy tin tuyển dụng này.");
    }
    // Tăng bộ đếm lượt xem (khớp với backend)
    job.viewCount += 1;
    return job;
  },

  /**
   * GET /api/v1/jobs/public/related — tin cùng nhóm việc.
   */
  related(categoryId: string, excludeId: string, limit = 6): Job[] {
    return getDb()
      .jobs.filter((j) => j.status === "OPEN" && j.id !== excludeId)
      .sort((a, b) => {
        const aMatch = a.category.id === categoryId ? 1 : 0;
        const bMatch = b.category.id === categoryId ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      })
      .slice(0, limit);
  },

  /**
   * POST /api/v1/employer/jobs — tạo tin tuyển dụng.
   */
  create(body: Partial<Job>, employerId: string): Job {
    const db = getDb();

    if (!body.title?.trim()) {
      throw badRequest("Tiêu đề tin tuyển dụng là bắt buộc.", [
        { field: "title", message: "Vui lòng nhập tiêu đề tin" },
      ]);
    }

    if (!body.category?.id) {
      throw badRequest("Vui lòng chọn nhóm việc.", [
        { field: "categoryId", message: "Vui lòng chọn nhóm việc" },
      ]);
    }

    const now = nowIso();
    const job: Job = {
      id: nextId("job"),
      title: body.title.trim(),
      description: body.description ?? "",
      requirements: body.requirements ?? [],
      benefits: body.benefits ?? [],
      category: body.category,
      position: body.position ?? null,
      employer: body.employer ?? {
        id: employerId,
        name: "Nhà tuyển dụng",
        logoVariant: "primary",
        verified: false,
      },
      employmentType: body.employmentType ?? "PART_TIME",
      workMode: body.workMode ?? "ONSITE",
      salaryType: body.salaryType ?? "HOURLY",
      salaryMin: body.salaryMin ?? 0,
      salaryMax: body.salaryMax ?? null,
      location: body.location ?? {
        provinceId: "",
        province: "",
        districtId: "",
        district: "",
        address: "",
        branchName: null,
      },
      positionsCount: body.positionsCount ?? 1,
      positionsFilled: 0,
      schedules: body.schedules ?? [],
      skills: body.skills ?? [],
      // Tin mới luôn vào hàng đợi duyệt của Admin
      status: "PENDING_REVIEW",
      postedAt: now,
      deadline: body.deadline ?? null,
      applicantCount: 0,
      isUrgent: false,
      viewCount: 0,
      employerId,
    };

    db.jobs.unshift(job);

    // Cập nhật số tin đang tuyển của nhóm việc
    const category = db.categories.find((c) => c.id === job.category.id);
    if (category) category.jobCount += 1;

    return job;
  },

  /**
   * PUT /api/v1/employer/jobs/{id} — cập nhật tin tuyển dụng.
   */
  update(id: string, body: Partial<Job>, employerId: string): Job {
    const db = getDb();
    const index = db.jobs.findIndex((j) => j.id === id);

    if (index === -1) throw notFound("Không tìm thấy tin tuyển dụng này.");

    const existing = db.jobs[index];
    if (existing.employerId !== employerId) {
      throw notFound("Không tìm thấy tin tuyển dụng này.");
    }

    const updated: Job = {
      ...existing,
      ...body,
      id: existing.id,
      employerId: existing.employerId,
      employer: existing.employer,
      // Số suất đã tuyển chỉ được NTD chỉnh khi tin chưa có ứng viên được
      // nhận — khớp với hành vi backend.
      positionsFilled:
        body.positionsFilled !== undefined
          ? Math.min(body.positionsFilled, existing.positionsCount)
          : existing.positionsFilled,
      applicantCount: existing.applicantCount,
      viewCount: existing.viewCount,
      postedAt: existing.postedAt,
      // Sửa tin đã duyệt → quay lại hàng đợi duyệt
      status: existing.status === "OPEN" ? "PENDING_REVIEW" : existing.status,
    };

    db.jobs[index] = updated;
    return updated;
  },

  /**
   * DELETE /api/v1/employer/jobs/{id} — huỷ tin tuyển dụng.
   */
  remove(id: string, employerId: string): void {
    const db = getDb();
    const index = db.jobs.findIndex(
      (j) => j.id === id && j.employerId === employerId
    );
    if (index === -1) throw notFound("Không tìm thấy tin tuyển dụng này.");
    db.jobs.splice(index, 1);
  },

  /**
   * PATCH /api/v1/admin/jobs/{id}/review — duyệt / từ chối tin.
   */
  review(
    id: string,
    body: { action: "APPROVE" | "REJECT"; reason?: string }
  ): Job {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === id);
    if (!job) throw notFound("Không tìm thấy tin tuyển dụng này.");

    if (body.action === "APPROVE") {
      job.status = "OPEN";
      job.postedAt = nowIso();
    } else {
      job.status = "REJECTED";
    }

    return job;
  },
};
