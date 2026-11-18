package com.uniwork.service;

import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * Nghiện vụ lưu trữ & phục vụ file upload.
 *
 * <p>Các quy tắc được áp dụng:
 * <ul>
 *   <li>Chỉ nhận mime type thuộc whitelist (PDF, DOCX, ảnh).</li>
 *   <li>Giới hạn dung lượng riêng cho CV (5MB) và ảnh (2MB).</li>
 *   <li>Tên file lưu trên disk là chuỗi ngẫu nhiên, giữ nguyên extension gốc,
 *       không chứa ký tự đường dẫn (chặn path traversal).</li>
 * </ul>
 */
public interface FileStorageService {

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

        /** Tên hiển thị lỗi thân thiện cho người dùng. */
        public String getLabel() {
            return switch (this) {
                case CV -> "CV";
                case AVATAR -> "ảnh đại diện";
                case LOGO -> "logo";
            };
        }
    }

    /**
     * Lưu file lên disk và ghi metadata vào DB.
     *
     * @param file  file multipart do client gửi lên
     * @param kind  mục đích sử dụng của file
     * @param owner chủ sở hữu file (người đang đăng nhập)
     */
    FileUploadResponse store(MultipartFile file, Kind kind, User owner) throws IOException;

    /** Lấy metadata file theo public id (slug) — chỉ trả file chưa bị xoá. */
    FileUploadResponse findByPublicId(String publicId);

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

    /** Đường dẫn tuyệt đối trên disk của file (dùng để stream nội dung). */
    Path resolvePath(FileUploadResponse file);
}
