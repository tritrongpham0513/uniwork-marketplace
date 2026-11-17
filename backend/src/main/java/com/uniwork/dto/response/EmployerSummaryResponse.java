package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tóm tắt nhà tuyển dụng — khớp 100% với `EmployerSummary` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployerSummaryResponse {

    private String id;

    private String name;

    /** Màu avatar dạng token-safe: primary | secondary | muted | accent */
    private String logoVariant;

    private Boolean verified;
}
