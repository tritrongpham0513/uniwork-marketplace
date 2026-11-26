package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng `employer_profiles`.
 * PK = user_id (shared primary key với bảng users qua @MapsId).
 * avg_rating và rating_count được cập nhật trong tầng service (không dùng trigger).
 */
@Entity
@Table(name = "employer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployerProfile {

    /** PK đồng thời là FK tới users.id */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** ID công khai (string) — frontend dùng giá trị này làm `EmployerProfile.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    /** Quan hệ 1-1 với User, dùng @MapsId để chia sẻ khóa chính */
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    /** Loại nhà tuyển dụng: COMPANY | INDIVIDUAL */
    @Column(name = "employer_type", nullable = false, length = 12)
    private String employerType;

    @Column(name = "display_name", nullable = false, length = 150)
    private String displayName;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    /**
     * Màu avatar dạng token-safe (primary | secondary | muted | accent).
     * Frontend dùng làm class nền nên không dùng hex thẳng.
     */
    @Column(name = "logo_variant", nullable = false, length = 16)
    @Builder.Default
    private String logoVariant = "primary";

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "province_id")
    private Short provinceId;

    @Column(name = "address", length = 255)
    private String address;

    /** Trạng thái xác minh doanh nghiệp — Admin duyệt thủ công */
    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /** ID của Admin đã xác minh (FK tới users.id) */
    @Column(name = "verified_by")
    private Long verifiedBy;

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
        if (slug == null || slug.isBlank()) {
            slug = "emp-" + UUID.randomUUID().toString().substring(0, 12);
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

