package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `job_categories`.
 */
@Entity
@Table(name = "job_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Short id;

    /** ID công khai (string) — frontend dùng giá trị này làm `JobCategory.id` */
    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private JobCategory parent;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 120)
    private String slug;

    @Column(name = "description", length = 255)
    private String description;

    /** Tên icon lucide-react dùng để render động (ví dụ "UtensilsCrossed") */
    @Column(name = "icon", nullable = false, length = 60)
    @Builder.Default
    private String icon = "Briefcase";

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Short sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

