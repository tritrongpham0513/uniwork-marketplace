/**
 * ⏱️ Mốc thời gian cố định cho toàn bộ dataset mock.
 *
 * ## Vì sao không dùng `Date.now()`?
 *
 * Dataset mock cần mốc "hôm nay" để hiển thị "2 giờ trước", "3 ngày trước"…
 * Nhưng nếu dùng `Date.now()` thì **mỗi lần chạy `pnpm seed:sql` sẽ sinh ra
 * file SQL khác nhau** → Flyway báo `Migration checksum mismatch for migration
 * version 3` và backend không khởi động được.
 *
 * Vì vậy ta ghim một mốc cố định:
 * - Dataset mock luôn có cùng timestamp → seed SQL deterministic.
 * - Giao diện vẫn hiển thị "hôm nay / 3 ngày trước" vì mốc này được cập
 *   nhật khi cần (thường là khi chuẩn bị release hoặc đổi dữ liệu demo).
 *
 * ## Khi đổi mốc này
 *
 * 1. Sửa `MOCK_NOW` bên dưới.
 * 2. Chạy lại `pnpm seed:sql` trong `app/`.
 * 3. Tạo lại database: `docker compose down -v && docker compose up --build`
 *    (Flyway sẽ báo checksum mismatch nếu không xoá volume).
 */
export const MOCK_NOW = Date.parse("2026-11-18T09:00:00.000Z");

/** N (ngày) trước mốc `MOCK_NOW`. */
export const daysAgo = (d: number): string =>
  new Date(MOCK_NOW - d * 86_400_000).toISOString();

/** N (giờ) trước mốc `MOCK_NOW`. */
export const hoursAgo = (h: number): string =>
  new Date(MOCK_NOW - h * 3_600_000).toISOString();

/** N (ngày) sau mốc `MOCK_NOW`. */
export const daysFromNow = (d: number): string =>
  new Date(MOCK_NOW + d * 86_400_000).toISOString();
