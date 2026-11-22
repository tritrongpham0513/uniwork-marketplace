/**
 * 🔁 Kiểm thử end-to-end qua Axios thật + API thật của backend Spring Boot.
 *
 * Script chạy đúng đường đi của ứng dụng:
 *   `service` → `axiosInstance` → HTTP → backend → MySQL
 *
 * Mục tiêu: đảm bảo **envelope trả về khớp với kiểu dữ liệu mà service khai báo**
 * (`ApiResponse<T>`), nếu không app sẽ lỗi `res.data.accessToken` undefined.
 *
 * ## Cấu hình
 *
 * ```bash
 * # mặc định: http://localhost:8080 (bản production trong docker compose)
 * API_URL=http://localhost:8080 pnpm verify:e2e
 *
 * # bản dev trong Docker:
 * API_URL=http://localhost:8081 pnpm verify:e2e
 * ```
 *
 * > ⚠️ **Không idempotent**: script tạo tin tuyển dụng, ghi chú nội bộ và bật/tắt
 * > thông báo tin tuyển dụng trên **DB thật**. Muốn chạy lại từ trạng thái sạch:
 * > `docker compose down -v && docker compose up --build`.
 */

import assert from "node:assert/strict";

// --- Shim localStorage cho môi trường Node ---
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

/** Base URL của backend (không kèm `/api/v1`). */
const API_BASE = (process.env.API_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  ""
);

const { axiosInstance } = await import("../src/lib/axios.ts");
const { authService } = await import(
  "../src/features/auth/services/auth.services.ts"
);
const { jobsService } = await import(
  "../src/features/jobs/services/jobs.service.ts"
);
const { applicationService } = await import(
  "../src/features/applications/services/applications.service.ts"
);
const { employerJobService } = await import(
  "../src/features/employer/services/employer-jobs.service.ts"
);
const { adminService } = await import(
  "../src/features/admin/services/admin.service.ts"
);
const { reviewService } = await import(
  "../src/features/reviews/services/reviews.service.ts"
);
const { notificationService } = await import(
  "../src/features/notifications/services/notifications.service.ts"
);
const { profileService } = await import(
  "../src/features/profile/services/profile.service.ts"
);
const { savedJobService } = await import(
  "../src/features/saved-jobs/services/saved-jobs.service.ts"
);
const { filesService } = await import(
  "../src/features/files/services/files.service.ts"
);
const { jobNotifyService } = await import(
  "../src/features/notifications/services/job-notify.service.ts"
);
const { workHistoryService } = await import(
  "../src/features/work-history/services/work-history.service.ts"
);

// Trỏ axios instance về backend thật.
axiosInstance.defaults.baseURL = API_BASE;

const { saveLocalAccessToken } = await import(
  "../src/utils/authStorage.ts"
);
/** Lưu access token vào localStorage (giống `useLogin` -> `saveAuthSession`). */
const applyToken = (token: string): void => {
  saveLocalAccessToken(token);
};

let failures = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
};

/** Chuẩn hoá lỗi axios về ApiError (import sớm để dùng trong nhiều test). */
const { normalizeApiError: normalizeApiErrorLocal } = await import(
  "../src/lib/api-error.ts"
);

// ---------------------------------------------------------------
// GUARD — backend có đang chạy không?
// ---------------------------------------------------------------

console.log(`\n🔁 End-to-end qua Axios thật + API thật (${API_BASE})`);

try {
  await axiosInstance.get("/api/v1/public/categories");
} catch (error) {
  const apiError = normalizeApiErrorLocal(error);
  console.error(
    `\n❌ Không kết nối được backend tại ${API_BASE}.\n` +
      `   Hãy chạy: docker compose up --build  (hoặc ./dev.sh up-d cho bản dev)\n` +
      `   Chi tiết: ${apiError.message}\n`
  );
  process.exit(1);
}

// ---------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------

let studentToken = "";
let employerToken = "";
let adminToken = "";

await test("authService.login -> ApiResponse<AuthResponse> đúng shape", async () => {
  const response = await authService.login({
    email: "student@viejob.vn",
    password: "Student@123",
  });

  assert.equal(response.success, true);
  assert.equal(typeof response.message, "string");
  assert.ok(response.data, "data phải có giá trị");
  assert.equal(typeof response.data.accessToken, "string");
  assert.ok(response.data.accessToken.length > 20);
  assert.equal(response.data.user.role, "STUDENT");
  assert.equal(response.data.user.email, "student@viejob.vn");

  studentToken = response.data.accessToken;
  applyToken(studentToken);
});

await test("authService.getMe -> ApiResponse<UserSummaryResponse> đúng shape", async () => {
  const response = await authService.getMe();
  assert.equal(response.success, true);
  assert.equal(response.data.role, "STUDENT");
  assert.equal(response.data.email, "student@viejob.vn");
});

await test("đăng nhập nhà tuyển dụng & quản trị viên trả token riêng", async () => {
  const employer = await authService.login({
    email: "employer@viejob.vn",
    password: "Employer@123",
  });
  const admin = await authService.login({
    email: "admin@viejob.vn",
    password: "Admin@123",
  });

  assert.equal(employer.data.user.role, "EMPLOYER");
  assert.equal(admin.data.user.role, "ADMIN");
  assert.notEqual(employer.data.accessToken, admin.data.accessToken);

  employerToken = employer.data.accessToken;
  adminToken = admin.data.accessToken;
});

await test("login sai mật khẩu -> lỗi 401 với message tiếng Việt", async () => {
  try {
    await authService.login({
      email: "student@viejob.vn",
      password: "SaiMatKhau@999",
    });
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 401);
    assert.equal(apiError.kind, "auth");
    assert.ok(apiError.message.length > 0);
  }
});

// ---------------------------------------------------------------
// JOBS (public)
// ---------------------------------------------------------------

await test("jobsService.list -> JobListResponse đủ trường phân trang", async () => {
  const result = await jobsService.list({
    keyword: "",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 6,
  });

  assert.ok(Array.isArray(result.items));
  assert.ok(result.totalItems > 0);
  assert.equal(result.currentPage, 1);
  assert.ok(result.totalPages >= 1);
  assert.ok(result.items.length <= 6);
});

await test("jobsService.categories / provinces / benchmarks trả mảng", async () => {
  const [categories, provinces, benchmarks] = await Promise.all([
    jobsService.categories(),
    jobsService.provinces(),
    jobsService.salaryBenchmarks(),
  ]);
  assert.ok(categories.length > 0);
  assert.ok(provinces.length > 0);
  assert.ok(benchmarks.length > 0);
});

await test("jobsService.districts lọc theo tỉnh trả mảng", async () => {
  const districts = await jobsService.districts("79");
  assert.ok(Array.isArray(districts));
  assert.ok(districts.length > 0);
  assert.ok(districts.every((d) => d.provinceId === "79"));
});

await test("jobsService.wards lọc theo tỉnh — xã/phường cấp 2 (2025)", async () => {
  const wards = await jobsService.wards("01");
  assert.ok(Array.isArray(wards));
  assert.ok(wards.length > 0);
  assert.ok(wards.every((w) => w.provinceId === "01"));
  // Mã đơn vị hành chính chính thức: 5 chữ số
  assert.ok(wards.every((w) => /^\d{5}$/.test(w.id)));
  assert.ok(wards.every((w) => w.name.length > 0 && w.shortName.length > 0));
});

await test("jobsService.list lọc theo wardIds -> chỉ trả tin đúng xã", async () => {
  const [all, hcmWards] = await Promise.all([
    jobsService.list({
      keyword: "",
      categoryIds: [],
      positionIds: [],
      provinceIds: [],
      districtIds: [],
      wardIds: [],
      employmentTypes: [],
      workModes: [],
      salaryMin: 0,
      salaryMax: 200000,
      sort: "newest",
      page: 1,
      pageSize: 50,
    }),
    jobsService.wards("79"),
  ]);

  const target = all.items.find((job) => job.location.wardId);
  assert.ok(target, "phải có tin tuyển dụng đã gán xã/phường");

  const filtered = await jobsService.list({
    keyword: "",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [target.location.wardId],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 50,
  });

  assert.ok(filtered.totalItems > 0);
  assert.ok(
    filtered.items.every((job) => job.location.wardId === target.location.wardId),
    "mọi tin trả về phải thuộc xã đã lọc"
  );
  // Xã đã chọn phải thuộc tỉnh lấy từ endpoint wards
  assert.ok(hcmWards.length > 0);
});

await test("jobsService.detail -> Job đầy đủ", async () => {
  const list = await jobsService.list({
    keyword: "",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 1,
  });
  const id = list.items[0]!.id;
  const job = await jobsService.detail(id);
  assert.equal(job.id, id);
  assert.ok(job.category.name.length > 0);
  assert.ok(job.employer.name.length > 0);
  assert.ok(job.location.province.length > 0);
});

await test("jobsService.related trả danh sách tin gợi ý", async () => {
  const list = await jobsService.list({
    keyword: "",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 1,
  });
  const first = list.items[0]!;
  const related = await jobsService.related(first.category.id, first.id);
  assert.ok(Array.isArray(related));
  assert.ok(related.every((job) => job.id !== first.id));
});

await test("jobsService.list với keyword -> chỉ trả tin khớp từ khoá", async () => {
  const result = await jobsService.list({
    keyword: "phục vụ",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 10,
  });
  assert.ok(result.totalItems > 0);
  // Backend tìm kiếm trên: tiêu đề, mô tả, tên nhóm việc, tên vị trí.
  assert.ok(
    result.items.every((job) =>
      `${job.title} ${job.description} ${job.category.name} ${job.position?.name ?? ""}`
        .toLowerCase()
        .includes("phục vụ")
    ),
    "mọi tin phải chứa keyword"
  );
});

// ---------------------------------------------------------------
// STUDENT
// ---------------------------------------------------------------

applyToken(studentToken);

await test("profileService.getStudent -> StudentProfile", async () => {
  const response = await profileService.getStudent();
  assert.equal(response.success, true);
  assert.ok(response.data.fullName.length > 0);
  assert.ok(Array.isArray(response.data.skills));
  assert.ok(Array.isArray(response.data.workHistories));
});

await test("applicationService.listByStudent -> Application[]", async () => {
  const response = await applicationService.listByStudent();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
  assert.ok(response.data.length > 0);
  assert.ok(response.data.every((app) => app.timeline.length > 0));
});

await test("applicationService.listByStudent lọc theo status", async () => {
  const response = await applicationService.listByStudent("PENDING");
  assert.equal(response.success, true);
  assert.ok(
    response.data.every((app) => app.status === "PENDING"),
    "mọi đơn phải có status PENDING"
  );
});

await test("savedJobService.list -> SavedJob[]", async () => {
  const response = await savedJobService.list();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
});

await test("savedJobService.ids -> string[] id tin đã lưu", async () => {
  const response = await savedJobService.ids();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
  assert.ok(response.data.every((id) => typeof id === "string"));
});

await test("workHistoryService.listForStudent -> WorkHistory[]", async () => {
  const response = await workHistoryService.listForStudent();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
});

await test("profileService.getPublicEmployer -> hồ sơ NTD công khai", async () => {
  const response = await profileService.getPublicEmployer("emp-viejob-demo");
  assert.equal(response.success, true);
  assert.ok(response.data.profile.displayName.length > 0);
  assert.ok(Array.isArray(response.data.jobs));
  assert.ok(Array.isArray(response.data.reviews));
});

// ---------------------------------------------------------------
// STUDENT ỨNG TUYỂN -> NTD DUYỆT ĐƠN
// ---------------------------------------------------------------

/** Tin đang mở mà sinh viên demo chưa ứng tuyển (dùng cho luồng nộp đơn). */
let targetJobId = "";
/** Slug đơn ứng tuyển vừa tạo. */
let createdApplicationId = "";

await test("student ứng tuyển vào 1 tin đang mở -> tạo đơn PENDING", async () => {
  const list = await jobsService.list({
    keyword: "",
    categoryIds: [],
    positionIds: [],
    provinceIds: [],
    districtIds: [],
    wardIds: [],
    employmentTypes: [],
    workModes: [],
    salaryMin: 0,
    salaryMax: 200000,
    sort: "newest",
    page: 1,
    pageSize: 50,
  });

  const mine = await applicationService.listByStudent();
  const appliedJobIds = new Set(mine.data.map((app) => app.jobId));

  targetJobId =
    list.items.find((job) => job.status === "OPEN" && !appliedJobIds.has(job.id))
      ?.id ?? "";
  assert.ok(targetJobId, "không tìm được tin đang mở để ứng tuyển");

  const response = await applicationService.create({
    jobId: targetJobId,
    coverLetter: "Đơn ứng tuyển kiểm chứng E2E — sinh viên demo.",
    expectedSalary: 30000,
  });

  assert.equal(response.success, true);
  assert.equal(response.data.status, "PENDING");
  assert.equal(response.data.jobId, targetJobId);
  assert.ok(response.data.timeline.length > 0);

  createdApplicationId = response.data.id;
});

await test("student ứng tuyển trùng tin -> lỗi 400", async () => {
  try {
    await applicationService.create({
      jobId: targetJobId,
      coverLetter: "Đơn trùng — phải bị từ chối.",
    });
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 400);
  }
});

await test("student rút đơn vừa tạo -> trạng thái WITHDRAWN", async () => {
  const response = await applicationService.withdraw(createdApplicationId);
  assert.equal(response.success, true);
  assert.equal(response.data.status, "WITHDRAWN");
});

// ---------------------------------------------------------------
// EMPLOYER
// ---------------------------------------------------------------

applyToken(employerToken);

await test("employerJobService.list -> Job[] (mảng, không phân trang)", async () => {
  const response = await employerJobService.list();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data), "phải là mảng Job");
  assert.ok(response.data.length > 0);
});

await test("applicationService.listByEmployer -> Application[]", async () => {
  const response = await applicationService.listByEmployer();
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
  assert.ok(response.data.length > 0);
});

await test("applicationService.updateNote -> lưu ghi chú nội bộ NTD", async () => {
  const list = await applicationService.listByEmployer();
  const target = list.data[0];
  assert.ok(target, "cần ít nhất 1 đơn ứng tuyển của NTD");

  const updated = await applicationService.updateNote(
    target.id,
    "Ghi chú E2E — ưu tiên phỏng vấn cuối tuần."
  );
  assert.equal(updated.success, true);
  assert.equal(
    updated.data.employerNote,
    "Ghi chú E2E — ưu tiên phỏng vấn cuối tuần."
  );

  // Đọc lại để chắc chắn đã lưu
  const detail = await applicationService.detailForEmployer(target.id);
  assert.equal(
    detail.data.employerNote,
    "Ghi chú E2E — ưu tiên phỏng vấn cuối tuần."
  );
});

await test("employerJobService.create -> Job mới ở trạng thái PENDING_REVIEW", async () => {
  const response = await employerJobService.create({
    title: "Tin tuyển dụng E2E test",
    description: "Mô tả công việc cho smoke test",
    requirements: ["Nhanh nhẹn"],
    benefits: ["Đồng phục"],
    category: {
      id: "cat-fnb",
      name: "F&B, Barista & Phục vụ",
      slug: "f-and-b",
      description: "",
      icon: "UtensilsCrossed",
      jobCount: 0,
      isActive: true,
      sortOrder: 1,
    },
    position: null,
    employmentType: "PART_TIME",
    workMode: "ONSITE",
    salaryType: "HOURLY",
    salaryMin: 25000,
    salaryMax: 30000,
    location: {
      provinceId: "79",
      province: "TP. Hồ Chí Minh",
      districtId: "q1",
      district: "Quận 1",
      address: "123 Nguyễn Huệ",
      branchName: "Chi nhánh chính",
    },
    positionsCount: 2,
    schedules: [],
    skills: [],
    deadline: null,
  });

  assert.equal(response.success, true);
  assert.equal(response.data.status, "PENDING_REVIEW");
  assert.equal(response.data.title, "Tin tuyển dụng E2E test");
});

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

applyToken(adminToken);

await test("adminService.dashboard -> AdminDashboardStats đủ chỉ số", async () => {
  const response = await adminService.dashboard();
  assert.equal(response.success, true);
  assert.ok(response.data.totalUsers > 0);
  assert.ok(response.data.totalJobs > 0);
  assert.ok(response.data.totalStudents > 0);
  assert.ok(response.data.totalEmployers > 0);
  assert.ok(response.data.categories > 0);
});

await test("adminService.listUsers / listJobs / listCategories trả mảng", async () => {
  const [users, jobs, categories] = await Promise.all([
    adminService.listUsers({ role: "STUDENT" }),
    adminService.listJobs("ALL"),
    adminService.listCategories(),
  ]);
  assert.ok(Array.isArray(users.data));
  assert.ok(Array.isArray(jobs.data));
  assert.ok(Array.isArray(categories.data));
  assert.ok(users.data.every((user) => user.role === "STUDENT"));
});

await test("adminService.reviewJob -> mở tin công khai", async () => {
  // Tạo 1 tin mới (với token NTD) để duyệt — tránh phụ thuộc vào seed data
  applyToken(employerToken);
  const created = await employerJobService.create({
    title: "Tin tuyển dụng cần duyệt (E2E)",
    description: "",
    requirements: [],
    benefits: [],
    category: {
      id: "cat-bep",
      name: "Bếp & Nấu ăn",
      slug: "bep",
      description: "",
      icon: "ChefHat",
      jobCount: 0,
      isActive: true,
      sortOrder: 2,
    },
    position: null,
    employmentType: "PART_TIME",
    workMode: "ONSITE",
    salaryType: "HOURLY",
    salaryMin: 25000,
    salaryMax: null,
    location: {
      provinceId: "79",
      province: "TP. Hồ Chí Minh",
      districtId: "q1",
      district: "Quận 1",
      address: "",
      branchName: null,
    },
    positionsCount: 1,
    schedules: [],
    skills: [],
    deadline: null,
  });
  assert.equal(created.data.status, "PENDING_REVIEW");

  applyToken(adminToken);
  const response = await adminService.reviewJob(created.data.id, {
    action: "APPROVE",
  });
  assert.equal(response.data.status, "OPEN");
});

await test("reviewService.list -> Review[] lọc theo targetType", async () => {
  const response = await reviewService.list({ targetType: "EMPLOYER" });
  assert.equal(response.success, true);
  assert.ok(response.data.length > 0);
  assert.ok(response.data.every((review) => review.targetType === "EMPLOYER"));
});

// ---------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------

applyToken(studentToken);

await test("notificationService.list + unreadCount đúng shape", async () => {
  const [list, count] = await Promise.all([
    notificationService.list(),
    notificationService.unreadCount(),
  ]);
  assert.equal(list.success, true);
  assert.ok(Array.isArray(list.data));
  assert.equal(typeof count.data.count, "number");
});

// ---------------------------------------------------------------
// FILE UPLOAD
// ---------------------------------------------------------------

await test("filesService.upload -> trả metadata file + URL", async () => {
  const file = new File(["%PDF-1.4 fake cv"], "CV_E2E.pdf", {
    type: "application/pdf",
  });

  const response = await filesService.upload(file, "CV");
  assert.equal(response.success, true);
  assert.ok(response.data.id.length > 0);
  assert.equal(response.data.fileName, "CV_E2E.pdf");
  assert.equal(response.data.kind, "CV");
  assert.ok(response.data.url.includes(response.data.id));
});

await test("filesService.upload -> từ chối định dạng không hợp lệ", async () => {
  const file = new File(["not an image"], "avatar.txt", {
    type: "text/plain",
  });

  try {
    await filesService.upload(file, "AVATAR");
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 400);
  }
});

await test("filesService.remove -> xoá file đã upload", async () => {
  const file = new File(["%PDF-1.4 fake cv"], "CV_XOA.pdf", {
    type: "application/pdf",
  });
  const uploaded = await filesService.upload(file, "CV");

  const removed = await filesService.remove(uploaded.data.id);
  assert.equal(removed.success, true);

  // Đọc lại phải không còn
  try {
    await axiosInstance.get(`/api/v1/files/${uploaded.data.id}`);
    assert.fail("phải throw — file đã bị xoá");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 404);
  }
});

// ---------------------------------------------------------------
// JOB NOTIFY PREFERENCES
// ---------------------------------------------------------------

await test("jobNotifyService.subscribe/list/unsubscribe -> vòng đời đầy đủ", async () => {
  const subscribed = await jobNotifyService.subscribe({
    categoryCode: "cat-fnb",
    provinceCode: "79",
  });
  assert.equal(subscribed.success, true);
  assert.equal(subscribed.data.categoryCode, "cat-fnb");
  assert.equal(subscribed.data.provinceCode, "79");

  const list = await jobNotifyService.list();
  assert.ok(
    list.data.some(
      (pref) =>
        pref.categoryCode === "cat-fnb" && pref.provinceCode === "79"
    )
  );

  await jobNotifyService.unsubscribe("cat-fnb", "79");

  const after = await jobNotifyService.list();
  assert.ok(
    !after.data.some(
      (pref) =>
        pref.categoryCode === "cat-fnb" && pref.provinceCode === "79"
    )
  );
});

// ---------------------------------------------------------------
// PHÂN QUYỀN
// ---------------------------------------------------------------

await test("student bị chặn khỏi API của NTD -> lỗi 403", async () => {
  applyToken(studentToken);
  try {
    await axiosInstance.get("/api/v1/employer/jobs");
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 403);
  }
});

// ---------------------------------------------------------------
// ERROR PATH
// ---------------------------------------------------------------

await test("endpoint lỗi -> axios reject với ApiError đúng kind", async () => {
  try {
    await axiosInstance.get("/api/v1/jobs/public/khong-ton-tai");
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiErrorLocal(error);
    assert.equal(apiError.status, 404);
    assert.equal(apiError.kind, "notFound");
    assert.ok(apiError.message.length > 0);
  }
});

console.log(
  failures === 0
    ? "\n🎉 Tất cả test E2E PASSED!\n"
    : `\n💥 ${failures} test E2E FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
