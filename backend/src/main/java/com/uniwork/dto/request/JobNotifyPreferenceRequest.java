package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Yêu cầu bật/tắt thông báo tin tuyển dụng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobNotifyPreferenceRequest {

    /** Mã nhóm việc (public id, ví dụ "cat-fnb"). */
    private String categoryCode;

    /**
     * Mã tỉnh (public id, ví dụ "hcm").
     *
     * <p>Bỏ trống hoặc gửi {@code "ALL"} để theo dõi tin ở mọi tỉnh.
     */
    private String provinceCode;
}
