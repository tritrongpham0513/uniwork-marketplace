package com.uniwork.service;

import com.uniwork.dto.request.ConfirmUploadRequest;
import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.dto.response.PresignUploadResponse;
import com.uniwork.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Nghiệp vụ lưu trữ & phục vụ file upload.
 *
 * <p>Các quy tắc được áp dụng:
 * <ul>
 *   <li>Chỉ nhận mime type thuộc whitelist (PDF, DOCX, ảnh).</li>
 *   <li>Giới hạn dung lượng riêng cho CV (5MB) và ảnh (2MB).</li>
 *   <li>Khóa đối tượng có dạng {@code {kind}/{ownerUserId}/{uuid}.{ext}} —
 *       chặt chồng user, không ai đoán được key của người khác.</li>
 *   <li>MIME type được xác minh bằng magic bytes, không tin header của client.</li>
 * </ul>
 *
 * <p>Hai luồng upload được hỗ trợ:
 * <ol>
 *   <li><b>Presigned (chính)</b> — {@link #presign} + {@link #confirm}. Client
 *       PUT thẳng lên Cloudflare R2, backend không nhận nội dung file.</li>
 *   <li><b>Cổng (multipart)</b> — {@link #store(MultipartFile, Kind, User)}.
 *       Dùng khi client cũ không hỗ trợ presigned.</li>
 * </ol>
 */
public interface FileStorageService {

    /**
     * File đã được xác thực quyền đọc, kèm bucket thật chứa object.
     *
     * @param file       metadata trả cho client
     * @param bucket     bucket đã chuẩn hoá (map cả dữ liệu cũ "public"/"private")
     * @param storageKey khóa object trong bucket
     */
    record ResolvedFile(FileUploadResponse file, String bucket, String storageKey) {
    }

    /** Loại file — quyết định quy tắc truy cập & giới hạn dung lượng. */
    enum Kind {

        /** CV của sinh viên — riêng tư, chỉ chủ sở hữu xem được. */
        CV(List.of(
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                5L * 1024 * 1024),

        /** Ảnh đại diện — công khai. */
        AVATAR(List.of("image/png", "image/jpeg", "image/webp"), 2L * 1024 * 1024),

        /** Logo tổ chức — công khai. */
        LOGO(List.of("image/png", "image/jpeg", "image/webp"), 2L * 1024 * 1024);

        private final List<String> allowedMimeTypes;
        private final long maxSizeBytes;

        Kind(List<String> allowedMimeTypes, long maxSizeBytes) {
            this.allowedMimeTypes = allowedMimeTypes;
            this.maxSizeBytes = maxSizeBytes;
        }

        public List<String> getAllowedMimeTypes() {
            return allowedMimeTypes;
        }

        public long getMaxSizeBytes() {
            return maxSizeBytes;
        }

        /** Ảnh công khai (avatar / logo) hay tài nguyên riêng tư (CV)? */
        public boolean isPublic() {
            return this != CV;
        }

        /** Tên hiển thị lỗi thân thiện cho người dùng. */
        public String getLabel() {
            return switch (this) {
                case CV -> "CV";
                case AVATAR -> "ảnh đại diện";
                case LOGO -> "logo";
            };
        }

        /** Nhãn tiếng Việt cho MIME type — dùng trong thông báo lỗi. */
        public static String labelOfMimeType(String mimeType) {
            if (mimeType == null) {
                return "không xác định";
            }
            return switch (mimeType) {
                case "application/pdf" -> "PDF";
                case "application/msword" -> "DOC";
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "DOCX";
                case "image/png" -> "PNG";
                case "image/jpeg" -> "JPG/JPEG";
                case "image/webp" -> "WEBP";
                default -> mimeType;
            };
        }
    }

    /**
     * Lưu file lên nơi lưu trữ và ghi metadata vào DB.
     *
     * @param file  file multipart do client gửi lên
     * @param kind  mục đích sử dụng của file
     * @param owner chủ sở hữu file (người đang đăng nhập)
     */
    FileUploadResponse store(MultipartFile file, Kind kind, User owner) throws IOException;

    /**
     * Cấp URL upload trực tiếp (presigned PUT) — client tự PUT file lên nơi
     * lưu trữ, backend không nhận nội dung file.
     *
     * @param kind             loại file
     * @param owner            chủ sở hữu file
     * @param requestedContentType MIME type client dự kiến gửi (có thể null)
     * @return thông tin URL upload
     */
    PresignUploadResponse presign(Kind kind, User owner, String requestedContentType);

    /**
     * Xác nhận file đã upload và ghi metadata vào DB.
     *
     * @param request thông tin file (storageKey, kind, tên file)
     * @param owner   chủ sở hữu file
     */
    FileUploadResponse confirm(ConfirmUploadRequest request, User owner);

    /** Lấy metadata file theo public id (slug) — chỉ trả file chưa bị xoá. */
    FileUploadResponse findByPublicId(String publicId);

    /**
     * Xác thực quyền đọc và trả về vị trí object thật.
     *
     * @param publicId slug file
     * @param userId   id người đang đăng nhập, {@code null} nếu khách
     * @throws com.uniwork.exception.AppException 404 nếu không tồn tại, 403 nếu không đủ quyền
     */
    ResolvedFile resolveForRead(String publicId, Long userId);

    /**
     * Tên file gốc của một file nội bộ (dùng khi tạo đơn ứng tuyển chỉ có URL).
     *
     * @param fileUrl URL {@code /api/v1/files/{slug}}
     * @return tên file gốc, hoặc {@code null} nếu URL không phải file của hệ thống
     */
    String resolveOriginalFileName(String fileUrl);

    /**
     * MIME type thật của một file nội bộ (đã xác minh bằng magic bytes lúc upload).
     *
     * <p>Frontend cần biết CV là PDF hay DOC/DOCX để quyết định render nội dung
     * trực tiếp hay chỉ cho tải xuống — không nên suy đoán từ phần mở rộng tên
     * file vì tên file người dùng đặt không đáng tin.
     *
     * @param fileUrl URL {@code /api/v1/files/{slug}}
     * @return MIME type, hoặc {@code null} nếu URL không phải file của hệ thống
     */
    String resolveMimeType(String fileUrl);

    /**
     * Kiểm tra quyền đọc file.
     *
     * <p>Quy tắc:
     * <ul>
     *   <li>{@code AVATAR} / {@code LOGO}: công khai — ai cũng xem được.</li>
     *   <li>{@code CV}: chỉ chủ sở hữu, quản trị viên, hoặc nhà tuyển dụng
     *       đã nhận được đơn ứng tuyển từ sinh viên đó.</li>
     * </ul>
     *
     * @param userId id người đang đăng nhập, {@code null} nếu khách (chưa đăng nhập)
     */
    boolean canRead(FileUploadResponse file, Long userId);

    /**
     * Xoá mềm file (chỉ chủ sở hữu được xoá).
     *
     * @return {@code true} nếu xoá thành công
     */
    boolean remove(String publicId, User owner);
}
