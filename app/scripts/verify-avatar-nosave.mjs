import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:8000";
const SHOTS = ".tmp-verify-avatar-persist";
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const log = (m) => console.log(m);
const ok = (m) => log("  OK   " + m);
const fail = (m) => { failures += 1; log("  FAIL " + m); };

const makePng = (w, h) => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
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
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y += 1) {
    const off = y * (1 + w * 3);
    for (let x = 0; x < w; x += 1) {
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

const PNG_PATH = SHOTS + "/avatar.png";
writeFileSync(PNG_PATH, makePng(600, 600));

const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const deletes = [];
page.on("response", (res) => {
  if (res.request().method() === "DELETE" && res.url().includes("/api/v1/files/")) {
    deletes.push(res.status() + " " + res.url().slice(-30));
  }
});

try {
  await page.goto(BASE_URL + "/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "student@viejob.vn");
  await page.fill('input[type="password"]', "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/student/, { timeout: 20000 });
  ok("Dang nhap thanh cong");

  await page.goto(BASE_URL + "/student/profile", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="file"][accept*="image/png"]', {
    state: "attached",
    timeout: 15000,
  });

  log("  -> Upload avatar, KHONG bam 'Luu ho so'");
  await page.locator('input[type="file"][accept*="image/png"]').first().setInputFiles(PNG_PATH);
  await page.waitForSelector("img[src*='/api/v1/files/']", { timeout: 30000 });
  await page.waitForTimeout(2000);

  const img = page.locator("img[src*='/api/v1/files/']").first();
  const srcBefore = await img.getAttribute("src").catch(() => null);
  ok("Sau upload src = " + srcBefore);

  log("  -> F5 ngay (khong luu)");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const imgAfter = page.locator("img[src*='/api/v1/files/']").first();
  const srcAfter = await imgAfter.getAttribute("src").catch(() => null);
  const count = await page.locator("img[src*='/api/v1/files/']").count();
  log("  -> Sau F5: so img = " + count + ", src = " + srcAfter);

  if (!srcAfter) {
    fail("SAU F5 KHONG CON ANH -> dung loi nguoi dung bao");
  } else {
    ok("Anh van con sau F5: " + srcAfter);
  }

  if (deletes.length) log("  -> DELETE file calls: " + deletes.join(", "));
  else log("  -> Khong co DELETE file nao");

  await page.screenshot({ path: SHOTS + "/03-no-save-reload.png" });
} catch (e) {
  fail("Loi: " + (e && e.message));
  await page.screenshot({ path: SHOTS + "/03-error.png" }).catch(() => {});
} finally {
  await browser.close();
}

log("");
log(failures === 0 ? "PASS" : failures + " that bai");
process.exit(failures === 0 ? 0 : 1);
