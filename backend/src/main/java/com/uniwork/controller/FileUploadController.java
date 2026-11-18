package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.FileUploadResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.security.CurrentUserResolver;
import com.uniwork.service.FileStorageService;
import com.uniwork.util.ApiErrors;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Controller phục vụ upload & tải file (CV, ảnh đại diện, logo tổ chức).
 *
 * <ul>
 *   <li>{@code POST   /api/v1/files/upload?kind=CV|AVATAR|LOGO} — upload file</li>
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

    private final FileStorageService fileStorageService;
    private final CurrentUserResolver currentUserResolver;

    // ------------------------------------------------------------------
    // UPLOAD
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
    // ĐỌC
    // ------------------------------------------------------------------

    @GetMapping("/{id}")
    @Operation(summary = "Tải nội dung file")
    public ResponseEntity<Resource> download(@PathVariable("id") String id) {
        FileUploadResponse file = fileStorageService.findByPublicId(id);

        Long userId = currentUserResolver.currentUserId().orElse(null);
        if (!fileStorageService.canRead(file, userId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem file này.");
        }

        Path path = fileStorageService.resolvePath(file);
        if (path == null || !Files.exists(path)) {
            throw ApiErrors.notFound("Không tìm thấy file.");
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.getMimeType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        long contentLength;
        try {
            contentLength = Files.size(path);
        } catch (IOException e) {
            throw ApiErrors.notFound("Không tìm thấy file.");
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(contentLength)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + sanitizeHeaderValue(file.getFileName()) + "\"")
                .body(new FileSystemResource(path));
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

    /** Bỏ ký tự nguy hiểm khỏi tên file trước khi đặt vào header. */
    private String sanitizeHeaderValue(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        return name.replaceAll("[\\r\\n\"\\\\]", "_");
    }
}
