/**
 * Kiểm chứng UI: sinh viên rút đơn xong ứng tuyển lại được.
 *
 * Chạy:  SMOKE_BASE_URL=http://localhost:5173 node scripts/verify-reapply.mjs
 *        (backend dev ở :8081, frontend dev ở :5173)
 */

import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const API = process.env.SMOKE_API_URL ?? "http://localhost:8081/api/v1";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("/api/")) {
    consoleErrors.push(`HTTP ${r.status()} ${r.url()}`);
  }
});

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  ❌ ${name}\n     ${e.message.split("\n")[0]}`);
  }
};

// ------------------------------------------------------------------
// API helper — tạo dữ liệu nền (đơn ứng tuyển rồi rút) bằng API thật
// ------------------------------------------------------------------
async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

const login = await api("/auth/login", {
  method: "POST",
  body: { email: "student@viejob.vn", password: "Student@123" },
});
const token = login.data.data.accessToken;

// Tìm 1 tin OPEN mà SV chưa ứng tuyển
const jobsRes = await api("/jobs/public?page=0&size=50", { token });
const page0 = jobsRes.data.data;
const items = page0.content ?? page0.items ?? [];
const openJobs = items.filter((j) => j.status === "OPEN");

let jobId = null;
let jobTitle = null;
for (const j of openJobs) {
  const r = await api(`/student/applications/job/${j.id}`, { token });
  if (r.status === 200 && r.data.data === null) {
    jobId = j.id;
    jobTitle = j.title;
    break;
  }
}

// Hết tin OPEN chưa ứng tuyển (SV demo đã ứng tuyển hết) → tự tạo 1 tin mới.
if (!jobId) {
  const emp = await api("/auth/login", {
    method: "POST",
    body: { email: "employer@viejob.vn", password: "Employer@123" },
  });
  const empToken = emp.data.data.accessToken;
  // Lấy nhóm việc + vị trí thật từ API danh mục.
  const cats = await api("/public/categories", { token: empToken });
  const cat = (cats.data.data ?? [])[0];
  const positions = await api(`/public/positions?categoryId=${cat.id}`, {
    token: empToken,
  });
  const pos = (positions.data.data ?? [])[0];
  const provs = await api("/public/provinces", { token: empToken });
  const prov = (provs.data.data ?? [])[0];
  const created = await api("/employer/jobs", {
    method: "POST",
    token: empToken,
    body: {
      title: `Tin test ứng tuyển lại ${Date.now()}`,
      description: "Tin tạo tự động cho script kiểm chứng ứng tuyển lại.",
      category: { id: cat.id, name: cat.name },
      position: pos ? { id: pos.id, name: pos.name } : null,
      employmentType: "PART_TIME",
      workMode: "ONSITE",
      salaryType: "HOURLY",
      salaryMin: 25000,
      salaryMax: 35000,
      positionsCount: 1,
      location: {
        provinceId: prov.id,
        province: prov.name,
        address: "123 Nguyễn Huệ",
      },
      schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    },
  });
  if (created.status >= 400) {
    console.error("Không tạo được tin test:", JSON.stringify(created.data).slice(0, 300));
    await browser.close();
    process.exit(1);
  }
  jobId = created.data.data.id;
  jobTitle = created.data.data.title;
  console.log(`  → tự tạo tin mới: ${jobId}`);

  // Tin mới luôn ở PENDING_REVIEW → cần Admin duyệt mới ứng tuyển được.
  const admin = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@viejob.vn", password: "Admin@123" },
  });
  const approved = await api(`/admin/jobs/${jobId}/review`, {
    method: "PATCH",
    token: admin.data.data.accessToken,
    body: { action: "APPROVE" },
  });
  if (approved.status >= 400) {
    console.error("Không duyệt được tin:", JSON.stringify(approved.data).slice(0, 300));
    await browser.close();
    process.exit(1);
  }
  console.log("  → đã duyệt tin");
}
if (!jobId) {
  console.error("Không tìm được tin OPEN chưa ứng tuyển.");
  await browser.close();
  process.exit(1);
}
console.log(`  → tin dùng để test: ${jobId}`);

// Tạo đơn PENDING rồi rút -> WITHDRAWN
const created = await api("/student/applications", {
  method: "POST",
  token,
  body: {
    jobId,
    coverLetter: "Kiem chu nghiem viet lai don.",
    experience: "6 thang lam phuc vu",
    expectedSalary: 30000,
  },
});
const appId = created.data.data.id;
const withdrawn = await api(`/student/applications/${appId}/withdraw`, {
  method: "PATCH",
  token,
});
if (withdrawn.data.data?.status !== "WITHDRAWN") {
  console.error("Không rút được đơn để test.");
  await browser.close();
  process.exit(1);
}
console.log(`  → đơn đã rút: ${appId}`);

// ------------------------------------------------------------------
// UI
// ------------------------------------------------------------------
await check("đăng nhập sinh viên", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[type="email"]', "student@viejob.vn");
  await page.fill('input[name="password"], input[type="password"]', "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student/, { timeout: 15000 });
  await page.waitForTimeout(2000);
});

await check("trang chi tiết tin hiện nút 'Ứng tuyển lại'", async () => {
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  if (!text.includes("Ứng tuyển lại"))
    throw new Error(`không thấy nút "Ứng tuyển lại" — trang hiện: ${text.slice(0, 200)}`);
  if (text.includes("Ứng tuyển ngay"))
    throw new Error("vẫn hiện nút 'Ứng tuyển ngay' cho đơn đã rút");
});

await check("bấm 'Ứng tuyển lại' → mở form ứng tuyển", async () => {
  await page.click('button:has-text("Ứng tuyển lại")');
  await page.waitForURL(/\/apply/, { timeout: 10000 });
  await page.waitForTimeout(2000);
  const text = await page.locator("body").innerText();
  if (!text.includes("Ứng tuyển lại việc làm"))
    throw new Error(`form không báo đây là ứng tuyển lại: ${text.slice(0, 200)}`);
  if (!text.includes("Gửi lại đơn ứng tuyển"))
    throw new Error("nút submit không đổi sang 'Gửi lại đơn ứng tuyển'");
});

await check("gửi lại đơn → thành công, quay về danh sách đơn", async () => {
  await page.fill("#cover-letter", "Kiem chu nghiem viet lai don lan 2.");
  await page.fill("#experience", "6 thang lam phuc vu");
  // Checkbox base-ui: id nằm trên <input> ẩn, phần click được là <span role="checkbox">.
  const agreeBox = page.locator('[role="checkbox"]').first();
  await agreeBox.click();
  await page.waitForTimeout(300);
  const agreed = await agreeBox.getAttribute("aria-checked");
  if (agreed !== "true") throw new Error(`checkbox chưa được tick (aria-checked=${agreed})`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student\/applications/, { timeout: 15000 });
  await page.waitForTimeout(2500);
  // Chỉ kiểm tra đơn của tin đang test — danh sách còn đơn "Đã rút" cũ từ
  // các lần test trước, không liên quan.
  const row = page.locator(`li`, { hasText: jobTitle }).first();
  const rowText = await row.innerText();
  if (!rowText.includes("Đang chờ"))
    throw new Error(`đơn không ở trạng thái 'Đang chờ': ${rowText.slice(0, 200)}`);
  if (rowText.includes("Đã rút"))
    throw new Error("đơn vẫn ở trạng thái 'Đã rút'");
});

await check("đơn cũ được tái kích hoạt (không tạo dòng mới)", async () => {
  const list = await api("/student/applications", { token });
  const apps = list.data.data;
  const forJob = apps.filter((a) => a.jobId === jobId);
  if (forJob.length !== 1)
    throw new Error(`có ${forJob.length} đơn cho tin này — phải đúng 1 (tái kích hoạt dòng cũ)`);
  if (forJob[0].status !== "PENDING")
    throw new Error(`trạng thái sai: ${forJob[0].status}`);
  if (forJob[0].id !== appId)
    throw new Error(`id đơn đổi: ${appId} -> ${forJob[0].id}`);
});

await check("trang chi tiết tin hiện 'Đã ứng tuyển — xem hồ sơ'", async () => {
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  if (!text.includes("Đã ứng tuyển"))
    throw new Error("không hiện trạng thái đã ứng tuyển");
  if (text.includes("Ứng tuyển lại"))
    throw new Error("vẫn hiện nút 'Ứng tuyển lại' sau khi đã ứng tuyển");
});

await check("không có lỗi console / HTTP 4xx-5xx", async () => {
  const real = consoleErrors.filter(
    (e) => !e.includes("401") && !e.includes("403")
  );
  if (real.length) throw new Error(real.slice(0, 3).join(" | "));
});

await browser.close();

console.log();
if (failures > 0) {
  console.error(`FAILED: ${failures} test`);
  process.exit(1);
}
console.log("PASSED: tất cả");
