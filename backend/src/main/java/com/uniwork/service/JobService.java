package com.uniwork.service;

import com.uniwork.dto.request.JobUpsertRequest;
import com.uniwork.dto.response.AdminJobResponse;
import com.uniwork.dto.response.JobListResponse;
import com.uniwork.dto.response.JobResponse;
import com.uniwork.entity.User;

import java.util.List;

/**
 * Nghiệp vụ tin tuyển dụng.
 */
public interface JobService {

    /**
     * Danh sách tin tuyển dụng công khai — lọc, sắp xếp và phân trang.
     *
     * @param status    trạng thái lọc; null = chỉ tin OPEN
     * @param employerId public id của nhà tuyển dụng (dùng cho màn hình NTD)
     */
    JobListResponse list(
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
            String employerId);

    /** Chi tiết 1 tin tuyển dụng (ẩn danh — chỉ trả về tin OPEN). */
    JobResponse detail(String jobId);

    /**
     * Chi tiết 1 tin tuyển dụng theo ngữ cảnh người xem.
     *
     * <p>Tin chưa công khai (khác {@code OPEN}) chỉ trả về khi người xem là
     * chính nhà tuyển dụng sở hữu tin hoặc quản trị viên; mọi trường hợp khác
     * đều ném 404.
     */
    JobResponse detail(String jobId, User viewer);

    /** Tin gợi ý cùng nhóm việc. */
    List<JobResponse> related(String categoryId, String excludeId, Integer limit);

    /** Tạo tin tuyển dụng mới (chờ duyệt). */
    JobResponse create(JobUpsertRequest request, Long employerUserId);

    /** Cập nhật tin tuyển dụng. */
    JobResponse update(String jobId, JobUpsertRequest request, Long employerUserId);

    /** Huỷ tin tuyển dụng. */
    void remove(String jobId, Long employerUserId);

    /**
     * Chuyển trạng thái tin tuyển dụng (chủ tin thực hiện).
     *
     * <p>Hỗ trợ ba thao tác: {@code CLOSED} (đóng tin), {@code OPEN} (mở lại tin
     * đã đóng) và {@code COMPLETED} (đánh dấu hoàn thành). Chuyển trạng thái
     * không hợp lệ ném 400.
     */
    JobResponse updateStatus(String jobId, String targetStatus, Long employerUserId);

    /** Danh sách tin của 1 nhà tuyển dụng (mọi trạng thái). */
    List<JobResponse> listByEmployer(Long employerUserId, String status);

    /** Danh sách tin cho quản trị viên (mọi trạng thái hoặc lọc theo status). */
    List<AdminJobResponse> listForAdmin(String status);

    /** Duyệt / từ chối tin tuyển dụng (quản trị). */
    JobResponse review(String jobId, String action, String reason, Long adminUserId);
}
