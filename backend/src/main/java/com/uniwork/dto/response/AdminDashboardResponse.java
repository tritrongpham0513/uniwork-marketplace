package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Số liệu tổng quan hệ thống — khớp 100% với `AdminDashboardStats` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private Long totalUsers;

    private Long totalStudents;

    private Long totalEmployers;

    private Long totalJobs;

    private Long openJobs;

    private Long pendingJobs;

    private Long totalApplications;

    private Long pendingApplications;

    private Long hiddenReviews;

    private Long categories;
}
