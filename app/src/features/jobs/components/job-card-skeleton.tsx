import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-3xl" />
          <Skeleton className="h-5 w-24 rounded-3xl" />
          <Skeleton className="h-5 w-20 rounded-3xl" />
        </div>

        <div className="flex items-start gap-3">
          {/* Khung ảnh vuông — cùng kích thước với JobCard để không nhảy
              layout khi ảnh thật tải xong. */}
          <Skeleton className="size-24 shrink-0 rounded-lg sm:size-40" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>

        <Skeleton className="h-6 w-28" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export default JobCardSkeleton;
