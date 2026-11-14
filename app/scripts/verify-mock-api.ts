/**
 * 🧪 Kiểm thử tầng MOCK API (in-memory database + router).
 *
 * Script này gọi trực tiếp `handleMockRequest` (không qua HTTP) để assert:
 *   - Mọi response đều đúng envelope `{ success, message, data }`
 *   - Mọi lỗi đúng envelope lỗi `{ success: false, code, message, errors[] }`
 *   - Luồng trọn vẹn: đăng nhập 3 vai trò → xem/lọc tin → NTD đăng tin →
 *   Admin duyệt tin → SV ứng tuyển → NTD duyệt đơn → đánh giá 2 chiều →
 *   Admin quản lý user/danh mục/đánh giá → thông báo.
 *
 * Chạy bằng: `npm run verify:mock-api`
 */

import assert from "node:assert/strict";

import { handleMockRequest } from "../src/lib/mock/router.ts";
import { resetDb } from "../src/lib/mock/db.ts";
import { MockHttpError } from "../src/lib/mock/errors.ts";

// ============================================
// HELPERS
// ============================================

interface Envelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

let failures = 0;
const test = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
};

/** Gọi mock router và kiểm tra envelope thành công */
const call = <T = unknown>(
  method: string,
  url: string,
  options: {
    data?: unknown;
    params?: Record<string, string>;
    token?: string;
  } = {}
): Envelope<T> => {
  const response = handleMockRequest({
    method,
    url,
    data: options.data,
    params: options.params,
    headers: options.token
      ? { authorization: `Bearer ${options.token}` }
      : undefined,
  });

  const body = response.data as Envelope<T>;
  assert.equal(
    response.status >= 200 && response.status < 300,
    true,
    `HTTP ${response.status} cho ${method} ${url}`
  );
  assert.equal(body.success, true, `success phải true cho ${method} ${url}`);
  assert.equal(typeof body.message, "string", "message phải là string");
  assert.ok("data" in body, "response phải có trường `data`");
  return body;
};

/** Gọi mock router và kỳ vọng lỗi HTTP */
const callExpectError = (
  method: string,
  url: string,
  expectedStatus: number,
  options: {
    data?: unknown;
    params?: Record<string, string>;
    token?: string;
  } = {}
): MockHttpError => {
  try {
    handleMockRequest({
      method,
      url,
      data: options.data,
      params: options.params,
      headers: options.token
        ? { authorization: `Bearer ${options.token}` }
        : undefined,
    });
  } catch (error) {
    assert.ok(
      error instanceof MockHttpError,
      `phải ném MockHttpError cho ${method} ${url}`
    );
    const httpError = error as MockHttpError;
    assert.equal(
      httpError.status,
      expectedStatus,
      `status phải là ${expectedStatus} cho ${method} ${url} (thực tế ${httpError.status})`
    );
    assert.equal(httpError.body.success, false, "error envelope phải success=false");
    assert.equal(typeof httpError.body.code, "string", "error phải có `code`");
    assert.equal(
      typeof httpError.body.message,
      "string",
      "error phải có `message`"
    );
    return httpError;
  }
  throw new Error(`${method} ${url} phải ném lỗi ${expectedStatus}`);
};

/** Đăng nhập và trả về accessToken + user */
const login = (email: string, password = "Password@123") => {
  const body = call<{ accessToken: string; user: { id: number; role: string } }>(
    "POST",
    "/api/v1/auth/login",
    { data: { email, password } }
  );
  return { token: body.data.accessToken, user: body.data.user };
};

/** Đăng nhập tài khoản demo seed (mật khẩu cố định theo vai trò) */
const loginDemo = (email: string, password: string) => login(email, password);

// ============================================
// BẮT ĐẦU
// ============================================

resetDb();

console.log("\n🗄️  Mock API — envelope & router");

await test("envelope thành công đúng shape { success, message, data }", () => {
  const body = call("GET", "/api/v1/public/categories");
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));
});

await test("envelope lỗi đúng shape { success: false, code, message }", () => {
  const error = callExpectError("GET", "/api/v1/jobs/public/khong-ton-tai", 404);
  assert.equal(error.body.success, false);
  assert.equal(error.body.code, "NOT_FOUND");
});

await test("endpoint không tồn tại -> 404", () => {
  callExpectError("GET", "/api/v1/khong-co", 404);
});

await test("route cần token nhưng không có token -> 401", () => {
  callExpectError("GET", "/api/v1/student/applications", 401);
});

console.log("\n🔐  Đăng nhập & phân quyền");

const student = loginDemo("student@viejob.vn", "Student@123");
const employer = loginDemo("employer@viejob.vn", "Employer@123");
const admin = loginDemo("admin@viejob.vn", "Admin@123");

await test("đăng nhập sinh viên trả token + user đúng role", () => {
  assert.ok(student.token.length > 20);
  assert.equal(student.user.role, "STUDENT");
  assert.equal(student.user.id, 1);
});

await test("đăng nhập nhà tuyển dụng trả user đúng role", () => {
  assert.equal(employer.user.role, "EMPLOYER");
  assert.equal(employer.user.id, 2);
});

await test("đăng nhập quản trị viên trả user đúng role", () => {
  assert.equal(admin.user.role, "ADMIN");
});

await test("GET /auth/me trả đúng user theo token", () => {
  const body = call<{ email: string; role: string }>("GET", "/api/v1/auth/me", {
    token: student.token,
  });
  assert.equal(body.data.email, "student@viejob.vn");
  assert.equal(body.data.role, "STUDENT");
});

await test("token sai -> 401", () => {
  callExpectError("GET", "/api/v1/auth/me", 401, { token: "abc.def.ghi" });
});

await test("đăng nhập sai mật khẩu -> 401", () => {
  const error = callExpectError("POST", "/api/v1/auth/login", 401, {
    data: { email: "student@viejob.vn", password: "SaiMatKhau@999" },
  });
  assert.equal(error.body.code, "UNAUTHORIZED");
});

await test("đăng ký email trùng -> 409", () => {
  callExpectError("POST", "/api/v1/auth/register", 409, {
    data: {
      fullName: "Test",
      email: "student@viejob.vn",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "STUDENT",
    },
  });
});

await test("đăng ký mới -> 201 + tạo hồ sơ phụ", () => {
  const response = handleMockRequest({
    method: "POST",
    url: "/api/v1/auth/register",
    data: {
      fullName: "Nguyễn Thị Test",
      email: "new.student@viejob.vn",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "STUDENT",
    },
  });
  assert.equal(response.status, 201);
  const body = response.data as Envelope;
  assert.equal(body.success, true);
});

console.log("\n📋  Tin tuyển dụng công khai");

await test("GET /jobs/public trả danh sách có phân trang", () => {
  const body = call<{
    items: unknown[];
    totalItems: number;
    currentPage: number;
    totalPages: number;
  }>("GET", "/api/v1/jobs/public", { params: { page: "1", pageSize: "5" } });
  assert.ok(body.data.items.length <= 5);
  assert.ok(body.data.totalItems > 0);
  assert.equal(body.data.currentPage, 1);
  assert.ok(body.data.totalPages >= 1);
});

await test("lọc theo keyword chỉ trả tin phù hợp", () => {
  const body = call<{
    items: Array<{
      title: string;
      description: string;
      requirements: string[];
      benefits: string[];
      category: { name: string };
      position: { name: string } | null;
      employer: { name: string };
      skills: Array<{ name: string }>;
      location: { district: string; province: string };
    }>;
    totalItems: number;
  }>("GET", "/api/v1/jobs/public", { params: { keyword: "phục vụ" } });
  assert.ok(body.data.totalItems > 0);
  for (const job of body.data.items) {
    // Haystack giống hệt logic lọc của mock handler
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
    assert.ok(
      haystack.includes("phục vụ"),
      `tin không khớp keyword: ${job.title}`
    );
  }
});

await test("lọc theo tỉnh/thành trả về tin đúng khu vực", () => {
  const body = call<{ items: Array<{ location: { provinceId: string } }> }>(
    "GET",
    "/api/v1/jobs/public",
    { params: { provinceIds: "hcm" } }
  );
  assert.ok(body.data.items.length > 0);
  for (const job of body.data.items) {
    assert.equal(job.location.provinceId, "hcm");
  }
});

await test("chi tiết tin tuyển dụng trả đủ trường", () => {
  const list = call<{ items: Array<{ id: string }> }>(
    "GET",
    "/api/v1/jobs/public",
    { params: { pageSize: "1" } }
  );
  const id = list.data.items[0]!.id;
  const body = call<{
    id: string;
    schedules: unknown[];
    category: { id: string };
    location: { province: string };
  }>("GET", `/api/v1/jobs/public/${id}`);
  assert.equal(body.data.id, id);
  assert.ok(Array.isArray(body.data.schedules));
  assert.ok(body.data.category.id.length > 0);
  assert.ok(body.data.location.province.length > 0);
});

await test("master data: categories / provinces / districts / benchmarks", () => {
  const categories = call<unknown[]>("GET", "/api/v1/public/categories");
  const provinces = call<unknown[]>("GET", "/api/v1/public/provinces");
  const districts = call<unknown[]>("GET", "/api/v1/public/districts");
  const benchmarks = call<unknown[]>("GET", "/api/v1/public/salary-benchmarks");
  assert.ok(categories.data.length > 0);
  assert.ok(provinces.data.length > 0);
  assert.ok(districts.data.length > 0);
  assert.ok(benchmarks.data.length > 0);
});

console.log("\n🏢  Nhà tuyển dụng — đăng tin");

let newJobId = "";

await test("GET /employer/jobs tự resolve employer theo token", () => {
  const body = call<unknown[]>("GET", "/api/v1/employer/jobs", {
    token: employer.token,
  });
  assert.ok(Array.isArray(body.data));
});

await test("POST /employer/jobs tạo tin ở trạng thái PENDING_REVIEW", () => {
  const body = call<{ id: string; status: string }>(
    "POST",
    "/api/v1/employer/jobs",
    {
      token: employer.token,
      data: {
        title: "Nhân viên phục vụ part-time cuối tuần",
        description: "Phục vụ khách, thu ngân.",
        requirements: ["Không yêu cầu kinh nghiệm"],
        benefits: ["Đồng phục"],
        employmentType: "PART_TIME",
        workMode: "ONSITE",
        salaryType: "HOURLY",
        salaryMin: 25000,
        salaryMax: 30000,
        positionsCount: 3,
        category: {
          id: "cat-fnb",
          name: "F&B, Barista & Phục vụ",
          slug: "f-and-b",
        },
        location: {
          provinceId: "hcm",
          province: "TP. Hồ Chí Minh",
          districtId: "q1",
          district: "Quận 1",
          address: "123 Nguyễn Huệ",
          branchName: "Chi nhánh chính",
        },
        schedules: [{ dayOfWeek: 6, startTime: "10:00", endTime: "18:00" }],
      },
    }
  );
  assert.equal(body.data.status, "PENDING_REVIEW");
  newJobId = body.data.id;
  assert.ok(newJobId.length > 0);
});

await test("tin mới chưa duyệt -> không hiện trong danh sách công khai", () => {
  const body = call<{ items: Array<{ id: string }> }>(
    "GET",
    "/api/v1/jobs/public"
  );
  assert.ok(!body.data.items.some((job) => job.id === newJobId));
});

await test("NTD vẫn thấy tin của mình trong danh sách quản lý", () => {
  const body = call<Array<{ id: string }>>(
    "GET",
    "/api/v1/employer/jobs",
    { token: employer.token }
  );
  assert.ok(body.data.some((job) => job.id === newJobId));
});

await test("PUT /employer/jobs/{id} cập nhật tin của chính NTD", () => {
  const body = call<{ title: string; status: string }>(
    "PUT",
    `/api/v1/employer/jobs/${newJobId}`,
    {
      token: employer.token,
      data: { title: "Nhân viên phục vụ part-time (đã cập nhật)" },
    }
  );
  assert.equal(body.data.title, "Nhân viên phục vụ part-time (đã cập nhật)");
});

await test("đăng tin thiếu tiêu đề -> 400 kèm field errors", () => {
  const error = callExpectError("POST", "/api/v1/employer/jobs", 400, {
    token: employer.token,
    data: { title: "   " },
  });
  assert.ok(Array.isArray(error.body.errors));
});

console.log("\n🛡️  Quản trị viên — duyệt tin");

await test("GET /admin/jobs lọc được tin chờ duyệt", () => {
  const body = call<Array<{ id: string; status: string }>>(
    "GET",
    "/api/v1/admin/jobs",
    { params: { status: "PENDING_REVIEW" } }
  );
  assert.ok(body.data.some((job) => job.id === newJobId));
});

await test("PATCH /admin/jobs/{id}/review APPROVE -> tin mở công khai", () => {
  const body = call<{ status: string }>(
    "PATCH",
    `/api/v1/admin/jobs/${newJobId}/review`,
    { data: { action: "APPROVE" } }
  );
  assert.equal(body.data.status, "OPEN");

  const publicList = call<{ items: Array<{ id: string }> }>(
    "GET",
    "/api/v1/jobs/public"
  );
  assert.ok(publicList.data.items.some((job) => job.id === newJobId));
});

await test("admin dashboard trả số liệu tổng quan", () => {
  const body = call<{
    totalUsers: number;
    totalJobs: number;
    pendingJobs: number;
    categories: number;
  }>("GET", "/api/v1/admin/dashboard");
  assert.ok(body.data.totalUsers > 0);
  assert.ok(body.data.totalJobs > 0);
  assert.ok(body.data.categories > 0);
  assert.ok(body.data.pendingJobs >= 0);
});

console.log("\n🎓  Sinh viên — ứng tuyển");

let applicationId = "";
let withdrawableApplicationId = "";

await test("GET /student/profile trả hồ sơ của sinh viên", () => {
  const body = call<{ fullName: string; skills: string[] }>(
    "GET",
    "/api/v1/student/profile",
    { token: student.token }
  );
  assert.ok(body.data.fullName.length > 0);
  assert.ok(Array.isArray(body.data.skills));
});

await test("POST /student/applications tạo đơn ứng tuyển", () => {
  const body = call<{ id: string; status: string; jobTitle: string }>(
    "POST",
    "/api/v1/student/applications",
    {
      token: student.token,
      data: {
        jobId: newJobId,
        coverLetter: "Em rất mong được ứng tuyển vị trí này.",
        expectedSalary: 28000,
      },
    }
  );
  assert.equal(body.data.status, "PENDING");
  applicationId = body.data.id;
});

await test("ứng tuyển trùng tin -> 400", () => {
  callExpectError("POST", "/api/v1/student/applications", 400, {
    token: student.token,
    data: { jobId: newJobId, coverLetter: "Ứng tuyển lần 2" },
  });
});

await test("GET /student/applications trả đơn của tôi", () => {
  const body = call<Array<{ id: string; status: string }>>(
    "GET",
    "/api/v1/student/applications",
    { token: student.token }
  );
  const mine = body.data.find((item) => item.id === applicationId);
  assert.ok(mine, "phải thấy đơn vừa tạo");
  assert.equal(mine!.status, "PENDING");
});

await test("sinh viên khác không xem được đơn của người khác -> 403", () => {
  const other = login("khac.sinhvien@viejob.vn");
  callExpectError(
    "GET",
    `/api/v1/student/applications/${applicationId}`,
    403,
    { token: other.token }
  );
});
await test("lưu / bỏ lưu tin tuyển dụng", () => {
  const list = call<{ items: Array<{ id: string }> }>(
    "GET",
    "/api/v1/jobs/public",
    { params: { pageSize: "1" } }
  );
  const jobId = list.data.items[0]!.id;

  call("POST", "/api/v1/student/saved-jobs", {
    token: student.token,
    data: { jobId },
  });
  const saved = call<Array<{ jobId: string }>>(
    "GET",
    "/api/v1/student/saved-jobs",
    { token: student.token }
  );
  assert.ok(saved.data.some((item) => item.jobId === jobId));

  call("DELETE", `/api/v1/student/saved-jobs/${jobId}`, {
    token: student.token,
  });
  const after = call<Array<{ jobId: string }>>(
    "GET",
    "/api/v1/student/saved-jobs",
    { token: student.token }
  );
  assert.ok(!after.data.some((item) => item.jobId === jobId));
});

await test("cập nhật hồ sơ sinh viên được lưu vào DB", () => {
  const body = call<{ fullName: string; major: string }>(
    "PUT",
    "/api/v1/student/profile",
    {
      token: student.token,
      data: { fullName: "Nguyễn Thanh Hà", major: "Quản trị Kinh doanh" },
    }
  );
  assert.equal(body.data.major, "Quản trị Kinh doanh");
});

await test("rút đơn ứng tuyển -> trạng thái WITHDRAWN", () => {
  // Tạo 1 tin mới (đã duyệt) để rút đơn mà không ảnh hưởng luồng chính
  const created = call<{ id: string }>("POST", "/api/v1/employer/jobs", {
    token: employer.token,
    data: {
      title: "Tin tuyển dụng tạm để test rút đơn",
      description: "Mô tả công việc",
      requirements: [],
      benefits: [],
      category: { id: "cat-bep", name: "Bếp & Nấu ăn", slug: "bep" },
      employmentType: "PART_TIME",
      workMode: "ONSITE",
      salaryType: "HOURLY",
      salaryMin: 25000,
      salaryMax: null,
      positionsCount: 1,
      location: {
        provinceId: "hcm",
        province: "TP. Hồ Chí Minh",
        districtId: "q1",
        district: "Quận 1",
        address: "",
        branchName: null,
      },
      schedules: [],
    },
  });
  call("PATCH", `/api/v1/admin/jobs/${created.data.id}/review`, {
    data: { action: "APPROVE" },
  });

  const application = call<{ id: string }>(
    "POST",
    "/api/v1/student/applications",
    {
      token: student.token,
      data: { jobId: created.data.id, coverLetter: "Xin ứng tuyển" },
    }
  );
  withdrawableApplicationId = application.data.id;

  const withdrawn = call<{ status: string; timeline: unknown[] }>(
    "PATCH",
    `/api/v1/student/applications/${withdrawableApplicationId}/withdraw`,
    { token: student.token }
  );
  assert.equal(withdrawn.data.status, "WITHDRAWN");
  assert.ok(withdrawn.data.timeline.length >= 2);
});

await test("NTD xoá tin tuyển dụng của mình", () => {
  const created = call<{ id: string }>("POST", "/api/v1/employer/jobs", {
    token: employer.token,
    data: {
      title: "Tin tuyển dụng sẽ bị xoá",
      description: "",
      requirements: [],
      benefits: [],
      category: { id: "cat-giao-hang", name: "Giao hàng", slug: "giao-hang" },
      employmentType: "PART_TIME",
      workMode: "ONSITE",
      salaryType: "HOURLY",
      salaryMin: 20000,
      salaryMax: null,
      positionsCount: 1,
      location: {
        provinceId: "hcm",
        province: "TP. Hồ Chí Minh",
        districtId: "q1",
        district: "Quận 1",
        address: "",
        branchName: null,
      },
      schedules: [],
    },
  });

  call("DELETE", `/api/v1/employer/jobs/${created.data.id}`, {
    token: employer.token,
  });

  const remaining = call<Array<{ id: string }>>(
    "GET",
    "/api/v1/employer/jobs",
    { token: employer.token }
  );
  assert.ok(!remaining.data.some((job) => job.id === created.data.id));
});

console.log("\n📬  Nhà tuyển dụng — duyệt ứng viên");

await test("GET /employer/applications trả ứng viên của NTD", () => {
  const body = call<Array<{ id: string }>>(
    "GET",
    "/api/v1/employer/applications",
    { token: employer.token }
  );
  assert.ok(body.data.some((item) => item.id === applicationId));
});

await test("PATCH trạng thái đơn -> ghi timeline", () => {
  const body = call<{ status: string; timeline: unknown[] }>(
    "PATCH",
    `/api/v1/employer/applications/${applicationId}`,
    { token: employer.token, data: { status: "ACCEPTED" } }
  );
  assert.equal(body.data.status, "ACCEPTED");
  assert.ok(body.data.timeline.length >= 2);
});

await test("số suất của tin được cập nhật theo số ứng viên được nhận", () => {
  const body = call<Array<{ id: string; positionsFilled: number }>>(
    "GET",
    "/api/v1/employer/jobs",
    { token: employer.token }
  );
  const job = body.data.find((item) => item.id === newJobId);
  assert.ok(job);
  assert.ok(job!.positionsFilled >= 1);
});

console.log("\n⭐  Đánh giá 2 chiều");

await test("chưa hoàn thành công việc -> không đánh giá được", () => {
  callExpectError("POST", "/api/v1/reviews", 400, {
    token: student.token,
    data: { applicationId, rating: 5, comment: "Rất hài lòng" },
  });
});

await test("hoàn thành công việc -> sinh viên đánh giá được NTD", () => {
  call("PATCH", `/api/v1/employer/applications/${applicationId}`, {
    token: employer.token,
    data: { status: "COMPLETED" },
  });

  const body = call<{ rating: number; targetType: string }>(
    "POST",
    "/api/v1/reviews",
    {
      token: student.token,
      data: {
        applicationId,
        rating: 5,
        comment: "Trả lương đúng hẹn, đồng nghiệp thân thiện.",
      },
    }
  );
  assert.equal(body.data.rating, 5);
  assert.equal(body.data.targetType, "EMPLOYER");
});

await test("NTD đánh giá ngược lại sinh viên", () => {
  const body = call<{ rating: number; targetType: string }>(
    "POST",
    "/api/v1/reviews",
    {
      token: employer.token,
      data: {
        applicationId,
        rating: 4,
        comment: "Ứng viên làm việc chăm chỉ, đúng giờ.",
      },
    }
  );
  assert.equal(body.data.targetType, "STUDENT");
});

await test("GET /reviews lọc theo targetType", () => {
  const body = call<Array<{ targetType: string }>>(
    "GET",
    "/api/v1/reviews",
    { params: { targetType: "EMPLOYER" } }
  );
  assert.ok(body.data.every((review) => review.targetType === "EMPLOYER"));
  assert.ok(body.data.length > 0);
});

await test("NTD trả lời đánh giá được", () => {
  const reviews = call<Array<{ id: string; reply: string | null }>>(
    "GET",
    "/api/v1/reviews",
    { params: { targetType: "EMPLOYER" } }
  );
  const target = reviews.data[0]!;
  const body = call<{ reply: string | null }>(
    "POST",
    `/api/v1/employer/reviews/${target.id}/reply`,
    { token: employer.token, data: { reply: "Cảm ơn bạn đã góp ý!" } }
  );
  assert.equal(body.data.reply, "Cảm ơn bạn đã góp ý!");
});

await test("admin ẩn/hiện đánh giá", () => {
  const reviews = call<Array<{ id: string; isHidden: boolean }>>(
    "GET",
    "/api/v1/reviews"
  );
  const target = reviews.data[0]!;

  const hidden = call<{ isHidden: boolean }>(
    "PATCH",
    `/api/v1/admin/reviews/${target.id}`,
    { data: { isHidden: true } }
  );
  assert.equal(hidden.data.isHidden, true);

  const shown = call<{ isHidden: boolean }>(
    "PATCH",
    `/api/v1/admin/reviews/${target.id}`,
    { data: { isHidden: false } }
  );
  assert.equal(shown.data.isHidden, false);
});

console.log("\n🔔  Thông báo");

await test("sinh viên nhận thông báo khi NTD đổi trạng thái đơn", () => {
  const body = call<Array<{ type: string; title: string }>>(
    "GET",
    "/api/v1/notifications",
    { token: student.token }
  );
  assert.ok(
    body.data.some((item) => item.type === "APPLICATION_STATUS"),
    "phải có thông báo cập nhật đơn ứng tuyển"
  );
});

await test("đếm số thông báo chưa đọc + đánh dấu đã đọc", () => {
  const before = call<{ count: number }>(
    "GET",
    "/api/v1/notifications/unread-count",
    { token: student.token }
  );
  assert.ok(before.data.count > 0);

  const list = call<Array<{ id: string; isRead: boolean }>>(
    "GET",
    "/api/v1/notifications",
    { token: student.token }
  );
  const unread = list.data.find((item) => !item.isRead);
  assert.ok(unread);

  const marked = call<{ isRead: boolean }>(
    "PATCH",
    `/api/v1/notifications/${unread!.id}/read`,
    { token: student.token }
  );
  assert.equal(marked.data.isRead, true);

  const after = call<{ count: number }>(
    "GET",
    "/api/v1/notifications/unread-count",
    { token: student.token }
  );
  assert.equal(after.data.count, before.data.count - 1);
});

await test("đánh dấu đọc tất cả", () => {
  const body = call<{ count: number }>(
    "POST",
    "/api/v1/notifications/read-all",
    { token: student.token }
  );
  assert.ok(body.data.count >= 0);

  const after = call<{ count: number }>(
    "GET",
    "/api/v1/notifications/unread-count",
    { token: student.token }
  );
  assert.equal(after.data.count, 0);
});

console.log("\n🗂️  Quản trị viên — danh mục & người dùng");

await test("CRUD nhóm việc: tạo -> sửa -> xoá mềm", () => {
  const created = call<{ id: string; slug: string; isActive: boolean }>(
    "POST",
    "/api/v1/admin/categories",
    { data: { name: "Thiết kế đồ hoạ", description: "Mẫu thiết kế" } }
  );
  assert.equal(created.data.isActive, true);
  assert.equal(created.data.slug, "thiet-ke-do-hoa");

  const updated = call<{ description: string }>(
    "PUT",
    `/api/v1/admin/categories/${created.data.id}`,
    { data: { description: "Mẫu thiết kế UI/UX" } }
  );
  assert.equal(updated.data.description, "Mẫu thiết kế UI/UX");

  const removed = call<{ id: string }>(
    "DELETE",
    `/api/v1/admin/categories/${created.data.id}`
  );
  assert.equal(removed.data.id, created.data.id);
});

await test("tạo nhóm việc trùng slug -> 400", () => {
  // "Công nghệ" tạo ra slug "cong-nghe" — đã tồn tại trong seed data
  callExpectError("POST", "/api/v1/admin/categories", 400, {
    data: { name: "Công nghệ" },
  });
});

await test("GET /admin/users lọc theo role", () => {
  const body = call<Array<{ role: string }>>(
    "GET",
    "/api/v1/admin/users",
    { params: { role: "STUDENT" } }
  );
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((user) => user.role === "STUDENT"));
});

await test("khoá tài khoản -> đăng nhập lại bị 401", () => {
  const users = call<Array<{ id: number; email: string }>>(
    "GET",
    "/api/v1/admin/users",
    { params: { role: "STUDENT" } }
  );
  const target = users.data.find(
    (user) => user.email === "khac.sinhvien@viejob.vn"
  );
  assert.ok(target);

  call("PATCH", `/api/v1/admin/users/${target!.id}`, {
    data: { isLocked: true },
  });

  callExpectError("POST", "/api/v1/auth/login", 401, {
    data: { email: "khac.sinhvien@viejob.vn", password: "Password@123" },
  });
});

await test("đổi role người dùng", () => {
  const users = call<Array<{ id: number; email: string }>>(
    "GET",
    "/api/v1/admin/users",
    { params: { role: "STUDENT" } }
  );
  const target = users.data.find(
    (user) => user.email === "new.student@viejob.vn"
  );
  assert.ok(target);

  const body = call<{ role: string }>(
    "PATCH",
    `/api/v1/admin/users/${target!.id}`,
    { data: { role: "ADMIN" } }
  );
  assert.equal(body.data.role, "ADMIN");
});

console.log(
  failures === 0
    ? "\n🎉 Tất cả test MOCK API PASSED!\n"
    : `\n💥 ${failures} test MOCK API FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
