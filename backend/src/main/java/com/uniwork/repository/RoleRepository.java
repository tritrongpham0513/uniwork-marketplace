package com.uniwork.repository;

import com.uniwork.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho bảng `roles`.
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Short> {

    /** Tìm role theo mã: STUDENT | EMPLOYER | ADMIN */
    Optional<Role> findByCode(String code);
}

