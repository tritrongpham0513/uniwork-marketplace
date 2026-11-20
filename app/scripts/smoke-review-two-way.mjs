#!/usr/bin/env node
/**
 * Smoke test trình duyệt cho phản hồi 2 chiều đánh giá.
 *
 * Chạy: SMOKE_BASE_URL=http://localhost:8000 node scripts/smoke-review-two-way.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8000";
const OUT = ".tmp-smoke-review-two-way";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => {
  failures += 1;
  console.log(`  ❌ ${m}`);
};

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

async function login(email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/mật khẩu/i).first().fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/(student|employer|admin)/, { timeout: 15000 });
}

console.log("\n⭐  Smoke phản hồi 2 chiều (trình duyệt)");

// ---------------------------------------------------------------- SV
await login("student@viejob.vn", "Student@123");
await page.goto(`${BASE}/student/reviews`, { waitUntil: "networkidle" });

const replyButtons = page.getByRole("button", { name: /^(phản hồi|sửa phản hồi)$/i });
const count = await replyButtons.count();
if (count > 0) {
  ok(`SV thấy ${count} nút "Phản hồi" ở /student/reviews`);
} else {
  fail('SV không thấy nút "Phản hồi" ở /student/reviews');
}
await page.screenshot({ path: `${OUT}/01-student-reviews.png`, fullPage: true });

// Mở dialog phản hồi và gửi.
if (count > 0) {
  await replyButtons.first().click();
  await page.waitForTimeout(600);

  const textarea = page.getByPlaceholder(/viết phản hồi của bạn tới/i);
  if ((await textarea.count()) === 0) {
    fail("không mở được dialog phản hồi");
  } else {
    const stamp = `Smoke phản hồi SV ${Date.now()}`;
    await textarea.first().fill(stamp);
    await page.screenshot({ path: `${OUT}/02-student-reply-dialog.png` });

    await page.getByRole("button", { name: /gửi phản hồi/i }).click();
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes(stamp)) {
      ok(`phản hồi của SV hiển thị lại trên trang: "${stamp}"`);
    } else {
      fail("phản hồi của SV không hiển thị sau khi gửi");
    }
    await page.screenshot({ path: `${OUT}/03-student-after-reply.png`, fullPage: true });
  }
}

// ---------------------------------------------------------------- NTD
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await login("employer@viejob.vn", "Employer@123");
await page.goto(`${BASE}/employer/reviews`, { waitUntil: "networkidle" });

const empButtons = page.getByRole("button", { name: /^(phản hồi|sửa phản hồi)$/i });
const empCount = await empButtons.count();
if (empCount > 0) {
  ok(`NTD thấy ${empCount} nút "Phản hồi" ở /employer/reviews`);
} else {
  fail('NTD không thấy nút "Phản hồi" ở /employer/reviews (đã hết ô reply?)');
}
await page.screenshot({ path: `${OUT}/04-employer-reviews.png`, fullPage: true });

// ---------------------------------------------------------------- NTD phản hồi đánh giá mình viết
await page.goto(`${BASE}/employer/applications/app-008`, { waitUntil: "networkidle" });
const selfReply = page.getByRole("button", {
  name: /^(phản hồi ứng viên|sửa phản hồi)$/i,
});
if ((await selfReply.count()) > 0) {
  ok("NTD thấy nút phản hồi cho đánh giá mình đã viết");

  await selfReply.first().click();
  await page.waitForTimeout(600);
  const stamp = `Smoke phản hồi NTD ${Date.now()}`;
  const textarea = page.getByPlaceholder(/viết phản hồi của bạn tới/i);
  if ((await textarea.count()) > 0) {
    await textarea.first().fill(stamp);
    await page.screenshot({ path: `${OUT}/05-employer-reply-dialog.png` });
    await page.getByRole("button", { name: /gửi phản hồi/i }).click();
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes(stamp)) {
      ok(`phản hồi của NTD hiển thị lại trên trang: "${stamp}"`);
    } else {
      fail("phản hồi của NTD không hiển thị sau khi gửi");
    }
    await page.screenshot({ path: `${OUT}/06-employer-after-reply.png`, fullPage: true });
  } else {
    fail("không mở được dialog phản hồi của NTD");
  }
} else {
  fail("NTD không thấy nút 'Phản hồi ứng viên'");
}

// ---------------------------------------------------------------- console errors
const realErrors = consoleErrors.filter(
  (e) => !/favicon|ResizeObserver|DevTools/i.test(e)
);
if (realErrors.length === 0) {
  ok("không có lỗi console");
} else {
  fail(`có ${realErrors.length} lỗi console: ${realErrors.slice(0, 3).join(" | ")}`);
}

await browser.close();

console.log(
  failures === 0
    ? "\n🎉 Smoke phản hồi 2 chiều PASSED!\n"
    : `\n💥 Có ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
