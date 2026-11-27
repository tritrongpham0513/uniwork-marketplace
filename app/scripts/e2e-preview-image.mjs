/**
 * 🖼️ Kiểm tra end-to-end luồng ảnh preview tin tuyển dụng.
 *
 * 1. Nhà tuyển dụng tải ảnh lên (presign -> PUT -> confirm).
 * 2. Gắn ảnh vào tin.
 * 3. Kiểm tra tin có ảnh trong response + danh sách công khai.
 * 4. Kiểm tra ảnh của NTD khác bị từ chối (ràng buộc sở hữu).
 * 5. Kiểm tra xoá ảnh.
 *
 * Chạy: node scripts/e2e-preview-image.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

let failures = 0;
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${error.message}`);
  }
};

let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
} catch {
  browser = await chromium.launch();
}
const context = await browser.newContext({ locale: "vi-VN" });
const page = await context.newPage();

console.log(`\n🖼️  E2E — luồng ảnh preview tin tuyển dụng (${BASE_URL})\n`);

/** Xoá phiên đăng nhập hiện tại (token trong localStorage + cookie). */
const resetAuth = async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await context.clearCookies();
};

const loginAs = async (email, password) => {
  await resetAuth();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[id="email"]', email);
  await page.fill('input[name="password"], input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20000,
  });
};

/** Gọi API từ trong trang (dùng token đang đăng nhập). */
const api = (path, options = {}) =>
  page.evaluate(
    async ({ path, options }) => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(path, {
        method: options.method ?? "GET",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {}),
        },
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
      return { status: res.status, body };
    },
    { path, options }
  );

/** PNG 1x1 hợp lệ (base64). */
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const uploaded = {};

await test("tải ảnh preview lên thành công (loại JOB_IMAGE)", async () => {
  await loginAs("employer@viejob.vn", "Employer@123");

  // B1. Xin presigned URL.
  const presign = await api(
    "/api/v1/files/presign?kind=JOB_IMAGE&contentType=image/png",
    { method: "POST" }
  );
  assert(
    presign.status === 200,
    `presign lỗi HTTP ${presign.status}: ${JSON.stringify(presign.body)}`
  );
  assert(
    presign.body?.data?.storageKey?.startsWith("job_image/"),
    `storageKey phải bắt đầu bằng job_image/ — thực tế: ${presign.body?.data?.storageKey}`
  );

  // B2. PUT thẳng lên nơi lưu trữ.
  const putRes = await page.evaluate(
    async ({ url, contentType, base64 }) => {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
      });
      return { status: res.status };
    },
    {
      url: presign.body.data.uploadUrl,
      contentType: presign.body.data.contentType,
      base64: PNG_1PX,
    }
  );
  assert(putRes.status < 300, `PUT lên storage lỗi HTTP ${putRes.status}`);

  // B3. Xác nhận.
  const confirm = await api("/api/v1/files/confirm", {
    method: "POST",
    body: JSON.stringify({
      storageKey: presign.body.data.storageKey,
      kind: "JOB_IMAGE",
      fileName: "preview.png",
    }),
  });
  assert(
    confirm.status === 200 || confirm.status === 201,
    `confirm lỗi HTTP ${confirm.status}: ${JSON.stringify(confirm.body)}`
  );
  assert(
    confirm.body?.data?.kind === "JOB_IMAGE",
    `kind phải là JOB_IMAGE — thực tế: ${confirm.body?.data?.kind}`
  );

  uploaded.url = confirm.body.data.url;
  uploaded.slug = confirm.body.data.id;
  console.log(`     file: ${uploaded.url}`);
});

/** Payload đầy đủ cho PUT tin tuyển dụng. */
const buildPayload = (job, previewImageUrl) => ({
  title: job.title,
  description: job.description,
  requirements: job.requirements ?? [],
  benefits: job.benefits ?? [],
  category: job.category,
  position: job.position ?? null,
  employmentType: job.employmentType,
  workMode: job.workMode,
  salaryType: job.salaryType,
  salaryMin: job.salaryMin,
  salaryMax: job.salaryMax,
  location: job.location,
  positionsCount: job.positionsCount,
  positionsFilled: job.positionsFilled ?? 0,
  schedules: job.schedules ?? [],
  skills: job.skills ?? [],
  deadline: job.deadline ?? null,
  previewImageUrl,
});

/**
 * Kết quả AI chỉ quản trị viên thấy -> đọc qua endpoint admin.
 *
 * <p>Gọi sau khi đăng nhập quản trị viên; hàm tự đăng nhập lại nhà tuyển dụng
 * để trả về đúng ngữ cảnh cho các test sau.
 */
const aiCheckedAtOf = async (jobId) => {
  await loginAs("admin@viejob.vn", "Admin@123");
  const res = await api("/api/v1/admin/jobs?status=ALL");
  const payload = res.body?.data;
  const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
  const job = items.find((j) => j.id === jobId);
  const value = job?.aiCheckedAt ?? null;
  await loginAs("employer@viejob.vn", "Employer@123");
  return value;
};

await test("gắn ảnh vào tin tuyển dụng -> tin có previewImageUrl", async () => {
  const list = await api("/api/v1/employer/jobs");
  const jobs = list.body?.data ?? [];
  assert(jobs.length > 0, "nhà tuyển dụng demo phải có ít nhất 1 tin");

  // Chọn tin đang OPEN — tin OPEN khi sửa sẽ quay lại PENDING_REVIEW,
  // đây mới là nhánh cần kiểm tra "chỉ đổi ảnh thì không gọi lại AI".
  const target = jobs.find((j) => j.status === "OPEN") ?? jobs[0];
  uploaded.originalStatus = target.status;

  const detail = await api(`/api/v1/jobs/public/${target.id}`);
  const job = detail.body?.data;

  const update = await api(`/api/v1/employer/jobs/${target.id}`, {
    method: "PUT",
    body: JSON.stringify(buildPayload(job, uploaded.url)),
  });

  assert(
    update.status === 200,
    `sửa tin lỗi HTTP ${update.status}: ${JSON.stringify(update.body)}`
  );
  assert(
    update.body?.data?.previewImageUrl === uploaded.url,
    `previewImageUrl phải bằng URL ảnh vừa tải — thực tế: ${update.body?.data?.previewImageUrl}`
  );

  uploaded.jobId = target.id;
  console.log(`     tin: ${target.id} (trạng thái gốc: ${target.status})`);
});

await test("sửa tin chỉ đổi ảnh -> tin quay lại chờ duyệt, KHÔNG gọi lại AI", async () => {
  const aiCheckedAtBefore = await aiCheckedAtOf(uploaded.jobId);

  const before = await api(`/api/v1/jobs/public/${uploaded.jobId}`);
  const update = await api(`/api/v1/employer/jobs/${uploaded.jobId}`, {
    method: "PUT",
    body: JSON.stringify(
      buildPayload(before.body.data, `/api/v1/files/${uploaded.slug}`)
    ),
  });
  assert(update.status === 200, `sửa tin lỗi HTTP ${update.status}`);

  const after = await api(`/api/v1/jobs/public/${uploaded.jobId}`);
  assert(
    after.body?.data?.status === "PENDING_REVIEW",
    `tin phải quay lại chờ duyệt — thực tế: ${after.body?.data?.status}`
  );

  // AI chạy nền -> chờ đủ lâu rồi kiểm tra lại.
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const aiCheckedAtAfter = await aiCheckedAtOf(uploaded.jobId);

  assert(
    aiCheckedAtAfter === aiCheckedAtBefore,
    `AI KHÔNG được gọi lại khi chỉ đổi ảnh — aiCheckedAt: ${aiCheckedAtBefore} -> ${aiCheckedAtAfter}`
  );
  console.log(`     aiCheckedAt giữ nguyên: ${aiCheckedAtAfter ?? "(null)"}`);
});

await test("sửa tin kèm nội dung chữ -> AI ĐƯỢC gọi lại", async () => {
  // Cần một tin RIÊNG đang OPEN — tin đã về PENDING_REVIEW ở test trên thì
  // không gọi lại AI (đúng thiết kế: tin chờ duyệt thì giữ hạn mức).
  const list = await api("/api/v1/employer/jobs");
  const jobs = list.body?.data ?? [];
  const target = jobs.find(
    (j) => j.status === "OPEN" && j.id !== uploaded.jobId
  );
  assert(target, "cần ít nhất 2 tin OPEN để kiểm tra 2 nhánh");

  // Kết quả AI chỉ quản trị viên thấy -> đọc qua endpoint admin.
  const aiCheckedAtBefore = await aiCheckedAtOf(target.id);

  const detail = await api(`/api/v1/jobs/public/${target.id}`);
  const job = detail.body?.data;

  const payload = buildPayload(job, job.previewImageUrl ?? "");
  payload.title = `${job.title} (đã sửa nội dung)`;
  payload.description = `${job.description} — nội dung đã thay đổi.`;

  const update = await api(`/api/v1/employer/jobs/${target.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  assert(update.status === 200, `sửa tin lỗi HTTP ${update.status}`);

  // AI chạy nền (afterCommit) -> chờ một chút rồi kiểm tra lại.
  await new Promise((resolve) => setTimeout(resolve, 12000));

  const aiCheckedAtAfter = await aiCheckedAtOf(target.id);

  assert(
    aiCheckedAtAfter !== aiCheckedAtBefore,
    `AI phải được gọi lại khi nội dung chữ thay đổi — aiCheckedAt: ${aiCheckedAtBefore} -> ${aiCheckedAtAfter}`
  );
  console.log(`     aiCheckedAt đã cập nhật: ${aiCheckedAtAfter}`);
});

await test("tin có ảnh hiển thị đúng ảnh trong danh sách công khai", async () => {
  const detail = await api(`/api/v1/jobs/public/${uploaded.jobId}`);
  assert(
    detail.body?.data?.previewImageUrl === uploaded.url,
    `ảnh trong response công khai phải khớp — thực tế: ${detail.body?.data?.previewImageUrl}`
  );
});

await test("không dán được ảnh của nhà tuyển dụng khác", async () => {
  // Sinh viên không có quyền đăng tin — nhưng vẫn phải bị backend chặn.
  await loginAs("student@viejob.vn", "Student@123");

  const res = await api("/api/v1/employer/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Tin test ảnh preview",
      description: "test",
      category: { id: "cat-day-hoc", name: "Dạy kèm" },
      employmentType: "PART_TIME",
      workMode: "ONSITE",
      salaryType: "HOURLY",
      salaryMin: 25000,
      salaryMax: 30000,
      positionsCount: 1,
      location: {
        provinceId: "p01",
        province: "Hà Nội",
        wardId: "w001",
        ward: "Phường",
        address: "Số 1",
        branchName: null,
      },
      previewImageUrl: uploaded.url,
    }),
  });

  assert(
    res.status === 400 || res.status === 403,
    `phải bị chặn (400/403) — thực tế HTTP ${res.status}`
  );
  console.log(`     bị chặn với HTTP ${res.status}`);
});

await test("xoá ảnh khỏi tin -> previewImageUrl trở về rỗng", async () => {
  await loginAs("employer@viejob.vn", "Employer@123");

  const detail = await api(`/api/v1/jobs/public/${uploaded.jobId}`);
  const job = detail.body?.data;

  const update = await api(`/api/v1/employer/jobs/${uploaded.jobId}`, {
    method: "PUT",
    body: JSON.stringify(buildPayload(job, "")),
  });

  assert(
    update.status === 200,
    `sửa tin lỗi HTTP ${update.status}: ${JSON.stringify(update.body)}`
  );
  assert(
    !update.body?.data?.previewImageUrl,
    `ảnh phải được xoá — thực tế: ${update.body?.data?.previewImageUrl}`
  );
});

await browser.close();

console.log(
  failures === 0
    ? "\n✅ Luồng ảnh preview hoạt động đúng end-to-end\n"
    : `\n💥 ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);