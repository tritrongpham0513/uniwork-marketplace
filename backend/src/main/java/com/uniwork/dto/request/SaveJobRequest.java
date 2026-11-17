package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lưu tin tuyển dụng — body `{ "jobId": "..." }`.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveJobRequest {

    /** Public id của tin tuyển dụng */
    private String jobId;
}
