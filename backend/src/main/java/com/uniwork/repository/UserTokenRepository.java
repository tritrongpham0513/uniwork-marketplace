package com.uniwork.repository;

import com.uniwork.entity.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `user_tokens`.
 */
@Repository
public interface UserTokenRepository extends JpaRepository<UserToken, Long> {

    /** Tìm token theo giá trị băm SHA-256 và loại token */
    Optional<UserToken> findByTokenHashAndTokenType(String tokenHash, String tokenType);

    /** Tìm danh sách token chưa dùng của một người dùng theo loại */
    List<UserToken> findByUserIdAndTokenTypeAndUsedAtIsNull(Long userId, String tokenType);
}

