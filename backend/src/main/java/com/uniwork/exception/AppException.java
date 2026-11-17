package com.uniwork.exception;

import com.uniwork.util.ApiErrors;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Ngoại lệ ứng dụng tùy biến, mang thông điệp tiếng Việt, HTTP status, error code
 * và (tuỳ chọn) danh sách lỗi theo từng field.
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;

    private final String code;

    /** Danh sách lỗi field — khớp `errors: [{ field, message }]` của frontend. */
    private final List<ApiErrors.FieldError> fieldErrors;

    public AppException(String message) {
        this(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST", null);
    }

    public AppException(String message, HttpStatus status) {
        this(message, status, status.name(), null);
    }

    public AppException(String message, HttpStatus status, String code) {
        this(message, status, code, null);
    }

    public AppException(String message, HttpStatus status, String code, List<ApiErrors.FieldError> fieldErrors) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}
