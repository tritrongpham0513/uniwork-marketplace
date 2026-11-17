package com.uniwork.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uniwork.service.RealtimePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Adapter nối {@link NotificationWebSocketHandler} với seam {@link RealtimePublisher}.
 *
 * <p>Giữ phần serialize ở đây để handler chỉ lo "gửi frame", không lo biểu diễn.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketRealtimePublisher implements RealtimePublisher {

    private final NotificationWebSocketHandler handler;
    private final ObjectMapper objectMapper;

    @Override
    public void publish(Long userId, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            handler.sendToUser(userId, json);
        } catch (Exception e) {
            log.warn("Không serialize được payload realtime: {}", e.getMessage());
        }
    }
}
