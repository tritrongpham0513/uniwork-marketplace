package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.ConfirmUploadRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.dto.response.PresignUploadResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.security.CurrentUserResolver;
import com.uniwork.service.FileStorageService;
import com.uniwork.storage.StorageProvider;
import com.uniwork.util.ApiErrors;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Controller phục vụ upload & tải file (CV, ảnh đại diện, logo tổ chức).
 *
 * <ul>
 *   <li>{@code POST   /api/v1/files/upload?kind=CV|AVATAR|LOGO} — upload file (multipart)</li>
 *   <li>{@code POST   /api/v1/files/presign?kind=CV|AVATAR|LOGO} — cấp URL upload trực tiếp</li>
 *   <li>{@code POST   /api/v1/files/confirm} — xác nhận file đã upload</li>
 *   <li>{@code GET    /api/v1/files/{id}} — tải nội dung file</li>
 *   <li>{@code DELETE /api/v1/files/{id}} — xoá file (chủ sở hữu)</li>
 * </ul>
 *
 * <p>Ảnh đại diện & logo là tài nguyên công khai nên endpoint GET cho phép
 * khách (không cần token) và redirect về CDN. CV là tài nguyên riêng tư:
 * backend kiểm tra quyền đọc rồi <b>stream nội dung</b> qua chính endpoint này
 * — nhờ vậy client tải bằng HTTP request có header {@code Authorization}
 * (fetch/axios) là lấy được file, không cần URL tĩnh.
 */
@RestController
@RequestMapping(ApiEndpoints.V1_FILES)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "File", description = "Upload & tải CV, ảnh đại diện, logo tổ chức")
public class FileUploadController {

    private static final String KIND_CV = "CV";
    private static final String CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

    private final FileStorageService fileStorageService;
    private final CurrentUserResolver currentUserResolver;
    private final StorageProvider storageProvider;

    @Value("${app.storage.r2.presign-get-ttl-minutes:5}")
    private long presignGetTtlMinutes;

    // ------------------------------------------------------------------
    // UPLOAD — LUỒNG MULTIPART (CỔNG)
    // ------------------------------------------------------------------

    @PostMapping("/upload")
    @Operation(summary = "Upload file (kind = CV | AVATAR | LOGO)")
    public ResponseEntity<ApiResponse<FileUploadResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "kind", defaultValue = "CV") String kind,
            @CurrentUser User user) {

        FileStorageService.Kind fileKind = parseKind(kind);

        try {
            FileUploadResponse result = fileStorageService.store(file, fileKind, user);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Đã tải lên file thành công.", result));
        } catch (IOException e) {
            throw ApiErrors.badRequest("Không tải lên được file. Vui lòng thử lại.");
        }
    }

    // ------------------------------------------------------------------
    // UPLOAD — LUỒNG PRESIGNED (CLIENT PUT THẲNG LÊN NƠI LƯU TRỮ)
    // ------------------------------------------------------------------

    @PostMapping("/presign")
    @Operation(summary = "Cấp URL upload trực tiếp (presigned PUT)")
    public ResponseEntity<ApiResponse<PresignUploadResponse>> presign(
            @RequestParam(value = "kind", defaultValue = "CV") String kind,
            @RequestParam(value = "contentType", required = false) String contentType,
            @CurrentUser User user) {

        FileStorageService.Kind fileKind = parseKind(kind);
        PresignUploadResponse result = fileStorageService.presign(fileKind, user, contentType);
        return ResponseEntity.ok(ApiResponse.success("Đã cấp URL tải lên file.", result));
    }

    @PostMapping("/confirm")
    @Operation(summary = "Xác nhận file đã upload trực tiếp")
    public ResponseEntity<ApiResponse<FileUploadResponse>> confirm(
            @Valid @RequestBody ConfirmUploadRequest request,
            @CurrentUser User user) {

        FileUploadResponse result = fileStorageService.confirm(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tải lên file thành công.", result));
    }

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @GetMapping("/{id}")
    @Operation(summary = "Tải nội dung file (ảnh công khai; CV cần quyền đọc)")
    public ResponseEntity<?> download(@PathVariable("id") String id) {
        Long userId = currentUserResolver.currentUserId().orElse(null);
        FileStorageService.ResolvedFile resolved = fileStorageService.resolveForRead(id, userId);

        FileUploadResponse file = resolved.file();
        String bucket = resolved.bucket();
        String key = resolved.storageKey();

        // Ảnh công khai (avatar / logo): trỏ thẳng về CDN — URL ổn định, cache
        // được, không tốn bandwidth backend.
        if (!KIND_CV.equals(file.getKind())) {
            String publicUrl = storageProvider.publicUrl(bucket, key);
            if (publicUrl != null) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(publicUrl))
                        .header(HttpHeaders.CACHE_CONTROL, CACHE_IMMUTABLE)
                        .build();
            }
            // Chưa bật CDN cho bucket public → dùng presigned GET.
            String signedUrl = storageProvider.presignGet(bucket, key, presignGetTtl());
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(signedUrl))
                    .build();
        }

        // CV: stream qua backend. Client gọi bằng fetch/axios (có Authorization)
        // → tải được file; trình duyệt không phải gắn token vào thẻ <a>.
        if (!storageProvider.exists(bucket, key)) {
            throw ApiErrors.notFound("File không còn tồn tại.");
        }

        byte[] content = storageProvider.read(bucket, key);
        return ResponseEntity.ok()
                .contentType(mediaTypeOf(file.getMimeType()))
                .contentLength(content.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(file.getFileName()))
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(content);
    }

    // ------------------------------------------------------------------
    // XOÁ
    // ------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @Operation(summary = "Xoá file đã upload")
    public ResponseEntity<ApiResponse<Void>> remove(@PathVariable("id") String id, @CurrentUser User user) {
        fileStorageService.remove(id, user);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá file.", null));
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private FileStorageService.Kind parseKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return FileStorageService.Kind.CV;
        }
        try {
            return FileStorageService.Kind.valueOf(kind.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiErrors.badRequest(
                    "Loại file không hợp lệ. Chỉ hỗ trợ: CV, AVATAR, LOGO, JOB_IMAGE.",
                    ApiErrors.errors("kind", "Loại file không hợp lệ."));
        }
    }

    private Duration presignGetTtl() {
        return Duration.ofMinutes(Math.max(1, presignGetTtlMinutes));
    }

    private MediaType mediaTypeOf(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (IllegalArgumentException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    /**
     * {@code Content-Disposition: inline} + tên file gốc.
     *
     * <p>Nhờ vậy tab tải file hiển thị đúng tên (vd "CV-NguyenVanA.pdf") thay
     * vì slug {@code file-xxxx}.
     */
    private String contentDisposition(String fileName) {
        String name = (fileName == null || fileName.isBlank()) ? "file" : fileName;
        return ContentDisposition.inline()
                .filename(name, StandardCharsets.UTF_8)
                .build()
                .toString();
    }
}
