package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `employer_profiles`.
 * PK = user_id (shared primary key với bảng users qua @MapsId).
 * avg_rating và rating_count được cập nhật tự động bởi trigger sp_refresh_rating — không sửa trực tiếp.
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
     * DO trigger sp_refresh_rating tính — insertable=false, updatable=false.
     */
    @Column(name = "avg_rating", precision = 3, scale = 2, insertable = false, updatable = false)
    private BigDecimal avgRating;

    /**
     * Số lượt đánh giá.
     * DO trigger sp_refresh_rating cập nhật — insertable=false, updatable=false.
     */
    @Column(name = "rating_count", insertable = false, updatable = false)
    private Integer ratingCount;

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

