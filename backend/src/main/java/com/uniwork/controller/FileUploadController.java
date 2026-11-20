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
import com.uniwork.storage.StorageBuckets;
import com.uniwork.storage.StorageProvider;
import com.uniwork.util.ApiErrors;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
 * khách (không cần token). CV là tài nguyên riêng tư — service kiểm tra
 * quyền đọc theo vai trò của người đang đăng nhập.
 */
@RestController
@RequestMapping(ApiEndpoints.V1_FILES)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "File", description = "Upload & tải CV, ảnh đại diện, logo tổ chức")
public class FileUploadController {

    /** Thời hạn presigned GET cho file riêng tư (CV) — 5 phút. */
    private static final Duration PRIVATE_LINK_TTL = Duration.ofMinutes(5);

    private final FileStorageService fileStorageService;
    private final CurrentUserResolver currentUserResolver;
    private final StorageProvider storageProvider;
    private final StorageBuckets storageBuckets;

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
    @Operation(summary = "Tải nội dung file")
    public ResponseEntity<?> download(@PathVariable("id") String id) {
        FileUploadResponse file = fileStorageService.findByPublicId(id);

        Long userId = currentUserResolver.currentUserId().orElse(null);
        if (!fileStorageService.canRead(file, userId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem file này.");
        }

        String bucket = bucketOf(file);
        String key = file.getStorageKey();

        // Ảnh công khai (avatar / logo): nếu có CDN thì trỏ thẳng về CDN —
        // URL ổn định, cache được, không tốn bandwidth backend.
        if (!"CV".equals(file.getKind())) {
            String publicUrl = storageProvider.publicUrl(bucket, key);
            if (publicUrl != null) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(publicUrl))
                        .build();
            }
        }

        // CV (và mọi file riêng tư): redirect tới presigned GET trên R2 —
        // backend không phải đọc & stream nội dung file.
        String signedUrl = storageProvider.presignGet(bucket, key, PRIVATE_LINK_TTL);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(signedUrl))
                .build();
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
                    "Loại file không hợp lệ. Chỉ hỗ trợ: CV, AVATAR, LOGO.",
                    ApiErrors.errors("kind", "Loại file không hợp lệ."));
        }
    }

    /** Bucket chứa file theo loại (dùng khi cột bucket của file cũ còn null). */
    private String bucketOf(FileUploadResponse file) {
        if (file.getBucket() != null && !file.getBucket().isBlank()) {
            return file.getBucket();
        }
        return storageBuckets.forKind(!"CV".equals(file.getKind()));
    }
}
