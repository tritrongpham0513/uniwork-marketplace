package com.uniwork.exception;

import com.uniwork.dto.response.ErrorResponse;
import com.uniwork.util.ApiErrors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.ArrayList;
import java.util.List;

/**
 * Bộ xử lý ngoại lệ tập trung toàn hệ thống.
 *
 * <p>Mọi lỗi trả cùng một cấu trúc chuẩn:
 * {@code {"timestamp", "status", "success": false, "code", "message", "errors": [...]}}
 *
 * <p>Thông điệp tiếng Việt có dấu, không lộ chi tiết nội bộ (stack trace, câu lệnh SQL).
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex) {
        log.warn("AppException: status={}, code={}, message={}", ex.getStatus(), ex.getCode(), ex.getMessage());

        List<ErrorResponse.FieldErrorDetail> details = null;
        if (ex.getFieldErrors() != null && !ex.getFieldErrors().isEmpty()) {
            details = ex.getFieldErrors().stream()
                    .map(fe -> new ErrorResponse.FieldErrorDetail(fe.field(), fe.message()))
                    .toList();
        }

        ErrorResponse body = details == null
                ? ErrorResponse.of(ex.getStatus().value(), ex.getCode(), ex.getMessage())
                : ErrorResponse.of(ex.getStatus().value(), ex.getCode(), ex.getMessage(), details);

        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        List<ErrorResponse.FieldErrorDetail> fieldErrors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.add(new ErrorResponse.FieldErrorDetail(fe.getField(), fe.getDefaultMessage()));
        }

        String firstMessage = fieldErrors.isEmpty() ? "Dữ liệu đầu vào không hợp lệ" : fieldErrors.get(0).getMessage();
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                firstMessage,
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /** Sai kiểu tham số query/path (ví dụ page="abc"). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                "Tham số '" + ex.getName() + "' không hợp lệ.",
                List.of(new ErrorResponse.FieldErrorDetail(ex.getName(), "Giá trị không hợp lệ"))
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                "INVALID_CREDENTIALS",
                "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthException(AuthenticationException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                "UNAUTHORIZED",
                "Yêu cầu xác thực tài khoản để truy cập tài nguyên này."
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này."
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("DataIntegrityViolationException: {}", ex.getMostSpecificCause().getMessage());
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "CONFLICT",
                "Dữ liệu đã tồn tại hoặc đang được tham chiếu. Vui lòng thử lại với giá trị khác."
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /**
     * Endpoint không tồn tại -> 404 với envelope chuẩn.
     * Spring Boot 6.1 ném {@link org.springframework.web.servlet.resource.NoResourceFoundException}
     * khi không khớp handler nào; nếu không bắt, lỗi này rơi vào
     * {@link #handleGeneralException} và trả 500 (sai ngữ nghĩa).
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "NOT_FOUND",
                "Không tìm thấy tài nguyên yêu cầu."
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.METHOD_NOT_ALLOWED.value(),
                "METHOD_NOT_ALLOWED",
                "Phương thức HTTP không được hỗ trợ cho tài nguyên này."
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        log.error("Unhandled Exception: ", ex);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
