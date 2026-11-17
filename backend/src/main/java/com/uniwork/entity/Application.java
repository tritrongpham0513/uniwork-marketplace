package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `applications` — đơn ứng tuyển.
 *
 * `slug` là ID công khai (string) mà frontend dùng (ví dụ "app-001").
 */
@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** ID công khai (string) — frontend dùng giá trị này làm `Application.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_post_id", nullable = false)
    private JobPost jobPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "expected_salary", precision = 12, scale = 0)
    private java.math.BigDecimal expectedSalary;

    /** PENDING | VIEWED | SHORTLISTED | ACCEPTED | COMPLETED | REJECTED | WITHDRAWN */
    @Column(name = "status", nullable = false, length = 12)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "employer_note", length = 500)
    private String employerNote;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    /** Kinh nghiệm liên quan do sinh viên khai báo khi ứng tuyển */
    @Column(name = "experience", columnDefinition = "TEXT")
    private String experience;

    /** Ngày có thể bắt đầu làm việc */
    @Column(name = "available_from")
    private LocalDate availableFrom;

    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    @Column(name = "cv_file_name", length = 255)
    private String cvFileName;

    @Column(name = "applied_at", nullable = false)
    @Builder.Default
    private LocalDateTime appliedAt = LocalDateTime.now();

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        appliedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
