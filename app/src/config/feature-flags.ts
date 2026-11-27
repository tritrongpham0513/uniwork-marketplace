/**
 * Cờ bật/tắt tính năng ở tầng giao diện.
 *
 * <p>Mục đích: tạm ẩn một khối UI mà **không xoá logic**. Khi bật lại chỉ cần
 * đổi giá trị cờ, không phải viết lại component hay service.
 */

/**
 * Hiển thị xếp hạng lương ("Top 76% · Trung bình ngành") trên giao diện.
 *
 * <p>`false` = ẩn toàn bộ phần xếp hạng ở mọi màn hình (danh sách tin, chi tiết
 * tin, trang quản trị). Logic tính toán vẫn còn nguyên trong
 * `features/shared/lib/salary.ts`.
 */
export const SHOW_SALARY_RANKING = false;
