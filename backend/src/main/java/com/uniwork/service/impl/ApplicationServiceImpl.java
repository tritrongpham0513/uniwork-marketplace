package com.uniwork.service.impl;

import com.uniwork.dto.request.CreateApplicationRequest;
import com.uniwork.dto.request.UpdateApplicationStatusRequest;
import com.uniwork.dto.response.ApplicationResponse;
import com.uniwork.dto.response.ApplicationStatusEventResponse;
import com.uniwork.entity.Application;
import com.uniwork.entity.ApplicationStatusHistory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.ApplicationStatusHistoryRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.service.ApplicationService;
import com.uniwork.service.NotificationService;
import com.uniwork.service.WorkHistoryService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Triển khai nghiệp vụ đơn ứng tuyển.
 */
@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    /** Nhãn mặc định cho ghi chú khi NTD đổi trạng thái (khớp frontend). */
    private static final Map<String, String> DEFAULT_NOTES = Map.of(
            "SHORTLISTED", "Được duyệt sơ bộ",
            "ACCEPTED", "Đã nhận ứng viên",
            "COMPLETED", "Công việc đã hoàn thành",
            "REJECTED", "Không phù hợp");

    /** Nhãn hiển thị trạng thái cho sinh viên. */
    private static final Map<String, String> STATUS_LABELS = Map.of(
            "PENDING", "Đang chờ",
            "SHORTLISTED", "Được duyệt sơ bộ",
            "ACCEPTED", "Đã nhận",
            "COMPLETED", "Hoàn thành",
            "REJECTED", "Không phù hợp",
            "WITHDRAWN", "Đã rút");

    private static final List<String> VALID_STATUSES = List.of(
            "PENDING", "SHORTLISTED", "ACCEPTED", "COMPLETED", "REJECTED", "WITHDRAWN");

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final JobPostRepository jobPostRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WorkHistoryService workHistoryService;

    // ------------------------------------------------------------------
    // SINH VIÊN
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public ApplicationResponse create(CreateApplicationRequest request, Long studentUserId) {
        if (request.getJobId() == null || request.getJobId().isBlank()) {
            throw ApiErrors.badRequest("Vui lòng chọn tin tuyển dụng.",
                    ApiErrors.errors("jobId", "Thiếu mã tin tuyển dụng"));
        }

        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(request.getJobId())
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        if (!"OPEN".equals(job.getStatus())) {
            throw ApiErrors.badRequest("Tin tuyển dụng này đã ngừng nhận ứng tuyển.");
        }

        StudentProfile profile = studentProfileRepository.findById(studentUserId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ sinh viên."));

        if (applicationRepository.existsByJobPostIdAndStudentUserId(job.getId(), studentUserId)) {
            throw ApiErrors.badRequest("Bạn đã ứng tuyển vào tin tuyển dụng này rồi.");
        }

        LocalDateTime now = LocalDateTime.now();

        Application application = Application.builder()
                .slug("app-" + java.util.UUID.randomUUID().toString().substring(0, 12))
                .jobPost(job)
                .student(profile)
                .coverLetter(request.getCoverLetter() != null ? request.getCoverLetter() : "")
                .expectedSalary(request.getExpectedSalary() != null
                        ? BigDecimal.valueOf(request.getExpectedSalary()) : null)
                .experience(request.getExperience() != null ? request.getExperience().trim() : "")
                .availableFrom(DateTimeUtils.parseDate(request.getAvailableFrom()))
                .cvUrl(request.getCvUrl() != null ? request.getCvUrl() : profile.getCvUrl())
                .cvFileName(request.getCvFileName())
                .status("PENDING")
                .appliedAt(now)
                .updatedAt(now)
                .build();

        application = applicationRepository.save(application);

        historyRepository.save(ApplicationStatusHistory.builder()
                .application(application)
                .fromStatus(null)
                .toStatus("PENDING")
                .changedBy(null)
                .note(null)
                .changedAt(now)
                .build());

        // Tăng bộ đếm ứng viên trên tin
        job.setApplicantCount((job.getApplicantCount() != null ? job.getApplicantCount() : 0) + 1);
        jobPostRepository.save(job);

        // Thông báo cho nhà tuyển dụng
        notificationService.push(
                job.getEmployer().getUserId(),
                "APPLICATION",
                "Có ứng viên mới ứng tuyển",
                profile.getFullName() + " vừa ứng tuyển vào vị trí " + job.getTitle() + ".",
                "/employer/applications/" + application.getSlug());

        return toResponse(application);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApplicationResponse> listByStudent(Long studentUserId, String status) {
        List<Application> applications = (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status))
                ? applicationRepository.findByStudentUserIdOrderByAppliedAtDesc(studentUserId)
                : applicationRepository.findByStudentUserIdAndStatusOrderByAppliedAtDesc(studentUserId, status);

        return applications.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationResponse detailForStudent(String applicationId, Long studentUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getStudent().getUserId().equals(studentUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem đơn ứng tuyển này.");
        }

        return toResponse(application);
    }

    @Override
    @Transactional
    public ApplicationResponse withdraw(String applicationId, Long studentUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getStudent().getUserId().equals(studentUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền thao tác đơn ứng tuyển này.");
        }

        if (!"PENDING".equals(application.getStatus())) {
            throw ApiErrors.badRequest("Đơn ứng tuyển đã được xử lý, không thể rút. Vui lòng liên hệ nhà tuyển dụng.");
        }

        pushStatus(application, "WITHDRAWN", "Sinh viên đã rút đơn", null);

        // Giảm bộ đếm ứng viên trên tin (đã tăng khi sinh viên ứng tuyển)
        JobPost job = application.getJobPost();
        job.setApplicantCount(Math.max(0, (job.getApplicantCount() != null ? job.getApplicantCount() : 0) - 1));
        jobPostRepository.save(job);

        // Thông báo cho nhà tuyển dụng biết ứng viên đã rút đơn
        notificationService.push(
                application.getJobPost().getEmployer().getUserId(),
                "APPLICATION_STATUS",
                "Ứng viên đã rút đơn",
                application.getStudent().getFullName() + " đã rút đơn ứng tuyển vào vị trí "
                        + application.getJobPost().getTitle() + ".",
                "/employer/applications/" + application.getSlug());

        return toResponse(application);
    }

    // ------------------------------------------------------------------
    // NHÀ TUYỂN DỤNG
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<ApplicationResponse> listByEmployer(Long employerUserId, String jobId, String status) {
        List<Application> applications;

        if (jobId != null && !jobId.isBlank()) {
            applications = applicationRepository
                    .findByJobPostEmployerUserIdAndJobPostSlugOrderByAppliedAtDesc(employerUserId, jobId);
        } else {
            applications = applicationRepository.findByJobPostEmployerUserIdOrderByAppliedAtDesc(employerUserId);
        }

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            applications = applications.stream()
                    .filter(a -> status.equals(a.getStatus()))
                    .toList();
        }

        return applications.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicationResponse detailForEmployer(String applicationId, Long employerUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getJobPost().getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem đơn ứng tuyển này.");
        }

        return toResponse(application);
    }

    @Override
    @Transactional(readOnly = true)
    public Long studentUserIdOf(String applicationId, Long employerUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getJobPost().getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xem đơn ứng tuyển này.");
        }

        return application.getStudent().getUserId();
    }

    @Override
    @Transactional
    public ApplicationResponse updateStatus(String applicationId, UpdateApplicationStatusRequest request,
                                           Long employerUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getJobPost().getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền xử lý đơn ứng tuyển này.");
        }

        String newStatus = request.getStatus();
        if (newStatus == null || !VALID_STATUSES.contains(newStatus.toUpperCase())) {
            throw ApiErrors.badRequest("Trạng thái không hợp lệ.",
                    ApiErrors.errors("status", "Trạng thái không hợp lệ"));
        }
        newStatus = newStatus.toUpperCase();

        String note = request.getNote() != null && !request.getNote().isBlank()
                ? request.getNote()
                : DEFAULT_NOTES.get(newStatus);

        // Trạng thái trước khi đổi — dùng để biết có phải lần đầu chuyển sang
        // COMPLETED hay không (để ghi nhận kinh nghiệm làm việc).
        String previousStatus = application.getStatus();

        pushStatus(application, newStatus, note, employerUserId);

        // Hoàn thành công việc -> tự động ghi nhận kinh nghiệm làm việc cho SV.
        if ("COMPLETED".equals(newStatus) && !"COMPLETED".equals(previousStatus)) {
            workHistoryService.recordCompletion(application, note);
        }

        // Đồng bộ số suất của tin tuyển dụng
        syncJobPositions(application.getJobPost());

        // Thông báo cho sinh viên
        notificationService.push(
                application.getStudent().getUserId(),
                "APPLICATION_STATUS",
                "Cập nhật đơn ứng tuyển: " + application.getJobPost().getTitle(),
                note != null ? note
                        : "Trạng thái đơn ứng tuyển của bạn đã được cập nhật thành \""
                                + STATUS_LABELS.getOrDefault(newStatus, newStatus) + "\".",
                "/student/applications/" + application.getSlug());

        return toResponse(application);
    }

    // ------------------------------------------------------------------
    // GHI CHÚ NỘI BỘ
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public ApplicationResponse updateNote(String applicationId, String note, Long employerUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        if (!application.getJobPost().getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.forbidden("Bạn không có quyền ghi chú đơn ứng tuyển này.");
        }

        String trimmed = note != null ? note.trim() : null;
        if (trimmed != null && trimmed.length() > 500) {
            throw ApiErrors.badRequest("Ghi chú không được vượt quá 500 ký tự.",
                    ApiErrors.errors("note", "Ghi chú tối đa 500 ký tự"));
        }

        application.setEmployerNote(trimmed == null || trimmed.isEmpty() ? null : trimmed);
        application.setUpdatedAt(LocalDateTime.now());
        applicationRepository.save(application);

        return toResponse(application);
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    private void pushStatus(Application application, String status, String note, Long changedByUserId) {
        LocalDateTime now = LocalDateTime.now();

        String fromStatus = application.getStatus();
        application.setStatus(status);
        application.setUpdatedAt(now);

        if ("REJECTED".equals(status) && note != null) {
            application.setEmployerNote(note);
            application.setRejectReason(note);
        }
        // `reviewed_at` = lần đầu nhà tuyển dụng chủ động xử lý hồ sơ.
        if (application.getReviewedAt() == null
                && List.of("SHORTLISTED", "REJECTED").contains(status)) {
            application.setReviewedAt(now);
        }
        if (List.of("ACCEPTED", "REJECTED", "COMPLETED", "WITHDRAWN").contains(status)) {
            application.setDecidedAt(now);
        }

        applicationRepository.save(application);

        User changedBy = changedByUserId != null ? userRepository.findById(changedByUserId).orElse(null) : null;

        historyRepository.save(ApplicationStatusHistory.builder()
                .application(application)
                .fromStatus(fromStatus)
                .toStatus(status)
                .changedBy(changedBy != null ? changedBy.getId() : null)
                .note(note)
                .changedAt(now)
                .build());
    }

    /** Đồng bộ `positionsFilled` và trạng thái FILLED / IN_PROGRESS của tin tuyển dụng. */
    private void syncJobPositions(JobPost job) {
        long acceptedCount = applicationRepository.countByJobPostIdAndStatus(job.getId(), "ACCEPTED");
        short positionsCount = job.getPositionsCount() != null ? job.getPositionsCount() : (short) 1;

        job.setPositionsFilled((short) Math.min(acceptedCount, positionsCount));

        if (acceptedCount >= positionsCount) {
            // Đã tuyển đủ suất → đóng tin
            if ("OPEN".equals(job.getStatus()) || "IN_PROGRESS".equals(job.getStatus())) {
                job.setStatus("FILLED");
            }
        } else if (acceptedCount > 0) {
            // Đã có ứng viên được nhận nhưng còn suất → tin đang tuyển dở
            if ("OPEN".equals(job.getStatus())) {
                job.setStatus("IN_PROGRESS");
            }
        }

        jobPostRepository.save(job);
    }

    // ------------------------------------------------------------------
    // MAPPER
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public ApplicationResponse toResponse(Application application) {
        JobPost job = application.getJobPost();
        StudentProfile student = application.getStudent();

        List<ApplicationStatusEventResponse> timeline = historyRepository
                .findByApplicationIdOrderByChangedAtAsc(application.getId()).stream()
                .map(h -> ApplicationStatusEventResponse.builder()
                        .status(h.getToStatus())
                        .at(DateTimeUtils.toIso(h.getChangedAt()))
                        .note(h.getNote())
                        .build())
                .toList();

        String studentEmail = userRepository.findById(student.getUserId())
                .map(User::getEmail)
                .orElse("");

        return ApplicationResponse.builder()
                .id(application.getSlug())
                .jobId(job.getSlug())
                .jobTitle(job.getTitle())
                .employerId(job.getEmployer().getSlug())
                .employerName(job.getEmployer().getDisplayName())
                .employerLogoVariant(job.getEmployer().getLogoVariant())
                .employerVerified(job.getEmployer().getIsVerified())
                .studentId(student.getSlug())
                .studentName(student.getFullName())
                .studentAvatarUrl(student.getAvatarUrl())
                .studentUniversity(student.getUniversity())
                .studentMajor(student.getMajor())
                .studentYear(student.getYearOfStudy() != null ? student.getYearOfStudy().intValue() : null)
                .studentPhone(student.getPhone())
                .studentEmail(studentEmail)
                .studentSkills(student.getSkills() != null ? student.getSkills() : List.of())
                .studentBio(student.getBio())
                .cvUrl(application.getCvUrl())
                .cvFileName(application.getCvFileName())
                .coverLetter(application.getCoverLetter())
                .expectedSalary(application.getExpectedSalary() != null
                        ? application.getExpectedSalary().intValue() : null)
                .experience(application.getExperience())
                .availableFrom(DateTimeUtils.toDate(application.getAvailableFrom()))
                .status(application.getStatus())
                .employerNote(application.getEmployerNote())
                .timeline(timeline)
                .createdAt(DateTimeUtils.toIso(application.getAppliedAt()))
                .updatedAt(DateTimeUtils.toIso(application.getUpdatedAt()))
                .build();
    }
}
