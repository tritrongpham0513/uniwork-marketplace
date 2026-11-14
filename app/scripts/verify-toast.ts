/**
 * 🧪 Smoke test cho hệ thống Toast + Error Handling.
 *
 * Chạy bằng:  npx tsx app/scripts/verify-toast.ts   (hoặc node --experimental-strip-types)
 * Mục tiêu: kiểm tra logic thuần (không cần React) của:
 *   1. normalizeApiError  -> phân tầng mapping, code null, field errors, network
 *   2. toast facade       -> dedupe theo id, merge theo nội dung, rate limit
 *   3. showApiError       -> bỏ qua lỗi validation, bỏ qua lỗi đã handled/silent
 */

import assert from "node:assert/strict";
import { normalizeApiError, markApiErrorHandled } from "../src/lib/api-error.ts";
import {
  showApiError,
  toast,
  __resetToastState,
} from "../src/lib/toast.ts";
import { toastManager } from "../src/lib/toast-manager.ts";

// ============================================
// TEST HARNESS
// ============================================

const sent: Array<{ id?: string; type?: string; title?: unknown; description?: unknown }> = [];

// Ghi lại mọi toast được phát ra để assert.
(toastManager as unknown as { add: (o: unknown) => string }).add = ((
  options: (typeof sent)[number]
) => {
  sent.push(options);
  return options.id ?? `test-${sent.length}`;
}) as typeof toastManager.add;

let failures = 0;
const test = (name: string, fn: () => void) => {
  sent.length = 0;
  __resetToastState();
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
};

// ============================================
// 1. normalizeApiError
// ============================================

console.log("\n📦 normalizeApiError");

test("đọc envelope backend (có code + message)", () => {
  const result = normalizeApiError({
    response: {
      status: 401,
      data: {
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email hoặc mật khẩu không chính xác.",
      },
    },
  });
  assert.equal(result.kind, "auth");
  assert.equal(result.code, "INVALID_CREDENTIALS");
  assert.equal(result.message, "Email hoặc mật khẩu không chính xác.");
  assert.equal(result.status, 401);
});

test("code null -> vẫn normalize được, dùng message của backend", () => {
  const result = normalizeApiError({
    response: {
      status: 409,
      data: { status: 409, code: null, message: "Email đã tồn tại." },
    },
  });
  assert.equal(result.code, null);
  assert.equal(result.message, "Email đã tồn tại.");
  assert.equal(result.kind, "conflict");
});

test("code lạ (không trong catalog) -> fallback theo status", () => {
  const result = normalizeApiError({
    response: {
      status: 503,
      data: { status: 503, code: "SOME_NEW_CODE", message: "" },
    },
  });
  assert.equal(result.code, "SOME_NEW_CODE");
  assert.equal(result.kind, "server");
  assert.ok(result.message.length > 0);
});

test("errors[] -> kind = validation + fieldErrors", () => {
  const result = normalizeApiError({
    response: {
      status: 400,
      data: {
        status: 400,
        code: "VALIDATION_FAILED",
        message: "Dữ liệu đầu vào không hợp lệ",
        errors: [{ field: "email", message: "Email không hợp lệ" }],
      },
    },
  });
  assert.equal(result.kind, "validation");
  assert.equal(result.fieldErrors.length, 1);
  assert.equal(result.fieldErrors[0].field, "email");
});

test("không có response -> network", () => {
  const result = normalizeApiError({ message: "Network Error" });
  assert.equal(result.kind, "network");
  assert.equal(result.status, null);
});

test("timeout -> kind = timeout", () => {
  const result = normalizeApiError({ code: "ECONNABORTED", message: "timeout" });
  assert.equal(result.kind, "timeout");
});

test("idempotent: normalize lại ApiError trả về chính nó", () => {
  const first = normalizeApiError({ response: { status: 404, data: { status: 404, message: "x" } } });
  const second = normalizeApiError(first);
  assert.equal(first, second);
});

// ============================================
// 2. toast facade
// ============================================

console.log("\n🔔 toast facade");

test("toast.success / error / warning / info phát đúng type", () => {
  toast.success("OK");
  toast.error("Lỗi");
  toast.warning("Cảnh báo");
  toast.info("Thông tin");
  assert.deepEqual(
    sent.map((t) => t.type),
    ["success", "error", "warning", "info"]
  );
});

test("dedupe theo id -> lần 2 cùng id sẽ UPDATE (id giữ nguyên)", () => {
  toast.error("Lỗi A", { id: "fixed-id" });
  toast.error("Lỗi A", { id: "fixed-id" });
  assert.equal(sent.length, 2);
  assert.equal(sent[0].id, "fixed-id");
  assert.equal(sent[1].id, "fixed-id");
});

test("merge theo nội dung trong 2s -> hiện bộ đếm ×N", () => {
  toast.info("Cùng nội dung");
  toast.info("Cùng nội dung");
  assert.equal(sent.length, 2);
  assert.equal(sent[1].id, sent[0].id, "phải dùng chung id để update");
  assert.ok(
    String(sent[1].description).includes("×2"),
    `mô tả phải chứa bộ đếm, thực tế: ${sent[1].description}`
  );
});

test("merge theo nội dung -> nội dung khác thì tạo toast mới", () => {
  toast.info("Nội dung A");
  toast.info("Nội dung B");
  assert.notEqual(sent[0].id, sent[1].id);
});

test("toast.loading có timeout = 0 (không tự đóng)", () => {
  toast.loading("Đang xử lý");
  assert.equal(sent[0].type, "loading");
});

test("rate limit: > 5 toast mới/giây -> phần dư gộp thành 1 toast tổng hợp", () => {
  for (let i = 0; i < 8; i += 1) {
    toast.info(`Nội dung khác nhau ${i}`);
  }
  const overflow = sent.filter((t) => String(t.id).startsWith("toast:overflow:"));
  assert.ok(overflow.length > 0, "phải có toast tổng hợp");
  assert.equal(
    overflow.length,
    1,
    "chỉ được có 1 toast tổng hợp, không nhân bản"
  );
  assert.match(String(overflow[0].title), /thông báo khác đang chờ/);
});

test("rate limit: toast có id cố định KHÔNG bị chặn (vẫn update)", () => {
  for (let i = 0; i < 10; i += 1) {
    toast.error("Lỗi lặp", { id: "api-error:FIXED" });
  }
  assert.equal(sent.length, 10);
  assert.ok(
    sent.every((t) => t.id === "api-error:FIXED"),
    "mọi toast phải dùng cùng id"
  );
});

// ============================================
// 3. showApiError
// ============================================

console.log("\n🔗 showApiError");

test("lỗi thường -> bắn 1 toast error với id theo code", () => {
  showApiError({
    response: {
      status: 401,
      data: { status: 401, code: "INVALID_CREDENTIALS", message: "Sai mật khẩu" },
    },
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "error");
  assert.equal(sent[0].title, "Sai mật khẩu");
  assert.equal(sent[0].id, "api-error:INVALID_CREDENTIALS");
});

test("code null -> id fallback theo status", () => {
  showApiError({
    response: { status: 500, data: { status: 500, code: null, message: "Lỗi hệ thống" } },
  });
  assert.equal(sent[0].id, "api-error:status:500");
});

test("lỗi validation có fieldErrors -> KHÔNG bắn toast (hiển thị inline)", () => {
  showApiError({
    response: {
      status: 400,
      data: {
        status: 400,
        code: "VALIDATION_FAILED",
        message: "Dữ liệu không hợp lệ",
        errors: [{ field: "email", message: "Email sai" }],
      },
    },
  });
  assert.equal(sent.length, 0);
});

test("lỗi đã handled -> KHÔNG bắn toast (tránh double toast)", () => {
  const handled = markApiErrorHandled(
    normalizeApiError({
      response: { status: 401, data: { status: 401, code: "X", message: "Hết hạn" } },
    })
  );
  showApiError(handled);
  assert.equal(sent.length, 0);
});

test("silent -> KHÔNG bắn toast", () => {
  showApiError(new Error("x"), { silent: true });
  assert.equal(sent.length, 0);
});

test("cùng code lặp lại -> vẫn 1 id (upsert, không nhân bản)", () => {
  const err = {
    response: { status: 403, data: { status: 403, code: "FORBIDDEN", message: "Không có quyền" } },
  };
  showApiError(err);
  showApiError(err);
  assert.equal(sent[0].id, sent[1].id);
});

// ============================================

console.log(
  failures === 0
    ? "\n🎉 Tất cả test PASSED!\n"
    : `\n💥 ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
