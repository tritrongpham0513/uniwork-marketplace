package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tuỳ chọn "Bật thông báo" của sinh viên.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobNotifyPreferenceResponse {

    /** Public id của tuỳ chọn. */
    private String id;

    /** Mã nhóm việc. */
    private String categoryCode;

    /** Tên nhóm việc (để frontend hiển thị). */
    private String categoryName;

    /** Mã tỉnh — {@code "ALL"} nghĩa là mọi tỉnh. */
    private String provinceCode;

    /** Tên tỉnh (để frontend hiển thị). */
    private String provinceName;

    /** Thời điểm bật. */
    private String createdAt;
}
