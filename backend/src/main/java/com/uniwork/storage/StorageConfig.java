package com.uniwork.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình nơi lưu trữ file.
 *
 * <p>Hệ thống dùng **Cloudflare R2** (S3-compatible) làm nơi lưu trữ duy nhất:
 * 10 GB storage free + egress miễn phí, và không bị mất dữ liệu khi container
 * restart trên PaaS có disk ephemeral (Render/Railway).
 *
 * <p>Việc upload đi qua luồng **presigned PUT** — browser {@code PUT} thẳng
 * lên R2, backend không nhận nội dung file.
 *
 * @see R2StorageProvider
 */
@Configuration
public class StorageConfig {

    /**
     * Bean provider lưu trữ file.
     *
     * @param r2StorageProvider provider R2
     * @return provider
     */
    @Bean
    public StorageProvider storageProvider(R2StorageProvider r2StorageProvider) {
        return r2StorageProvider;
    }

    /**
     * Tên bucket public / private.
     *
     * <p>Tách 2 bucket là điều kiện để CV không bị lộ link tĩnh:
     * bucket public phục vụ ảnh qua CDN, bucket private chỉ tải được bằng
     * presigned URL có hạn.
     *
     * @param r2PublicBucket  bucket ảnh công khai
     * @param r2PrivateBucket bucket CV
     * @return tên bucket
     */
    @Bean
    public StorageBuckets storageBuckets(
            @Value("${app.storage.r2.bucket-public:viejob-public}") String r2PublicBucket,
            @Value("${app.storage.r2.bucket-private:viejob-private}") String r2PrivateBucket) {
        return new StorageBuckets(r2PublicBucket, r2PrivateBucket);
    }
}
