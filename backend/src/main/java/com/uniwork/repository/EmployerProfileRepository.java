package com.uniwork.repository;

import com.uniwork.entity.EmployerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository cho bảng `employer_profiles`.
 * PK = user_id (Long).
 */
@Repository
public interface EmployerProfileRepository extends JpaRepository<EmployerProfile, Long> {
}

