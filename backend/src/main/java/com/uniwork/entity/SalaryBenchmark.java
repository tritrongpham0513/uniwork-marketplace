package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng `salary_benchmarks` — xếp hạng lương theo nhóm việc × tỉnh.
 * Mọi mức lương đều quy về đồng/giờ để so sánh nhất quán.
 */
@Entity
@Table(name = "salary_benchmarks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryBenchmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private JobCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id", nullable = false)
    private Province province;

    @Column(name = "avg_hourly", nullable = false, precision = 12, scale = 0)
    private BigDecimal avgHourly;

    @Column(name = "min_hourly", nullable = false, precision = 12, scale = 0)
    private BigDecimal minHourly;

    @Column(name = "max_hourly", nullable = false, precision = 12, scale = 0)
    private BigDecimal maxHourly;

    @Column(name = "sample_size", nullable = false)
    @Builder.Default
    private Integer sampleSize = 0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
