/**
 * Kiểm chứng riêng 2 lỗi UI đã phát hiện & sửa:
 *   1. Ô tìm kiếm trên trang chủ không truyền từ khoá sang /jobs
 *   2. Số liệu "việc làm" theo tỉnh trên trang chủ luôn 0 (tính từ 6 tin mới nhất)
 */

import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8000";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
const page = await ctx.newPage();

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

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

await check("ô tìm kiếm hero truyền từ khoá sang trang /jobs", async () => {
  await page.fill('input[aria-label="Tìm việc làm"]', "barista");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/jobs/, { timeout: 10000 });
  await page.waitForTimeout(2000);
  const url = page.url();
  if (!url.includes("keyword=barista")) throw new Error(`URL sai: ${url}`);
  const text = await page.locator("body").innerText();
  const total = Number(text.match(/Tìm thấy (\d+) cơ hội/)?.[1]);
  console.log(`     → ${url} | ${total} kết quả`);
  if (!(total > 0 && total < 44)) throw new Error(`lọc không hoạt động (${total})`);
});

await check("ô tìm kiếm hero rỗng → về /jobs không có tham số", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.fill('input[aria-label="Tìm việc làm"]', "");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/jobs/, { timeout: 10000 });
  if (page.url().includes("keyword=")) throw new Error(`URL sai: ${page.url()}`);
});

await check("số liệu việc làm theo tỉnh không còn 0 sai", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const section = text.slice(
    text.indexOf("Việc làm theo địa điểm"),
    text.indexOf("Việc làm tại các tỉnh thành")
  );
  const lines = [...section.matchAll(/([\wÀ-ỹ .]+)\n+\s*(\d+) việc làm/g)].map((m) => ({
    province: m[1].trim(),
    count: Number(m[2]),
  }));
  console.log("     →", JSON.stringify(lines));
  const nonZero = lines.filter((l) => l.count > 0);
  if (nonZero.length < 3)
    throw new Error(`chỉ ${nonZero.length} tỉnh có số liệu > 0 — vẫn tính từ subset`);
  // Hà Nội có 5 tin, Đà Nẵng 3, Cần Thơ 2, Bình Dương 1, Đắk Lắk 1
  const expected = { "Hà Nội": 5, "Đà Nẵng": 3, "Cần Thơ": 2, "Bình Dương": 1, "Đắk Lắk": 1 };
  for (const [prov, want] of Object.entries(expected)) {
    const found = lines.find((l) => l.province === prov);
    if (!found) throw new Error(`thiếu tỉnh ${prov}`);
    if (found.count !== want)
      throw new Error(`${prov}: hiện ${found.count}, API có ${want}`);
  }
});

await check("chữ 'Quôn mật khẩu?' đã sửa thành 'Quên mật khẩu?'", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  if (text.includes("Quôn")) throw new Error("vẫn còn typo 'Quôn'");
  if (!text.includes("Quên mật khẩu?")) throw new Error("không thấy 'Quên mật khẩu?'");
});

await browser.close();
console.log(failures === 0 ? "\n✅ Tất cả lỗi đã được sửa" : `\n❌ ${failures} lỗi còn lại`);
process.exitCode = failures === 0 ? 0 : 1;
