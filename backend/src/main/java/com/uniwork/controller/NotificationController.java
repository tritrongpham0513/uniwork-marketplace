package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.CountResponse;
import com.uniwork.dto.response.NotificationResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller thông báo — dùng chung cho mọi vai trò.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code GET   /api/v1/notifications?unreadOnly=}</li>
 *   <li>{@code GET   /api/v1/notifications/unread-count}</li>
 *   <li>{@code PATCH /api/v1/notifications/{id}/read}</li>
 *   <li>{@code POST  /api/v1/notifications/read-all}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.API_V1 + "/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Thông báo", description = "Thông báo trong ứng dụng (dùng chung mọi vai trò)")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Danh sách thông báo của tôi")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> list(
            @RequestParam(required = false) Boolean unreadOnly,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách thông báo thành công",
                notificationService.list(user.getId(), unreadOnly)));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Số thông báo chưa đọc")
    public ResponseEntity<ApiResponse<CountResponse>> unreadCount(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy số thông báo chưa đọc thành công",
                CountResponse.builder().count(notificationService.unreadCount(user.getId())).build()));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu 1 thông báo đã đọc")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable("id") String id,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã đánh dấu thông báo là đã đọc.",
                notificationService.markRead(id, user.getId())));
    }

    @PostMapping("/read-all")
    @Operation(summary = "Đánh dấu toàn bộ thông báo đã đọc")
    public ResponseEntity<ApiResponse<CountResponse>> markAllRead(@CurrentUser User user) {
        long count = notificationService.markAllRead(user.getId());
        return ResponseEntity.ok(ApiResponse.success(
                "Đã đánh dấu " + count + " thông báo là đã đọc.",
                CountResponse.builder().count(count).build()));
    }
}
