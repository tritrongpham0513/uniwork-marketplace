package com.uniwork.config;

import com.uniwork.service.WsTicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Cấu hình WebSocket cho kênh thông báo realtime.
 *
 * <p>Endpoint: {@code /ws/notifications?ticket=<ticket>}.
 *
 * <p>Spring Security không lọc các URL này (xem {@code SecurityConfig}); thay
 * vào đó {@link TicketHandshakeInterceptor} xác thực vé một-lần và gắn
 * {@code userId} vào attributes của session. Việc xác thực diễn ra ở tầng
 * handshake — sau đó SecurityContext của request HTTP không còn liên quan.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final WsTicketService wsTicketService;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(notificationWebSocketHandler, "/ws/notifications")
                .addInterceptors(new TicketHandshakeInterceptor(wsTicketService))
                .setAllowedOriginPatterns("*");
    }

    /**
     * Xác thực vé WebSocket trước khi nâng cấp kết nối.
     *
     * <p>Trả về {@code false} để từ chối handshake với status 403.
     */
    static final class TicketHandshakeInterceptor implements HandshakeInterceptor {

        private final WsTicketService wsTicketService;

        TicketHandshakeInterceptor(WsTicketService wsTicketService) {
            this.wsTicketService = wsTicketService;
        }

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Map<String, Object> attributes) {

            if (!(request instanceof ServletServerHttpRequest servletRequest)) {
                return false;
            }

            String ticket = servletRequest.getServletRequest().getParameter("ticket");
            Long userId = wsTicketService.consume(ticket);

            if (userId == null) {
                log.debug("Từ chối handshake WebSocket: vé không hợp lệ hoặc đã hết hạn.");
                response.setStatusCode(org.springframework.http.HttpStatus.FORBIDDEN);
                return false;
            }

            attributes.put("userId", userId);
            return true;
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Exception exception) {
            // Không cần làm gì thêm.
        }
    }
}
