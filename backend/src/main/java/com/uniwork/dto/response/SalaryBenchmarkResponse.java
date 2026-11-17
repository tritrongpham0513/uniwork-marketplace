package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Xếp hạng lương theo nhóm việc × tỉnh — khớp 100% với `SalaryBenchmark` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryBenchmarkResponse {

    /** Public id của nhóm việc */
    private String categoryId;

    /** Public id của tỉnh */
    private String provinceId;

    private Integer avgHourly;

    private Integer minHourly;

    private Integer maxHourly;

    private Integer sampleSize;

    private String updatedAt;
}
