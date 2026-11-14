import type {
  EmployerProfile,
  StudentProfile,
} from "@/features/shared/types";
import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

export const profileService = {
  /**
   * GET /api/v1/student/profile
   */
  getStudent(): Promise<ApiResponse<StudentProfile>> {
    return http.get<ApiResponse<StudentProfile>>("/api/v1/student/profile");
  },

  /**
   * PUT /api/v1/student/profile
   */
  updateStudent(
    payload: Partial<StudentProfile>
  ): Promise<ApiResponse<StudentProfile>> {
    return http.put<ApiResponse<StudentProfile>, Partial<StudentProfile>>(
      "/api/v1/student/profile",
      payload
    );
  },

  /**
   * GET /api/v1/employer/profile
   */
  getEmployer(): Promise<ApiResponse<EmployerProfile>> {
    return http.get<ApiResponse<EmployerProfile>>("/api/v1/employer/profile");
  },

  /**
   * PUT /api/v1/employer/profile
   */
  updateEmployer(
    payload: Partial<EmployerProfile>
  ): Promise<ApiResponse<EmployerProfile>> {
    return http.put<ApiResponse<EmployerProfile>, Partial<EmployerProfile>>(
      "/api/v1/employer/profile",
      payload
    );
  },
};

export default profileService;
