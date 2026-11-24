/**
 * 🔍 Kiểm chứng bản deploy production (Vercel + Render).
 *
 * Chạy sau khi deploy xong:
 *   node scripts/verify-deploy.mjs
 *
 * Có thể truyền URL qua biến môi trường:
 *   APP_URL=https://<app>.vercel.app \
 *   API_URL=https://<api>.onrender.com \
 *   node scripts/verify-deploy.mjs
 *
 * Nếu không truyền, script tự đọc URL từ `vercel.json` (destination của
 * rewrite `/api/:path*`).
 *
 * Script KHÔNG cần backend đã chạy; nó chỉ gọi HTTP + mở WebSocket.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Đọc rewrite `/api/:path*` trong vercel.json để suy ra URL backend. */
const readApiUrlFromVercel = () => {
  try {
    const raw = readFileSync(path.join(REPO_ROOT, "vercel.json"), "utf8");
    const parsed = JSON.parse(raw);
    const apiRewrite = (parsed.rewrites ?? []).find((r) =>
      String(r.source ?? "").startsWith("/api")
    );
    const destination = apiRewrite?.destination ?? "";
    const match = String(destination).match(/^https?:\/\/([^/]+)/);
    return match ? `https://${match[1]}` : "";
  } catch {
    return "";
  }
};

const APP_URL = (
  process.env.APP_URL ??
  process.env.SMOKE_BASE_URL ??
  "http://localhost:5173"
).replace(/\/+$/, "");

const API_URL = (
  process.env.API_URL ??
  readApiUrlFromVercel() ??
  "http://localhost:8080"
).replace(/\/+$/, "");

const WS_URL = (process.env.WS_URL ?? process.env.VITE_WS_URL ?? "").replace(
  /\/+$/,
  ""
);

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "student@viejob.vn";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Student@123";

let failures = 0;
let skipped = 0;

const test = async (name, fn) => {
  try {
    const note = await fn();
    if (note === "SKIP") {
      skipped += 1;
      console.log(`  ⏭️  ${name} — bỏ qua`);
      return;
    }
    console.log(`  ✅ ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log(`\n🔍 Verify deploy`);
console.log(`   APP : ${APP_URL}`);
console.log(`   API : ${API_URL}`);
console.log(`   WS  : ${WS_URL || "(suy ra từ API)"}`);
console.log("");

// ---------------------------------------------------------------------
// 1. Frontend — trang chủ trả HTML của SPA
// ---------------------------------------------------------------------
await test("Frontend trả HTML (SPA build thành công)", async () => {
  const res = await fetch(`${APP_URL}/`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  assert(res.ok, `HTTP ${res.status}`);
  const html = await res.text();
  assert(
    html.includes('<div id="root">'),
    "HTML không có mount point #root — build có thể đã hỏng"
  );
  assert(
    /\/assets\/.*\.(js|css)/.test(html),
    "HTML không tham chiếu file /assets — có thể trỏ sai outputDirectory"
  );
});

// ---------------------------------------------------------------------
// 2. Frontend — route SPA fallback (deep link không được 404)
// ---------------------------------------------------------------------
await test("SPA fallback hoạt động (deep link /login)", async () => {
  const res = await fetch(`${APP_URL}/login`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  assert(res.ok, `HTTP ${res.status} — thiếu rewrite SPA fallback`);
  const html = await res.text();
  assert(html.includes('<div id="root">'), "Không trả về index.html");
});

// ---------------------------------------------------------------------
// 3. API công khai — endpoint master data
// ---------------------------------------------------------------------
await test("API trả master data (/api/v1/public/categories)", async () => {
  const res = await fetch(`${API_URL}/api/v1/public/categories`, {
    signal: AbortSignal.timeout(60_000),
  });
  assert(res.ok, `HTTP ${res.status}`);
  const body = await res.json();
  assert(body?.data !== undefined, "Response không có trường `data`");
});

// ---------------------------------------------------------------------
// 4. API qua rewrite của Vercel (same-origin)
// ---------------------------------------------------------------------
await test("API chạy được qua rewrite của Vercel (/api/*)", async () => {
  const res = await fetch(`${APP_URL}/api/v1/public/positions`, {
    signal: AbortSignal.timeout(60_000),
  });
  assert(
    res.ok,
    `HTTP ${res.status} — rewrite /api trong vercel.json chưa đúng`
  );
  const body = await res.json();
  assert(body?.data !== undefined, "Response không có trường `data`");
});

// ---------------------------------------------------------------------
// 5. API trả 401 khi thiếu token (bảo mật hoạt động)
// ---------------------------------------------------------------------
await test("API chặn endpoint private khi thiếu token", async () => {
  const res = await fetch(`${API_URL}/api/v1/student/profile`, {
    signal: AbortSignal.timeout(30_000),
  });
  assert(
    res.status === 401 || res.status === 403,
    `HTTP ${res.status} — mong đợi 401/403`
  );
});

// ---------------------------------------------------------------------
// 6. Đăng nhập tài khoản demo
// ---------------------------------------------------------------------
let accessToken = "";

await test(`Đăng nhập tài khoản demo (${DEMO_EMAIL})`, async () => {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    signal: AbortSignal.timeout(60_000),
  });
  assert(res.ok, `HTTP ${res.status}`);
  const body = await res.json();
  accessToken = body?.data?.access_token ?? "";
  assert(accessToken, "Response không có access_token");
  return `role=${body?.data?.user?.role ?? "?"}`;
});

// ---------------------------------------------------------------------
// 7. Endpoint private với token
// ---------------------------------------------------------------------
await test("Endpoint private hoạt động khi có token", async () => {
  if (!accessToken) throw new Error("Bỏ qua — chưa đăng nhập được");
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  assert(res.ok, `HTTP ${res.status}`);
});

// ---------------------------------------------------------------------
// 8. Vé WebSocket + handshake
// ---------------------------------------------------------------------
await test("WebSocket handshake thành công (có vé)", async () => {
  if (!accessToken) throw new Error("Bỏ qua — chưa đăng nhập được");
  if (typeof WebSocket === "undefined") {
    throw new Error(
      "Node < 22 không có global WebSocket — hãy chạy script bằng Node 22+"
    );
  }

  const ticketRes = await fetch(`${API_URL}/api/v1/ws/ticket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  assert(ticketRes.ok, `Không xin được vé — HTTP ${ticketRes.status}`);
  const ticketBody = await ticketRes.json();
  const ticket = ticketBody?.data?.ticket;
  assert(ticket, "Response không có ticket");

  const wsBase =
    WS_URL || API_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  const url = `${wsBase}/ws/notifications?ticket=${encodeURIComponent(ticket)}`;

  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`Timeout 20s mở WebSocket tới ${url}`));
    }, 20_000);

    socket.onopen = () => {
      clearTimeout(timer);
      socket.close();
      resolve();
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(
        new Error(
          `WebSocket handshake thất bại — kiểm tra VITE_WS_URL và URL này: ${url}`
        )
      );
    };
  });

  return url.split("?")[0];
});

// ---------------------------------------------------------------------
// 9. R2 — xin presigned PUT (kiểm tra storage cấu hình đúng)
// ---------------------------------------------------------------------
await test("R2 cấp presigned URL cho file upload", async () => {
  if (!accessToken) throw new Error("Bỏ qua — chưa đăng nhập được");

  const res = await fetch(
    `${API_URL}/api/v1/files/presign?kind=CV&contentType=text%2Fplain`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    }
  );
  assert(res.ok, `HTTP ${res.status}`);
  const body = await res.json();
  assert(body?.data?.uploadUrl, "Response không có uploadUrl");
  return `bucket=${body?.data?.bucket ?? "?"}`;
});

// ---------------------------------------------------------------------
console.log("");
console.log(`📊 Kết quả: ${failures} lỗi, ${skipped} bỏ qua`);
process.exit(failures === 0 ? 0 : 1);
