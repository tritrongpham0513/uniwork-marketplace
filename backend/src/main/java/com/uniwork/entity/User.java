package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Entity ánh xạ bảng `users`.
 * Implement UserDetails để tích hợp Spring Security.
 * KHÔNG map cột virtual `active_email` (GENERATED column trong MySQL).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /** Mật khẩu đã băm BCrypt cost=10, không lưu plain text */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    /**
     * Trạng thái tài khoản: PENDING_VERIFY | ACTIVE | LOCKED | DELETED.
     * Mặc định khi đăng ký là PENDING_VERIFY (cần xác thực qua email).
     */
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING_VERIFY";

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    /** Nhà cung cấp xác thực: LOCAL | GOOGLE */
    @Column(name = "auth_provider", nullable = false, length = 10)
    @Builder.Default
    private String authProvider = "LOCAL";

    /** Google Subject ID (sub) dùng để liên kết tài khoản Google */
    @Column(name = "google_sub", length = 64, unique = true)
    private String googleSub;

    @Column(name = "failed_login_count")
    @Builder.Default
    private Short failedLoginCount = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // ----------------------------------------------------------------
    // Quan hệ 1-1 sang profile — lazy để tránh N+1
    // ----------------------------------------------------------------

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private StudentProfile studentProfile;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private EmployerProfile employerProfile;

    // ----------------------------------------------------------------
    // Lifecycle hooks
    // ----------------------------------------------------------------

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ----------------------------------------------------------------
    // UserDetails — Spring Security interface
    // ----------------------------------------------------------------

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring Security mặc định cần tiền tố "ROLE_"
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    /** Spring Security dùng email làm username */
    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        // Cho phép qua bước xác thực credentials để AuthService kiểm tra mật khẩu trước,
        // sau đó mới kiểm tra trạng thái LOCKED nhằm trả đúng mã 403 theo yêu cầu SRS.
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Cho phép qua bước xác thực credentials để AuthService kiểm tra mật khẩu trước,
        // sau đó mới kiểm tra trạng thái PENDING_VERIFY trả đúng mã 403 EMAIL_NOT_VERIFIED.
        return deletedAt == null;
    }
}

