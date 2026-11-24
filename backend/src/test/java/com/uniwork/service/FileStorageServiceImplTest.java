package com.uniwork.service;

import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.FileStorageService.Kind;
import com.uniwork.service.impl.FileStorageServiceImpl;
import com.uniwork.storage.StorageBuckets;
import com.uniwork.storage.StorageProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test cho {@link FileStorageServiceImpl} — tập trung vào luồng
 * <b>presigned PUT</b> (client tự PUT thẳng lên Cloudflare R2).
 *
 * <p>Các luật được kiểm tra:
 * storage key có dạng {@code {kind}/{userId}/{hex}.{ext}}, MIME type được
 * chuẩn hoá về loại hợp lệ của kind, avatar/logo trả URL công khai còn CV
 * thì không, và quota tổng dung lượng mỗi user bị chặn.
 */
@ExtendWith(MockitoExtension.class)
class FileStorageServiceImplTest {

    private static final Long OWNER_USER_ID = 42L;
    private static final String PUBLIC_BUCKET = "viejob-public";
    private static final String PRIVATE_BUCKET = "viejob-private";

    @Mock
    private FileUploadRepository fileUploadRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StorageProvider storageProvider;

    @InjectMocks
    private FileStorageServiceImpl fileStorageService;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(OWNER_USER_ID).email("student@uniwork.vn").build();

        // `StorageBuckets` là record (final) nên không mock được — dùng bản thật.
        ReflectionTestUtils.setField(fileStorageService, "storageBuckets",
                new StorageBuckets(PUBLIC_BUCKET, PRIVATE_BUCKET));

        // @Value không được inject khi khởi tạo trực tiếp -> set thủ công.
        ReflectionTestUtils.setField(fileStorageService, "presignPutTtlMinutes", 10L);
        ReflectionTestUtils.setField(fileStorageService, "publicPath", "/api/v1/files");
    }

    // ================================================================
    // A. PRESIGN — STORAGE KEY
    // ================================================================

    @Test
    @DisplayName("Presign CV -> storageKey có dạng cv/{userId}/{32 hex}.pdf")
    void presign_Cv_BuildsExpectedStorageKey() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "application/pdf");

        assertTrue(res.getStorageKey().startsWith("cv/" + OWNER_USER_ID + "/"),
                "storageKey phải bắt đầu bằng cv/{userId}/ — thực tế: " + res.getStorageKey());
        assertTrue(res.getStorageKey().endsWith(".pdf"),
                "storageKey phải kết thúc bằng đuôi đúng MIME — thực tế: " + res.getStorageKey());
        assertEquals(PRIVATE_BUCKET, res.getBucket());
        assertEquals("https://r2.example/presigned-put", res.getUploadUrl());
    }

    @Test
    @DisplayName("Presign avatar -> storageKey có dạng avatar/{userId}/{32 hex}.png")
    void presign_Avatar_BuildsExpectedStorageKey() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.AVATAR, owner, "image/png");

        assertTrue(res.getStorageKey().startsWith("avatar/" + OWNER_USER_ID + "/"));
        assertTrue(res.getStorageKey().endsWith(".png"));
        assertEquals(PUBLIC_BUCKET, res.getBucket());
    }

    @Test
    @DisplayName("Presign logo -> storageKey có dạng logo/{userId}/{32 hex}.png")
    void presign_Logo_BuildsExpectedStorageKey() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.LOGO, owner, "image/png");

        assertTrue(res.getStorageKey().startsWith("logo/" + OWNER_USER_ID + "/"));
    }

    @Test
    @DisplayName("Storage key sinh ra luôn khớp pattern {kind}/{userId}/{32 hex}.{ext}")
    void presign_StorageKeyMatchesPattern() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "application/pdf");

        assertTrue(res.getStorageKey().matches("^[a-z]+/[0-9]+/[a-f0-9]{32}\\.[a-z0-9]{2,5}$"),
                "storageKey sai pattern: " + res.getStorageKey());
    }

    // ================================================================
    // B. PRESIGN — MIME TYPE
    // ================================================================

    @Test
    @DisplayName("MIME type hợp lệ -> giữ nguyên và ký vào URL")
    void presign_KeepsValidMimeType() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "application/pdf");

        assertEquals("application/pdf", res.getContentType());
        verify(storageProvider).presignPut(eq(PRIVATE_BUCKET), anyString(),
                eq("application/pdf"), any(Duration.class));
    }

    @Test
    @DisplayName("MIME type không hợp lệ -> rơi về loại mặc định của kind")
    void presign_FallsBackToDefaultMimeType_WhenInvalid() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "text/html");

        assertEquals("application/pdf", res.getContentType(),
                "CV phải mặc định về application/pdf");
    }

    @Test
    @DisplayName("MIME type null -> rơi về loại mặc định của kind")
    void presign_FallsBackToDefaultMimeType_WhenNull() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.AVATAR, owner, null);

        assertEquals("image/png", res.getContentType());
    }

    // ================================================================
    // C. PRESIGN — URL & TTL
    // ================================================================

    @Test
    @DisplayName("Presign -> TTL lấy từ cấu hình (10 phút) và trả về giây hết hạn")
    void presign_UsesConfiguredTtl() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "application/pdf");

        assertEquals(600, res.getExpiresInSeconds());
        verify(storageProvider).presignPut(anyString(), anyString(), anyString(),
                eq(Duration.ofMinutes(10)));
    }

    @Test
    @DisplayName("Presign avatar -> trả publicUrl để nhúng <img src>")
    void presign_Avatar_ReturnsPublicUrl() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");
        when(storageProvider.publicUrl(eq(PUBLIC_BUCKET), anyString()))
                .thenReturn("https://cdn.example/avatar/42/abc.png");

        var res = fileStorageService.presign(Kind.AVATAR, owner, "image/png");

        assertEquals("https://cdn.example/avatar/42/abc.png", res.getPublicUrl());
    }

    @Test
    @DisplayName("Presign CV -> KHÔNG trả publicUrl (CV là tài nguyên riêng tư)")
    void presign_Cv_DoesNotReturnPublicUrl() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        var res = fileStorageService.presign(Kind.CV, owner, "application/pdf");

        assertNull(res.getPublicUrl());
        verify(storageProvider, never()).publicUrl(anyString(), anyString());
    }

    @Test
    @DisplayName("Presign -> maxSizeBytes đúng với giới hạn của từng kind")
    void presign_ReturnsMaxSizeBytesPerKind() {
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        assertEquals(5L * 1024 * 1024,
                fileStorageService.presign(Kind.CV, owner, "application/pdf").getMaxSizeBytes());
        assertEquals(2L * 1024 * 1024,
                fileStorageService.presign(Kind.AVATAR, owner, "image/png").getMaxSizeBytes());
    }

    // ================================================================
    // D. QUOTA
    // ================================================================

    @Test
    @DisplayName("User đã vượt quota tổng -> Ném 400 BAD_REQUEST, không cấp URL")
    void presign_ThrowsBadRequest_WhenQuotaExceeded() {
        // Presign gọi `enforceQuota(id, 0)` -> chỉ dung lượng đã lưu mới tính.
        when(fileUploadRepository.findByOwnerUserIdAndKindAndStillStored(eq(OWNER_USER_ID), eq("CV")))
                .thenReturn(List.of(fileUploadOf(21L * 1024 * 1024)));

        AppException ex = assertThrows(AppException.class,
                () -> fileStorageService.presign(Kind.AVATAR, owner, "image/png"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(storageProvider, never()).presignPut(anyString(), anyString(), anyString(), any());
    }

    @Test
    @DisplayName("User còn quota -> presign thành công")
    void presign_Succeeds_WhenQuotaAvailable() {
        when(fileUploadRepository.findByOwnerUserIdAndKindAndStillStored(eq(OWNER_USER_ID), anyString()))
                .thenReturn(List.of());
        when(storageProvider.presignPut(anyString(), anyString(), anyString(), any()))
                .thenReturn("https://r2.example/presigned-put");

        assertNotNull(fileStorageService.presign(Kind.AVATAR, owner, "image/png"));
    }

    /** Dựng bản ghi file đã lưu để giả lập dung lượng đã dùng. */
    private com.uniwork.entity.FileUpload fileUploadOf(long sizeBytes) {
        return com.uniwork.entity.FileUpload.builder()
                .id(1L)
                .ownerUserId(OWNER_USER_ID)
                .kind("CV")
                .sizeBytes(sizeBytes)
                .build();
    }
}
