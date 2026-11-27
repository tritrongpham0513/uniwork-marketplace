package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.uniwork.service.ai.AiReason;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

    /** ID công khai (string) — frontend dùng giá trị này làm `Job.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_id", nullable = false)
    private EmployerProfile employer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private JobCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private JobPosition position;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /**
     * Ảnh preview của tin tuyển dụng — URL công khai tương đối
     * ({@code /api/v1/files/{slug}}).
     *
     * <p>Tuỳ chọn: khi {@code null} thẻ tin dùng logo của tổ chức, thiếu logo
     * thì dùng khối chữ cái. Cột lưu URL chứ không phải id — cùng cách lưu
     * {@code employer_profiles.logo_url}.
     */
    @Column(name = "preview_image_url", length = 500)
    private String previewImageUrl;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    /** Danh sách yêu cầu — lưu dạng JSON array */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "requirements", columnDefinition = "json")
    private List<String> requirements;

    /** Danh sách quyền lợi — lưu dạng JSON array */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "benefits", columnDefinition = "json")
    private List<String> benefits;

    /** ONSITE | REMOTE | HYBRID */
    @Column(name = "work_mode", nullable = false, length = 10)
    @Builder.Default
    private String workMode = "ONSITE";

    /** FULL_TIME | PART_TIME | FLEXIBLE | CASUAL */
    @Column(name = "employment_type", nullable = false, length = 20)
    @Builder.Default
    private String employmentType = "PART_TIME";

    @Column(name = "province_id")
    private Short provinceId;

    @Column(name = "district_id")
    private Integer districtId;

    /**
     * Đơn vị hành chính cấp xã/phường (cấp 2 từ 01/07/2025).
     * Song song với {@link #districtId} (quận/huyện cũ) để tương thích ngược.
     */
    @Column(name = "ward_id")
    private Integer wardId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id", insertable = false, updatable = false)
    private Province province;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", insertable = false, updatable = false)
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ward_id", insertable = false, updatable = false)
    private Ward ward;

    @Column(name = "address_detail", length = 255)
    private String addressDetail;

    /** Tên chi nhánh / địa điểm cụ thể */
    @Column(name = "branch_name", length = 150)
    private String branchName;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    @Column(name = "salary_type", nullable = false, length = 12)
    private String salaryType;

    @Column(name = "salary_min", precision = 12, scale = 0)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 0)
    private BigDecimal salaryMax;

    /**
     * Mức lương quy đổi về đồng/giờ (generated column ở MySQL).
     * Dùng để lọc & sắp xếp nhất quán bất kể tin trả lương theo đơn vị nào.
     */
    @Column(name = "salary_min_hourly", precision = 12, scale = 0, insertable = false, updatable = false)
    private BigDecimal salaryMinHourly;

    @Column(name = "salary_max_hourly", precision = 12, scale = 0, insertable = false, updatable = false)
    private BigDecimal salaryMaxHourly;

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

    /**
     * Kết quả kiểm duyệt AI — "OK" | "WARN" | "SUSPECT".
     *
     * <p>NULL nghĩa là <b>CHƯA KIỂM TRA</b> (chưa chạy hoặc chạy lỗi) — phải
     * phân biệt được với kết quả {@code OK}.
     */
    @Column(name = "ai_verdict", length = 10)
    private String aiVerdict;

    /** Danh sách lý do vi phạm kèm bằng chứng nguyên văn — lưu dạng JSON array. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_reasons", columnDefinition = "json")
    private List<AiReason> aiReasons;

    /**
     * Câu tóm tắt tiếng Việt của AI.
     *
     * <p>Lưu riêng (không dựng lại từ reasons) để kết quả kiểm tra nền và kết
     * quả kiểm tra thủ công có cùng hình dạng — quản trị viên xem được tóm tắt
     * trong cả hai trường hợp (spec.md mục 13, mục 18).
     */
    @Column(name = "ai_summary", length = 500)
    private String aiSummary;

    /** Thời điểm AI kiểm tra tin tuyển dụng. */
    @Column(name = "ai_checked_at")
    private LocalDateTime aiCheckedAt;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    /** Tin đánh dấu gấp — hiển thị nổi bật ở danh sách */
    @Column(name = "is_urgent", nullable = false)
    @Builder.Default
    private Boolean isUrgent = false;

    /** Số lượt ứng tuyển (denormalized để render nhanh danh sách) */
    @Column(name = "applicant_count", nullable = false)
    @Builder.Default
    private Integer applicantCount = 0;

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

