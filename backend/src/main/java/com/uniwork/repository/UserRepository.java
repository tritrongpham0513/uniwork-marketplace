package com.uniwork.repository;

import com.uniwork.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
    10| * Repository cho bảng `users`.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /** Tìm user theo email (dùng cho login và UserDetailsService) */
    Optional<User> findByEmail(String email);

    /** Kiểm tra email đã tồn tại chưa (dùng khi đăng ký) */
    boolean existsByEmail(String email);

    /**
     * Lấy toàn bộ user đang hoạt động theo mã vai trò.
     *
     * <p>Dùng để gửi thông báo tới nhóm người dùng (ví dụ mọi quản trị viên
     * khi có tin tuyển dụng mới chờ duyệt).
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.role.code = :roleCode
              AND u.deletedAt IS NULL
            """)
    List<User> findByRoleCode(@Param("roleCode") String roleCode);
}
