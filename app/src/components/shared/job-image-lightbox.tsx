import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobImageLightboxProps {
  /** URL ảnh cần phóng to. */
  src: string;
  /** Tiêu đề hiển thị trên hộp thoại. */
  alt: string;
  /** Ảnh đang mở hay không. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Hộp thoại phóng to ảnh preview tin tuyển dụng.
 *
 * <p>Ảnh dùng `object-contain` + giới hạn 90vh nên không bao giờ bị cắt — nhà
 * tuyển dụng thấy đúng toàn bộ bức ảnh họ đã tải lên.
 */
export function JobImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: JobImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{alt}</DialogTitle>
        </DialogHeader>

        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

export default JobImageLightbox;
