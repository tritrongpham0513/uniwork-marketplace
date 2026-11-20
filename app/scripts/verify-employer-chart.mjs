/**
 * 📊 Kiểm chứng biểu đồ "Tin đăng theo tuần" (dashboard NTD).
 *
 * Mục tiêu: chứng minh thanh cột THỰC SỰ có chiều cao > 0 (bug cũ: `items-end`
 * khiến `height: %` không resolve -> thanh cột về 0px, giao diện "không thấy cột").
 *
 * Chạy: SMOKE_BASE_URL=http://localhost:5173 node scripts/verify-employer-chart.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "./.tmp-verify-chart";

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

console.log(`\n📊 Kiểm chứng biểu đồ NTD — ${BASE_URL}\n`);

const loginAs = async (email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(student|employer|admin)/, { timeout: 20000 });
};

await test("đăng nhập NTD -> dashboard hiển thị", async () => {
  await loginAs("employer@viejob.vn", "Employer@123");
  assert(page.url().includes("/employer"), `phải vào /employer, thực tế: ${page.url()}`);
});

await test("biểu đồ 'Tin đăng theo tuần' có thanh cột cao > 0", async () => {
  await page.goto(`${BASE_URL}/employer`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tin đăng theo tuần", { timeout: 15000 });

  const bars = page.locator('[aria-label$="tin đăng"]');
  const count = await bars.count();
  assert(count === 7, `phải có 7 thanh cột, thực tế: ${count}`);

  const heights = [];
  for (let i = 0; i < count; i += 1) {
    const box = await bars.nth(i).boundingBox();
    const label = await bars.nth(i).getAttribute("aria-label");
    heights.push({ label, height: box ? box.height : 0 });
  }

  console.log("     chiều cao thanh:", heights.map((h) => `${h.label}=${h.height.toFixed(0)}px`).join(", "));

  // Thanh có số liệu > 0 phải cao hơn 0 (bug cũ: 0px)
  const nonEmpty = heights.filter((h) => !h.label.includes(": 0 tin đăng"));
  for (const bar of nonEmpty) {
    assert(
      bar.height > 4,
      `thanh "${bar.label}" có số liệu nhưng chiều cao = ${bar.height.toFixed(1)}px (phải > 4px)`
    );
  }

  // Ít nhất phải có 1 thanh cao đáng kể -> chứng minh biểu đồ thực sự hiển thị
  const tallest = Math.max(...heights.map((h) => h.height));
  assert(tallest > 20, `thanh cao nhất chỉ ${tallest.toFixed(1)}px -> biểu đồ vẫn vô hình`);
});

await test("nhãn ngày khớp thứ trong tuần thật (hôm nay không phải luôn 'CN')", async () => {
  await page.goto(`${BASE_URL}/employer`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tin đăng theo tuần", { timeout: 15000 });

  const labels = await page.locator('[aria-label$="tin đăng"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label").split(":")[0])
  );

  const now = new Date();
  const todayLabel = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][now.getDay()];
  const oldest = new Date(now);
  oldest.setDate(now.getDate() - 6);
  const oldestLabel = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][oldest.getDay()];

  assert(
    labels[labels.length - 1] === todayLabel,
    `ô cuối phải là hôm nay (${todayLabel}), thực tế: ${labels[labels.length - 1]}`
  );
  assert(
    labels[0] === oldestLabel,
    `ô đầu phải là ${oldestLabel} (6 ngày trước), thực tế: ${labels[0]}`
  );
});

await test("không có lỗi console", () => {
  const fatal = consoleErrors.filter(
    (text) => !/401|403|Failed to load resource/i.test(text)
  );
  assert(fatal.length === 0, `có lỗi console: ${fatal.join(" | ")}`);
});

await page.screenshot({ path: `${SHOTS_DIR}/employer-chart.png`, fullPage: false });
await page.screenshot({ path: `${SHOTS_DIR}/employer-chart-full.png`, fullPage: true });

await browser.close();

console.log(
  failures === 0
    ? `\n✅ Tất cả kiểm chứng biểu đồ đều đạt.\n`
    : `\n❌ Có ${failures} kiểm chứng thất bại.\n`
);
process.exit(failures === 0 ? 0 : 1);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
