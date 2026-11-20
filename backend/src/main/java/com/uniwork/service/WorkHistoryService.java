package com.uniwork.service;

import com.uniwork.dto.response.WorkHistoryResponse;
import com.uniwork.entity.Application;

import java.util.List;

/**
 * Nghiệp vụ kinh nghiệm làm việc của ứng viên.
 *
 * <p>Khi nhà tuyển dụng đánh dấu đơn ứng tuyển là {@code COMPLETED}, hệ thống
 * tự động ghi lại 1 dòng lịch sử làm việc cho sinh viên đó.
 */
public interface WorkHistoryService {

    /**
     * Ghi nhận công việc đã hoàn thành — idempotent theo đơn ứng tuyển.
     *
     * @param application đơn ứng tuyển vừa chuyển sang COMPLETED
     * @param note        ghi chú của nhà tuyển dụng (có thể null)
     */
    void recordCompletion(Application application, String note);

    /** Lịch sử làm việc của một sinh viên (sinh viên tự xem). */
    List<WorkHistoryResponse> listForStudent(Long studentUserId);

    /**
     * Lịch sử làm việc của ứng viên trong 1 đơn ứng tuyển (nhà tuyển dụng xem).
     *
     * @param applicationId slug của đơn ứng tuyển
     * @param employerUserId user id của nhà tuyển dụng đang đăng nhập
     * @throws com.uniwork.exception.AppException 404 nếu không tìm thấy đơn,
     *         403 nếu nhà tuyển dụng không có quyền xem ứng viên này
     */
    List<WorkHistoryResponse> listForApplication(String applicationId, Long employerUserId);

    /** Lịch sử làm việc của một sinh viên (quản trị viên tra cứu). */
    List<WorkHistoryResponse> listForStudentByAdmin(Long studentUserId);
}
