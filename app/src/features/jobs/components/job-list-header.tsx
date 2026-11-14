import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobSort } from "@/features/jobs/types";
import { useJobFilters } from "@/features/jobs/hooks/useJobFilters";

const SORT_LABELS: Record<JobSort, string> = {
  newest: "Mới nhất",
  salary_desc: "Lương cao nhất",
  salary_asc: "Lương thấp nhất",
  popular: "Được xem nhiều",
};

/** Base UI dùng `items` để map value -> label hiển thị trong Select.Value */
const SORT_ITEMS = Object.entries(SORT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface JobListHeaderProps {
  total: number;
  isLoading?: boolean;
}

export function JobListHeader({ total, isLoading }: JobListHeaderProps) {
  const { filters, update } = useJobFilters();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {isLoading ? (
          "Đang tải việc làm..."
        ) : (
          <>
            <span className="font-heading text-base font-medium text-foreground">
              {total}
            </span>{" "}
            việc làm
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sắp xếp</span>
        <Select
          value={filters.sort}
          onValueChange={(value) =>
            update({ sort: (value as JobSort) ?? "newest", page: 1 })
          }
          items={SORT_ITEMS}
        >
          <SelectTrigger size="sm" className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as JobSort[]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
