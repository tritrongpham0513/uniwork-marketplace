package com.uniwork.config;

import com.uniwork.entity.User;
import com.uniwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Khởi tạo mật khẩu cho các tài khoản demo.
 *
 * <p>Migration {@code V3__seed_demo_data.sql} tạo sẵn người dùng với
 * {@code password_hash = 'SEED_PENDING'} (không phải hash BCrypt hợp lệ).
 * Component này chạy sau khi Flyway migrate xong và gán mật khẩu BCrypt
 * cho các tài khoản demo.
 *
 * <p>Mật khẩu được cấu hình qua biến môi trường, có giá trị mặc định
 * cho môi trường demo (docker compose).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoAccountInitializer implements CommandLineRunner {

    /** Marker trong DB cho tài khoản chưa được gán mật khẩu. */
    private static final String PENDING_HASH = "SEED_PENDING";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo.student-password:Student@123}")
    private String studentPassword;

    @Value("${app.demo.employer-password:Employer@123}")
    private String employerPassword;

    @Value("${app.demo.admin-password:Admin@123}")
    private String adminPassword;

    /** Email demo chính (khớp bảng tài khoản demo ở AGENTS.md). */
    private static final List<String> DEMO_EMAILS = List.of(
            "student@viejob.vn",
            "employer@viejob.vn",
            "admin@viejob.vn");

    @Override
    public void run(String... args) {
        List<User> pending = userRepository.findAll().stream()
                .filter(user -> PENDING_HASH.equals(user.getPasswordHash()))
                .toList();

        if (pending.isEmpty()) {
            log.info("Không có tài khoản nào cần gán mật khẩu demo.");
            return;
        }

        log.info("Đang gán mật khẩu demo cho {} tài khoản seed...", pending.size());

        for (User user : pending) {
            user.setPasswordHash(passwordEncoder.encode(resolvePassword(user)));
            user.setStatus("ACTIVE");
            if (user.getEmailVerifiedAt() == null) {
                user.setEmailVerifiedAt(java.time.LocalDateTime.now());
            }
            userRepository.save(user);
        }

        log.info("Đã gán mật khẩu demo cho {} tài khoản.", pending.size());
        log.info("Tài khoản demo chính: {} | {} | {}",
                "student@viejob.vn", "employer@viejob.vn", "admin@viejob.vn");
    }

    /**
     * Chọn mật khẩu theo vai trò.
     *
     * <p>Tài khoản demo chính dùng mật khẩu riêng theo vai trò;
     * các tài khoản NTD bổ sung sinh từ seed dùng mật khẩu chung của NTD.
     */
    private String resolvePassword(User user) {
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase();
        String role = user.getRole() != null ? user.getRole().getCode() : "STUDENT";

        if (DEMO_EMAILS.contains(email)) {
            return switch (role) {
                case "ADMIN" -> adminPassword;
                case "EMPLOYER" -> employerPassword;
                default -> studentPassword;
            };
        }

        return switch (role) {
            case "ADMIN" -> adminPassword;
            case "EMPLOYER" -> employerPassword;
            default -> studentPassword;
        };
    }

    /** Bảng mật khẩu mặc định theo vai trò — dùng để tra cứu nhanh. */
    public static Map<String, String> defaultPasswords() {
        return Map.of(
                "STUDENT", "Student@123",
                "EMPLOYER", "Employer@123",
                "ADMIN", "Admin@123");
    }
}
