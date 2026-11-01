package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `job_posts`.
 * Quản lý tin tuyển dụng và vòng đời tin (FR-03).
 */
@Entity
@Table(name = "job_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_id", nullable = false)
    private EmployerProfile employer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private JobCategory category;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefits;

    /** ONSITE | REMOTE | HYBRID */
    @Column(name = "work_mode", nullable = false, length = 10)
    @Builder.Default
    private String workMode = "ONSITE";

    @Column(name = "province_id")
    private Short provinceId;

    @Column(name = "district_id")
    private Integer districtId;

    @Column(name = "address_detail", length = 255)
    private String addressDetail;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    @Column(name = "salary_type", nullable = false, length = 12)
    private String salaryType;

    @Column(name = "salary_min", precision = 12, scale = 0)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 0)
    private BigDecimal salaryMax;

    @Column(name = "salary_currency", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    @Builder.Default
    private String salaryCurrency = "VND";

    @Column(name = "positions_count", nullable = false)
    @Builder.Default
    private Short positionsCount = 1;

    @Column(name = "positions_filled", nullable = false)
    @Builder.Default
    private Short positionsFilled = 0;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "application_deadline")
    private LocalDateTime applicationDeadline;

    /**
     * Vòng đời tin: DRAFT | PENDING_REVIEW | OPEN | FILLED | IN_PROGRESS | COMPLETED | CLOSED | CANCELLED
     * Giả định thống nhất: Mặc định OPEN khi đăng (Admin hậu kiểm).
     */
    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "OPEN";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (publishedAt == null && "OPEN".equals(status)) {
            publishedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

