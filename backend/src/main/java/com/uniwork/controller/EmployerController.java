package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.dto.request.UpdateApplicationStatusRequest;
import com.uniwork.dto.request.UpdateEmployerProfileRequest;
import com.uniwork.dto.request.UpdateJobStatusRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.ApplicationResponse;
import com.uniwork.dto.response.EmployerProfileResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.ApplicationService;
import com.uniwork.service.JobService;
import com.uniwork.service.ProfileService;
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
import java.util.Map;

/**
 * Controller dành cho nhà tuyển dụng.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code GET    /api/v1/employer/jobs}</li>
 *   <li>{@code POST   /api/v1/employer/jobs}</li>
 *   <li>{@code PUT    /api/v1/employer/jobs/{id}}</li>
 *   <li>{@code DELETE /api/v1/employer/jobs/{id}}</li>
 *   <li>{@code PATCH  /api/v1/employer/jobs/{id}/status}</li>
 *   <li>{@code GET    /api/v1/employer/applications}</li>
 *   <li>{@code GET    /api/v1/employer/applications/{id}}</li>
 *   <li>{@code PATCH  /api/v1/employer/applications/{id}}</li>
 *   <li>{@code GET    /api/v1/employer/profile}</li>
 *   <li>{@code PUT    /api/v1/employer/profile}</li>
 *   <li>{@code GET    /api/v1/employer/reviews}</li>
 *   <li>{@code GET    /api/v1/employer/applications/{id}/reviews}</li>
 *   <li>{@code PATCH  /api/v1/employer/reviews/{id}/reply}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.V1_EMPLOYER)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Nhà tuyển dụng", description = "Đăng tin, duyệt đơn ứng tuyển, hồ sơ tổ chức")
public class EmployerController {

    private final JobService jobService;
    private final ApplicationService applicationService;
    private final ProfileService profileService;
    private final ReviewService reviewService;
    private final WorkHistoryService workHistoryService;

    // ------------------------------------------------------------------
    // TIN TUYỂN DỤNG
    // ------------------------------------------------------------------

    @GetMapping("/jobs")
    @Operation(summary = "Danh sách tin tuyển dụng của tôi (mọi trạng thái)")
    public ResponseEntity<ApiResponse<List<JobResponse>>> listJobs(
            @RequestParam(required = false) String status,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tin tuyển dụng thành công",
                jobService.listByEmployer(user.getId(), status)));
    }

    @PostMapping("/jobs")
    @Operation(summary = "Đăng tin tuyển dụng mới (chờ duyệt)")
    public ResponseEntity<ApiResponse<JobResponse>> createJob(
            @RequestBody JobUpsertRequest request,
            @CurrentUser User user) {

        JobResponse result = jobService.create(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi tin tuyển dụng, đang chờ duyệt.", result));
    }

    @PutMapping("/jobs/{id}")
    @Operation(summary = "Cập nhật tin tuyển dụng")
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @PathVariable("id") String id,
            @RequestBody JobUpsertRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật tin tuyển dụng.",
                jobService.update(id, request, user.getId())));
    }

    @DeleteMapping("/jobs/{id}")
    @Operation(summary = "Huỷ tin tuyển dụng")
    public ResponseEntity<ApiResponse<Void>> removeJob(
            @PathVariable("id") String id,
            @CurrentUser User user) {

        jobService.remove(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã huỷ tin tuyển dụng.", null));
    }

    @PatchMapping("/jobs/{id}/status")
    @Operation(summary = "Đóng / mở lại / hoàn thành tin tuyển dụng")
    public ResponseEntity<ApiResponse<JobResponse>> updateJobStatus(
            @PathVariable("id") String id,
            @RequestBody UpdateJobStatusRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật trạng thái tin tuyển dụng.",
                jobService.updateStatus(id, request != null ? request.getStatus() : null, user.getId())));
    }

    // ------------------------------------------------------------------
    // ĐƠN ỨNG TUYỂN
    // ------------------------------------------------------------------

    @GetMapping("/applications")
    @Operation(summary = "Danh sách ứng viên của tôi")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> listApplications(
            @RequestParam(required = false) String jobId,
            @RequestParam(required = false) String status,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách ứng viên thành công",
                applicationService.listByEmployer(user.getId(), jobId, status)));
    }

    @GetMapping("/applications/{id}")
    @Operation(summary = "Chi tiết đơn ứng tuyển")
    public ResponseEntity<ApiResponse<ApplicationResponse>> applicationDetail(
            @PathVariable("id") String id,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy chi tiết đơn ứng tuyển thành công",
                applicationService.detailForEmployer(id, user.getId())));
    }

    @PatchMapping("/applications/{id}")
    @Operation(summary = "Cập nhật trạng thái đơn ứng tuyển")
    public ResponseEntity<ApiResponse<ApplicationResponse>> updateApplication(
            @PathVariable("id") String id,
            @RequestBody UpdateApplicationStatusRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật trạng thái đơn ứng tuyển.",
                applicationService.updateStatus(id, request, user.getId())));
    }

    @PatchMapping("/applications/{id}/note")
    @Operation(summary = "Lưu ghi chú nội bộ về ứng viên")
    public ResponseEntity<ApiResponse<ApplicationResponse>> updateApplicationNote(
            @PathVariable("id") String id,
            @RequestBody Map<String, String> body,
            @CurrentUser User user) {

        String note = body != null ? body.get("note") : null;

        return ResponseEntity.ok(ApiResponse.success(
                "Đã lưu ghi chú nội bộ.",
                applicationService.updateNote(id, note, user.getId())));
    }

    // ------------------------------------------------------------------
    // HỒ SƠ TỔ CHỨC
    // ------------------------------------------------------------------

    @GetMapping("/profile")
    @Operation(summary = "Lấy hồ sơ nhà tuyển dụng của tôi")
    public ResponseEntity<ApiResponse<EmployerProfileResponse>> getProfile(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy hồ sơ nhà tuyển dụng thành công",
                profileService.getEmployerProfile(user.getId())));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật hồ sơ nhà tuyển dụng")
    public ResponseEntity<ApiResponse<EmployerProfileResponse>> updateProfile(
            @RequestBody UpdateEmployerProfileRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật thông tin tổ chức.",
                profileService.updateEmployerProfile(user.getId(), request)));
    }

    // ------------------------------------------------------------------
    // ĐÁNH GIÁ
    // ------------------------------------------------------------------

    @GetMapping("/reviews")
    @Operation(summary = "Danh sách đánh giá dành cho nhà tuyển dụng")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listReviews(@CurrentUser User user) {
        // Chỉ trả về đánh giá CHƯA bị ẩn (BR-07.9) — đánh giá bị admin ẩn
        // không được lộ ra trên trang quản lý của nhà tuyển dụng.
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá thành công",
                reviewService.list("EMPLOYER", user.getId(), true)));
    }

    @GetMapping("/applications/{applicationId}/reviews")
    @Operation(summary = "Đánh giá sinh viên ứng tuyển đã nhận từ nhà tuyển dụng khác")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listApplicationReviews(
            @PathVariable("applicationId") String applicationId,
            @CurrentUser User user) {

        // Quyền: chỉ NTD sở hữu tin của đơn mới xem được đánh giá ứng viên.
        Long studentUserId = applicationService.studentUserIdOf(applicationId, user.getId());

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá thành công",
                reviewService.listForStudent(studentUserId)));
    }

    /**
     * GET /api/v1/employer/applications/{applicationId}/work-history
     * — lịch sử làm việc của ứng viên trong đơn ứng tuyển này.
     *
     * <p>Quyền: chỉ NTD sở hữu tin của đơn, hoặc NTD đã từng nhận đơn ứng
     * tuyển của sinh viên này (cùng quy tắc với quyền đọc CV).
     */
    @GetMapping("/applications/{applicationId}/work-history")
    @Operation(summary = "Kinh nghiệm làm việc của ứng viên")
    public ResponseEntity<ApiResponse<List<WorkHistoryResponse>>> listApplicationWorkHistory(
            @PathVariable("applicationId") String applicationId,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy kinh nghiệm làm việc của ứng viên thành công",
                workHistoryService.listForApplication(applicationId, user.getId())));
    }

    @PatchMapping("/reviews/{id}/reply")
    @Operation(summary = "Trả lời đánh giá (người bị đánh giá)")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyReview(
            @PathVariable("id") String id,
            @RequestParam(required = false) String reply,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @CurrentUser User user) {

        String content = reply != null ? reply : (body != null ? body.get("reply") : null);

        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi trả lời.",
                reviewService.replyAsReviewee(id, content, user.getId())));
    }

    /**
     * POST /api/v1/employer/reviews/{id}/reply — trả lời đánh giá.
     *
     * <p>Frontend dùng POST (xem {@code app/src/features/reviews/services/reviews.service.ts});
     * giữ thêm PATCH để tương thích ngược.
     */
    @PostMapping("/reviews/{id}/reply")
    @Operation(summary = "Trả lời đánh giá (POST)")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyReviewPost(
            @PathVariable("id") String id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @CurrentUser User user) {

        String content = body != null ? body.get("reply") : null;

        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi trả lời.",
                reviewService.replyAsReviewee(id, content, user.getId())));
    }

    /**
     * POST /api/v1/employer/reviews/{id}/reviewer-reply — NTD phản hồi lại đánh giá
     * mà chính NTD đã viết (trường hợp NTD đánh giá sinh viên).
     */
    @PostMapping("/reviews/{id}/reviewer-reply")
    @Operation(summary = "Phản hồi lại đánh giá đã viết (người viết đánh giá)")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyAsReviewer(
            @PathVariable("id") String id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @CurrentUser User user) {

        String content = body != null ? body.get("reply") : null;

        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi phản hồi.",
                reviewService.replyAsReviewer(id, content, user.getId())));
    }
}
