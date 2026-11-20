package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.JobListResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.service.JobService;
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
 * Controller tin tuyển dụng công khai — không cần đăng nhập.
 *
 * <p>Phục vụ các route public dùng chung cho cả khách và người đã đăng nhập:
 * <ul>
 *   <li>{@code GET /api/v1/jobs/public}</li>
 *   <li>{@code GET /api/v1/jobs/public/related}</li>
 *   <li>{@code GET /api/v1/jobs/public/{id}}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.V1_PUBLIC_JOBS)
@RequiredArgsConstructor
@Tag(name = "Tin tuyển dụng công khai", description = "Tìm kiếm & xem tin tuyển dụng không cần đăng nhập")
public class PublicJobController {

    private final JobService jobService;

    @GetMapping
    @Operation(summary = "Danh sách tin tuyển dụng (lọc + sắp xếp + phân trang)")
    public ResponseEntity<ApiResponse<JobListResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryIds,
            @RequestParam(required = false) String positionIds,
            @RequestParam(required = false) String provinceIds,
            @RequestParam(required = false) String districtIds,
            @RequestParam(required = false) String employmentTypes,
            @RequestParam(required = false) String workModes,
            @RequestParam(required = false) Integer salaryMin,
            @RequestParam(required = false) Integer salaryMax,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "10") Integer pageSize) {

        JobListResponse result = jobService.list(
                keyword, categoryIds, positionIds, provinceIds, districtIds,
                employmentTypes, workModes, salaryMin, salaryMax,
                sort, page, pageSize, null, null);

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tin tuyển dụng thành công", result));
    }

    @GetMapping("/related")
    @Operation(summary = "Tin tuyển dụng gợi ý cùng nhóm việc")
    public ResponseEntity<ApiResponse<List<JobResponse>>> related(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String excludeId,
            @RequestParam(required = false, defaultValue = "6") Integer limit) {

        List<JobResponse> result = jobService.related(categoryId, excludeId, limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy tin tuyển dụng liên quan thành công", result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết tin tuyển dụng")
    public ResponseEntity<ApiResponse<JobResponse>> detail(@PathVariable("id") String id) {
        JobResponse result = jobService.detail(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tin tuyển dụng thành công", result));
    }
}
