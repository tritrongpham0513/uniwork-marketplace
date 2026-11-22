package com.uniwork.repository;

import com.uniwork.entity.JobPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository quản lý tin tuyển dụng.
 * Kế thừa JpaSpecificationExecutor để hỗ trợ bộ lọc đa tiêu chí (NFR-01).
 * Dùng @EntityGraph để chống lỗi N+1 Query.
 */
@Repository
public interface JobPostRepository extends JpaRepository<JobPost, Long>, JpaSpecificationExecutor<JobPost> {

    @Override
    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    Page<JobPost> findAll(Specification<JobPost> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    Optional<JobPost> findByIdAndDeletedAtIsNull(Long id);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    Optional<JobPost> findBySlugAndDeletedAtIsNull(String slug);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    Optional<JobPost> findByIdAndEmployerUserIdAndDeletedAtIsNull(Long id, Long employerId);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    List<JobPost> findByEmployerUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long employerId);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    List<JobPost> findByEmployerUserIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(Long employerUserId, String status);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    List<JobPost> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status);

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    List<JobPost> findAllByDeletedAtIsNull();

    @EntityGraph(attributePaths = {"employer", "category", "position", "province", "district", "ward"})
    List<JobPost> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    long countByStatusAndDeletedAtIsNull(String status);
}
