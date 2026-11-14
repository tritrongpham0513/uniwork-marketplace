import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
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
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout, navItem } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApplicationTimeline } from "@/components/shared/application-timeline";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { ErrorState } from "@/components/shared/empty-state";
import {
  useEmployerApplication,
  useUpdateApplicationStatus,
} from "@/features/applications/hooks";
import { APPLICATION_STATUS_LABELS } from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";

export default function EmployerApplicationDetailPage() {
  const { id = "" } = useParams();
  const { data: application, isPending, isError, refetch } =
    useEmployerApplication(id);
  const updateStatus = useUpdateApplicationStatus();

  const [note, setNote] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);

  const handleStatus = async (status: Parameters<typeof updateStatus.mutateAsync>[0]["status"]) => {
    try {
      await updateStatus.mutateAsync({
        id,
        status,
        note: note.trim() || undefined,
      });
      toast.success("Đã cập nhật trạng thái đơn ứng tuyển.", {
        description: "Ứng viên đã nhận được thông báo về thay đổi này.",
      });
      setNote("");
    } catch (error) {
      showApiError(error);
    }
  };

  const navItems = [
    navItem("Bảng điều khiển", PATHS.EMPLOYER.ROOT, FileText),
    navItem("Tin tuyển dụng", PATHS.EMPLOYER.JOBS, Briefcase),
    navItem("Ứng viên", PATHS.EMPLOYER.APPLICATIONS, User),
    navItem("Đánh giá", PATHS.EMPLOYER.REVIEWS, Star),
    navItem("Thông tin tổ chức", PATHS.EMPLOYER.ORGANIZATION, User),
  ];

  if (isPending) {
    return (
      <DashboardLayout
        role="EMPLOYER"
        title="Chi tiết ứng viên"
        navItems={navItems}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-xl bg-muted/60 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !application) {
    return (
      <DashboardLayout
        role="EMPLOYER"
        title="Chi tiết ứng viên"
        navItems={navItems}
      >
        <ErrorState
          title="Không tìm thấy hồ sơ ứng viên"
          description="Hồ sơ có thể đã bị xoá hoặc bạn không có quyền xem."
          onRetry={() => void refetch()}
        />
      </DashboardLayout>
    );
  }

  const canReview = application.status === "COMPLETED";

  return (
    <DashboardLayout
      role="EMPLOYER"
      title={application.studentName}
      description={`Ứng tuyển vị trí ${application.jobTitle}`}
      navItems={navItems}
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={PATHS.EMPLOYER.APPLICATIONS} />}
        >
          <ArrowLeft className="size-4" />
          Danh sách ứng viên
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI — HỒ SƠ */}
        <div className="space-y-6 lg:col-span-2">
          {/* THÔNG TIN ỨNG VIÊN */}
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                  {application.studentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg">
                    {application.studentName}
                  </CardTitle>
                  <CardDescription>
                    {application.studentUniversity} · {application.studentMajor}
                    {application.studentYear && ` · Năm học ${application.studentYear}`}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {application.studentEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5" />
                      {application.studentPhone}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {application.studentSkills.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Kỹ năng
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {application.studentSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Giới thiệu bản thân
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {application.studentBio || "Ứng viên chưa viết giới thiệu."}
                </p>
              </div>

              <Separator />

              {/* THƯ GIỚI THIỆU */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Thư giới thiệu đã gửi
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {application.coverLetter || "Ứng viên không viết thư giới thiệu."}
                </p>
              </div>

              {/* CV */}
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  CV / Hồ sơ
                </p>
                {application.cvUrl ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-sm text-foreground">
                        {application.cvFileName ??
                          application.cvUrl.split("/").pop()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a
                          href={application.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <Download className="size-4" />
                      Mở CV
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ứng viên ứng tuyển bằng hồ sơ VieJob.
                  </p>
                )}
              </div>

              {application.expectedSalary && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Lương ứng viên mong muốn
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

          {/* ĐÁNH GIÁ ỨNG VIÊN */}
          {canReview && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base">
                  <Star className="size-4 text-primary" />
                  Đánh giá sinh viên
                </CardTitle>
                <CardDescription>
                  Công việc đã hoàn thành. Đánh giá giúp các nhà tuyển dụng
                  khác có lựa chọn tốt hơn.
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

        {/* CỘT PHẢI — TRẠNG THÁI & HÀNH ĐỘNG */}
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

              <CardContent className="space-y-4">
                <ApplicationTimeline
                  timeline={application.timeline}
                  currentStatus={application.status}
                />

                {/* GHI CHÚ NỘI BỘ */}
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    Ghi chú nội bộ
                  </p>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="Ghi chú riêng giữa bạn và đội ngũ tuyển dụng..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (!note.trim()) {
                        toast.warning("Vui lòng nhập nội dung ghi chú.");
                        return;
                      }
                      toast.success("Đã lưu ghi chú nội bộ.");
                    }}
                  >
                    <Save className="size-4" />
                    Lưu ghi chú
                  </Button>
                </div>

                {/* HÀNH ĐỘNG */}
                <div className="space-y-2 border-t border-border/60 pt-4">
                  {application.status === "PENDING" && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => handleStatus("SHORTLISTED")}
                        disabled={updateStatus.isPending}
                      >
                        <ThumbsUp className="size-4" />
                        Duyệt sơ bộ
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={() => handleStatus("REJECTED")}
                        disabled={updateStatus.isPending}
                      >
                        <ThumbsDown className="size-4" />
                        Từ chối ứng viên
                      </Button>
                    </>
                  )}

                  {application.status === "VIEWED" && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => handleStatus("SHORTLISTED")}
                        disabled={updateStatus.isPending}
                      >
                        <ThumbsUp className="size-4" />
                        Duyệt sơ bộ
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={() => handleStatus("REJECTED")}
                        disabled={updateStatus.isPending}
                      >
                        <ThumbsDown className="size-4" />
                        Từ chối ứng viên
                      </Button>
                    </>
                  )}

                  {application.status === "SHORTLISTED" && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => handleStatus("ACCEPTED")}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="size-4" />
                        Nhận ứng viên
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={() => handleStatus("REJECTED")}
                        disabled={updateStatus.isPending}
                      >
                        <ThumbsDown className="size-4" />
                        Từ chối ứng viên
                      </Button>
                    </>
                  )}

                  {application.status === "ACCEPTED" && (
                    <Button
                      className="w-full"
                      onClick={() => handleStatus("COMPLETED")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="size-4" />
                      Đánh dấu hoàn thành
                    </Button>
                  )}

                  {application.status === "COMPLETED" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setReviewOpen(true)}
                    >
                      <Star className="size-4" />
                      Đánh giá sinh viên
                    </Button>
                  )}

                  {(application.status === "REJECTED" ||
                    application.status === "WITHDRAWN") && (
                    <p className="text-center text-xs text-muted-foreground">
                      Đơn ứng tuyển đã đóng.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* VỊ TRÍ ỨNG TUYỂN */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Vị trí ứng tuyển
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <p className="flex items-center gap-2 text-foreground">
                  <Briefcase className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{application.jobTitle}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {application.employerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ứng tuyển ngày{" "}
                  {new Date(application.createdAt).toLocaleDateString("vi-VN")}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  nativeButton={false}
                  render={<Link to={PATHS.JOBS.DETAIL(application.jobId)} />}
                >
                  Xem tin tuyển dụng
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        applicationId={application.id}
        targetType="STUDENT"
        targetName={application.studentName}
        jobTitle={application.jobTitle}
      />
    </DashboardLayout>
  );
}
