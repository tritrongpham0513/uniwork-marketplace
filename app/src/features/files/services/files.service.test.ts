import { describe, expect, it } from "vitest";
import {
  FILE_KIND_LABELS,
  FILE_MIME_TYPES,
  FILE_SIZE_LIMITS,
  validateFile,
} from "@/features/files/services/files.service";

/**
 * Cấu hình loại file `JOB_IMAGE` — ảnh preview tin tuyển dụng.
 *
 * <p>Khớp với backend (`FileStorageService.Kind.JOB_IMAGE`): PNG/JPG/WEBP,
 * tối đa 5MB. Lệch khác thì client cho qua nhưng backend từ chối — hoặc tệ
 * hơn, client chặn nhầm file hợp lệ.
 */
describe("loại file JOB_IMAGE (ảnh preview tin tuyển dụng)", () => {
  it("giới hạn 5MB", () => {
    expect(FILE_SIZE_LIMITS.JOB_IMAGE).toBe(5 * 1024 * 1024);
  });

  it("chỉ nhận PNG / JPEG / WEBP", () => {
    expect(FILE_MIME_TYPES.JOB_IMAGE).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
  });

  it("có nhãn tiếng Việt riêng", () => {
    expect(FILE_KIND_LABELS.JOB_IMAGE).toBe("ảnh preview");
  });

  it("nhận ảnh PNG hợp lệ", () => {
    const file = new File([new Uint8Array(1024)], "preview.png", {
      type: "image/png",
    });
    expect(validateFile(file, "JOB_IMAGE")).toBeNull();
  });

  it("từ chối file PDF dù đuôi là .pdf", () => {
    const file = new File([new Uint8Array(1024)], "resume.pdf", {
      type: "application/pdf",
    });
    expect(validateFile(file, "JOB_IMAGE")).toContain("Định dạng");
  });

  it("từ chối ảnh vượt quá 5MB", () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    expect(validateFile(big, "JOB_IMAGE")).toContain("vượt quá giới hạn");
  });

  it("suy ra mime từ đuôi khi trình duyệt báo rỗng", () => {
    const file = new File([new Uint8Array(1024)], "preview.webp", {
      type: "",
    });
    expect(validateFile(file, "JOB_IMAGE")).toBeNull();
  });
});
