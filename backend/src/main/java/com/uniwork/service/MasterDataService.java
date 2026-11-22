package com.uniwork.service;

import com.uniwork.dto.response.DistrictResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobPositionResponse;
import com.uniwork.dto.response.ProvinceResponse;
import com.uniwork.dto.response.SalaryBenchmarkResponse;
import com.uniwork.dto.response.SkillResponse;
import com.uniwork.dto.response.WardResponse;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.SalaryBenchmark;

import java.util.List;
import java.util.Map;

/**
 * Nghiệp vụ dữ liệu danh mục dùng chung (master data).
 *
 * <p>Phục vụ nhóm endpoint {@code GET /api/v1/public/**}: nhóm việc, vị trí công việc,
 * tỉnh, quận, kỹ năng và xếp hạng lương.
 */
public interface MasterDataService {

    /** Nhóm việc đang hoạt động (kèm số tin tuyển dụng đang mở). */
    List<JobCategoryResponse> listCategories();

    /** Vị trí công việc (kèm số tin tuyển dụng đang mở). */
    List<JobPositionResponse> listPositions();

    /** Danh sách tỉnh / thành phố. */
    List<ProvinceResponse> listProvinces();

    /** Danh sách quận / huyện, tuỳ chọn lọc theo tỉnh. */
    List<DistrictResponse> listDistricts(String provinceId);

    /**
     * Danh sách xã / phường / đặc khu, tuỳ chọn lọc theo tỉnh.
     *
     * <p>Đây là cấp hành chính chính thức kể từ 01/07/2025 (Quyết định
     * 19/2025/QĐ-TTg bỏ cấp huyện).
     */
    List<WardResponse> listWards(String provinceId);

    /** Danh sách kỹ năng. */
    List<SkillResponse> listSkills();

    /** Bảng xếp hạng lương theo nhóm việc × tỉnh. */
    List<SalaryBenchmarkResponse> listSalaryBenchmarks();

    /** Số tin tuyển dụng đang mở theo public id của nhóm việc. */
    Map<String, Integer> countOpenJobsByCategory();

    /** Số tin tuyển dụng đang mở theo public id của vị trí. */
    Map<String, Integer> countOpenJobsByPosition();
}
