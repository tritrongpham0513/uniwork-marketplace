package com.uniwork.service;

import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.exception.AppException;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.service.ai.AiProvider;
import com.uniwork.service.ai.AiProviderException;
import com.uniwork.service.ai.AiReason;
import com.uniwork.service.ai.AiReviewInput;
import com.uniwork.service.ai.AiReviewResult;
import com.uniwork.service.ai.AiReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit test cho {@link AiReviewService} — lớp điều phối kiểm duyệt AI.
 *
 * <p>Seam: dùng nhà cung cấp AI <b>giả</b> ({@link FakeAiProvider}) trả kết quả cố định.
 * Nhờ đó lớp HTTP của Gemini (gọi mạng thật) không bao giờ bị chạm tới trong test —
 * môi trường CI không có {@code GEMINI_API_KEY}.
 *
 * <p>Nguyên tắc quan trọng nhất: <b>sai cấu trúc thì không ghi gì</b>. Lỗi AI không được
 * làm hỏng dữ liệu tin tuyển dụng đang có.
 */
@ExtendWith(MockitoExtension.class)
class AiReviewServiceImplTest {

    private static final String JOB_SLUG = "job-abc123";
    private static final Long ADMIN_USER_ID = 1L;

    @Mock
    private JobPostRepository jobPostRepository;

    private FakeAiProvider fakeProvider;

    private AiReviewService aiReviewService;

    @BeforeEach
    void setUp() {
        fakeProvider = new FakeAiProvider();
        useProvider(fakeProvider);
    }

    // ================================================================
    // A. KẾT QUẢ HỢP LỆ -> GHI ĐÚNG 3 TRƯỜNG
    // ================================================================

    @Test
    @DisplayName("Kết quả hợp lệ -> ghi verdict, danh sách lý do và thời điểm kiểm tra")
    void review_WritesThreeFields_WhenResultValid() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "SUSPECT",
                "Tin có dấu hiệu yêu cầu tiền trước.",
                List.of(new AiReason("FEE_ADVANCE", "Yeu cau dat coc 500.000d", "Yeu cau dat coc")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals("SUSPECT", job.getAiVerdict());
        assertNotNull(job.getAiReasons());
        assertEquals(1, job.getAiReasons().size());
        assertEquals("FEE_ADVANCE", job.getAiReasons().get(0).getCode());
        assertEquals("Yeu cau dat coc 500.000d", job.getAiReasons().get(0).getEvidence());
        assertEquals("Yeu cau dat coc", job.getAiReasons().get(0).getDetail());
        assertNotNull(job.getAiCheckedAt());

        assertEquals("SUSPECT", response.getVerdict());
        assertNotNull(response.getAiCheckedAt());
        assertEquals(1, response.getReasons().size());
    }

    @Test
    @DisplayName("Verdict OK -> lưu danh sách lý do rỗng")
    void review_WritesEmptyReasons_WhenVerdictOk() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult("OK", "Tin binh thuong.", List.of());

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals("OK", job.getAiVerdict());
        assertTrue(job.getAiReasons() == null || job.getAiReasons().isEmpty());
    }

    // ================================================================
    // B. SAI CẤU TRÚC -> KHÔNG GHI GÌ
    // ================================================================

    @Test
    @DisplayName("Nhà cung cấp trả về cấu trúc sai -> không ghi gì, aiVerdict giữ null")
    void review_WritesNothing_WhenResultShapeInvalid() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        fakeProvider.result = new AiReviewResult("KHONG_HOP_LE", "Tom tat", List.of());

        assertThrows(AppException.class, () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertNull(job.getAiVerdict());
        assertNull(job.getAiReasons());
        assertNull(job.getAiCheckedAt());
        verify(jobPostRepository, never()).save(any(JobPost.class));
    }

    @Test
    @DisplayName("Verdict OK nhưng kèm lý do -> từ chối ghi (chỉ ghi log)")
    void review_WritesNothing_WhenOkVerdictHasReasons() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        fakeProvider.result = new AiReviewResult(
                "OK",
                "Tom tat",
                List.of(new AiReason("FEE_ADVANCE", "Yeu cau dat coc 500.000d", "Yeu cau dat coc")));

        assertThrows(AppException.class, () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertNull(job.getAiVerdict());
        verify(jobPostRepository, never()).save(any(JobPost.class));
    }

    @Test
    @DisplayName("Bằng chứng không có nguyên văn trong tin -> loại bỏ lý do đó")
    void review_DropsReason_WhenEvidenceNotVerbatim() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "WARN",
                "Tom tat",
                List.of(
                        new AiReason("FEE_ADVANCE", "Yeu cau dat coc 500.000d", "Yeu cau dat coc"),
                        new AiReason("OFF_PLATFORM", "Cau khong co trong tin", "Bia dat")));

        var response = aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals(1, job.getAiReasons().size());
        assertEquals("FEE_ADVANCE", job.getAiReasons().get(0).getCode());
        assertEquals(1, response.getReasons().size());
    }

    @Test
    @DisplayName("Mã vi phạm không hợp lệ -> loại bỏ lý do đó")
    void review_DropsReason_WhenCodeUnknown() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "WARN",
                "Tom tat",
                List.of(
                        new AiReason("MA_KHONG_CO", "Yeu cau dat coc 500.000d", "Yeu cau dat coc"),
                        new AiReason("FEE_ADVANCE", "Yeu cau dat coc 500.000d", "Yeu cau dat coc")));

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertEquals(1, job.getAiReasons().size());
        assertEquals("FEE_ADVANCE", job.getAiReasons().get(0).getCode());
    }

    @Test
    @DisplayName("Bằng chứng rỗng -> loại bỏ lý do đó")
    void review_DropsReason_WhenEvidenceBlank() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult(
                "WARN",
                "Tom tat",
                List.of(new AiReason("FEE_ADVANCE", "   ", "Yeu cau dat coc")));

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertTrue(job.getAiReasons() == null || job.getAiReasons().isEmpty());
    }

    // ================================================================
    // C. NHÀ CUNG CẤP LỖI -> KHÔNG GHI GÌ VÀ KHÔNG LỌT LỖI 500
    // ================================================================

    @Test
    @DisplayName("Nhà cung cấp ném lỗi -> kết quả giữ nguyên rỗng, không ghi gì vào DB")
    void review_DoesNotPersist_WhenProviderFails() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        fakeProvider.error = new AiProviderException("QUOTA_EXCEEDED", "Het han muc");

        assertThrows(AppException.class, () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertNull(job.getAiVerdict());
        assertNull(job.getAiReasons());
        assertNull(job.getAiCheckedAt());
        verify(jobPostRepository, never()).save(any(JobPost.class));
    }

    @Test
    @DisplayName("Lỗi nhà cung cấp -> AppException 503 với mã AI_UNAVAILABLE và thông điệp tiếng Việt")
    void review_ThrowsServiceUnavailable_WhenProviderFails() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));

        fakeProvider.error = new AiProviderException("QUOTA_EXCEEDED", "Het han muc");

        AppException ex = assertThrows(AppException.class,
                () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("AI_UNAVAILABLE", ex.getCode());
        assertTrue(ex.getMessage().contains("hạn mức"),
                "Thông điệp phải nói rõ nguyên nhân: " + ex.getMessage());
    }

    // ================================================================
    // D. TIN KHÔNG TỒN TẠI
    // ================================================================

    @Test
    @DisplayName("Tin tuyển dụng không tồn tại -> Ném 404 NOT_FOUND")
    void review_ThrowsNotFound_WhenJobMissing() {
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    @DisplayName("Tin tuyển dụng không tồn tại -> KHÔNG gọi nhà cung cấp AI")
    void review_DoesNotCallProvider_WhenJobMissing() {
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.empty());

        assertThrows(AppException.class, () -> aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID));

        assertEquals(0, fakeProvider.callCount);
    }

    // ================================================================
    // E. NHẬP LIỆU GỬI CHO AI
    // ================================================================

    @Test
    @DisplayName("Input gửi cho AI chứa nội dung tin tuyển dụng")
    void review_SendsJobContentToProvider() {
        JobPost job = pendingJob();
        when(jobPostRepository.findBySlugAndDeletedAtIsNull(JOB_SLUG)).thenReturn(Optional.of(job));
        when(jobPostRepository.save(any(JobPost.class))).thenAnswer(inv -> inv.getArgument(0));

        fakeProvider.result = new AiReviewResult("OK", "Tin binh thuong.", List.of());

        aiReviewService.reviewJob(JOB_SLUG, ADMIN_USER_ID);

        assertNotNull(fakeProvider.lastInput);
        assertTrue(fakeProvider.lastInput.getJobContent().contains("Yeu cau dat coc 500.000d"));
        assertTrue(fakeProvider.lastInput.getJobContent().contains("Phuc vu ca dem"));
    }

    /** Tin tuyển dụng đang chờ duyệt, nội dung có câu "Yeu cau dat coc 500.000d". */
    private JobPost pendingJob() {
        return JobPost.builder()
                .id(1L)
                .slug(JOB_SLUG)
                .title("Phuc vu ca dem")
                .description("Phuc vu ban va thu ngan")
                .requirements(List.of("Yeu cau dat coc 500.000d de giu cho"))
                .benefits(List.of("Luong 25.000d/gio"))
                .category(JobCategory.builder().id((short) 1).code("CAT01").name("Nha hang").build())
                .status("PENDING_REVIEW")
                .positionsCount((short) 2)
                .positionsFilled((short) 0)
                .build();
    }

    /**
     * Nhà cung cấp AI giả — trả kết quả cố định hoặc ném lỗi tuỳ ý.
     *
     * <p>Không phải mock của collaborator nội bộ: đây là một implementation thật
     * của {@link AiProvider} nên lớp điều phối được test đúng như lúc chạy thật.
     */
    static class FakeAiProvider implements AiProvider {

        AiReviewResult result = new AiReviewResult("OK", "Tin binh thuong.", List.of());

        AiProviderException error;

        int callCount;

        AiReviewInput lastInput;

        @Override
        public String name() {
            return "fake";
        }

        @Override
        public AiReviewResult review(AiReviewInput input) {
            callCount++;
            lastInput = input;
            if (error != null) {
                throw error;
            }
            return result;
        }
    }

    /** Dựng lại service với nhà cung cấp AI giả. */
    private void useProvider(AiProvider provider) {
        aiReviewService = new AiReviewService(jobPostRepository, provider, true, "fake");
    }
}
