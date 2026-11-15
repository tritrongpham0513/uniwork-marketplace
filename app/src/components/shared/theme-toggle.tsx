import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme, type ResolvedTheme } from "@/provider/theme-provider";
import { cn } from "cn";

const MODE_OPTIONS: Array<{
  value: ResolvedTheme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
];

interface ThemeToggleProps {
  className?: string;
}

/**
 * Nút đổi giao diện sáng ↔ tối chỉ với 1 lần bấm.
 * Icon hiển thị chế độ sẽ chuyển tới (đang tối → mặt trời).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextLabel = isDark
    ? "Chuyển sang giao diện sáng"
    : "Chuyển sang giao diện tối";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn("rounded-full text-muted-foreground", className)}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

export default ThemeToggle;

/**
 * Dạng segmented control cho thanh menu mobile — cùng 2 lựa chọn
 * Sáng / Tối nhưng hiển thị đủ nhãn.
 */
export function ThemeModeToggleGroup({ className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  // Giá trị "system" cũ (nếu có trong localStorage) quy về giao diện đang hiển thị
  const current: ResolvedTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <ToggleGroup
      value={[current]}
      onValueChange={(value) => {
        const next = value[0];
        if (next === "light" || next === "dark") setTheme(next);
      }}
      variant="outline"
      size="sm"
      aria-label="Chọn giao diện"
      className={cn("w-full", className)}
    >
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="flex-1 gap-1.5 text-xs data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary"
          >
            <Icon />
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
