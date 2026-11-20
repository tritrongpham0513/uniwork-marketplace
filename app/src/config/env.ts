/**
 * Cấu hình môi trường runtime.
 *
 * Frontend **luôn gọi API thật** của backend Spring Boot — không còn tầng mock
 * trong bất kỳ bản build nào.
 *
 * - `API_URL_DEV` rỗng (mặc định) → request chạy **cùng origin** với app:
 *   - dev: Vite proxy `/api` → backend (xem `vite.config.ts`)
 *   - production: nginx proxy `/api` → backend (xem `nginx.conf`)
 * - Chỉ khi chạy app ở domain khác hẳn với API (ví dụ `pnpm dev` ngoài Docker
 *   trong khi backend chạy ở port khác) mới cần đặt `VITE_API_URL_DEV`.
 */
export const env = {
  /** Base URL gốc — service thêm tiền tố `/api/v1`. Rỗng = same-origin. */
  API_URL_DEV: import.meta.env.VITE_API_URL_DEV ?? "",
  CLIENT_ID_GOOGLE: import.meta.env.VITE_CLIENT_ID_GOOGLE,
  REDIRECT_URI_GOOGLE: import.meta.env.VITE_REDIRECT_URI_GOOGLE,
} as const;

export type Env = typeof env;
