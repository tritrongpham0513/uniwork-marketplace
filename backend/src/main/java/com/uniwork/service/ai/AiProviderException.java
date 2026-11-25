package com.uniwork.service.ai;

/**
 * Lỗi từ nhà cung cấp AI.
 *
 * <p>Mọi lỗi đi ra ngoài phải là {@code AiProviderException} để tầng trên (service)
 * dịch được thành thông điệp tiếng Việt — không để lỗi HTTP thô lọt ra ngoài
 * thành lỗi 500 (CONTRACT.md mục 5.2).
 */
public class AiProviderException extends RuntimeException {

    /** QUOTA_EXCEEDED | SERVICE_ERROR | NOT_CONFIGURED | TIMEOUT */
    private final String reason;

    public AiProviderException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    public AiProviderException(String reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }
}
