package com.uniwork.util;

import java.util.regex.Pattern;

/**
 * Chuẩn hoá & kiểm tra URL file do hệ thống cấp.
 *
 * <p>Frontend không bao giờ được tự đặt URL file tuỳ ý: mọi URL lưu vào DB phải
 * trỏ tới endpoint nội bộ {@code /api/v1/files/{slug}}. Nhờ vậy:
 * <ul>
 *   <li>không lưu được link ngoài (chống phishing qua "CV" của ứng viên),</li>
 *   <li>URL luôn tương đối → chạy đúng ở mọi domain (dev :5173, prod :8000,
 *       deploy thật) mà không phụ thuộc cấu hình host của backend.</li>
 * </ul>
 */
public final class FileUrlValidator {

    /** Đường dẫn gốc của endpoint file — khớp {@code app.storage.public-path}. */
    public static final String FILES_PATH = "/api/v1/files/";

    /** Slug do backend sinh: {@code file-<uuid>} (chỉ chữ, số và dấu gạch). */
    private static final Pattern SLUG_PATTERN = Pattern.compile("[A-Za-z0-9-]{1,80}");

    private FileUrlValidator() {
    }

    /**
     * Lấy slug file từ URL nội bộ (tương đối hoặc tuyệt đối).
     *
     * @param url URL người dùng gửi lên
     * @return slug, hoặc {@code null} nếu URL không trỏ tới endpoint file
     */
    public static String slugOf(String url) {
        if (url == null) {
            return null;
        }
        String value = url.trim();
        int index = value.indexOf(FILES_PATH);
        if (index < 0) {
            return null;
        }
        String slug = value.substring(index + FILES_PATH.length());
        int cut = indexOfAny(slug, '?', '#');
        if (cut >= 0) {
            slug = slug.substring(0, cut);
        }
        slug = slug.replaceAll("/+$", "");
        return SLUG_PATTERN.matcher(slug).matches() ? slug : null;
    }

    /** URL file có thuộc hệ thống không? */
    public static boolean isOwnFileUrl(String url) {
        return slugOf(url) != null;
    }

    /**
     * Chuẩn hoá URL file về dạng tương đối {@code /api/v1/files/{slug}}.
     *
     * @param url URL gửi lên (có thể null / chuỗi rỗng để xoá giá trị)
     * @return URL tương đối, hoặc {@code null} nếu cần xoá giá trị
     * @throws com.uniwork.exception.AppException 400 nếu URL không phải file hệ thống
     */
    public static String normalize(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String slug = slugOf(url);
        if (slug == null) {
            throw ApiErrors.badRequest(
                    "Đường dẫn file không hợp lệ. Vui lòng tải file lên lại.",
                    ApiErrors.errors("url", "Đường dẫn file không hợp lệ."));
        }
        return FILES_PATH + slug;
    }

    private static int indexOfAny(String value, char first, char second) {
        int a = value.indexOf(first);
        int b = value.indexOf(second);
        if (a < 0) {
            return b;
        }
        if (b < 0) {
            return a;
        }
        return Math.min(a, b);
    }
}
