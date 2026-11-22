import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ErrorState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CvViewer } from "@/components/shared/cv-viewer";
import { useEmployerApplication } from "@/features/applications/hooks";
import { PATHS } from "@/config/paths";

/**
 * Trang xem CV của ứng viên — dành riêng cho nhà tuyển dụng.
 *
 * <p>Tách thành route riêng (không phải modal) vì CV là tài liệu dài, cần
 * không gian rộng để đọc và phóng to.
 *
 * <p>Quyền xem do backend kiểm tra: NTD chỉ xem được CV của ứng viên đã từng
 * ứng tuyển vào tin của mình. Không cần kiểm tra lại phía frontend.
 */
export default function EmployerApplicationCvPage() {
  const { id = "" } = useParams();
  const { data: application, isPending, isError, refetch } =
    useEmployerApplication(id);

  if (isPending) {
    return (
      <DashboardLayout title="CV ứng viên">
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      </DashboardLayout>
    );
  }

  if (isError || !application) {
    return (
      <DashboardLayout title="CV ứng viên">
        <ErrorState
          title="Không tìm thấy CV"
          description="Hồ sơ ứng viên có thể đã bị xoá hoặc bạn không có quyền xem."
          onRetry={() => void refetch()}
        />
      </DashboardLayout>
    );
  }

  const fileName = application.cvFileName || "CV của ứng viên";

  return (
    <DashboardLayout
      title={`CV — ${application.studentName}`}
      description={`Ứng tuyển vị trí ${application.jobTitle}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link to={PATHS.EMPLOYER.APPLICATION_DETAIL(application.id)} />
          }
        >
          <ArrowLeft className="size-4" />
          Quay lại hồ sơ ứng viên
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl">
        {application.cvUrl ? (
          <CvViewer
            url={application.cvUrl}
            fileName={fileName}
            mimeType={application.cvMimeType}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Ứng viên ứng tuyển bằng hồ sơ VieJob — không có file CV riêng.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
