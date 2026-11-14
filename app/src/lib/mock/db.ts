import type {
  Application,
  EmployerProfile,
  Job,
  JobCategory,
  Notification,
  Review,
  SavedJob,
  StudentProfile,
} from "@/features/shared/types";
import { MOCK_APPLICATIONS, MOCK_NOTIFICATIONS, MOCK_REVIEWS } from "@/mocks/applications";
import { JOB_CATEGORIES, JOB_POSITIONS } from "@/mocks/categories";
import { MOCK_JOBS } from "@/mocks/jobs";
import {
  MOCK_EMPLOYER_PROFILES,
  MOCK_STUDENT_PROFILES,
  MOCK_USERS,
  type MockUser,
} from "@/mocks/users";

/**
 * 🗄️ In-memory database cho mock API.
 *
 * Toàn bộ dữ liệu nằm trong RAM nên thao tác (đăng tin, duyệt đơn, đánh giá)
 * có hiệu lực ngay trong phiên hiện tại. Khi F5, DB được seed lại từ
 * `src/mocks/*` — trạng thái trở về dữ liệu gốc (đủ dùng để demo).
 */
export interface MockDatabase {
  users: MockUser[];
  jobs: Job[];
  categories: JobCategory[];
  positions: typeof JOB_POSITIONS;
  applications: Application[];
  notifications: Notification[];
  reviews: Review[];
  savedJobs: SavedJob[];
  studentProfiles: StudentProfile[];
  employerProfiles: EmployerProfile[];
}

const seed = (): MockDatabase => ({
  // Clone sâu để mỗi lần reset trả về dữ liệu sạch
  users: MOCK_USERS.map((u) => ({ ...u })),
  jobs: MOCK_JOBS.map((j) => ({ ...j })),
  categories: JOB_CATEGORIES.map((c) => ({ ...c })),
  positions: JOB_POSITIONS.map((p) => ({ ...p })),
  applications: MOCK_APPLICATIONS.map((a) => ({
    ...a,
    timeline: a.timeline.map((t) => ({ ...t })),
  })),
  notifications: MOCK_NOTIFICATIONS.map((n) => ({ ...n })),
  reviews: MOCK_REVIEWS.map((r) => ({ ...r })),
  savedJobs: [
    {
      id: "saved-001",
      jobId: "job-003",
      userId: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "saved-002",
      jobId: "job-demo-003",
      userId: 1,
      createdAt: new Date().toISOString(),
    },
  ],
  studentProfiles: MOCK_STUDENT_PROFILES.map((p) => ({
    ...p,
    skills: [...p.skills],
    experiences: p.experiences.map((e) => ({ ...e })),
    jobPreferences: { ...p.jobPreferences },
  })),
  employerProfiles: MOCK_EMPLOYER_PROFILES.map((p) => ({ ...p })),
});

let db: MockDatabase = seed();

/** Lấy DB hiện tại (mutable) */
export const getDb = (): MockDatabase => db;

/** Reset DB về trạng thái gốc */
export const resetDb = (): void => {
  db = seed();
};

// ============================================
// HELPERS
// ============================================

let idCounter = 1000;

/** Sinh id tăng dần, ổn định trong 1 phiên */
export const nextId = (prefix: string): string =>
  `${prefix}-${++idCounter}-${Date.now().toString(36)}`;

/** Sinh id số (dùng cho `users.id` — kiểu Long ở backend) */
let numericIdCounter = 100;
export const nextNumericId = (): number => ++numericIdCounter;

export const nowIso = (): string => new Date().toISOString();
