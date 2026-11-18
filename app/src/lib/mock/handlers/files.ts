import type { ApiResponse } from "@/features/auth/types";
import { getDb, nextId, nowIso } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import type {
  MockJobNotifyPreference,
  MockUploadedFile,
} from "../db";
// ============================================
// FILE UPLOAD (mock)
// ============================================

/** Giới hạn dung lượng (byte) — khớp với backend. */
const MAX_SIZE: Record<MockUploadedFile["kind"], number> = {
  CV: 5 * 1024 * 1024,
  AVATAR: 2 * 1024 * 1024,
  LOGO: 2 * 1024 * 1024,
};

const ALLOWED_MIME: Record<MockUploadedFile["kind"], string[]> = {
  CV: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  AVATAR: ["image/png", "image/jpeg", "image/webp"],
  LOGO: ["image/png", "image/jpeg", "image/webp"],
};

const KIND_LABELS: Record<MockUploadedFile["kind"], string> = {
  CV: "CV",
  AVATAR: "ảnh đại diện",
  LOGO: "logo",
};

export const fileHandlers = {
  /**
   * POST /api/v1/files/upload — upload file (mock).
   *
   * Mock không lưu nội dung file thật, chỉ tạo metadata + URL giả.
   */
  upload(
    file: { name: string; type: string; size: number } | undefined,
    kind: string,
    userId: number
  ): MockUploadedFile {
    if (!file) {
      throw badRequest("Vui lòng chọn file cần tải lên.");
    }

    const normalizedKind = (kind || "CV").toUpperCase() as MockUploadedFile["kind"];
    if (!["CV", "AVATAR", "LOGO"].includes(normalizedKind)) {
      throw badRequest("Loại file không hợp lệ. Chỉ hỗ trợ: CV, AVATAR, LOGO.");
    }

    if (file.size <= 0) {
      throw badRequest(`File ${KIND_LABELS[normalizedKind]} rỗng, vui lòng chọn file khác.`);
    }

    if (file.size > MAX_SIZE[normalizedKind]) {
      throw badRequest(
        `Dung lượng ${KIND_LABELS[normalizedKind]} vượt quá giới hạn ` +
          `${Math.round(MAX_SIZE[normalizedKind] / (1024 * 1024))} MB.`
      );
    }

    if (!ALLOWED_MIME[normalizedKind].includes(file.type)) {
      throw badRequest(
        `Định dạng file không hợp lệ cho ${KIND_LABELS[normalizedKind]}.`
      );
    }

    const id = nextId("file");
    const uploaded: MockUploadedFile = {
      id,
      ownerUserId: userId,
      kind: normalizedKind,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      url: `/api/v1/files/${id}`,
      createdAt: nowIso(),
    };

    getDb().uploadedFiles.push(uploaded);
    return uploaded;
  },

  /**
   * GET /api/v1/files/{id}
   */
  detail(id: string): MockUploadedFile {
    const file = getDb().uploadedFiles.find((f) => f.id === id);
    if (!file) throw notFound("Không tìm thấy file.");
    return file;
  },

  /**
   * DELETE /api/v1/files/{id} — xoá file (chỉ chủ sở hữu).
   */
  remove(id: string, userId: number): void {
    const db = getDb();
    const index = db.uploadedFiles.findIndex((f) => f.id === id);
    if (index === -1) throw notFound("Không tìm thấy file.");
    if (db.uploadedFiles[index].ownerUserId !== userId) {
      throw forbidden("Bạn không có quyền xoá file này.");
    }
    db.uploadedFiles.splice(index, 1);
  },
};

// ============================================
// JOB NOTIFY PREFERENCES (mock)
// ============================================

export const jobNotifyHandlers = {
  /**
   * GET /api/v1/student/job-notifications
   */
  list(userId: number): MockJobNotifyPreference[] {
    return getDb().jobNotifyPreferences.filter((p) => p.userId === userId);
  },

  /**
   * POST /api/v1/student/job-notifications — bật thông báo.
   */
  subscribe(
    body: { categoryCode?: string; provinceCode?: string | null },
    userId: number
  ): MockJobNotifyPreference {
    const categoryCode = body.categoryCode?.trim();
    if (!categoryCode) {
      throw badRequest("Vui lòng chọn nhóm việc.");
    }

    const provinceCode =
      body.provinceCode?.trim() && body.provinceCode.trim() !== ""
        ? body.provinceCode.trim()
        : "ALL";

    const db = getDb();
    const existing = db.jobNotifyPreferences.find(
      (p) =>
        p.userId === userId &&
        p.categoryCode === categoryCode &&
        p.provinceCode === provinceCode
    );
    if (existing) return existing;

    const preference: MockJobNotifyPreference = {
      id: nextId("jnp"),
      userId,
      categoryCode,
      provinceCode,
      createdAt: nowIso(),
    };
    db.jobNotifyPreferences.push(preference);
    return preference;
  },

  /**
   * DELETE /api/v1/student/job-notifications — tắt thông báo.
   */
  unsubscribe(
    categoryCode: string,
    provinceCode: string | null | undefined,
    userId: number
  ): void {
    const normalized =
      provinceCode?.trim() && provinceCode.trim() !== ""
        ? provinceCode.trim()
        : "ALL";

    const db = getDb();
    const index = db.jobNotifyPreferences.findIndex(
      (p) =>
        p.userId === userId &&
        p.categoryCode === categoryCode &&
        p.provinceCode === normalized
    );
    if (index !== -1) db.jobNotifyPreferences.splice(index, 1);
  },
};

export type { ApiResponse };
