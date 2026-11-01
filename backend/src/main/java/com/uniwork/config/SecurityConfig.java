package com.uniwork.config;

import com.uniwork.constant.ApiEndpoints;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Cấu hình bảo mật Spring Security 6:
 * - Stateless session (JWT HMAC-SHA256)
 * - Public: Các endpoint xác thực (/api/v1/auth/** trừ /me), tin việc làm công khai, master data, Swagger UI
 * - Protected: /api/v1/auth/me yêu cầu Bearer token
 * - RBAC: Phân quyền theo ROLE_STUDENT, ROLE_EMPLOYER, ROLE_ADMIN
 * - CORS: Cấu hình linh hoạt qua biến môi trường
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                // 1. Endpoint /auth/me bắt buộc phải có Bearer token hợp lệ
                .requestMatchers(ApiEndpoints.V1_AUTH + "/me").authenticated()

                // 2. Các endpoint xác thực còn lại là Public
                .requestMatchers(ApiEndpoints.V1_AUTH + "/**").permitAll()

                // 3. Tin việc làm công khai & Master data
                .requestMatchers(HttpMethod.GET, ApiEndpoints.V1_PUBLIC_JOBS + "/**").permitAll()
                .requestMatchers(HttpMethod.GET, ApiEndpoints.V1_PUBLIC_MASTER + "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/jobs/public/**", "/api/public/**").permitAll()

                // 4. Tài liệu Swagger / OpenAPI UI & Static Test Pages
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/api-docs/**",
                    "/*.html",
                    "/static/**",
                    "/error"
                ).permitAll()

                // 5. RBAC theo vai trò
                .requestMatchers(ApiEndpoints.V1_STUDENT + "/**", "/api/student/**").hasRole("STUDENT")
                .requestMatchers(ApiEndpoints.V1_EMPLOYER + "/**", "/api/employer/**").hasRole("EMPLOYER")
                .requestMatchers(ApiEndpoints.V1_ADMIN + "/**", "/api/admin/**").hasRole("ADMIN")

                // 6. Mọi request khác yêu cầu xác thực
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
