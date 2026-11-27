/**
 * 📸 Chụp nhanh danh sách tin để soi bố cục JobCard mới.
 *
 * Chạy: node scripts/snap-job-card.mjs
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const OUT_DIR = process.env.SNAP_DIR ?? "../.scratch/report/preview-image";

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

mkdirSync(OUT_DIR, { recursive: true });

await page.goto(`${BASE_URL}/jobs`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const cards = page.locator('[data-slot="card"]');
const count = await cards.count();
console.log(`Số card: ${count}`);

if (count > 0) {
  await cards.first().screenshot({ path: `${OUT_DIR}/snap-card-01.png` });
  console.log(`Đã lưu ${OUT_DIR}/snap-card-01.png`);
}

await page.screenshot({ path: `${OUT_DIR}/snap-list.png` });
console.log(`Đã lưu ${OUT_DIR}/snap-list.png`);

await browser.close();
