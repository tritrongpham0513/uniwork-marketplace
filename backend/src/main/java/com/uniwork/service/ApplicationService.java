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

    /** Danh sách ứng viên của nhà tuyển dụng. */
    List<ApplicationResponse> listByEmployer(Long employerUserId, String jobId, String status);

    /** Chi tiết đơn (nhà tuyển dụng sở hữu tin). */
    ApplicationResponse detailForEmployer(String applicationId, Long employerUserId);

    /** Nhà tuyển dụng đổi trạng thái đơn. */
    ApplicationResponse updateStatus(String applicationId, UpdateApplicationStatusRequest request, Long employerUserId);
}
