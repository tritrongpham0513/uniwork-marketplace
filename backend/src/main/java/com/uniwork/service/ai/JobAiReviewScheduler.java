package com.uniwork.service.ai;

import com.uniwork.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Lớp cửa để chạy kiểm duyệt AI ở chế độ nền.
 *
 * <p>Được gọi từ lớp nghiệp vụ tin tuyển dụng ngay sau khi tin được lưu. Việc
 * kiểm duyệt chạy <b>sau</b> khi HTTP response đã trả về cho nhà tuyển dụng nên
 * nhà tuyển dụng không phải chờ.
 *
 * <p>Nguyên tắc bất di bất dịch: <b>lỗi AI không được làm hỏng luồng đăng tin</b>.
 * Mọi ngoại lệ đều bị nuốt ở đây — tin vẫn đăng bình thường, kết quả kiểm duyệt
 * giữ nguyên rỗng (chưa kiểm tra), nhà tuyển dụng không thấy lỗi 500
 * (CONTRACT.md mục 6.1).
 *
 * <p>Về ranh giới giao dịch và proxy {@code @Async}:
 * <ul>
 *   <li>Method {@code @Async} ở đây được gọi từ bean khác
 *       ({@code JobServiceImpl}) nên đi qua proxy và thực sự chạy nền. Nếu gọi
 *       từ chính bean này thì proxy không có tác dụng.</li>
 *   <li>Method nền chỉ nhận <b>slug</b> (chuỗi) chứ không nhận entity, để không
 *       mang entity/lazy-proxy qua ranh giới luồng. Tin được tải lại trong giao
 *       dịch riêng của {@link AiReviewService#reviewJob(String, Long)}.</li>
 * </ul>
 *
 * <p>AI <b>không bao giờ</b> tự chuyển trạng thái tin tuyển dụng — chỉ ghi kết quả
 * kiểm duyệt.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobAiReviewScheduler {

    private final AiReviewService aiReviewService;

    /**
     * Yêu cầu kiểm duyệt AI cho một tin tuyển dụng — chạy nền.
     *
     * <p>Không bao giờ để ngoại lệ thoát ra ngoài: nếu có lỗi thì chỉ ghi log
     * ở mức WARN và bỏ qua.
     *
     * @param jobSlug public id (slug) của tin tuyển dụng
     */
    @Async("aiTaskExecutor")
    public void scheduleReview(String jobSlug) {
        if (jobSlug == null || jobSlug.isBlank()) {
            return;
        }

        try {
            // adminUserId = null: chạy nền thì không có quản trị viên nào thao tác.
            //
            // Không log ở đây: `AiReviewService` đã log "AI review cho tin {}:
            // verdict={}" ngay khi ghi kết quả — log thêm ở đây sẽ ghi trùng
            // mỗi lượt kiểm tra nền (CONTRACT.md mục 9).
            aiReviewService.reviewJob(jobSlug, null);
        } catch (AppException ex) {
            // 503 AI_UNAVAILABLE / 404 NOT_FOUND / 503 AI_DISABLED — không làm
            // hỏng luồng đăng tin.
            log.warn("AI review o nen that bai cho tin {}: code={}, message={}",
                    jobSlug, ex.getCode(), ex.getMessage());
        } catch (Exception ex) {
            log.warn("AI review o nen that bai cho tin {}: {}", jobSlug, ex.getMessage());
        }
    }
}
