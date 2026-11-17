package com.uniwork.repository.specification;

import com.uniwork.entity.JobPost;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * JPA Specification hỗ trợ tìm kiếm và lọc đa tiêu chí cho tin tuyển dụng (FR-04, NFR-01).
 *
 * Mọi mức lương đều so sánh trên cột generated {@code salary_min_hourly} /
 * {@code salary_max_hourly} (đồng/giờ) để thống nhất với frontend.
 */
public class JobPostSpecification {

    /**
     * Bộ lọc đầy đủ cho {@code GET /api/v1/jobs/public}.
     *
     * @param status         trạng thái tin; null = chỉ lấy tin OPEN
     * @param employerUserId lọc theo nhà tuyển dụng (null = không lọc)
     * @param categoryCodes  public id của nhóm việc (job_categories.code)
     * @param positionCodes  public id của vị trí (job_positions.code)
     * @param provinceCodes  public id của tỉnh (provinces.code)
     * @param districtCodes  public id của quận (districts.code)
     * @param employmentTypes loại hình làm việc
     * @param workModes      hình thức làm việc
     * @param salaryMin      mức lương tối thiểu (đồng/giờ)
     * @param salaryMax      mức lương tối đa (đồng/giờ)
     * @param keyword        từ khoá tìm kiếm
     */
    public static Specification<JobPost> filter(
            String status,
            Long employerUserId,
            Collection<String> categoryCodes,
            Collection<String> positionCodes,
            Collection<String> provinceCodes,
            Collection<String> districtCodes,
            Collection<String> employmentTypes,
            Collection<String> workModes,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String keyword
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy tin chưa xoá mềm
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Trạng thái tin
            if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
                if (employerUserId == null) {
                    predicates.add(cb.equal(root.get("status"), "OPEN"));
                }
            } else {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // 3. Chưa hết hạn nộp hồ sơ (nếu có set deadline)
            predicates.add(cb.or(
                    cb.isNull(root.get("applicationDeadline")),
                    cb.greaterThanOrEqualTo(root.get("applicationDeadline"), java.time.LocalDateTime.now())
            ));

            // 4. Nhà tuyển dụng
            if (employerUserId != null) {
                predicates.add(cb.equal(root.get("employer").get("userId"), employerUserId));
            }

            // 5. Nhóm việc
            if (categoryCodes != null && !categoryCodes.isEmpty()) {
                predicates.add(root.get("category").get("code").in(categoryCodes));
            }

            // 6. Vị trí công việc
            if (positionCodes != null && !positionCodes.isEmpty()) {
                predicates.add(root.get("position").get("code").in(positionCodes));
            }

            // 7. Tỉnh / thành
            if (provinceCodes != null && !provinceCodes.isEmpty()) {
                predicates.add(root.get("province").get("code").in(provinceCodes));
            }

            // 8. Quận / huyện
            if (districtCodes != null && !districtCodes.isEmpty()) {
                predicates.add(root.get("district").get("code").in(districtCodes));
            }

            // 9. Loại hình làm việc
            if (employmentTypes != null && !employmentTypes.isEmpty()) {
                predicates.add(root.get("employmentType").in(employmentTypes));
            }

            // 10. Hình thức làm việc
            if (workModes != null && !workModes.isEmpty()) {
                predicates.add(root.get("workMode").in(workModes));
            }

            // 11. Khoảng lương (đồng/giờ). Tin "thỏa thuận" luôn lọc qua.
            if (salaryMin != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("salaryType"), "NEGOTIABLE"),
                        cb.greaterThanOrEqualTo(root.get("salaryMaxHourly"), salaryMin)
                ));
            }
            if (salaryMax != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("salaryType"), "NEGOTIABLE"),
                        cb.lessThanOrEqualTo(root.get("salaryMinHourly"), salaryMax)
                ));
            }

            // 12. Từ khoá — tiêu đề, mô tả, tên nhóm việc, tên vị trí
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.join("category").get("name")), pattern),
                        cb.like(cb.lower(root.join("position").get("name")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
