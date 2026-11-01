package com.uniwork.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.GoogleLoginRequest;
import com.uniwork.dto.request.LoginRequest;
import com.uniwork.dto.request.RegisterRequest;
import com.uniwork.dto.request.ResendVerificationRequest;
import com.uniwork.dto.request.VerifyEmailRequest;
import com.uniwork.dto.response.AuthResponse;
import com.uniwork.dto.response.GoogleAuthResponse;
import com.uniwork.dto.response.UserSummaryResponse;
import com.uniwork.exception.AppException;
import com.uniwork.exception.GlobalExceptionHandler;
import com.uniwork.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller Test cho AuthController v1 (/api/v1/auth).
 * Dùng MockMvc Standalone kiểm thử toàn diện 6 endpoint xác thực, mã HTTP và định dạng JSON/HTML.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register -> Thành công trả về 201 Created và thông điệp SRS")
    void register_Returns201Created() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("student@uniwork.vn")
                .fullName("Nguyễn Nam Khánh")
                .password("Password123")
                .confirmPassword("Password123")
                .role("STUDENT")
                .build();

        doNothing().when(authService).register(any(RegisterRequest.class));

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register với mật khẩu < 8 ký tự -> Trả về 400 Bad Request")
    void register_Returns400_WhenPasswordTooShort() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("student@uniwork.vn")
                .fullName("Nguyễn Nam Khánh")
                .password("123") // < 8 ký tự
                .confirmPassword("123")
                .role("STUDENT")
                .build();

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/auth/verify-email?token=valid -> Trả về HTML 200 OK Xác thực thành công")
    void verifyEmailHtml_Returns200Html() throws Exception {
        doNothing().when(authService).verifyEmail("valid-token");

        mockMvc.perform(get(ApiEndpoints.V1_AUTH + "/verify-email").param("token", "valid-token"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Xác thực email thành công!")));
    }

    @Test
    @DisplayName("GET /api/v1/auth/verify-email?token=invalid -> Trả về HTML 400 Báo lỗi")
    void verifyEmailHtml_Returns400Html_WhenInvalid() throws Exception {
        doThrow(new AppException("Mã xác thực không tồn tại hoặc không hợp lệ.", HttpStatus.BAD_REQUEST, "TOKEN_NOT_FOUND"))
                .when(authService).verifyEmail("bad-token");

        mockMvc.perform(get(ApiEndpoints.V1_AUTH + "/verify-email").param("token", "bad-token"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Xác thực không thành công")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/verify-email JSON -> Trả về 200 OK")
    void verifyEmailJson_Returns200Ok() throws Exception {
        VerifyEmailRequest req = new VerifyEmailRequest("token-12345");
        doNothing().when(authService).verifyEmail("token-12345");

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/auth/resend-verification -> Trả về 200 OK")
    void resendVerification_Returns200Ok() throws Exception {
        ResendVerificationRequest req = new ResendVerificationRequest("user@uniwork.vn");
        doNothing().when(authService).resendVerification("user@uniwork.vn");

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login -> Thành công trả về 200 OK, accessToken, tokenType Bearer, expiresIn 86400")
    void login_Returns200Ok() throws Exception {
        LoginRequest req = new LoginRequest("user@uniwork.vn", "Password123");

        UserSummaryResponse userSummary = UserSummaryResponse.builder()
                .id(1L)
                .email("user@uniwork.vn")
                .role("STUDENT")
                .fullName("Nguyễn Nam Khánh")
                .status("ACTIVE")
                .build();

        AuthResponse authRes = AuthResponse.builder()
                .accessToken("mock-jwt-token")
                .tokenType("Bearer")
                .expiresIn(86400L)
                .user(userSummary)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(authRes);

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock-jwt-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(86400))
                .andExpect(jsonPath("$.data.user.email").value("user@uniwork.vn"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/google -> Trả về 200 OK")
    void googleLogin_Returns200Ok() throws Exception {
        GoogleLoginRequest req = GoogleLoginRequest.builder().idToken("valid-id-token").build();

        GoogleAuthResponse googleRes = GoogleAuthResponse.builder()
                .needsRole(false)
                .accessToken("mock-google-token")
                .tokenType("Bearer")
                .expiresIn(86400L)
                .build();

        when(authService.googleLogin(any(GoogleLoginRequest.class))).thenReturn(googleRes);

        mockMvc.perform(post(ApiEndpoints.V1_AUTH + "/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock-google-token"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me với Authentication hợp lệ -> Trả về 200 OK")
    void getMe_Returns200Ok() throws Exception {
        UserSummaryResponse userSummary = UserSummaryResponse.builder()
                .id(1L)
                .email("me@uniwork.vn")
                .role("STUDENT")
                .fullName("Nguyễn Nam Khánh")
                .status("ACTIVE")
                .build();

        when(authService.getCurrentUser("me@uniwork.vn")).thenReturn(userSummary);

        UsernamePasswordAuthenticationToken principal = new UsernamePasswordAuthenticationToken(
                "me@uniwork.vn", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        mockMvc.perform(get(ApiEndpoints.V1_AUTH + "/me").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("me@uniwork.vn"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Nam Khánh"));
    }
}

