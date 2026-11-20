package com.uniwork.service.impl;

import com.uniwork.dto.request.UpdateEmployerProfileRequest;
import com.uniwork.dto.request.UpdateStudentProfileRequest;
import com.uniwork.dto.response.EmployerProfileResponse;
import com.uniwork.dto.response.PublicEmployerProfileResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.dto.response.StudentExperienceResponse;
import com.uniwork.dto.response.StudentJobPreferenceResponse;
import com.uniwork.dto.response.StudentProfileResponse;
import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.Province;
import com.uniwork.entity.Review;
import com.uniwork.entity.StudentExperience;
import com.uniwork.entity.StudentJobPreference;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.StudentExperienceRepository;
import com.uniwork.repository.StudentJobPreferenceRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WorkAssignmentRepository;
import com.uniwork.service.JobService;
import com.uniwork.service.ProfileService;
import com.uniwork.service.ReviewService;
import com.uniwork.service.WorkHistoryService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Triển khai nghiệp vụ hồ sơ.
 */
@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final EmployerProfileRepository employerProfileRepository;
    private final StudentExperienceRepository experienceRepository;
    private final StudentJobPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final ProvinceRepository provinceRepository;
    private final ReviewRepository reviewRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final JobService jobService;
    private final ReviewService reviewService;
    private final WorkHistoryService workHistoryService;

    // ------------------------------------------------------------------
    // SINH VIÊN
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public StudentProfileResponse getStudentProfile(Long userId) {
        StudentProfile profile = studentProfileRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ sinh viên."));
        return toStudentResponse(profile);
    }

    @Override
    @Transactional
    public StudentProfileResponse updateStudentProfile(Long userId, UpdateStudentProfileRequest request) {
        StudentProfile profile = studentProfileRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ sinh viên."));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            profile.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            profile.setPhone(request.getPhone());
        }
        if (request.getDateOfBirth() != null) {
            profile.setDateOfBirth(DateTimeUtils.parseDate(request.getDateOfBirth()));
        }
        if (request.getGender() != null) {
            profile.setGender(request.getGender());
        }
        if (request.getStudentCode() != null) {
            profile.setStudentCode(request.getStudentCode());
        }
        if (request.getUniversity() != null) {
            profile.setUniversity(request.getUniversity());
        }
        if (request.getMajor() != null) {
            profile.setMajor(request.getMajor());
        }
        if (request.getYearOfStudy() != null) {
            profile.setYearOfStudy(request.getYearOfStudy().shortValue());
        }
        if (request.getProvinceId() != null) {
            profile.setProvinceId(resolveProvinceId(request.getProvinceId()));
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress());
        }
        if (request.getBio() != null) {
            profile.setBio(request.getBio());
        }
        if (request.getAvatarUrl() != null) {
            profile.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getCvUrl() != null) {
            profile.setCvUrl(request.getCvUrl());
        }
        if (request.getSkills() != null) {
            profile.setSkills(request.getSkills());
        }

        profile = studentProfileRepository.save(profile);

        // Kinh nghiệm làm việc — thay thế toàn bộ danh sách
        if (request.getExperiences() != null) {
            experienceRepository.deleteByStudentUserId(userId);
            List<StudentExperience> rows = new ArrayList<>();
            short order = 0;
            for (UpdateStudentProfileRequest.ExperienceItem item : request.getExperiences()) {
                if (item == null || item.getCompany() == null || item.getCompany().isBlank()) {
                    continue;
                }
                rows.add(StudentExperience.builder()
                        .student(profile)
                        .company(item.getCompany())
                        .position(item.getPosition() != null ? item.getPosition() : "")
                        .startDate(DateTimeUtils.parseDate(item.getStartDate()))
                        .endDate(DateTimeUtils.parseDate(item.getEndDate()))
                        .description(item.getDescription())
                        .sortOrder(order++)
                        .build());
            }
            experienceRepository.saveAll(rows);
        }

        // Mục tiêu việc làm
        if (request.getJobPreferences() != null) {
            UpdateStudentProfileRequest.JobPreferenceItem pref = request.getJobPreferences();
            StudentJobPreference entity = preferenceRepository.findByStudentId(userId)
                    .orElseGet(() -> StudentJobPreference.builder().studentId(userId).build());

            if (pref.getCategoryIds() != null) {
                entity.setCategoryIds(pref.getCategoryIds());
            }
            if (pref.getEmploymentTypes() != null) {
                entity.setEmploymentTypes(pref.getEmploymentTypes());
            }
            if (pref.getProvinceIds() != null) {
                entity.setProvinceIds(pref.getProvinceIds());
            }
            if (pref.getSalaryMin() != null) {
                entity.setSalaryMin(BigDecimal.valueOf(pref.getSalaryMin()));
            }
            if (pref.getSalaryMax() != null) {
                entity.setSalaryMax(BigDecimal.valueOf(pref.getSalaryMax()));
            }
            preferenceRepository.save(entity);
        }

        // Tên hiển thị đã được lưu trực tiếp vào hồ sơ (student_profiles.full_name)
        return toStudentResponse(profile);
    }

    // ------------------------------------------------------------------
    // NHÀ TUYỂN DỤNG
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public EmployerProfileResponse getEmployerProfile(Long userId) {
        EmployerProfile profile = employerProfileRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ nhà tuyển dụng."));
        return toEmployerResponse(profile);
    }

    @Override
    @Transactional
    public EmployerProfileResponse updateEmployerProfile(Long userId, UpdateEmployerProfileRequest request) {
        EmployerProfile profile = employerProfileRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ nhà tuyển dụng."));

        if (request.getEmployerType() != null && !request.getEmployerType().isBlank()) {
            profile.setEmployerType(request.getEmployerType());
        }
        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            profile.setDisplayName(request.getDisplayName().trim());
        }
        if (request.getContactName() != null) {
            profile.setContactName(request.getContactName());
        }
        if (request.getContactPhone() != null) {
            profile.setContactPhone(request.getContactPhone());
        }
        if (request.getTaxCode() != null) {
            profile.setTaxCode(request.getTaxCode());
        }
        if (request.getDescription() != null) {
            profile.setDescription(request.getDescription());
        }
        if (request.getLogoUrl() != null) {
            profile.setLogoUrl(request.getLogoUrl());
        }
        if (request.getLogoVariant() != null && !request.getLogoVariant().isBlank()) {
            profile.setLogoVariant(request.getLogoVariant());
        }
        if (request.getWebsite() != null) {
            profile.setWebsite(request.getWebsite());
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress());
        }
        if (request.getProvinceId() != null) {
            profile.setProvinceId(resolveProvinceId(request.getProvinceId()));
        }

        profile = employerProfileRepository.save(profile);

        // Tên hiển thị đã được lưu trực tiếp vào hồ sơ (employer_profiles.display_name)
        return toEmployerResponse(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public PublicEmployerProfileResponse getPublicEmployerProfile(String employerId) {
        EmployerProfile profile = employerProfileRepository.findBySlug(employerId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy nhà tuyển dụng này."));

        var jobs = jobService.listByEmployer(profile.getUserId(), "OPEN");

        List<ReviewResponse> reviews = reviewRepository
                .findByRevieweeIdAndTargetTypeAndIsHiddenFalseOrderByCreatedAtDesc(profile.getUserId(), "EMPLOYER")
                .stream()
                .map(reviewService::toResponse)
                .toList();

        return PublicEmployerProfileResponse.builder()
                .profile(toEmployerResponse(profile))
                .jobs(jobs)
                .reviews(reviews)
                .build();
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    /** Chuyển public id của tỉnh ("hcm") sang mã số trong DB. */
    private Short resolveProvinceId(String provinceCode) {
        if (provinceCode == null || provinceCode.isBlank()) {
            return null;
        }
        return provinceRepository.findByCode(provinceCode).map(Province::getId).orElse(null);
    }

    /** Chuyển mã số tỉnh trong DB sang public id ("hcm"). */
    private String resolveProvinceCode(Short provinceId) {
        if (provinceId == null) {
            return null;
        }
        return provinceRepository.findById(provinceId).map(Province::getCode).orElse(null);
    }

    // ------------------------------------------------------------------
    // MAPPERS
    // ------------------------------------------------------------------

    private StudentProfileResponse toStudentResponse(StudentProfile profile) {
        List<StudentExperienceResponse> experiences = experienceRepository
                .findByStudentUserIdOrderBySortOrderAsc(profile.getUserId()).stream()
                .map(e -> StudentExperienceResponse.builder()
                        .id("exp-" + e.getId())
                        .company(e.getCompany())
                        .position(e.getPosition())
                        .startDate(DateTimeUtils.toDate(e.getStartDate()))
                        .endDate(DateTimeUtils.toDate(e.getEndDate()))
                        .description(e.getDescription())
                        .build())
                .toList();

        // Lịch sử làm việc do hệ thống tự ghi khi đơn ứng tuyển hoàn thành.
        List<WorkHistoryResponse> workHistories = workHistoryService
                .listForStudent(profile.getUserId());

        StudentJobPreferenceResponse preferences = preferenceRepository.findByStudentId(profile.getUserId())
                .map(p -> StudentJobPreferenceResponse.builder()
                        .categoryIds(p.getCategoryIds())
                        .employmentTypes(p.getEmploymentTypes())
                        .salaryMin(p.getSalaryMin() != null ? p.getSalaryMin().intValue() : 0)
                        .salaryMax(p.getSalaryMax() != null ? p.getSalaryMax().intValue() : 0)
                        .provinceIds(p.getProvinceIds())
                        .build())
                .orElseGet(() -> StudentJobPreferenceResponse.builder()
                        .categoryIds(List.of())
                        .employmentTypes(List.of("PART_TIME"))
                        .salaryMin(0)
                        .salaryMax(0)
                        .provinceIds(List.of())
                        .build());

        return StudentProfileResponse.builder()
                .id(profile.getSlug())
                .userId(profile.getUserId())
                .fullName(profile.getFullName())
                .phone(profile.getPhone())
                .dateOfBirth(DateTimeUtils.toDate(profile.getDateOfBirth()))
                .gender(profile.getGender())
                .studentCode(profile.getStudentCode())
                .university(profile.getUniversity())
                .major(profile.getMajor())
                .yearOfStudy(profile.getYearOfStudy() != null ? profile.getYearOfStudy().intValue() : null)
                .provinceId(resolveProvinceCode(profile.getProvinceId()))
                .address(profile.getAddress())
                .bio(profile.getBio())
                .avatarUrl(profile.getAvatarUrl())
                .cvUrl(profile.getCvUrl())
                .skills(profile.getSkills() != null ? profile.getSkills() : List.of())
                .experiences(experiences)
                .workHistories(workHistories)
                .jobPreferences(preferences)
                .avgRating(profile.getAvgRating() != null ? profile.getAvgRating().doubleValue() : 0.0)
                .ratingCount(profile.getRatingCount() != null ? profile.getRatingCount() : 0)
                .createdAt(DateTimeUtils.toIso(profile.getCreatedAt()))
                .build();
    }

    private EmployerProfileResponse toEmployerResponse(EmployerProfile profile) {
        return EmployerProfileResponse.builder()
                .id(profile.getSlug())
                .userId(profile.getUserId())
                .employerType(profile.getEmployerType())
                .displayName(profile.getDisplayName())
                .contactName(profile.getContactName())
                .contactPhone(profile.getContactPhone())
                .taxCode(profile.getTaxCode())
                .description(profile.getDescription())
                .logoUrl(profile.getLogoUrl())
                .website(profile.getWebsite())
                .provinceId(resolveProvinceCode(profile.getProvinceId()))
                .address(profile.getAddress())
                .isVerified(Boolean.TRUE.equals(profile.getIsVerified()))
                .avgRating(profile.getAvgRating() != null ? profile.getAvgRating().doubleValue() : 0.0)
                .ratingCount(profile.getRatingCount() != null ? profile.getRatingCount() : 0)
                .createdAt(DateTimeUtils.toIso(profile.getCreatedAt()))
                .build();
    }
}
