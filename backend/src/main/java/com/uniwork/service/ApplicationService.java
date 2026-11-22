package com.uniwork.service;

import com.uniwork.dto.request.CreateApplicationRequest;
import com.uniwork.dto.request.UpdateApplicationStatusRequest;
import com.uniwork.dto.response.ApplicationResponse;

import java.util.List;

/**
 * Nghiệp vụ đơn ứng tuyển.
 */
public interface ApplicationService {

    /** Sinh viên nộp đơn ứng tuyển. */
    ApplicationResponse create(CreateApplicationRequest request, Long studentUserId);

    /** Danh sách đơn của sinh viên đang đăng nhập. */
    List<ApplicationResponse> listByStudent(Long studentUserId, String status);

    /** Chi tiết đơn (sinh viên sở hữu). */
    ApplicationResponse detailForStudent(String applicationId, Long studentUserId);

    /** Sinh viên rút đơn. */
    ApplicationResponse withdraw(String applicationId, Long studentUserId);

    /**
     * Đơn ứng tuyển của sinh viên cho 1 tin (nếu có).
     *
     * <p>Dùng để biết SV đã ứng tuyển tin này chưa (và đơn cũ có đang ở trạng
     * thái `WITHDRAWN` để cho phép ứng tuyển lại hay không).
     */
    ApplicationResponse findByJobForStudent(String jobId, Long studentUserId);

    /** Danh sách ứng viên của nhà tuyển dụng. */
    List<ApplicationResponse> listByEmployer(Long employerUserId, String jobId, String status);

    /** Chi tiết đơn (nhà tuyển dụng sở hữu tin). */
    ApplicationResponse detailForEmployer(String applicationId, Long employerUserId);

    /**
     * User id của sinh viên ứng tuyển trong đơn.
     *
     * <p>Kiểm tra quyền: nhà tuyển dụng phải sở hữu tin của đơn đó, nếu không
     * trả 403. Dùng để phân quyền xem đánh giá của ứng viên.
     */
    Long studentUserIdOf(String applicationId, Long employerUserId);

    /** Nhà tuyển dụng đổi trạng thái đơn. */
    ApplicationResponse updateStatus(String applicationId, UpdateApplicationStatusRequest request, Long employerUserId);

    /**
     * Nhà tuyển dụng lưu ghi chú nội bộ về ứng viên.
     *
     * <p>Ghi chú chỉ hiển thị với nhà tuyển dụng, không gửi cho sinh viên.
     */
    ApplicationResponse updateNote(String applicationId, String note, Long employerUserId);
}
