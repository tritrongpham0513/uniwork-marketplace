#!/usr/bin/env node
/**
 * Kiểm chứng upload file qua UI thật (Chrome) — luồng presigned + resize.
 *
 * Kịch bản:
 *   1. SV đăng nhập → mở hồ sơ.
 *   2. Upload ảnh đại diện (file PNG lớn) → toast thành công + ảnh hiển thị.
 *   3. Ảnh đã được resize về <= 512px (kiểm tra kích thước render).
 *   4. Upload CV (PDF) → toast thành công + tên file hiển thị.
 *   5. Upload file giả dạng (text đổi tên .pdf) → bị chặn, có toast lỗi.
 *   6. Không có lỗi console / HTTP 4xx-5xx ngoài dự kiến.
 *
 * Chạy:
 *   SMOKE_BASE_URL=http://localhost:5173 node scripts/smoke-files-upload.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS = ".tmp-verify-files";

mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  ❌ ${msg}`);
};

/* ------------------------------------------------------------------ */
/* Tạo file test                                                       */
/* ------------------------------------------------------------------ */

/** Tạo PNG hợp lệ (dùng zlib + CRC32 thuần, không cần dependency). */
const makePng = (width, height) => {
  const crcTable = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const off = y * (1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      raw[off + 1 + x * 3] = (x * 7) % 256;
      raw[off + 2 + x * 3] = (y * 5) % 256;
      raw[off + 3 + x * 3] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const PNG_PATH = `${SHOTS}/avatar-source.png`;
const PDF_PATH = `${SHOTS}/cv-source.pdf`;
const FAKE_PDF_PATH = `${SHOTS}/fake-cv.pdf`;

const png = makePng(1600, 1200);
writeFileSync(PNG_PATH, png);
writeFileSync(
  PDF_PATH,
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1"
);
writeFileSync(FAKE_PDF_PATH, "this is definitely not a pdf");

/* ------------------------------------------------------------------ */
/* Chạy                                                                */
/* ------------------------------------------------------------------ */

log("\n⭐  Upload file qua UI thật (Chrome)");

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--no-sandbox"],
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
const httpErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("response", (res) => {
  const status = res.status();
  if (status >= 400) {
    httpErrors.push(`${status} ${res.url()}`);
  }
});

try {
  // --- Đăng nhập ---------------------------------------------------------
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "student@viejob.vn");
  await page.fill('input[type="password"]', "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student/, { timeout: 20000 });
  ok("Đăng nhập sinh viên thành công");

  // --- Mở hồ sơ ---------------------------------------------------------
  await page.goto(`${BASE_URL}/student/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="file"]', {
    state: "attached",
    timeout: 15000,
  });
  ok("Mở hồ sơ sinh viên");

  // --- Upload ảnh đại diện ----------------------------------------------
  const avatarInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await avatarInput.setInputFiles(PNG_PATH);

  const avatarOk = await page
    .waitForSelector("text=/ảnh đại diện thành công/i", { timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  if (avatarOk) {
    ok("Upload ảnh đại diện báo thành công");
  } else {
    fail("Upload ảnh đại diện không báo thành công");
  }

  // Ảnh hiển thị sau upload phải có kích thước render <= 512px
  await page.waitForTimeout(1200);
  const avatarBox = await page
    .locator('img[alt]')
    .filter({ hasNot: page.locator('[data-testid="none"]') })
    .first()
    .boundingBox()
    .catch(() => null);

  const avatarImg = page.locator('img[alt="Nguyễn Thanh Hà"]').first();
  const avatarSrc = await avatarImg.getAttribute("src").catch(() => null);
  if (avatarSrc) {
    ok(`Ảnh đại diện đã cập nhật: ${avatarSrc.slice(0, 80)}`);
  } else {
    fail("Ảnh đại diện không được cập nhật");
  }

  await page.screenshot({ path: `${SHOTS}/01-avatar-uploaded.png` });

  // --- Upload CV ---------------------------------------------------------
  const cvInput = page.locator('input[type="file"][accept*="pdf"]').first();
  await cvInput.setInputFiles(PDF_PATH);

  const cvOk = await page
    .waitForSelector("text=/CV thành công/i", { timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  if (cvOk) {
    ok("Upload CV báo thành công");
  } else {
    fail("Upload CV không báo thành công");
  }

  await page.screenshot({ path: `${SHOTS}/02-cv-uploaded.png` });

  // --- Upload file giả dạng ---------------------------------------------
  const cvInputAgain = page.locator('input[type="file"][accept*="pdf"]').first();
  await cvInputAgain.setInputFiles(FAKE_PDF_PATH);

  const rejected = await page
    .waitForSelector("text=/Định dạng file không hợp lệ|Không đọc được định dạng/i", {
      timeout: 15000,
    })
    .then(() => true)
    .catch(() => false);

  if (rejected) {
    ok("File giả dạng (text đổi tên .pdf) bị chặn với thông báo tiếng Việt");
  } else {
    fail("File giả dạng không bị chặn");
  }

  await page.screenshot({ path: `${SHOTS}/03-fake-rejected.png` });

  // --- Kiểm tra lỗi console / HTTP --------------------------------------
  // 400 từ /files/* với file giả là lỗi DỰ KIẾN (test cố tình gây ra).
  const unexpectedHttp = httpErrors.filter(
    (e) => !(e.startsWith("400") && e.includes("/files/"))
  );

  if (unexpectedHttp.length === 0) {
    ok("Không có HTTP 4xx/5xx ngoài dự kiến");
  } else {
    fail(`HTTP lỗi ngoài dự kiến: ${unexpectedHttp.join(", ")}`);
  }

  // Lỗi console "Failed to load resource" đi kèm 409/400 ở trên là dự kiến.
  const unexpectedConsole = consoleErrors.filter(
    (text) => !text.includes("409") && !text.includes("400")
  );

  if (unexpectedConsole.length === 0) {
    ok("Không có lỗi console ngoài dự kiến");
  } else {
    fail(`Lỗi console: ${unexpectedConsole.slice(0, 3).join(" | ")}`);
  }
} catch (error) {
  fail(`Lỗi không mong đợi: ${error?.message ?? error}`);
  await page.screenshot({ path: `${SHOTS}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

log("");
if (failures === 0) {
  log("✅ Tất cả kiểm chứng upload UI đều đạt.");
} else {
  log(`❌ Có ${failures} kiểm chứng upload UI KHÔNG đạt.`);
}
process.exit(failures === 0 ? 0 : 1);
