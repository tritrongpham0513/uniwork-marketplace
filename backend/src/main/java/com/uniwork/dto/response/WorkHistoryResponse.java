package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kinh nghiệm làm việc của ứng viên — 1 công việc đã hoàn thành.
 *
 * <p>Khớp 100% với interface `WorkHistory` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkHistoryResponse {

    private String id;

    /** Slug của hồ sơ sinh viên */
    private String studentId;

    /** Slug của đơn ứng tuyển đã sinh ra kinh nghiệm này */
    private String applicationId;

    /** Slug của tin tuyển dụng (có thể null nếu tin đã bị xoá) */
    private String jobId;

    /** Tên tin tuyển dụng tại thời điểm hoàn thành */
    private String jobTitle;

    /** Tên nhà tuyển dụng tại thời điểm hoàn thành */
    private String companyName;

    /** Chức danh tại thời điểm hoàn thành */
    private String positionName;

    /** Thời điểm bắt đầu làm việc (ISO-8601) */
    private String startedAt;

    /** Thời điểm hoàn thành công việc (ISO-8601) */
    private String completedAt;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    private String salaryType;

    private Integer salaryMin;

    private Integer salaryMax;

    /** Ghi chú của nhà tuyển dụng khi đánh dấu hoàn thành */
    private String note;

    /** Điểm đánh giá (1–5) nếu đã có đánh giá */
    private Integer rating;
}
