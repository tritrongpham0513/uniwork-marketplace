package com.uniwork.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Ngoại lệ ứng dụng tùy biến, mang thông điệp tiếng Việt, HTTP status và error code.
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AppException(String message) {
        this(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    public AppException(String message, HttpStatus status) {
        this(message, status, status.name());
    }

    public AppException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
