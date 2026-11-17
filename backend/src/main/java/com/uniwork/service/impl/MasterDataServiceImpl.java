package com.uniwork.service.impl;

import com.uniwork.dto.response.DistrictResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobPositionResponse;
import com.uniwork.dto.response.ProvinceResponse;
import com.uniwork.dto.response.SalaryBenchmarkResponse;
import com.uniwork.dto.response.SkillResponse;
import com.uniwork.entity.District;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Province;
import com.uniwork.entity.SalaryBenchmark;
import com.uniwork.entity.Skill;
import com.uniwork.repository.DistrictRepository;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobPositionRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SalaryBenchmarkRepository;
import com.uniwork.repository.SkillRepository;
import com.uniwork.service.MasterDataService;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Triển khai nghiệp vụ master data.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterDataServiceImpl implements MasterDataService {

    private final JobCategoryRepository jobCategoryRepository;
    private final JobPositionRepository jobPositionRepository;
    private final ProvinceRepository provinceRepository;
    private final DistrictRepository districtRepository;
    private final SkillRepository skillRepository;
    private final SalaryBenchmarkRepository salaryBenchmarkRepository;
    private final JobPostRepository jobPostRepository;

    @Override
    public List<JobCategoryResponse> listCategories() {
        Map<String, Integer> jobCounts = countOpenJobsByCategory();
        return jobCategoryRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> toCategoryResponse(c, jobCounts.getOrDefault(c.getCode(), 0)))
                .toList();
    }

    @Override
    public List<JobPositionResponse> listPositions() {
        Map<String, Integer> jobCounts = countOpenJobsByPosition();
        return jobPositionRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(p -> toPositionResponse(p, jobCounts.getOrDefault(p.getCode(), 0)))
                .toList();
    }

    @Override
    public List<ProvinceResponse> listProvinces() {
        return provinceRepository.findAllByOrderByNameAsc().stream()
                .map(p -> ProvinceResponse.builder()
                        .id(p.getCode())
                        .name(p.getName())
                        .build())
                .toList();
    }

    @Override
    public List<DistrictResponse> listDistricts(String provinceId) {
        List<District> districts = (provinceId == null || provinceId.isBlank())
                ? districtRepository.findAllByOrderByNameAsc()
                : districtRepository.findByProvinceCodeOrderByNameAsc(provinceId);

        return districts.stream()
                .map(d -> DistrictResponse.builder()
                        .id(d.getCode())
                        .provinceId(d.getProvince() != null ? d.getProvince().getCode() : null)
                        .name(d.getName())
                        .build())
                .toList();
    }

    @Override
    public List<SkillResponse> listSkills() {
        return skillRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(s -> SkillResponse.builder()
                        .id(s.getSlug())
                        .name(s.getName())
                        .build())
                .toList();
    }

    @Override
    public List<SalaryBenchmarkResponse> listSalaryBenchmarks() {
        return salaryBenchmarkRepository.findAll().stream()
                .map(this::toBenchmarkResponse)
                .toList();
    }

    @Override
    public Map<String, Integer> countOpenJobsByCategory() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (JobPost job : jobPostRepository.findAllByDeletedAtIsNull()) {
            if (!"OPEN".equals(job.getStatus())) continue;
            String code = job.getCategory() != null ? job.getCategory().getCode() : null;
            if (code == null) continue;
            counts.merge(code, 1, Integer::sum);
        }
        return counts;
    }

    @Override
    public Map<String, Integer> countOpenJobsByPosition() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (JobPost job : jobPostRepository.findAllByDeletedAtIsNull()) {
            if (!"OPEN".equals(job.getStatus())) continue;
            if (job.getPosition() == null) continue;
            counts.merge(job.getPosition().getCode(), 1, Integer::sum);
        }
        return counts;
    }

    // ------------------------------------------------------------------
    // Mappers
    // ------------------------------------------------------------------

    private JobCategoryResponse toCategoryResponse(JobCategory c, int jobCount) {
        return JobCategoryResponse.builder()
                .id(c.getCode())
                .name(c.getName())
                .slug(c.getSlug())
                .description(c.getDescription() != null ? c.getDescription() : "")
                .icon(c.getIcon() != null ? c.getIcon() : "Briefcase")
                .jobCount(jobCount)
                .isActive(c.getIsActive())
                .sortOrder(c.getSortOrder() != null ? c.getSortOrder().intValue() : 0)
                .build();
    }

    private JobPositionResponse toPositionResponse(JobPosition p, int jobCount) {
        return JobPositionResponse.builder()
                .id(p.getCode())
                .categoryId(p.getCategory() != null ? p.getCategory().getCode() : null)
                .name(p.getName())
                .slug(p.getSlug())
                .jobCount(jobCount)
                .build();
    }

    private SalaryBenchmarkResponse toBenchmarkResponse(SalaryBenchmark b) {
        return SalaryBenchmarkResponse.builder()
                .categoryId(b.getCategory() != null ? b.getCategory().getCode() : null)
                .provinceId(b.getProvince() != null ? b.getProvince().getCode() : null)
                .avgHourly(b.getAvgHourly() != null ? b.getAvgHourly().intValue() : 0)
                .minHourly(b.getMinHourly() != null ? b.getMinHourly().intValue() : 0)
                .maxHourly(b.getMaxHourly() != null ? b.getMaxHourly().intValue() : 0)
                .sampleSize(b.getSampleSize() != null ? b.getSampleSize() : 0)
                .updatedAt(DateTimeUtils.toIso(b.getUpdatedAt()))
                .build();
    }

    /** Tiện ích nội bộ: tra cứu nhanh category theo public id. */
    public Function<String, JobCategory> categoryLookup() {
        Map<String, JobCategory> byCode = jobCategoryRepository.findAll().stream()
                .collect(Collectors.toMap(JobCategory::getCode, Function.identity(), (a, b) -> a));
        return byCode::get;
    }

    /** Tiện ích nội bộ: tra cứu nhanh province theo public id. */
    public Function<String, Province> provinceLookup() {
        Map<String, Province> byCode = provinceRepository.findAll().stream()
                .collect(Collectors.toMap(Province::getCode, Function.identity(), (a, b) -> a));
        return byCode::get;
    }
}
