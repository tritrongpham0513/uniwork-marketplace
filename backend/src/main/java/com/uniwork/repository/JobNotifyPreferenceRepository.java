package com.uniwork.repository;

import com.uniwork.entity.JobNotifyPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository quản lý tuỳ chọn "Bật thông báo" của sinh viên.
 */
@Repository
public interface JobNotifyPreferenceRepository extends JpaRepository<JobNotifyPreference, Long> {

    List<JobNotifyPreference> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<JobNotifyPreference> findByUserIdAndCategoryCodeAndProvinceCode(
            Long userId, String categoryCode, String provinceCode);

    /**
     * Tìm các tuỳ chọn khớp với nhóm việc + tỉnh của tin tuyển dụng.
     *
     * <p>Khớp khi: cùng nhóm việc VÀ (tỉnh khớp HOẶC tuỳ chọn theo dõi mọi tỉnh).
     */
    List<JobNotifyPreference> findByCategoryCodeAndProvinceCodeIn(String categoryCode, List<String> provinceCodes);

    void deleteByUserIdAndCategoryCodeAndProvinceCode(Long userId, String categoryCode, String provinceCode);
}
