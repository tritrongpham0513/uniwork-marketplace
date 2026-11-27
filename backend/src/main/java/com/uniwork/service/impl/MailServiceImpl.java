package com.uniwork.service.impl;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.service.MailService;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Triển khai MailService:
 * - Nếu cấu hình {@code RESEND_API_KEY}: gửi qua Resend HTTP API (cổng 443),
 *   tránh bị PaaS gói miễn phí (như Render Free) chặn cổng SMTP 25/465/587.
 * - Ngược lại: fallback về {@link JavaMailSender} (Gmail SMTP) cho môi trường dev/local.
 *
 * <p>Chạy bất đồng bộ (@Async với thread pool mailTaskExecutor); lỗi gửi mail được
 * ghi log chi tiết và không làm gián đoạn transaction đăng ký tài khoản.
 */
@Service
@Slf4j
public class MailServiceImpl implements MailService {

    private static final String RESEND_API_BASE_URL = "https://api.resend.com";
    private static final Duration RESEND_TIMEOUT = Duration.ofSeconds(10);
    private static final String VERIFY_EMAIL_SUBJECT = "[VieJob Marketplace] Xác thực địa chỉ email tài khoản";

    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final String baseUrl;
    private final String resendApiKey;
    private final String resendFrom;
    private final RestClient resendRestClient;

    @Autowired
    public MailServiceImpl(
            JavaMailSender mailSender,
            @Value("${app.mail.from:UniWork Marketplace <no-reply@uniwork.vn>}") String mailFrom,
            @Value("${app.base-url:http://localhost:8080}") String baseUrl,
            @Value("${app.mail.resend-api-key:}") String resendApiKey,
            @Value("${app.mail.resend-from:}") String resendFrom) {
        this(mailSender, mailFrom, baseUrl, resendApiKey, resendFrom, defaultResendRestClientBuilder());
    }

    /** Constructor dành cho unit test để tiêm {@link RestClient.Builder} giả lập HTTP. */
    public MailServiceImpl(
            JavaMailSender mailSender,
            String mailFrom,
            String baseUrl,
            String resendApiKey,
            String resendFrom,
            RestClient.Builder restClientBuilder) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.baseUrl = baseUrl;
        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.resendFrom = resendFrom == null ? "" : resendFrom.trim();
        this.resendRestClient = restClientBuilder
                .baseUrl(RESEND_API_BASE_URL)
                .build();
    }

    private static RestClient.Builder defaultResendRestClientBuilder() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(RESEND_TIMEOUT);
        requestFactory.setReadTimeout(RESEND_TIMEOUT);
        return RestClient.builder().requestFactory(requestFactory);
    }

    @Override
    @Async("mailTaskExecutor")
    public void sendVerificationEmail(String toEmail, String fullName, String rawToken) {
        String verifyUrl = baseUrl + ApiEndpoints.V1_AUTH + "/verify-email?token=" + rawToken;
        String htmlContent = buildVerificationEmailHtml(fullName, verifyUrl);

        if (!resendApiKey.isEmpty()) {
            sendViaResend(toEmail, VERIFY_EMAIL_SUBJECT, htmlContent);
            return;
        }
        sendViaSmtp(toEmail, VERIFY_EMAIL_SUBJECT, htmlContent);
    }

    private void sendViaResend(String toEmail, String subject, String htmlContent) {
        String fromAddress = resendFrom.isEmpty() ? mailFrom : resendFrom;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("from", fromAddress);
        body.put("to", List.of(toEmail));
        body.put("subject", subject);
        body.put("html", htmlContent);

        try {
            resendRestClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    // Resend yêu cầu header User-Agent hợp lệ (thiếu có thể bị chặn 403).
                    .header("User-Agent", "viejob-backend/1.0")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Đã gửi email xác thực qua Resend thành công tới: {}", toEmail);
        } catch (RestClientResponseException ex) {
            log.error("Resend từ chối gửi email tới {} (HTTP {}): {}",
                    toEmail, ex.getStatusCode().value(), ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Gặp sự cố khi gửi email qua Resend tới {}: {}", toEmail, ex.getMessage());
        }
    }

    private void sendViaSmtp(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Đã gửi email xác thực qua SMTP thành công tới: {}", toEmail);
        } catch (Exception ex) {
            log.error("Gặp sự cố khi gửi email qua SMTP tới {}: {}", toEmail, ex.getMessage());
            // Theo yêu cầu: Lỗi gửi mail không được làm hỏng quá trình đăng ký tài khoản
        }
    }

    private String buildVerificationEmailHtml(String fullName, String verifyUrl) {
        return "<!DOCTYPE html>"
                + "<html lang=\"vi\">"
                + "<head><meta charset=\"UTF-8\"><title>Xác thực tài khoản</title></head>"
                + "<body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                + "  <div style=\"border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;\">"
                + "    <h2 style=\"color: #1a73e8; margin-top: 0;\">Chào mừng bạn đến với VieJob!</h2>"
                + "    <p>Xin chào <strong>" + escapeHtml(fullName) + "</strong>,</p>"
                + "    <p>Cảm ơn bạn đã đăng ký tài khoản trên nền tảng VieJob Marketplace. Để hoàn tất đăng ký và kích hoạt tài khoản, vui lòng nhấn vào nút bên dưới:</p>"
                + "    <div style=\"text-align: center; margin: 30px 0;\">"
                + "      <a href=\"" + verifyUrl + "\" style=\"background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;\">"
                + "        Xác thực tài khoản của tôi"
                + "      </a>"
                + "    </div>"
                + "    <p style=\"font-size: 14px; color: #666;\">Hoặc bạn có thể sao chép liên kết sau vào trình duyệt:<br>"
                + "      <a href=\"" + verifyUrl + "\" style=\"color: #1a73e8; word-break: break-all;\">" + verifyUrl + "</a>"
                + "    </p>"
                + "    <p style=\"font-size: 14px; color: #888;\">Liên kết này có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>"
                + "    <hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\">"
                + "    <p style=\"font-size: 12px; color: #999; text-align: center;\">VieJob Marketplace - Nền tảng việc làm part-time cho sinh viên</p>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
