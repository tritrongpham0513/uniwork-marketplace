package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `user_tokens`.
 * Dùng lưu mã hash SHA-256 cho tác vụ xác thực email (EMAIL_VERIFY) hoặc quên mật khẩu (PASSWORD_RESET).
 * Tuyệt đối không lưu token gốc dạng plain text (bảo mật chuẩn OWASP).
 */
@Entity
@Table(name = "user_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** EMAIL_VERIFY | PASSWORD_RESET */
    @Column(name = "token_type", nullable = false, length = 20)
    private String tokenType;

    /** Giá trị băm SHA-256 (64 ký tự hex) */
    @Column(name = "token_hash", nullable = false, length = 64, unique = true, columnDefinition = "CHAR(64)")
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    /** Kiểm tra token đã hết hạn hay chưa */
    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    /** Kiểm tra token đã được sử dụng hay chưa */
    public boolean isUsed() {
        return usedAt != null;
    }
}

