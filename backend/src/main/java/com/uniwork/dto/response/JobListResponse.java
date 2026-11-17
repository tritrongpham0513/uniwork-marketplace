package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Danh sách tin tuyển dụng có phân trang — khớp 100% với `JobListResponse` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobListResponse {

    private List<JobResponse> items;

    private Integer totalItems;

    private Integer currentPage;

    private Integer totalPages;
}
