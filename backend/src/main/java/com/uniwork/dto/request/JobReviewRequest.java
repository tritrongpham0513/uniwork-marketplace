package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Duyệt / từ chối tin tuyển dụng (quản trị).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobReviewRequest {

    /** APPROVE | REJECT */
    private String action;

    /** Lý do từ chối */
    private String reason;
}
