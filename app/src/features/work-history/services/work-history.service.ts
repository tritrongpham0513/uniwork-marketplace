import type { WorkHistory } from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export const workHistoryService = {
  /**
   * GET /api/v1/employer/applications/{applicationId}/work-history
   * — kinh nghiệm làm việc của ứng viên trong đơn ứng tuyển.
   *
   * <p>Backend kiểm tra quyền: chỉ NTD sở hữu tin của đơn, hoặc NTD đã từng
   * nhận đơn ứng tuyển của sinh viên này (cùng quy tắc với quyền đọc CV).
   */
  listForApplication(
    applicationId: string
  ): Promise<ApiResponse<WorkHistory[]>> {
    return http.get<ApiResponse<WorkHistory[]>>(
      `/api/v1/employer/applications/${applicationId}/work-history`
    );
  },

  /**
   * GET /api/v1/student/work-history — lịch sử làm việc của sinh viên.
   */
  listForStudent(): Promise<ApiResponse<WorkHistory[]>> {
    return http.get<ApiResponse<WorkHistory[]>>("/api/v1/student/work-history");
  },
};

export default workHistoryService;
