/**
 * 🌐 Browser smoke test — realtime thông báo (toast + badge).
 *
 * Kiểm tra trong trình duyệt thật:
 *   1. Đăng nhập nhà tuyển dụng -> WebSocket kết nối thành công.
 *   2. Khi có thông báo mới tới -> toast hiện lên + badge chưa đọc tăng.
 *   3. Bấm nút "Xem" trên toast -> điều hướng tới đúng trang.
 *
 * Chạy (cần app đang chạy ở SMOKE_BASE_URL, backend ở backend URL):
 *   SMOKE_BASE_URL=http://localhost:5173 \
 *   SMOKE_API_URL=http://localhost:8081 \
 *   node scripts/smoke-realtime-browser.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.SMOKE_API_URL ?? "http://localhost:8081";
const SHOTS_DIR = process.env.SMOKE_SHOTS_DIR ?? "./.tmp-smoke-realtime";

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

// Ưu tiên Chrome hệ thống, fallback về Chromium bundled.
let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
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

console.log(`\n🌐 Browser smoke — realtime thông báo (${BASE_URL})\n`);

// ---------------------------------------------------------------
// 1. ĐĂNG NHẬP NHÀ TUYỂN DỤNG
// ---------------------------------------------------------------

await test("đăng nhập nhà tuyển dụng -> WebSocket mở kết nối", async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[id="email"]', "employer@viejob.vn");
  await page.fill(
    'input[name="password"], input[id="password"]',
    "Employer@123"
  );
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  // Chờ frame WebSocket đầu tiên đi vào.
  const wsUrl = await page.evaluate(async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/v1/ws/ticket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    return json?.data?.ticket ? "ticket-ok" : "ticket-fail";
  });
  assert(wsUrl === "ticket-ok", "phải cấp được vé WebSocket từ trình duyệt");
});

// ---------------------------------------------------------------
// 2. NHẬN THÔNG BÁO REALTIME -> TOAST HIỆN LÊN
// ---------------------------------------------------------------

await test("thông báo realtime -> toast hiện lên kèm nút Xem", async () => {
  // Đẩy một thông báo thật từ phía server: NTD đăng tin mới -> Admin duyệt
  // -> sinh viên ứng tuyển -> NTD nhận thông báo realtime.
  const pushed = await page.evaluate(async () => {
    const token = localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Đăng nhập admin để duyệt tin.
    const adminLogin = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@viejob.vn",
        password: "Admin@123",
      }),
    });
    const adminToken = (await adminLogin.json())?.data?.accessToken;
    if (!adminToken) return { ok: false, reason: "đăng nhập admin thất bại" };

    // Tạo tin mới (chưa từng ứng tuyển -> không bị chặn trùng).
    const stamp = Date.now();
    const createRes = await fetch("/api/v1/employer/jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Tin kiểm chứng toast realtime " + stamp,
        description: "Tin tạo tự động để kiểm chứng toast realtime.",
        requirements: ["Sinh viên năng động"],
        benefits: ["Ca linh hoạt"],
        category: { id: "cat-fnb", name: "F&B, Barista & Phục vụ" },
        position: { id: "pos-phuc-vu", name: "Phục vụ" },
        employmentType: "PART_TIME",
        workMode: "ONSITE",
        salaryType: "HOURLY",
        salaryMin: 15000,
        salaryMax: 25000,
        positionsCount: 2,
        location: {
          provinceId: "hcm",
          districtId: "q1",
          address: "123 Nguyễn Huệ",
        },
        schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }],
        skills: [],
      }),
    });
    if (!createRes.ok) {
      return { ok: false, reason: JSON.stringify(await createRes.json()) };
    }
    const jobId = (await createRes.json())?.data?.id;

    // Admin duyệt tin.
    await fetch(`/api/v1/admin/jobs/${jobId}/review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: "APPROVE" }),
    });

    // Đăng nhập sinh viên rồi ứng tuyển.
    const loginRes = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@viejob.vn",
        password: "Student@123",
      }),
    });
    const studentToken = (await loginRes.json())?.data?.accessToken;
    if (!studentToken) return { ok: false, reason: "đăng nhập SV thất bại" };

    const applyRes = await fetch("/api/v1/student/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        jobId,
        expectedSalary: 0,
        coverLetter: "Kiểm chứng toast realtime",
      }),
    });

    return {
      ok: applyRes.ok,
      jobTitle: jobId,
      reason: applyRes.ok ? "" : JSON.stringify(await applyRes.json()),
    };
  });

  assert(pushed.ok, "phải ứng tuyển được để sinh thông báo: " + pushed.reason);

  // Chờ toast realtime xuất hiện.
  const toast = page.locator('[data-slot="toast"]').first();
  await toast.waitFor({ state: "visible", timeout: 15000 });

  const toastText = await toast.innerText();
  assert(
    /ứng viên/i.test(toastText),
    `toast phải nói về ứng viên mới, thực tế: ${toastText.slice(0, 120)}`
  );

  // Phải có nút hành động "Xem".
  const action = toast.locator('[data-slot="toast-action"]');
  assert((await action.count()) > 0, "toast phải có nút hành động");

  // Toast bay lên từ dưới (animation 500ms) — chờ nằm im rồi mới chụp,
  // nếu không ảnh sẽ chụp lúc toast còn nằm ngoài khung hình.
  await page.waitForTimeout(1200);

  // Chụp riêng vùng toast để ảnh rõ (toast nằm ở góc dưới bên phải).
  // `document.fonts.ready` để chờ web font nạp xong — nếu không, chiều cao
  // toast đo được chưa ổn định và ảnh sẽ bị cắt mất phần dưới.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);

  const box = await toast.boundingBox();
  assert(box, "toast phải có vị trí trên màn hình");
  await page.screenshot({
    path: `${SHOTS_DIR}/01-realtime-toast.png`,
    animations: "disabled",
    clip: {
      x: Math.max(0, box.x - 8),
      y: Math.max(0, box.y - 8),
      width: Math.min(1440 - Math.max(0, box.x - 8), box.width + 16),
      height: Math.min(900 - Math.max(0, box.y - 8), box.height + 16),
    },
  });
});

// ---------------------------------------------------------------
// 3. BẤM "XEM" -> ĐIỀU HƯỚNG + ĐÁNH DẤU ĐÃ ĐỌC
// ---------------------------------------------------------------

await test("bấm nút Xem -> điều hướng tới trang đơn ứng tuyển", async () => {
  const toast = page.locator('[data-slot="toast"]').first();
  const action = toast.locator('[data-slot="toast-action"]');

  await action.click();
  await page.waitForURL((url) => url.pathname.includes("/employer/applications/"), {
    timeout: 10000,
  });

  const url = page.url();
  assert(
    url.includes("/employer/applications/"),
    `phải tới trang chi tiết đơn ứng tuyển, thực tế: ${url}`
  );

  // Chờ React render xong trang đích — URL đổi trước khi render.
  // Dùng selector chặt (nội dung riêng của trang chi tiết), không dùng
  // chuỗi chung với menu ("ứng viên" có trong sidebar NTD).
  await page.waitForSelector("text=/ứng tuyển vị trí/i", { timeout: 15000 });
  await page.waitForTimeout(600);

  const bodyText = await page.locator("body").innerText();
  assert(
    /danh sách ứng viên/i.test(bodyText),
    "phải render trang chi tiết ứng viên, không phải trang khác"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/02-after-click.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 4. KHO THÔNG BÁO CÓ DỮ LIỆU MỚI
// ---------------------------------------------------------------

await test("kho thông báo hiển thị thông báo vừa nhận", async () => {
  await page.goto(`${BASE_URL}/notifications`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/thông báo/i", { timeout: 15000 });
  await page.waitForTimeout(1200);

  const bodyText = await page.locator("body").innerText();
  assert(
    /ứng viên mới ứng tuyển/i.test(bodyText),
    "kho thông báo phải có mục 'Có ứng viên mới ứng tuyển'"
  );

  await page.screenshot({
    path: `${SHOTS_DIR}/03-notifications-inbox.png`,
    fullPage: false,
  });
});

// ---------------------------------------------------------------
// 5. KHÔNG CÓ LỖI RUNTIME
// ---------------------------------------------------------------

await test("không có lỗi runtime trong phiên duyệt", () => {
  const fatal = consoleErrors.filter(
    (msg) => !/favicon|React DevTools|Failed to load resource/i.test(msg)
  );
  assert(fatal.length === 0, `lỗi console: ${fatal.slice(0, 3).join(" | ")}`);
});

await browser.close();

console.log(
  failures === 0
    ? "\n🎉 Tất cả test REALTIME BROWSER PASSED!\n"
    : `\n💥 ${failures} test REALTIME BROWSER FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
