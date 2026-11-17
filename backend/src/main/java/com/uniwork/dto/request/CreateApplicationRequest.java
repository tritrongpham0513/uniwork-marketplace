package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nộp đơn ứng tuyển — khớp 100% với `CreateApplicationPayload` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateApplicationRequest {

    /** Public id của tin tuyển dụng */
    private String jobId;

    private String cvUrl;

    private String cvFileName;

    private String coverLetter;

    private Integer expectedSalary;

    /** Kinh nghiệm liên quan */
    private String experience;

    /** Ngày có thể bắt đầu làm việc (ISO date) */
    private String availableFrom;
}
