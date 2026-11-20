package com.uniwork.service.impl;

import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.Application;
import com.uniwork.entity.ApplicationStatusHistory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.WorkAssignment;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.ApplicationStatusHistoryRepository;
import com.uniwork.repository.WorkAssignmentRepository;
import com.uniwork.service.WorkHistoryService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Triển khai nghiệp vụ kinh nghiệm làm việc của ứng viên.
 *
 * <p>Nguồn dữ liệu là bảng `work_assignments` — mỗi đơn ứng tuyển chuyển sang
 * {@code COMPLETED} sinh ra đúng 1 dòng (UNIQUE {@code application_id}).
 */
@Service
@RequiredArgsConstructor
public class WorkHistoryServiceImpl implements WorkHistoryService {

    private final WorkAssignmentRepository workAssignmentRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;

    // ------------------------------------------------------------------
    // GHI NHẬN
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public void recordCompletion(Application application, String note) {
        // Idempotent: 1 đơn chỉ ghi 1 lần.
        if (workAssignmentRepository.existsByApplicationId(application.getId())) {
            return;
        }

        JobPost job = application.getJobPost();
        LocalDateTime now = LocalDateTime.now();

        WorkAssignment row = WorkAssignment.builder()
                .slug("wh-" + java.util.UUID.randomUUID().toString().substring(0, 12))
                .application(application)
                .jobPost(job)
                .student(application.getStudent())
                .employer(job.getEmployer())
                .status("COMPLETED")
                .startedAt(resolveStartedAt(application))
                .endedAt(now)
                .employerConfirmedAt(now)
                // Snapshot tại thời điểm hoàn thành
                .jobTitle(job.getTitle())
                .companyName(job.getEmployer().getDisplayName())
                .positionName(job.getPosition() != null ? job.getPosition().getName() : job.getTitle())
                .salaryType(job.getSalaryType())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .note(note != null && !note.isBlank() ? note.trim() : null)
                .build();

        workAssignmentRepository.save(row);
    }

    /**
     * Thời điểm sinh viên bắt đầu làm việc = lúc đơn chuyển sang ACCEPTED.
     *
     * <p>Đọc từ `application_status_history` (nguồn sự thật của timeline).
     */
    private LocalDateTime resolveStartedAt(Application application) {
        List<ApplicationStatusHistory> timeline =
                historyRepository.findByApplicationIdOrderByChangedAtAsc(application.getId());

        return timeline.stream()
                .filter(h -> "ACCEPTED".equals(h.getToStatus()))
                .map(ApplicationStatusHistory::getChangedAt)
                .findFirst()
                .orElse(null);
    }

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<WorkHistoryResponse> listForStudent(Long studentUserId) {
        return workAssignmentRepository
                .findByStudentUserIdOrderByEndedAtDesc(studentUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkHistoryResponse> listForStudentByAdmin(Long studentUserId) {
        return listForStudent(studentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkHistoryResponse> listForApplication(String applicationId, Long employerUserId) {
        Application application = applicationRepository.findBySlug(applicationId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy đơn ứng tuyển."));

        Long studentUserId = application.getStudent().getUserId();

        // Quyền xem lịch sử làm việc của ứng viên:
        //   1) NTD sở hữu tin tuyển dụng của đơn này, hoặc
        //   2) NTD đã từng nhận đơn ứng tuyển của sinh viên này
        //      (cùng quy tắc với quyền đọc CV — BR-11.8).
        boolean ownsJob = application.getJobPost().getEmployer().getUserId().equals(employerUserId);
        boolean hasApplication = applicationRepository
                .existsByJobPostEmployerUserIdAndStudentUserId(employerUserId, studentUserId);

        if (!ownsJob && !hasApplication) {
            throw ApiErrors.forbidden("Bạn không có quyền xem hồ sơ ứng viên này.");
        }

        return workAssignmentRepository
                .findByStudentUserIdOrderByEndedAtDesc(studentUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ------------------------------------------------------------------
    // MAPPER
    // ------------------------------------------------------------------

    private WorkHistoryResponse toResponse(WorkAssignment row) {
        return WorkHistoryResponse.builder()
                .id(row.getSlug())
                .studentId(row.getStudent() != null ? row.getStudent().getSlug() : null)
                .applicationId(row.getApplication() != null ? row.getApplication().getSlug() : null)
                .jobId(row.getJobPost() != null ? row.getJobPost().getSlug() : null)
                .jobTitle(row.getJobTitle())
                .companyName(row.getCompanyName())
                .positionName(row.getPositionName())
                .startedAt(DateTimeUtils.toIso(row.getStartedAt()))
                .completedAt(DateTimeUtils.toIso(row.getEndedAt()))
                .salaryType(row.getSalaryType())
                .salaryMin(row.getSalaryMin() != null ? row.getSalaryMin().intValue() : null)
                .salaryMax(row.getSalaryMax() != null ? row.getSalaryMax().intValue() : null)
                .note(row.getNote())
                .rating(row.getRating() != null ? row.getRating().intValue() : null)
                .build();
    }
}
