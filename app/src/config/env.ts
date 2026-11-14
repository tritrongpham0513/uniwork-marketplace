/**
 * Cấu hình môi trường runtime.
 *
 * `USE_MOCK_API` quyết định frontend gọi API thật (backend Spring Boot)
 * hay gọi tầng mock nội bộ.
 *
 * - `true`  → dùng mock adapter (mặc định, để demo offline)
 * - `false` → gọi `VITE_API_URL_DEV` thật
 *
 * Khi backend team hoàn thiện API, chỉ cần đặt `VITE_USE_MOCK_API=false`
 * trong `.env` — không phải sửa một dòng service nào.
 */
const rawMockFlag = import.meta.env.VITE_USE_MOCK_API;

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
};

export const env = {
  /** Base URL gốc — service thêm tiền tố `/api/v1` */
  API_URL_DEV: import.meta.env.VITE_API_URL_DEV ?? "http://localhost:8000",
  API_URL_PROD:
    import.meta.env.VITE_API_URL_PROD ?? "http://localhost:8000",
  CLIENT_ID_GOOGLE: import.meta.env.VITE_CLIENT_ID_GOOGLE,
  REDIRECT_URI_GOOGLE: import.meta.env.VITE_REDIRECT_URI_GOOGLE,
  /** Bật mock API giả lập (mặc định true) */
  USE_MOCK_API: parseBool(rawMockFlag, true),
  /** Độ trễ mô phỏng network (ms) — để UI có loading state thật */
  MOCK_MIN_DELAY: Number(import.meta.env.VITE_MOCK_MIN_DELAY ?? 250),
  MOCK_MAX_DELAY: Number(import.meta.env.VITE_MOCK_MAX_DELAY ?? 600),
} as const;

export type Env = typeof env;
