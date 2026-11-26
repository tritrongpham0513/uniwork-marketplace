package com.uniwork.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Chọn nhà cung cấp AI theo cấu hình {@code app.ai.provider}.
 *
 * <p>Ý định (spec.md mục 5, ADR 0005): đổi nhà cung cấp AI chỉ cần
 * <b>thêm 1 hiện thực {@link AiProvider} + đổi biến môi trường</b> — không sửa
 * mã nghiệp vụ.
 *
 * <p>Cơ chế: mỗi hiện thực tự khai báo tên qua {@link AiProvider#name()}; quản
 * lý này tra cứu theo tên. Nhà cung cấp được cấu hình không tồn tại thì báo lỗi
 * cấu hình rõ ràng, không âm thầm gọi nhầm nhà cung cấp khác.
 */
@Slf4j
@Component
public class AiProviderRegistry {

    private final List<AiProvider> providers;
    private final String configuredProvider;

    public AiProviderRegistry(
            List<AiProvider> providers,
            @Value("${app.ai.provider:gemini}") String configuredProvider) {

        this.providers = List.copyOf(providers);
        this.configuredProvider = configuredProvider == null || configuredProvider.isBlank()
                ? "gemini"
                : configuredProvider.trim().toLowerCase();
    }

    /**
     * Nhà cung cấp đang được cấu hình.
     *
     * @throws AiProviderException nếu cấu hình trỏ tới hiện thực không có trong
     *                             ứng dụng (lỗi cấu hình, không phải lỗi dịch vụ)
     */
    public AiProvider resolve() {
        for (AiProvider provider : providers) {
            if (provider.name().equalsIgnoreCase(configuredProvider)) {
                return provider;
            }
        }

        String available = providers.stream().map(AiProvider::name).reduce((a, b) -> a + ", " + b)
                .orElse("(khong co)");
        log.error("Cau hinh app.ai.provider={} khong co hien thuc tuong ung. San co: {}",
                configuredProvider, available);
        throw new AiProviderException("NOT_CONFIGURED",
                "Tinh nang kiem duyet AI chua duoc cau hinh.");
    }

    /** Tên nhà cung cấp đang được cấu hình — trả về cho frontend. */
    public String configuredName() {
        return configuredProvider;
    }
}
