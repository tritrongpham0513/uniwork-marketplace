import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JobCategory, Province } from "@/features/shared/types";
import { CategoryIcon } from "@/features/jobs/lib/category-icon";
import { PATHS } from "@/config/paths";

interface CategoryGridProps {
  categories: JobCategory[];
}

/** Lưới nhóm việc — layout ô vuông giống Viecoday */
export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => {
        return (
          <Link
            key={category.id}
            to={`${PATHS.JOBS.ROOT}?categoryIds=${category.id}`}
            className="group"
          >
            <Card
              size="sm"
              className="h-full transition-colors group-hover:bg-muted/40"
            >
              <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
                <div>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <CategoryIcon name={category.icon} className="size-4.5" />
                  </div>
                  <p className="font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {category.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px]">
                  {category.jobCount} tin tuyển
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

interface ProvinceGridProps {
  provinces: Province[];
  counts: Record<string, number>;
}

/** Lưới địa điểm — layout Viecoday */
export function ProvinceGrid({ provinces, counts }: ProvinceGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {provinces.map((province) => (
        <Link
          key={province.id}
          to={`${PATHS.JOBS.ROOT}?provinceIds=${province.id}`}
          className="group"
        >
          <Card size="sm" className="h-full transition-colors group-hover:bg-muted/40">
            <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {province.name}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {counts[province.id] ?? 0} việc làm
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/** Nút "xem tất cả" dùng chung */
export function SeeAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}
