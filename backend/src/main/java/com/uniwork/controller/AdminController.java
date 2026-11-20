package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.AdminUpdateUserRequest;
import com.uniwork.dto.request.CategoryUpsertRequest;
import com.uniwork.dto.request.JobReviewRequest;
import com.uniwork.dto.response.AdminDashboardResponse;
import com.uniwork.dto.response.AdminUserResponse;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.AdminService;
import com.uniwork.service.JobService;
import com.uniwork.service.ReviewService;
import com.uniwork.service.WorkHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller quản trị viên.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code GET    /api/v1/admin/dashboard}</li>
 *   <li>{@code GET    /api/v1/admin/users?role=&keyword=}</li>
 *   <li>{@code PATCH  /api/v1/admin/users/{id}}</li>
 *   <li>{@code GET    /api/v1/admin/categories}</li>
 *   <li>{@code POST   /api/v1/admin/categories}</li>
 *   <li>{@code PUT    /api/v1/admin/categories/{id}}</li>
 *   <li>{@code DELETE /api/v1/admin/categories/{id}}</li>
 *   <li>{@code GET    /api/v1/admin/jobs?status=}</li>
 *   <li>{@code PATCH  /api/v1/admin/jobs/{id}/review}</li>
 *   <li>{@code PATCH  /api/v1/admin/reviews/{id}}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.V1_ADMIN)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Quản trị viên", description = "Thống kê, quản lý người dùng, nhóm việc, duyệt tin tuyển dụng")
public class AdminController {

    private final AdminService adminService;
    private final JobService jobService;
    private final ReviewService reviewService;
    private final WorkHistoryService workHistoryService;

    @GetMapping("/dashboard")
    @Operation(summary = "Số liệu tổng quan hệ thống")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy số liệu tổng quan thành công", adminService.dashboard()));
    }

    // ------------------------------------------------------------------
    // NGƯỜI DÙNG
    // ------------------------------------------------------------------

    @GetMapping("/users")
    @Operation(summary = "Danh sách người dùng")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String keyword) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách người dùng thành công", adminService.listUsers(role, keyword)));
    }

    @PatchMapping("/users/{id}")
    @Operation(summary = "Khoá / mở khoá hoặc đổi vai trò người dùng")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUser(
            @PathVariable("id") Long id,
            @RequestBody AdminUpdateUserRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật người dùng.", adminService.updateUser(id, request)));
    }

    // ------------------------------------------------------------------
    // NHÓM VIỆC
    // ------------------------------------------------------------------

    @GetMapping("/categories")
    @Operation(summary = "Danh sách nhóm việc (kể cả đã khoá)")
    public ResponseEntity<ApiResponse<List<JobCategoryResponse>>> listCategories() {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách nhóm việc thành công", adminService.listCategories()));
    }

    @PostMapping("/categories")
    @Operation(summary = "Tạo nhóm việc")
    public ResponseEntity<ApiResponse<JobCategoryResponse>> createCategory(
            @RequestBody CategoryUpsertRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo nhóm việc.", adminService.createCategory(request)));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật nhóm việc")
    public ResponseEntity<ApiResponse<JobCategoryResponse>> updateCategory(
            @PathVariable("id") String id,
            @RequestBody CategoryUpsertRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật nhóm việc.", adminService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Xoá nhóm việc (xoá mềm nếu đang được dùng)")
    public ResponseEntity<ApiResponse<JobCategoryResponse>> removeCategory(
            @PathVariable("id") String id) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã xoá nhóm việc.", adminService.removeCategory(id)));
    }

    // ------------------------------------------------------------------
    // TIN TUYỂN DỤNG
    // ------------------------------------------------------------------

    @GetMapping("/jobs")
    @Operation(summary = "Danh sách tin tuyển dụng (mọi trạng thái)")
    public ResponseEntity<ApiResponse<List<JobResponse>>> listJobs(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tin tuyển dụng thành công", jobService.listForAdmin(status)));
    }

    @PatchMapping("/jobs/{id}/review")
    @Operation(summary = "Duyệt / từ chối tin tuyển dụng")
    public ResponseEntity<ApiResponse<JobResponse>> reviewJob(
            @PathVariable("id") String id,
            @RequestBody JobReviewRequest request,
            @CurrentUser User admin) {

        JobResponse result = jobService.review(id, request.getAction(), request.getReason(), admin.getId());
        String message = "APPROVE".equalsIgnoreCase(request.getAction())
                ? "Đã duyệt tin tuyển dụng." : "Đã từ chối tin tuyển dụng.";

        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    // ------------------------------------------------------------------
    // ĐÁNH GIÁ
    // ------------------------------------------------------------------

    @GetMapping("/reviews")
    @Operation(summary = "Danh sách đánh giá (kể cả đã ẩn)")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listReviews(
            @RequestParam(required = false) String targetType) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá thành công", reviewService.list(targetType, null, false)));
    }

    @PatchMapping("/reviews/{id}")
    @Operation(summary = "Ẩn / hiện đánh giá")
    public ResponseEntity<ApiResponse<ReviewResponse>> setHidden(
            @PathVariable("id") String id,
            @RequestParam(required = false) Boolean isHidden,
            @RequestBody(required = false) java.util.Map<String, Boolean> body) {

        boolean hidden = isHidden != null ? isHidden : (body != null && Boolean.TRUE.equals(body.get("isHidden")));

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật đánh giá.", reviewService.setHidden(id, hidden)));
    }

    // ------------------------------------------------------------------
    // KINH NGHIỆM LÀM VIỆC
    // ------------------------------------------------------------------

    /**
     * GET /api/v1/admin/work-history?studentId=
     * — tra cứu lịch sử làm việc của một sinh viên.
     */
    @GetMapping("/work-history")
    @Operation(summary = "Tra cứu lịch sử làm việc của sinh viên")
    public ResponseEntity<ApiResponse<List<WorkHistoryResponse>>> listWorkHistory(
            @RequestParam("studentId") Long studentId) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy lịch sử làm việc thành công",
                workHistoryService.listForStudentByAdmin(studentId)));
    }
}
