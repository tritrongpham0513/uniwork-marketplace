import type { EmployerSummary } from "@/features/shared/types";
import { BadgeCheck } from "lucide-react";
import { cn } from "cn";

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
  logoUrl?: string | null;
  verified?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
} as const;

/** Lấy 2 chữ cái đầu để làm avatar fallback */
export const getInitials = (name?: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={cn(
            "rounded-xl object-cover ring-1 ring-border",
            SIZE_CLASS[size]
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl font-semibold ring-1 ring-border",
            VARIANT_CLASS[variant],
            SIZE_CLASS[size]
          )}
          aria-hidden
        >
          {getInitials(name)}
        </div>
      )}

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
