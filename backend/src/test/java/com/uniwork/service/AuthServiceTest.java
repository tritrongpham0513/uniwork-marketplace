package com.uniwork.service;

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
import com.uniwork.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit Test toàn diện cho AuthService (v1):
 * - Đăng ký: tạo User (PENDING_VERIFY) + Profile, băm mật khẩu, mã hóa token SHA-256, gửi email async.
 * - Xác thực email: token đúng, token sai, token đã dùng, token hết hạn (sau 24h).
 * - Gửi lại email (Resend): giới hạn 60s -> 429 Too Many Requests.
 * - Đăng nhập: sai mật khẩu -> 401, PENDING_VERIFY -> 403, LOCKED -> 403, ACTIVE -> 200 cấp JWT.
 * - Google Login: user cũ (active/pending/locked), user mới (needsRole / có role hợp lệ / chặn ADMIN).
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EmployerProfileRepository employerProfileRepository;

    @Mock
    private UserTokenRepository userTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private MailService mailService;

    @Mock
    private GoogleTokenVerifierService googleTokenVerifierService;

    @InjectMocks
    private AuthServiceImpl authService;

    private Role studentRole;
    private Role employerRole;

    @BeforeEach
    void setUp() {
        studentRole = new Role((short) 1, "STUDENT", "Sinh viên", null);
        employerRole = new Role((short) 2, "EMPLOYER", "Nhà tuyển dụng", null);
    }

    // ================================================================
    // A. TEST ĐĂNG KÝ (REGISTER)
    // ================================================================

    @Test
    @DisplayName("Đăng ký Sinh viên thành công -> status = PENDING_VERIFY, lưu token SHA-256, gửi mail")
    void register_Success_Student() {
        RegisterRequest req = RegisterRequest.builder()
                .email("student@uniwork.vn")
                .fullName("Nguyễn Nam Khánh")
                .password("Password123")
                .confirmPassword("Password123")
                .role("STUDENT")
                .build();

        when(userRepository.existsByEmail("student@uniwork.vn")).thenReturn(false);
        when(roleRepository.findByCode("STUDENT")).thenReturn(Optional.of(studentRole));
        when(passwordEncoder.encode(req.getPassword())).thenReturn("$2a$10$hashedPassword");

        User savedUser = User.builder()
                .id(1L)
                .email(req.getEmail())
                .role(studentRole)
                .status("PENDING_VERIFY")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        authService.register(req);

        verify(userRepository).save(argThat(user -> "PENDING_VERIFY".equals(user.getStatus()) && "LOCAL".equals(user.getAuthProvider())));
        verify(studentProfileRepository).save(any(StudentProfile.class));
        verify(userTokenRepository).save(argThat(token -> "EMAIL_VERIFY".equals(token.getTokenType()) && token.getTokenHash().length() == 64));
        verify(mailService).sendVerificationEmail(eq("student@uniwork.vn"), eq("Nguyễn Nam Khánh"), anyString());
    }

    @Test
    @DisplayName("Đăng ký với mật khẩu xác nhận không khớp -> Ném 400 PASSWORDS_NOT_MATCH")
    void register_ThrowsBadRequest_WhenPasswordsDoNotMatch() {
        RegisterRequest req = RegisterRequest.builder()
                .email("student@uniwork.vn")
                .fullName("Nguyễn Nam Khánh")
                .password("Password123")
                .confirmPassword("WrongPassword123")
                .role("STUDENT")
                .build();

        AppException ex = assertThrows(AppException.class, () -> authService.register(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("PASSWORDS_NOT_MATCH", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng ký với vai trò ADMIN -> Bị từ chối ném 400 INVALID_ROLE")
    void register_ThrowsBadRequest_WhenRoleAdmin() {
        RegisterRequest req = RegisterRequest.builder()
                .email("admin@uniwork.vn")
                .fullName("Admin")
                .password("Password123")
                .confirmPassword("Password123")
                .role("ADMIN")
                .build();

        AppException ex = assertThrows(AppException.class, () -> authService.register(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_ROLE", ex.getCode());
    }

    @Test
    @DisplayName("Đăng ký với email trùng lặp -> Ném 409 EMAIL_ALREADY_EXISTS với thông điệp SRS")
    void register_ThrowsConflict_WhenEmailAlreadyExists() {
        RegisterRequest req = RegisterRequest.builder()
                .email("duplicate@uniwork.vn")
                .fullName("User Test")
                .password("Password123")
                .confirmPassword("Password123")
                .role("STUDENT")
                .build();

        when(userRepository.existsByEmail("duplicate@uniwork.vn")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> authService.register(req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("Email này đã được sử dụng trên hệ thống. Vui lòng chọn email khác hoặc Đăng nhập", ex.getMessage());
    }

    // ================================================================
    // B. TEST XÁC THỰC EMAIL (VERIFY EMAIL)
    // ================================================================

    @Test
    @DisplayName("Xác thực email thành công -> user.status = ACTIVE, emailVerifiedAt và usedAt được ghi nhận")
    void verifyEmail_Success() {
        User user = User.builder().id(1L).email("sv@uniwork.vn").status("PENDING_VERIFY").build();
        UserToken token = UserToken.builder()
                .id(10L)
                .user(user)
                .tokenType("EMAIL_VERIFY")
                .tokenHash("sampleHash")
                .expiresAt(LocalDateTime.now().plusHours(12))
                .build();

        when(userTokenRepository.findByTokenHashAndTokenType(anyString(), eq("EMAIL_VERIFY"))).thenReturn(Optional.of(token));

        authService.verifyEmail("valid-raw-token");

        assertEquals("ACTIVE", user.getStatus());
        assertNotNull(user.getEmailVerifiedAt());
        assertNotNull(token.getUsedAt());
        verify(userRepository).save(user);
        verify(userTokenRepository).save(token);
    }

    @Test
    @DisplayName("Xác thực email với token không tồn tại -> Ném 400 TOKEN_NOT_FOUND")
    void verifyEmail_ThrowsBadRequest_WhenTokenNotFound() {
        when(userTokenRepository.findByTokenHashAndTokenType(anyString(), eq("EMAIL_VERIFY"))).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> authService.verifyEmail("invalid-token"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TOKEN_NOT_FOUND", ex.getCode());
    }

    @Test
    @DisplayName("Xác thực email với token đã dùng -> Ném 400 TOKEN_ALREADY_USED")
    void verifyEmail_ThrowsBadRequest_WhenTokenAlreadyUsed() {
        UserToken token = UserToken.builder()
                .usedAt(LocalDateTime.now().minusHours(1))
                .build();

        when(userTokenRepository.findByTokenHashAndTokenType(anyString(), eq("EMAIL_VERIFY"))).thenReturn(Optional.of(token));

        AppException ex = assertThrows(AppException.class, () -> authService.verifyEmail("already-used-token"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TOKEN_ALREADY_USED", ex.getCode());
    }

    @Test
    @DisplayName("Xác thực email với token hết hạn (quá 24 giờ) -> Ném 400 TOKEN_EXPIRED")
    void verifyEmail_ThrowsBadRequest_WhenTokenExpired() {
        UserToken token = UserToken.builder()
                .expiresAt(LocalDateTime.now().minusMinutes(5)) // Đã hết hạn
                .build();

        when(userTokenRepository.findByTokenHashAndTokenType(anyString(), eq("EMAIL_VERIFY"))).thenReturn(Optional.of(token));

        AppException ex = assertThrows(AppException.class, () -> authService.verifyEmail("expired-token"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TOKEN_EXPIRED", ex.getCode());
    }

    // ================================================================
    // C. TEST GỬI LẠI XÁC THỰC (RESEND RATE LIMIT)
    // ================================================================

    @Test
    @DisplayName("Gửi lại email lần 2 trước 60 giây -> Ném 429 TOO_MANY_REQUESTS")
    void resendVerification_RateLimit_Throws429() {
        String email = "rate.limit@uniwork.vn";
        User user = User.builder().id(2L).email(email).status("PENDING_VERIFY").role(studentRole).build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userTokenRepository.findByUserIdAndTokenTypeAndUsedAtIsNull(2L, "EMAIL_VERIFY")).thenReturn(Collections.emptyList());

        // Lần 1: Thành công
        assertDoesNotThrow(() -> authService.resendVerification(email));

        // Lần 2 ngay lập tức: Bị giới hạn 60s -> ném 429
        AppException ex = assertThrows(AppException.class, () -> authService.resendVerification(email));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertEquals("TOO_MANY_REQUESTS", ex.getCode());
        assertTrue(ex.getMessage().contains("60 giây"));
    }

    // ================================================================
    // D. TEST ĐĂNG NHẬP EMAIL / MẬT KHẨU (LOGIN & STATUS CHECK)
    // ================================================================

    @Test
    @DisplayName("Đăng nhập sai mật khẩu -> Ném 401 INVALID_CREDENTIALS với thông báo chung")
    void login_ThrowsUnauthorized_WhenWrongPassword() {
        LoginRequest req = new LoginRequest("user@uniwork.vn", "WrongPassword");
        User user = User.builder().id(1L).email(req.getEmail()).passwordHash("$2a$10$realHash").status("ACTIVE").build();

        when(userRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "$2a$10$realHash")).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> authService.login(req));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!", ex.getMessage());
    }

    @Test
    @DisplayName("Đăng nhập đúng mật khẩu nhưng status = PENDING_VERIFY -> Ném 403 EMAIL_NOT_VERIFIED")
    void login_ThrowsForbidden_WhenPendingVerify() {
        LoginRequest req = new LoginRequest("unverified@uniwork.vn", "Password123");
        User user = User.builder().id(1L).email(req.getEmail()).passwordHash("$2a$10$hash").status("PENDING_VERIFY").build();

        when(userRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "$2a$10$hash")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> authService.login(req));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("EMAIL_NOT_VERIFIED", ex.getCode());
        assertEquals("Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác thực.", ex.getMessage());
    }

    @Test
    @DisplayName("Đăng nhập đúng mật khẩu nhưng status = LOCKED -> Ném 403 ACCOUNT_LOCKED")
    void login_ThrowsForbidden_WhenLocked() {
        LoginRequest req = new LoginRequest("locked@uniwork.vn", "Password123");
        User user = User.builder().id(1L).email(req.getEmail()).passwordHash("$2a$10$hash").status("LOCKED").build();

        when(userRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "$2a$10$hash")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> authService.login(req));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals("Tài khoản của bạn đã bị khóa do vi phạm quy chế. Vui lòng liên hệ Quản trị viên để được hỗ trợ", ex.getMessage());
    }

    @Test
    @DisplayName("Đăng nhập thành công -> Trả về AuthResponse với accessToken, tokenType Bearer, expiresIn 86400")
    void login_Success() {
        LoginRequest req = new LoginRequest("active@uniwork.vn", "Password123");
        User user = User.builder().id(1L).email(req.getEmail()).passwordHash("$2a$10$hash").status("ACTIVE").role(studentRole).build();

        when(userRepository.findByEmail(req.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "$2a$10$hash")).thenReturn(true);
        when(jwtService.generateToken(1L, "active@uniwork.vn", "STUDENT")).thenReturn("mock-jwt-token");

        AuthResponse res = authService.login(req);

        assertNotNull(res);
        assertEquals("mock-jwt-token", res.getAccessToken());
        assertEquals("Bearer", res.getTokenType());
        assertEquals(86400L, res.getExpiresIn());
        assertNotNull(res.getUser());
        assertEquals("active@uniwork.vn", res.getUser().getEmail());
    }

    // ================================================================
    // E. TEST GOOGLE LOGIN
    // ================================================================

    @Test
    @DisplayName("Google Login: Tài khoản đã có trong hệ thống -> Trả về accessToken ngay")
    void googleLogin_Success_ExistingUser() {
        GoogleLoginRequest req = GoogleLoginRequest.builder().idToken("valid-id-token").build();

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("google.user@uniwork.vn");
        payload.setSubject("google-sub-12345");
        payload.set("name", "Google User");

        when(googleTokenVerifierService.verifyToken("valid-id-token")).thenReturn(payload);

        User existingUser = User.builder().id(10L).email("google.user@uniwork.vn").status("ACTIVE").role(studentRole).build();
        when(userRepository.findByEmail("google.user@uniwork.vn")).thenReturn(Optional.of(existingUser));
        when(jwtService.generateToken(10L, "google.user@uniwork.vn", "STUDENT")).thenReturn("google-jwt-token");

        GoogleAuthResponse res = authService.googleLogin(req);

        assertNotNull(res);
        assertFalse(res.getNeedsRole());
        assertEquals("google-jwt-token", res.getAccessToken());
    }

    @Test
    @DisplayName("Google Login: Email mới và chưa gửi role -> Trả về needsRole = true")
    void googleLogin_NewUser_NeedsRole_WhenRoleNotProvided() {
        GoogleLoginRequest req = GoogleLoginRequest.builder().idToken("valid-id-token").build();

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("new.google@uniwork.vn");
        payload.setSubject("google-sub-99999");
        payload.set("name", "New Student");

        when(googleTokenVerifierService.verifyToken("valid-id-token")).thenReturn(payload);
        when(userRepository.findByEmail("new.google@uniwork.vn")).thenReturn(Optional.empty());

        GoogleAuthResponse res = authService.googleLogin(req);

        assertNotNull(res);
        assertTrue(res.getNeedsRole());
        assertEquals("new.google@uniwork.vn", res.getEmail());
        assertEquals("New Student", res.getFullName());
        assertNull(res.getAccessToken());
    }

    @Test
    @DisplayName("Google Login: Email mới có gửi role STUDENT -> Tạo User ACTIVE + StudentProfile và cấp JWT")
    void googleLogin_NewUser_Success_WhenRoleProvided() {
        GoogleLoginRequest req = GoogleLoginRequest.builder().idToken("valid-id-token").role("STUDENT").build();

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("new.student@uniwork.vn");
        payload.setSubject("google-sub-77777");
        payload.set("name", "Tran Van B");

        when(googleTokenVerifierService.verifyToken("valid-id-token")).thenReturn(payload);
        when(userRepository.findByEmail("new.student@uniwork.vn")).thenReturn(Optional.empty());
        when(roleRepository.findByCode("STUDENT")).thenReturn(Optional.of(studentRole));
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$randomHash");

        User savedUser = User.builder().id(20L).email("new.student@uniwork.vn").status("ACTIVE").role(studentRole).build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(20L, "new.student@uniwork.vn", "STUDENT")).thenReturn("new-user-jwt");

        GoogleAuthResponse res = authService.googleLogin(req);

        assertNotNull(res);
        assertFalse(res.getNeedsRole());
        assertEquals("new-user-jwt", res.getAccessToken());
        verify(studentProfileRepository).save(any(StudentProfile.class));
    }

    @Test
    @DisplayName("Google Login: Email mới cố tình chọn role ADMIN -> Ném 400 INVALID_ROLE")
    void googleLogin_NewUser_ThrowsBadRequest_WhenRoleAdmin() {
        GoogleLoginRequest req = GoogleLoginRequest.builder().idToken("valid-id-token").role("ADMIN").build();

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("attacker@uniwork.vn");
        payload.setSubject("google-sub-hacker");

        when(googleTokenVerifierService.verifyToken("valid-id-token")).thenReturn(payload);
        when(userRepository.findByEmail("attacker@uniwork.vn")).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> authService.googleLogin(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_ROLE", ex.getCode());
    }

    @Test
    @DisplayName("Lấy thông tin tài khoản hiện tại (getCurrentUser) thành công")
    void getCurrentUser_Success() {
        User user = User.builder().id(1L).email("user@uniwork.vn").status("ACTIVE").role(studentRole).build();
        when(userRepository.findByEmail("user@uniwork.vn")).thenReturn(Optional.of(user));

        UserSummaryResponse res = authService.getCurrentUser("user@uniwork.vn");
        assertNotNull(res);
        assertEquals("user@uniwork.vn", res.getEmail());
        assertEquals("STUDENT", res.getRole());
    }
}
