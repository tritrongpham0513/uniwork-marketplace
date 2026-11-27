/**
 * 🌐 Kiểm tra riêng tính năng Ảnh preview tin tuyển dụng.
 *
 * Chạy: SMOKE_BASE_URL=http://localhost:5173 node scripts/smoke-preview-image.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "../.scratch/report/preview-image";

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

console.log(`\n🖼️  Smoke test — ảnh preview tin tuyển dụng (${BASE_URL})\n`);

const loginAs = async (email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[id="email"]', email);
  await page.fill('input[name="password"], input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20000,
  });
};

// ---------------------------------------------------------------
// 1. DANH SÁCH TIN — KHUNG ẢNH VUÔNG
// ---------------------------------------------------------------

await test("thẻ tin trong danh sách có khung ảnh vuông", async () => {
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: "networkidle" });

  const cards = page.locator('[data-slot="card"]');
  await cards.first().waitFor({ timeout: 15000 });

  // Khung ảnh vuông của JobPreviewImage: img (có ảnh / logo) hoặc div
  // (khối chữ cái fallback). Cả hai đều có class rounded-lg + size-24.
  const frame = page
    .locator(
      '[data-slot="card"] img.rounded-lg.object-cover, [data-slot="card"] div.rounded-lg.size-24'
    )
    .first();
  assert(
    (await frame.count()) > 0,
    "phải có khung ảnh vuông trên thẻ tin (JobPreviewImage)"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/01-job-list-preview.png`,
    fullPage: false,
  });
});

await test("khung ảnh vuông có kích thước cố định (không nhảy layout)", async () => {
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: "networkidle" });
  await page.locator('[data-slot="card"]').first().waitFor({ timeout: 15000 });

  const frame = page
    .locator(
      '[data-slot="card"] img.rounded-lg.object-cover, [data-slot="card"] div.rounded-lg.size-24'
    )
    .first();
  const box = await frame.boundingBox();
  assert(box, "không lấy được kích thước khung ảnh");
  assert(
    Math.abs(box.width - box.height) < 2,
    `khung ảnh phải vuông — thực tế ${box.width}x${box.height}`
  );
  assert(
    box.width >= 90,
    `khung ảnh phải đủ lớn để nhìn thấy — thực tế ${box.width}px`
  );
});

// ---------------------------------------------------------------
// 2. NHÀ TUYỂN DỤNG — FORM ĐĂNG TIN CÓ Ô CHỌN ẢNH
// ---------------------------------------------------------------

await test("form đăng tin có mục Ảnh preview", async () => {
  await loginAs("employer@viejob.vn", "Employer@123");
  await page.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: "networkidle" });

  const label = page.locator("text=Ảnh preview").first();
  await label.waitFor({ timeout: 15000 });
  assert(
    (await page.locator("#preview-image").count()) > 0,
    "form phải có input file #preview-image"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/02-employer-form.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 3. DANH SÁCH TIN CỦA NTD — GỢI Ý "CHƯA CÓ ẢNH PREVIEW"
// ---------------------------------------------------------------

await test("tin chưa có ảnh hiện gợi ý 'Chưa có ảnh preview'", async () => {
  await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const hint = page.locator("text=Chưa có ảnh preview").first();
  const hasHint = (await hint.count()) > 0;
  assert(hasHint, "phải hiện gợi ý 'Chưa có ảnh preview' cho tin chưa có ảnh");

  await page.screenshot({
    path: `${SHOTS_DIR}/03-employer-jobs.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 4. QUẢN TRỊ VIÊN — DIALOG DUYỆT TIN
// ---------------------------------------------------------------

await test("màn duyệt của quản trị viên mở được dialog xem tin", async () => {
  await loginAs("admin@viejob.vn", "Admin@123");
  await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: "networkidle" });

  const previewBtn = page.locator("button").filter({ hasText: "Xem" }).first();
  if ((await previewBtn.count()) === 0) {
    // Không có tin chờ duyệt — bỏ qua kiểm tra dialog.
    console.log("     (không có tin chờ duyệt để mở dialog)");
    return;
  }

  await previewBtn.click();
  await page.waitForTimeout(1200);

  const dialog = page.locator('[role="dialog"]').first();
  assert(
    (await dialog.count()) > 0,
    "phải mở được dialog xem nội dung tin"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/04-admin-review-dialog.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 5. KHÔNG CÓ LỖI RUNTIME
// ---------------------------------------------------------------

await test("không có lỗi runtime trong toàn bộ phiên duyệt", async () => {
  const real = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("ERR_NAME_NOT_RESOLVED")
  );
  assert(
    real.length === 0,
    `có lỗi console: ${real.slice(0, 3).join(" | ")}`
  );
});

await browser.close();

console.log(
  failures === 0
    ? "\n✅ Tất cả kiểm tra ảnh preview đều pass\n"
    : `\n💥 ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
