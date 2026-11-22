package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.CreateApplicationRequest;
import com.uniwork.dto.request.JobNotifyPreferenceRequest;
import com.uniwork.dto.request.SaveJobRequest;
import com.uniwork.dto.request.UpdateStudentProfileRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.ApplicationResponse;
import com.uniwork.dto.response.CountResponse;
import com.uniwork.dto.response.JobNotifyPreferenceResponse;
import com.uniwork.dto.response.ReviewResponse;
import com.uniwork.dto.response.SavedJobResponse;
import com.uniwork.dto.response.StudentProfileResponse;
import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.ApplicationService;
import com.uniwork.service.JobNotifyService;
import com.uniwork.service.ProfileService;
import com.uniwork.service.ReviewService;
import com.uniwork.service.SavedJobService;
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
 * Controller dành cho sinh viên.
 *
 * <p>Khớp 100% với route mock:
 * <ul>
 *   <li>{@code POST   /api/v1/student/applications}</li>
 *   <li>{@code GET    /api/v1/student/applications}</li>
 *   <li>{@code GET    /api/v1/student/applications/{id}}</li>
 *   <li>{@code PATCH  /api/v1/student/applications/{id}/withdraw}</li>
 *   <li>{@code GET    /api/v1/student/applications/job/{jobId}}</li>
 *   <li>{@code GET    /api/v1/student/profile}</li>
 *   <li>{@code PUT    /api/v1/student/profile}</li>
 *   <li>{@code GET    /api/v1/student/reviews}</li>
 *   <li>{@code GET    /api/v1/student/saved-jobs}</li>
 *   <li>{@code POST   /api/v1/student/saved-jobs}</li>
 *   <li>{@code DELETE /api/v1/student/saved-jobs/{jobId}}</li>
 * </ul>
 */
@RestController
@RequestMapping(ApiEndpoints.V1_STUDENT)
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Sinh viên", description = "Ứng tuyển, hồ sơ sinh viên & tin đã lưu")
public class StudentController {

    private final ApplicationService applicationService;
    private final ProfileService profileService;
    private final SavedJobService savedJobService;
    private final JobNotifyService jobNotifyService;
    private final ReviewService reviewService;
    private final WorkHistoryService workHistoryService;

    // ------------------------------------------------------------------
    // ĐƠN ỨNG TUYỂN
    // ------------------------------------------------------------------

    @PostMapping("/applications")
    @Operation(summary = "Nộp đơn ứng tuyển")
    public ResponseEntity<ApiResponse<ApplicationResponse>> createApplication(
            @RequestBody CreateApplicationRequest request,
            @CurrentUser User user) {

        ApplicationResponse result = applicationService.create(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi đơn ứng tuyển thành công.", result));
    }

    @GetMapping("/applications")
    @Operation(summary = "Danh sách đơn ứng tuyển của tôi")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> listApplications(
            @RequestParam(required = false) String status,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đơn ứng tuyển thành công",
                applicationService.listByStudent(user.getId(), status)));
    }

    @GetMapping("/applications/{id}")
    @Operation(summary = "Chi tiết đơn ứng tuyển")
    public ResponseEntity<ApiResponse<ApplicationResponse>> applicationDetail(
            @PathVariable("id") String id,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy chi tiết đơn ứng tuyển thành công",
                applicationService.detailForStudent(id, user.getId())));
    }

    @PatchMapping("/applications/{id}/withdraw")
    @Operation(summary = "Rút đơn ứng tuyển")
    public ResponseEntity<ApiResponse<ApplicationResponse>> withdraw(
            @PathVariable("id") String id,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã rút đơn ứng tuyển.",
                applicationService.withdraw(id, user.getId())));
    }

    /**
     * GET /api/v1/student/applications/job/{jobId} — đơn ứng tuyển của tôi cho 1 tin.
     *
     * <p>Frontend dùng để biết đã ứng tuyển tin này chưa, và đơn cũ có đang ở
     * trạng thái `WITHDRAWN` (được ứng tuyển lại) hay không. Chưa ứng tuyển →
     * `data = null`.
     */
    @GetMapping("/applications/job/{jobId}")
    @Operation(summary = "Đơn ứng tuyển của tôi cho 1 tin tuyển dụng")
    public ResponseEntity<ApiResponse<ApplicationResponse>> applicationByJob(
            @PathVariable("jobId") String jobId,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy đơn ứng tuyển theo tin tuyển dụng thành công.",
                applicationService.findByJobForStudent(jobId, user.getId())));
    }

    // ------------------------------------------------------------------
    // HỒ SƠ
    // ------------------------------------------------------------------

    @GetMapping("/profile")
    @Operation(summary = "Lấy hồ sơ sinh viên")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getProfile(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy hồ sơ sinh viên thành công",
                profileService.getStudentProfile(user.getId())));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật hồ sơ sinh viên")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> updateProfile(
            @RequestBody UpdateStudentProfileRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật hồ sơ.",
                profileService.updateStudentProfile(user.getId(), request)));
    }

    // ------------------------------------------------------------------
    // KINH NGHIỆM LÀM VIỆC (HỆ THỐNG TỰ GHI NHẬN)
    // ------------------------------------------------------------------

    @GetMapping("/work-history")
    @Operation(summary = "Lịch sử làm việc của tôi (hệ thống tự ghi nhận)")
    public ResponseEntity<ApiResponse<List<WorkHistoryResponse>>> listWorkHistory(
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy lịch sử làm việc thành công",
                workHistoryService.listForStudent(user.getId())));
    }

    // ------------------------------------------------------------------
    // ĐÁNH GIÁ TỪ NHÀ TUYỂN DỤNG
    // ------------------------------------------------------------------

    @GetMapping("/reviews")
    @Operation(summary = "Danh sách đánh giá sinh viên đã nhận từ nhà tuyển dụng")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listReviews(
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá thành công",
                reviewService.listForStudent(user.getId())));
    }

    /**
     * POST /api/v1/student/reviews/{id}/reply — sinh viên phản hồi lại nhà tuyển dụng.
     *
     * <p>Chỉ sinh viên là người bị đánh giá (`reviewee`) mới phản hồi được —
     * service tự kiểm tra quyền, sai thì trả `403`.
     */
    @PostMapping("/reviews/{id}/reply")
    @Operation(summary = "Sinh viên phản hồi lại đánh giá đã nhận")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyReview(
            @PathVariable("id") String id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @CurrentUser User user) {

        String content = body != null ? body.get("reply") : null;

        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi phản hồi.",
                reviewService.replyAsReviewee(id, content, user.getId())));
    }

    // ------------------------------------------------------------------
    // TIN ĐÃ LƯU
    // ------------------------------------------------------------------

    @GetMapping("/saved-jobs")
    @Operation(summary = "Danh sách tin tuyển dụng đã lưu")
    public ResponseEntity<ApiResponse<List<SavedJobResponse>>> listSavedJobs(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tin đã lưu thành công",
                savedJobService.list(user.getId())));
    }

    @GetMapping("/saved-jobs/ids")
    @Operation(summary = "Danh sách id tin tuyển dụng đã lưu")
    public ResponseEntity<ApiResponse<List<String>>> listSavedJobIds(@CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách id tin đã lưu thành công",
                savedJobService.listIds(user.getId())));
    }

    @PostMapping("/saved-jobs")
    @Operation(summary = "Lưu tin tuyển dụng")
    public ResponseEntity<ApiResponse<SavedJobResponse>> saveJob(
            @RequestBody SaveJobRequest request,
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Đã lưu tin.",
                savedJobService.save(request.getJobId(), user.getId())));
    }

    @DeleteMapping("/saved-jobs/{jobId}")
    @Operation(summary = "Bỏ lưu tin tuyển dụng")
    public ResponseEntity<ApiResponse<CountResponse>> removeSavedJob(
            @PathVariable("jobId") String jobId,
            @CurrentUser User user) {

        savedJobService.remove(jobId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã bỏ lưu tin.", null));
    }

    // ------------------------------------------------------------------
    // TUỲ CHỌN THÔNG BÁO TIN TUYỂN DỤNG
    // ------------------------------------------------------------------

    @GetMapping("/job-notifications")
    @Operation(summary = "Danh sách tuỳ chọn thông báo tin tuyển dụng đang bật")
    public ResponseEntity<ApiResponse<List<JobNotifyPreferenceResponse>>> listJobNotifications(
            @CurrentUser User user) {

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tuỳ chọn thông báo thành công",
                jobNotifyService.list(user.getId())));
    }

    @PostMapping("/job-notifications")
    @Operation(summary = "Bật thông báo tin tuyển dụng")
    public ResponseEntity<ApiResponse<JobNotifyPreferenceResponse>> subscribeJobNotification(
            @RequestBody JobNotifyPreferenceRequest request,
            @CurrentUser User user) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Đã bật thông báo tin tuyển dụng.",
                        jobNotifyService.subscribe(user.getId(), request)));
    }

    @DeleteMapping("/job-notifications")
    @Operation(summary = "Tắt thông báo tin tuyển dụng")
    public ResponseEntity<ApiResponse<Void>> unsubscribeJobNotification(
            @RequestParam("categoryCode") String categoryCode,
            @RequestParam(value = "provinceCode", required = false) String provinceCode,
            @CurrentUser User user) {

        jobNotifyService.unsubscribe(user.getId(), categoryCode, provinceCode);
        return ResponseEntity.ok(ApiResponse.success("Đã tắt thông báo tin tuyển dụng.", null));
    }
}
