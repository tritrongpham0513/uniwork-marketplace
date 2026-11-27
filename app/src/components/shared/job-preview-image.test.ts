import { describe, expect, it } from "vitest";
import { resolveJobImageSource } from "@/components/shared/job-preview-image";

/**
 * Thứ tự fallback của khung ảnh vuông trên thẻ tin.
 *
 * <p>Ràng buộc: thẻ tin luôn có một khối hình ở vị trí cố định — không nhảy
 * layout khi ảnh tải xong. Nên fallback phải theo đúng thứ tự và không được
 * "rơi" xuống ảnh hỏng.
 */
describe("resolveJobImageSource (ảnh preview tin tuyển dụng)", () => {
  it("dùng ảnh preview khi tin có ảnh", () => {
    expect(
      resolveJobImageSource("/api/v1/files/file-1", "/api/v1/files/file-2")
    ).toBe("/api/v1/files/file-1");
  });

  it("rơi về logo tổ chức khi tin chưa có ảnh preview", () => {
    expect(resolveJobImageSource(null, "/api/v1/files/file-2")).toBe(
      "/api/v1/files/file-2"
    );
  });

  it("trả về null khi không có ảnh nào — hiển thị khối chữ cái", () => {
    expect(resolveJobImageSource(null, null)).toBeNull();
  });

  it("bỏ qua logo rỗng — chuỗi rỗng không phải ảnh", () => {
    expect(resolveJobImageSource("", "")).toBeNull();
  });

  it("ảnh tải lỗi thì không hiển thị ảnh hỏng", () => {
    expect(
      resolveJobImageSource(
        "/api/v1/files/file-1",
        "/api/v1/files/file-2",
        true
      )
    ).toBeNull();
  });
});
