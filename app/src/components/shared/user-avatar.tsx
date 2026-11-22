import { useState } from "react";
import { cn } from "cn";

/**
 * Lấy 2 chữ cái đầu của tên để làm avatar fallback.
 *
 * "Nguyễn Văn A" → "NA"; "VieJob" → "VI".
 */
export const getInitials = (name?: string | null): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Kích thước avatar dùng chung.
 *
 * - `xs`: size-6 (24px) — header dropdown
 * - `sm`: size-8 (32px) — sidebar, menu tài khoản
 * - `md`: size-10 (40px) — danh sách
 * - `lg`: size-14 (56px) — trang hồ sơ
 */
export type AvatarSize = "xs" | "sm" | "md" | "lg";

export const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

/** Bo tròn hay bo góc? Avatar người dùng → tròn, logo tổ chức → góc. */
export type AvatarShape = "circle" | "rounded";

export const AVATAR_SHAPE_CLASS: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-xl",
};

interface UserAvatarProps {
  /** Tên hiển thị — dùng để tính chữ cái fallback. */
  name?: string | null;
  /** URL ảnh đại diện. Nếu null/rỗng → hiện chữ cái fallback. */
  imageUrl?: string | null;
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Class nền fallback (token-safe, không hardcode màu). */
  className?: string;
}

/**
 * Avatar hiển thị ảnh thật nếu có, ngược lại dùng chữ cái fallback.
 *
 * <p>Quan trọng: khi URL ảnh không tải được (hồ sơ bị xoá, file hỏng),
 * component tự động fallback về chữ cái thay vì hiện ảnh "hỏng".
 */
export function UserAvatar({
  name,
  imageUrl,
  size = "sm",
  shape = "circle",
  className,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  const shapeClass = AVATAR_SHAPE_CLASS[shape];

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={name ?? "Ảnh đại diện"}
        className={cn(
          "shrink-0 object-cover ring-1 ring-border",
          shapeClass,
          AVATAR_SIZE_CLASS[size],
          className
        )}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary font-semibold text-primary-foreground",
        shapeClass,
        AVATAR_SIZE_CLASS[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

export default UserAvatar;
