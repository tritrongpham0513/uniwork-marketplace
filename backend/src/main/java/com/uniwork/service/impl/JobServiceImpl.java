package com.uniwork.service.impl;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.dto.response.AiReasonResponse;
import com.uniwork.dto.response.EmployerSummaryResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobListResponse;
import com.uniwork.dto.response.JobLocationResponse;
import com.uniwork.dto.response.JobPositionResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.dto.response.JobScheduleResponse;
import com.uniwork.dto.response.SkillResponse;
import com.uniwork.entity.District;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobCategory;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.JobPostSchedule;
import com.uniwork.entity.JobPostSkill;
import com.uniwork.entity.JobPosition;
import com.uniwork.entity.Province;
import com.uniwork.entity.Skill;
import com.uniwork.entity.User;
import com.uniwork.entity.Ward;
import com.uniwork.repository.DistrictRepository;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.FileUploadRepository;
import com.uniwork.repository.JobCategoryRepository;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.JobPostScheduleRepository;
import com.uniwork.repository.JobPostSkillRepository;
import com.uniwork.repository.JobPositionRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.SkillRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WardRepository;
import com.uniwork.repository.specification.JobPostSpecification;
import com.uniwork.service.JobNotifyService;
import com.uniwork.service.JobService;
import com.uniwork.service.FileStorageService;
import com.uniwork.service.NotificationService;
import com.uniwork.service.ai.JobAiReviewScheduler;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import com.uniwork.util.FileUrlValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Triển khai nghiệp vụ tin tuyển dụng.
 *
 * <p>Quy ước quy đổi lương nằm ở {@link com.uniwork.util.SalaryUnits} —
 * nguồn sự thật duy nhất, dùng chung với lớp kiểm duyệt AI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobServiceImpl implements JobService {

    private final JobPostRepository jobPostRepository;
    private final JobPostScheduleRepository scheduleRepository;
    private final JobPostSkillRepository jobSkillRepository;
    private final JobCategoryRepository jobCategoryRepository;
    private final JobPositionRepository jobPositionRepository;
    private final ProvinceRepository provinceRepository;
    private final DistrictRepository districtRepository;
    private final WardRepository wardRepository;
    private final SkillRepository skillRepository;
    private final EmployerProfileRepository employerProfileRepository;
    private final UserRepository userRepository;
    private final FileUploadRepository fileUploadRepository;
    private final NotificationService notificationService;
    private final JobNotifyService jobNotifyService;

    /**
     * Lớp cửa chạy kiểm duyệt AI ở nền.
     *
     * <p>Tiêm theo kiểu tuỳ chọn ({@code required = false}) vì kiểm duyệt AI là
     * <b>tính năng phụ</b>: thiếu lớp cửa thì luồng đăng tin vẫn phải chạy bình
     * thường, không được phép hỏng.
     */
    @Autowired(required = false)
    private JobAiReviewScheduler jobAiReviewScheduler;

    // ------------------------------------------------------------------
    // ĐỌC
    // ------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public JobListResponse list(
            String keyword,
            String categoryIds,
            String positionIds,
            String provinceIds,
            String districtIds,
            String wardIds,
            String employmentTypes,
            String workModes,
            Integer salaryMin,
            Integer salaryMax,
            String sort,
            Integer page,
            Integer pageSize,
            String status,
            String employerId) {

        Long employerUserId = null;
        if (employerId != null && !employerId.isBlank()) {
            employerUserId = employerProfileRepository.findBySlug(employerId)
                    .map(EmployerProfile::getUserId)
                    .orElse(null);
            if (employerUserId == null) {
                return JobListResponse.builder()
                        .items(List.of())
                        .totalItems(0)
                        .currentPage(1)
                        .totalPages(1)
                        .build();
            }
        }

        int safePage = Math.max(1, page == null ? 1 : page);
        int safePageSize = Math.min(100, Math.max(1, pageSize == null ? 10 : pageSize));

        Pageable pageable = PageRequest.of(safePage - 1, safePageSize, toSort(sort));

        var spec = JobPostSpecification.filter(
                status,
                employerUserId,
                splitIds(categoryIds),
                splitIds(positionIds),
                splitIds(provinceIds),
                splitIds(districtIds),
                splitIds(wardIds),
                splitIds(employmentTypes),
                splitIds(workModes),
                salaryMin != null ? BigDecimal.valueOf(salaryMin) : null,
                salaryMax != null ? BigDecimal.valueOf(salaryMax) : null,
                keyword);

        Page<JobPost> result = jobPostRepository.findAll(spec, pageable);

        return JobListResponse.builder()
                .items(result.getContent().stream().map(this::toResponse).toList())
                .totalItems((int) result.getTotalElements())
                .currentPage(result.getNumber() + 1)
                .totalPages(Math.max(1, result.getTotalPages()))
                .build();
    }

    @Override
    @Transactional
    public JobResponse detail(String jobId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        // Tăng bộ đếm lượt xem khi mở chi tiết tin (fire-and-forget, không chặn response).
        job.setViewCount((job.getViewCount() != null ? job.getViewCount() : 0) + 1);
        jobPostRepository.save(job);

        return toResponse(job);
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobResponse> related(String categoryId, String excludeId, Integer limit) {
        int safeLimit = limit == null || limit <= 0 ? 6 : Math.min(20, limit);

        List<JobPost> candidates = jobPostRepository.findAllByDeletedAtIsNull().stream()
                .filter(job -> "OPEN".equals(job.getStatus()))
                .filter(job -> excludeId == null || !excludeId.equals(job.getSlug()))
                .sorted(Comparator
                        .comparing((JobPost job) ->
                                categoryId != null && categoryId.equals(job.getCategory().getCode()) ? 0 : 1)
                        .thenComparing(job -> job.getPublishedAt(),
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(safeLimit)
                .toList();

        return candidates.stream().map(this::toResponse).toList();
    }

    // ------------------------------------------------------------------
    // GHI — NHÀ TUYỂN DỤNG
    // ------------------------------------------------------------------

    @Override
    @Transactional
    public JobResponse create(JobUpsertRequest request, Long employerUserId) {
        validate(request);

        EmployerProfile employer = employerProfileRepository.findById(employerUserId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ nhà tuyển dụng."));

        // Kiểm tra ảnh trước khi dựng entity: ảnh sai sở hữu là lỗi của
        // request, báo ra sớm thì nhà tuyển dụng biết ngay nguyên nhân.
        String previewImageUrl = resolvePreviewImageUrl(request.getPreviewImageUrl(), employerUserId);

        JobPost job = JobPost.builder()
                .slug(generateSlug("job"))
                .employer(employer)
                .category(resolveCategory(request))
                .position(resolvePosition(request))
                .title(request.getTitle().trim())
                .previewImageUrl(previewImageUrl)
                .description(request.getDescription() != null ? request.getDescription() : "")
                .requirements(request.getRequirements() != null ? request.getRequirements() : new ArrayList<>())
                .benefits(request.getBenefits() != null ? request.getBenefits() : new ArrayList<>())
                .workMode(defaultStr(request.getWorkMode(), "ONSITE"))
                .employmentType(defaultStr(request.getEmploymentType(), "PART_TIME"))
                .salaryType(defaultStr(request.getSalaryType(), "HOURLY"))
                .salaryMin(request.getSalaryMin() != null ? BigDecimal.valueOf(request.getSalaryMin()) : null)
                .salaryMax(request.getSalaryMax() != null ? BigDecimal.valueOf(request.getSalaryMax()) : null)
                .positionsCount(request.getPositionsCount() != null ? request.getPositionsCount().shortValue() : (short) 1)
                .positionsFilled((short) 0)
                .viewCount(0)
                .applicantCount(0)
                .isUrgent(false)
                // Tin mới đăng luôn ở trạng thái chờ duyệt
                .status("PENDING_REVIEW")
                .build();

        applyLocation(job, request);

        LocalDateTime deadline = DateTimeUtils.parseDateTime(request.getDeadline());
        if (deadline != null) {
            job.setApplicationDeadline(deadline);
        }

        job = jobPostRepository.save(job);

        replaceSchedules(job, request);
        replaceSkills(job, request);

        // Tin mới luôn chờ duyệt → báo cho các quản trị viên xử lý
        notifyAdminsAboutPendingJob(job, employer);

        // Kiểm duyệt AI chạy nền, sau khi response HTTP đã trả về cho nhà tuyển dụng.
        scheduleAiReview(job.getSlug());

        return toResponse(job);
    }

    @Override
    @Transactional
    public JobResponse update(String jobId, JobUpsertRequest request, Long employerUserId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        if (!job.getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.notFound("Không tìm thấy tin tuyển dụng này.");
        }

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw ApiErrors.badRequest("Tiêu đề tin tuyển dụng là bắt buộc.",
                    ApiErrors.errors("title", "Vui lòng nhập tiêu đề tin tuyển dụng"));
        }

        // Tính trước khi sửa: so sánh nội dung chữ cũ với nội dung mới.
        // AI chỉ đọc chữ (`JobContentAssembler`) nên khi chỉ đổi ảnh preview thì
        // gọi lại AI là đốt hạn mức vô ích.
        boolean textChanged = hasTextContentChanged(job, request);

        job.setTitle(request.getTitle().trim());

        // Ảnh preview: chỉ set khi client thực sự gửi lên (không gửi = giữ
        // ảnh cũ). Gửi rỗng = xoá ảnh.
        String previousImageUrl = job.getPreviewImageUrl();
        boolean imageFieldProvided = request.getPreviewImageUrl() != null;
        String resolvedImageUrl = imageFieldProvided
                ? resolvePreviewImageUrl(request.getPreviewImageUrl(), employerUserId)
                : previousImageUrl;
        if (imageFieldProvided) {
            job.setPreviewImageUrl(resolvedImageUrl);
        }

        if (request.getDescription() != null) {
            job.setDescription(request.getDescription());
        }
        if (request.getRequirements() != null) {
            job.setRequirements(request.getRequirements());
        }
        if (request.getBenefits() != null) {
            job.setBenefits(request.getBenefits());
        }
        if (request.getCategory() != null) {
            job.setCategory(resolveCategory(request));
        }
        if (request.getPosition() != null) {
            job.setPosition(resolvePosition(request));
        }
        if (request.getEmploymentType() != null) {
            job.setEmploymentType(request.getEmploymentType());
        }
        if (request.getWorkMode() != null) {
            job.setWorkMode(request.getWorkMode());
        }
        if (request.getSalaryType() != null) {
            job.setSalaryType(request.getSalaryType());
        }
        if (request.getSalaryMin() != null) {
            job.setSalaryMin(BigDecimal.valueOf(request.getSalaryMin()));
        }
        if (request.getSalaryMax() != null) {
            job.setSalaryMax(BigDecimal.valueOf(request.getSalaryMax()));
        }
        if (request.getPositionsCount() != null && request.getPositionsCount() > 0) {
            job.setPositionsCount(request.getPositionsCount().shortValue());
        }
        if (request.getPositionsFilled() != null && request.getPositionsFilled() >= 0) {
            // Không cho vượt quá số suất đang tuyển
            short max = job.getPositionsCount() != null ? job.getPositionsCount() : (short) 1;
            job.setPositionsFilled((short) Math.min(request.getPositionsFilled(), max));
        }
        if (request.getDeadline() != null) {
            job.setApplicationDeadline(DateTimeUtils.parseDateTime(request.getDeadline()));
        }

        applyLocation(job, request);

        // Sửa tin đã được duyệt hoặc bị từ chối → tin quay lại hàng đợi duyệt của quản trị viên
        // (khớp với hành vi của mock layer). `publishedAt` giữ nguyên để không
        // mất mốc thời gian đăng tin ban đầu.
        boolean backToReview = "OPEN".equals(job.getStatus()) || "REJECTED".equals(job.getStatus());
        if (backToReview) {
            job.setStatus("PENDING_REVIEW");
        }

        job = jobPostRepository.save(job);

        if (request.getSchedules() != null) {
            replaceSchedules(job, request);
        }
        if (request.getSkills() != null) {
            replaceSkills(job, request);
        }

        if (backToReview) {
            notifyAdminsAboutPendingJob(job, job.getEmployer());

            // Nội dung chữ vừa sửa cần được kiểm duyệt lại — chạy nền.
            // Tin vốn đang ở PENDING_REVIEW thì không gọi lại AI (giữ hạn mức).
            // Chỉ đổi ảnh preview thì không gọi AI: AI không đọc ảnh, gọi lại chỉ
            // đốt hạn mức mà không đổi kết quả.
            if (textChanged) {
                scheduleAiReview(job.getSlug());
            }
        }

        return toResponse(job);
    }

    @Override
    @Transactional
    public void remove(String jobId, Long employerUserId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        if (!job.getEmployer().getUserId().equals(employerUserId)) {
            throw ApiErrors.notFound("Không tìm thấy tin tuyển dụng này.");
        }

        job.setStatus("CANCELLED");
        job.setClosedAt(LocalDateTime.now());
        job.setDeletedAt(LocalDateTime.now());
        jobPostRepository.save(job);
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobResponse> listByEmployer(Long employerUserId, String status) {
        List<JobPost> jobs = (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status))
                ? jobPostRepository.findByEmployerUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(employerUserId)
                : jobPostRepository.findByEmployerUserIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(employerUserId, status);

        return jobs.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminJobResponse> listForAdmin(String status) {
        List<JobPost> jobs = (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status))
                ? jobPostRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
                : jobPostRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status);

        return jobs.stream().map(this::toAdminResponse).toList();
    }

    @Override
    @Transactional
    public JobResponse review(String jobId, String action, String reason, Long adminUserId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        if ("APPROVE".equalsIgnoreCase(action)) {
            job.setStatus("OPEN");
            job.setReviewedAt(LocalDateTime.now());
            job.setRejectReason(null);
            if (job.getPublishedAt() == null) {
                job.setPublishedAt(LocalDateTime.now());
            }
        } else if ("REJECT".equalsIgnoreCase(action)) {
            job.setStatus("REJECTED");
            job.setReviewedAt(LocalDateTime.now());
            job.setRejectReason(reason != null ? reason : "Tin không đáp ứng yêu cầu.");
        } else {
            throw ApiErrors.badRequest("Hành động không hợp lệ.",
                    ApiErrors.errors("action", "Chỉ hỗ trợ APPROVE hoặc REJECT"));
        }

        job = jobPostRepository.save(job);

        notifyEmployerAboutReview(job, action, reason);

        // Tin được duyệt → báo cho các sinh viên đang bật thông báo theo dõi
        if ("APPROVE".equalsIgnoreCase(action)) {
            jobNotifyService.notifySubscribers(job);
        }

        return toResponse(job);
    }

    // ------------------------------------------------------------------
    // THÔNG BÁO
    // ------------------------------------------------------------------

    /** Báo cho mọi quản trị viên biết có tin tuyển dụng mới chờ duyệt. */
    private void notifyAdminsAboutPendingJob(JobPost job, EmployerProfile employer) {
        List<Long> adminIds = userRepository.findByRoleCode("ADMIN").stream()
                .map(User::getId)
                .toList();

        if (adminIds.isEmpty()) {
            return;
        }

        String employerName = employer.getDisplayName() != null ? employer.getDisplayName() : "Một nhà tuyển dụng";

        notificationService.pushToAll(
                adminIds,
                "JOB",
                "Có tin tuyển dụng mới chờ duyệt",
                employerName + " vừa đăng tin '" + job.getTitle() + "'.",
                "/admin/jobs");
    }

    /** Báo kết quả duyệt tin cho nhà tuyển dụng. */
    private void notifyEmployerAboutReview(JobPost job, String action, String reason) {
        Long employerUserId = job.getEmployer().getUserId();
        if (employerUserId == null) {
            return;
        }

        if ("APPROVE".equalsIgnoreCase(action)) {
            notificationService.push(
                    employerUserId,
                    "JOB",
                    "Tin tuyển dụng đã được duyệt",
                    "Tin '" + job.getTitle() + "' của bạn đã được duyệt và đang hiển thị công khai.",
                    "/employer/jobs");
        } else {
            notificationService.push(
                    employerUserId,
                    "JOB",
                    "Tin tuyển dụng bị từ chối",
                    "Tin '" + job.getTitle() + "' bị từ chối. Lý do: "
                            + (reason != null && !reason.isBlank() ? reason : "Tin không đáp ứng yêu cầu."),
                    "/employer/jobs/" + job.getSlug() + "/edit");
        }
    }

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------

    /**
     * Yêu cầu kiểm duyệt AI ở nền cho một tin tuyển dụng.
     *
     * <p>Việc kiểm duyệt được hoãn lại đến <b>sau khi giao dịch hiện tại commit</b>:
     * luồng nền tải lại tin trong giao dịch riêng của nó, nên phải chắc chắn dữ
     * liệu đã được ghi xuống cơ sở dữ liệu. Nếu gọi ngay trong giao dịch, luồng
     * nền có thể không tìm thấy tin và báo 404.
     *
     * <p>Nếu không có giao dịch nào đang chạy (ví dụ gọi trực tiếp ngoài Spring
     * transaction), gọi thẳng luồng nền.
     *
     * <p>Mọi lỗi ở đây bị nuốt: lỗi AI <b>không được</b> làm hỏng luồng đăng
     * tin — tin vẫn đăng bình thường, kết quả kiểm duyệt giữ nguyên rỗng
     * (chưa kiểm tra), nhà tuyển dụng không thấy lỗi 500.
     */
    private void scheduleAiReview(String jobSlug) {
        if (jobSlug == null || jobSlug.isBlank() || jobAiReviewScheduler == null) {
            return;
        }

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            dispatchAiReview(jobSlug);
                        }
                    });
            return;
        }

        dispatchAiReview(jobSlug);
    }

    /** Bắn lệnh kiểm duyệt AI, nuốt mọi lỗi phát sinh. */
    private void dispatchAiReview(String jobSlug) {
        try {
            jobAiReviewScheduler.scheduleReview(jobSlug);
        } catch (Exception ex) {
            log.warn("Khong phat sinh duoc lenh kiem duyet AI cho tin {}: {}", jobSlug, ex.getMessage());
        }
    }

    private void validate(JobUpsertRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw ApiErrors.badRequest("Tiêu đề tin tuyển dụng là bắt buộc.",
                    ApiErrors.errors("title", "Vui lòng nhập tiêu đề tin tuyển dụng"));
        }
        if (request.getCategory() == null || request.getCategory().getId() == null) {
            throw ApiErrors.badRequest("Vui lòng chọn nhóm việc.",
                    ApiErrors.errors("categoryId", "Vui lòng chọn nhóm việc"));
        }
        if (request.getSalaryMin() != null && request.getSalaryMin() < 0) {
            throw ApiErrors.badRequest("Mức lương không hợp lệ.",
                    ApiErrors.errors("salaryMin", "Mức lương không được nhỏ hơn 0"));
        }
    }

    /**
     * Kiểm tra & chuẩn hoá URL ảnh preview của tin tuyển dụng.
     *
     * <p>Ảnh phải là file do chính nhà tuyển dụng đang đăng tin tải lên, có
     * loại {@code JOB_IMAGE} và chưa bị xoá. Nhờ vậy không ai dán được URL ảnh
     * của nhà tuyển dụng khác (hay ảnh ngoài hệ thống) vào tin của mình.
     *
     * @param url          URL ảnh do client gửi lên (có thể null / rỗng)
     * @param ownerUserId  id nhà tuyển dụng sở hữu tin
     * @return URL ảnh hợp lệ (chuẩn hoá về dạng tương đối), hoặc {@code null}
     * @throws com.uniwork.exception.AppException 400 nếu ảnh không hợp lệ
     */
    private String resolvePreviewImageUrl(String url, Long ownerUserId) {
        if (url == null || url.isBlank()) {
            return null;
        }

        String slug = FileUrlValidator.slugOf(url);
        if (slug == null) {
            throw ApiErrors.badRequest("Ảnh preview không hợp lệ.",
                    ApiErrors.errors("previewImageUrl", "Ảnh preview không hợp lệ."));
        }

        var file = fileUploadRepository.findBySlugAndDeletedAtIsNull(slug)
                .filter(f -> FileStorageService.Kind.JOB_IMAGE.name().equals(f.getKind()))
                .filter(f -> ownerUserId.equals(f.getOwnerUserId()))
                .orElseThrow(() -> ApiErrors.badRequest("Ảnh preview không hợp lệ.",
                        ApiErrors.errors("previewImageUrl", "Ảnh preview không hợp lệ.")));

        return FileUrlValidator.FILES_PATH + file.getSlug();
    }

    /**
     * Nội dung chữ của tin có thay đổi không (bỏ qua ảnh preview)?
     *
     * <p>Dùng để quyết định có gọi lại AI kiểm duyệt không. AI chỉ đọc chữ
     * (`JobContentAssembler`) nên khi nhà tuyển dụng chỉ đổi ảnh thì gọi lại là
     * đốt hạn mức vô ích.
     */
    private boolean hasTextContentChanged(JobPost job, JobUpsertRequest request) {
        if (request.getTitle() != null
                && !request.getTitle().trim().equals(job.getTitle())) {
            return true;
        }
        if (request.getDescription() != null
                && !request.getDescription().equals(job.getDescription())) {
            return true;
        }
        if (request.getRequirements() != null
                && !request.getRequirements().equals(
                        job.getRequirements() != null ? job.getRequirements() : List.of())) {
            return true;
        }
        if (request.getBenefits() != null
                && !request.getBenefits().equals(
                        job.getBenefits() != null ? job.getBenefits() : List.of())) {
            return true;
        }
        if (request.getCategory() != null) {
            String currentCode = job.getCategory() != null ? job.getCategory().getCode() : null;
            if (!request.getCategory().getId().equals(currentCode)) {
                return true;
            }
        }
        if (request.getPosition() != null) {
            String currentCode = job.getPosition() != null ? job.getPosition().getCode() : null;
            if (!request.getPosition().getId().equals(currentCode)) {
                return true;
            }
        }
        if (request.getEmploymentType() != null
                && !request.getEmploymentType().equals(job.getEmploymentType())) {
            return true;
        }
        if (request.getWorkMode() != null
                && !request.getWorkMode().equals(job.getWorkMode())) {
            return true;
        }
        if (request.getSalaryType() != null
                && !request.getSalaryType().equals(job.getSalaryType())) {
            return true;
        }
        if (request.getSalaryMin() != null
                && !BigDecimal.valueOf(request.getSalaryMin()).equals(job.getSalaryMin())) {
            return true;
        }
        if (request.getSalaryMax() != null
                && !BigDecimal.valueOf(request.getSalaryMax()).equals(job.getSalaryMax())) {
            return true;
        }
        if (request.getPositionsCount() != null
                && !request.getPositionsCount().equals(
                        job.getPositionsCount() != null
                                ? job.getPositionsCount().intValue()
                                : null)) {
            return true;
        }
        return locationChanged(job, request);
    }

    /**
     * Địa điểm của tin có thay đổi không?
     *
     * <p>So sánh trên mã tỉnh / xã mà client gửi lên (chuỗi) — cùng nguồn với
     * {@link #applyLocation} nên không dịch vòng hai lần.
     */
    private boolean locationChanged(JobPost job, JobUpsertRequest request) {
        JobUpsertRequest.LocationRef location = request.getLocation();
        if (location == null) {
            return false;
        }

        String currentAddress = job.getAddressDetail() != null ? job.getAddressDetail() : "";
        String requestedAddress = location.getAddress() != null ? location.getAddress() : "";
        if (!currentAddress.equals(requestedAddress)) {
            return true;
        }

        String currentBranch = job.getBranchName() != null ? job.getBranchName() : "";
        String requestedBranch = location.getBranchName() != null ? location.getBranchName() : "";
        if (!currentBranch.equals(requestedBranch)) {
            return true;
        }

        if (location.getProvinceId() != null && !location.getProvinceId().isBlank()) {
            Province province = provinceRepository.findByCode(location.getProvinceId()).orElse(null);
            if (province != null && !province.getId().equals(job.getProvinceId())) {
                return true;
            }
        }

        if (location.getWardId() != null && !location.getWardId().isBlank()) {
            Ward ward = wardRepository.findByCode(location.getWardId()).orElse(null);
            if (ward != null && !ward.getId().equals(job.getWardId())) {
                return true;
            }
        } else if (job.getWardId() != null) {
            // Client bỏ chọn xã/phường → giá trị cũ sẽ bị xoá.
            return true;
        }

        return false;
    }

    private JobCategory resolveCategory(JobUpsertRequest request) {
        String code = request.getCategory().getId();
        return jobCategoryRepository.findByCode(code)
                .orElseThrow(() -> ApiErrors.badRequest("Nhóm việc không tồn tại.",
                        ApiErrors.errors("categoryId", "Nhóm việc không tồn tại")));
    }

    private JobPosition resolvePosition(JobUpsertRequest request) {
        if (request.getPosition() == null || request.getPosition().getId() == null) {
            return null;
        }
        return jobPositionRepository.findByCode(request.getPosition().getId()).orElse(null);
    }

    private void applyLocation(JobPost job, JobUpsertRequest request) {
        JobUpsertRequest.LocationRef location = request.getLocation();
        if (location == null) {
            return;
        }

        if (location.getProvinceId() != null && !location.getProvinceId().isBlank()) {
            Province province = provinceRepository.findByCode(location.getProvinceId()).orElse(null);
            job.setProvinceId(province != null ? province.getId() : null);
        }
        if (location.getDistrictId() != null && !location.getDistrictId().isBlank()) {
            District district = districtRepository.findByCode(location.getDistrictId()).orElse(null);
            job.setDistrictId(district != null ? district.getId() : null);
        }

        // Xã/phường — cấp hành chính chính thức từ 01/07/2025.
        // Luôn gán (kể cả rỗng) để bỏ chọn xã/phường thật sự xoá giá trị cũ.
        if (location.getWardId() != null && !location.getWardId().isBlank()) {
            Ward ward = wardRepository.findByCode(location.getWardId()).orElse(null);
            if (ward != null) {
                job.setWardId(ward.getId());
                // Tỉnh phải khớp với tỉnh chứa xã/phường — ưu tiên tỉnh của xã.
                job.setProvinceId(ward.getProvince().getId());
            }
        } else {
            job.setWardId(null);
        }

        job.setAddressDetail(location.getAddress());
        job.setBranchName(location.getBranchName());
    }

    private void replaceSchedules(JobPost job, JobUpsertRequest request) {
        scheduleRepository.deleteByJobPostId(job.getId());
        scheduleRepository.flush();
        if (request.getSchedules() == null) {
            return;
        }
        List<JobPostSchedule> rows = new ArrayList<>();
        for (JobUpsertRequest.ScheduleRef ref : request.getSchedules()) {
            if (ref == null || ref.getDayOfWeek() == null) {
                continue;
            }
            LocalTime start = DateTimeUtils.parseTime(ref.getStartTime());
            LocalTime end = DateTimeUtils.parseTime(ref.getEndTime());
            if (start == null || end == null) {
                continue;
            }
            rows.add(JobPostSchedule.builder()
                    .jobPost(job)
                    .dayOfWeek(ref.getDayOfWeek().shortValue())
                    .startTime(start)
                    .endTime(end)
                    .build());
        }
        scheduleRepository.saveAll(rows);
    }

    private void replaceSkills(JobPost job, JobUpsertRequest request) {
        jobSkillRepository.deleteByJobPostId(job.getId());
        jobSkillRepository.flush();
        if (request.getSkills() == null) {
            return;
        }
        List<JobPostSkill> rows = new ArrayList<>();
        for (JobUpsertRequest.SkillRef ref : request.getSkills()) {
            if (ref == null || ref.getId() == null) {
                continue;
            }
            Skill skill = skillRepository.findBySlug(ref.getId()).orElse(null);
            if (skill == null) {
                continue;
            }
            rows.add(JobPostSkill.builder().jobPost(job).skill(skill).build());
        }
        jobSkillRepository.saveAll(rows);
    }

    private String generateSlug(String prefix) {
        return prefix + "-" + java.util.UUID.randomUUID().toString().substring(0, 12);
    }

    private static String defaultStr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static List<String> splitIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static Sort toSort(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "publishedAt");
        }
        return switch (sort) {
            case "salary_desc" -> Sort.by(Sort.Direction.DESC, "salaryMinHourly");
            case "salary_asc" -> Sort.by(Sort.Direction.ASC, "salaryMinHourly");
            case "popular" -> Sort.by(Sort.Direction.DESC, "viewCount");
            default -> Sort.by(Sort.Direction.DESC, "publishedAt");
        };
    }

    // ------------------------------------------------------------------
    // MAPPER
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public JobResponse toResponse(JobPost job) {
        return fillBase(job, JobResponse.builder()).build();
    }

    /**
     * Ánh xạ tin tuyển dụng cho quản trị viên — kèm 3 trường kết quả kiểm duyệt AI.
     *
     * <p>Chỉ endpoint {@code GET /api/v1/admin/jobs} dùng hàm này. Mọi endpoint
     * công khai và endpoint dành cho nhà tuyển dụng dùng {@link #toResponse(JobPost)}
     * nên không thể lộ ra kết quả AI (CONTRACT.md mục 6).
     */
    @Transactional(readOnly = true)
    public AdminJobResponse toAdminResponse(JobPost job) {
        AdminJobResponse.AdminJobResponseBuilder<?, ?> builder = AdminJobResponse.builder();
        fillBase(job, builder);

        builder.aiVerdict(job.getAiVerdict());
        builder.aiSummary(job.getAiSummary());
        builder.aiReasons(job.getAiReasons() == null ? null : job.getAiReasons().stream()
                .map(reason -> AiReasonResponse.builder()
                        .code(reason.getCode())
                        .evidence(reason.getEvidence())
                        .detail(reason.getDetail())
                        .build())
                .toList());
        builder.aiCheckedAt(DateTimeUtils.toIso(job.getAiCheckedAt()));

        return builder.build();
    }

    /**
     * Điền các trường chung của tin tuyển dụng vào builder.
     *
     * <p>Dùng chung giữa {@link #toResponse(JobPost)} và {@link #toAdminResponse(JobPost)}
     * để hai hình dạng không lệch nhau theo thời gian.
     */
    private JobResponse.JobResponseBuilder<?, ?> fillBase(
            JobPost job, JobResponse.JobResponseBuilder<?, ?> builder) {

        JobCategory category = job.getCategory();
        JobPosition position = job.getPosition();
        EmployerProfile employer = job.getEmployer();

        List<JobScheduleResponse> schedules = scheduleRepository.findByJobPostIdOrderByDayOfWeekAsc(job.getId()).stream()
                .map(s -> JobScheduleResponse.builder()
                        .dayOfWeek(s.getDayOfWeek() != null ? s.getDayOfWeek().intValue() : null)
                        .startTime(DateTimeUtils.toHourMinute(s.getStartTime()))
                        .endTime(DateTimeUtils.toHourMinute(s.getEndTime()))
                        .build())
                .toList();

        List<SkillResponse> skills = jobSkillRepository.findByJobPostId(job.getId()).stream()
                .map(js -> SkillResponse.builder()
                        .id(js.getSkill().getSlug())
                        .name(js.getSkill().getName())
                        .build())
                .toList();

        JobLocationResponse location = JobLocationResponse.builder()
                .provinceId(job.getProvince() != null ? job.getProvince().getCode() : "")
                .province(job.getProvince() != null ? job.getProvince().getName() : "")
                .districtId(job.getDistrict() != null ? job.getDistrict().getCode() : "")
                .district(job.getDistrict() != null ? job.getDistrict().getName() : "")
                .wardId(job.getWard() != null ? job.getWard().getCode() : "")
                .ward(job.getWard() != null ? job.getWard().getName() : "")
                .address(job.getAddressDetail() != null ? job.getAddressDetail() : "")
                .branchName(job.getBranchName())
                .build();

        return builder
                .id(job.getSlug())
                .title(job.getTitle())
                .previewImageUrl(job.getPreviewImageUrl())
                .description(job.getDescription())
                .requirements(job.getRequirements() != null ? job.getRequirements() : List.of())
                .benefits(job.getBenefits() != null ? job.getBenefits() : List.of())
                .category(JobCategoryResponse.builder()
                        .id(category.getCode())
                        .name(category.getName())
                        .slug(category.getSlug())
                        .description(category.getDescription() != null ? category.getDescription() : "")
                        .icon(category.getIcon())
                        .jobCount(0)
                        .isActive(category.getIsActive())
                        .sortOrder(category.getSortOrder() != null ? category.getSortOrder().intValue() : 0)
                        .build())
                .position(position == null ? null : JobPositionResponse.builder()
                        .id(position.getCode())
                        .categoryId(position.getCategory() != null ? position.getCategory().getCode() : null)
                        .name(position.getName())
                        .slug(position.getSlug())
                        .jobCount(0)
                        .build())
                .employer(EmployerSummaryResponse.builder()
                        .id(employer.getSlug())
                        .name(employer.getDisplayName())
                        .logoVariant(employer.getLogoVariant())
                        .logoUrl(employer.getLogoUrl())
                        .verified(employer.getIsVerified())
                        .build())
                .employmentType(job.getEmploymentType())
                .workMode(job.getWorkMode())
                .salaryType(job.getSalaryType())
                .salaryMin(job.getSalaryMin() != null ? job.getSalaryMin().intValue() : 0)
                .salaryMax(job.getSalaryMax() != null ? job.getSalaryMax().intValue() : null)
                .location(location)
                .positionsCount(job.getPositionsCount() != null ? job.getPositionsCount().intValue() : 1)
                .positionsFilled(job.getPositionsFilled() != null ? job.getPositionsFilled().intValue() : 0)
                .schedules(schedules)
                .skills(skills)
                .status(job.getStatus())
                .postedAt(DateTimeUtils.toIso(job.getPublishedAt() != null ? job.getPublishedAt() : job.getCreatedAt()))
                .deadline(DateTimeUtils.toIso(job.getApplicationDeadline()))
                .applicantCount(job.getApplicantCount() != null ? job.getApplicantCount() : 0)
                .isUrgent(job.getIsUrgent())
                .viewCount(job.getViewCount() != null ? job.getViewCount() : 0)
                .employerId(employer.getSlug());
    }

    /** Tra cứu nhanh category theo public id (dùng cho các service khác). */
    public Function<String, JobCategory> categoryLookup() {
        Map<String, JobCategory> byCode = jobCategoryRepository.findAll().stream()
                .collect(Collectors.toMap(JobCategory::getCode, Function.identity(), (a, b) -> a));
        return byCode::get;
    }

    /** Ngày hết hạn nộp hồ sơ dạng LocalDate. */
    static LocalDate toLocalDate(LocalDateTime value) {
        return value != null ? value.toLocalDate() : null;
    }
}
