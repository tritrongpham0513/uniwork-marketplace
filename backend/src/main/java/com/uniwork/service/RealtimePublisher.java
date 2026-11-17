package com.uniwork.service;

import java.util.Map;

/**
 * Kênh truyền tín hiệu realtime tới client.
 *
 * <p>Đây là <b>seam</b> duy nhất giữa nghiệp vụ thông báo và tầng truyền tải.
 * Service nghiệp vụ chỉ biết "có thay đổi, hãy đi lấy lại" — không biết client
 * đang dùng WebSocket, SSE hay polling. Nhờ vậy có thể đổi kênh truyền mà
 * không phải sửa bất kỳ service nghiệp vụ nào.
 *
 * <p>Hợp đồng: bảng {@code notifications} là nguồn sự thật. Kênh này chỉ mang
 * <i>tín hiệu + payload nhẹ</i> để client hiển thị nhanh; client vẫn phải
 * đồng bộ lại danh sách từ REST.
 */
public interface RealtimePublisher {

    /**
     * Đẩy một thông báo mới tới đúng người nhận.
     *
     * @param userId  id người nhận
     * @param payload payload nhẹ, tối thiểu gồm {@code id}, {@code type},
     *                {@code title}, {@code body}, {@code link}, {@code unreadCount}
     */
    void publish(Long userId, Map<String, Object> payload);

    /**
     * Đẩy cùng một thông báo tới nhiều người nhận (ví dụ mọi quản trị viên).
     *
     * @param userIds danh sách id người nhận
     * @param payload payload nhẹ
     */
    default void publishToAll(Iterable<Long> userIds, Map<String, Object> payload) {
        for (Long userId : userIds) {
            if (userId != null) {
                publish(userId, payload);
            }
        }
    }
}
