package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Chuyển trạng thái tin tuyển dụng (nhà tuyển dụng sở hữu tin).
 *
 * <p>Ba thao tác được hỗ trợ:
 * <ul>
 *   <li>{@code CLOSED} — đóng tin thủ công (ngừng nhận đơn, vẫn giữ tin).</li>
 *   <li>{@code OPEN} — mở lại tin đã đóng; backend tự chọn {@code OPEN} hoặc
 *       {@code IN_PROGRESS} theo số suất đã nhận.</li>
 *   <li>{@code COMPLETED} — đánh dấu tin đã hoàn thành.</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateJobStatusRequest {

    /** CLOSED | OPEN | COMPLETED */
    private String status;
}
