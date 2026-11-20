package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `work_assignments` — kinh nghiệm làm việc của ứng viên
 * do hệ thống tự ghi nhận.
 *
 * <p>Mỗi đơn ứng tuyển chuyển sang {@code COMPLETED} sinh ra đúng 1 dòng
 * (ràng buộc UNIQUE {@code application_id}) nên việc ghi là idempotent.
 *
 * <p>Các trường {@code jobTitle} / {@code companyName} / {@code positionName} /
 * {@code salary*} là **snapshot** tại thời điểm hoàn thành — tin tuyển dụng có
 * thể bị sửa hoặc xoá sau này nhưng lịch sử làm việc phải giữ nguyên.
 */
@Entity
@Table(name = "work_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** ID công khai (string) — frontend dùng giá trị này làm `WorkHistory.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_post_id")
    private JobPost jobPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_id", nullable = false)
    private EmployerProfile employer;

    /** ONGOING | COMPLETED | CANCELLED */
    @Column(name = "status", nullable = false, length = 12)
    @Builder.Default
    private String status = "COMPLETED";

    /** Thời điểm sinh viên bắt đầu làm việc (lúc đơn chuyển ACCEPTED) */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Thời điểm hoàn thành công việc */
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /** Thời điểm nhà tuyển dụng xác nhận hoàn thành */
    @Column(name = "employer_confirmed_at")
    private LocalDateTime employerConfirmedAt;

    @Column(name = "student_confirmed_at")
    private LocalDateTime studentConfirmedAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "cancelled_by")
    private Long cancelledBy;

    // ------------------------------------------------------------------
    // Snapshot tại thời điểm hoàn thành
    // ------------------------------------------------------------------

    /** Tên tin tuyển dụng lúc hoàn thành */
    @Column(name = "job_title", length = 200)
    private String jobTitle;

    /** Tên nhà tuyển dụng lúc hoàn thành */
    @Column(name = "company_name", length = 150)
    private String companyName;

    /** Chức danh lúc hoàn thành */
    @Column(name = "position_name", length = 150)
    private String positionName;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    @Column(name = "salary_type", length = 12)
    private String salaryType;

    @Column(name = "salary_min", precision = 12, scale = 0)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 0)
    private BigDecimal salaryMax;

    /** Ghi chú của nhà tuyển dụng khi đánh dấu hoàn thành */
    @Column(name = "note", length = 500)
    private String note;

    /** Điểm đánh giá (1–5) — điền sau khi sinh viên / NTD đánh giá */
    @Column(name = "rating")
    private Short rating;

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
