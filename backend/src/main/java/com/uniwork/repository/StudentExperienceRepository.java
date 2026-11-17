package com.uniwork.repository;

import com.uniwork.entity.StudentExperience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository cho bảng `student_experiences`.
 */
@Repository
public interface StudentExperienceRepository extends JpaRepository<StudentExperience, Long> {

    List<StudentExperience> findByStudentUserIdOrderBySortOrderAsc(Long studentUserId);

    void deleteByStudentUserId(Long studentUserId);
}
