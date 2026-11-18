import type { ApiResponse } from "@/features/auth/types";
import http from "@/lib/axios";

/**
 * Loại file upload — quyết định quy tắc kiểm tra phía server.
 *
 * - `CV`: hồ sơ xin việc (PDF/DOC/DOCX, tối đa 5MB)
 * - `AVATAR`: ảnh đại diện (PNG/JPG/WEBP, tối đa 2MB)
 * - `LOGO`: logo tổ chức (PNG/JPG/WEBP, tối đa 2MB)
 */
export type FileKind = "CV" | "AVATAR" | "LOGO";

export interface UploadedFile {
  /** Public id của file — dùng để gọi DELETE. */
  id: string;
  /** URL tuyệt đối để nhúng vào `<img src>` / link tải. */
  url: string;
  /** Tên file gốc người dùng chọn. */
  fileName: string;
  /** MIME type của file. */
  mimeType: string;
  /** Dung lượng (byte). */
  sizeBytes: number;
  /** Loại file. */
  kind: FileKind;
}

/** Giới hạn dung lượng (byte) — khớp với backend. */
export const FILE_SIZE_LIMITS: Record<FileKind, number> = {
  CV: 5 * 1024 * 1024,
  AVATAR: 2 * 1024 * 1024,
  LOGO: 2 * 1024 * 1024,
};

/** MIME type được phép cho từng loại file. */
export const FILE_MIME_TYPES: Record<FileKind, string[]> = {
  CV: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  AVATAR: ["image/png", "image/jpeg", "image/webp"],
  LOGO: ["image/png", "image/jpeg", "image/webp"],
};

/** Nhãn tiếng Việt hiển thị cho người dùng. */
export const FILE_KIND_LABELS: Record<FileKind, string> = {
  CV: "CV",
  AVATAR: "ảnh đại diện",
  LOGO: "logo",
};

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Kiểm tra file phía client trước khi gọi API — trả về thông báo lỗi
 * tiếng Việt, hoặc `null` nếu file hợp lệ.
 */
export const validateFile = (file: File, kind: FileKind): string | null => {
  const maxSize = FILE_SIZE_LIMITS[kind];
  const allowed = FILE_MIME_TYPES[kind];
  const label = FILE_KIND_LABELS[kind];

  if (file.size === 0) {
    return `File ${label} rỗng, vui lòng chọn file khác.`;
  }

  if (file.size > maxSize) {
    return `Dung lượng ${label} vượt quá giới hạn ${formatFileSize(maxSize)} (file hiện tại ${formatFileSize(file.size)}).`;
  }

  // Trình duyệt đôi khi báo mime rỗng với file .doc/.docx — suy ra từ extension.
  const extensionMime = guessMimeFromExtension(file.name);
  const mimeType = file.type || extensionMime;

  if (!allowed.includes(mimeType)) {
    const readable = allowed
      .map((mime) => {
        if (mime === "application/pdf") return "PDF";
        if (mime === "application/msword") return "DOC";
        if (mime.includes("officedocument")) return "DOCX";
        if (mime === "image/png") return "PNG";
        if (mime === "image/jpeg") return "JPG/JPEG";
        if (mime === "image/webp") return "WEBP";
        return mime;
      })
      .join(", ");
    return `Định dạng file không hợp lệ cho ${label}. Chỉ chấp nhận: ${readable}.`;
  }

  return null;
};

const guessMimeFromExtension = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "";
  }
};

export const filesService = {
  /**
   * POST /api/v1/files/upload — multipart/form-data
   *
   * <p>Không tự set `Content-Type` — axios/browser tự gắn boundary khi gặp
   * `FormData` (nếu set thủ công sẽ thiếu boundary và server không parse được).
   */
  upload(file: File, kind: FileKind): Promise<ApiResponse<UploadedFile>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    return http.post<ApiResponse<UploadedFile>>("/api/v1/files/upload", formData);
  },

  /**
   * DELETE /api/v1/files/{id} — xoá file
   */
  remove(id: string): Promise<ApiResponse<null>> {
    return http.delete<ApiResponse<null>>(`/api/v1/files/${id}`);
  },
};

export default filesService;
