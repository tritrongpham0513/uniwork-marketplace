import type {
  ApiResponse,
  EmployerProfile,
  Job,
  Review,
  StudentProfile,
} from "@/features/shared/types";
import http from "@/lib/axios";

/** Hồ sơ NTD công khai + tin tuyển dụng + đánh giá */
export interface PublicEmployerProfile {
  profile: EmployerProfile;
  jobs: Job[];
  reviews: Review[];
}

/**
 * Chuẩn hoá dữ liệu hồ sơ sinh viên từ API.
 *
 * Backend trả `null` cho các cột text chưa từng được điền ở tài khoản mới đăng
 * ký — ép về chuỗi rỗng / mảng rỗng để khớp contract `StudentProfile` và tránh
 * crash khi gọi `.trim()` hoặc `.length` trên form.
 */
export function normalizeStudentProfile(
  profile: StudentProfile
): StudentProfile {
  return {
    ...profile,
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    studentCode: profile.studentCode ?? "",
    university: profile.university ?? "",
    major: profile.major ?? "",
    address: profile.address ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    experiences: (profile.experiences ?? []).map((exp) => ({
      ...exp,
      company: exp.company ?? "",
      position: exp.position ?? "",
      startDate: exp.startDate ?? "",
      description: exp.description ?? "",
    })),
    workHistories: profile.workHistories ?? [],
    jobPreferences: {
      categoryIds: profile.jobPreferences?.categoryIds ?? [],
      employmentTypes: profile.jobPreferences?.employmentTypes ?? [],
      salaryMin: profile.jobPreferences?.salaryMin ?? 0,
      salaryMax: profile.jobPreferences?.salaryMax ?? 0,
      provinceIds: profile.jobPreferences?.provinceIds ?? [],
    },
  };
}

/** Chuẩn hoá dữ liệu hồ sơ nhà tuyển dụng từ API (tránh `null` ở trường text). */
export function normalizeEmployerProfile(
  profile: EmployerProfile
): EmployerProfile {
  return {
    ...profile,
    displayName: profile.displayName ?? "",
    contactName: profile.contactName ?? "",
    contactPhone: profile.contactPhone ?? "",
    description: profile.description ?? "",
    address: profile.address ?? "",
  };
}

export const profileService = {
  /**
   * GET /api/v1/student/profile
   */
  async getStudent(): Promise<ApiResponse<StudentProfile>> {
    const res = await http.get<ApiResponse<StudentProfile>>(
      "/api/v1/student/profile"
    );
    return { ...res, data: normalizeStudentProfile(res.data) };
  },

  /**
   * PUT /api/v1/student/profile
   */
  async updateStudent(
    payload: Partial<StudentProfile>
  ): Promise<ApiResponse<StudentProfile>> {
    const res = await http.put<
      ApiResponse<StudentProfile>,
      Partial<StudentProfile>
    >("/api/v1/student/profile", payload);
    return { ...res, data: normalizeStudentProfile(res.data) };
  },

  /**
   * GET /api/v1/employer/profile
   */
  async getEmployer(): Promise<ApiResponse<EmployerProfile>> {
    const res = await http.get<ApiResponse<EmployerProfile>>(
      "/api/v1/employer/profile"
    );
    return { ...res, data: normalizeEmployerProfile(res.data) };
  },

  /**
   * PUT /api/v1/employer/profile
   */
  async updateEmployer(
    payload: Partial<EmployerProfile>
  ): Promise<ApiResponse<EmployerProfile>> {
    const res = await http.put<
      ApiResponse<EmployerProfile>,
      Partial<EmployerProfile>
    >("/api/v1/employer/profile", payload);
    return { ...res, data: normalizeEmployerProfile(res.data) };
  },

  /**
   * GET /api/v1/public/employers/{id} — hồ sơ NTD công khai.
   */
  async getPublicEmployer(
    id: string
  ): Promise<ApiResponse<PublicEmployerProfile>> {
    const res = await http.get<ApiResponse<PublicEmployerProfile>>(
      `/api/v1/public/employers/${id}`
    );
    return {
      ...res,
      data: {
        ...res.data,
        profile: normalizeEmployerProfile(res.data.profile),
      },
    };
  },
};

export default profileService;
