import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  filesService,
  fileIdFromUrl,
  validateFile,
  type FileKind,
  type UploadedFile,
} from "../services/files.service";

export const FILE_KEYS = {
  all: ["files"] as const,
};

/**
 * Hook upload file.
 *
 * Trả về `upload(file, kind)` — hàm này:
 *   1. Kiểm tra dung lượng & định dạng phía client (báo lỗi tiếng Việt).
 *   2. Gọi API để lấy URL upload trực tiếp, PUT file lên nơi lưu trữ,
 *      rồi xác nhận với backend.
 *   3. Báo toast thành công/thất bại.
 *
 * Component dùng `mutation.isPending` để disable nút trong lúc đang tải.
 */
export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadedFile, Error, { file: File; kind: FileKind }>({
    // Hook tự bắn toast theo loại file → chặn toast chung để không bắn 2 lần.
    meta: { skipToast: true },
    mutationFn: async ({ file, kind }) => {
      const error = validateFile(file, kind);
      if (error) {
        throw new Error(error);
      }

      const response = await filesService.upload(file, kind);
      return response.data;
    },
    onSuccess: (_data, { kind }) => {
      toast.success(
        kind === "CV"
          ? "Đã tải lên CV thành công."
          : kind === "LOGO"
            ? "Đã cập nhật logo thành công."
            : "Đã cập nhật ảnh đại diện thành công."
      );
      void queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
    onError: (error) => {
      toast.error("Tải lên file thất bại.", {
        description: error.message,
      });
    },
  });
};

/**
 * Hook xoá file đã upload.
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; kind?: FileKind }>({
    // Hook tự bắn toast → chặn toast chung để không bắn 2 lần.
    meta: { skipToast: true },
    mutationFn: async ({ id }) => {
      await filesService.remove(id);
    },
    onSuccess: () => {
      toast.success("Đã xoá file.");
      void queryClient.invalidateQueries({ queryKey: FILE_KEYS.all });
    },
    onError: (error) => {
      toast.error("Xoá file thất bại.", {
        description: error.message,
      });
    },
  });
};

/**
 * Hook tải file nội bộ (CV) qua API có `Authorization`.
 *
 * Dùng cho mọi chỗ hiển thị CV: NTD xem CV ứng viên, sinh viên xem lại CV đã
 * nộp. Component không được dùng `<a href>` trực tiếp vì trình duyệt không gắn
 * token → backend trả 403.
 */
export const useDownloadFile = () => {
  return useMutation<void, Error, { url: string; fileName?: string }>({
    // Hook tự bắn toast → chặn toast chung để không bắn 2 lần.
    meta: { skipToast: true },
    mutationFn: async ({ url, fileName }) => {
      await filesService.download(url, fileName);
    },
    onError: (error) => {
      toast.error("Tải file thất bại.", {
        description: error.message,
      });
    },
  });
};

/**
 * Dọn file cũ sau khi hồ sơ đã trỏ sang file mới.
 *
 * Bỏ qua mọi lỗi: file cũ có thể đang được đơn ứng tuyển / đánh giá tham chiếu
 * (`409 FILE_IN_USE`) hoặc đã bị xoá trước đó (`404`). Dọn dẹp không được phép
 * làm hỏng thao tác lưu hồ sơ đã thành công.
 *
 * @param oldUrl URL file cũ (chỉ xử lý nếu là file do hệ thống quản lý)
 */
export const cleanupReplacedFile = async (
  oldUrl?: string | null
): Promise<void> => {
  const id = fileIdFromUrl(oldUrl);
  if (!id) return;
  try {
    await filesService.remove(id);
  } catch {
    // Cố ý bỏ qua — xem jsdoc ở trên.
  }
};

export { filesService };
export type { FileKind, UploadedFile };
