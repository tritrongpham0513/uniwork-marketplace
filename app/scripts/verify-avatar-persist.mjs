#!/usr/bin/env node
/**
 * Tái hiện lỗi avatar/logo mất sau F5 — chạy cho CẢ sinh viên và nhà tuyển dụng.
 *
 * Mốc kiểm chứng:
 *   1. Upload → ảnh hiển thị (naturalWidth > 0).
 *   2. Bấm "Lưu" → GET profile trả về avatarUrl/logoUrl khác null.
 *   3. F5 → <img src> khớp với URL đã lưu + ảnh tải được.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:8000";
const SHOTS = ".tmp-verify-avatar-persist";
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  ❌ ${msg}`);
};

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

const PNG_PATH = `${SHOTS}/avatar.png`;
writeFileSync(PNG_PATH, makePng(600, 600));

/** Chạy kịch bản cho 1 vai trò. */
const runScenario = async (browser, cfg) => {
  log(`\n▶ ${cfg.label}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const getProfileUrls = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (/\/api\/v1\/(student|employer)\/profile$/.test(url) && res.request().method() === "GET") {
      try {
        const body = await res.json();
        getProfileUrls.push(body?.data?.avatarUrl ?? body?.data?.logoUrl ?? null);
      } catch {
        /* ignore */
      }
    }
    if (url.includes("/api/v1/files/")) {
      log(`    [file] ${res.status()} ${url.slice(-40)}`);
    }
  });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', cfg.email);
    await page.fill('input[type="password"]', cfg.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(cfg.role), { timeout: 20000 });
    ok("Đăng nhập thành công");

    await page.goto(`${BASE_URL}${cfg.profilePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="file"][accept*="image/png"]', {
      state: "attached",
      timeout: 15000,
    });

    // --- 1. Upload --------------------------------------------------------
    await page
      .locator('input[type="file"][accept*="image/png"]')
      .first()
      .setInputFiles(PNG_PATH);
    await page.waitForSelector("text=/(ảnh đại diện|logo) thành công/i", { timeout: 30000 });
    await page.waitForTimeout(1500);

    const img = page.locator("img[src*='/api/v1/files/']").first();
    const srcBefore = await img.getAttribute("src").catch(() => null);
    if (srcBefore) ok(`Upload → <img src> = ${srcBefore}`);
    else fail("Upload xong không có <img src='/api/v1/files/...'>");

    const loadedBefore = await img
      .evaluate((el) => el.complete && el.naturalWidth > 0)
      .catch(() => false);
    if (loadedBefore) ok("Ảnh tải được ngay sau upload");
    else fail("Ảnh không tải được ngay sau upload");

    // --- 2. Lưu -----------------------------------------------------------
    await page.getByRole("button", { name: cfg.saveLabel }).first().click();
    await page.waitForSelector("text=/(Đã lưu hồ sơ|Đã cập nhật thông tin)/i", {
      timeout: 20000,
    });
    ok("Bấm nút lưu → thông báo thành công");
    await page.waitForTimeout(1500);

    const savedUrl = getProfileUrls.at(-1);
    if (savedUrl) ok(`GET profile sau khi lưu → URL = ${savedUrl}`);
    else fail("GET profile sau khi lưu không có URL ảnh");

    // --- 3. F5 ------------------------------------------------------------
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="file"][accept*="image/png"]', {
      state: "attached",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    const imgAfter = page.locator("img[src*='/api/v1/files/']").first();
    const srcAfter = await imgAfter.getAttribute("src").catch(() => null);
    if (srcAfter) ok(`Sau F5 → <img src> = ${srcAfter}`);
    else fail("SAU F5 KHÔNG CÒN <img src='/api/v1/files/...'> → mất ảnh");

    if (savedUrl && srcAfter && savedUrl !== srcAfter) {
      fail(`URL sau F5 KHÁC URL đã lưu: ${srcAfter} ≠ ${savedUrl}`);
    } else if (savedUrl && srcAfter) {
      ok("URL sau F5 khớp đúng URL đã lưu");
    }

    const loadedAfter = await imgAfter
      .evaluate((el) => el.complete && el.naturalWidth > 0)
      .catch(() => false);
    if (loadedAfter) ok("Ảnh sau F5 tải được");
    else fail("Sau F5 ảnh không tải được (naturalWidth = 0)");

    await page.screenshot({
      path: `${SHOTS}/${cfg.slug}-after-reload.png`,
      fullPage: false,
    });
  } catch (error) {
    fail(`Lỗi: ${error?.message ?? error}`);
    await page.screenshot({ path: `${SHOTS}/${cfg.slug}-error.png` }).catch(() => {});
  } finally {
    await context.close();
  }
};

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--no-sandbox"],
});

log("⭐  Kiểm chứng avatar/logo còn sau F5");

await runScenario(browser, {
  slug: "student",
  label: "Sinh viên — ảnh đại diện (/student/profile)",
  email: "student@viejob.vn",
  password: "Student@123",
  role: "student",
  profilePath: "/student/profile",
  saveLabel: "Lưu hồ sơ",
});

await runScenario(browser, {
  slug: "employer",
  label: "Nhà tuyển dụng — logo (/employer/organization)",
  email: "employer@viejob.vn",
  password: "Employer@123",
  role: "employer",
  profilePath: "/employer/organization",
  saveLabel: "Lưu thay đổi",
});

await browser.close();

log("");
if (failures === 0) log("✅ Ảnh giữ được sau F5 ở cả 2 vai trò.");
else log(`❌ ${failures} kiểm chứng KHÔNG đạt.`);
process.exit(failures === 0 ? 0 : 1);
