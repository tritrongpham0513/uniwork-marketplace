package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `job_positions` — vị trí công việc chi tiết, lồng trong nhóm việc.
 *
 * `code` là ID công khai (string) mà frontend dùng (ví dụ "pos-phuc-vu").
 */
@Entity
@Table(name = "job_positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    /** ID công khai (string) — frontend dùng giá trị này làm `JobPosition.id` */
    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private JobCategory category;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 140)
    private String slug;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Short sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
