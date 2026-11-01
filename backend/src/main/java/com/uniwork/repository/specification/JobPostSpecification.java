package com.uniwork.repository.specification;

import com.uniwork.entity.JobPost;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification hỗ trợ tìm kiếm và lọc đa tiêu chí cho tin tuyển dụng (FR-04, NFR-01).
 */
public class JobPostSpecification {

    public static Specification<JobPost> filterPublicJobs(
            String keyword,
            Short categoryId,
            Short provinceId,
            String workMode,
            String salaryType,
            BigDecimal minSalary
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy bài chưa xóa và trạng thái OPEN
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(root.get("status"), "OPEN"));

            // 2. Chưa hết hạn nộp hồ sơ (nếu có set deadline)
            predicates.add(cb.or(
                    cb.isNull(root.get("applicationDeadline")),
                    cb.greaterThanOrEqualTo(root.get("applicationDeadline"), LocalDateTime.now())
            ));

            // 3. Tìm theo từ khóa (tiêu đề hoặc mô tả)
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(titleLike, descLike));
            }

            // 4. Lọc theo danh mục
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            // 5. Lọc theo tỉnh/thành
            if (provinceId != null) {
                predicates.add(cb.equal(root.get("provinceId"), provinceId));
            }

            // 6. Lọc theo hình thức làm việc (ONSITE / REMOTE / HYBRID)
            if (workMode != null && !workMode.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("workMode"), workMode.trim()));
            }

            // 7. Lọc theo hình thức lương (HOURLY / DAILY...)
            if (salaryType != null && !salaryType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("salaryType"), salaryType.trim()));
            }

            // 8. Lọc theo mức lương tối thiểu
            if (minSalary != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("salaryMin"), minSalary));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

