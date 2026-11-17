package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.DistrictResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobPositionResponse;
import com.uniwork.dto.response.ProvinceResponse;
import com.uniwork.dto.response.PublicEmployerProfileResponse;
import com.uniwork.dto.response.SalaryBenchmarkResponse;
import com.uniwork.dto.response.SkillResponse;
import com.uniwork.service.MasterDataService;
import com.uniwork.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller dữ liệu danh mục dùng chung — không cần đăng nhập.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code GET /api/v1/public/categories}</li>
 *   <li>{@code GET /api/v1/public/positions}</li>
 *   <li>{@code GET /api/v1/public/provinces}</li>
 *   <li>{@code GET /api/v1/public/districts?provinceId=}</li>
 *   <li>{@code GET /api/v1/public/skills}</li>
 *   <li>{@code GET /api/v1/public/salary-benchmarks}</li>
 *   <li>{@code GET /api/v1/public/employers/{id}}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.V1_PUBLIC_MASTER)
@RequiredArgsConstructor
@Tag(name = "Dữ liệu danh mục", description = "Nhóm việc, vị trí, tỉnh/quận, kỹ năng, xếp hạng lương")
public class PublicMasterDataController {

    private final MasterDataService masterDataService;
    private final ProfileService profileService;

    @GetMapping("/categories")
    @Operation(summary = "Danh sách nhóm việc")
    public ResponseEntity<ApiResponse<List<JobCategoryResponse>>> categories() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách nhóm việc thành công", masterDataService.listCategories()));
    }

    @GetMapping("/positions")
    @Operation(summary = "Danh sách vị trí công việc")
    public ResponseEntity<ApiResponse<List<JobPositionResponse>>> positions() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách vị trí công việc thành công", masterDataService.listPositions()));
    }

    @GetMapping("/provinces")
    @Operation(summary = "Danh sách tỉnh / thành phố")
    public ResponseEntity<ApiResponse<List<ProvinceResponse>>> provinces() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tỉnh thành phố thành công", masterDataService.listProvinces()));
    }

    @GetMapping("/districts")
    @Operation(summary = "Danh sách quận / huyện (tuỳ chọn lọc theo tỉnh)")
    public ResponseEntity<ApiResponse<List<DistrictResponse>>> districts(
            @RequestParam(required = false) String provinceId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách quận huyện thành công", masterDataService.listDistricts(provinceId)));
    }

    @GetMapping("/skills")
    @Operation(summary = "Danh sách kỹ năng")
    public ResponseEntity<ApiResponse<List<SkillResponse>>> skills() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách kỹ năng thành công", masterDataService.listSkills()));
    }

    @GetMapping("/salary-benchmarks")
    @Operation(summary = "Bảng xếp hạng lương theo nhóm việc × tỉnh")
    public ResponseEntity<ApiResponse<List<SalaryBenchmarkResponse>>> salaryBenchmarks() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy bảng xếp hạng lương thành công", masterDataService.listSalaryBenchmarks()));
    }

    @GetMapping("/employers/{id}")
    @Operation(summary = "Hồ sơ nhà tuyển dụng công khai (kèm tin đang mở & đánh giá)")
    public ResponseEntity<ApiResponse<PublicEmployerProfileResponse>> employer(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy hồ sơ nhà tuyển dụng thành công", profileService.getPublicEmployerProfile(id)));
    }
}
