package com.uniwork.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cấu hình xử lý bất đồng bộ (@Async) cho tác vụ gửi email thông báo,
 * đảm bảo không làm nghẽn luồng xử lý HTTP request chính.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailTaskExecutor")
    public Executor mailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("MailAsync-");
        executor.initialize();
        return executor;
    }

    /**
     * Executor riêng cho tác vụ kiểm duyệt AI.
     *
     * <p>Tách khỏi {@code mailTaskExecutor}: lệnh gọi AI có thời gian chờ tới
     * 30 giây và bị giới hạn hạn mức — không nên tranh chấp hàng đợi với
     * tác vụ gửi email.
     */
    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("AiAsync-");
        executor.initialize();
        return executor;
    }
}

