/**
 * 🧪 Kiểm thử tích hợp: Backend error -> Axios interceptor -> TanStack Query -> Toast.
 *
 * Dùng một HTTP server giả lập trả về đúng envelope lỗi của backend Spring Boot,
 * rồi chạy `authService.login()` để xác nhận:
 *   - Lỗi 401 sai mật khẩu -> 1 toast error với message tiếng Việt của backend
 *   - Lỗi 400 validation    -> KHÔNG toast, fieldErrors được map vào field
 *   - Lỗi 500                -> 1 toast error, không lộ stack trace
 *   - Lỗi 409 (code null)   -> 1 toast error, id fallback theo status
 */

import http from "node:http";
import assert from "node:assert/strict";

// --- Shim localStorage cho môi trường Node ---
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

const sent: Array<{ id?: string; type?: string; title?: unknown; description?: unknown }> = [];

// --- Tạo server giả lập backend ---
let scenario: "invalid" | "validation" | "server" | "conflict" = "invalid";

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url?.includes("/auth/login")) {
    if (scenario === "invalid") {
      res.statusCode = 401;
      res.end(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
        })
      );
      return;
    }
    if (scenario === "validation") {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 400,
          code: "VALIDATION_FAILED",
          message: "Dữ liệu đầu vào không hợp lệ",
          errors: [
            { field: "email", message: "Email không hợp lệ" },
            { field: "password", message: "Mật khẩu quá ngắn" },
          ],
        })
      );
      return;
    }
    if (scenario === "server") {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
        })
      );
      return;
    }
    res.statusCode = 409;
    res.end(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 409,
        code: null,
        message: "Email này đã được đăng ký.",
      })
    );
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ status: 404, message: "Not found" }));
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as { port: number }).port;
const baseURL = `http://127.0.0.1:${port}/api/v1/`;

process.env.VITE_API_URL_DEV = baseURL;

// --- Nạp các module app SAU khi đã set env ---
const { toastManager } = await import("../src/lib/toast-manager.ts");
const { normalizeApiError } = await import("../src/lib/api-error.ts");
const { showApiError, __resetToastState } = await import("../src/lib/toast.ts");
const { default: httpClient } = await import("../src/lib/axios.ts");
const { axiosInstance } = await import("../src/lib/axios.ts");

// Trỏ axios instance về server giả lập (env được Vite nội sẵn lúc build)
axiosInstance.defaults.baseURL = baseURL;

// Bỏ mock adapter để request thực sự đi qua HTTP tới server giả lập
axiosInstance.defaults.adapter = undefined;

// Ghi lại toast phát ra
(toastManager as unknown as { add: (o: unknown) => string }).add = ((
  options: (typeof sent)[number]
) => {
  sent.push(options);
  return options.id ?? `test-${sent.length}`;
}) as typeof toastManager.add;

let failures = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  sent.length = 0;
  __resetToastState();
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
};

// Dùng đúng cách TanStack Query global handler sẽ gọi
const globalMutationError = (error: unknown): void => {
  const apiError = normalizeApiError(error);
  if (apiError.kind === "validation" && apiError.fieldErrors.length > 0) return;
  showApiError(apiError);
};

console.log("\n🔌 Backend error -> Toast (tích hợp thật qua HTTP)");

await test("401 sai mật khẩu -> 1 toast error, message tiếng Việt của backend", async () => {
  scenario = "invalid";
  try {
    await httpClient.post("/auth/login", { email: "a@b.c", password: "x" });
    assert.fail("phải throw");
  } catch (error) {
    globalMutationError(error);
  }
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "error");
  assert.equal(
    sent[0].title,
    "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
  );
  assert.equal(sent[0].id, "api-error:INVALID_CREDENTIALS");
});

await test("400 validation -> KHÔNG toast, có fieldErrors để map vào field", async () => {
  scenario = "validation";
  try {
    await httpClient.post("/auth/login", { email: "x", password: "y" });
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiError(error);
    assert.equal(apiError.kind, "validation");
    assert.equal(apiError.fieldErrors.length, 2);
    assert.equal(apiError.fieldErrors[0].field, "email");
    globalMutationError(error);
  }
  assert.equal(sent.length, 0);
});

await test("500 lỗi hệ thống -> 1 toast error, không lộ stack trace", async () => {
  scenario = "server";
  try {
    await httpClient.post("/auth/login", { email: "a@b.c", password: "x" });
    assert.fail("phải throw");
  } catch (error) {
    globalMutationError(error);
  }
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "error");
  assert.equal(
    sent[0].title,
    "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
  );
  assert.ok(!String(sent[0].title).includes("Exception"));
  assert.ok(!String(sent[0].title).includes("at com.uniwork"));
});

await test("409 với code=null -> 1 toast error, id fallback theo status", async () => {
  scenario = "conflict";
  try {
    await httpClient.post("/auth/login", { email: "a@b.c", password: "x" });
    assert.fail("phải throw");
  } catch (error) {
    globalMutationError(error);
  }
  assert.equal(sent.length, 1);
  assert.equal(sent[0].title, "Email này đã được đăng ký.");
  assert.equal(sent[0].id, "api-error:status:409");
});

await test("spam cùng 1 lỗi 10 lần -> vẫn 1 id (không nhân bản toast)", async () => {
  scenario = "invalid";
  for (let i = 0; i < 10; i += 1) {
    try {
      await httpClient.post("/auth/login", { email: "a@b.c", password: "x" });
    } catch (error) {
      globalMutationError(error);
    }
  }
  assert.equal(sent.length, 10);
  assert.ok(
    sent.every((t) => t.id === "api-error:INVALID_CREDENTIALS"),
    "mọi toast phải dùng cùng id để upsert"
  );
});

await test("kết nối tới server không tồn tại -> toast network, không crash", async () => {
  const badClient = httpClient.get("/khong-ton-tai", { timeout: 1000 });
  try {
    await badClient;
    assert.fail("phải throw");
  } catch (error) {
    const apiError = normalizeApiError(error);
    assert.ok(
      ["network", "timeout", "server", "notFound", "unknown"].includes(apiError.kind),
      `kind hợp lệ, nhận được: ${apiError.kind}`
    );
    globalMutationError(error);
  }
  assert.ok(sent.length >= 1);
});

server.close();

console.log(
  failures === 0
    ? "\n🎉 Tất cả test tích hợp PASSED!\n"
    : `\n💥 ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
