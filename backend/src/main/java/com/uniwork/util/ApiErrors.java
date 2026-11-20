package com.uniwork.util;

import com.uniwork.exception.AppException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;

/**
 * Tiện ích tạo lỗi nghiệp vụ kèm danh sách lỗi field (đúng shape envelope
 * {@code { timestamp, status, success, code, message, errors[] }} } mà frontend
 * đọc ở {@code app/src/lib/api-error.ts}).
 */
public final class ApiErrors {

    private ApiErrors() {
    }

    /** 400 — dữ liệu không hợp lệ (kèm lỗi từng field). */
    public static AppException badRequest(String message, List<FieldError> errors) {
        return new AppException(message, HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", errors);
    }

    /** 400 — dữ liệu không hợp lệ (không có lỗi field cụ thể). */
    public static AppException badRequest(String message) {
        return new AppException(message, HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    }

    /** 401 — chưa đăng nhập / token không hợp lệ. */
    public static AppException unauthorized(String message) {
        return new AppException(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    }

    /** 403 — đã đăng nhập nhưng không đủ quyền. */
    public static AppException forbidden(String message) {
        return new AppException(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    /** 404 — không tìm thấy dữ liệu. */
    public static AppException notFound(String message) {
        return new AppException(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    /** 409 — xung đột dữ liệu (trùng lặp). */
    public static AppException conflict(String message, String code) {
        return new AppException(message, HttpStatus.CONFLICT, code);
    }

    /** 409 — xung đột dữ liệu mặc định. */
    public static AppException conflict(String message) {
        return new AppException(message, HttpStatus.CONFLICT, "CONFLICT");
    }

    /**
     * Chi tiết lỗi của 1 field.
     *
     * @param field   tên field (ví dụ "email")
     * @param message thông điệp hiển thị cho người dùng
     */
    public record FieldError(String field, String message) {
    }

    /** Tạo danh sách lỗi field từ các cặp field/message. */
    public static List<FieldError> errors(String field, String message) {
        List<FieldError> list = new ArrayList<>();
        list.add(new FieldError(field, message));
        return list;
    }
}
