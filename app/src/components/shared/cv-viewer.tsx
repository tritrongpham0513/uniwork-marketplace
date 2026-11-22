import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadFile } from "@/features/files/hooks";
import { filesService } from "@/features/files/services/files.service";

/**
 * Đường dẫn tới worker của pdf.js do Vite xử lý.
 *
 * <p>`?url` là cú pháp của Vite: build xong nó trả về URL đã được hash của
 * file asset trong `dist/`. Phải dùng specifier trần (`pdfjs-dist/...`) chứ
 * không phải `new URL(..., import.meta.url)` — xem giải thích ở {@link PdfDocument}.
 */
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** MIME type của file PDF — chỉ PDF mới render được trực tiếp trong trình duyệt. */
export const PDF_MIME_TYPE = "application/pdf";

/** Bước zoom (px) cho mỗi lần bấm. */
const ZOOM_STEP = 40;
const MIN_WIDTH = 320;
const MAX_WIDTH = 1400;
const DEFAULT_WIDTH = 720;

interface CvViewerProps {
  /** URL file nội bộ: `/api/v1/files/{slug}`. */
  url: string;
  /** Tên file gốc để hiển thị + đặt tên khi tải. */
  fileName?: string | null;
  /**
   * MIME type thật của CV (từ backend, đã xác minh bằng magic bytes).
   *
   * <p>Quan trọng: **không suy đoán từ tên file**. File `.pdf` do người dùng
   * đặt tên có thể không phải PDF thật; backend đã kiểm tra magic bytes lúc
   * upload nên giá trị này đáng tin.
   */
  mimeType?: string | null;
}

/**
 * Xem CV trực tiếp trong ứng dụng.
 *
 * <p>Cơ chế: tải bytes file qua `axios` (kèm header `Authorization` sẵn có) →
 * đưa vào `react-pdf` dưới dạng `data`. Không dùng `<iframe src>` vì trình
 * duyệt không gắn token khi điều hướng → backend trả 403.
 *
 * <p>Chỉ PDF được render. DOC/DOCX hiển thị thông báo + nút tải xuống.
 */
export function CvViewer({ url, fileName, mimeType }: CvViewerProps) {
  const displayName = fileName?.trim() || "CV";

  const download = useDownloadFile();

  const isPdf = mimeType === PDF_MIME_TYPE;

  const handleDownload = () => {
    download.mutate({ url, fileName: displayName });
  };

  if (!isPdf) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 px-6 py-10 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Định dạng DOC/DOCX không hiển thị trực tiếp — vui lòng tải xuống để
            xem.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={download.isPending}
        >
          <Download className="size-4" />
          {download.isPending ? "Đang tải..." : "Tải CV"}
        </Button>
      </div>
    );
  }

  return (
    // `min-w-0`: xem giải thích ở khung scroll bên dưới.
    <div className="flex min-w-0 flex-col gap-3">
      {/* THANH CÔNG CỤ + TRANG PDF — key theo url để đổi file thì state tự reset */}
      <PdfViewer key={url} url={url} fileName={displayName} />
    </div>
  );
}

/**
 * Thanh công cụ + vùng render PDF.
 *
 * <p>Gộp toolbar với viewer vì chúng dùng chung state (trang hiện tại, zoom).
 * Component cha truyền `key={url}` nên đổi file sẽ reset toàn bộ state mà
 * không cần effect đồng bộ thủ công.
 */
function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const download = useDownloadFile();

  return (
    <>
      {/* THANH CÔNG CỤ */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {numPages > 0 ? `Trang ${page} / ${numPages}` : "—"}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang sau"
            disabled={numPages > 0 && page >= numPages}
            onClick={() =>
              setPage((p) => (numPages > 0 ? Math.min(numPages, p + 1) : p))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Thu nhỏ"
            disabled={width <= MIN_WIDTH}
            onClick={() => setWidth((w) => Math.max(MIN_WIDTH, w - ZOOM_STEP))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round((width / DEFAULT_WIDTH) * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Phóng to"
            disabled={width >= MAX_WIDTH}
            onClick={() => setWidth((w) => Math.min(MAX_WIDTH, w + ZOOM_STEP))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download.mutate({ url, fileName })}
            disabled={download.isPending}
          >
            <Download className="size-4" />
            {download.isPending ? "Đang tải..." : "Tải"}
          </Button>
        </div>
      </div>

      {/*
        TRANG PDF

        `min-w-0` là bắt buộc: khi viewer nằm trong `DialogContent` (CSS grid),
        grid item mặc định có `min-width: auto` → nó nở rộng theo nội dung
        (canvas PDF rộng 1200px+) thay vì co lại theo khung modal. Hệ quả: modal
        bị tràn ra ngoài màn hình và vùng scroll ngang không bao giờ hoạt động
        → không cuộn tới được phần đã zoom.

        `w-full` + `min-w-0` đảm bảo khung scroll bám đúng bề rộng container
        cha, còn phần PDF rộng hơn thì cuộn ngang trong chính khung này.
      */}
      <div className="max-h-[70vh] w-full min-w-0 overflow-auto rounded-lg border border-border bg-muted/30 p-3">
        <PdfDocument
          url={url}
          page={page}
          width={width}
          onLoaded={setNumPages}
        />
      </div>
    </>
  );
}

/**
 * Tải bytes CV + render bằng `react-pdf`.
 *
 * <p>`react-pdf` được import động: thư viện (~1MB) chỉ tải khi người dùng
 * thực sự mở CV, không phình bundle chính của app.
 */
function PdfDocument({
  url,
  page,
  width,
  onLoaded,
}: {
  url: string;
  page: number;
  width: number;
  onLoaded: (numPages: number) => void;
}) {
  const [modules, setModules] = useState<{
    Document: typeof import("react-pdf").Document;
    Page: typeof import("react-pdf").Page;
  } | null>(null);
  const [data, setData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Nạp `react-pdf` + pdf.js worker + bytes của file.
   *
   * <p>Worker của pdf.js phải trỏ đúng file build của Vite, nếu không sẽ báo
   * lỗi "Setting up fake worker failed".
   *
   * <p>Dùng `?url` để Vite tự xử lý đường dẫn asset. `new URL("pdfjs-dist/...",
   * import.meta.url)` **không** dùng được vì nó phân giải theo vị trí file đang
   * ghi (component) chứ không theo package — sẽ trỏ tới
   * `/src/components/shared/pdfjs-dist/...` và trả 404.
   */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [mod, buffer] = await Promise.all([
          import("react-pdf"),
          filesService.fetchBuffer(url),
        ]);

        if (cancelled) return;

        mod.pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        // `data` phải là Uint8Array — react-pdf không nhận ArrayBuffer thô.
        setData(new Uint8Array(buffer));
        setModules({ Document: mod.Document, Page: mod.Page });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Không tải được nội dung CV."
        );
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Cần `key` đổi theo `page` để react-pdf vẽ lại trang mới.
  const pageKey = useMemo(() => `page-${page}`, [page]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-10 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!modules || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { Document, Page } = modules;

  return (
    <Document
      file={{ data }}
      onLoadSuccess={({ numPages: count }) => onLoaded(count)}
      loading={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
      error={
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Không thể hiển thị nội dung PDF này.
          </p>
        </div>
      }
    >
      <Page
        key={pageKey}
        pageNumber={page}
        width={width}
        className="mx-auto overflow-hidden rounded-sm bg-white shadow-sm"
        renderAnnotationLayer={false}
        renderTextLayer={false}
        loading={
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </Document>
  );
}
