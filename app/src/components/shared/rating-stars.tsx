import { Star } from "lucide-react";
import { cn } from "cn";

interface RatingStarsProps {
  /** Điểm đánh giá (1–5) */
  value?: number;
  /** Số lượt đánh giá */
  count?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
  showValue?: boolean;
}

const SIZE_CLASS = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
} as const;

/** Hiển thị sao đọc-only (dùng trong card, danh sách đánh giá) */
export function RatingStars({
  value = 0,
  count,
  size = "sm",
  className,
  showValue = false,
}: RatingStarsProps) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Đánh giá ${value} trên 5 sao`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((index) => {
          const filled = rounded >= index;
          const half = !filled && rounded >= index - 0.5;

          return (
            <span key={index} className="relative inline-flex">
              <Star
                className={cn(
                  SIZE_CLASS[size],
                  filled
                    ? "fill-primary text-primary"
                    : half
                      ? "fill-primary/50 text-primary"
                      : "fill-transparent text-muted-foreground/40"
                )}
              />
            </span>
          );
        })}
      </div>

      {showValue && (
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {value.toFixed(1)}
        </span>
      )}

      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/** Nhập sao 1–5 (dùng trong dialog đánh giá 2 chiều) */
export function RatingInput({ value, onChange, className }: RatingInputProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Chấm điểm đánh giá"
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <button
          key={index}
          type="button"
          role="radio"
          aria-checked={value === index}
          aria-label={`${index} sao`}
          onClick={() => onChange(index)}
          className="cursor-pointer rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              index <= value
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground/40"
            )}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-foreground">
          {value}/5
        </span>
      )}
    </div>
  );
}

export default RatingStars;
