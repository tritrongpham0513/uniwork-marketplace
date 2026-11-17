package com.uniwork.repository;

import com.uniwork.entity.StudentJobPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho bảng `student_job_preferences`.
 */
@Repository
public interface StudentJobPreferenceRepository extends JpaRepository<StudentJobPreference, Long> {

    Optional<StudentJobPreference> findByStudentId(Long studentId);
}
