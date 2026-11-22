package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Xã / phường / đặc khu — khớp 100% với `Ward` của frontend.
 *
 * <p>Từ 01/07/2025 cấp huyện bị bỏ (Quyết định 19/2025/QĐ-TTg) → đây là cấp
 * hành chính dưới cấp tỉnh.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WardResponse {

    /** Mã đơn vị hành chính chính thức (5 chữ số, ví dụ "00004"). */
    private String id;

    /** Mã tỉnh (2 chữ số, ví dụ "01"). */
    private String provinceId;

    /** Tên đầy đủ (ví dụ "Phường Ba Đình"). */
    private String name;

    /** Tên ngắn (ví dụ "Ba Đình"). */
    private String shortName;

    /** Slug không dấu (ví dụ "ba_dinh"). */
    private String slug;
}
