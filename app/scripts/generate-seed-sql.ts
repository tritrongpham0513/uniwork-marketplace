/**
 * 🌱 Sinh file seed SQL cho backend từ đúng dataset mock của frontend.
 *
 * Mục tiêu: CSDL MySQL có **full parity** với `app/src/mocks/*` — cùng danh mục,
 * cùng vị trí công việc, cùng tỉnh/quận, cùng kỹ năng, cùng user, cùng tin tuyển
 * dụng, đơn ứng tuyển, đánh giá, thông báo và tin đã lưu.
 *
 * Chạy:
 *   pnpm seed:sql
 *
 * Output: backend/src/main/resources/db/migration/V3__seed_demo_data.sql
 *
 * Lưu ý:
 * - KHÔNG ghi mật khẩu plaintext. users.password_hash = 'SEED_PENDING', sau đó
 *   `DemoAccountInitializer` (backend) sẽ băm BCrypt theo vai trò.
 * - Mọi entity "public" (job, application, review, notification, saved job,
 *   student profile, employer profile) có cột `slug` mang **đúng string id**
 *   của mock — frontend dùng string id nên không cần mapping id ở tầng API.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  JOB_CATEGORIES,
  JOB_POSITIONS,
  PROVINCES,
} from "../src/mocks/categories";
import { DISTRICTS } from "../src/mocks/districts";
import { EMPLOYERS } from "../src/mocks/employers";
import { MOCK_JOBS } from "../src/mocks/jobs";
import { SALARY_BENCHMARKS } from "../src/mocks/salary-benchmarks";
import { SKILLS } from "../src/mocks/skills";
import {
  MOCK_EMPLOYER_PROFILES,
  MOCK_STUDENT_PROFILES,
  MOCK_USERS,
} from "../src/mocks/users";
import {
  MOCK_APPLICATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_REVIEWS,
} from "../src/mocks/applications";

// ============================================
// SQL HELPERS
// ============================================

const q = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const raw = String(value);
  if (raw === "") return "''";
  return `'${raw.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
};

const json = (value: unknown): string => q(JSON.stringify(value ?? null));

/** Chuỗi ISO -> datetime MySQL (không có timezone) */
const dt = (iso: string | null | undefined): string => {
  if (!iso) return "NULL";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "NULL";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `'${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}'`;
};

const dateOnly = (iso: string | null | undefined): string => {
  if (!iso) return "NULL";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "NULL";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `'${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}'`;
};

const lines: string[] = [];
const push = (line = ""): void => {
  lines.push(line);
};

// ============================================
// ID MAPS
// ============================================

const ROLE_ID: Record<string, number> = { STUDENT: 1, EMPLOYER: 2, ADMIN: 3 };

/** provinces.id */
const provinceId = new Map<string, number>();
PROVINCES.forEach((p, index) => provinceId.set(p.id, index + 1));

/** districts.id */
const districtId = new Map<string, number>();
DISTRICTS.forEach((d, index) => districtId.set(d.id, index + 1));

/** job_categories.id */
const categoryId = new Map<string, number>();
JOB_CATEGORIES.forEach((c, index) => categoryId.set(c.id, index + 1));

/** job_positions.id */
const positionId = new Map<string, number>();
JOB_POSITIONS.forEach((p, index) => positionId.set(p.id, index + 1));

/**
 * Kỹ năng: public id (`code`) chính là id của mock (ví dụ "sk-excel").
 * Mọi kỹ năng dùng trong tin tuyển dụng đều đã có trong SKILLS,
 * nên bảng `skills` giữ nguyên 16 dòng như mock.
 */
const skillRows: Array<{ id: number; name: string; code: string }> = [];
const skillId = new Map<string, number>();
const skillIdByName = new Map<string, number>();
const skillCodeByName = new Map<string, string>();

const ensureSkillByName = (name: string): number => {
  const key = name.trim().toLowerCase();
  const existing = skillIdByName.get(key);
  if (existing) return existing;
  const id = skillRows.length + 1;
  const code = `sk-${key
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
  skillRows.push({ id, name: name.trim(), code });
  skillIdByName.set(key, id);
  skillCodeByName.set(key, code);
  return id;
};

/** Kỹ năng trong danh mục chuẩn — public id chính là id của mock ("sk-barista") */
SKILLS.forEach((s) => {
  const key = s.name.trim().toLowerCase();
  const id = skillRows.length + 1;
  skillRows.push({ id, name: s.name.trim(), code: s.id });
  skillIdByName.set(key, id);
  skillCodeByName.set(key, s.id);
  skillId.set(s.id, id);
});

// Kỹ năng dùng trong tin tuyển dụng / hồ sơ sinh viên (pre-pass để INSERT đúng thứ tự)
MOCK_JOBS.forEach((job) => {
  job.skills.forEach((s) => ensureSkillByName(s.name));
});
MOCK_STUDENT_PROFILES.forEach((p) => {
  p.skills.forEach((s) => {
    if (skillId.has(s)) return;
    const matched = skillRows.find(
      (row) => row.code === s || row.name.toLowerCase() === s.toLowerCase()
    );
    skillId.set(s, matched ? matched.id : ensureSkillByName(s));
  });
});

/** users */
interface SeedUser {
  id: number;
  email: string;
  role: "STUDENT" | "EMPLOYER" | "ADMIN";
  fullName: string;
  status: "ACTIVE" | "PENDING_VERIFY" | "LOCKED";
  phone: string;
  createdAt: string;
  lastLoginAt: string | null;
}

const users = new Map<number, SeedUser>();
for (const u of MOCK_USERS) {
  users.set(u.id, {
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    status: u.status,
    phone: u.phone,
    createdAt: u.joinedAt,
    lastLoginAt: u.lastLoginAt,
  });
}

// Employer profile có thể trỏ tới user chưa tồn tại -> tự sinh.
MOCK_EMPLOYER_PROFILES.forEach((profile) => {
  if (users.has(profile.userId)) return;
  users.set(profile.userId, {
    id: profile.userId,
    email: `employer${profile.userId}@viejob.vn`,
    role: "EMPLOYER",
    fullName: profile.displayName,
    status: "ACTIVE",
    phone: profile.contactPhone || "0900 000 000",
    createdAt: profile.createdAt,
    lastLoginAt: null,
  });
});

const userIds = [...users.keys()].sort((a, b) => a - b);

/** job_posts.id (PK số) */
const jobPk = new Map<string, number>();
MOCK_JOBS.forEach((job, index) => jobPk.set(job.id, index + 1));

/** applications.id */
const applicationPk = new Map<string, number>();
MOCK_APPLICATIONS.forEach((app, index) => applicationPk.set(app.id, index + 1));

/** reviews.id */
const reviewPk = new Map<string, number>();
MOCK_REVIEWS.forEach((review, index) => reviewPk.set(review.id, index + 1));

/** notifications.id */
const notificationPk = new Map<string, number>();
MOCK_NOTIFICATIONS.forEach((n, index) => notificationPk.set(n.id, index + 1));

/** employer_profiles dùng user_id làm PK */
const employerUserId = new Map<string, number>();
MOCK_EMPLOYER_PROFILES.forEach((profile) =>
  employerUserId.set(profile.id, profile.userId)
);

/** student_profiles dùng user_id làm PK */
const studentUserId = new Map<string, number>();
MOCK_STUDENT_PROFILES.forEach((profile) =>
  studentUserId.set(profile.id, profile.userId)
);

/** logoVariant theo employer */
const employerLogoVariant = new Map<string, string>();
EMPLOYERS.forEach((e) => employerLogoVariant.set(e.id, e.logoVariant));

const logoVariantOf = (employerId: string): string =>
  employerLogoVariant.get(employerId) ?? "primary";

// ============================================
// HEADER
// ============================================

push("-- ---------------------------------------------------------------------");
push("-- V3 — DỮ LIỆU DEMO (sinh tự động từ app/src/mocks/*)");
push("--");
push("-- File này được sinh bởi `app/scripts/generate-seed-sql.ts`.");
push("-- KHÔNG sửa tay — hãy chạy lại `pnpm seed:sql` trong thư mục app/.");
push("--");
push("-- users.password_hash = 'SEED_PENDING' — DemoAccountInitializer sẽ băm");
push("-- BCrypt theo vai trò (STUDENT->Student@123, EMPLOYER->Employer@123,");
push("-- ADMIN->Admin@123) sau khi ứng dụng khởi động.");
push("--");
push("-- Cột `slug` giữ đúng string id của mock (job-001, app-001, emp-...)");
push("-- để frontend so khớp id không cần chuyển đổi.");
push("-- ---------------------------------------------------------------------");
push();
push("SET FOREIGN_KEY_CHECKS = 0;");
push();

// ============================================
// ROLES
// ============================================
push("-- 1. ROLES");
push(
  `INSERT INTO roles (id, code, name, description) VALUES ${[
    "(1, 'STUDENT', 'Sinh viên', 'Sinh viên tìm việc part-time')",
    "(2, 'EMPLOYER', 'Nhà tuyển dụng', 'Doanh nghiệp hoặc cá nhân đăng tin')",
    "(3, 'ADMIN', 'Quản trị viên', 'Quản lý hệ thống VieJob')",
  ].join(",\n       ")};`
);
push();

// ============================================
// PROVINCES / DISTRICTS
// ============================================
push("-- 2. TỈNH / THÀNH PHỐ (code = public id, ví dụ 'hcm')");
push(
  `INSERT INTO provinces (id, code, name) VALUES\n       ${PROVINCES.map(
    (p, i) => `(${i + 1}, ${q(p.id)}, ${q(p.name)})`
  ).join(",\n       ")};`
);
push();

push("-- 3. QUẬN / HUYỆN (code = public id, ví dụ 'q1')");
push(
  `INSERT INTO districts (id, province_id, code, name) VALUES\n       ${DISTRICTS.map(
    (d) =>
      `(${districtId.get(d.id)}, ${provinceId.get(d.provinceId)}, ${q(
        d.id
      )}, ${q(d.name)})`
  ).join(",\n       ")};`
);
push();

// ============================================
// JOB CATEGORIES / POSITIONS
// ============================================
push("-- 4. NHÓM VIỆC (code = public id, ví dụ 'cat-fnb')");
push(
  `INSERT INTO job_categories (id, code, parent_id, name, slug, description, icon, sort_order, is_active) VALUES\n       ${JOB_CATEGORIES.map(
    (c) =>
      `(${categoryId.get(c.id)}, ${q(c.id)}, NULL, ${q(c.name)}, ${q(
        c.slug
      )}, ${q(c.description)}, ${q(c.icon)}, ${c.sortOrder}, ${
        c.isActive ? 1 : 0
      })`
  ).join(",\n       ")};`
);
push();

push("-- 5. VỊ TRÍ CÔNG VIỆC (code = public id, ví dụ 'pos-phuc-vu')");
push(
  `INSERT INTO job_positions (id, code, category_id, name, slug, sort_order, is_active) VALUES\n       ${JOB_POSITIONS.map(
    (p, index) =>
      `(${positionId.get(p.id)}, ${q(p.id)}, ${categoryId.get(p.categoryId)}, ${q(
        p.name
      )}, ${q(p.slug)}, ${index + 1}, 1)`
  ).join(",\n       ")};`
);
push();

// ============================================
// SKILLS
// ============================================
push("-- 6. KỸ NĂNG (slug = public id, ví dụ 'sk-excel')");
push(
  `INSERT INTO skills (id, name, slug, is_active) VALUES\n       ${skillRows
    .map((s) => `(${s.id}, ${q(s.name)}, ${q(s.code)}, 1)`)
    .join(",\n       ")};`
);
push();

// ============================================
// USERS
// ============================================
push("-- 7. NGƯỜI DÙNG (mật khẩu sẽ được băm sau khi app khởi động)");
push(
  `INSERT INTO users (id, email, password_hash, role_id, status, email_verified_at, auth_provider, failed_login_count, last_login_at, created_at, updated_at) VALUES\n       ${userIds
    .map((id) => {
      const u = users.get(id)!;
      return `(${u.id}, ${q(u.email)}, 'SEED_PENDING', ${
        ROLE_ID[u.role]
      }, ${q(u.status)}, ${
        u.status === "ACTIVE" ? dt(u.createdAt) : "NULL"
      }, 'LOCAL', 0, ${dt(u.lastLoginAt)}, ${dt(u.createdAt)}, ${dt(
        u.createdAt
      )})`;
    })
    .join(",\n       ")};`
);
push();

// ============================================
// STUDENT PROFILES
// ============================================
push("-- 8. HỒ SƠ SINH VIÊN");
push(
  `INSERT INTO student_profiles (user_id, slug, full_name, phone, date_of_birth, gender, student_code, university, major, year_of_study, province_id, address, bio, avatar_url, cv_url, skills, avg_rating, rating_count, created_at, updated_at) VALUES\n       ${MOCK_STUDENT_PROFILES.map(
    (p) =>
      `(${p.userId}, ${q(p.id)}, ${q(p.fullName)}, ${q(p.phone)}, ${dateOnly(
        p.dateOfBirth
      )}, ${q(p.gender)}, ${q(p.studentCode)}, ${q(p.university)}, ${q(
        p.major
      )}, ${p.yearOfStudy ?? "NULL"}, ${
        p.provinceId ? provinceId.get(p.provinceId) ?? "NULL" : "NULL"
      }, ${q(p.address)}, ${q(p.bio)}, ${q(p.avatarUrl)}, ${q(p.cvUrl)}, ${json(
        p.skills.map(
          (s) =>
            skillRows.find(
              (row) => row.id === skillId.get(s) || row.code === s
            )?.code ?? s
        )
      )}, ${p.avgRating}, ${p.ratingCount}, ${dt(p.createdAt)}, ${dt(
        p.createdAt
      )})`
  ).join(",\n       ")};`
);
push();

push("-- 9. KINH NGHIỆM CỦA SINH VIÊN");
const experienceRows: string[] = [];
MOCK_STUDENT_PROFILES.forEach((p) => {
  p.experiences.forEach((exp, index) => {
    experienceRows.push(
      `(${p.userId}, ${q(exp.company)}, ${q(exp.position)}, ${dateOnly(
        exp.startDate
      )}, ${dateOnly(exp.endDate)}, ${q(exp.description)}, ${index + 1})`
    );
  });
});
if (experienceRows.length > 0) {
  push(
    `INSERT INTO student_experiences (student_id, company, position, start_date, end_date, description, sort_order) VALUES\n       ${experienceRows.join(
      ",\n       "
    )};`
  );
} else {
  push("-- (không có kinh nghiệm nào trong dataset mẫu)");
}
push();

push("-- 10. MỤC TIÊU VIỆC LÀM CỦA SINH VIÊN");
push(
  `INSERT INTO student_job_preferences (student_id, category_ids, employment_types, province_ids, salary_min, salary_max) VALUES\n       ${MOCK_STUDENT_PROFILES.map(
    (p) =>
      // `category_ids` / `province_ids` lưu public id dạng chuỗi
      // (job_categories.code / provinces.code) khớp với entity List<String>
      `(${p.userId}, ${json(p.jobPreferences.categoryIds)}, ${json(
        p.jobPreferences.employmentTypes
      )}, ${json(p.jobPreferences.provinceIds)}, ${
        p.jobPreferences.salaryMin
      }, ${p.jobPreferences.salaryMax})`
  ).join(",\n       ")};`
);
push();

// ============================================
// EMPLOYER PROFILES
// ============================================
push("-- 11. HỒ SƠ NHÀ TUYỂN DỤNG");
push(
  `INSERT INTO employer_profiles (user_id, slug, employer_type, display_name, contact_name, contact_phone, tax_code, description, logo_url, logo_variant, website, province_id, address, is_verified, avg_rating, rating_count, created_at, updated_at) VALUES\n       ${MOCK_EMPLOYER_PROFILES.map(
    (p) =>
      `(${p.userId}, ${q(p.id)}, ${q(p.employerType)}, ${q(p.displayName)}, ${q(
        p.contactName
      )}, ${q(p.contactPhone)}, ${q(p.taxCode)}, ${q(p.description)}, ${q(
        p.logoUrl
      )}, ${q(logoVariantOf(p.id))}, ${q(p.website)}, ${
        p.provinceId ? provinceId.get(p.provinceId) ?? "NULL" : "NULL"
      }, ${q(p.address)}, ${p.isVerified ? 1 : 0}, ${p.avgRating}, ${
        p.ratingCount
      }, ${dt(p.createdAt)}, ${dt(p.createdAt)})`
  ).join(",\n       ")};`
);
push();

// ============================================
// JOB POSTS
// ============================================
push("-- 12. TIN TUYỂN DỤNG");
const jobRows: string[] = [];
const scheduleRows: string[] = [];
const jobSkillRows: string[] = [];

MOCK_JOBS.forEach((job) => {
  const pk = jobPk.get(job.id)!;
  const employerPk = employerUserId.get(job.employerId) ?? 0;
  const catPk = categoryId.get(job.category.id) ?? 0;
  const posPk = job.position ? positionId.get(job.position.id) ?? null : null;
  const provPk = provinceId.get(job.location.provinceId) ?? null;
  const distPk = districtId.get(job.location.districtId) ?? null;
  const status = job.status;

  jobRows.push(
    `(${pk}, ${q(job.id)}, ${employerPk}, ${catPk}, ${posPk ?? "NULL"}, ${q(
      job.title
    )}, ${q(job.description)}, ${json(job.requirements)}, ${json(
      job.benefits
    )}, ${q(job.workMode)}, ${q(job.employmentType)}, ${provPk ?? "NULL"}, ${
      distPk ?? "NULL"
    }, ${q(job.location.address)}, ${q(job.location.branchName)}, ${q(
      job.salaryType
    )}, ${job.salaryMin}, ${job.salaryMax ?? "NULL"}, 'VND', ${
      job.positionsCount
    }, ${job.positionsFilled}, NULL, NULL, ${dt(job.deadline)}, ${q(
      status
    )}, NULL, NULL, NULL, ${job.viewCount}, ${job.isUrgent ? 1 : 0}, ${
      job.applicantCount
    }, ${dt(job.postedAt)}, ${
      status === "CLOSED" || status === "CANCELLED" ? dt(job.postedAt) : "NULL"
    }, ${dt(job.postedAt)}, ${dt(job.postedAt)}, NULL)`
  );

  job.schedules.forEach((s) => {
    scheduleRows.push(
      `(${pk}, ${s.dayOfWeek}, ${q(s.startTime)}, ${q(s.endTime)})`
    );
  });

  job.skills.forEach((s) => {
    const sid =
      skillIdByName.get(s.name.toLowerCase()) ?? ensureSkillByName(s.name);
    jobSkillRows.push(`(${pk}, ${sid})`);
  });
});

push(
  `INSERT INTO job_posts (id, slug, employer_id, category_id, position_id, title, description, requirements, benefits, work_mode, employment_type, province_id, district_id, address_detail, branch_name, salary_type, salary_min, salary_max, salary_currency, positions_count, positions_filled, start_date, end_date, application_deadline, status, reviewed_by, reviewed_at, reject_reason, view_count, is_urgent, applicant_count, published_at, closed_at, created_at, updated_at, deleted_at) VALUES\n       ${jobRows.join(
    ",\n       "
  )};`
);
push();

if (scheduleRows.length > 0) {
  push("-- 13. CA LÀM VIỆC");
  push(
    `INSERT INTO job_post_schedules (job_post_id, day_of_week, start_time, end_time) VALUES\n       ${scheduleRows.join(
      ",\n       "
    )};`
  );
  push();
}

if (jobSkillRows.length > 0) {
  push("-- 14. KỸ NĂNG CỦA TIN TUYỂN DỤNG");
  push(
    `INSERT INTO job_post_skills (job_post_id, skill_id) VALUES\n       ${jobSkillRows.join(
      ",\n       "
    )};`
  );
  push();
}

// ============================================
// APPLICATIONS
// ============================================
push("-- 15. ĐƠN ỨNG TUYỂN");
push(
  `INSERT INTO applications (id, slug, job_post_id, student_id, cover_letter, expected_salary, status, employer_note, reject_reason, experience, available_from, cv_url, cv_file_name, applied_at, reviewed_at, decided_at, updated_at) VALUES\n       ${MOCK_APPLICATIONS.map(
    (a) =>
      `(${applicationPk.get(a.id)}, ${q(a.id)}, ${jobPk.get(a.jobId) ?? "NULL"}, ${
        studentUserId.get(a.studentId) ?? "NULL"
      }, ${q(a.coverLetter)}, ${a.expectedSalary ?? "NULL"}, ${q(
        a.status
      )}, ${q(a.employerNote)}, NULL, ${q(a.experience)}, ${dateOnly(
        a.availableFrom
      )}, ${q(a.cvUrl)}, ${q(a.cvFileName)}, ${dt(a.createdAt)}, ${dt(
        a.updatedAt
      )}, ${dt(a.updatedAt)}, ${dt(a.updatedAt)})`
  ).join(",\n       ")};`
);
push();

push("-- 16. LỊCH SỬ TRẠNG THÁI ĐƠN ỨNG TUYỂN");
const historyRows: string[] = [];
MOCK_APPLICATIONS.forEach((a) => {
  const appPk = applicationPk.get(a.id)!;
  const employerPk = employerUserId.get(a.employerId) ?? null;
  let previous: string | null = null;
  a.timeline.forEach((event) => {
    const changedBy =
      event.status === "PENDING" ? studentUserId.get(a.studentId) : employerPk;
    historyRows.push(
      `(${appPk}, ${q(previous)}, ${q(event.status)}, ${
        changedBy ?? "NULL"
      }, ${q(event.note)}, ${dt(event.at)})`
    );
    previous = event.status;
  });
});
if (historyRows.length > 0) {
  push(
    `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, changed_at) VALUES\n       ${historyRows.join(
      ",\n       "
    )};`
  );
}
push();

// ============================================
// REVIEWS
// ============================================
push("-- 17. ĐÁNH GIÁ 2 CHIỀU");
push(
  `INSERT INTO reviews (id, slug, application_id, job_id, reviewer_id, reviewee_id, reviewer_role, target_type, from_name, from_avatar_url, target_name, rating, comment, reply, is_hidden, created_at) VALUES\n       ${MOCK_REVIEWS.map(
    (r) =>
      `(${reviewPk.get(r.id)}, ${q(r.id)}, ${
        r.applicationId ? applicationPk.get(r.applicationId) ?? "NULL" : "NULL"
      }, ${r.jobId ? jobPk.get(r.jobId) ?? "NULL" : "NULL"}, ${r.fromUserId}, ${
        r.targetUserId
      }, ${q(r.fromRole)}, ${q(r.targetType)}, ${q(r.fromName)}, ${q(
        r.fromAvatarUrl
      )}, ${q(r.targetName)}, ${r.rating}, ${q(r.comment)}, ${q(
        r.reply
      )}, ${r.isHidden ? 1 : 0}, ${dt(r.createdAt)})`
  ).join(",\n       ")};`
);
push();

// ============================================
// NOTIFICATIONS
// ============================================
push("-- 18. THÔNG BÁO");
push(
  `INSERT INTO notifications (id, slug, user_id, type, title, body, content, ref_type, ref_id, is_read, read_at, link, created_at) VALUES\n       ${MOCK_NOTIFICATIONS.map(
    (n) =>
      `(${notificationPk.get(n.id)}, ${q(n.id)}, ${n.userId}, ${q(n.type)}, ${q(
        n.title
      )}, ${q(n.body)}, NULL, NULL, NULL, ${n.isRead ? 1 : 0}, ${
        n.isRead ? dt(n.createdAt) : "NULL"
      }, ${q(n.link)}, ${dt(n.createdAt)})`
  ).join(",\n       ")};`
);
push();

// ============================================
// SAVED JOBS
// ============================================
push("-- 19. TIN ĐÃ LƯU");
const savedRows: string[] = [
  { slug: "saved-001", jobId: "job-003", userId: 1 },
  { slug: "saved-002", jobId: "job-demo-003", userId: 1 },
].map((s, index) =>
  `(${index + 1}, ${q(s.slug)}, ${s.userId}, ${jobPk.get(s.jobId) ?? "NULL"}, ${dt(
    new Date().toISOString()
  )})`
);
push(
  `INSERT INTO saved_jobs (id, slug, student_id, job_post_id, created_at) VALUES\n       ${savedRows.join(
    ",\n       "
  )};`
);
push();

// ============================================
// SALARY BENCHMARKS
// ============================================
push("-- 20. XẾP HẠNG LƯƠNG THEO NGÀNH × TỈNH");
push(
  `INSERT INTO salary_benchmarks (category_id, province_id, avg_hourly, min_hourly, max_hourly, sample_size, updated_at) VALUES\n       ${SALARY_BENCHMARKS.map(
    (b) =>
      `(${categoryId.get(b.categoryId) ?? "NULL"}, ${
        provinceId.get(b.provinceId) ?? "NULL"
      }, ${b.avgHourly}, ${b.minHourly}, ${b.maxHourly}, ${b.sampleSize}, ${dt(
        b.updatedAt
      )})`
  ).join(",\n       ")};`
);
push();

push("SET FOREIGN_KEY_CHECKS = 1;");

// ============================================
// WRITE FILE
// ============================================
const outputPath = resolve(
  process.cwd(),
  "../backend/src/main/resources/db/migration/V3__seed_demo_data.sql"
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log("✅ Đã sinh file seed SQL:");
console.log(`   ${outputPath}`);
console.log(
  `   roles=3 provinces=${PROVINCES.length} districts=${DISTRICTS.length} categories=${JOB_CATEGORIES.length} positions=${JOB_POSITIONS.length} skills=${skillRows.length}`
);
console.log(
  `   users=${userIds.length} students=${MOCK_STUDENT_PROFILES.length} employers=${MOCK_EMPLOYER_PROFILES.length} jobs=${MOCK_JOBS.length}`
);
console.log(
  `   applications=${MOCK_APPLICATIONS.length} reviews=${MOCK_REVIEWS.length} notifications=${MOCK_NOTIFICATIONS.length} benchmarks=${SALARY_BENCHMARKS.length}`
);
