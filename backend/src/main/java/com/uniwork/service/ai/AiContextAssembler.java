package com.uniwork.service.ai;

import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Province;
import com.uniwork.entity.SalaryBenchmark;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SalaryBenchmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;

/**
 * Gom ngữ cảnh thị trường cho đầu vào AI: mức lương đã quy đổi, bảng xếp hạng
 * lương của nhóm việc × tỉnh, và uy tín nhà tuyển dụng.
 *
 * <p>Không gửi bất kỳ dữ liệu cá nhân nào của sinh viên: chỉ đọc từ
 * {@link JobPost}, bảng xếp hạng lương và hồ sơ nhà tuyển dụng.
 *
 * <p>Bảng xếp hạng lương đọc từ {@link SalaryBenchmarkRepository} — cùng bảng
 * {@code salary_benchmarks} mà endpoint {@code GET /api/v1/public/salary-benchmarks}
 * phục vụ, nên AI nhìn thấy đúng những con số quản trị viên nhìn thấy.
 */
@Component
@RequiredArgsConstructor
public class AiContextAssembler {

    /**
     * Bảng quy đổi giờ cho từng đơn vị trả lương — giống
     * {@code JobServiceImpl.HOURS_PER_UNIT} và bảng ở frontend.
     *
     * <p>Chỉ gồm các đơn vị quy đổi được. {@code PER_TASK} và {@code NEGOTIABLE}
     * vắng mặt có chủ đích — AI không được suy luận {@code SALARY_ANOMALY} từ chúng
     * (CONTRACT.md mục 5A.6).
     */
    private static final Map<String, Integer> HOURS_PER_UNIT = Map.of(
            "HOURLY", 1,
            "DAILY", 8,
            "WEEKLY", 40,
            "MONTHLY", 160);

    /**
     * Mã tỉnh dùng làm mốc lùi khi tỉnh của tin chưa có dòng xếp hạng.
     *
     * <p>Trùng với quy tắc ở {@code app/src/features/admin/lib/salary-benchmark.ts}
     * (fallback về "79" — Thành phố Hồ Chí Minh) để giao diện quản trị viên và AI
     * nhìn cùng một con số.
     */
    private static final String FALLBACK_PROVINCE_CODE = "79";

    private final SalaryBenchmarkRepository salaryBenchmarkRepository;
    private final ProvinceRepository provinceRepository;

    /** Mức lương của tin đã chuẩn hoá (đơn vị gốc + đồng/giờ). */
    public AiSalaryInfo salaryInfo(JobPost job) {
        String salaryType = job.getSalaryType() == null ? "" : job.getSalaryType().trim();
        Integer originalMin = toInt(job.getSalaryMin());
        Integer originalMax = toInt(job.getSalaryMax());

        Integer hourlyMin = null;
        Integer hourlyMax = null;
        if (isConvertible(salaryType)) {
            // Cột sinh thành `salary_min_hourly` / `salary_max_hourly` của MySQL đã
            // quy đổi sẵn -> ưu tiên dùng; thiếu thì tự quy đổi theo bảng quy ước.
            hourlyMin = firstPositive(toInt(job.getSalaryMinHourly()), convert(originalMin, salaryType));
            hourlyMax = firstPositive(toInt(job.getSalaryMaxHourly()), convert(originalMax, salaryType));
        }

        return AiSalaryInfo.builder()
                .salaryType(salaryType)
                .originalMin(originalMin)
                .originalMax(originalMax)
                .hourlyMin(hourlyMin)
                .hourlyMax(hourlyMax)
                .build();
    }

    /**
     * Bảng xếp hạng lương của nhóm việc × tỉnh — {@code null} khi không có dòng
     * tương ứng (tin vẫn kiểm tra được, chỉ thiếu căn cứ so sánh lương).
     */
    public AiSalaryBenchmark benchmark(JobPost job) {
        JobCategory category = job.getCategory();
        if (category == null || category.getCode() == null) {
            return null;
        }
        String categoryCode = category.getCode();
        String provinceCode = job.getProvince() != null ? job.getProvince().getCode() : null;

        SalaryBenchmark match = findBenchmark(categoryCode, provinceCode);
        if (match == null) {
            return null;
        }

        return AiSalaryBenchmark.builder()
                .categoryId(categoryCode)
                .categoryName(category.getName())
                .provinceId(match.getProvince() != null ? match.getProvince().getCode() : null)
                .provinceName(provinceName(match, job))
                .avgHourly(toInt(match.getAvgHourly()))
                .minHourly(toInt(match.getMinHourly()))
                .maxHourly(toInt(match.getMaxHourly()))
                .sampleSize(match.getSampleSize())
                .build();
    }

    /** Uy tín nhà tuyển dụng — {@code null} khi tin không gắn với nhà tuyển dụng nào. */
    public AiEmployerTrust employerTrust(JobPost job) {
        EmployerProfile employer = job.getEmployer();
        if (employer == null) {
            return null;
        }
        return AiEmployerTrust.builder()
                .verified(Boolean.TRUE.equals(employer.getIsVerified()))
                .avgRating(employer.getAvgRating() != null
                        ? employer.getAvgRating().doubleValue() : null)
                .ratingCount(employer.getRatingCount())
                .build();
    }

    // ------------------------------------------------------------------
    // Nội bộ
    // ------------------------------------------------------------------

    /**
     * Tìm dòng xếp hạng theo (nhóm việc × tỉnh), lùi về tỉnh mặc định khi tỉnh
     * của tin chưa có — đúng quy tắc giao diện quản trị viên đang dùng.
     */
    private SalaryBenchmark findBenchmark(String categoryCode, String provinceCode) {
        if (provinceCode != null) {
            Optional<SalaryBenchmark> exact =
                    salaryBenchmarkRepository.findByCategoryCodeAndProvinceCode(categoryCode, provinceCode);
            if (exact.isPresent()) {
                return exact.get();
            }
        }
        return salaryBenchmarkRepository
                .findByCategoryCodeAndProvinceCode(categoryCode, FALLBACK_PROVINCE_CODE)
                .orElse(null);
    }

    /**
     * Tên tỉnh của dòng xếp hạng.
     *
     * <p>Ưu tiên entity {@link Province} gắn với tin (không tốn truy vấn thêm);
     * chỉ khi dòng xếp hạng rơi về tỉnh mặc định mới tra danh sách tỉnh.
     */
    private String provinceName(SalaryBenchmark benchmark, JobPost job) {
        Province province = benchmark.getProvince();
        if (province == null || province.getCode() == null) {
            return null;
        }
        if (job.getProvince() != null && province.getCode().equals(job.getProvince().getCode())) {
            return job.getProvince().getName();
        }
        return provinceRepository.findByCode(province.getCode())
                .map(Province::getName)
                .orElse(null);
    }

    /**
     * Đơn vị trả lương nào quy đổi được sang đồng/giờ.
     *
     * <p>{@code PER_TASK} và {@code NEGOTIABLE} không quy đổi được — AI không được
     * suy luận {@code SALARY_ANOMALY} từ chúng (CONTRACT.md mục 5A.6).
     */
    private boolean isConvertible(String salaryType) {
        return HOURS_PER_UNIT.containsKey(salaryType);
    }

    private Integer convert(Integer amount, String salaryType) {
        if (amount == null) {
            return null;
        }
        int hours = HOURS_PER_UNIT.get(salaryType);
        return BigDecimal.valueOf(amount)
                .divide(BigDecimal.valueOf(hours), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /** Lấy giá trị dương đầu tiên — dùng để ưu tiên cột sinh thành sẵn có. */
    private Integer firstPositive(Integer preferred, Integer fallback) {
        if (preferred != null && preferred > 0) {
            return preferred;
        }
        return fallback;
    }

    private Integer toInt(BigDecimal value) {
        return value == null ? null : value.intValue();
    }
}
