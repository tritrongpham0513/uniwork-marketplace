package com.uniwork.service.impl;

import com.uniwork.dto.request.AdminUpdateUserRequest;
import com.uniwork.dto.request.CategoryUpsertRequest;
import com.uniwork.dto.response.AdminDashboardResponse;
import com.uniwork.dto.response.AdminUserResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.Role;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.RoleRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.AdminService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Triển khai nghiệp vụ quản trị viên.
 */
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EmployerProfileRepository employerProfileRepository;
    private final JobCategoryRepository jobCategoryRepository;
    private final JobPostRepository jobPostRepository;
    private final ApplicationRepository applicationRepository;
    private final ReviewRepository reviewRepository;

    // ------------------------------------------------------------------
    // DASHBOARD
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard() {
        List<User> users = userRepository.findAll();

        long totalStudents = users.stream()
                .filter(u -> "STUDENT".equals(u.getRole().getCode())).count();
        long totalEmployers = users.stream()
                .filter(u -> "EMPLOYER".equals(u.getRole().getCode())).count();

        List<com.uniwork.entity.JobPost> jobs = jobPostRepository.findAllByDeletedAtIsNull();

        return AdminDashboardResponse.builder()
                .totalUsers((long) users.size())
                .totalStudents(totalStudents)
                .totalEmployers(totalEmployers)
                .totalJobs((long) jobs.size())
                .openJobs(jobs.stream().filter(j -> "OPEN".equals(j.getStatus())).count())
                .pendingJobs(jobs.stream().filter(j -> "PENDING_REVIEW".equals(j.getStatus())).count())
                .totalApplications(applicationRepository.count())
                .pendingApplications(applicationRepository.countByStatus("PENDING"))
                .hiddenReviews(reviewRepository.countByIsHiddenTrue())
                .categories((long) jobCategoryRepository.count())
                .build();
    }

    // ------------------------------------------------------------------
    // NGƯỜI DÙNG
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(String role, String keyword) {
        String cleanKeyword = keyword == null ? "" : keyword.trim().toLowerCase();

        return userRepository.findAll().stream()
                .map(this::toAdminUser)
                .filter(u -> {
                    if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
                        return role.equalsIgnoreCase(u.getRole());
                    }
                    return true;
                })
                .filter(u -> {
                    if (cleanKeyword.isEmpty()) {
                        return true;
                    }
                    String haystack = (u.getFullName() + " " + u.getEmail()).toLowerCase();
                    return haystack.contains(cleanKeyword);
                })
                .toList();
    }

    @Override
    @Transactional
    public AdminUserResponse updateUser(Long userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy người dùng."));

        if (request.getIsLocked() != null) {
            user.setStatus(request.getIsLocked() ? "LOCKED" : "ACTIVE");
            user.setLockedUntil(request.getIsLocked() ? LocalDateTime.now().plusYears(100) : null);
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            Role role = roleRepository.findByCode(request.getRole().toUpperCase())
                    .orElseThrow(() -> ApiErrors.badRequest("Vai trò không hợp lệ.",
                            ApiErrors.errors("role", "Vai trò không hợp lệ")));
            user.setRole(role);
        }

        user = userRepository.save(user);
        return toAdminUser(user);
    }

    // ------------------------------------------------------------------
    // NHÓM VIỆC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<JobCategoryResponse> listCategories() {
        Map<String, Integer> jobCounts = new java.util.LinkedHashMap<>();
        for (com.uniwork.entity.JobPost job : jobPostRepository.findAllByDeletedAtIsNull()) {
            if (job.getCategory() == null) continue;
            jobCounts.merge(job.getCategory().getCode(), 1, Integer::sum);
        }

        return jobCategoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(c -> JobCategoryResponse.builder()
                        .id(c.getCode())
                        .name(c.getName())
                        .slug(c.getSlug())
                        .description(c.getDescription() != null ? c.getDescription() : "")
                        .icon(c.getIcon() != null ? c.getIcon() : "Briefcase")
                        .jobCount(jobCounts.getOrDefault(c.getCode(), 0))
                        .isActive(c.getIsActive())
                        .sortOrder(c.getSortOrder() != null ? c.getSortOrder().intValue() : 0)
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public JobCategoryResponse createCategory(CategoryUpsertRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw ApiErrors.badRequest("Tên nhóm việc là bắt buộc.",
                    ApiErrors.errors("name", "Vui lòng nhập tên nhóm việc"));
        }

        String slug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? request.getSlug().trim()
                : slugify(request.getName());

        if (jobCategoryRepository.findBySlug(slug).isPresent()) {
            throw ApiErrors.badRequest("Slug đã tồn tại. Vui lòng chọn tên khác.",
                    ApiErrors.errors("slug", "Slug đã tồn tại"));
        }

        JobCategory category = JobCategory.builder()
                .code(generateCategoryCode(slug))
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription() != null ? request.getDescription().trim() : "")
                .icon(request.getIcon() != null && !request.getIcon().isBlank()
                        ? request.getIcon() : "Briefcase")
                .sortOrder(request.getSortOrder() != null
                        ? request.getSortOrder().shortValue()
                        : (short) (jobCategoryRepository.count() + 1))
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        category = jobCategoryRepository.save(category);

        return JobCategoryResponse.builder()
                .id(category.getCode())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .icon(category.getIcon())
                .jobCount(0)
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder() != null ? category.getSortOrder().intValue() : 0)
                .build();
    }

    @Override
    @Transactional
    public JobCategoryResponse updateCategory(String categoryId, CategoryUpsertRequest request) {
        JobCategory category = jobCategoryRepository.findByCode(categoryId)
                .or(() -> jobCategoryRepository.findBySlug(categoryId))
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy nhóm việc."));

        if (request.getName() != null && !request.getName().isBlank()) {
            category.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription().trim());
        }
        if (request.getIcon() != null && !request.getIcon().isBlank()) {
            category.setIcon(request.getIcon());
        }
        if (request.getIsActive() != null) {
            category.setIsActive(request.getIsActive());
        }
        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder().shortValue());
        }

        category = jobCategoryRepository.save(category);

        return JobCategoryResponse.builder()
                .id(category.getCode())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .icon(category.getIcon())
                .jobCount(0)
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder() != null ? category.getSortOrder().intValue() : 0)
                .build();
    }

    @Override
    @Transactional
    public JobCategoryResponse removeCategory(String categoryId) {
        JobCategory category = jobCategoryRepository.findByCode(categoryId)
                .or(() -> jobCategoryRepository.findBySlug(categoryId))
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy nhóm việc."));

        final Short categoryPk = category.getId();
        boolean usedByJobs = jobPostRepository.findAllByDeletedAtIsNull().stream()
                .anyMatch(job -> job.getCategory() != null
                        && categoryPk.equals(job.getCategory().getId()));

        if (usedByJobs) {
            // Đang được dùng -> khoá mềm thay vì xoá cứng
            category.setIsActive(false);
            category = jobCategoryRepository.save(category);
        } else {
            jobCategoryRepository.delete(category);
        }

        return JobCategoryResponse.builder()
                .id(category.getCode())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .icon(category.getIcon())
                .jobCount(0)
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder() != null ? category.getSortOrder().intValue() : 0)
                .build();
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private AdminUserResponse toAdminUser(User user) {
        String role = user.getRole().getCode();
        String fullName = null;
        String phone = null;
        String companyName = null;
        String university = null;
        String avatarUrl = null;

        if ("STUDENT".equals(role)) {
            StudentProfile profile = studentProfileRepository.findById(user.getId()).orElse(null);
            if (profile != null) {
                fullName = profile.getFullName();
                phone = profile.getPhone();
                university = profile.getUniversity();
                avatarUrl = profile.getAvatarUrl();
            }
        } else if ("EMPLOYER".equals(role)) {
            EmployerProfile profile = employerProfileRepository.findById(user.getId()).orElse(null);
            if (profile != null) {
                fullName = profile.getDisplayName();
                phone = profile.getContactPhone();
                companyName = profile.getDisplayName();
                avatarUrl = profile.getLogoUrl();
            }
        }

        if (fullName == null) {
            fullName = user.getEmail();
        }

        long totalJobs = 0;
        long totalApplications = 0;

        if ("EMPLOYER".equals(role)) {
            totalJobs = jobPostRepository.findByEmployerUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(user.getId()).size();
        } else if ("STUDENT".equals(role)) {
            totalApplications = applicationRepository.countByStudentUserId(user.getId());
        }

        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(role)
                .fullName(fullName)
                .status(user.getStatus())
                .emailVerifiedAt(DateTimeUtils.toIso(user.getEmailVerifiedAt()))
                .authProvider(user.getAuthProvider())
                .phone(phone)
                .companyName(companyName)
                .university(university)
                .avatarUrl(avatarUrl)
                .isLocked("LOCKED".equals(user.getStatus()))
                .joinedAt(DateTimeUtils.toIso(user.getCreatedAt()))
                .lastLoginAt(DateTimeUtils.toIso(user.getLastLoginAt()))
                .totalApplications(totalApplications)
                .totalJobs(totalJobs)
                .build();
    }

    /** Sinh slug chuẩn từ tên (bỏ dấu tiếng Việt). */
    private static String slugify(String input) {
        String normalized = Normalizer.normalize(input.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replace("\\p{InCombiningDiacriticalMarks}+", "")
                .replace("đ", "d")
                .replace("Đ", "d")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized;
    }

    /** Sinh public id (code) duy nhất cho nhóm việc. */
    private String generateCategoryCode(String slug) {
        String base = slug.length() > 24 ? slug.substring(0, 24) : slug;
        String candidate = "cat-" + base;
        int suffix = 1;
        while (jobCategoryRepository.findByCode(candidate).isPresent()) {
            candidate = "cat-" + base + "-" + suffix++;
        }
        return candidate;
    }
}
