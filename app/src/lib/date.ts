import { format, parseISO } from "date-fns";

/**
 * Chuỗi ngày chuẩn của hệ thống: `yyyy-MM-dd` (không giờ, không múi giờ).
 * Dùng chung cho form state, payload API và mock data.
 */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse chuỗi `yyyy-MM-dd` thành Date theo múi giờ cục bộ.
 *
 * Dùng `parseISO` thay vì `new Date(iso)` vì `new Date("2003-05-12")` được
 * hiểu là UTC → có thể lệch 1 ngày khi hiển thị ở múi giờ Việt Nam.
 */
export const isoToDate = (iso: string): Date => parseISO(iso);

/** Chuyển Date thành chuỗi `yyyy-MM-dd` (theo múi giờ cục bộ). */
export const dateToIso = (date: Date): string => format(date, "yyyy-MM-dd");

/** Ngày hôm nay dạng `yyyy-MM-dd`. */
export const todayIso = (): string => dateToIso(new Date());

/**
 * Hiển thị ngày theo kiểu Việt Nam: `dd/MM/yyyy`.
 * Trả về `fallback` nếu giá trị rỗng hoặc không hợp lệ.
 */
export const formatDateVi = (
  iso: string | null | undefined,
  fallback = "—"
): string => {
  if (!iso) return fallback;
  const date = isoToDate(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, "dd/MM/yyyy");
};
