package com.uniwork.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình SpringDoc OpenAPI — Swagger UI tại /api/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("UniWork Marketplace API v1")
                        .version("1.1.0")
                        .description("Backend RESTful API v1 cho nền tảng UniWork Marketplace (Xác thực Email Gmail, Google OAuth, Profile, Jobs)"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Nhập JWT token nhận từ /api/v1/auth/login hoặc /api/v1/auth/google")));
    }
}

