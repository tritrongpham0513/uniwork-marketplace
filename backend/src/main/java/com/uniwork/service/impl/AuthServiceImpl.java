package com.uniwork.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.uniwork.dto.request.GoogleLoginRequest;
import com.uniwork.dto.request.LoginRequest;
import com.uniwork.dto.request.RegisterRequest;
import com.uniwork.dto.response.AuthResponse;
import com.uniwork.dto.response.GoogleAuthResponse;
import com.uniwork.dto.response.UserSummaryResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.Role;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.entity.UserToken;
import com.uniwork.exception.AppException;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.RoleRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.UserTokenRepository;
import com.uniwork.security.GoogleTokenVerifierService;
import com.uniwork.security.JwtService;
import com.uniwork.service.AuthService;
import com.uniwork.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Triển khai nghiệp vụ xác thực người dùng v1:
 * - Đăng ký email/mật khẩu + tạo hồ sơ + gửi mail xác thực qua Gmail SMTP bất đồng bộ
 * - Xác thực email bằng token một lần (hạn 24 giờ, hash SHA-256)
 * - Gửi lại email xác thực (chống spam 60s)
 * - Đăng nhập email/mật khẩu (kiểm tra mật khẩu trước, xét PENDING_VERIFY/LOCKED)
 * - Đăng nhập Google OAuth2 (xác thực token phía server, hỗ trợ chọn role)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EmployerProfileRepository employerProfileRepository;
    private final UserTokenRepository userTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final GoogleTokenVerifierService googleTokenVerifierService;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Instant> resendRateLimitMap = new ConcurrentHashMap<>();

    // ----------------------------------------------------------------
    // 1. ĐĂNG KÝ TÀI KHOẢN (POST /api/v1/auth/register)
    // ----------------------------------------------------------------
    @Override
    @Transactional
    public void register(RegisterRequest req) {
        // 1.1 Kiểm tra mật khẩu khớp ô xác nhận
        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new AppException("Mật khẩu và xác nhận mật khẩu không khớp", HttpStatus.BAD_REQUEST, "PASSWORDS_NOT_MATCH");
        }

        // 1.2 Chặn tuyệt đối việc đăng ký vai trò ADMIN
        if ("ADMIN".equalsIgnoreCase(req.getRole())) {
            throw new AppException("Không được phép đăng ký vai trò Quản trị viên", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }

        // 1.3 Kiểm tra email trùng
        if (userRepository.existsByEmail(req.getEmail().trim().toLowerCase())) {
            throw new AppException("Email này đã được sử dụng trên hệ thống. Vui lòng chọn email khác hoặc Đăng nhập",
                    HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS");
        }

        // 1.4 Lấy Role từ CSDL
        Role role = roleRepository.findByCode(req.getRole().toUpperCase())
                .orElseThrow(() -> new AppException("Vai trò không hợp lệ", HttpStatus.BAD_REQUEST, "INVALID_ROLE"));

        // 1.5 Tạo tài khoản User (PENDING_VERIFY)
        User user = User.builder()
                .email(req.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(role)
                .status("PENDING_VERIFY")
                .authProvider("LOCAL")
                .build();
        user = userRepository.save(user);

        // 1.6 Tạo dòng hồ sơ tương ứng trong CÙNG transaction
        if ("STUDENT".equals(role.getCode())) {
            StudentProfile sp = StudentProfile.builder()
                    .user(user)
                    .fullName(req.getFullName().trim())
                    .build();
            studentProfileRepository.save(sp);
        } else if ("EMPLOYER".equals(role.getCode())) {
            String empType = (req.getEmployerType() != null && !req.getEmployerType().isBlank())
                    ? req.getEmployerType() : "COMPANY";
            EmployerProfile ep = EmployerProfile.builder()
                    .user(user)
                    .displayName(req.getFullName().trim())
                    .employerType(empType)
                    .build();
            employerProfileRepository.save(ep);
        }

        // 1.7 Tạo token ngẫu nhiên an toàn (>= 32 bytes base64url)
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        // 1.8 CHỈ lưu SHA-256 hex vào user_tokens, hạn 24 giờ
        UserToken userToken = UserToken.builder()
                .user(user)
                .tokenType("EMAIL_VERIFY")
                .tokenHash(sha256Hex(rawToken))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        userTokenRepository.save(userToken);

        // 1.9 Gửi email kích hoạt bất đồng bộ qua Gmail SMTP
        mailService.sendVerificationEmail(user.getEmail(), req.getFullName().trim(), rawToken);
    }

    // ----------------------------------------------------------------
    // 2. XÁC THỰC EMAIL (GET/POST /api/v1/auth/verify-email)
    // ----------------------------------------------------------------
    @Override
    @Transactional
    public void verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            throw new AppException("Mã token xác thực không hợp lệ", HttpStatus.BAD_REQUEST, "INVALID_TOKEN");
        }

        String hash = sha256Hex(rawToken.trim());
        UserToken token = userTokenRepository.findByTokenHashAndTokenType(hash, "EMAIL_VERIFY")
                .orElseThrow(() -> new AppException("Mã xác thực không tồn tại hoặc không hợp lệ.", HttpStatus.BAD_REQUEST, "TOKEN_NOT_FOUND"));

        if (token.isUsed()) {
            throw new AppException("Liên kết xác thực này đã được sử dụng trước đó.", HttpStatus.BAD_REQUEST, "TOKEN_ALREADY_USED");
        }

        if (token.isExpired()) {
            throw new AppException("Liên kết xác thực đã hết hạn (quá 24 giờ). Vui lòng yêu cầu gửi lại email mới.",
                    HttpStatus.BAD_REQUEST, "TOKEN_EXPIRED");
        }

        // Đánh dấu token đã sử dụng
        token.setUsedAt(LocalDateTime.now());
        userTokenRepository.save(token);

        // Kích hoạt tài khoản người dùng
        User user = token.getUser();
        user.setStatus("ACTIVE");
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Xác thực email thành công cho tài khoản: {}", user.getEmail());
    }

    // ----------------------------------------------------------------
    // 3. GỬI LẠI EMAIL XÁC THỰC (POST /api/v1/auth/resend-verification)
    // ----------------------------------------------------------------
    @Override
    @Transactional
    public void resendVerification(String email) {
        String cleanEmail = email.trim().toLowerCase();

        // 3.1 Kiểm tra giới hạn 60s cho mỗi email (vượt -> 429)
        Instant lastSent = resendRateLimitMap.get(cleanEmail);
        if (lastSent != null && Duration.between(lastSent, Instant.now()).getSeconds() < 60) {
            throw new AppException("Vui lòng đợi 60 giây trước khi yêu cầu gửi lại email xác thực.",
                    HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS");
        }
        resendRateLimitMap.put(cleanEmail, Instant.now());

        // 3.2 Tìm user (không lộ thông tin ra ngoài nếu email không tồn tại)
        userRepository.findByEmail(cleanEmail).ifPresent(user -> {
            if ("PENDING_VERIFY".equals(user.getStatus())) {
                // Vô hiệu hóa các token cũ chưa sử dụng
                List<UserToken> oldTokens = userTokenRepository.findByUserIdAndTokenTypeAndUsedAtIsNull(user.getId(), "EMAIL_VERIFY");
                for (UserToken ot : oldTokens) {
                    ot.setUsedAt(LocalDateTime.now());
                }
                userTokenRepository.saveAll(oldTokens);

                // Tạo token mới
                byte[] tokenBytes = new byte[32];
                secureRandom.nextBytes(tokenBytes);
                String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

                UserToken newToken = UserToken.builder()
                        .user(user)
                        .tokenType("EMAIL_VERIFY")
                        .tokenHash(sha256Hex(rawToken))
                        .expiresAt(LocalDateTime.now().plusHours(24))
                        .build();
                userTokenRepository.save(newToken);

                // Lấy tên người dùng
                String name = user.getEmail();
                if ("STUDENT".equals(user.getRole().getCode())) {
                    name = studentProfileRepository.findById(user.getId()).map(StudentProfile::getFullName).orElse(name);
                } else if ("EMPLOYER".equals(user.getRole().getCode())) {
                    name = employerProfileRepository.findById(user.getId()).map(EmployerProfile::getDisplayName).orElse(name);
                }

                mailService.sendVerificationEmail(user.getEmail(), name, rawToken);
            }
        });
    }

    // ----------------------------------------------------------------
    // 4. ĐĂNG NHẬP EMAIL / MẬT KHẨU (POST /api/v1/auth/login)
    // ----------------------------------------------------------------
    @Override
    @Transactional
    public AuthResponse login(LoginRequest req) {
        String cleanEmail = req.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new AppException("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
                        HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        // 4.1 Kiểm tra mật khẩu TRƯỚC (không tiết lộ sai trường nào)
        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            user.setFailedLoginCount(user.getFailedLoginCount() != null ? (short) (user.getFailedLoginCount() + 1) : (short) 1);
            userRepository.save(user);
            throw new AppException("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        // 4.2 Kiểm tra trạng thái tài khoản SAU khi mật khẩu đúng
        if ("LOCKED".equals(user.getStatus())) {
            throw new AppException("Tài khoản của bạn đã bị khóa do vi phạm quy chế. Vui lòng liên hệ Quản trị viên để được hỗ trợ",
                    HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED");
        }

        if ("PENDING_VERIFY".equals(user.getStatus())) {
            throw new AppException("Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác thực.",
                    HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED");
        }

        if ("DELETED".equals(user.getStatus()) || user.getDeletedAt() != null) {
            throw new AppException("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        // 4.3 Đăng nhập thành công -> cập nhật last_login_at và reset failed_login_count
        user.setLastLoginAt(LocalDateTime.now());
        user.setFailedLoginCount((short) 0);
        userRepository.save(user);

        // 4.4 Cấp JWT token (chứa userId, role, hạn 24 giờ)
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().getCode());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(86400L)
                .user(buildUserSummary(user))
                .build();
    }

    // ----------------------------------------------------------------
    // 5. ĐĂNG NHẬP GOOGLE OAUTH2 (POST /api/v1/auth/google)
    // ----------------------------------------------------------------
    @Override
    @Transactional
    public GoogleAuthResponse googleLogin(GoogleLoginRequest req) {
        // 5.1 Xác minh ID token từ Google
        GoogleIdToken.Payload payload = googleTokenVerifierService.verifyToken(req.getIdToken());
        String email = payload.getEmail().toLowerCase();
        String googleSub = payload.getSubject();
        String name = (String) payload.get("name");

        // 5.2 Kiểm tra email trong hệ thống
        var userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Nếu tài khoản bị khóa -> từ chối
            if ("LOCKED".equals(user.getStatus())) {
                throw new AppException("Tài khoản của bạn đã bị khóa do vi phạm quy chế. Vui lòng liên hệ Quản trị viên để được hỗ trợ",
                        HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED");
            }

            // Nếu user đang PENDING_VERIFY -> Google đã xác thực email nên kích hoạt luôn
            if ("PENDING_VERIFY".equals(user.getStatus())) {
                user.setStatus("ACTIVE");
                user.setEmailVerifiedAt(LocalDateTime.now());
            }

            if (user.getGoogleSub() == null) {
                user.setGoogleSub(googleSub);
            }

            user.setLastLoginAt(LocalDateTime.now());
            user.setFailedLoginCount((short) 0);
            userRepository.save(user);

            String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().getCode());

            return GoogleAuthResponse.builder()
                    .needsRole(false)
                    .accessToken(token)
                    .tokenType("Bearer")
                    .expiresIn(86400L)
                    .user(buildUserSummary(user))
                    .build();

        } else {
            // Tài khoản chưa có trong hệ thống
            if (req.getRole() == null || req.getRole().isBlank()) {
                // Yêu cầu client hỏi người dùng chọn vai trò
                return GoogleAuthResponse.builder()
                        .needsRole(true)
                        .email(email)
                        .fullName(name)
                        .build();
            }

            // Client đã gửi role -> Tạo tài khoản mới
            String roleCode = req.getRole().toUpperCase();
            if ("ADMIN".equals(roleCode)) {
                throw new AppException("Không được phép tạo vai trò Quản trị viên qua Google", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
            }

            Role role = roleRepository.findByCode(roleCode)
                    .orElseThrow(() -> new AppException("Vai trò không hợp lệ", HttpStatus.BAD_REQUEST, "INVALID_ROLE"));

            // Tài khoản Google không có mật khẩu -> băm chuỗi UUID ngẫu nhiên không ai biết
            String randomPass = UUID.randomUUID().toString() + UUID.randomUUID();
            User newUser = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(randomPass))
                    .role(role)
                    .status("ACTIVE")
                    .emailVerifiedAt(LocalDateTime.now())
                    .authProvider("GOOGLE")
                    .googleSub(googleSub)
                    .lastLoginAt(LocalDateTime.now())
                    .build();
            newUser = userRepository.save(newUser);

            // Tạo hồ sơ tương ứng
            String displayName = (name != null && !name.isBlank()) ? name : "Người dùng Google";
            if ("STUDENT".equals(role.getCode())) {
                studentProfileRepository.save(StudentProfile.builder().user(newUser).fullName(displayName).build());
            } else if ("EMPLOYER".equals(role.getCode())) {
                employerProfileRepository.save(EmployerProfile.builder().user(newUser).displayName(displayName).employerType("INDIVIDUAL").build());
            }

            String token = jwtService.generateToken(newUser.getId(), newUser.getEmail(), newUser.getRole().getCode());

            return GoogleAuthResponse.builder()
                    .needsRole(false)
                    .accessToken(token)
                    .tokenType("Bearer")
                    .expiresIn(86400L)
                    .user(buildUserSummary(newUser))
                    .build();
        }
    }

    // ----------------------------------------------------------------
    // 6. LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI (GET /api/v1/auth/me)
    // ----------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public UserSummaryResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("Người dùng không tồn tại", HttpStatus.UNAUTHORIZED));
        return buildUserSummary(user);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Lỗi thuật toán SHA-256", e);
        }
    }

    private UserSummaryResponse buildUserSummary(User user) {
        String fullName = null;
        if ("STUDENT".equals(user.getRole().getCode())) {
            fullName = studentProfileRepository.findById(user.getId()).map(StudentProfile::getFullName).orElse(null);
        } else if ("EMPLOYER".equals(user.getRole().getCode())) {
            fullName = employerProfileRepository.findById(user.getId()).map(EmployerProfile::getDisplayName).orElse(null);
        }

        return UserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole().getCode())
                .fullName(fullName)
                .status(user.getStatus())
                .emailVerifiedAt(user.getEmailVerifiedAt())
                .authProvider(user.getAuthProvider())
                .build();
    }
}
