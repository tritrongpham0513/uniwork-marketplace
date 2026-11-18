package com.uniwork.service.impl;

import com.uniwork.dto.request.JobNotifyPreferenceRequest;
import com.uniwork.dto.response.JobNotifyPreferenceResponse;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobNotifyPreference;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Province;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobNotifyPreferenceRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.service.JobNotifyService;
import com.uniwork.service.NotificationService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Triển khai nghiệp vụ tuỳ chọn "Bật thông báo" cho tin tuyển dụng.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobNotifyServiceImpl implements JobNotifyService {

    /** Sentinel cho "theo dõi mọi tỉnh". */
    public static final String ALL_PROVINCES = "ALL";

    private final JobNotifyPreferenceRepository preferenceRepository;
    private final JobCategoryRepository jobCategoryRepository;
    private final ProvinceRepository provinceRepository;
    private final NotificationService notificationService;

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<JobNotifyPreferenceResponse> list(Long userId) {
        return preferenceRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ------------------------------------------------------------------
    // BẬT / TẮT
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public JobNotifyPreferenceResponse subscribe(Long userId, JobNotifyPreferenceRequest request) {
        if (request == null || request.getCategoryCode() == null || request.getCategoryCode().isBlank()) {
            throw ApiErrors.badRequest("Vui lòng chọn nhóm việc.",
                    ApiErrors.errors("categoryCode", "Vui lòng chọn nhóm việc"));
        }

        String categoryCode = request.getCategoryCode().trim();
        if (jobCategoryRepository.findByCode(categoryCode).isEmpty()) {
            throw ApiErrors.badRequest("Nhóm việc không tồn tại.",
                    ApiErrors.errors("categoryCode", "Nhóm việc không hợp lệ"));
        }

        String provinceCode = normalizeProvinceCode(request.getProvinceCode());
        if (!ALL_PROVINCES.equals(provinceCode) && provinceRepository.findByCode(provinceCode).isEmpty()) {
            throw ApiErrors.badRequest("Tỉnh không tồn tại.",
                    ApiErrors.errors("provinceCode", "Tỉnh không hợp lệ"));
        }

        JobNotifyPreference preference = preferenceRepository
                .findByUserIdAndCategoryCodeAndProvinceCode(userId, categoryCode, provinceCode)
                .orElseGet(() -> JobNotifyPreference.builder()
                        .userId(userId)
                        .categoryCode(categoryCode)
                        .provinceCode(provinceCode)
                        .createdAt(LocalDateTime.now())
                        .build());

        preference.setCreatedAt(LocalDateTime.now());
        JobNotifyPreference saved = preferenceRepository.save(preference);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void unsubscribe(Long userId, String categoryCode, String provinceCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            throw ApiErrors.badRequest("Vui lòng chọn nhóm việc.",
                    ApiErrors.errors("categoryCode", "Vui lòng chọn nhóm việc"));
        }

        String normalizedProvince = normalizeProvinceCode(provinceCode);
        preferenceRepository.deleteByUserIdAndCategoryCodeAndProvinceCode(
                userId, categoryCode.trim(), normalizedProvince);
    }

    // ------------------------------------------------------------------
    // ĐẨY THÔNG BÁO
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public void notifySubscribers(JobPost job) {
        if (job == null || job.getCategory() == null) {
            return;
        }

        String categoryCode = job.getCategory().getCode();

        // Tỉnh của tin: mã tỉnh của tin + "ALL" (theo dõi mọi tỉnh)
        List<String> provinceCodes = new ArrayList<>();
        provinceCodes.add(ALL_PROVINCES);
        if (job.getProvince() != null && job.getProvince().getCode() != null) {
            provinceCodes.add(job.getProvince().getCode());
        }

        List<JobNotifyPreference> matched = preferenceRepository
                .findByCategoryCodeAndProvinceCodeIn(categoryCode, provinceCodes);

        if (matched.isEmpty()) {
            return;
        }

        String title = "Có tin tuyển dụng mới phù hợp";
        String body = "Tin '" + job.getTitle() + "' vừa được đăng và phù hợp với tuỳ chọn theo dõi của bạn.";
        String link = "/jobs/" + job.getSlug();

        for (JobNotifyPreference preference : matched) {
            try {
                notificationService.push(preference.getUserId(), "JOB", title, body, link);
            } catch (Exception e) {
                // Lỗi đẩy thông báo không được làm hỏng luồng duyệt tin.
                log.warn("Không gửi được thông báo tới userId={}", preference.getUserId(), e);
            }
        }
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    /** Chuẩn hoá mã tỉnh: null/rỗng → {@link #ALL_PROVINCES}. */
    private String normalizeProvinceCode(String provinceCode) {
        if (provinceCode == null || provinceCode.isBlank()) {
            return ALL_PROVINCES;
        }
        String trimmed = provinceCode.trim();
        if (ALL_PROVINCES.equalsIgnoreCase(trimmed) || "*".equals(trimmed)) {
            return ALL_PROVINCES;
        }
        return trimmed.toLowerCase();
    }

    private JobNotifyPreferenceResponse toResponse(JobNotifyPreference preference) {
        String categoryName = jobCategoryRepository.findByCode(preference.getCategoryCode())
                .map(JobCategory::getName)
                .orElse(preference.getCategoryCode());

        String provinceName = ALL_PROVINCES.equals(preference.getProvinceCode())
                ? "Tất cả tỉnh"
                : provinceRepository.findByCode(preference.getProvinceCode())
                .map(Province::getName)
                .orElse(preference.getProvinceCode());

        return JobNotifyPreferenceResponse.builder()
                .id("jnp-" + preference.getId())
                .categoryCode(preference.getCategoryCode())
                .categoryName(categoryName)
                .provinceCode(preference.getProvinceCode())
                .provinceName(provinceName)
                .createdAt(DateTimeUtils.toIso(preference.getCreatedAt()))
                .build();
    }
}
