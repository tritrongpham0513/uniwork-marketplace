package com.uniwork.service.impl;

import com.uniwork.dto.request.CreateReviewRequest;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.entity.Application;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.Review;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.NotificationService;
import com.uniwork.service.ReviewService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Triển khai nghiệp vụ đánh giá 2 chiều.
 *
 * <p>Điểm trung bình & số lượt đánh giá được tính lại trong tầng service
 * (không dùng trigger CSDL).
 */
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ApplicationRepository applicationRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EmployerProfileRepository employerProfileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ReviewResponse create(CreateReviewRequest request, Long userId, String role) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw ApiErrors.badRequest("Vui lòng chấm điểm từ 1 đến 5 sao.",
                    ApiErrors.errors("rating", "Điểm đánh giá không hợp lệ"));
        }
        if (request.getComment() == null || request.getComment().isBlank()) {
            throw ApiErrors.badRequest("Vui lòng viết nhận xét.",
                    ApiErrors.errors("comment", "Nhận xét không được để trống"));
        }
        if (request.getApplicationId() == null || request.getApplicationId().isBlank()) {
            throw ApiErrors.badRequest("Thiếu mã đơn ứng tuyển.",
                    ApiErrors.errors("applicationId", "Thiếu mã đơn ứng tuyển"));
        }

        Application application = applicationRepository.findBySlug(request.getApplicationId())
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!"COMPLETED".equals(application.getStatus())) {
            throw ApiErrors.badRequest("Chỉ được đánh giá sau khi công việc đã hoàn thành.");
        }

        boolean isStudent = "STUDENT".equalsIgnoreCase(role);

        String fromName;
        String fromAvatarUrl = null;
        User reviewer;

        if (isStudent) {
            StudentProfile profile = studentProfileRepository.findById(userId)
                    .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ."));
            fromName = profile.getFullName();
            fromAvatarUrl = profile.getAvatarUrl();
            reviewer = profile.getUser();
        } else {
            EmployerProfile profile = employerProfileRepository.findById(userId)
                    .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ."));
            fromName = profile.getDisplayName();
            reviewer = profile.getUser();
        }

        if (reviewRepository.existsByApplicationIdAndReviewerId(application.getId(), userId)) {
            throw ApiErrors.badRequest("Bạn đã đánh giá công việc này rồi.");
        }

        // Đối tượng bị đánh giá: sinh viên đánh giá NTD, NTD đánh giá sinh viên
        boolean targetIsEmployer = isStudent;
        User reviewee;
        String targetName;

        if (targetIsEmployer) {
            EmployerProfile target = employerProfileRepository.findById(
                    application.getJobPost().getEmployer().getUserId())
                    .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy nhà tuyển dụng."));
            reviewee = target.getUser();
            targetName = target.getDisplayName();
        } else {
            StudentProfile target = studentProfileRepository.findById(
                    application.getStudent().getUserId())
                    .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy sinh viên."));
            reviewee = target.getUser();
            targetName = target.getFullName();
        }

        Review review = Review.builder()
                .slug("rev-" + java.util.UUID.randomUUID().toString().substring(0, 12))
                .application(application)
                .jobPost(application.getJobPost())
                .reviewer(reviewer)
                .reviewee(reviewee)
                .reviewerRole(isStudent ? "STUDENT" : "EMPLOYER")
                .targetType(targetIsEmployer ? "EMPLOYER" : "STUDENT")
                .fromName(fromName)
                .fromAvatarUrl(fromAvatarUrl)
                .targetName(targetName)
                .rating(request.getRating().shortValue())
                .comment(request.getComment().trim())
                .isHidden(false)
                .createdAt(LocalDateTime.now())
                .build();

        review = reviewRepository.save(review);

        recalculateRating(reviewee.getId());

        notificationService.push(
                reviewee.getId(),
                "REVIEW",
                "Bạn nhận được đánh giá mới",
                fromName + " đã đánh giá " + request.getRating() + " sao cho công việc của bạn.",
                targetIsEmployer ? "/employer/reviews" : "/student/profile");

        return toResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> list(String targetType, Long targetUserId, Boolean hideHidden) {
        List<Review> reviews;

        if (targetType != null && !targetType.isBlank() && targetUserId != null) {
            reviews = Boolean.TRUE.equals(hideHidden)
                    ? reviewRepository.findByRevieweeIdAndTargetTypeAndIsHiddenFalseOrderByCreatedAtDesc(
                            targetUserId, targetType.toUpperCase())
                    : reviewRepository.findByRevieweeIdAndTargetTypeOrderByCreatedAtDesc(
                            targetUserId, targetType.toUpperCase());
        } else if (targetType != null && !targetType.isBlank()) {
            reviews = reviewRepository.findAll().stream()
                    .filter(r -> targetType.equalsIgnoreCase(r.getTargetType()))
                    .toList();
        } else {
            reviews = reviewRepository.findAllByOrderByCreatedAtDesc();
        }

        if (Boolean.TRUE.equals(hideHidden)) {
            reviews = reviews.stream().filter(r -> !Boolean.TRUE.equals(r.getIsHidden())).toList();
        }

        return reviews.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ReviewResponse reply(String reviewId, String replyText, Long employerUserId) {
        Review review = findByPublicId(reviewId);

        if (!review.getReviewee().getId().equals(employerUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền trả lời đánh giá này.");
        }

        review.setReply(replyText != null && !replyText.isBlank() ? replyText.trim() : null);
        review = reviewRepository.save(review);

        return toResponse(review);
    }

    @Override
    @Transactional
    public ReviewResponse setHidden(String reviewId, boolean isHidden) {
        Review review = findByPublicId(reviewId);
        review.setIsHidden(isHidden);
        review = reviewRepository.save(review);

        // Cập nhật lại điểm trung bình của người bị đánh giá
        recalculateRating(review.getReviewee().getId());

        return toResponse(review);
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private Review findByPublicId(String reviewId) {
        return reviewRepository.findBySlug(reviewId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đánh giá."));
    }

    /** Tính lại điểm trung bình & số lượt đánh giá cho 1 người dùng. */
    private void recalculateRating(Long userId) {
        double avg = reviewRepository.averageRatingFor(userId);
        long count = reviewRepository.ratingCountFor(userId);
        BigDecimal rounded = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP);

        studentProfileRepository.findById(userId).ifPresent(profile -> {
            profile.setAvgRating(rounded);
            profile.setRatingCount((int) count);
            studentProfileRepository.save(profile);
        });

        employerProfileRepository.findById(userId).ifPresent(profile -> {
            profile.setAvgRating(rounded);
            profile.setRatingCount((int) count);
            employerProfileRepository.save(profile);
        });
    }

    // ------------------------------------------------------------------
    // MAPPER
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getSlug())
                .jobId(review.getJobPost() != null ? review.getJobPost().getSlug() : null)
                .jobTitle(review.getJobPost() != null ? review.getJobPost().getTitle() : null)
                .applicationId(review.getApplication() != null ? review.getApplication().getSlug() : null)
                .fromUserId(review.getReviewer() != null ? review.getReviewer().getId() : null)
                .fromRole(review.getReviewerRole())
                .fromName(review.getFromName())
                .fromAvatarUrl(review.getFromAvatarUrl())
                .targetType(review.getTargetType())
                .targetUserId(review.getReviewee() != null ? review.getReviewee().getId() : null)
                .targetName(review.getTargetName())
                .rating(review.getRating() != null ? review.getRating().intValue() : null)
                .comment(review.getComment())
                .reply(review.getReply())
                .isHidden(Boolean.TRUE.equals(review.getIsHidden()))
                .createdAt(DateTimeUtils.toIso(review.getCreatedAt()))
                .build();
    }
}
