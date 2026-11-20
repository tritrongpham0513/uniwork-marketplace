import { createElement } from "react";
import {
  Briefcase,
  ChefHat,
  Code2,
  GraduationCap,
  Megaphone,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

/**
 * Bảng tra icon lucide theo tên (trường `icon` của nhóm việc trong API).
 * Cho phép render icon động cho nhóm việc mà không cần thêm lib.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  Truck,
  Megaphone,
  Briefcase,
  GraduationCap,
  Code2,
};

/** Lấy component icon theo tên; fallback về icon mặc định. */
export const getCategoryIcon = (name?: string | null): LucideIcon =>
  (name && ICON_MAP[name]) || Briefcase;

interface CategoryIconProps {
  /** Tên icon trong dữ liệu (ví dụ "ChefHat") */
  name?: string | null;
  className?: string;
}

/**
 * Render icon của nhóm việc.
 * Dùng `createElement` thay vì gán component vào biến rồi render,
 * để tuân thủ rule `react-hooks/static-components`.
 */
export function CategoryIcon({ name, className }: CategoryIconProps) {
  return createElement(getCategoryIcon(name), {
    className: cn("size-4", className),
  });
}
