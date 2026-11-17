package com.uniwork.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Tiện ích chuyển đổi kiểu dữ liệu & định dạng ngày giờ.
 *
 * <p>Frontend dùng chuỗi ISO-8601 cho mọi trường thời gian nên backend
 * phải trả về đúng định dạng đó (ví dụ {@code 2026-11-16T08:30:00Z}).
 */
public final class DateTimeUtils {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private DateTimeUtils() {
    }

    /** LocalDateTime (giờ hệ thống) -> chuỗi ISO-8601 ở UTC. */
    public static String toIso(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return ISO_INSTANT.format(value.toInstant(ZoneOffset.UTC));
    }

    /** LocalDate -> chuỗi "yyyy-MM-dd". */
    public static String toDate(LocalDate value) {
        return value == null ? null : value.toString();
    }

    /** LocalDate -> chuỗi ISO đầy đủ (dùng cho các trường ngày trong response). */
    public static String toIso(LocalDate value) {
        if (value == null) {
            return null;
        }
        return ISO_INSTANT.format(value.atStartOfDay(ZoneOffset.UTC).toInstant());
    }

    /** Chuỗi ISO -> LocalDateTime (chấp nhận cả dạng không có timezone). */
    public static LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(value.substring(0, Math.min(value.length(), 19)));
            } catch (Exception ignored2) {
                return null;
            }
        }
    }

    /** Chuỗi "yyyy-MM-dd" -> LocalDate. */
    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.substring(0, Math.min(value.length(), 10)));
        } catch (Exception e) {
            return null;
        }
    }

    /** "HH:mm:ss" -> "HH:mm" (frontend dùng định dạng HH:mm cho ca làm việc). */
    public static String toHourMinute(java.time.LocalTime value) {
        if (value == null) {
            return null;
        }
        return String.format("%02d:%02d", value.getHour(), value.getMinute());
    }

    /** "HH:mm" -> LocalTime. */
    public static java.time.LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return java.time.LocalTime.parse(value.length() > 5 ? value.substring(0, 5) : value);
        } catch (Exception e) {
            return null;
        }
    }

    /** Chuyển danh sách sang danh sách mới, bỏ qua phần tử null. */
    public static <T> List<T> nullSafe(List<T> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(v -> v != null).collect(Collectors.toList());
    }
}
