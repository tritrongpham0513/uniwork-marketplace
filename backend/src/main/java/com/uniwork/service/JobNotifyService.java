package com.uniwork.service;

import com.uniwork.dto.request.JobNotifyPreferenceRequest;
import com.uniwork.dto.response.JobNotifyPreferenceResponse;
import com.uniwork.entity.JobPost;

import java.util.List;

/**
 * Nghiệp vụ tuỳ chọn "Bật thông báo" cho tin tuyển dụng.
 *
 * <p>Sinh viên bật thông báo theo nhóm việc + tỉnh. Khi có tin tuyển dụng
 * mới được duyệt khớp tuỳ chọn, hệ thống đẩy thông báo tới những sinh viên
 * đó.
 */
public interface JobNotifyService {

    /** Danh sách tuỳ chọn đang bật của sinh viên. */
    List<JobNotifyPreferenceResponse> list(Long userId);

    /** Bật thông báo (idempotent — bật lại cùng tuỳ chọn thì không tạo trùng). */
    JobNotifyPreferenceResponse subscribe(Long userId, JobNotifyPreferenceRequest request);

    /** Tắt thông báo. */
    void unsubscribe(Long userId, String categoryCode, String provinceCode);

    /**
     * Đẩy thông báo tới các sinh viên đang bật thông báo khớp với tin tuyển dụng.
     *
     * <p>Được gọi khi tin được duyệt (APPROVE) hoặc khi tin mới được đăng.
     */
    void notifySubscribers(JobPost job);
}
