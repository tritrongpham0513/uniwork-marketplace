package com.uniwork.service.impl;

import com.uniwork.dto.request.ConfirmUploadRequest;
import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.dto.response.PresignUploadResponse;
import com.uniwork.entity.FileUpload;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.FileStorageService;
import com.uniwork.storage.StorageBuckets;
import com.uniwork.storage.StorageProvider;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.FileSignatureValidator;
import com.uniwork.util.FileUrlValidator;
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
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Nghiệp vụ lưu trữ & phục vụ file upload (CV / ảnh đại diện / logo).
 *
 * <p>Quy ước của tầng này:
 * <ul>
 *   <li><b>URL trả về luôn tương đối</b> — {@code /api/v1/files/{slug}}. App và
 *       API cùng origin (nginx / Vite proxy) nên URL không phụ thuộc domain;
 *       cùng một DB chạy đúng ở dev, prod và môi trường deploy thật.</li>
 *   <li>Object nằm sau {@link StorageProvider} (Cloudflare R2). Bucket đọc từ DB
 *       được chuẩn hoá qua {@link StorageBuckets#resolve} để tương thích dữ
 *       liệu cũ từng lưu literal {@code "public"} / {@code "private"}.</li>
 *   <li>Mọi nhánh thất bại của {@code confirm} đều xoá object vừa PUT để không
 *       để rác trong bucket.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    /** Số byte đầu đủ để nhận diện mọi chữ ký file (RIFF/WEBP cần 12 byte). */
    private static final int SIGNATURE_LENGTH = 12;

    /**
     * Tổng dung lượng tối đa mỗi user (20 MB) — bảo vệ free tier của R2.
     *
     * <p>Không giới hạn số lượng file: hồ sơ chỉ cần 1 CV hiện hành, mỗi lần
     * thay CV là 1 file vào 1 file ra nên giới hạn đếm file chỉ gây kẹt người
     * dùng (file cũ bị giữ lại cho đơn ứng tuyển cũ vẫn chiếm slot).
     */
    private static final long MAX_TOTAL_BYTES_PER_USER = 20L * 1024 * 1024;

    /**
     * Chặn tuyệt đối dung lượng file client PUT trực tiếp.
     *
     * <p>Presigned PUT không giới hạn được Content-Length, nên phải kiểm tra
     * sau khi upload. Giới hạn này cũng bảo vệ RAM backend lúc đọc file để
     * resize / kiểm tra magic bytes (khớp {@code spring.servlet.multipart}).
     */
    private static final long MAX_RAW_UPLOAD_BYTES = 12L * 1024 * 1024;

    /** storageKey do backend sinh: {@code {kind}/{userId}/{32 hex}.{ext}}. */
    private static final Pattern STORAGE_KEY_PATTERN =
            Pattern.compile("^[a-z]+/[0-9]+/[a-f0-9]{32}\\.[a-z0-9]{2,5}$");

    private final FileUploadRepository fileUploadRepository;
    private final ApplicationRepository applicationRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final StorageProvider storageProvider;
    private final StorageBuckets storageBuckets;

    @Value("${app.storage.public-path:/api/v1/files}")
    private String publicPath;

    @Value("${app.storage.r2.presign-put-ttl-minutes:10}")
    private long presignPutTtlMinutes;

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
        if (content.length > MAX_RAW_UPLOAD_BYTES) {
            throw ApiErrors.badRequest(
                    "File vượt quá dung lượng cho phép (" + formatSize(MAX_RAW_UPLOAD_BYTES) + ").",
                    ApiErrors.errors("file", "File quá lớn."));
        }

        // Xác minh MIME type bằng magic bytes — KHÔNG tin Content-Type của client.
        String mimeType = verifySignature(content, kind);

        // Ảnh (avatar / logo) được resize + nén lại trước khi kiểm tra dung lượng.
        if (kind.isPublic()) {
            content = maybeResize(content, kind, mimeType);
            mimeType = detectImageMime(content);
        }

        validateSize(content.length, kind);
        enforceQuota(owner.getId(), content.length);

        String originalName = sanitizeName(file.getOriginalFilename());
        String extension = FileSignatureValidator.extensionFor(mimeType);
        String storageKey = buildStorageKey(kind, owner.getId(), extension);
        String bucket = storageBuckets.forKind(kind.isPublic());

        storageProvider.put(bucket, storageKey, content, mimeType);

        try {
            FileUpload saved = fileUploadRepository.save(FileUpload.builder()
                    .slug(newSlug())
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
        } catch (RuntimeException e) {
            // Ghi DB thất bại → xoá object vừa PUT để không để rác trong bucket.
            storageProvider.delete(bucket, storageKey);
            throw e;
        }
    }

    // ------------------------------------------------------------------
    // GHI — LUỒNG PRESIGNED
    // ------------------------------------------------------------------

    @Override
    public PresignUploadResponse presign(Kind kind, User owner, String requestedContentType) {
        // Chặn sớm khi user đã đầy quota dung lượng — tránh bắt client upload
        // rồi mới báo lỗi.
        enforceQuota(owner.getId(), 0);

        // MIME type này được KÝ vào presigned URL nên client buộc phải gửi đúng
        // header khi PUT (sai là 403 SignatureDoesNotMatch).
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
     * Xác nhận file client đã PUT trực tiếp lên nơi lưu trữ.
     *
     * <p>Idempotent theo {@code (owner, storageKey)}: client retry sau lỗi mạng
     * không tạo thêm bản ghi trùng.
     */
    @Override
    @Transactional
    public FileUploadResponse confirm(ConfirmUploadRequest request, User owner) {
        Kind kind = parseKind(request.getKind());
        String storageKey = request.getStorageKey().trim();

        var existing = fileUploadRepository
                .findByOwnerUserIdAndStorageKeyAndDeletedAtIsNull(owner.getId(), storageKey);
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        // Chặt chồng user: storageKey luôn có dạng {kind}/{ownerUserId}/{uuid}.{ext}.
        assertOwnedStorageKey(kind, owner.getId(), storageKey);

        String bucket = storageBuckets.forKind(kind.isPublic());
        boolean registered = false;
        try {
            if (!storageProvider.exists(bucket, storageKey)) {
                throw ApiErrors.badRequest(
                        "Chưa tìm thấy file đã tải lên. Vui lòng thử lại.",
                        ApiErrors.errors("file", "File không tồn tại."));
            }

            long rawSize = storageProvider.sizeOf(bucket, storageKey);
            if (rawSize < 0) {
                rawSize = storageProvider.read(bucket, storageKey).length;
            }
            if (rawSize > MAX_RAW_UPLOAD_BYTES) {
                throw ApiErrors.badRequest(
                        "File vượt quá dung lượng cho phép (" + formatSize(MAX_RAW_UPLOAD_BYTES) + ").",
                        ApiErrors.errors("file", "File quá lớn."));
            }

            // Xác minh lại magic bytes — client có thể đã khai báo sai Content-Type
            // hoặc tải lên file không đúng định dạng sau khi nhận presigned URL.
            byte[] head = storageProvider.readHead(bucket, storageKey, SIGNATURE_LENGTH);
            String detected = FileSignatureValidator.detectMimeType(head);
            if (detected == null || !kind.getAllowedMimeTypes().contains(detected)) {
                throw ApiErrors.badRequest(
                        "Định dạng file không hợp lệ cho " + kind.getLabel() + ". "
                                + "Chỉ chấp nhận: " + readableMimeTypes(kind) + ".",
                        ApiErrors.errors("file", "Định dạng file không được hỗ trợ."));
            }

            long finalSize = rawSize;
            String finalMime = detected;

            // Ảnh (avatar / logo): đọc về, resize + nén lại rồi ghi đè.
            if (kind.isPublic()) {
                byte[] original = storageProvider.read(bucket, storageKey);
                byte[] resized = resizeImage(original);
                if (resized != null && resized.length < original.length) {
                    finalMime = detectImageMime(resized);

                    // Resize có thể đổi định dạng (PNG không alpha -> JPEG). Đổi
                    // luôn phần mở rộng của storageKey để URL CDN không nói dối
                    // về định dạng thật của object.
                    String adjustedKey = withExtension(
                            storageKey, FileSignatureValidator.extensionFor(finalMime));
                    if (!adjustedKey.equals(storageKey)) {
                        storageProvider.put(bucket, adjustedKey, resized, finalMime);
                        storageProvider.delete(bucket, storageKey);
                        storageKey = adjustedKey;
                    } else {
                        storageProvider.put(bucket, storageKey, resized, finalMime);
                    }
                    finalSize = resized.length;
                }
            }

            validateSize(finalSize, kind);
            enforceQuota(owner.getId(), finalSize);

            FileUpload saved = fileUploadRepository.save(FileUpload.builder()
                    .slug(newSlug())
                    .ownerUserId(owner.getId())
                    .kind(kind.name())
                    .storageKey(storageKey)
                    .bucket(bucket)
                    .checksum(checksumOf(storageProvider, bucket, storageKey))
                    .originalName(sanitizeName(request.getFileName()))
                    .mimeType(finalMime)
                    .sizeBytes(finalSize)
                    .createdAt(LocalDateTime.now())
                    .build());

            registered = true;
            return toResponse(saved);
        } finally {
            if (!registered) {
                // Mọi nhánh thất bại đều dọn object vừa upload để không để rác
                // trong bucket (presigned PUT không giới hạn dung lượng).
                storageProvider.delete(bucket, storageKey);
            }
        }
    }

    /**
     * Chuẩn hoá MIME type client yêu cầu.
     *
     * @param kind        loại file
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

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public FileUploadResponse findByPublicId(String publicId) {
        return toResponse(requireFile(publicId));
    }

    @Override
    @Transactional(readOnly = true)
    public ResolvedFile resolveForRead(String publicId, Long userId) {
        FileUpload file = requireReadableFile(publicId);
        if (!canRead(file, userId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem file này.");
        }
        boolean isPublic = !Kind.CV.name().equals(file.getKind());
        String bucket = storageBuckets.resolve(file.getBucket(), isPublic);
        return new ResolvedFile(toResponse(file), bucket, file.getStorageKey());
    }

    @Override
    @Transactional(readOnly = true)
    public String resolveOriginalFileName(String fileUrl) {
        String slug = FileUrlValidator.slugOf(fileUrl);
        if (slug == null) {
            return null;
        }
        return fileUploadRepository.findReadableBySlug(slug)
                .map(FileUpload::getOriginalName)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public String resolveMimeType(String fileUrl) {
        String slug = FileUrlValidator.slugOf(fileUrl);
        if (slug == null) {
            return null;
        }
        return fileUploadRepository.findReadableBySlug(slug)
                .map(FileUpload::getMimeType)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canRead(FileUploadResponse file, Long userId) {
        return fileUploadRepository.findReadableBySlug(file.getId())
                .map(entity -> canRead(entity, userId))
                .orElse(false);
    }

    /**
     * Quy tắc đọc file.
     *
     * <ul>
     *   <li>Avatar / logo: công khai.</li>
     *   <li>CV đang sống: chủ sở hữu, quản trị viên, hoặc nhà tuyển dụng đã từng
     *       nhận đơn ứng tuyển của sinh viên đó.</li>
     *   <li>CV đã gỡ khỏi hồ sơ nhưng còn giữ blob: chỉ chủ sở hữu, quản trị
     *       viên, và nhà tuyển dụng đang giữ <b>đúng CV này</b> trong đơn ứng
     *       tuyển — không phải mọi NTD từng nhận đơn của sinh viên đó.</li>
     * </ul>
     */
    private boolean canRead(FileUpload file, Long userId) {
        if (!Kind.CV.name().equals(file.getKind())) {
            return true;
        }
        if (userId == null) {
            return false;
        }
        if (file.getOwnerUserId().equals(userId)) {
            return true;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getRole() == null) {
            return false;
        }
        if ("ADMIN".equals(user.getRole().getCode())) {
            return true;
        }
        if ("EMPLOYER".equals(user.getRole().getCode())) {
            if (!isBlobKept(file)) {
                return applicationRepository
                        .existsByJobPostEmployerUserIdAndStudentUserId(userId, file.getOwnerUserId());
            }
            // CV đã bị gỡ khỏi hồ sơ → chỉ NTD đang giữ đúng CV này được xem.
            return applicationRepository.findEmployerUserIdsByCvUrl(fileUrl(file.getSlug()))
                    .contains(userId);
        }
        return false;
    }

    /** File đã xoá mềm nhưng còn giữ blob trên nơi lưu trữ? */
    private boolean isBlobKept(FileUpload file) {
        return file.getDeletedAt() != null && Boolean.TRUE.equals(file.getBlobKept());
    }

    // ------------------------------------------------------------------
    // XOÁ
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public boolean remove(String publicId, User owner) {
        FileUpload file = requireRemovableFile(publicId);
        if (!file.getOwnerUserId().equals(owner.getId())) {
            throw ApiErrors.forbidden("Bạn không có quyền xoá file này.");
        }

        String url = fileUrl(file.getSlug());

        // Ảnh đại diện đang hiển thị trong đánh giá là nội dung người khác viết
        // -> xoá sẽ làm hỏng đánh giá nên vẫn chặn.
        if (Kind.AVATAR.name().equals(file.getKind()) && reviewRepository.existsByFromAvatarUrl(url)) {
            throw ApiErrors.conflict(
                    "Ảnh đại diện này đang được hiển thị trong đánh giá nên không thể xoá.", "FILE_IN_USE");
        }

        // CV còn bị đơn ứng tuyển trỏ tới → cho gỡ khỏi hồ sơ nhưng GIỮ blob,
        // để nhà tuyển dụng vẫn xem được CV đúng như lúc sinh viên nộp.
        boolean keepBlob = Kind.CV.name().equals(file.getKind())
                && applicationRepository.existsByCvUrl(url);

        file.setDeletedAt(LocalDateTime.now());
        file.setBlobKept(keepBlob);
        fileUploadRepository.save(file);

        if (!keepBlob) {
            boolean isPublic = !Kind.CV.name().equals(file.getKind());
            storageProvider.delete(storageBuckets.resolve(file.getBucket(), isPublic), file.getStorageKey());
        }
        return true;
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private FileUpload requireFile(String publicId) {
        return fileUploadRepository.findBySlugAndDeletedAtIsNull(publicId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy file."));
    }

    /**
     * File có thể xoá — gồm cả file đã xoá mềm nhưng còn giữ blob.
     *
     * <p>Cho phép xoá lại CV đang giữ blob: khi đơn ứng tuyển không còn trỏ
     * tới nó nữa thì blob phải được dọn đi, nếu không file sẽ sống mãi trên
     * nơi lưu trữ mà không ai dọn được.
     */
    private FileUpload requireRemovableFile(String publicId) {
        FileUpload file = fileUploadRepository.findReadableBySlug(publicId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy file."));
        if (file.getDeletedAt() != null && !isBlobKept(file)) {
            throw ApiErrors.notFound("Không tìm thấy file.");
        }
        return file;
    }

    /**
     * File còn đọc được — kể cả file đã xoá mềm nhưng còn giữ blob.
     *
     * <p>Áp dụng cho CV còn bị đơn ứng tuyển trỏ tới: nhà tuyển dụng vẫn xem
     * được CV đúng như lúc sinh viên nộp, dù SV đã gỡ CV khỏi hồ sơ.
     */
    private FileUpload requireReadableFile(String publicId) {
        return fileUploadRepository.findReadableBySlug(publicId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy file."));
    }

    private Kind parseKind(String kind) {
        try {
            return Kind.valueOf(kind.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiErrors.badRequest(
                    "Loại file không hợp lệ. Chỉ hỗ trợ: CV, AVATAR, LOGO.",
                    ApiErrors.errors("kind", "Loại file không hợp lệ."));
        }
    }

    private void assertOwnedStorageKey(Kind kind, Long ownerId, String storageKey) {
        String prefix = kind.name().toLowerCase(Locale.ROOT) + "/" + ownerId + "/";
        if (!storageKey.startsWith(prefix) || !STORAGE_KEY_PATTERN.matcher(storageKey).matches()) {
            throw ApiErrors.forbidden("Bạn không có quyền xác nhận file này.");
        }
    }

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
     * Kiểm tra quota theo user: tổng dung lượng.
     *
     * <p>Không giới hạn số lượng file — hồ sơ chỉ giữ 1 CV hiện hành, còn
     * các bản CV cũ được giữ lại cho đơn ứng tuyển đã nộp. Đếm file sẽ kẹt
     * người dùng sau vài lần thay CV dù họ có đúng 1 CV trong hồ sơ.
     *
     * @param ownerUserId  id chủ file
     * @param incomingSize dung lượng file mới (byte), 0 khi chỉ muốn kiểm tra sớm
     */
    private void enforceQuota(Long ownerUserId, long incomingSize) {
        long total = 0;
        for (String otherKind : List.of(Kind.CV.name(), Kind.AVATAR.name(), Kind.LOGO.name())) {
            for (FileUpload file : fileUploadRepository
                    .findByOwnerUserIdAndKindAndStillStored(ownerUserId, otherKind)) {
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

    /** Tính SHA-256 của nội dung file (hex) — bỏ qua nếu tính không được. */
    private String checksumOf(StorageProvider provider, String bucket, String storageKey) {
        try {
            return sha256(provider.read(bucket, storageKey));
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
     * Resize ảnh + trả về nội dung mới (giữ nguyên nếu không resize được).
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

    private String newSlug() {
        return "file-" + UUID.randomUUID().toString().substring(0, 16);
    }

    /** Đổi phần mở rộng của storageKey (giữ nguyên đường dẫn). */
    private String withExtension(String storageKey, String extension) {
        if (extension == null || extension.isEmpty()) {
            return storageKey;
        }
        int dot = storageKey.lastIndexOf('.');
        return (dot < 0 ? storageKey : storageKey.substring(0, dot)) + extension;
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
     * URL tương đối để tải file — {@code /api/v1/files/{slug}}.
     *
     * <p>App và API cùng origin (nginx / Vite proxy) nên URL này đúng ở mọi
     * môi trường mà không cần cấu hình domain.
     */
    private String fileUrl(String slug) {
        String path = publicPath == null || publicPath.isBlank()
                ? "/api/v1/files"
                : publicPath.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return path.replaceAll("/+$", "") + "/" + slug;
    }

    private FileUploadResponse toResponse(FileUpload file) {
        return FileUploadResponse.builder()
                .id(file.getSlug())
                .url(fileUrl(file.getSlug()))
                .fileName(file.getOriginalName())
                .mimeType(file.getMimeType())
                .sizeBytes(file.getSizeBytes())
                .kind(file.getKind())
                .storageKey(file.getStorageKey())
                .bucket(file.getBucket())
                .build();
    }
}
