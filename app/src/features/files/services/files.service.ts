import type { ApiResponse } from "@/features/shared/types";
import http from "@/lib/axios";

/**
 * Loại file upload — quyết định quy tắc kiểm tra phía server.
 *
 * - `CV`: hồ sơ xin việc (PDF/DOC/DOCX, tối đa 5MB)
 * - `AVATAR`: ảnh đại diện (PNG/JPG/WEBP, tối đa 2MB)
 * - `LOGO`: logo tổ chức (PNG/JPG/WEBP, tối đa 2MB)
 */
export type FileKind = "CV" | "AVATAR" | "LOGO";

/**
 * Đường dẫn endpoint tải file nội bộ — khớp `FileUrlValidator.FILES_PATH` bên
 * backend. Mọi URL file lưu trong DB đều có dạng `/api/v1/files/{slug}`
 * (tương đối, cùng origin với app) nên chạy đúng ở dev / prod / deploy thật.
 */
const FILES_PATH = "/api/v1/files/";

/** Slug file do backend sinh: chữ, số và dấu gạch. */
const FILE_SLUG_PATTERN = /^[A-Za-z0-9-]{1,80}$/;

/**
 * Lấy public id (slug) từ URL file nội bộ.
 *
 * @param url URL tương đối (`/api/v1/files/file-abc`) hoặc tuyệt đối
 * @returns slug, hoặc `null` nếu không phải file của hệ thống
 */
export const fileIdFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const index = url.indexOf(FILES_PATH);
  if (index < 0) return null;

  const slug = url
    .slice(index + FILES_PATH.length)
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");

  return FILE_SLUG_PATTERN.test(slug) ? slug : null;
};

/** URL này có phải file do hệ thống quản lý không? */
export const isManagedFileUrl = (url?: string | null): boolean =>
  fileIdFromUrl(url) !== null;

export interface UploadedFile {
  /** Public id của file — dùng để gọi DELETE. */
  id: string;
  /** URL tương đối (`/api/v1/files/{slug}`) để nhúng `<img src>` / tải file. */
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

/**
 * Kết quả cấp URL upload trực tiếp từ backend.
 *
 * Backend cấp URL có chữ ký (presigned PUT) — client `PUT` file thẳng lên
 * nơi lưu trữ (Cloudflare R2) mà không đi qua API.
 */
export interface PresignedUpload {
  /** URL có chữ ký để PUT file. */
  uploadUrl: string;
  /** Khóa đối tượng — gửi lại khi confirm. */
  storageKey: string;
  /** Bucket đích. */
  bucket: string;
  /** MIME type đã ký vào URL — client PHẢI gửi đúng header này khi PUT. */
  contentType: string;
  /** Số giây còn hiệu lực của uploadUrl. */
  expiresInSeconds: number;
  /** Dung lượng tối đa được phép (byte). */
  maxSizeBytes: number;
  /** URL công khai (chỉ có với avatar / logo). */
  publicUrl: string | null;
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
    const readable = allowed.map(mimeToReadableLabel).join(", ");
    return `Định dạng file không hợp lệ cho ${label}. Chỉ chấp nhận: ${readable}.`;
  }

  return null;
};

const mimeToReadableLabel = (mime: string): string => {
  switch (mime) {
    case "application/pdf":
      return "PDF";
    case "application/msword":
      return "DOC";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";
    case "image/png":
      return "PNG";
    case "image/jpeg":
      return "JPG/JPEG";
    case "image/webp":
      return "WEBP";
    default:
      return mime;
  }
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

/**
 * Upload file lên nơi lưu trữ qua 1 request PUT có chữ ký.
 *
 * Dùng `XMLHttpRequest` thay `fetch` để có sự kiện `progress` → hiển thị
 * % tải lên trên UI.
 *
 * @param presign thông tin URL upload từ backend
 * @param file    file cần tải lên
 * @param onProgress callback nhận % đã tải (0 – 100)
 */
const putToPresignedUrl = (
  presign: PresignedUpload,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.uploadUrl, true);

    // BẮT BUỘC: phải đúng Content-Type đã được ký trong URL.
    // Sai header → R2 trả 403 SignatureDoesNotMatch.
    xhr.setRequestHeader("Content-Type", presign.contentType);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new Error(
          `Không tải lên được file lên nơi lưu trữ (HTTP ${xhr.status}). Vui lòng thử lại.`
        )
      );
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "Không kết nối được tới nơi lưu trữ file. Kiểm tra kết nối mạng rồi thử lại."
        )
      );

    xhr.ontimeout = () =>
      reject(
        new Error("Tải lên file quá thời gian cho phép. Vui lòng thử lại.")
      );

    xhr.send(file);
  });
};

export const filesService = {
  /**
   * POST /api/v1/files/presign — xin URL upload trực tiếp.
   *
   * @param kind        loại file
   * @param contentType MIME type client dự kiến gửi (được ký vào URL)
   */
  presign(
    kind: FileKind,
    contentType?: string
  ): Promise<ApiResponse<PresignedUpload>> {
    const query = new URLSearchParams({ kind });
    if (contentType) {
      query.set("contentType", contentType);
    }
    return http.post<ApiResponse<PresignedUpload>>(
      `/api/v1/files/presign?${query.toString()}`
    );
  },

  /**
   * POST /api/v1/files/confirm — xác nhận file đã upload, nhận về metadata.
   *
   * @param storageKey khóa đối tượng
   * @param kind       loại file
   * @param fileName   tên file gốc
   */
  confirm(
    storageKey: string,
    kind: FileKind,
    fileName: string
  ): Promise<ApiResponse<UploadedFile>> {
    return http.post<ApiResponse<UploadedFile>>("/api/v1/files/confirm", {
      storageKey,
      kind,
      fileName,
    });
  },

  /**
   * Upload file — luồng chính.
   *
   * Thứ tự:
   *   1. `POST /files/presign` → nhận URL có chữ ký.
   *   2. `PUT` file thẳng lên Cloudflare R2 — backend không nhận file.
   *   3. `POST /files/confirm` → backend kiểm tra magic bytes + ghi metadata.
   *
   * @param file       file cần tải lên
   * @param kind       loại file
   * @param onProgress callback nhận % đã tải (0 – 100)
   */
  async upload(
    file: File,
    kind: FileKind,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<UploadedFile>> {
    // Client phải gửi đúng Content-Type đã ký — dùng mime của file nếu khớp
    // whitelist, nếu không thì để backend tự chọn mime mặc định.
    const requestedMime = file.type || guessMimeFromExtension(file.name);
    const contentType = FILE_MIME_TYPES[kind].includes(requestedMime)
      ? requestedMime
      : undefined;

    const response = await filesService.presign(kind, contentType);
    const presign = response.data;

    await putToPresignedUrl(presign, file, onProgress);

    return filesService.confirm(presign.storageKey, kind, file.name);
  },

  /**
   * Tải nội dung file qua API có `Authorization`.
   *
   * Vì sao không dùng thẻ `<a href>`: CV là tài nguyên riêng tư, backend kiểm
   * tra quyền đọc theo token. Trình duyệt không gắn header `Authorization` khi
   * điều hướng bằng thẻ `<a>` → luôn 403. Tải bằng axios (blob) rồi mới kích
   * hoạt download qua object URL là cách duy nhất giữ được token.
   *
   * @param idOrUrl  slug hoặc URL `/api/v1/files/{slug}`
   * @param fileName tên file hiển thị khi lưu (mặc định `file-{slug}`)
   */
  async download(idOrUrl: string, fileName?: string): Promise<void> {
    const id = fileIdFromUrl(idOrUrl) ?? idOrUrl;
    const blob = await http.get<Blob>(`${FILES_PATH}${id}`, {
      responseType: "blob",
    });

    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName?.trim() || `file-${id}`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      // Thu hồi sau khi trình duyệt kịp đọc xong blob.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  },

  /**
   * Tải nội dung file dạng `ArrayBuffer` — dùng để render PDF trong trang.
   *
   * <p>Cùng lý do như {@link download}: phải có header `Authorization` nên
   * không dùng được `<iframe src>` hay `fetch` thẳng. `react-pdf` nhận dữ liệu
   * dạng mảng byte nên ta tải blob trước rồi đưa vào.
   *
   * @param idOrUrl slug hoặc URL `/api/v1/files/{slug}`
   */
  async fetchBuffer(idOrUrl: string): Promise<ArrayBuffer> {
    const id = fileIdFromUrl(idOrUrl) ?? idOrUrl;
    // `http.get` đã tự unwrap `response.data` → kết quả là chính ArrayBuffer.
    return http.get<ArrayBuffer>(`${FILES_PATH}${id}`, {
      responseType: "arraybuffer",
    });
  },

  /**
   * DELETE /api/v1/files/{id} — xoá file
   */
  remove(id: string): Promise<ApiResponse<null>> {
    return http.delete<ApiResponse<null>>(`/api/v1/files/${id}`);
  },
};

export default filesService;
