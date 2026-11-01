package com.uniwork.config;

import com.uniwork.entity.Role;
import com.uniwork.entity.User;
import com.uniwork.repository.RoleRepository;
import com.uniwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Khởi tạo dữ liệu hệ thống thiết yếu (Roles bắt buộc và Admin theo cấu hình môi trường).
 * Tuyệt đối không hardcode mật khẩu hay email Admin trong mã nguồn (chuẩn OWASP Top 10).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-email:}")
    private String adminEmail;

    @Value("${app.admin.initial-password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        initRoles();
        initAdminUser();
    }

    /**
     * Khởi tạo 3 vai trò danh mục nền tảng (STUDENT, EMPLOYER, ADMIN)
     * Đây là master data bắt buộc để ràng buộc khóa ngoại users.role_id.
     */
    private void initRoles() {
        if (roleRepository.count() == 0) {
            log.info("Khởi tạo danh sách vai trò mặc định (STUDENT, EMPLOYER, ADMIN)...");
            roleRepository.saveAll(List.of(
                    new Role(null, "STUDENT", "Sinh viên", "Sinh viên tìm việc part-time"),
                    new Role(null, "EMPLOYER", "Nhà tuyển dụng", "Doanh nghiệp hoặc cá nhân đăng tin"),
                    new Role(null, "ADMIN", "Quản trị viên", "Quản trị hệ thống UniWork")
            ));
        }
    }

    /**
     * Khởi tạo tài khoản Quản trị viên từ biến môi trường (nếu có cấu hình).
     * Tuyệt đối không tự sinh hoặc lưu cứng mật khẩu nếu không được cung cấp rõ ràng.
     */
    private void initAdminUser() {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("Không có cấu hình tài khoản Admin (ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD). Bỏ qua bước tạo Admin.");
            return;
        }

        String cleanEmail = adminEmail.trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isEmpty()) {
            roleRepository.findByCode("ADMIN").ifPresent(adminRole -> {
                log.info("Khởi tạo tài khoản Quản trị viên từ cấu hình môi trường: {}", cleanEmail);
                User admin = User.builder()
                        .email(cleanEmail)
                        .passwordHash(passwordEncoder.encode(adminPassword.trim()))
                        .role(adminRole)
                        .status("ACTIVE")
                        .emailVerifiedAt(LocalDateTime.now())
                        .build();
                userRepository.save(admin);
            });
        }
    }
}
