import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  Phone,
  Star,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApplicationTimeline } from "@/components/shared/application-timeline";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/empty-state";
import { CvFileRow } from "@/components/shared/cv-file-row";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  useStudentApplication,
  useWithdrawApplication,
} from "@/features/applications/hooks";
import { formatApplicationJobSalary } from "@/features/applications/lib/format";
import { APPLICATION_STATUS_LABELS } from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { formatDateVi } from "@/lib/date";
import { showApiError, toast } from "@/lib/toast";

export default function StudentApplicationDetailPage() {
  const { id = "" } = useParams();
  const {
    data: application,
    isPending,
    isError,
    refetch,
  } = useStudentApplication(id);
  const withdraw = useWithdrawApplication();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync(application!.id);
      toast.success("Đã rút đơn ứng tuyển.");
      setWithdrawOpen(false);
    } catch (error) {
      showApiError(error);
    }
  };

  if (isPending) {
    return (
      <DashboardLayout title="Chi tiết đơn ứng tuyển">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
          </div>
          <div className="h-80 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !application) {
    return (
      <DashboardLayout title="Chi tiết đơn ứng tuyển">
        <ErrorState
          title="Không tìm thấy đơn ứng tuyển"
          description="Đơn ứng tuyển có thể đã bị xoá hoặc bạn không có quyền xem."
          onRetry={() => void refetch()}
        />
      </DashboardLayout>
    );
  }

  const canWithdraw = application.status === "PENDING";
  const canReview = application.status === "COMPLETED";

  return (
    <DashboardLayout
      title={application.jobTitle}
      description={`Ứng tuyển ngày ${new Date(application.createdAt).toLocaleDateString("vi-VN")}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={PATHS.STUDENT.APPLICATIONS} />}
        >
          <ArrowLeft className="size-4" />
          Danh sách đơn
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI */}
        <div className="space-y-6 lg:col-span-2">
          {/* VỊ TRÍ ĐÃ ỨNG TUYỂN */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Briefcase className="size-4 text-primary" />
                Vị trí đã ứng tuyển
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <p className="font-semibold text-foreground">
                {application.jobTitle}
              </p>
              {(application.jobWard || application.jobProvince) && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {[application.jobWard, application.jobProvince]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {application.jobSalaryType !== "NEGOTIABLE" &&
                application.jobSalaryMin != null &&
                application.jobSalaryMin > 0 && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="size-4 shrink-0" />
                    <span className="font-medium text-foreground">
                      {formatApplicationJobSalary(application)}
                    </span>
                  </p>
                )}
            </CardContent>
          </Card>

          {/* THÔNG TIN NHÀ TUYỂN DỤNG */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Building2 className="size-4 text-primary" />
                Nhà tuyển dụng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={application.employerName}
                  imageUrl={application.employerLogoUrl}
                  size="lg"
                  shape="rounded"
                  className="bg-primary/10 text-primary"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {application.employerName}
                    {application.employerVerified && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        Đã xác minh
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Xem tất cả tin tuyển dụng của nhà tuyển dụng này
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* THƯ GIỚI THIỆU */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Thư giới thiệu bạn đã gửi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.coverLetter ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {application.coverLetter}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bạn không viết thư giới thiệu cho đơn ứng tuyển này.
                </p>
              )}
            </CardContent>
          </Card>

          {/* CV ĐÃ NỘP */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                CV đã nộp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.cvUrl ? (
                <CvFileRow
                  url={application.cvUrl}
                  fileName={application.cvFileName}
                  mimeType={application.cvMimeType}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bạn đã ứng tuyển bằng hồ sơ VieJob (không cần tải CV riêng).
                </p>
              )}

              {application.expectedSalary && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Mức lương kỳ vọng
                    </span>
                    <span className="font-semibold text-foreground">
                      {application.expectedSalary.toLocaleString("vi-VN")} đ
                      {application.expectedSalary > 100000 ? "/tháng" : "/giờ"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* KINH NGHIỆM LIÊN QUAN & NGÀY BẮT ĐẦU */}
          {(application.experience || application.availableFrom) && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Kinh nghiệm &amp; lịch làm việc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.experience && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">
                      Kinh nghiệm liên quan
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                      {application.experience}
                    </p>
                  </div>
                )}

                {application.experience && application.availableFrom && (
                  <Separator />
                )}

                {application.availableFrom && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Ngày có thể bắt đầu
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDateVi(application.availableFrom)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* GHI CHÚ CỦA NTD */}
          {application.employerNote && (
            <Card className="border-border/60 bg-primary/5">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Ghi chú từ nhà tuyển dụng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {application.employerNote}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ĐÁNH GIÁ 2 CHIỀU */}
          {canReview && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <Star className="size-4 text-primary" />
                  Đánh giá nhà tuyển dụng
                </CardTitle>
                <CardDescription>
                  Công việc đã hoàn thành. Đánh giá của bạn giúp sinh viên khác
                  có lựa chọn tốt hơn.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" onClick={() => setReviewOpen(true)}>
                  <Star className="size-4" />
                  Viết đánh giá
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* CỘT PHẢI — TIMELINE */}
        <div>
          <div className="space-y-6 lg:sticky lg:top-20">
            <Card className="border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-heading text-base">
                    Trạng thái đơn
                  </CardTitle>
                  <StatusBadge
                    status={application.status}
                    label={APPLICATION_STATUS_LABELS[application.status]}
                  />
                </div>
                <CardDescription>
                  Cập nhật lần cuối{" "}
                  {new Date(application.updatedAt).toLocaleString("vi-VN")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationTimeline
                  timeline={application.timeline}
                  currentStatus={application.status}
                />

                {canWithdraw && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-5 w-full"
                    onClick={() => setWithdrawOpen(true)}
                  >
                    <Undo2 className="size-4" />
                    Rút đơn ứng tuyển
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* THÔNG TIN LIÊN HỆ */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Thông tin liên hệ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{application.studentEmail}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  {application.studentPhone}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {application.studentUniversity} · {application.studentMajor}
                </p>
                {(application.studentAddress ||
                  application.studentProvince) && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    <span>
                      {[application.studentAddress, application.studentProvince]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                )}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-4 shrink-0" />
                  Năm học {application.studentYear ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              nativeButton={false}
              render={<Link to={PATHS.JOBS.DETAIL(application.jobId)} />}
            >
              Xem lại tin tuyển dụng
            </Button>
          </div>
        </div>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        applicationId={application.id}
        targetType="EMPLOYER"
        targetName={application.employerName}
        jobTitle={application.jobTitle}
      />

      <ConfirmDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Rút đơn ứng tuyển?"
        description="Sau khi rút, nhà tuyển dụng sẽ không còn xem được hồ sơ của bạn."
        confirmLabel="Rút đơn"
        destructive
        isPending={withdraw.isPending}
        onConfirm={handleWithdraw}
      />
    </DashboardLayout>
  );
}
