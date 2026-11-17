/**
 * 🌐 Browser smoke test — kiểm tra app thật trong trình duyệt.
 *
 * Chạy app bằng `vite preview` (build sẵn) rồi dùng Chromium để:
 *   1. Mở trang chủ -> danh sách tin tuyển dụng hiển thị
 *   2. Đăng nhập bằng tài khoản demo -> vào đúng dashboard theo vai trò
 *   3. Đăng nhập sai mật khẩu -> hiện thông báo lỗi
 *   4. Chuyển tab qua lại giữa 3 vai trò -> route guard hoạt động
 *
 * Chạy: node scripts/smoke-browser.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:4173";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "./.tmp-smoke";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

// Ưu tiên Chrome hệ thống (không cần tải Chromium của Playwright).
// Nếu không có, fallback về chromium bundled.
const launchOptions = { channel: "chrome" };
let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch {
  browser = await chromium.launch();
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "vi-VN",
});
const page = await context.newPage();

/** Gom lỗi console để phát hiện crash runtime */
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

console.log(`\n🌐 Browser smoke test — ${BASE_URL}\n`);

// ---------------------------------------------------------------
// 1. TRANG CHỦ
// ---------------------------------------------------------------

await test("trang chủ tải được và hiện danh sách tin tuyển dụng", async () => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/việc làm/i", { timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  assert(bodyText.length > 200, "trang phải có nội dung");
  assert(
    /tin tuyển dụng|việc làm|tìm việc/i.test(bodyText),
    "phải hiện nội dung về việc làm"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/01-home.png`,
    fullPage: false,
  });
});

await test("không có lỗi console nghiêm trọng ở trang chủ", () => {
  const fatal = consoleErrors.filter(
    (msg) => !/favicon|Download the React DevTools/i.test(msg)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.join(" | ")}`);
});

// ---------------------------------------------------------------
// 2. ĐĂNG NHẬP SAI -> TOAST
// ---------------------------------------------------------------

await test("đăng nhập sai mật khẩu -> hiện thông báo lỗi", async () => {
  consoleErrors.length = 0;
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  await page.fill('input[name="email"], input[id="email"]', "student@viejob.vn");
  await page.fill(
    'input[name="password"], input[id="password"]',
    "SaiMatKhau@999"
  );
  await page.click('button[type="submit"]');

  // Chờ toast xuất hiện
  await page.waitForSelector("text=/không chính xác|không hợp lệ|lỗi/i", {
    timeout: 10000,
  });

  await page.screenshot({
    path: `${SHOTS_DIR}/02-login-error.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 3. ĐĂNG NHẬP SINH VIÊN
// ---------------------------------------------------------------

const loginAs = async (email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[id="email"]', email);
  await page.fill('input[name="password"], input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
};

await test("đăng nhập sinh viên -> vào dashboard sinh viên", async () => {
  consoleErrors.length = 0;
  await loginAs("student@viejob.vn", "Student@123");

  const url = page.url();
  assert(url.includes("/student"), `phải vào /student, thực tế: ${url}`);

  const bodyText = await page.locator("body").innerText();
  assert(bodyText.length > 200, "dashboard phải có nội dung");

  // Token phải được lưu vào localStorage
  const token = await page.evaluate(() =>
    localStorage.getItem("access_token")
  );
  assert(
    typeof token === "string" && token.split(".").length === 3,
    `access token phải là JWT 3 phần, thực tế: ${String(token).slice(0, 40)}`
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/03-student-dashboard.png`,
    fullPage: false,
  });
});

await test("sinh viên xem được danh sách đơn ứng tuyển", async () => {
  await page.goto(`${BASE_URL}/student/applications`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("text=/đơn ứng tuyển|ứng tuyển/i", {
    timeout: 15000,
  });

  const bodyText = await page.locator("body").innerText();
  assert(
    /đơn ứng tuyển|ứng tuyển/i.test(bodyText),
    "phải hiện danh sách đơn ứng tuyển"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/04-student-applications.png`,
    fullPage: false,
  });
});

await test("sinh viên bị chặn khỏi khu vực admin", async () => {
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const url = page.url();
  assert(
    !url.includes("/admin"),
    `phải bị chuyển hướng khỏi /admin, thực tế: ${url}`
  );
});

// ---------------------------------------------------------------
// 4. ĐĂNG NHẬP NHÀ TUYỂN DỤNG
// ---------------------------------------------------------------

await test("đăng nhập nhà tuyển dụng -> vào dashboard NTD", async () => {
  consoleErrors.length = 0;
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await loginAs("employer@viejob.vn", "Employer@123");

  const url = page.url();
  assert(url.includes("/employer"), `phải vào /employer, thực tế: ${url}`);

  await page.screenshot({
    path: `${SHOTS_DIR}/05-employer-dashboard.png`,
    fullPage: false,
  });
});

await test("NTD quản lý được tin tuyển dụng", async () => {
  await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/tin tuyển dụng/i", { timeout: 15000 });

  await page.screenshot({
    path: `${SHOTS_DIR}/06-employer-jobs.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 5. ĐĂNG NHẬP QUẢN TRỊ VIÊN
// ---------------------------------------------------------------

await test("đăng nhập quản trị viên -> vào dashboard admin", async () => {
  consoleErrors.length = 0;
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await loginAs("admin@viejob.vn", "Admin@123");

  const url = page.url();
  assert(url.includes("/admin"), `phải vào /admin, thực tế: ${url}`);

  await page.screenshot({
    path: `${SHOTS_DIR}/07-admin-dashboard.png`,
    fullPage: false,
  });
});

await test(
  "admin thấy số liệu tổng quan (không phải loading spinner)",
  async () => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    const bodyText = await page.locator("body").innerText();
    assert(bodyText.length > 200, "dashboard admin phải có nội dung");
    assert(
      !/loading|đang tải/i.test(bodyText),
      `phải tải xong, không còn loading: ${bodyText.slice(0, 120)}`
    );

    await page.screenshot({
      path: `${SHOTS_DIR}/08-admin-overview.png`,
      fullPage: false,
    });
  }
);

await test("admin quản lý được nhóm việc", async () => {
  await page.goto(`${BASE_URL}/admin/categories`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);

  const bodyText = await page.locator("body").innerText();
  assert(
    /nhóm việc|danh mục/i.test(bodyText),
    "phải hiện danh sách nhóm việc"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/09-admin-categories.png`,
    fullPage: false,
  });
});

await test("không có lỗi runtime trong toàn bộ phiên duyệt", () => {
  const fatal = consoleErrors.filter(
    (msg) => !/favicon|React DevTools|Failed to load resource/i.test(msg)
  );
  assert(
    fatal.length === 0,
    `lỗi console: ${fatal.slice(0, 3).join(" | ")}`
  );
});

await browser.close();

console.log(
  failures === 0
    ? "\n🎉 Tất cả test BROWSER PASSED!\n"
    : `\n💥 ${failures} test BROWSER FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
