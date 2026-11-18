package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng {@code job_notify_preferences} — tuỳ chọn "Bật thông báo"
 * của sinh viên theo nhóm việc × tỉnh.
 *
 * <p>Khi có tin tuyển dụng mới được duyệt khớp nhóm việc + tỉnh, các sinh viên
 * đăng ký tuỳ chọn này sẽ nhận được thông báo.
 */
@Entity
@Table(name = "job_notify_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobNotifyPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Mã nhóm việc (public id, ví dụ "cat-fnb"). */
    @Column(name = "category_code", nullable = false, length = 40)
    private String categoryCode;

    /** Mã tỉnh (public id, ví dụ "hcm") — {@code "ALL"} nghĩa là mọi tỉnh. */
    @Column(name = "province_code", nullable = false, length = 40)
    private String provinceCode;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
