package com.uniwork.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Cấu trúc phản hồi lỗi chuẩn RESTful cho toàn hệ thống:
 * {"timestamp", "status", "success": false, "code", "message", "errors": [{"field", "message"}]}
 *
 * <p>Khớp 100% với envelope lỗi mà frontend đọc ở
 * {@code app/src/lib/api-error.ts}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    @Builder.Default
    private Instant timestamp = Instant.now();

    private int status;

    /** Luôn là false trong envelope lỗi. */
    @Builder.Default
    private boolean success = false;

    private String code;

    private String message;

    private List<FieldErrorDetail> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldErrorDetail {
        private String field;
        private String message;
    }

    public static ErrorResponse of(int status, String code, String message) {
        return ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status)
                .success(false)
                .code(code)
                .message(message)
                .build();
    }

    public static ErrorResponse of(int status, String code, String message, List<FieldErrorDetail> errors) {
        return ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status)
                .success(false)
                .code(code)
                .message(message)
                .errors(errors)
                .build();
    }
}
