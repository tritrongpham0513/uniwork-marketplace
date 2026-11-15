import { Link } from "react-router";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { JobCard } from "@/features/jobs/components/job-card";
import { useJobs } from "@/features/jobs/hooks/useJobs";
import { useSavedJobIds, useToggleSavedJob } from "@/features/saved-jobs/hooks";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";
import { cn } from "cn";

export default function SavedJobsPage() {
  const { data: savedIds = [], isPending: idsPending } = useSavedJobIds();
  const toggleSaved = useToggleSavedJob();

  // Lấy chi tiết các tin đã lưu (giới hạn 20 tin gần nhất)
  const { data: jobsData, isPending: jobsPending, isError, refetch } = useJobs(
    {
      keyword: "",
      categoryIds: [],
      positionIds: [],
      provinceIds: [],
      districtIds: [],
      employmentTypes: [],
      workModes: [],
      salaryUnit: "HOURLY",
      salaryMin: 0,
      salaryMax: 200000,
      sort: "newest",
      page: 1,
      pageSize: 20,
    },
    { enabled: savedIds.length > 0 }
  );

  const savedJobs = (jobsData?.items ?? []).filter((job) =>
    savedIds.includes(job.id)
  );

  const isLoading = idsPending || (savedIds.length > 0 && jobsPending);

  const handleRemove = async (jobId: string) => {
    try {
      await toggleSaved.mutateAsync({ jobId, saved: true });
      toast.success("Đã bỏ lưu tin tuyển dụng.");
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Việc làm đã lưu</CardTitle>
          <CardDescription>
            {savedIds.length > 0
              ? `Bạn đã lưu ${savedIds.length} tin tuyển dụng. Nhấn biểu tượng bookmark để bỏ lưu.`
              : "Lưu lại những tin tuyển dụng bạn quan tâm để xem lại sau."}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="mt-6">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="border-border/60">
                <CardContent className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                  <div className="h-16 rounded-lg bg-muted/60" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách tin đã lưu"
            description="Vui lòng thử lại sau."
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && savedIds.length === 0 && (
          <EmptyState
            icon="search"
            title="Chưa có tin tuyển dụng nào được lưu"
            description="Duyệt các tin tuyển dụng và nhấn biểu tượng bookmark để lưu lại tại đây."
            action={
              <Button size="sm" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
                Tìm việc làm
              </Button>
            }
          />
        )}

        {!isLoading && !isError && savedIds.length > 0 && savedJobs.length === 0 && (
          <EmptyState
            icon="search"
            title="Các tin đã lưu không còn tồn tại"
            description="Những tin tuyển dụng bạn đã lưu có thể đã đóng. Hãy tìm thêm cơ hội mới."
            action={
              <Button size="sm" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
                Xem tin tuyển dụng
              </Button>
            }
          />
        )}

        {!isLoading && !isError && savedJobs.length > 0 && (
          <ul className="space-y-4">
            {savedJobs.map((job) => (
              <li key={job.id} className="relative">
                <JobCard
                  job={job}
                  showApply={false}
                  showSave={false}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("absolute top-4 right-4 bg-card/90 backdrop-blur-sm")}
                  onClick={() => void handleRemove(job.id)}
                  disabled={toggleSaved.isPending}
                >
                  <Trash2 className="size-4" />
                  Bỏ lưu
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {savedIds.length > 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Bookmark className="size-3.5" />
          Mẹo: nhấn biểu tượng bookmark trên thẻ tin để bỏ lưu nhanh hơn.
        </p>
      )}
    </div>
  );
}
