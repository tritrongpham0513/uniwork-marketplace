package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.CreateReviewRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller đánh giá 2 chiều.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code POST /api/v1/reviews}</li>
 *   <li>{@code GET  /api/v1/reviews?targetType=&targetUserId=&hideHidden=}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.API_V1 + "/reviews")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Đánh giá", description = "Đánh giá 2 chiều sinh viên ↔ nhà tuyển dụng")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    @Operation(summary = "Tạo đánh giá (chỉ sau khi công việc hoàn thành)")
    public ResponseEntity<ApiResponse<ReviewResponse>> create(
            @RequestBody CreateReviewRequest request,
            @CurrentUser User user) {

        ReviewResponse result = reviewService.create(request, user.getId(), user.getRole().getCode());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cảm ơn bạn đã đánh giá!", result));
    }

    @GetMapping
    @Operation(summary = "Danh sách đánh giá")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> list(
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetUserId,
            @RequestParam(required = false, defaultValue = "false") Boolean hideHidden) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá thành công",
                reviewService.list(targetType, targetUserId, hideHidden)));
    }
}
