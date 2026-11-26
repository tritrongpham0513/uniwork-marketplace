import { Link } from "react-router";
import { ArrowRight, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobCategory, Province } from "@/features/shared/types";
import { PATHS } from "@/config/paths";

interface JobLinkGridProps {
  /** Danh sách tỉnh/thành */
  provinces: Province[];
  /** Danh sách nhóm việc */
  categories: JobCategory[];
  /** Số tin theo tỉnh (đã map sẵn) */
  provinceCounts?: Record<string, number>;
  /** Số tin theo nhóm việc (đã map sẵn) */
  categoryCounts?: Record<string, number>;
  /** Số tin theo từng cặp (tỉnh, nhóm việc) */
  provinceCategoryCounts?: Record<string, Record<string, number>>;
  /** Số nhóm việc hiển thị trong mỗi card tỉnh */
  perProvince?: number;
  /** Icon trước tiêu đề */
  variant?: "province" | "popular";
}

/**
 * Lưới link kiểu Viecoday: mỗi tỉnh là 1 card chứa các link
 * "Việc {nhóm việc} tại {tỉnh}" trỏ thẳng tới `/jobs` với query đã lọc.
 */
export function JobLinkGrid({
  provinces,
  categories,
  provinceCounts = {},
  categoryCounts = {},
  provinceCategoryCounts,
  perProvince = 4,
  variant = "province",
}: JobLinkGridProps) {
  if (provinces.length === 0 || categories.length === 0) return null;

  // Chỉ giữ lại các tỉnh có ít nhất 1 tin tuyển dụng nếu đã có thống kê
  const hasCounts = Object.keys(provinceCounts).length > 0;
  const visibleProvinces = hasCounts
    ? [...provinces]
        .filter((p) => (provinceCounts[p.id] ?? 0) > 0)
        .sort(
          (a, b) => (provinceCounts[b.id] ?? 0) - (provinceCounts[a.id] ?? 0)
        )
    : provinces;

  if (visibleProvinces.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleProvinces.map((province) => {
        const catCountsForProvince = provinceCategoryCounts?.[province.id];
        const provinceCategories = catCountsForProvince
          ? categories
              .filter((c) => (catCountsForProvince[c.id] ?? 0) > 0)
              .sort(
                (a, b) =>
                  (catCountsForProvince[b.id] ?? 0) -
                  (catCountsForProvince[a.id] ?? 0)
              )
          : [...categories].sort(
              (a, b) =>
                (categoryCounts[b.id] ?? 0) - (categoryCounts[a.id] ?? 0)
            );

        return (
          <Card key={province.id} className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {variant === "popular" ? (
                  <TrendingUp className="size-4 text-primary" />
                ) : (
                  <MapPin className="size-4 text-primary" />
                )}
                {variant === "popular"
                  ? `Việc làm được tìm nhiều tại ${province.name}`
                  : `Việc làm tại ${province.name}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {provinceCounts[province.id] ?? 0} tin đang tuyển
              </p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {provinceCategories.slice(0, perProvince).map((category) => (
                <Link
                  key={category.id}
                  to={`${PATHS.JOBS.ROOT}?provinceIds=${province.id}&categoryIds=${category.id}`}
                  className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="truncate text-muted-foreground transition-colors group-hover:text-foreground">
                    Việc {category.name.toLowerCase()} tại {province.name}
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                </Link>
              ))}
              <Link
                to={`${PATHS.JOBS.ROOT}?provinceIds=${province.id}`}
                className="mt-2 inline-flex items-center gap-1 px-2 text-xs font-medium text-primary hover:underline"
              >
                Xem tất cả việc làm tại {province.name}
                <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default JobLinkGrid;
