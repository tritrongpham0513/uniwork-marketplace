package com.uniwork.security;

import com.uniwork.entity.User;
import com.uniwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Tiện ích lấy người dùng hiện tại từ SecurityContext.
 *
 * <p>Spring Security đặt {@code principal} là {@link User} (entity) sau khi
 * {@code JwtAuthenticationFilter} xác thực token thành công.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private final UserRepository userRepository;

    /** Lấy entity User hiện tại (rỗng nếu chưa đăng nhập). */
    @Transactional(readOnly = true)
    public Optional<User> findCurrent() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return Optional.of(user);
        }
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails details) {
            return userRepository.findByEmail(details.getUsername());
        }
        return Optional.empty();
    }

    /** Lấy id người dùng hiện tại (Long). */
    public Optional<Long> currentUserId() {
        return findCurrent().map(User::getId);
    }
}
