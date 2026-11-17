package com.uniwork.config;

import com.uniwork.service.RealtimePublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Handler WebSocket cho kênh thông báo realtime.
 *
 * <p>Giữ một map {@code userId -> tập session}. Khi có thông báo mới cho
 * {@code userId}, handler gửi payload JSON tới mọi session của user đó
 * (người dùng có thể mở nhiều tab).
 */
@Component
@Slf4j
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    /** userId -> các session đang mở. */
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = userIdOf(session);
        if (userId == null) {
            closeQuietly(session);
            return;
        }

        sessionsByUser
                .computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet())
                .add(session);

        log.debug("WebSocket đã kết nối: userId={}, sessionId={}", userId, session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Client chỉ gửi tín hiệu "ping" để giữ kết nối — backend không cần trả lời.
        if ("ping".equalsIgnoreCase(message.getPayload())) {
            try {
                session.sendMessage(new TextMessage("pong"));
            } catch (IOException e) {
                log.debug("Không gửi được pong: {}", e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
        log.debug("WebSocket đã đóng: sessionId={}, status={}", session.getId(), status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        removeSession(session);
        log.debug("Lỗi transport WebSocket: {}", exception.getMessage());
    }

    /**
     * Gửi payload tới tất cả session của một người dùng.
     *
     * @return số session đã gửi thành công
     */
    public int sendToUser(Long userId, String payloadJson) {
        if (userId == null) {
            return 0;
        }

        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return 0;
        }

        TextMessage message = new TextMessage(payloadJson);
        int sent = 0;

        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                removeSession(session);
                continue;
            }
            try {
                synchronized (session) {
                    session.sendMessage(message);
                }
                sent++;
            } catch (Exception e) {
                log.debug("Không gửi được frame tới session {}: {}", session.getId(), e.getMessage());
                removeSession(session);
            }
        }

        return sent;
    }

    private void removeSession(WebSocketSession session) {
        Long userId = userIdOf(session);
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(userId);
            }
        }
    }

    private Long userIdOf(WebSocketSession session) {
        Object value = session.getAttributes().get("userId");
        if (value instanceof Long userId) {
            return userId;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private void closeQuietly(WebSocketSession session) {
        try {
            session.close(CloseStatus.NOT_ACCEPTABLE);
        } catch (IOException ignored) {
            // Bỏ qua.
        }
    }

    /**
     * Adapter nối {@link NotificationWebSocketHandler} với seam {@link RealtimePublisher}.
     */
}
