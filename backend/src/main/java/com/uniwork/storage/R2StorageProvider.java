package com.uniwork.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

/**
 * Lưu file trên Cloudflare R2 (S3-compatible).
 *
 * <p>Đây là nơi lưu trữ file duy nhất của hệ thống. Free tier: 10 GB storage
 * + egress miễn phí — phù hợp cho PaaS có disk ephemeral.
 *
 * <p>Kiến trúc upload: backend cấp **presigned URL**, client {@code PUT} thẳng
 * lên R2 → backend không bao giờ nhận nội dung file → không giới hạn dung
 * lượng theo RAM của container.
 *
 * <p>Yêu cầu CORS trên bucket (bắt buộc cho browser):
 * <pre>
 * AllowedOrigins: http://localhost:5173, http://localhost:8000, https://&lt;domain&gt;
 * AllowedMethods: PUT, GET, HEAD
 * AllowedHeaders: Content-Type
 * </pre>
 */
@Component
@Slf4j
public class R2StorageProvider implements StorageProvider {

    private final S3Client s3Client;
    private final S3Presigner presigner;

    /** Domain CDN phục vụ bucket công khai (rỗng → dùng endpoint R2). */
    private final String publicBaseUrl;

    private final String endpoint;

    /** Tên bucket chứa ảnh công khai (avatar / logo). */
    private final String publicBucket;

    /** Tên bucket chứa CV — không public, tải qua presigned GET. */
    private final String privateBucket;

    public R2StorageProvider(
            @Value("${app.storage.r2.endpoint}") String endpoint,
            @Value("${app.storage.r2.access-key}") String accessKey,
            @Value("${app.storage.r2.secret-key}") String secretKey,
            @Value("${app.storage.r2.public-base-url:}") String publicBaseUrl,
            @Value("${app.storage.r2.bucket-public:viejob-public}") String publicBucket,
            @Value("${app.storage.r2.bucket-private:viejob-private}") String privateBucket) {

        if (endpoint == null || endpoint.isBlank()
                || accessKey == null || accessKey.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException(
                    "Thiếu cấu hình Cloudflare R2: R2_ENDPOINT / R2_ACCESS_KEY / R2_SECRET_KEY. "
                            + "Xem backend/.env.example để biết cách lấy.");
        }

        this.endpoint = endpoint;
        this.publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        this.publicBucket = publicBucket;
        this.privateBucket = privateBucket;

        StaticCredentialsProvider credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey.trim(), secretKey.trim()));

        // R2 không dùng region thật của AWS — "auto" là giá trị được chấp nhận.
        // forcePathStyle(true) bắt buộc vì R2 không hỗ trợ virtual-hosted style.
        S3Configuration serviceConfiguration = S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build();

        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .serviceConfiguration(serviceConfiguration)
                .build();

        this.presigner = S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .serviceConfiguration(serviceConfiguration)
                .build();

        log.info("Đã khởi tạo R2StorageProvider: endpoint={}, bucketPublic={}, bucketPrivate={}",
                endpoint, publicBucket, privateBucket);
    }

    @Override
    public void put(String bucket, String key, byte[] content, String contentType) {
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .contentLength((long) content.length)
                            .build(),
                    RequestBody.fromBytes(content));
        } catch (RuntimeException e) {
            log.error("Không upload được file lên R2: bucket={} key={}", bucket, key, e);
            throw new StorageException("Không tải lên được file. Vui lòng thử lại.", e);
        }
    }

    @Override
    public void delete(String bucket, String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
        } catch (RuntimeException e) {
            log.warn("Không xoá được file trên R2: bucket={} key={}", bucket, key, e);
        }
    }

    @Override
    public String presignGet(String bucket, String key, Duration ttl) {
        try {
            GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                    .signatureDuration(ttl)
                    .getObjectRequest(GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build())
                    .build();
            return presigner.presignGetObject(request).url().toString();
        } catch (RuntimeException e) {
            log.error("Không tạo được presigned GET: bucket={} key={}", bucket, key, e);
            throw new StorageException("Không tải được file. Vui lòng thử lại.", e);
        }
    }

    @Override
    public String presignPut(String bucket, String key, String contentType, Duration ttl) {
        try {
            PutObjectPresignRequest request = PutObjectPresignRequest.builder()
                    .signatureDuration(ttl)
                    .putObjectRequest(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build())
                    .build();
            return presigner.presignPutObject(request).url().toString();
        } catch (RuntimeException e) {
            log.error("Không tạo được presigned PUT: bucket={} key={}", bucket, key, e);
            throw new StorageException("Không tải lên được file. Vui lòng thử lại.", e);
        }
    }

    @Override
    public String publicUrl(String bucket, String key) {
        // Chỉ bucket public mới có URL tĩnh — CV phải qua presigned GET.
        if (!publicBucket.equals(bucket)) {
            return null;
        }
        if (!publicBaseUrl.isEmpty()) {
            // Subdomain CDN (r2.dev) hoặc domain đã gắn vào bucket: URL có
            // dạng https://<domain>/<key> — KHÔNG chứa tên bucket.
            return publicBaseUrl.replaceAll("/+$", "") + "/" + key;
        }
        // Không có CDN → dùng endpoint S3 path-style: /<bucket>/<key>.
        // Lưu ý: URL này yêu cầu chữ ký → <img> sẽ 403. Nên luôn bật r2.dev.
        String base = endpoint.replaceAll("/+$", "");
        return base + "/" + bucket + "/" + key;
    }

    @Override
    public boolean exists(String bucket, String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (RuntimeException e) {
            log.warn("Không kiểm tra được sự tồn tại của file trên R2: bucket={} key={}", bucket, key, e);
            return false;
        }
    }

    @Override
    public long sizeOf(String bucket, String key) {
        try {
            HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
            return response.contentLength() == null ? -1L : response.contentLength();
        } catch (RuntimeException e) {
            return -1L;
        }
    }

    @Override
    public byte[] read(String bucket, String key) {
        try {
            return s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build()).asByteArray();
        } catch (RuntimeException e) {
            log.error("Không đọc được file trên R2: bucket={} key={}", bucket, key, e);
            throw new StorageException("Không đọc được file.", e);
        }
    }

    @Override
    public byte[] readHead(String bucket, String key, int length) {
        try {
            // Range request — chỉ tải N byte đầu, không tải cả file (tiết kiệm
            // egress R2 — mỗi request đều tính vào băng thông).
            byte[] content = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .range("bytes=0-" + Math.max(0, length - 1))
                    .build()).asByteArray();
            if (content.length <= length) {
                return content;
            }
            byte[] head = new byte[length];
            System.arraycopy(content, 0, head, 0, length);
            return head;
        } catch (RuntimeException e) {
            log.error("Không đọc được header file trên R2: bucket={} key={}", bucket, key, e);
            throw new StorageException("Không đọc được file.", e);
        }
    }
}
