/**
 * 🧪 Kiểm thử phần RENDER của hệ thống Toast (Toaster + ToastList).
 *
 * Render bằng react-dom/server để xác nhận:
 * - Provider/Viewport/Portal được dựng đúng
 * - ToastList map qua danh sách toast và render Title/Description/Icon
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Toaster } from "../src/components/ui/toast.tsx";
import { toastManager } from "../src/lib/toast-manager.ts";

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(String(args[0]));
  originalError(...args);
};

let markup: string;
try {
  toastManager.add({
    id: "render-test",
    type: "success",
    title: "Đăng ký thành công!",
    description: "Chào mừng bạn đến VieJob.",
    timeout: 0,
  });

  markup = renderToStaticMarkup(
    createElement(Toaster, { timeout: 0, limit: 3 })
  );
} finally {
  console.error = originalError;
}

const checks: Array<[string, boolean]> = [
  ["render không lỗi", errors.length === 0],
  ["có toast-viewport", markup.includes('data-slot="toast-viewport"')],
  ["có toast-provider", markup.includes('data-slot="toast-provider"')],
  ["có toast title", markup.includes("Đăng ký thành công!")],
  ["có toast description", markup.includes("Chào mừng bạn đến VieJob.")],
  ["có type=success", markup.includes('data-type="success"')],
  ["có nút đóng (toast-close)", markup.includes('data-slot="toast-close"')],
];

let failures = 0;
for (const [name, ok] of checks) {
  if (ok) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${name}`);
  }
}

if (failures > 0) {
  console.error("\n--- markup ---\n", markup.slice(0, 2000));
  if (errors.length) console.error("\n--- errors ---\n", errors.join("\n"));
}

console.log(failures === 0 ? "\n🎉 Render test PASSED!\n" : `\n💥 ${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
