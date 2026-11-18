package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cập nhật trạng thái đơn ứng tuyển (nhà tuyển dụng) —
 * khớp 100% với `UpdateApplicationPayload` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateApplicationStatusRequest {

    /** PENDING | SHORTLISTED | ACCEPTED | COMPLETED | REJECTED | WITHDRAWN */
    private String status;

    /** Ghi chú của nhà tuyển dụng */
    private String note;
}
