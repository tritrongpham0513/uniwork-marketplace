import { useState } from "react";
import { cn } from "cn";
import { getInitials } from "./user-avatar";

/** Ánh xạ logoVariant sang class token-safe (không hardcode màu). */
const VARIANT_CLASS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
};

interface JobPreviewImageProps {
  /** URL ảnh preview của tin tuyển dụng — null khi tin chưa có ảnh. */
  src?: string | null;
  /** Tên nhà tuyển dụng — dùng cho alt và khối chữ cái fallback. */
  employerName: string;
  /** URL logo tổ chức — fallback khi tin không có ảnh preview. */
  logoUrl?: string | null;
  /** Màu nền khối chữ cái fallback. */
  logoVariant?: string;
  /** Class kích thước khung vuông (dùng class responsive của Tailwind). */
  sizeClass?: string;
  className?: string;
}

/**
 * Chọn ảnh hiển thị cho khung ảnh vuông của tin tuyển dụng.
 *
 * <p>Thứ tự fallback: ảnh preview → logo tổ chức → `null` (khối chữ cái).
 *
 * @param src      ảnh preview của tin (null khi tin chưa có ảnh)
 * @param logoUrl  logo tổ chức (null khi tổ chức chưa có logo)
 * @param failed   ảnh hiện tại đã tải lỗi → bỏ qua, thử ảnh kế tiếp
 */
export const resolveJobImageSource = (
  src?: string | null,
  logoUrl?: string | null,
  failed = false
): string | null => {
  if (failed) return null;
  const preview = src?.trim() ? src : null;
  if (preview) return preview;
  const logo = logoUrl?.trim() ? logoUrl : null;
  return logo;
};

/**
 * Khung ảnh vuông của tin tuyển dụng.
 *
 * <p>Thứ tự fallback: ảnh preview → logo tổ chức → khối chữ cái. Nhờ vậy
 * thẻ tin luôn có một khối hình ở vị trí cố định — không nhảy layout khi ảnh
 * tải xong, và tin không có ảnh vẫn nhìn giống tin có ảnh.
 */
export function JobPreviewImage({
  src,
  employerName,
  logoUrl,
  logoVariant = "primary",
  sizeClass = "size-24 sm:size-30",
  className,
}: JobPreviewImageProps) {
  const [failed, setFailed] = useState(false);

  const imageSrc = resolveJobImageSource(src, logoUrl, failed);

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={employerName}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(
          "shrink-0 rounded-lg object-cover ring-1 ring-border",
          sizeClass,
          className
        )}
      />
    );
  }

  // Khối chữ cái — dùng đúng cơ chế initials của avatar để nhất quán.
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-semibold",
        VARIANT_CLASS[logoVariant] ?? VARIANT_CLASS.primary,
        "ring-1 ring-border",
        sizeClass,
        className
      )}
    >
      <span className="text-sm sm:text-base">{getInitials(employerName)}</span>
    </div>
  );
}

export default JobPreviewImage;
