package com.uniwork.service.impl;

import com.uniwork.dto.request.ConfirmUploadRequest;
import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.dto.response.PresignUploadResponse;
import com.uniwork.entity.FileUpload;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.FileStorageService;
import com.uniwork.storage.StorageBuckets;
import com.uniwork.storage.StorageProvider;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.FileSignatureValidator;
import com.uniwork.util.ImageResizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

/**
 * Nghiện vụ lưu trữ & phục vụ file upload.
 *
 * <p>Ở tầng này không biết chi tiết file nằm ở đâu — mọi thao tác đọc/ghi đi
 * qua {@link StorageProvider} (hiện là Cloudflare R2).
 *
 * <p>Quy trình upload trực tiếp (presigned):
 * <ol>
 *   <li>{@link #presign} — cấp URL có chữ ký + {@code storageKey}.</li>
 *   <li>Client {@code PUT} file lên R2.</li>
 *   <li>{@link #confirm} — kiểm tra file thực sự tồn tại (magic bytes + quota)
 *       rồi ghi metadata vào DB.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    /** Số byte đầu đủ để nhận diện mọi chữ ký file (RIFF/WEBP cần 12 byte). */
    private static final int SIGNATURE_LENGTH = 12;

    /** Số file tối đa mỗi loại trong 1 giai đoạn (loại file cũ sẽ bị thay thế). */
    private static final int MAX_FILES_PER_KIND = 10;

    /** Tổng dung lượng tối đa mỗi user (20 MB) — chống đầy bucket R2 free tier. */
    private static final long MAX_TOTAL_BYTES_PER_USER = 20L * 1024 * 1024;

    private final FileUploadRepository fileUploadRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final StorageProvider storageProvider;
    private final StorageBuckets storageBuckets;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Value("${app.storage.public-path:/api/v1/files}")
    private String publicPath;

    @Value("${app.storage.r2.presign-put-ttl-minutes:10}")
    private long presignPutTtlMinutes;

    @Value("${app.storage.r2.presign-get-ttl-minutes:5}")
    private long presignGetTtlMinutes;

    // ------------------------------------------------------------------
    // GHI — LUỒNG MULTIPART (CỔNG)
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public FileUploadResponse store(MultipartFile file, Kind kind, User owner) throws IOException {
        if (file == null || file.isEmpty()) {
            throw ApiErrors.badRequest("Vui lòng chọn file cần tải lên.");
        }

        byte[] content = file.getBytes();

        // Xác minh MIME type bằng magic bytes — KHÔNG tin Content-Type của client.
        String mimeType = verifySignature(content, kind);

        // Ảnh (avatar / logo) được resize + nén lại trước khi lưu.
        if (kind.isPublic()) {
            content = maybeResize(content, kind, mimeType);
            mimeType = detectImageMime(content);
        }

        validateSize(content.length, kind);
        enforceQuota(owner.getId(), kind, content.length);

        String originalName = sanitizeName(file.getOriginalFilename());
        String extension = FileSignatureValidator.extensionFor(mimeType);
        String storageKey = buildStorageKey(kind, owner.getId(), extension);
        String bucket = storageBuckets.forKind(kind.isPublic());

        storageProvider.put(bucket, storageKey, content, mimeType);

        FileUpload saved = fileUploadRepository.save(FileUpload.builder()
                .slug("file-" + UUID.randomUUID().toString().substring(0, 16))
                .ownerUserId(owner.getId())
                .kind(kind.name())
                .storageKey(storageKey)
                .bucket(bucket)
                .checksum(sha256(content))
                .originalName(originalName)
                .mimeType(mimeType)
                .sizeBytes((long) content.length)
                .createdAt(LocalDateTime.now())
                .build());

        return toResponse(saved);
    }

    // ------------------------------------------------------------------
    // GHI — LUỒNG PRESIGNED
    // ------------------------------------------------------------------

    @Override
    public PresignUploadResponse presign(Kind kind, User owner, String requestedContentType) {
        // MIME type client dự kiến gửi. Nếu không hợp lệ → dùng mime mặc định
        // của loại file. MIME type này được KÝ vào presigned URL nên client
        // buộc phải gửi đúng header khi PUT (sai là 403 SignatureDoesNotMatch).
        String mimeType = normalizeRequestedMime(kind, requestedContentType);

        String extension = FileSignatureValidator.extensionFor(mimeType);
        String storageKey = buildStorageKey(kind, owner.getId(), extension);
        String bucket = storageBuckets.forKind(kind.isPublic());

        Duration ttl = Duration.ofMinutes(Math.max(1, presignPutTtlMinutes));
        String uploadUrl = storageProvider.presignPut(bucket, storageKey, mimeType, ttl);

        return PresignUploadResponse.builder()
                .uploadUrl(uploadUrl)
                .storageKey(storageKey)
                .bucket(bucket)
                .contentType(mimeType)
                .expiresInSeconds((int) ttl.toSeconds())
                .maxSizeBytes(kind.getMaxSizeBytes())
                .publicUrl(kind.isPublic() ? storageProvider.publicUrl(bucket, storageKey) : null)
                .build();
    }

    /**
     * Chuẩn hoá MIME type client yêu cầu.
     *
     * @param kind    loại file
     * @param contentType MIME type do client gửi lên
     * @return MIME type hợp lệ (fallback về mime đầu tiên của loại file)
     */
    private String normalizeRequestedMime(Kind kind, String contentType) {
        String normalized = FileSignatureValidator.normalizeContentType(contentType);
        if (normalized != null && kind.getAllowedMimeTypes().contains(normalized)) {
            return normalized;
        }
        return kind.getAllowedMimeTypes().get(0);
    }

    @Override
    @Transactional
    public FileUploadResponse confirm(ConfirmUploadRequest request, User owner) {
        Kind kind;
        try {
            kind = Kind.valueOf(request.getKind().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiErrors.badRequest(
                    "Loại file không hợp lệ. Chỉ hỗ trợ: CV, AVATAR, LOGO.",
                    ApiErrors.errors("kind", "Loại file không hợp lệ."));
        }

        String storageKey = request.getStorageKey().trim();

        // Chặt chồng user: storageKey luôn có dạng {kind}/{ownerUserId}/{file}
        // → user không thể confirm file của người khác.
        String expectedPrefix = kind.name().toLowerCase(Locale.ROOT) + "/" + owner.getId() + "/";
        if (!storageKey.startsWith(expectedPrefix)) {
            throw ApiErrors.forbidden("Bạn không có quyền xác nhận file này.");
        }

        String bucket = storageBuckets.forKind(kind.isPublic());

        if (!storageProvider.exists(bucket, storageKey)) {
            throw ApiErrors.badRequest(
                    "Chưa tìm thấy file đã tải lên. Vui lòng thử lại.",
                    ApiErrors.errors("file", "File không tồn tại."));
        }

        long size = storageProvider.sizeOf(bucket, storageKey);
        if (size < 0) {
            size = storageProvider.read(bucket, storageKey).length;
        }
        if (size > kind.getMaxSizeBytes()) {
            throw ApiErrors.badRequest(
                    "Dung lượng " + kind.getLabel() + " vượt quá giới hạn "
                            + formatSize(kind.getMaxSizeBytes()) + " (file hiện tại " + formatSize(size) + ").",
                    ApiErrors.errors("file", "File quá lớn."));
        }

        // Xác minh lại magic bytes — client có thể đã khai báo sai Content-Type
        // hoặc tải lên file không đúng định dạng sau khi nhận presigned URL.
        byte[] head = storageProvider.readHead(bucket, storageKey, SIGNATURE_LENGTH);
        String detected = FileSignatureValidator.detectMimeType(head);
        if (detected == null || !kind.getAllowedMimeTypes().contains(detected)) {
            // Xoá file không hợp lệ để không giữ rác trong bucket.
            storageProvider.delete(bucket, storageKey);
            throw ApiErrors.badRequest(
                    "Định dạng file không hợp lệ cho " + kind.getLabel() + ". "
                            + "Chỉ chấp nhận: " + readableMimeTypes(kind) + ".",
                    ApiErrors.errors("file", "Định dạng file không được hỗ trợ."));
        }

        // Ảnh (avatar / logo): đọc về, resize + nén lại rồi ghi đè lại.
        // Nhờ vậy dung lượng & băng thông giảm mạnh dù client gửi ảnh gốc 2MB.
        if (kind.isPublic()) {
            byte[] original = storageProvider.read(bucket, storageKey);
            byte[] resized = resizeImage(original);
            if (resized != null && resized.length < original.length) {
                storageProvider.put(bucket, storageKey, resized, detectImageMime(resized));
                detected = detectImageMime(resized);
                size = resized.length;
            }
        }

        enforceQuota(owner.getId(), kind, size);

        String originalName = sanitizeName(request.getFileName());
        String checksum = checksumOf(storageProvider, bucket, storageKey);

        FileUpload saved = fileUploadRepository.save(FileUpload.builder()
                .slug("file-" + UUID.randomUUID().toString().substring(0, 16))
                .ownerUserId(owner.getId())
                .kind(kind.name())
                .storageKey(storageKey)
                .bucket(bucket)
                .checksum(checksum)
                .originalName(originalName)
                .mimeType(detected)
                .sizeBytes(size)
                .createdAt(LocalDateTime.now())
                .build());

        return toResponse(saved);
    }

    /** Tính SHA-256 của nội dung file (hex) — bỏ qua nếu tính không được. */
    private String checksumOf(StorageProvider provider, String bucket, String storageKey) {
        try {
            byte[] content = provider.read(bucket, storageKey);
            return sha256(content);
        } catch (Exception e) {
            log.warn("Không tính được checksum cho file bucket={} key={}", bucket, storageKey, e);
            return null;
        }
    }

    /** Tính SHA-256 của mảng byte (hex). */
    private String sha256(byte[] content) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256").digest(content);
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            log.warn("Không có sẵn thuật toán SHA-256: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Resize ảnh nếu là loại file ảnh (avatar / logo).
     *
     * @param content nội dung ảnh gốc
     * @return nội dung đã resize, hoặc {@code null} nếu không resize được
     */
    private byte[] resizeImage(byte[] content) {
        ImageResizer.Result result = ImageResizer.resize(content);
        return result == null ? null : result.content();
    }

    /**
     * Resize ảnh + trả về cả nội dung lẫn MIME type mới.
     *
     * @param content  nội dung ảnh gốc
     * @param kind     loại file
     * @param mimeType MIME type hiện tại
     * @return nội dung đã xử lý
     */
    private byte[] maybeResize(byte[] content, Kind kind, String mimeType) {
        if (!kind.isPublic() || !mimeType.startsWith("image/")) {
            return content;
        }
        byte[] resized = resizeImage(content);
        return resized == null ? content : resized;
    }

    /** MIME type của ảnh sau resize (dùng khi ghi đè file lên nơi lưu trữ). */
    private String detectImageMime(byte[] content) {
        String detected = FileSignatureValidator.detectMimeType(content);
        return detected != null && detected.startsWith("image/") ? detected : "image/png";
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

        // Xoá vật lý khỏi nơi lưu trữ (soft-delete trong DB để giữ lịch sử).
        storageProvider.delete(bucketOf(file), file.getStorageKey());

        return true;
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    /**
     * Xác minh MIME type bằng magic bytes.
     *
     * @param content nội dung file
     * @param kind    loại file kỳ vọng
     * @return MIME type thật của file
     */
    private String verifySignature(byte[] content, Kind kind) {
        String detected = FileSignatureValidator.detectMimeType(content);
        if (detected == null) {
            throw ApiErrors.badRequest(
                    "Không đọc được định dạng của file. Chỉ chấp nhận: " + readableMimeTypes(kind) + ".",
                    ApiErrors.errors("file", "Định dạng file không được hỗ trợ."));
        }
        if (!kind.getAllowedMimeTypes().contains(detected)) {
            throw ApiErrors.badRequest(
                    "Định dạng file không hợp lệ cho " + kind.getLabel() + ". "
                            + "Chỉ chấp nhận: " + readableMimeTypes(kind) + ".",
                    ApiErrors.errors("file", "Định dạng file không được hỗ trợ."));
        }
        return detected;
    }

    /** Kiểm tra dung lượng tối đa theo loại file. */
    private void validateSize(long sizeBytes, Kind kind) {
        long max = kind.getMaxSizeBytes();
        if (sizeBytes > max) {
            throw ApiErrors.badRequest(
                    "Dung lượng " + kind.getLabel() + " vượt quá giới hạn "
                            + formatSize(max) + " (file hiện tại " + formatSize(sizeBytes) + ").",
                    ApiErrors.errors("file", "File quá lớn."));
        }
    }

    /**
     * Kiểm tra quota theo user: số file mỗi loại + tổng dung lượng.
     *
     * @param ownerUserId id chủ file
     * @param kind        loại file đang upload
     * @param incomingSize dung lượng file mới (byte)
     */
    private void enforceQuota(Long ownerUserId, Kind kind, long incomingSize) {
        var existing = fileUploadRepository.findByOwnerUserIdAndKindAndDeletedAtIsNull(ownerUserId, kind.name());
        if (existing.size() >= MAX_FILES_PER_KIND) {
            throw ApiErrors.badRequest(
                    "Bạn đã tải lên tối đa " + MAX_FILES_PER_KIND + " " + kind.getLabel()
                            + ". Vui lòng xoá file cũ trước khi tải thêm.",
                    ApiErrors.errors("file", "Quá nhiều file."));
        }

        long total = 0;
        for (String otherKind : java.util.List.of(Kind.CV.name(), Kind.AVATAR.name(), Kind.LOGO.name())) {
            for (FileUpload file : fileUploadRepository
                    .findByOwnerUserIdAndKindAndDeletedAtIsNull(ownerUserId, otherKind)) {
                total += file.getSizeBytes() == null ? 0 : file.getSizeBytes();
            }
        }

        if (total + incomingSize > MAX_TOTAL_BYTES_PER_USER) {
            throw ApiErrors.badRequest(
                    "Tổng dung lượng file đã tải lên vượt quá giới hạn "
                            + formatSize(MAX_TOTAL_BYTES_PER_USER) + ".",
                    ApiErrors.errors("file", "Vượt quá dung lượng cho phép."));
        }
    }

    /**
     * Sinh khóa đối tượng: {@code {kind}/{ownerUserId}/{uuid}.{ext}}.
     *
     * <p>Chặt chồng user giúp backend xác minh chủ sở hữu chỉ bằng cách so
     * tiền tố — không cần tra cứu thêm.
     */
    private String buildStorageKey(Kind kind, Long ownerUserId, String extension) {
        return kind.name().toLowerCase(Locale.ROOT) + "/" + ownerUserId + "/"
                + UUID.randomUUID().toString().replace("-", "") + extension;
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

    /** Danh sách MIME type dễ đọc cho thông báo lỗi. */
    private String readableMimeTypes(Kind kind) {
        return String.join(", ", kind.getAllowedMimeTypes().stream()
                .map(Kind::labelOfMimeType)
                .toList());
    }

    private String formatSize(long bytes) {
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024.0 * 1024.0)) + " MB";
        }
        return (bytes / 1024.0) + " KB";
    }

    /**
     * URL công khai để tải file.
     *
     * <p>Giữ nguyên format cũ ({@code {base}/api/v1/files/{slug}}) để không phải
     * migrate dữ liệu — endpoint {@code GET /files/{id}} sẽ redirect tới nơi
     * lưu trữ thật (presigned GET hoặc CDN).
     */
    private FileUploadResponse toResponse(FileUpload file) {
        return FileUploadResponse.builder()
                .id(file.getSlug())
                .url(publicBaseUrl + publicPath + "/" + file.getSlug())
                .fileName(file.getOriginalName())
                .mimeType(file.getMimeType())
                .sizeBytes(file.getSizeBytes())
                .kind(file.getKind())
                .storageKey(file.getStorageKey())
                .bucket(file.getBucket())
                .build();
    }

    /** Bucket chứa file theo loại — dùng khi xoá file cũ (chưa có cột bucket). */
    private String bucketOf(FileUpload file) {
        if (file.getBucket() != null) {
            return file.getBucket();
        }
        return storageBuckets.forKind(!"CV".equals(file.getKind()));
    }
}
