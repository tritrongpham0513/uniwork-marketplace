package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `provinces`.
 */
@Entity
@Table(name = "provinces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Province {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Short id;

    /**
     * Mã công khai (string) — frontend dùng giá trị này làm `Province.id`
     * (ví dụ "hcm"). Đồng thời là mã tỉnh kiểu "HCM".
     */
    @Column(name = "code", nullable = false, unique = true, length = 10)
    private String code;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;
}

