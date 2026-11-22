import type { EmployerSummary } from "@/features/shared/types";
import { BadgeCheck } from "lucide-react";
import { cn } from "cn";
import { UserAvatar, type AvatarSize } from "./user-avatar";

/** Ánh xạ logoVariant sang class token-safe (không hardcode màu) */
const VARIANT_CLASS: Record<EmployerSummary["logoVariant"], string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
};

interface EmployerAvatarProps {
  name: string;
  variant?: EmployerSummary["logoVariant"];
  /** URL logo tổ chức — nếu có sẽ hiện ảnh thay cho chữ cái. */
  logoUrl?: string | null;
  verified?: boolean;
  size?: AvatarSize;
  className?: string;
}

export function EmployerAvatar({
  name,
  variant = "primary",
  logoUrl,
  verified = false,
  size = "md",
  className,
}: EmployerAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <UserAvatar
        name={name}
        imageUrl={logoUrl}
        size={size}
        shape="rounded"
        className={cn(
          !logoUrl && VARIANT_CLASS[variant],
          "ring-1 ring-border"
        )}
      />

      {verified && (
        <span
          className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
          title="Nhà tuyển dụng đã xác minh"
        >
          <BadgeCheck className="size-3" />
          <span className="sr-only">Đã xác minh</span>
        </span>
      )}
    </div>
  );
}

export default EmployerAvatar;
