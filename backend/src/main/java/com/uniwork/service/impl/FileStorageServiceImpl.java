package com.uniwork.service.impl;

import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.entity.FileUpload;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.FileStorageService;
import com.uniwork.util.ApiErrors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

/**
 * Triển khai lưu trữ file trên disk.
 *
 * <p>Thư mục lưu trữ cấu hình qua {@code app.storage.upload-dir}. Mỗi file
 * được lưu với tên ngẫu nhiên trong thư mục con theo {@code kind} để tránh
 * va chạm tên; extension gốc được giữ lại để trình duyệt xử lý đúng.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    private final FileUploadRepository fileUploadRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    @Value("${app.storage.upload-dir:./data/uploads}")
    private String uploadDir;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Value("${app.storage.public-path:/api/v1/files}")
    private String publicPath;

    // ------------------------------------------------------------------
    // GHI
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public FileUploadResponse store(MultipartFile file, Kind kind, User owner) throws IOException {
        if (file == null || file.isEmpty()) {
            throw ApiErrors.badRequest("Vui lòng chọn file cần tải lên.");
        }

        String mimeType = resolveMimeType(file);
        validateMimeType(mimeType, kind);
        validateSize(file.getSize(), kind);

        String originalName = sanitizeName(file.getOriginalFilename());
        String extension = extractExtension(originalName);

        Path root = resolveRoot();
        Path kindDir = root.resolve(kind.name().toLowerCase(Locale.ROOT));
        Files.createDirectories(kindDir);

        String storageKey = kind.name().toLowerCase(Locale.ROOT) + "-"
                + UUID.randomUUID().toString().replace("-", "")
                + extension;

        Path target = kindDir.resolve(storageKey).normalize();
        // Chặn path traversal: đường dẫn sau khi normalize phải nằm trong thư mục gốc.
        if (!target.startsWith(root)) {
            throw ApiErrors.badRequest("Tên file không hợp lệ.");
        }

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Không lưu được file lên disk: {}", target, e);
            throw ApiErrors.badRequest("Không lưu được file. Vui lòng thử lại.");
        }

        FileUpload saved = fileUploadRepository.save(FileUpload.builder()
                .slug("file-" + UUID.randomUUID().toString().substring(0, 16))
                .ownerUserId(owner.getId())
                .kind(kind.name())
                .storageKey(storageKey)
                .originalName(originalName)
                .mimeType(mimeType)
                .sizeBytes(file.getSize())
                .createdAt(LocalDateTime.now())
                .build());

        return toResponse(saved);
    }

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public FileUploadResponse findByPublicId(String publicId) {
        FileUpload file = fileUploadRepository.findBySlugAndDeletedAtIsNull(publicId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy file."));

        return toResponse(file);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canRead(FileUploadResponse file, Long userId) {
        // Avatar & logo là ảnh hiển thị công khai (danh sách tin, tin tuyển dụng…)
        if (!"CV".equals(file.getKind())) {
            return true;
        }

        if (userId == null) {
            return false;
        }

        // Chủ sở hữu
        FileUpload entity = fileUploadRepository.findBySlugAndDeletedAtIsNull(file.getId()).orElse(null);
        if (entity != null && entity.getOwnerUserId().equals(userId)) {
            return true;
        }

        // Quản trị viên
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getRole() == null) {
            return false;
        }
        if ("ADMIN".equals(user.getRole().getCode())) {
            return true;
        }

        // Nhà tuyển dụng đã nhận đơn ứng tuyển từ sinh viên sở hữu CV này
        if ("EMPLOYER".equals(user.getRole().getCode())) {
            return applicationRepository
                    .existsByJobPostEmployerUserIdAndStudentUserId(userId, entity.getOwnerUserId());
        }

        return false;
    }

    @Override
    public Path resolvePath(FileUploadResponse file) {
        Path root = resolveRoot();
        // File được lưu trong thư mục con theo kind: <root>/<kind>/<storageKey>
        Path target = root.resolve(file.getKind().toLowerCase(Locale.ROOT))
                .resolve(file.getStorageKey())
                .normalize();
        // Chặn path traversal: đường dẫn sau khi normalize phải nằm trong thư mục gốc.
        if (!target.startsWith(root)) {
            throw ApiErrors.notFound("Không tìm thấy file.");
        }
        return target;
    }

    // ------------------------------------------------------------------
    // XOÁ
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public boolean remove(String publicId, User owner) {
        FileUpload file = fileUploadRepository.findBySlugAndDeletedAtIsNull(publicId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy file."));

        if (!file.getOwnerUserId().equals(owner.getId())) {
            throw ApiErrors.forbidden("Bạn không có quyền xoá file này.");
        }

        file.setDeletedAt(LocalDateTime.now());
        fileUploadRepository.save(file);
        return true;
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private Path resolveRoot() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Xác định mime type: ưu tiên header do client gửi, nhưng phải nằm trong
     * whitelist — nếu không thì suy ra từ extension.
     */
    private String resolveMimeType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            String normalized = contentType.toLowerCase(Locale.ROOT).trim();
            // Bỏ charset nếu có (ví dụ "text/plain;charset=UTF-8")
            int semicolon = normalized.indexOf(';');
            if (semicolon > 0) {
                normalized = normalized.substring(0, semicolon).trim();
            }
            if (!normalized.isEmpty() && !"application/octet-stream".equals(normalized)) {
                return normalized;
            }
        }
        return guessMimeFromExtension(extractExtension(file.getOriginalFilename()));
    }

    private void validateMimeType(String mimeType, Kind kind) {
        if (!kind.getAllowedMimeTypes().contains(mimeType)) {
            throw ApiErrors.badRequest(
                    "Định dạng file không hợp lệ cho " + kind.getLabel() + ". "
                            + "Chỉ chấp nhận: " + String.join(", ", kind.getAllowedMimeTypes()) + ".",
                    ApiErrors.errors("file", "Định dạng file không được hỗ trợ."));
        }
    }

    private void validateSize(long sizeBytes, Kind kind) {
        long max = kind.getMaxSizeBytes();
        if (sizeBytes > max) {
            throw ApiErrors.badRequest(
                    "Dung lượng " + kind.getLabel() + " vượt quá giới hạn "
                            + formatSize(max) + " (file hiện tại " + formatSize(sizeBytes) + ").",
                    ApiErrors.errors("file", "File quá lớn."));
        }
    }

    /** Bỏ ký tự lạ khỏi tên file gốc, giới hạn độ dài. */
    private String sanitizeName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "file";
        }
        // Chỉ giữ lại tên file, bỏ mọi dấu "/" hoặc "\" (chống path traversal)
        String name = originalName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        name = name.replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty()) {
            return "file";
        }
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    /** Lấy extension (kèm dấu chấm) từ tên file, chỉ giữ ký tự chữ/số an toàn. */
    private String extractExtension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!ext.matches("[a-z0-9]{1,10}")) {
            return "";
        }
        return "." + ext;
    }

    private String guessMimeFromExtension(String extension) {
        return switch (extension) {
            case ".pdf" -> "application/pdf";
            case ".doc" -> "application/msword";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".png" -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    private String formatSize(long bytes) {
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024.0 * 1024.0)) + " MB";
        }
        return (bytes / 1024.0) + " KB";
    }

    private FileUploadResponse toResponse(FileUpload file) {
        return FileUploadResponse.builder()
                .id(file.getSlug())
                .url(publicBaseUrl + publicPath + "/" + file.getSlug())
                .fileName(file.getOriginalName())
                .mimeType(file.getMimeType())
                .sizeBytes(file.getSizeBytes())
                .kind(file.getKind())
                .storageKey(file.getStorageKey())
                .build();
    }
}
