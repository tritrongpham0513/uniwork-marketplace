import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  filesService,
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

export { filesService };
export type { FileKind, UploadedFile };
