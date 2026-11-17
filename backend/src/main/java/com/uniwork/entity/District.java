package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `districts`.
 */
@Entity
@Table(name = "districts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class District {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id", nullable = false)
    private Province province;

    /**
     * Mã công khai (string) — frontend dùng giá trị này làm `District.id`
     * (ví dụ "q1").
     */
    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;
}

