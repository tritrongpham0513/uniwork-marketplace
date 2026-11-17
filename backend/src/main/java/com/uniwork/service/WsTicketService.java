package com.uniwork.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cấp "vé" (ticket) dùng một lần cho WebSocket handshake.
 *
 * <p>Trình duyệt không cho gắn header {@code Authorization} khi mở WebSocket,
 * nên token phải đi qua query string. Đưa JWT (hạn 24h) thẳng vào URL sẽ làm
 * nó lọt vào access log của nginx và log backend. Vé ngắn hạn (60 giây, dùng
 * một lần) giải quyết đúng vấn đề đó: URL chỉ chứa một chuỗi vô nghĩa sau
 * khoảng một phút.
 */
@Service
@Slf4j
public class WsTicketService {

    /** Thời hạn của vé (giây). */
    public static final long TICKET_TTL_SECONDS = 60;

    private final SecureRandom secureRandom = new SecureRandom();

    /** vé -> { userId, thời điểm hết hạn } */
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    private record Ticket(Long userId, Instant expiresAt) {
    }

    /**
     * Cấp vé mới cho người dùng đang đăng nhập.
     *
     * @return vé dạng chuỗi an toàn để đưa vào URL
     */
    public String issue(Long userId) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        Instant expiresAt = Instant.now().plusSeconds(TICKET_TTL_SECONDS);
        tickets.put(ticket, new Ticket(userId, expiresAt));

        purgeExpired();
        return ticket;
    }

    /**
     * Đổi vé lấy id người dùng. Vé chỉ dùng được một lần.
     *
     * @return id người dùng, hoặc {@code null} nếu vé không hợp lệ / đã hết hạn / đã dùng
     */
    public Long consume(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }

        Ticket found = tickets.remove(ticket);
        if (found == null) {
            return null;
        }
        if (found.expiresAt().isBefore(Instant.now())) {
            return null;
        }
        return found.userId();
    }

    /** Xoá các vé đã hết hạn để bản đồ không phình vô hạn. */
    private void purgeExpired() {
        Instant now = Instant.now();
        tickets.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }
}
