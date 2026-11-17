package com.uniwork.controller;

import com.uniwork.constant.ApiEndpoints;
import com.uniwork.dto.request.CreateApplicationRequest;
import com.uniwork.dto.request.SaveJobRequest;
import com.uniwork.dto.request.UpdateStudentProfileRequest;
import com.uniwork.dto.response.ApiResponse;
import com.uniwork.dto.response.ApplicationResponse;
import com.uniwork.dto.response.CountResponse;
import com.uniwork.dto.response.SavedJobResponse;
import com.uniwork.dto.response.StudentProfileResponse;
import com.uniwork.entity.User;
import com.uniwork.security.CurrentUser;
import com.uniwork.service.ApplicationService;
import com.uniwork.service.ProfileService;
import com.uniwork.service.SavedJobService;
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
 *   <li>{@code GET    /api/v1/student/profile}</li>
 *   <li>{@code PUT    /api/v1/student/profile}</li>
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
}
