package com.uniwork.repository;

import com.uniwork.entity.JobPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `job_positions`.
 */
@Repository
public interface JobPositionRepository extends JpaRepository<JobPosition, Integer> {

    List<JobPosition> findByIsActiveTrueOrderBySortOrderAsc();

    List<JobPosition> findByCategoryIdOrderBySortOrderAsc(Short categoryId);

    Optional<JobPosition> findByCode(String code);
}
