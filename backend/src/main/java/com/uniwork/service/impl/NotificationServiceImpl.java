package com.uniwork.service.impl;

import com.uniwork.dto.response.NotificationResponse;
import com.uniwork.entity.Notification;
import com.uniwork.entity.User;
import com.uniwork.repository.NotificationRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.NotificationService;
import com.uniwork.service.RealtimePublisher;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ thông báo.
 *
 * <p>Bảng {@code notifications} là nguồn sự thật. Mỗi lần ghi thông báo mới,
 * service này đồng thời đẩy một payload nhẹ qua {@link RealtimePublisher} để
 * client hiển thị tức thì. Việc đẩy được hoàn tất <b>sau khi commit</b> để
 * không bao giờ có tín hiệu cho một bản ghi vốn đã bị rollback.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final RealtimePublisher realtimePublisher;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Long userId, Boolean unreadOnly) {
        List<Notification> notifications = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public NotificationResponse markRead(String notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(resolveId(notificationId), userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy thông báo."));

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    @Override
    @Transactional
    public long markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        LocalDateTime now = LocalDateTime.now();
        for (Notification n : unread) {
            n.setIsRead(true);
            n.setReadAt(now);
        }
        notificationRepository.saveAll(unread);
        return unread.size();
    }

    @Override
    @Transactional
    public void push(Long userId, String type, String title, String body, String link) {
        if (userId == null) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        Notification saved = notificationRepository.save(Notification.builder()
                .slug("ntf-" + UUID.randomUUID().toString().substring(0, 12))
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build());

        publishAfterCommit(userId, saved);
    }

    @Override
    @Transactional
    public void pushToAll(Iterable<Long> userIds, String type, String title, String body, String link) {
        if (userIds == null) {
            return;
        }
        for (Long userId : userIds) {
            push(userId, type, title, body, link);
        }
    }

    // ------------------------------------------------------------------
    // REALTIME
    // ------------------------------------------------------------------

    /**
     * Đẩy tín hiệu realtime sau khi transaction commit thành công.
     *
     * <p>Nếu đang trong transaction, đăng ký callback {@code afterCommit}.
     * Nếu không (ví dụ gọi ngoài transaction), đẩy luôn.
     */
    private void publishAfterCommit(Long userId, Notification notification) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", notification.getSlug());
        payload.put("type", notification.getType());
        payload.put("title", notification.getTitle());
        payload.put("body", notification.getBody());
        payload.put("link", notification.getLink());
        // `unreadCount` cố ý để trống ở đây — sẽ điền sau khi commit để
        // luôn khớp với REST (nếu đếm trước commit, các thông báo ghi chung
        // một transaction sẽ làm sai con số).
        payload.put("unreadCount", null);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    payload.put("unreadCount", notificationRepository.countByUserIdAndIsReadFalse(userId));
                    safePublish(userId, payload);
                }
            });
        } else {
            payload.put("unreadCount", notificationRepository.countByUserIdAndIsReadFalse(userId));
            safePublish(userId, payload);
        }
    }

    private void safePublish(Long userId, Map<String, Object> payload) {
        try {
            realtimePublisher.publish(userId, payload);
        } catch (Exception e) {
            // Realtime là kênh "phụ" — lỗi ở đây không được làm hỏng luồng nghiệp vụ.
            log.warn("Không gửi được thông báo realtime tới userId={}", userId, e);
        }
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    /**
     * Frontend dùng public id dạng "ntf-001" cho thông báo; backend tra theo
     * slug trước, sau đó mới thử theo id số.
     */
    private Long resolveId(String notificationId) {
        if (notificationId == null || notificationId.isBlank()) {
            throw ApiErrors.notFound("Không tìm thấy thông báo.");
        }
        return notificationRepository.findBySlug(notificationId)
                .map(Notification::getId)
                .orElseGet(() -> {
                    try {
                        return Long.parseLong(notificationId);
                    } catch (NumberFormatException e) {
                        throw ApiErrors.notFound("Không tìm thấy thông báo.");
                    }
                });
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getSlug())
                .userId(n.getUser() != null ? n.getUser().getId() : null)
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .isRead(Boolean.TRUE.equals(n.getIsRead()))
                .link(n.getLink())
                .createdAt(DateTimeUtils.toIso(n.getCreatedAt()))
                .build();
    }
}
