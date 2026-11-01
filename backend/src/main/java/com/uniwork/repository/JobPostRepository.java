package com.uniwork.repository;

import com.uniwork.entity.JobPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository quản lý tin tuyển dụng.
 * Kế thừa JpaSpecificationExecutor để hỗ trợ bộ lọc đa tiêu chí (NFR-01).
 * Dùng @EntityGraph để chống lỗi N+1 Query.
 */
@Repository
public interface JobPostRepository extends JpaRepository<JobPost, Long>, JpaSpecificationExecutor<JobPost> {

    @Override
    @EntityGraph(attributePaths = {"employer", "category"})
    Page<JobPost> findAll(Specification<JobPost> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"employer", "category"})
    Optional<JobPost> findByIdAndDeletedAtIsNull(Long id);

    @EntityGraph(attributePaths = {"employer", "category"})
    Optional<JobPost> findByIdAndEmployerUserIdAndDeletedAtIsNull(Long id, Long employerId);

    @EntityGraph(attributePaths = {"employer", "category"})
    Page<JobPost> findByEmployerUserIdAndDeletedAtIsNull(Long employerId, Pageable pageable);

    @EntityGraph(attributePaths = {"employer", "category"})
    Page<JobPost> findByEmployerUserIdAndStatusAndDeletedAtIsNull(Long employerId, String status, Pageable pageable);
}

