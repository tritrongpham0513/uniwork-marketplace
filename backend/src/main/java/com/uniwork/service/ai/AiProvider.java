package com.uniwork.service.ai;

/**
 * Nhà cung cấp kiểm duyệt nội dung bằng AI.
 *
 * <p>Đây là điểm móc để đổi nhà cung cấp chỉ bằng cách đổi cấu hình
 * ({@code app.ai.provider}), không phải sửa mã nghiệp vụ.
 */
public interface AiProvider {

    /** Tên nhà cung cấp — dùng để chọn implementation theo cấu hình. */
    String name();

    /**
     * Kiểm duyệt nội dung tin tuyển dụng.
     *
     * <p>Implementations PHẢI ném {@link AiProviderException} khi lỗi
     * (hết hạn mức, lỗi dịch vụ, timeout) — không ném lỗi HTTP thô.
     */
    AiReviewResult review(AiReviewInput input);

    /**
     * Nhà cung cấp đã sẵn sàng chạy chưa (tức là đã có khoá API hợp lệ).
     *
     * <p>Thiếu khoá API = tính năng <b>ẩn</b>, không phải lỗi.
     */
    default boolean isConfigured() {
        return true;
    }
}
