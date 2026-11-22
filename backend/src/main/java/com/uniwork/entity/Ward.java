package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `wards` — đơn vị hành chính cấp xã/phường/đặc khu.
 *
 * <p>Từ 01/07/2025 Việt Nam bỏ cấp huyện (Quyết định 19/2025/QĐ-TTg) → cấu trúc
 * hành chính chỉ còn 2 cấp: tỉnh → xã/phường. Bảng {@code districts} (quận/huyện cũ)
 * vẫn được giữ để tra cứu địa chỉ lịch sử, nhưng cấp dùng chính là {@code wards}.
 *
 * <p>Mã đơn vị hành chính ({@code code}) là định danh duy nhất theo Quyết định
 * 19/2025/QĐ-TTg — 5 chữ số (ví dụ "00004" = Phường Ba Đình).
 */
@Entity
@Table(name = "wards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id", nullable = false)
    private Province province;

    /**
     * Mã đơn vị hành chính chính thức (5 chữ số) — frontend dùng giá trị này
     * làm {@code Ward.id} (ví dụ "00004").
     */
    @Column(name = "code", nullable = false, unique = true, length = 10)
    private String code;

    /** Tên đầy đủ (ví dụ "Phường Ba Đình"). */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** Tên ngắn (ví dụ "Ba Đình"). */
    @Column(name = "short_name", nullable = false, length = 100)
    private String shortName;

    /** Tên tiếng Anh (ví dụ "Ba Dinh"). */
    @Column(name = "name_en", length = 120)
    private String nameEn;

    /** Mã bưu chính. */
    @Column(name = "postal_code", length = 20)
    private String postalCode;

    /** Slug không dấu (ví dụ "ba_dinh"). */
    @Column(name = "slug", length = 120)
    private String slug;
}
