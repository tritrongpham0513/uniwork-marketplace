package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity ánh xạ bảng `student_job_preferences` — mục tiêu việc làm của sinh viên.
 *
 * PK = student_id (chia sẻ với student_profiles.user_id).
 */
@Entity
@Table(name = "student_job_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentJobPreference {

    @Id
    @Column(name = "student_id")
    private Long studentId;

    /** Danh sách public id của nhóm việc (job_categories.code) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "category_ids", nullable = false, columnDefinition = "json")
    @Builder.Default
    private List<String> categoryIds = new ArrayList<>();

    /** PART_TIME | FULL_TIME | FLEXIBLE | CASUAL */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "employment_types", nullable = false, columnDefinition = "json")
    @Builder.Default
    private List<String> employmentTypes = new ArrayList<>();

    /** Danh sách public id của tỉnh (provinces.code) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "province_ids", nullable = false, columnDefinition = "json")
    @Builder.Default
    private List<String> provinceIds = new ArrayList<>();

    @Column(name = "salary_min", nullable = false)
    @Builder.Default
    private BigDecimal salaryMin = BigDecimal.ZERO;

    @Column(name = "salary_max", nullable = false)
    @Builder.Default
    private BigDecimal salaryMax = BigDecimal.ZERO;
}
