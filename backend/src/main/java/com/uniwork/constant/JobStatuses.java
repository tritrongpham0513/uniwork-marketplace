package com.uniwork.constant;

import java.util.List;

/**
 * Các hằng số và helper dùng chung cho trạng thái tin tuyển dụng ({@code JobPost.status}).
 */
public final class JobStatuses {

    public static final String OPEN = "OPEN";
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String FILLED = "FILLED";
    public static final String COMPLETED = "COMPLETED";
    public static final String CLOSED = "CLOSED";

    /**
     * Các trạng thái tin tuyển dụng còn đang mở nhận ứng tuyển công khai:
     * {@code OPEN} (Đang tuyển) và {@code IN_PROGRESS} (Đang tuyển thêm — đã nhận
     * một phần suất nhưng vẫn còn suất trống).
     */
    public static final List<String> RECRUITING = List.of(OPEN, IN_PROGRESS);

    private JobStatuses() {
    }

    /** Tin tuyển dụng còn đang mở nhận hồ sơ công khai hay không. */
    public static boolean isRecruiting(String status) {
        return OPEN.equals(status) || IN_PROGRESS.equals(status);
    }

    /**
     * Nhà tuyển dụng được đóng tin thủ công khi tin còn đang tuyển
     * ({@code OPEN} hoặc {@code IN_PROGRESS}).
     */
    public static boolean canClose(String status) {
        return isRecruiting(status);
    }

    /** Tin đã đóng nhưng chưa bị huỷ — có thể mở lại nếu còn suất. */
    public static boolean isClosed(String status) {
        return CLOSED.equals(status);
    }

    /**
     * Trạng thái cho phép nhà tuyển dụng bấm "Hoàn thành tin" thủ công.
     *
     * <p>Tin đang tuyển, đã nhận đủ người hoặc đã đóng đều có thể hoàn thành —
     * miễn là không còn đơn ứng tuyển nào ở trạng thái {@code ACCEPTED}
     * (điều kiện này được kiểm tra riêng trong service).
     */
    public static boolean canMarkCompleted(String status) {
        return isRecruiting(status) || FILLED.equals(status) || CLOSED.equals(status);
    }
}
