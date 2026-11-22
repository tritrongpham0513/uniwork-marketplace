package com.uniwork.storage;

/**
 * Tên bucket public / private trên Cloudflare R2.
 *
 * <p>Tách 2 bucket là điều kiện để CV không bị lộ link tĩnh:
 * bucket public phục vụ ảnh (avatar / logo) qua CDN, bucket private chỉ tải
 * được bằng presigned URL có hạn.
 *
 * @param publicBucket  bucket chứa ảnh công khai
 * @param privateBucket bucket chứa CV (không public)
 */
public record StorageBuckets(String publicBucket, String privateBucket) {

    /** Giá trị cũ từng được lưu trong cột {@code file_uploads.bucket} trước V10. */
    private static final String LEGACY_PUBLIC = "public";
    private static final String LEGACY_PRIVATE = "private";

    /** Bucket dùng cho loại file tương ứng. */
    public String forKind(boolean isPublic) {
        return isPublic ? publicBucket : privateBucket;
    }

    /**
     * Chuẩn hoá tên bucket đọc từ DB về tên bucket thật đang cấu hình.
     *
     * <p>Dữ liệu tạo trước V10 lưu literal {@code "public"} / {@code "private"}
     * thay vì tên bucket; nếu dùng thẳng giá trị đó để gọi R2 sẽ nhận
     * {@code NoSuchBucket}. Hàm này map lại về bucket hiện hành.
     *
     * @param storedBucket giá trị cột {@code file_uploads.bucket} (có thể null)
     * @param isPublic     loại file có phải ảnh công khai không
     * @return tên bucket thật
     */
    public String resolve(String storedBucket, boolean isPublic) {
        if (storedBucket == null || storedBucket.isBlank()) {
            return forKind(isPublic);
        }
        String value = storedBucket.trim();
        if (LEGACY_PUBLIC.equalsIgnoreCase(value)) {
            return publicBucket;
        }
        if (LEGACY_PRIVATE.equalsIgnoreCase(value)) {
            return privateBucket;
        }
        return value;
    }
}
