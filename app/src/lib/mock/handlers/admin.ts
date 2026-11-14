import type {
  AdminUser,
  Job,
  JobCategory,
  SalaryBenchmark,
} from "@/features/shared/types";
import { getDb, nextId } from "../db";
import { badRequest, notFound } from "../errors";
import { JOB_CATEGORIES, PROVINCES } from "@/mocks/categories";
import { DISTRICTS } from "@/mocks/districts";
import { SALARY_BENCHMARKS } from "@/mocks/salary-benchmarks";
import { SKILLS } from "@/mocks/skills";
import { toAdminUser } from "@/mocks/users";

// ============================================
// ADMIN
// ============================================

export const adminHandlers = {
  /**
   * GET /api/v1/admin/dashboard — số liệu tổng quan hệ thống.
   */
  dashboard() {
    const db = getDb();
    const jobs = db.jobs;

    return {
      totalUsers: db.users.length,
      totalStudents: db.users.filter((u) => u.role === "STUDENT").length,
      totalEmployers: db.users.filter((u) => u.role === "EMPLOYER").length,
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "OPEN").length,
      pendingJobs: jobs.filter((j) => j.status === "PENDING_REVIEW").length,
      totalApplications: db.applications.length,
      pendingApplications: db.applications.filter(
        (a) => a.status === "PENDING"
      ).length,
      hiddenReviews: db.reviews.filter((r) => r.isHidden).length,
      categories: db.categories.length,
    };
  },

  /**
   * GET /api/v1/admin/users
   */
  listUsers(query: { role?: string; keyword?: string }): AdminUser[] {
    const db = getDb();
    const keyword = (query.keyword ?? "").trim().toLowerCase();

    return db.users
      .map((user) =>
        toAdminUser(
          user,
          db.jobs.filter((j) => {
            const employer = db.employerProfiles.find(
              (e) => e.userId === user.id
            );
            return employer ? j.employerId === employer.id : false;
          }).length,
          db.applications.filter((a) => {
            const profile = db.studentProfiles.find((p) => p.userId === user.id);
            return profile ? a.studentId === profile.id : false;
          }).length
        )
      )
      .filter((u) => {
        if (query.role && query.role !== "ALL" && u.role !== query.role) {
          return false;
        }
        if (keyword) {
          const haystack = `${u.fullName} ${u.email}`.toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        return true;
      });
  },

  /**
   * PATCH /api/v1/admin/users/{id} — khoá/mở khoá, đổi role.
   */
  updateUser(
    id: string,
    body: { isLocked?: boolean; role?: AdminUser["role"] }
  ): AdminUser {
    const db = getDb();
    const user = db.users.find((u) => String(u.id) === String(id));
    if (!user) throw notFound("Không tìm thấy người dùng.");

    if (body.isLocked !== undefined) {
      user.isLocked = body.isLocked;
      user.status = body.isLocked ? "LOCKED" : "ACTIVE";
    }
    if (body.role) user.role = body.role;

    return toAdminUser(user);
  },

  /**
   * GET /api/v1/admin/categories
   */
  listCategories(): JobCategory[] {
    const db = getDb();
    return db.categories.map((c) => ({
      ...c,
      jobCount: db.jobs.filter((j) => j.category.id === c.id).length,
    }));
  },

  /**
   * POST /api/v1/admin/categories — tạo nhóm việc.
   */
  createCategory(body: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
  }): JobCategory {
    const db = getDb();

    if (!body.name?.trim()) {
      throw badRequest("Tên nhóm việc là bắt buộc.", [
        { field: "name", message: "Vui lòng nhập tên nhóm việc" },
      ]);
    }

    const slug =
      body.slug?.trim() ||
      body.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    if (db.categories.some((c) => c.slug === slug)) {
      throw badRequest("Slug đã tồn tại. Vui lòng chọn tên khác.", [
        { field: "slug", message: "Slug đã tồn tại" },
      ]);
    }

    const category: JobCategory = {
      id: nextId("cat"),
      name: body.name.trim(),
      slug,
      description: body.description?.trim() ?? "",
      icon: body.icon ?? "Briefcase",
      jobCount: 0,
      isActive: true,
      sortOrder: db.categories.length + 1,
    };

    db.categories.push(category);
    return category;
  },

  /**
   * PUT /api/v1/admin/categories/{id} — cập nhật nhóm việc.
   */
  updateCategory(id: string, body: Partial<JobCategory>): JobCategory {
    const db = getDb();
    const category = db.categories.find((c) => c.id === id);
    if (!category) throw notFound("Không tìm thấy nhóm việc.");

    if (body.name?.trim()) category.name = body.name.trim();
    if (body.description !== undefined) {
      category.description = body.description.trim();
    }
    if (body.icon) category.icon = body.icon;
    if (body.isActive !== undefined) category.isActive = body.isActive;

    return category;
  },

  /**
   * DELETE /api/v1/admin/categories/{id} — xoá mềm (khoá nhóm việc).
   */
  removeCategory(id: string): JobCategory {
    const db = getDb();
    const category = db.categories.find((c) => c.id === id);
    if (!category) throw notFound("Không tìm thấy nhóm việc.");

    const usedBy = db.jobs.some((j) => j.category.id === id);
    if (usedBy) {
      category.isActive = false;
      return category;
    }

    db.categories.splice(db.categories.indexOf(category), 1);
    return category;
  },

  /**
   * GET /api/v1/admin/jobs — danh sách tin cần duyệt.
   */
  listJobs(status?: string): Job[] {
    const db = getDb();
    return db.jobs.filter((j) => {
      if (!status || status === "ALL") return true;
      return j.status === status;
    });
  },
};

// ============================================
// META / MASTER DATA
// ============================================

export const metaHandlers = {
  /** GET /api/v1/public/categories */
  categories(): JobCategory[] {
    return getDb().categories.filter((c) => c.isActive);
  },

  /** GET /api/v1/public/positions */
  positions() {
    return getDb().positions;
  },

  /** GET /api/v1/public/provinces */
  provinces() {
    return PROVINCES;
  },

  /** GET /api/v1/public/districts?provinceId= */
  districts(provinceId?: string) {
    if (!provinceId) return DISTRICTS;
    return DISTRICTS.filter((d) => d.provinceId === provinceId);
  },

  /** GET /api/v1/public/salary-benchmarks */
  salaryBenchmarks(): SalaryBenchmark[] {
    return SALARY_BENCHMARKS;
  },

  /** GET /api/v1/public/skills */
  skills() {
    return SKILLS;
  },

  /** GET /api/v1/public/categories-reference */
  categoriesReference() {
    return JOB_CATEGORIES;
  },
};
