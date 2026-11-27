package com.uniwork.service;

import com.uniwork.service.impl.MailServiceImpl;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Properties;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Unit test cho {@link MailServiceImpl}:
 * - Có RESEND_API_KEY: gửi qua Resend HTTP API (https://api.resend.com/emails), không gọi SMTP.
 * - Thiếu RESEND_FROM: fallback sang APP_MAIL_FROM.
 * - Resend trả lỗi 4xx/5xx: ghi log và không ném exception ra ngoài.
 * - Không có RESEND_API_KEY: fallback về JavaMailSender (SMTP).
 */
@ExtendWith(MockitoExtension.class)
class MailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    @Test
    @DisplayName("Có RESEND_API_KEY -> gửi POST /emails tới Resend kèm Bearer token và User-Agent")
    void sendVerificationEmail_UsesResend_WhenApiKeyConfigured() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer re_test_123"))
                .andExpect(header(HttpHeaders.USER_AGENT, "viejob-backend/1.0"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.from").value("VieJob Marketplace <onboarding@resend.dev>"))
                .andExpect(jsonPath("$.to[0]").value("student@example.com"))
                .andExpect(jsonPath("$.subject").value(containsString("Xác thực")))
                .andExpect(jsonPath("$.html").value(containsString("https://api.example.com/api/v1/auth/verify-email?token=tok123")))
                .andRespond(withSuccess("{\"id\":\"email_1\"}", MediaType.APPLICATION_JSON));

        MailServiceImpl service = new MailServiceImpl(
                mailSender,
                "VieJob Marketplace <no-reply@viejob.vn>",
                "https://api.example.com",
                "re_test_123",
                "VieJob Marketplace <onboarding@resend.dev>",
                builder
        );

        service.sendVerificationEmail("student@example.com", "Nguyễn Văn A", "tok123");

        server.verify();
        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("Có RESEND_API_KEY nhưng RESEND_FROM rỗng -> dùng APP_MAIL_FROM")
    void sendVerificationEmail_ResendFallsBackToAppMailFrom_WhenResendFromBlank() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.from").value("VieJob Marketplace <no-reply@viejob.vn>"))
                .andRespond(withSuccess("{\"id\":\"email_2\"}", MediaType.APPLICATION_JSON));

        MailServiceImpl service = new MailServiceImpl(
                mailSender,
                "VieJob Marketplace <no-reply@viejob.vn>",
                "http://localhost:8080",
                "re_test_123",
                "",
                builder
        );

        service.sendVerificationEmail("student@example.com", "Lan", "tok456");

        server.verify();
        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("Resend trả lỗi HTTP 403 -> không ném exception làm gián đoạn luồng đăng ký")
    void sendVerificationEmail_DoesNotThrow_WhenResendReturnsError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Domain not verified\"}"));

        MailServiceImpl service = new MailServiceImpl(
                mailSender,
                "VieJob Marketplace <no-reply@viejob.vn>",
                "http://localhost:8080",
                "re_test_123",
                "VieJob Marketplace <onboarding@resend.dev>",
                builder
        );

        assertDoesNotThrow(() ->
                service.sendVerificationEmail("student@example.com", "Lan", "tok789"));

        server.verify();
    }

    @Test
    @DisplayName("Không có RESEND_API_KEY -> fallback gửi qua JavaMailSender (SMTP)")
    void sendVerificationEmail_UsesSmtp_WhenResendApiKeyBlank() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        MailServiceImpl service = new MailServiceImpl(
                mailSender,
                "VieJob Marketplace <no-reply@viejob.vn>",
                "http://localhost:8080",
                "",
                "",
                RestClient.builder()
        );

        service.sendVerificationEmail("student@example.com", "Minh", "tok000");

        verify(mailSender, times(1)).send(mimeMessage);
    }
}
