package com.uniwork.repository;

import com.uniwork.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository cho bảng `users`.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /** Tìm user theo email (dùng cho login và UserDetailsService) */
    Optional<User> findByEmail(String email);

    /** Kiểm tra email đã tồn tại chưa (dùng khi đăng ký) */
    boolean existsByEmail(String email);
}

