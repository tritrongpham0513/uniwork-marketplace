package com.uniwork.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.uniwork.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;

/**
 * Service xác minh Google OAuth2 ID Token phía máy chủ bằng GoogleIdTokenVerifier.
 * Kiểm tra nghiêm ngặt: audience, issuer (accounts.google.com) và email_verified.
 */
@Service
@Slf4j
public class GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(
            @Value("${app.google.client-id:your-google-client-id.apps.googleusercontent.com}") String clientId
    ) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(clientId))
                .setIssuers(Arrays.asList("accounts.google.com", "https://accounts.google.com"))
                .build();
    }

    /**
     * Xác minh ID Token và trả về thông tin Payload của Google.
     * Ném AppException 401 nếu token không hợp lệ, hết hạn hoặc email chưa được Google xác thực.
     */
    public GoogleIdToken.Payload verifyToken(String idTokenString) {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                log.warn("Google ID Token không hợp lệ hoặc đã hết hạn.");
                throw new AppException("Google ID Token không hợp lệ hoặc đã hết hạn.", HttpStatus.UNAUTHORIZED);
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            Boolean emailVerified = payload.getEmailVerified();
            if (emailVerified == null || !emailVerified) {
                log.warn("Tài khoản Google {} chưa được xác thực email.", payload.getEmail());
                throw new AppException("Tài khoản Google của bạn chưa được xác thực email.", HttpStatus.UNAUTHORIZED);
            }

            return payload;

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi xác minh Google ID Token: {}", e.getMessage());
            throw new AppException("Xác thực tài khoản Google thất bại. Vui lòng thử lại!", HttpStatus.UNAUTHORIZED);
        }
    }
}

