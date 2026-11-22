import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadFile } from "@/features/files/hooks";
import { CvViewer, PDF_MIME_TYPE } from "@/components/shared/cv-viewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CvDownloadButtonProps {
  /** URL file nội bộ: `/api/v1/files/{slug}`. */
  url: string;
  /** Tên file gốc để đặt tên khi lưu về máy. */
  fileName?: string | null;
}

/**
 * Nút tải CV qua API có `Authorization`.
 *
 * Không dùng `<a href={cvUrl}>` vì CV là tài nguyên riêng tư: trình duyệt không
 * gắn token khi điều hướng bằng thẻ link → backend trả `403`.
 */
export function CvDownloadButton({ url, fileName }: CvDownloadButtonProps) {
  const download = useDownloadFile();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={download.isPending}
      onClick={() =>
        download.mutate({ url, fileName: fileName?.trim() || undefined })
      }
    >
      <Download className="size-4" />
      {download.isPending ? "Đang tải..." : "Tải CV"}
    </Button>
  );
}

interface CvFileRowProps {
  /** URL file nội bộ: `/api/v1/files/{slug}`. */
  url: string;
  /** Tên file hiển thị (fallback "CV đã nộp"). */
  fileName?: string | null;
  /**
   * MIME type thật của CV (từ backend).
   *
   * <p>Có thì hiện thêm nút "Xem CV" render trực tiếp (chỉ PDF mới được).
   */
  mimeType?: string | null;
  /** Cho phép mở viewer bằng cách riêng (nếu không thì hiện modal mặc định). */
  onView?: () => void;
}

/**
 * Khung hiển thị CV đã nộp: tên file gốc + nút tải có xác thực.
 *
 * <p>Nếu có `mimeType` là PDF → thêm nút "Xem CV" mở viewer trực tiếp.
 */
export function CvFileRow({ url, fileName, mimeType, onView }: CvFileRowProps) {
  const [open, setOpen] = useState(false);
  const displayName = fileName?.trim() || "CV đã nộp";
  const isPdf = mimeType === PDF_MIME_TYPE;

  const handleView = () => {
    if (onView) {
      onView();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="truncate text-sm text-foreground">{displayName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isPdf && (
            <Button variant="outline" size="sm" onClick={handleView}>
              <FileText className="size-4" />
              Xem CV
            </Button>
          )}
          <CvDownloadButton url={url} fileName={displayName} />
        </div>
      </div>

      {/* MODAL XEM CV — chỉ mở khi không có `onView` (dùng chung component) */}
      {!onView && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Xem CV</DialogTitle>
              <DialogDescription>{displayName}</DialogDescription>
            </DialogHeader>
            <CvViewer url={url} fileName={displayName} mimeType={mimeType} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export { PDF_MIME_TYPE };
