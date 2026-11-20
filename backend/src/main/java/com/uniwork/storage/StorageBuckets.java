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

    /** Bucket dùng cho loại file tương ứng. */
    public String forKind(boolean isPublic) {
        return isPublic ? publicBucket : privateBucket;
    }
}
