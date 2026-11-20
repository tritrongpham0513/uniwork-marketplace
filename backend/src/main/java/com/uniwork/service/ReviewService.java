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

    /**
     * Danh sách đánh giá — lọc theo loại đối tượng & người bị đánh giá.
     *
     * <p>Chỉ dùng nội bộ sau khi đã kiểm tra quyền ở controller.
     */
    List<ReviewResponse> list(String targetType, Long targetUserId, Boolean hideHidden);

    /**
     * Đánh giá dành cho một sinh viên cụ thể (chỉ đánh giá chưa bị ẩn).
     *
     * <p>Dùng cho: trang đánh giá của sinh viên, và hồ sơ ứng viên phía nhà
     * tuyển dụng (chỉ NTD sở hữu tin mới xem được).
     */
    List<ReviewResponse> listForStudent(Long studentUserId);

    /**
     * Trả lời đánh giá — phản hồi của người BỊ đánh giá (reviewee).
     *
     * @deprecated dùng {@link #replyAsReviewee} hoặc {@link #replyAsReviewer}
     */
    @Deprecated
    ReviewResponse reply(String reviewId, String reply, Long employerUserId);

    /**
     * Phản hồi lại đánh giá với tư cách **người bị đánh giá** (reviewee).
     *
     * <p>Ví dụ: NTD đánh giá SV -> SV phản hồi lại NTD.
     */
    ReviewResponse replyAsReviewee(String reviewId, String replyText, Long userId);

    /**
     * Phản hồi lại đánh giá với tư cách **người viết đánh giá** (reviewer).
     *
     * <p>Ví dụ: SV đánh giá NTD -> NTD phản hồi lại SV (trường hợp này NTD
     * vừa là reviewee ở chiều đánh giá kia, vừa là reviewer ở chiều này).
     */
    ReviewResponse replyAsReviewer(String reviewId, String replyText, Long userId);

    /** Ẩn / hiện đánh giá (quản trị). */
    ReviewResponse setHidden(String reviewId, boolean isHidden);

    /** Chuyển entity `Review` sang DTO trả về cho frontend. */
    ReviewResponse toResponse(Review review);
}
