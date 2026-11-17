package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.WsTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Cấp vé kết nối WebSocket.
 *
 * <p>Trình duyệt không cho gắn header {@code Authorization} khi mở WebSocket.
 * Thay vào đó client gọi endpoint này (có Bearer JWT) để nhận một vé dùng
 * một lần, hạn 60 giây, rồi mở {@code /ws/notifications?ticket=<ticket>}.
 *
 * <p>Vé chỉ tồn tại trong RAM backend — không cần migration, không cần bảng.
 */
@RestController
@RequestMapping(ApiEndpoints.API_V1 + "/ws")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "WebSocket", description = "Vé kết nối realtime")
public class WsTicketController {

    private final WsTicketService wsTicketService;

    @PostMapping("/ticket")
    @Operation(summary = "Cấp vé kết nối WebSocket (dùng một lần, hạn 60 giây)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> issueTicket(@CurrentUser User user) {
        String ticket = wsTicketService.issue(user.getId());

        return ResponseEntity.ok(ApiResponse.success(
                "Cấp vé kết nối thành công",
                Map.of(
                        "ticket", ticket,
                        "expiresIn", WsTicketService.TICKET_TTL_SECONDS)));
    }
}
