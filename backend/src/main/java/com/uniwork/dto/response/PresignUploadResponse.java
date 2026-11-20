package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả cấp URL upload trực tiếp (presigned PUT).
 *
 * <p>Client dùng {@code uploadUrl} để {@code PUT} file thẳng lên nơi lưu trữ
 * (Cloudflare R2), sau đó gọi {@code POST /api/v1/files/confirm} để backend
 * ghi metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresignUploadResponse {

    /** URL có chữ ký để PUT file (bearer token — hết hạn sau {@code expiresInSeconds}). */
    private String uploadUrl;

    /** Khóa đối tượng — client gửi lại khi confirm. */
    private String storageKey;

    /** Bucket đích (public hoặc private). */
    private String bucket;

    /** MIME type đã được ký vào URL — client PHẢI gửi đúng header này khi PUT. */
    private String contentType;

    /** Số giây còn hiệu lực của {@link #uploadUrl}. */
    private Integer expiresInSeconds;

    /** Dung lượng tối đa được phép (byte) — client nên tự kiểm tra trước khi PUT. */
    private Long maxSizeBytes;

    /**
     * URL công khai của file (chỉ có với loại file public như avatar / logo).
     * Với CV thì {@code null} — phải tải qua {@code GET /api/v1/files/{id}}.
     */
    private String publicUrl;
}
