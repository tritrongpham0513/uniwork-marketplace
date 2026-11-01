package com.uniwork.repository;

import com.uniwork.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository cho bảng `student_profiles`.
 * PK = user_id (Long).
 */
@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
}

