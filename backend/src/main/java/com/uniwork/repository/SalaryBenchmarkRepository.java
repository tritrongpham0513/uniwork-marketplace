package com.uniwork.repository;

import com.uniwork.entity.SalaryBenchmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `salary_benchmarks`.
 */
@Repository
public interface SalaryBenchmarkRepository extends JpaRepository<SalaryBenchmark, Long> {

    List<SalaryBenchmark> findByCategoryIdAndProvinceId(Short categoryId, Short provinceId);

    Optional<SalaryBenchmark> findByCategoryCodeAndProvinceCode(String categoryCode, String provinceCode);
}
