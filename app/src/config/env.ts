/**
 * Cấu hình môi trường runtime.
 *
 * Frontend **luôn gọi API thật** của backend Spring Boot — không còn tầng mock
 * trong bất kỳ bản build nào.
 *
 * - `API_URL_DEV` rỗng (mặc định) → request chạy **cùng origin** với app:
 *   - dev: Vite proxy `/api` → backend (xem `vite.config.ts`)
 *   - production (docker): nginx proxy `/api` → backend (xem `nginx.conf`)
 *   - production (Vercel): Vercel rewrite `/api/*` → Render (xem `vercel.json`)
 * - Chỉ khi chạy app ở domain khác hẳn với API (ví dụ `pnpm dev` ngoài Docker
 *   trong khi backend chạy ở port khác) mới cần đặt `VITE_API_URL_DEV`.
 *
 * - `WS_URL` là **đường thoát** cho WebSocket. Vercel rewrite KHÔNG nâng cấp
 *   được header `Upgrade` sang origin ngoài (xem
 *   https://vercel.com/docs/routing/rewrites), nên socket phải trỏ thẳng
 *   về Render: `wss://viejob-api.onrender.com`. Để trống = suy ra từ
 *   `window.location.origin` (đúng khi app và API cùng origin, ví dụ nginx).
 */
export const env = {
  /** Base URL gốc — service thêm tiền tố `/api/v1`. Rỗng = same-origin. */
  API_URL_DEV: import.meta.env.VITE_API_URL_DEV ?? "",
  /**
   * Base URL dùng để mở WebSocket thông báo realtime.
   * Rỗng = suy ra từ `window.location.origin`.
   */
  WS_URL: import.meta.env.VITE_WS_URL ?? "",
  CLIENT_ID_GOOGLE: import.meta.env.VITE_CLIENT_ID_GOOGLE,
  REDIRECT_URI_GOOGLE: import.meta.env.VITE_REDIRECT_URI_GOOGLE,
} as const;

export type Env = typeof env;
