package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `notifications` — thông báo trong ứng dụng.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** ID công khai (string) — frontend dùng giá trị này làm `Notification.id` */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** APPLICATION | APPLICATION_STATUS | JOB | REVIEW | SYSTEM */
    @Column(name = "type", nullable = false, length = 40)
    private String type;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "body", length = 500)
    private String body;

    @Column(name = "content", length = 500)
    private String content;

    @Column(name = "ref_type", length = 30)
    private String refType;

    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** Đường dẫn nội bộ để frontend điều hướng (ví dụ "/student/applications/app-001") */
    @Column(name = "link", length = 255)
    private String link;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
