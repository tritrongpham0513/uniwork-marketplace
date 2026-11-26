package com.uniwork.service;

import com.uniwork.dto.request.AdminUpdateUserRequest;
import com.uniwork.dto.request.CategoryUpsertRequest;
import com.uniwork.dto.request.PositionUpsertRequest;
import com.uniwork.dto.response.AdminDashboardResponse;
import com.uniwork.dto.response.AdminUserResponse;
import com.uniwork.dto.response.JobCategoryResponse;
import com.uniwork.dto.response.JobPositionResponse;

import java.util.List;

/**
 * Nghiệp vụ quản trị viên.
 */
public interface AdminService {

    /** Số liệu tổng quan hệ thống. */
    AdminDashboardResponse dashboard();

    /** Danh sách người dùng (lọc theo vai trò & từ khoá). */
    List<AdminUserResponse> listUsers(String role, String keyword);

    /** Khoá / mở khoá / đổi vai trò người dùng. */
    AdminUserResponse updateUser(Long userId, AdminUpdateUserRequest request);

    /** Danh sách nhóm việc (kể cả đã khoá) cho quản trị. */
    List<JobCategoryResponse> listCategories();

    /** Tạo nhóm việc. */
    JobCategoryResponse createCategory(CategoryUpsertRequest request);

    /** Cập nhật nhóm việc. */
    JobCategoryResponse updateCategory(String categoryId, CategoryUpsertRequest request);

    /** Xoá nhóm việc (xoá mềm nếu đang được dùng). */
    JobCategoryResponse removeCategory(String categoryId);

    /** Danh sách vị trí công việc (kể cả đã khoá) cho quản trị. */
    List<JobPositionResponse> listPositions(String categoryId);

    /** Tạo vị trí công việc thuộc một nhóm việc. */
    JobPositionResponse createPosition(PositionUpsertRequest request);

    /** Cập nhật vị trí công việc. */
    JobPositionResponse updatePosition(String positionId, PositionUpsertRequest request);

    /** Xoá vị trí công việc (xoá mềm nếu đang được dùng). */
    JobPositionResponse removePosition(String positionId);
}
