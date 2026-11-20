package com.uniwork.storage;

import java.time.Duration;

/**
 * Lớp trừu tượng cho nơi lưu trữ file nhị phân.
 *
 * <p>Ứng dụng có 2 nhu cầu lưu trữ khác nhau nên tách theo tầng:
 * <ul>
 *   <li>Ảnh công khai (avatar, logo) — cần URL ổn định để nhúng {@code <img src>}.</li>
 *   <li>CV — tài nguyên riêng tư, không được lộ link tĩnh, tải qua URL có hạn.</li>
 * </ul>
 *
 * <p>Triển khai hiện có: {@link R2StorageProvider} — Cloudflare R2
 * (S3-compatible).
 *
 * <p>Upload đi qua luồng presigned: backend cấp URL có chữ ký, client
 * {@code PUT} thẳng lên R2 → backend không bao giờ nhận nội dung file.
 */
public interface StorageProvider {

    /**
     * Ghi 1 đối tượng vào nơi lưu trữ.
     *
     * @param bucket      tên bucket (bucket public hay private theo loại file)
     * @param key         khóa đối tượng, dạng {@code cv/12/uuid.pdf}
     * @param content     nội dung file
     * @param contentType MIME type đã được xác minh
     */
    void put(String bucket, String key, byte[] content, String contentType);

    /** Xoá đối tượng khỏi nơi lưu trữ (không ném lỗi nếu không tồn tại). */
    void delete(String bucket, String key);

    /**
     * Tạo URL có chữ ký để tải đối tượng trong thời hạn.
     *
     * @param bucket bucket chứa đối tượng
     * @param key    khóa đối tượng
     * @param ttl    thời hạn hiệu lực
     * @return URL tải file (bearer token — ai có URL đều dùng được trong TTL)
     */
    String presignGet(String bucket, String key, Duration ttl);

    /**
     * Tạo URL có chữ ký để tải lên đối tượng trong thời hạn.
     *
     * <p>Client <b>bắt buộc</b> gửi đúng {@code Content-Type} đã ký, nếu không
     * R2 sẽ trả {@code 403 SignatureDoesNotMatch}.
     *
     * @param bucket      bucket đích
     * @param key         khóa đối tượng đích
     * @param contentType MIME type sẽ ký vào URL
     * @param ttl         thời hạn hiệu lực
     * @return URL upload
     */
    String presignPut(String bucket, String key, String contentType, Duration ttl);

    /**
     * URL công khai (không cần chữ ký) để đọc đối tượng.
     *
     * @return URL công khai, hoặc {@code null} nếu bucket này không public
     */
    String publicUrl(String bucket, String key);

    /**
     * Kiểm tra đối tượng có tồn tại không.
     *
     * @return {@code true} nếu tồn tại
     */
    boolean exists(String bucket, String key);

    /**
     * Lấy dung lượng (byte) của đối tượng.
     *
     * @return dung lượng, hoặc {@code -1} nếu không xác định được
     */
    long sizeOf(String bucket, String key);

    /**
     * Đọc toàn bộ nội dung đối tượng.
     *
     * <p>Dùng cho: resize ảnh server-side, kiểm tra magic bytes sau khi
     * client upload trực tiếp qua presigned URL.
     *
     * @param bucket bucket chứa đối tượng
     * @param key    khóa đối tượng
     * @return nội dung file
     */
    byte[] read(String bucket, String key);

    /**
     * Đọc N byte đầu tiên của đối tượng — dùng để kiểm tra magic bytes
     * mà không tải cả file.
     *
     * @param bucket bucket chứa đối tượng
     * @param key    khóa đối tượng
     * @param length số byte cần đọc
     * @return mảng byte đầu file (có thể ngắn hơn {@code length} nếu file nhỏ hơn)
     */
    byte[] readHead(String bucket, String key, int length);
}
