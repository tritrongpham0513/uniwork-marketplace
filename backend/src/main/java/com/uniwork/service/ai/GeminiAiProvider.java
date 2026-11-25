package com.uniwork.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Nhà cung cấp AI kiểm duyệt nội dung tin tuyển dụng — hiện thực Gemini.
 *
 * <p>Dùng {@link RestClient} của Spring (có sẵn) — KHÔNG thêm dependency SDK mới.
 * Ép hình dạng kết quả bằng {@code responseMimeType} + {@code responseSchema}
 * (CONTRACT.md mục 5.3).
 *
 * <p>Mọi lỗi đều được dịch thành {@link AiProviderException} với thông điệp
 * tiếng Việt — không để lỗi HTTP thô lọt ra ngoài thành lỗi 500.
 */
@Slf4j
@Component
public class GeminiAiProvider implements AiProvider {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

    /** Timeout gọi AI (CONTRACT.md mục 5.3). */
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final String apiKey;
    private final String model;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAiProvider(
            @Value("${app.ai.gemini-api-key:}") String apiKey,
            @Value("${app.ai.model:gemini-3.5-flash-lite}") String model,
            ObjectMapper objectMapper) {

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(TIMEOUT);
        requestFactory.setReadTimeout(TIMEOUT);
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public String name() {
        return "gemini";
    }

    @Override
    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    @Override
    public AiReviewResult review(AiReviewInput input) {
        if (apiKey.isEmpty()) {
            throw new AiProviderException("NOT_CONFIGURED",
                    "Tinh nang kiem duyet AI chua duoc cau hinh.");
        }

        String prompt = AiPromptBuilder.buildPrompt(input.getJobContent());
        Map<String, Object> body = buildRequestBody(prompt);

        String rawResponse;
        try {
            rawResponse = restClient.post()
                    .uri("/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException ex) {
            throw translateHttpError(ex);
        } catch (ResourceAccessException ex) {
            throw new AiProviderException("TIMEOUT",
                    "AI khong phan hoi trong thoi gian cho phep. Vui long thu lai sau.", ex);
        } catch (RuntimeException ex) {
            throw new AiProviderException("SERVICE_ERROR",
                    "Dich vu AI dang gap su co. Vui long thu lai sau.", ex);
        }

        return parseResult(rawResponse);
    }

    /** Dựng body request theo định dạng Gemini {@code generateContent}. */
    private Map<String, Object> buildRequestBody(String prompt) {
        Map<String, Object> part = new LinkedHashMap<>();
        part.put("text", prompt);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(part));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0);
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("responseSchema", AiPromptBuilder.responseSchema());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", generationConfig);
        return body;
    }

    /** Dịch lỗi HTTP của Gemini thành {@link AiProviderException} có thông điệp tiếng Việt. */
    private AiProviderException translateHttpError(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        if (status == 429) {
            return new AiProviderException("QUOTA_EXCEEDED",
                    "Da het han muc goi AI. Vui long thu lai sau.", ex);
        }
        if (status >= 400 && status < 500) {
            // 400/401/403: thường do khoá API sai hoặc model không hợp lệ.
            return new AiProviderException("NOT_CONFIGURED",
                    "Tinh nang kiem duyet AI chua duoc cau hinh.", ex);
        }
        return new AiProviderException("SERVICE_ERROR",
                "Dich vu AI dang gap su co. Vui long thu lai sau.", ex);
    }

    /** Bóc JSON trong {@code candidates[0].content.parts[0].text}. */
    private AiReviewResult parseResult(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new AiProviderException("SERVICE_ERROR",
                    "Dich vu AI dang gap su co. Vui long thu lai sau.");
        }

        String text = extractCandidateText(rawResponse);
        if (text == null) {
            throw new AiProviderException("SERVICE_ERROR",
                    "Dich vu AI dang gap su co. Vui long thu lai sau.");
        }

        try {
            JsonNode root = objectMapper.readTree(text);
            String verdict = root.path("verdict").asText(null);
            String summary = root.path("summary").asText("");
            List<AiReason> reasons = new ArrayList<>();

            JsonNode reasonsNode = root.path("reasons");
            if (reasonsNode.isArray()) {
                for (JsonNode reasonNode : reasonsNode) {
                    reasons.add(AiReason.builder()
                            .code(reasonNode.path("code").asText(null))
                            .evidence(reasonNode.path("evidence").asText(""))
                            .detail(reasonNode.path("detail").asText(""))
                            .build());
                }
            }

            return AiReviewResult.builder()
                    .verdict(verdict)
                    .summary(summary)
                    .reasons(reasons)
                    .build();
        } catch (Exception ex) {
            throw new AiProviderException("SERVICE_ERROR",
                    "Dich vu AI dang gap su co. Vui long thu lai sau.", ex);
        }
    }

    /** Bóc phần text đầu tiên trong candidate đầu tiên. */
    private String extractCandidateText(String rawResponse) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return null;
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                return null;
            }
            return parts.get(0).path("text").asText(null);
        } catch (Exception ex) {
            log.warn("Khong doc duoc phan hoi tu nha cung cap AI: {}", ex.getMessage());
            return null;
        }
    }
}
