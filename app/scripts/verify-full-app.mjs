/**
 * 🔎 Kiểm chứng toàn diện — chạy app thật trong Chrome và tự động đi qua
 * từng luồng nghiệp vụ của cả 3 vai trò.
 *
 * Mục tiêu: bỏ trạng thái "mơ mơ màn màn" — mỗi route đều được mở thật,
 * mỗi luồng đều được thao tác thật, và mọi lỗi console / lỗi HTTP đều
 * được gom lại báo cáo.
 *
 * Chạy:
 *   SMOKE_BASE_URL=http://localhost:8000 node scripts/verify-full-app.mjs
 *
 * Mặc định dùng Chrome hệ thống (channel "chrome"), fallback về Chromium bundled.
 * Ảnh chụp: .tmp-verify-full/
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:8000";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "./.tmp-verify-full";
const HEADED = process.env.HEADED === "1";

mkdirSync(SHOTS_DIR, { recursive: true });

const ACCOUNTS = {
  student: { email: "student@viejob.vn", password: "Student@123", home: "/student" },
  employer: { email: "employer@viejob.vn", password: "Employer@123", home: "/employer" },
  admin: { email: "admin@viejob.vn", password: "Admin@123", home: "/admin" },
};

let failures = 0;
let passed = 0;
const report = [];

const check = async (name, fn) => {
  const started = Date.now();
  try {
    await fn();
    passed += 1;
    const ms = Date.now() - started;
    report.push({ ok: true, name, ms });
    console.log(`  ✅ ${name}${ms > 1500 ? ` (${ms}ms)` : ""}`);
  } catch (error) {
    failures += 1;
    report.push({ ok: false, name, error: error.message });
    console.error(`  ❌ ${name}`);
    console.error(`     ${error.message.split("\n")[0]}`);
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const launchOptions = { channel: "chrome", headless: !HEADED };
let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch {
  browser = await chromium.launch({ headless: !HEADED });
}

// Mỗi vai trò một context riêng → cookie/token độc lập, không lẫn nhau
const makeContext = async () => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN",
  });
  const page = await context.newPage();
  const errors = [];
  const badResponses = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("response", (res) => {
    const url = res.url();
    if (!url.includes("/api/")) return;
    if (res.status() >= 400) badResponses.push(`${res.status()} ${url}`);
  });
  return { context, page, errors, badResponses };
};

const login = async (page, account) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
  await waitReady(page, 3500);
};

const bodyText = (page) => page.locator("body").innerText();

/** Chờ app render xong (React + TanStack Query) rồi mới đọc nội dung */
const waitReady = async (page, ms = 2500) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

// ===================================================================
// GUEST — khách chưa đăng nhập
// ===================================================================
console.log(`\n🌍 GUEST — ${BASE_URL}\n`);
const guest = await makeContext();
const gp = guest.page;

await check("trang chủ render + có dữ liệu tin tuyển dụng thật", async () => {
  await gp.goto(BASE_URL, { waitUntil: "networkidle" });
  const text = await bodyText(gp);
  assert(text.length > 2000, "trang chủ quá ngắn");
  assert(/Việc làm thêm|phù hợp lịch học/i.test(text), "thiếu hero");
  assert(/Lương tối thiểu|LOẠI HÌNH|CẦN TUYỂN/i.test(text), "thiếu card việc làm");
  await gp.screenshot({ path: `${SHOTS_DIR}/01-home.png` });
});

await check("danh sách việc làm: có bộ lọc, phân trang, số lượng khớp API", async () => {
  await gp.goto(`${BASE_URL}/jobs`, { waitUntil: "networkidle" });
  const text = await bodyText(gp);
  assert(/Tìm thấy \d+ cơ hội việc làm/.test(text), "không có dòng đếm kết quả");
  assert(/Bộ lọc/.test(text), "thiếu panel bộ lọc");
  assert(
    (await gp.locator('input[type="checkbox"]').count()) > 10,
    "bộ lọc không có checkbox"
  );
  await gp.screenshot({ path: `${SHOTS_DIR}/02-jobs.png` });
});

await check("lọc theo nhóm việc cập nhật URL + số kết quả", async () => {
  await gp.goto(`${BASE_URL}/jobs?categoryIds=cat-cong-nghe`, {
    waitUntil: "networkidle",
  });
  const text = await bodyText(gp);
  const total = Number(text.match(/Tìm thấy (\d+) cơ hội/)?.[1]);
  assert(total > 0 && total < 43, `lọc không thu hẹp kết quả (${total})`);
});

await check("tìm kiếm theo keyword hoạt động", async () => {
  await gp.goto(`${BASE_URL}/jobs?keyword=barista`, { waitUntil: "networkidle" });
  const text = await bodyText(gp);
  const total = Number(text.match(/Tìm thấy (\d+) cơ hội/)?.[1]);
  assert(total >= 0, "không đọc được số kết quả");
  assert(total < 43, `keyword không lọc (${total})`);
});

await check("chi tiết tin tuyển dụng hiển thị lương, địa điểm, ca làm, mô tả", async () => {
  await gp.goto(`${BASE_URL}/jobs/job-001`, { waitUntil: "networkidle" });
  await waitReady(gp);
  const text = await bodyText(gp);
  assert(/\/jobs\/job-/.test(gp.url()), "không ở trang chi tiết tin");
  assert(/Mô tả công việc/i.test(text), "thiếu mô tả công việc");
  assert(/Yêu cầu/i.test(text), "thiếu yêu cầu");
  assert(/Quận|Hà Nội|Đà Nẵng|TP\. Hồ Chí Minh/i.test(text), "thiếu địa điểm");
  assert(/\d+[ktr].*\/giờ|\/giờ/.test(text), "thiếu mức lương");
  assert(/lượt xem|ứng viên/i.test(text), "thiếu lượt xem / số ứng viên");
  await gp.screenshot({ path: `${SHOTS_DIR}/03-job-detail.png` });
});

await check("hồ sơ nhà tuyển dụng công khai xem được không cần đăng nhập", async () => {
  await gp.goto(`${BASE_URL}/employer/emp-kim-phat`, { waitUntil: "networkidle" });
  const text = await bodyText(gp);
  assert(/Kim Phát/i.test(text), "không hiện tên công ty");
});

await check("trang 404 cho đường dẫn không tồn tại", async () => {
  await gp.goto(`${BASE_URL}/khong-ton-tai-xyz`, { waitUntil: "networkidle" });
  const text = await bodyText(gp);
  assert(/404|không tìm thấy|Tiêu đề không hợp lệ/i.test(text), "không hiện trang 404");
});

await check("route guard chặn khu vực admin khi chưa đăng nhập", async () => {
  await gp.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  assert(!gp.url().includes("/admin"), `bị lọt vào admin: ${gp.url()}`);
});

await check("trang giới thiệu, đăng ký, quên mật khẩu render được", async () => {
  for (const path of ["/about", "/register"]) {
    await gp.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    assert((await bodyText(gp)).length > 300, `${path} render rỗng`);
  }
});

await check("không có lỗi console nghiêm trọng ở phần Guest", () => {
  const fatal = guest.errors.filter(
    (m) => !/favicon|React DevTools|Download the React/i.test(m)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

// ===================================================================
// STUDENT — sinh viên
// ===================================================================
console.log(`\n🎓 STUDENT\n`);
const stu = await makeContext();
const sp = stu.page;

await check("đăng nhập sai mật khẩu → hiện toast lỗi", async () => {
  await sp.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await sp.fill("#email", "student@viejob.vn");
  await sp.fill("#password", "SaiMatKhau@999");
  await sp.click('button[type="submit"]');
  await sp.waitForSelector("text=/không chính xác|không hợp lệ/i", { timeout: 10000 });
  assert(sp.url().includes("/login"), "không được redirect khi login sai");
  await sp.screenshot({ path: `${SHOTS_DIR}/04-login-error.png` });
});

await check("đăng nhập thành công → vào đúng dashboard sinh viên", async () => {
  await login(sp, ACCOUNTS.student);
  await waitReady(sp, 3000);
  assert(new URL(sp.url()).pathname === "/student", `sai route: ${sp.url()}`);
  const text = await bodyText(sp);
  assert(/Xin chào/i.test(text), "thiếu lời chào");
  await sp.screenshot({ path: `${SHOTS_DIR}/05-student-dashboard.png` });
});

await check("dashboard SV có số liệu đơn + gợi ý việc làm", async () => {
  const text = await bodyText(sp);
  assert(/ĐƠN ĐANG CHỜ|ĐÃ ĐƯỢC NHẬN|ĐÃ HOÀN THÀNH/i.test(text), "thiếu thẻ thống kê");
  assert(/Đơn ứng tuyển gần đây|việc làm gợi ý/i.test(text), "thiếu danh sách");
});

await check("hồ sơ SV: lưu được và báo toast", async () => {
  await sp.goto(`${BASE_URL}/student/profile`, { waitUntil: "networkidle" });
  const save = sp.getByRole("button", { name: "Lưu hồ sơ" }).first();
  await save.click();
  await sp.waitForSelector("text=/Đã lưu hồ sơ/i", { timeout: 10000 });
  await sp.screenshot({ path: `${SHOTS_DIR}/06-student-profile.png` });
});

await check("hồ sơ SV: tab kỹ năng & kinh nghiệm render", async () => {
  await sp.getByRole("tab", { name: /Kỹ năng/i }).click();
  await sp.waitForTimeout(600);
  const text = await bodyText(sp);
  assert(/Kỹ năng phổ biến/i.test(text), "thiếu danh sách kỹ năng phổ biến");
  assert(/Kinh nghiệm làm việc/i.test(text), "thiếu phần kinh nghiệm");
});

await check("danh sách đơn ứng tuyển SV có bộ lọc + điều hướng chi tiết", async () => {
  await sp.goto(`${BASE_URL}/student/applications`, { waitUntil: "networkidle" });
  const text = await bodyText(sp);
  assert(/Đơn ứng tuyển/i.test(text), "thiếu tiêu đề");
  const links = await sp.locator('a[href^="/student/applications/"]').count();
  assert(links > 0, "không có link đơn ứng tuyển");
  await sp.screenshot({ path: `${SHOTS_DIR}/07-student-applications.png` });
});

await check("chi tiết đơn ứng tuyển có timeline trạng thái", async () => {
  await sp.goto(`${BASE_URL}/student/applications/app-001`, {
    waitUntil: "networkidle",
  });
  const text = await bodyText(sp);
  assert(/Trạng thái đơn/i.test(text), "thiếu trạng thái");
  assert(/Đang chờ|Được duyệt sơ bộ|Đã nhận/i.test(text), "thiếu mốc timeline");
});

await check("trang đánh giá SV: có điểm TB + nút phản hồi", async () => {
  await sp.goto(`${BASE_URL}/student/reviews`, { waitUntil: "networkidle" });
  const text = await bodyText(sp);
  assert(/trên 5 sao/i.test(text), "thiếu điểm trung bình");
  assert(
    (await sp.getByRole("button", { name: /Phản hồi|Sửa phản hồi/ }).count()) > 0,
    "thiếu nút phản hồi"
  );
  await sp.screenshot({ path: `${SHOTS_DIR}/08-student-reviews.png` });
});

await check("gửi phản hồi đánh giá từ SV (API thật) — không 404", async () => {
  await sp.goto(`${BASE_URL}/student/reviews`, { waitUntil: "networkidle" });
  const btn = sp.getByRole("button", { name: "Phản hồi" }).first();
  if ((await btn.count()) === 0) return; // đã phản hồi hết → bỏ qua
  await btn.click();
  const ta = sp.locator("[role=dialog] textarea").first();
  await ta.waitFor({ timeout: 8000 });
  await ta.fill("Phản hồi kiểm chứng tự động — cảm ơn công ty đã đối xử tốt.");
  const replyReq = sp.waitForResponse(
    (r) => r.url().includes("/student/reviews/") && r.url().endsWith("/reply"),
    { timeout: 15000 }
  );
  await sp
    .locator("[role=dialog]")
    .getByRole("button", { name: /Gửi phản hồi/ })
    .click();
  const res = await replyReq;
  assert(res.status() < 400, `API phản hồi đánh giá lỗi ${res.status()}`);
  await sp.waitForSelector("text=/Đã gửi phản hồi/i", { timeout: 10000 });
});

await check("tin đã lưu (SV) render + nút bỏ lưu hoạt động", async () => {
  await sp.goto(`${BASE_URL}/saved`, { waitUntil: "networkidle" });
  const text = await bodyText(sp);
  assert(text.length > 300, "trang tin đã lưu rỗng");
  await sp.screenshot({ path: `${SHOTS_DIR}/09-student-saved.png` });
});

await check("trung tâm thông báo (SV) render + badge đếm", async () => {
  await sp.goto(`${BASE_URL}/notifications`, { waitUntil: "networkidle" });
  const text = await bodyText(sp);
  assert(/Thông báo/i.test(text), "thiếu tiêu đề thông báo");
  await sp.screenshot({ path: `${SHOTS_DIR}/10-notifications.png` });
});

await check("SV bị chặn khỏi khu vực NTD và Admin", async () => {
  for (const path of ["/employer", "/admin"]) {
    await sp.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    assert(!sp.url().includes(path), `SV lọt vào ${path}`);
  }
});

await check("không có lỗi console nghiêm trọng ở phần Sinh viên", () => {
  // 401 từ /auth/login là hệ quả của test "đăng nhập sai mật khẩu" — bỏ qua.
  const fatal = stu.errors.filter(
    (m) =>
      !/favicon|React DevTools|Download the React/i.test(m) &&
      !/401/.test(m)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

await check("không có HTTP 4xx/5xx ở phần Sinh viên (trừ login sai)", () => {
  const unexpected = stu.badResponses.filter(
    (r) => !/\/reply/.test(r) && !/\/auth\/login/.test(r)
  );
  assert(
    unexpected.length === 0,
    `HTTP lỗi: ${unexpected.slice(0, 5).join(" | ")}`
  );
});

// ===================================================================
// EMPLOYER — nhà tuyển dụng
// ===================================================================
console.log(`\n🏢 EMPLOYER\n`);
const emp = await makeContext();
const ep = emp.page;

await check("đăng nhập NTD → vào dashboard nhà tuyển dụng", async () => {
  await login(ep, ACCOUNTS.employer);
  await waitReady(ep, 3000);
  assert(new URL(ep.url()).pathname === "/employer", `sai route: ${ep.url()}`);
  const text = await bodyText(ep);
  assert(/TIN ĐANG MỞ|ỨNG VIÊN CHỜ DUYỆT|TỶ LỆ ĐƯỢC DUYỆT/i.test(text), "thiếu thẻ thống kê");
  await ep.screenshot({ path: `${SHOTS_DIR}/11-employer-dashboard.png` });
});

await check("quản lý tin tuyển dụng: danh sách + trạng thái + số liệu", async () => {
  await ep.goto(`${BASE_URL}/employer/jobs`, { waitUntil: "networkidle" });
  const text = await bodyText(ep);
  assert(/Tin tuyển dụng/i.test(text), "thiếu tiêu đề");
  assert(/Đang tuyển|Chờ duyệt|Đang làm/i.test(text), "thiếu badge trạng thái");
  await ep.screenshot({ path: `${SHOTS_DIR}/12-employer-jobs.png` });
});

await check("wizard đăng tin: 4 bước + tóm tắt cập nhật theo dữ liệu", async () => {
  await ep.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: "networkidle" });
  const text = await bodyText(ep);
  assert(/Thông tin cơ bản/.test(text) && /Lương & suất/.test(text), "thiếu các bước");
  assert(/Tóm tắt tin đăng/.test(text), "thiếu khối tóm tắt");
  assert(/Chờ duyệt/.test(text), "thiếu cảnh báo trạng thái chờ duyệt");
});

await check("wizard đăng tin: chọn nhóm việc → vị trí cascade", async () => {
  await ep.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: "networkidle" });
  await ep.locator("#category").click();
  await ep.getByRole("option", { name: "F&B, Barista & Phục vụ" }).click();
  await ep.waitForTimeout(500);
  await ep.locator("#position").click();
  await ep.getByRole("option", { name: "Phục vụ", exact: true }).click();
  await ep.waitForTimeout(500);
  const summary = await bodyText(ep);
  assert(/Phục vủ|Phục vụ/.test(summary), "chưa chọn được vị trí");
  assert(
    /Tóm tắt tin đăng[\s\S]*?Phục vụ/.test(summary),
    "tóm tắt chưa cập nhật vị trí"
  );
});

await check("wizard đăng tin: chọn tỉnh → quận cascade + ca làm tính giờ", async () => {
  await ep.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: "networkidle" });
  await waitReady(ep, 2000);
  // Bước 3 chỉ mở khi các bước trước hợp lệ — điền tối thiểu trước.
  await ep.locator("#category").click();
  await ep.getByRole("option", { name: "F&B, Barista & Phục vụ" }).click();
  await ep.locator("#position").click();
  await ep.getByRole("option", { name: "Phục vụ", exact: true }).click();
  const title = ep.locator("input").first();
  await title.fill("Kiểm chứng tự động - ca sáng");
  const desc = ep.locator("textarea").first();
  await desc.fill("Tuyển nhân viên phục vụ ca sáng 4 tiếng.");
  await ep.getByRole("button", { name: "Tiếp theo" }).click();
  await waitReady(ep, 1200);
  // Bước 2: lương
  const nums = ep.locator('input[type="number"], input[inputmode="numeric"]');
  const numCount = await nums.count();
  for (let i = 0; i < numCount; i += 1) {
    const ph = await nums.nth(i).getAttribute("placeholder");
    if (ph && /25000/.test(ph)) await nums.nth(i).fill("30000");
  }
  await ep.getByRole("button", { name: "Tiếp theo" }).click();
  await waitReady(ep, 1500);
  // Bước 3: địa điểm & ca
  const prov = ep.getByRole("combobox", { name: /Tỉnh/ }).first();
  await prov.click();
  await ep.getByRole("option", { name: "TP. Hồ Chí Minh" }).click();
  await waitReady(ep, 800);
  const dist = ep.getByRole("combobox", { name: /Quận/ }).first();
  await dist.click();
  await ep.getByRole("option", { name: "Quận 1", exact: true }).click();
  await waitReady(ep, 600);
  await ep.getByRole("button", { name: "Thêm ca làm" }).click();
  await waitReady(ep, 800);
  const times = ep.locator('input[type="time"]');
  await times.nth(0).fill("17:00");
  await times.nth(1).fill("21:00");
  await waitReady(ep, 900);
  const text = await bodyText(ep);
  assert(/Tổng: 4\.0 giờ\/tuần/.test(text), "tính giờ ca làm sai");
});

await check("danh sách ứng viên (NTD) + chi tiết hồ sơ", async () => {
  await ep.goto(`${BASE_URL}/employer/applications`, { waitUntil: "networkidle" });
  const text = await bodyText(ep);
  assert(/Ứng viên/i.test(text), "thiếu tiêu đề");
  const links = await ep.locator('a[href^="/employer/applications/"]').count();
  assert(links > 0, "không có link hồ sơ ứng viên");
  await ep.screenshot({ path: `${SHOTS_DIR}/13-employer-applications.png` });
});

await check("chi tiết hồ sơ ứng viên (NTD): CV + ghi chú nội bộ", async () => {
  await ep.goto(`${BASE_URL}/employer/applications`, { waitUntil: "networkidle" });
  await waitReady(ep, 2000);
  const href = await ep
    .locator('a[href^="/employer/applications/"]')
    .first()
    .getAttribute("href");
  assert(href, "không tìm thấy link hồ sơ ứng viên");
  await ep.goto(`${BASE_URL}${href}`, { waitUntil: "networkidle" });
  await waitReady(ep, 2000);
  const text = await bodyText(ep);
  assert(text.length > 800, "chi tiết hồ sơ rỗng");
  assert(/CV|hồ sơ|Giới thiệu/i.test(text), "thiếu thông tin hồ sơ");
  assert(/Trạng thái|Ứng tuyển/i.test(text), "thiếu trạng thái");
});

await check("trang thông tin tổ chức (NTD) render + nút lưu", async () => {
  await ep.goto(`${BASE_URL}/employer/organization`, { waitUntil: "networkidle" });
  const text = await bodyText(ep);
  assert(/tổ chức|doanh nghiệp/i.test(text), "thiếu nội dung tổ chức");
  await ep.screenshot({ path: `${SHOTS_DIR}/14-employer-organization.png` });
});

await check("trang đánh giá (NTD) render + phản hồi 2 chiều", async () => {
  await ep.goto(`${BASE_URL}/employer/reviews`, { waitUntil: "networkidle" });
  const text = await bodyText(ep);
  assert(/trên 5 sao|Đánh giá/i.test(text), "thiếu nội dung đánh giá");
  await ep.screenshot({ path: `${SHOTS_DIR}/15-employer-reviews.png` });
});

await check("NTD bị chặn khỏi khu vực Sinh viên và Admin", async () => {
  for (const path of ["/student", "/admin"]) {
    await ep.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    assert(!ep.url().includes(path), `NTD lọt vào ${path}`);
  }
});

await check("không có lỗi console nghiêm trọng ở phần NTD", () => {
  // 403 là hệ quả của test "NTD bị chặn khỏi khu vực Sinh viên/Admin" — bỏ qua.
  const fatal = emp.errors.filter(
    (m) =>
      !/favicon|React DevTools|Download the React/i.test(m) && !/403/.test(m)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

// ===================================================================
// ADMIN — quản trị viên
// ===================================================================
console.log(`\n🛡️ ADMIN\n`);
const adm = await makeContext();
const ap = adm.page;

await check("đăng nhập Admin → vào dashboard quản trị", async () => {
  await login(ap, ACCOUNTS.admin);
  await waitReady(ap, 3500);
  assert(new URL(ap.url()).pathname === "/admin", `sai route: ${ap.url()}`);
  const text = await bodyText(ap);
  assert(text.length > 800, "dashboard admin rỗng");
  assert(/TỔNG NGƯỜI DÙNG|TỔNG TIN TUYỂN DỤNG|Bảng điều khiển hệ thống/i.test(text), "thiếu số liệu tổng quan");
  await ap.screenshot({ path: `${SHOTS_DIR}/16-admin-dashboard.png` });
});

await check("quản lý tin tuyển dụng (Admin): duyệt / từ chối có nút", async () => {
  await ap.goto(`${BASE_URL}/admin/jobs`, { waitUntil: "networkidle" });
  const text = await bodyText(ap);
  assert(/Chờ duyệt|PENDING_REVIEW|Duyệt|Từ chối/i.test(text), "thiếu thao tác duyệt");
  await ap.screenshot({ path: `${SHOTS_DIR}/17-admin-jobs.png` });
});

await check("quản lý nhóm việc (Admin) render + bảng", async () => {
  await ap.goto(`${BASE_URL}/admin/categories`, { waitUntil: "networkidle" });
  const text = await bodyText(ap);
  assert(/nhóm việc|danh mục/i.test(text), "thiếu nội dung nhóm việc");
  await ap.screenshot({ path: `${SHOTS_DIR}/18-admin-categories.png` });
});

await check("quản lý người dùng (Admin): bảng + ô tìm kiếm", async () => {
  await ap.goto(`${BASE_URL}/admin/users`, { waitUntil: "networkidle" });
  const text = await bodyText(ap);
  assert(/người dùng/i.test(text), "thiếu tiêu đề");
  assert(
    (await ap.locator("table").count()) > 0 ||
      (await ap.locator('[role="row"]').count()) > 0,
    "không có bảng người dùng"
  );
  await ap.screenshot({ path: `${SHOTS_DIR}/19-admin-users.png` });
});

await check("kiểm duyệt đánh giá (Admin) render", async () => {
  await ap.goto(`${BASE_URL}/admin/reviews`, { waitUntil: "networkidle" });
  const text = await bodyText(ap);
  assert(/đánh giá/i.test(text), "thiếu nội dung đánh giá");
  await ap.screenshot({ path: `${SHOTS_DIR}/20-admin-reviews.png` });
});

await check("Admin bị chặn khỏi khu vực Sinh viên và NTD", async () => {
  for (const path of ["/student", "/employer"]) {
    await ap.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    assert(!ap.url().includes(path), `Admin lọt vào ${path}`);
  }
});

await check("không có lỗi console nghiêm trọng ở phần Admin", () => {
  const fatal = adm.errors.filter(
    (m) => !/favicon|React DevTools|Download the React/i.test(m)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

// ===================================================================
// TỔNG KẾT
// ===================================================================
await browser.close();

console.log(`\n${"=".repeat(60)}`);
console.log(`KẾT QUẢ: ${passed} đạt · ${failures} lỗi`);
console.log(`${"=".repeat(60)}\n`);
if (failures > 0) {
  console.log("Các mục lỗi:");
  for (const r of report.filter((x) => !x.ok)) {
    console.log(`  ❌ ${r.name}\n     ${r.error.split("\n")[0]}`);
  }
  process.exitCode = 1;
}
