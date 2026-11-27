/**
 * 📐 Đo toạ độ các phần tử trong JobCard để kiểm tra bố cục 2 cột.
 *
 * Chạy: node scripts/measure-job-card.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";

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

await page.goto(`${BASE_URL}/jobs`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const report = await page.evaluate(() => {
  // Card đầu tiên có nút "Ứng tuyển" -> là JobCard (không phải card bộ lọc)
  const cards = [...document.querySelectorAll('[data-slot="card"]')];
  const card = cards.find(
    (c) => c.textContent?.includes("Ứng tuyển") && c.querySelector("img")
  );
  if (!card) return null;

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      text: (el.textContent ?? "").trim().slice(0, 70),
    };
  };

  const content = card.querySelector('[data-slot="card-content"]');
  const leftCol = content?.children[0];
  const rightCol = content?.children[1];
  const img = card.querySelector("img");
  const title = card.querySelector('[data-slot="card-title"]');

  return {
    card: box(card),
    content: box(content),
    leftCol: box(leftCol),
    rightCol: box(rightCol),
    image: box(img),
    title: box(title),
    buttons: [...card.querySelectorAll("a,button")]
      .map((b) => ({ text: (b.textContent ?? "").trim(), ...box(b) }))
      .filter((b) => b.text),
    rows: [...card.querySelectorAll("dl > div")].map((r) => box(r)),
  };
});

console.log(JSON.stringify(report, null, 2));

await browser.close();
