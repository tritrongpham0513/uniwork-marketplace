package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `reviews` — đánh giá 2 chiều (sinh viên ↔ nhà tuyển dụng).
 *
 * Đã bỏ liên kết bắt buộc với `work_assignments` (mô hình không tồn tại ở frontend),
 * thay bằng `application_id`.
 */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** ID công khai (string) — frontend dùng giá trị này làm `Review.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private JobPost jobPost;

    /** Người viết đánh giá */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    /** Người bị đánh giá */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    /** STUDENT | EMPLOYER — vai trò của người viết */
    @Column(name = "reviewer_role", nullable = false, length = 10)
    private String reviewerRole;

    /** EMPLOYER | STUDENT — loại đối tượng bị đánh giá */
    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType;

    @Column(name = "from_name", nullable = false, length = 150)
    private String fromName;

    @Column(name = "from_avatar_url", length = 500)
    private String fromAvatarUrl;

    @Column(name = "target_name", nullable = false, length = 150)
    private String targetName;

    @Column(name = "rating", nullable = false)
    private Short rating;

    @Column(name = "comment", nullable = false, length = 1000)
    private String comment;

    /** Phản hồi của đối tượng bị đánh giá (reviewee) */
    @Column(name = "reply", length = 1000)
    private String reply;

    /** Phản hồi của người viết đánh giá (reviewer) — cho đánh giá 2 chiều */
    @Column(name = "reviewer_reply", length = 1000)
    private String reviewerReply;

    /** Admin có thể ẩn đánh giá vi phạm */
    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private Boolean isHidden = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
