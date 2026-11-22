package com.uniwork.repository;

import com.uniwork.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `reviews` — đánh giá 2 chiều.
 */
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findBySlug(String slug);

    boolean existsByApplicationIdAndReviewerId(Long applicationId, Long reviewerId);

    /** Ảnh đại diện này có đang được đánh giá cũ tham chiếu không? */
    boolean existsByFromAvatarUrl(String fromAvatarUrl);

    List<Review> findByRevieweeIdAndTargetTypeOrderByCreatedAtDesc(Long revieweeId, String targetType);

    List<Review> findByRevieweeIdAndTargetTypeAndIsHiddenFalseOrderByCreatedAtDesc(Long revieweeId, String targetType);

    List<Review> findByReviewerIdOrderByCreatedAtDesc(Long reviewerId);

    List<Review> findByApplicationId(Long applicationId);

    List<Review> findAllByOrderByCreatedAtDesc();

    long countByIsHiddenTrue();

    /** Tính lại điểm trung bình cho một người dùng bị đánh giá. */
    @org.springframework.data.jpa.repository.Query(
            "select coalesce(avg(r.rating), 0) from Review r where r.reviewee.id = :userId and r.isHidden = false")
    Double averageRatingFor(Long userId);

    @org.springframework.data.jpa.repository.Query(
            "select count(r) from Review r where r.reviewee.id = :userId and r.isHidden = false")
    long ratingCountFor(Long userId);
}
