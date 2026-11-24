/**
 * 🧪 Kiểm chứng lỗi đăng xuất: sau khi bấm "Đăng xuất tài khoản", UI phải
 * cập nhật ngay (không cần F5).
 *
 * Chạy: node scripts/verify-logout.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "./.tmp-verify-logout";

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

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

console.log(`\n🧪 Verify logout (không cần F5) — ${BASE_URL}\n`);

await test("đăng nhập sinh viên thành công", async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.fill('input[name="email"], input[id="email"]', "student@viejob.vn");
  await page.fill(
    'input[name="password"], input[id="password"]',
    "Student@123"
  );
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  assert(page.url().includes("/student"), `phải vào /student: ${page.url()}`);
});

await test("header hiển thị menu tài khoản khi đã đăng nhập", async () => {
  await page.waitForSelector('button[aria-expanded]', { timeout: 10000 });
  const bodyText = await page.locator("body").innerText();
  assert(
    /sinh viên/i.test(bodyText),
    "phải thấy vai trò Sinh viên trong header"
  );
});

await test(
  "bấm 'Đăng xuất tài khoản' -> UI cập nhật ngay, KHÔNG cần F5",
  async () => {
    // Mở dropdown tài khoản ở header
    await page.locator('button[aria-expanded]').first().click();
    await page.waitForSelector("text=/Đăng xuất tài khoản/i", {
      timeout: 10000,
    });

    await page.click("text=/Đăng xuất tài khoản/i");

    // Không reload trang -> nếu UI cập nhật được thì đây là do render lại
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });

    // Chờ tới khi header hiện nút "Đăng nhập" (dấu hiệu đã đăng xuất)
    await page.waitForSelector("text=/^Đăng nhập$/", { timeout: 10000 });

    // Token phải bị xoá khỏi localStorage
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token")
    );
    assert(!token, "access_token phải bị xoá sau khi đăng xuất");

    const userProfile = await page.evaluate(() =>
      localStorage.getItem("user_profile")
    );
    assert(!userProfile, "user_profile phải bị xoá sau khi đăng xuất");

    // Không được có tên người dùng trong body (đã đăng xuất)
    const bodyText = await page.locator("body").innerText();
    assert(
      !/Đăng xuất tài khoản/.test(bodyText),
      "không còn menu tài khoản sau khi đăng xuất"
    );

    await page.screenshot({
      path: `${SHOTS_DIR}/01-after-logout.png`,
      fullPage: false,
    });
  }
);

await test("trang đăng nhập không tự chuyển hướng về dashboard", async () => {
  await page.waitForTimeout(1200);
  assert(
    page.url().includes("/login"),
    `phải ở lại /login, thực tế: ${page.url()}`
  );
});

await test(
  "đăng xuất ở trang công khai -> ở lại trang, KHÔNG chuyển hướng",
  async () => {
    // Đăng nhập trước (form đăng nhập nằm ở /login)
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"], input[id="email"]', "student@viejob.vn");
    await page.fill(
      'input[name="password"], input[id="password"]',
      "Student@123"
    );
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    // Quay về trang chủ (trang công khai, không cần đăng nhập)
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // Mở dropdown tài khoản ở header
    await page.locator('button[aria-expanded]').first().click();
    await page.waitForSelector("text=/Đăng xuất tài khoản/i", {
      timeout: 10000,
    });
    await page.click("text=/Đăng xuất tài khoản/i");

    // Không chuyển hướng — vẫn ở trang chủ
    await page.waitForTimeout(1500);
    assert(
      !page.url().includes("/login"),
      `không được chuyển sang /login, thực tế: ${page.url()}`
    );

    // Header phải hiện nút "Đăng nhập" ngay lập tức
    await page.waitForSelector("text=/^Đăng nhập$/", { timeout: 10000 });

    const token = await page.evaluate(() =>
      localStorage.getItem("access_token")
    );
    assert(!token, "access_token phải bị xoá sau khi đăng xuất");

    await page.screenshot({
      path: `${SHOTS_DIR}/02-logout-public-page.png`,
      fullPage: false,
    });
  }
);

await test(
  "đăng xuất trong khu vực bảo vệ -> guard tự chuyển sang /login",
  async () => {
    await page.goto(`${BASE_URL}/student`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"], input[id="email"]', "student@viejob.vn");
    await page.fill(
      'input[name="password"], input[id="password"]',
      "Student@123"
    );
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    assert(page.url().includes("/student"), `phải vào /student: ${page.url()}`);

    // Mở menu tài khoản ở chân sidebar
    await page.locator('button[aria-label="Tài khoản"]').first().click();
    await page.waitForSelector("text=/Đăng xuất tài khoản/i", {
      timeout: 10000,
    });
    await page.click("text=/Đăng xuất tài khoản/i");

    // Guard `RequireAuth` phải tự đưa về trang đăng nhập
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10000,
    });

    const token = await page.evaluate(() =>
      localStorage.getItem("access_token")
    );
    assert(!token, "access_token phải bị xoá sau khi đăng xuất từ sidebar");
  }
);

await test("không có lỗi runtime trong phiên duyệt", () => {
  const fatal = consoleErrors.filter(
    (msg) =>
      !/favicon|React DevTools|Failed to load resource|401|403/i.test(msg)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

await browser.close();

console.log(
  failures === 0
    ? "\n🎉 Verify logout PASSED!\n"
    : `\n💥 ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
