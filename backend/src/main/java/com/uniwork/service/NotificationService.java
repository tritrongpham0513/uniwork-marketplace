package com.uniwork.service;

import com.uniwork.dto.response.NotificationResponse;

import java.util.List;

/**
 * Nghiệp vụ thông báo trong ứng dụng.
 */
public interface NotificationService {

    /** Danh sách thông báo của người dùng (tuỳ chọn chỉ lấy chưa đọc). */
    List<NotificationResponse> list(Long userId, Boolean unreadOnly);

    /** Số thông báo chưa đọc. */
    long unreadCount(Long userId);

    /** Đánh dấu 1 thông báo đã đọc. */
    NotificationResponse markRead(String notificationId, Long userId);

    /** Đánh dấu toàn bộ thông báo đã đọc — trả về số lượt đã đánh dấu. */
    long markAllRead(Long userId);

    /**
     * Đẩy 1 thông báo mới tới người dùng (dùng nội bộ từ service khác).
     *
     * @param link đường dẫn frontend tương đối, ví dụ "/employer/applications/app-001"
     */
    void push(Long userId, String type, String title, String body, String link);

    /**
     * Đẩy 1 thông báo mới tới nhiều người dùng (ví dụ mọi quản trị viên).
     *
     * <p>Mỗi người nhận có một bản ghi riêng trong {@code notifications} — nên
     * {@code slug} và nội dung phải là bản sao riêng, không chia sẻ.
     */
    void pushToAll(Iterable<Long> userIds, String type, String title, String body, String link);
}
