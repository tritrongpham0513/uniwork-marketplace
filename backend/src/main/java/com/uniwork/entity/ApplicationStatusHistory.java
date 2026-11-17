package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `application_status_history` — timeline trạng thái của đơn ứng tuyển.
 */
@Entity
@Table(name = "application_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "from_status", length = 12)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 12)
    private String toStatus;

    /** Người thực hiện thay đổi (user_id) */
    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "changed_at", nullable = false)
    @Builder.Default
    private LocalDateTime changedAt = LocalDateTime.now();
}
