import { describe, expect, it } from "vitest";
import type { EmployerProfile, StudentProfile } from "@/features/shared/types";
import {
  normalizeEmployerProfile,
  normalizeStudentProfile,
} from "@/features/profile/services/profile.service";

describe("profile normalization", () => {
  it("normalizes null text and collection fields on a fresh StudentProfile", () => {
    // Mô phỏng JSON trả về từ backend cho sinh viên mới đăng ký (các cột tuỳ chọn là null).
    const rawFromApi = {
      id: "stu-123",
      userId: 1,
      fullName: "Nguyễn Văn A",
      phone: null,
      dateOfBirth: null,
      gender: null,
      studentCode: null,
      university: null,
      major: null,
      yearOfStudy: null,
      provinceId: null,
      address: null,
      bio: null,
      avatarUrl: null,
      cvUrl: null,
      cvFileName: null,
      cvMimeType: null,
      skills: null,
      experiences: [
        {
          id: "exp-1",
          company: "ACME",
          position: "Intern",
          startDate: null,
          endDate: null,
          description: null,
        },
      ],
      workHistories: null,
      jobPreferences: {
        categoryIds: null,
        employmentTypes: null,
        salaryMin: null,
        salaryMax: null,
        provinceIds: null,
      },
      avgRating: 0,
      ratingCount: 0,
      createdAt: "2026-01-01T00:00:00Z",
    } as unknown as StudentProfile;

    const normalized = normalizeStudentProfile(rawFromApi);

    expect(normalized.bio).toBe("");
    expect(normalized.bio.trim()).toBe("");
    expect(normalized.phone).toBe("");
    expect(normalized.studentCode).toBe("");
    expect(normalized.university).toBe("");
    expect(normalized.major).toBe("");
    expect(normalized.address).toBe("");
    expect(normalized.skills).toEqual([]);
    expect(normalized.workHistories).toEqual([]);
    expect(normalized.experiences[0].description).toBe("");
    expect(normalized.experiences[0].startDate).toBe("");
    expect(normalized.jobPreferences).toEqual({
      categoryIds: [],
      employmentTypes: [],
      salaryMin: 0,
      salaryMax: 0,
      provinceIds: [],
    });
  });

  it("normalizes null text fields on a fresh EmployerProfile", () => {
    const rawFromApi = {
      id: "emp-123",
      userId: 2,
      employerType: "COMPANY",
      displayName: "Công ty ABC",
      contactName: null,
      contactPhone: null,
      taxCode: null,
      description: null,
      logoUrl: null,
      website: null,
      provinceId: null,
      address: null,
      isVerified: false,
      avgRating: 0,
      ratingCount: 0,
      createdAt: "2026-01-01T00:00:00Z",
    } as unknown as EmployerProfile;

    const normalized = normalizeEmployerProfile(rawFromApi);

    expect(normalized.contactName).toBe("");
    expect(normalized.contactPhone).toBe("");
    expect(normalized.description).toBe("");
    expect(normalized.address).toBe("");
    expect(normalized.taxCode).toBeNull();
    expect(normalized.logoUrl).toBeNull();
  });
});
