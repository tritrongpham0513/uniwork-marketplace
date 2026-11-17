package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Entity ánh xạ bảng `student_profiles`.
 * PK = user_id (shared primary key với bảng users qua @MapsId).
 * avg_rating và rating_count được cập nhật trong tầng service (không dùng trigger).
 */
@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    /** PK đồng thời là FK tới users.id */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** ID công khai (string) — frontend dùng giá trị này làm `StudentProfile.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    /** Quan hệ 1-1 với User, dùng @MapsId để chia sẻ khóa chính */
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone", length = 15)
    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    /** M | F | OTHER */
    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "student_code", length = 20)
    private String studentCode;

    @Column(name = "university", length = 150)
    private String university;

    @Column(name = "major", length = 100)
    private String major;

    @Column(name = "year_of_study")
    private Short yearOfStudy;

    @Column(name = "province_id")
    private Short provinceId;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    /** Đường dẫn CV (PDF) */
    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    /**
     * Danh sách public id kỹ năng (skills.slug) — JSON.
     * Sinh viên có thể nhập kỹ năng tự do ngoài danh mục chuẩn.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skills", columnDefinition = "json")
    private List<String> skills;

    /**
     * Điểm trung bình đánh giá (1.00 – 5.00).
     * Được cập nhật trong tầng service (Java) sau mỗi lần đánh giá mới.
     */
    @Column(name = "avg_rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal avgRating = BigDecimal.ZERO;

    /** Số lượt đánh giá — cập nhật trong tầng service. */
    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

