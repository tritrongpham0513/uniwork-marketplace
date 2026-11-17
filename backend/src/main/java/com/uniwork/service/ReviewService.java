package com.uniwork.service;

import com.uniwork.dto.request.CreateReviewRequest;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.entity.Review;

import java.util.List;

/**
 * Nghiệp vụ đánh giá 2 chiều.
 */
public interface ReviewService {

    /** Tạo đánh giá (sinh viên đánh giá NTD hoặc NTD đánh giá sinh viên). */
    ReviewResponse create(CreateReviewRequest request, Long userId, String role);

    /** Danh sách đánh giá — lọc theo loại đối tượng & người bị đánh giá. */
    List<ReviewResponse> list(String targetType, Long targetUserId, Boolean hideHidden);

    /** Trả lời đánh giá (nhà tuyển dụng). */
    ReviewResponse reply(String reviewId, String reply, Long employerUserId);

    /** Ẩn / hiện đánh giá (quản trị). */
    ReviewResponse setHidden(String reviewId, boolean isHidden);

    /** Chuyển entity `Review` sang DTO trả về cho frontend. */
    ReviewResponse toResponse(Review review);
}
