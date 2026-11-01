package com.uniwork.repository;

import com.uniwork.entity.JobCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobCategoryRepository extends JpaRepository<JobCategory, Short> {

    List<JobCategory> findByIsActiveTrueOrderBySortOrderAsc();

    Optional<JobCategory> findBySlug(String slug);
}

