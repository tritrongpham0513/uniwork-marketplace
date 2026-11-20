package com.uniwork.repository;

import com.uniwork.entity.WorkAssignment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `work_assignments` — kinh nghiệm làm việc của ứng viên.
 */
@Repository
public interface WorkAssignmentRepository extends JpaRepository<WorkAssignment, Long> {

    @EntityGraph(attributePaths = {"jobPost", "employer", "student"})
    List<WorkAssignment> findByStudentUserIdOrderByEndedAtDesc(Long studentUserId);

    @EntityGraph(attributePaths = {"jobPost", "employer", "student"})
    List<WorkAssignment> findByStudentUserIdAndStatusOrderByEndedAtDesc(Long studentUserId, String status);

    @EntityGraph(attributePaths = {"jobPost", "employer", "student"})
    Optional<WorkAssignment> findByApplicationId(Long applicationId);

    boolean existsByApplicationId(Long applicationId);
}
