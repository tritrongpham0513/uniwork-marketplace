package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bước trong timeline đơn ứng tuyển — khớp 100% với `ApplicationStatusEvent` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationStatusEventResponse {

    private String status;

    private String at;

    private String note;
}
