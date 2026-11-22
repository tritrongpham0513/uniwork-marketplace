import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Star,
  ThumbsDown,
  ThumbsUp,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { ApplicationTimeline } from "@/components/shared/application-timeline";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { ErrorState } from "@/components/shared/empty-state";
import { RatingStars } from "@/components/shared/rating-stars";
import { CvFileRow } from "@/components/shared/cv-file-row";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  useEmployerApplication,
  useUpdateApplicationNote,
  useUpdateApplicationStatus,
} from "@/features/applications/hooks";
import { useSkills } from "@/features/jobs/hooks/useJobs";
import {
  useApplicationReviews,
  useReplyReviewAsReviewer,
} from "@/features/reviews/hooks";
import { useEmployerProfile } from "@/features/profile/hooks";
import { useApplicationWorkHistory } from "@/features/work-history/hooks";
import { APPLICATION_STATUS_LABELS, type Review } from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { formatDateVi } from "@/lib/date";
import { showApiError, toast } from "@/lib/toast";

export default function EmployerApplicationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const {
    data: application,
    isPending,
    isError,
    refetch,
  } = useEmployerApplication(id);
  const updateStatus = useUpdateApplicationStatus();
  const updateNote = useUpdateApplicationNote();
  const { data: skills = [] } = useSkills();
  const { data: employerProfile } = useEmployerProfile();
  // Đánh giá ứng viên đã nhận từ nhà tuyển dụng khác (uy tín của sinh viên)
  const {
    data: candidateReviews = [],
    isPending: candidateReviewsPending,
  } = useApplicationReviews(id);
  // NTD phản hồi lại đánh giá mà chính NTD đã viết cho ứng viên.
  const replyAsReviewer = useReplyReviewAsReviewer();
  // Kinh nghiệm làm việc của ứng viên (hệ thống tự ghi khi đơn hoàn thành).
  const {
    data: workHistories = [],
    isPending: workHistoriesPending,
  } = useApplicationWorkHistory(id);

  /** Đánh giá do chính NTD này viết -> NTD là `reviewer`, được phản hồi lại. */
  const isOwnReview = (review: { fromUserId: number }) =>
    employerProfile != null && review.fromUserId === employerProfile.userId;

  // Điểm trung bình tính từ các đánh giá đang hiển thị
  const candidateAvgRating = useMemo(() => {
    if (candidateReviews.length === 0) return 0;
    const sum = candidateReviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / candidateReviews.length) * 10) / 10;
  }, [candidateReviews]);

  const [note, setNote] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  // Dialog phản hồi lại đánh giá mà NTD đã viết cho ứng viên.
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  // Đồng bộ ô ghi chú khi đơn ứng tuyển tải về — pattern "adjust state khi dữ liệu đổi"
  const [syncedApplicationId, setSyncedApplicationId] = useState<string | null>(null);

  /** Gửi phản hồi của NTD vào ô `reviewerReply` (phía người viết đánh giá). */
  const handleReviewerReply = async () => {
    if (!replyTarget) return;
    if (!replyText.trim()) {
      toast.warning("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    try {
      await replyAsReviewer.mutateAsync({
        id: replyTarget.id,
        reply: replyText.trim(),
      });
      toast.success("Đã gửi phản hồi tới ứng viên.");
      setReplyTarget(null);
      setReplyText("");
    } catch (error) {
      showApiError(error);
    }
  };

  if (application && application.id !== syncedApplicationId) {
    setSyncedApplicationId(application.id);
    setNote(application.employerNote ?? "");
  }

  const handleStatus = async (
    status: Parameters<typeof updateStatus.mutateAsync>[0]["status"]
  ) => {
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

  /** Lưu ghi chú nội bộ — chỉ nhà tuyển dụng trong tổ chức thấy. */
  const handleSaveNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.warning("Vui lòng nhập nội dung ghi chú.");
      return;
    }
    try {
      await updateNote.mutateAsync({ id, note: trimmed });
      toast.success("Đã lưu ghi chú nội bộ.");
    } catch (error) {
      showApiError(error);
    }
  };

  if (isPending) {
    return (
      <DashboardLayout title="Chi tiết ứng viên">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-xl bg-muted/60 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !application) {
    return (
      <DashboardLayout title="Chi tiết ứng viên">
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
      title={application.studentName}
      description={`Ứng tuyển vị trí ${application.jobTitle}`}
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
                <UserAvatar
                  name={application.studentName}
                  imageUrl={application.studentAvatarUrl}
                  size="lg"
                  className="bg-primary/10 text-primary"
                />
                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg">
                    {application.studentName}
                  </CardTitle>
                  <CardDescription>
                    {application.studentUniversity} · {application.studentMajor}
                    {application.studentYear &&
                      ` · Năm học ${application.studentYear}`}
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
                    {application.studentSkills.map((skillId) => (
                      <Badge key={skillId} variant="secondary">
                        {skills.find((skill) => skill.id === skillId)?.name ??
                          skillId}
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
                  {application.coverLetter ||
                    "Ứng viên không viết thư giới thiệu."}
                </p>
              </div>

              {/* CV */}
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  CV / Hồ sơ
                </p>
                {application.cvUrl ? (
                  <CvFileRow
                    url={application.cvUrl}
                    fileName={application.cvFileName}
                    mimeType={application.cvMimeType}
                    onView={() =>
                      navigate(PATHS.EMPLOYER.APPLICATION_CV(application.id))
                    }
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ứng viên ứng tuyển bằng hồ sơ VieJob.
                  </p>
                )}
              </div>

              {application.expectedSalary != null &&
                application.expectedSalary > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Lương ứng viên mong muốn
                      </span>
                      <span className="font-semibold text-foreground">
                        {application.expectedSalary.toLocaleString("vi-VN")} đ
                        {application.expectedSalary > 100000
                          ? "/tháng"
                          : "/giờ"}
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
                  Công việc đã hoàn thành. Đánh giá giúp các nhà tuyển dụng khác
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

          {/* KINH NGHIỆM LÀM VIỆC CỦA ỨNG VIÊN — hệ thống tự ghi nhận */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Briefcase className="size-4 text-primary" />
                Kinh nghiệm làm việc
              </CardTitle>
              <CardDescription>
                Những công việc ứng viên đã hoàn thành trên VieJob. VieJob tự
                động ghi nhận khi nhà tuyển dụng xác nhận hoàn thành công việc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workHistoriesPending && (
                <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
              )}

              {!workHistoriesPending && workHistories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ứng viên chưa có kinh nghiệm làm việc nào được ghi nhận trên
                  VieJob.
                </p>
              )}

              {!workHistoriesPending && workHistories.length > 0 && (
                <ul className="space-y-3">
                  {workHistories.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {item.positionName || item.jobTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.companyName}
                          </p>
                        </div>
                        {item.rating != null && (
                          <RatingStars
                            value={item.rating}
                            size="xs"
                            showValue
                          />
                        )}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.jobTitle}
                      </p>

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatDateVi(item.startedAt)} —{" "}
                        {formatDateVi(item.completedAt)}
                      </p>

                      {item.salaryMin != null && item.salaryMin > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mức lương:{" "}
                          <span className="font-medium text-foreground">
                            {item.salaryMin.toLocaleString("vi-VN")} đ
                            {item.salaryMin > 100000 ? "/tháng" : "/giờ"}
                            {item.salaryMax != null && item.salaryMax > 0
                              ? ` — ${item.salaryMax.toLocaleString("vi-VN")} đ`
                              : ""}
                          </span>
                        </p>
                      )}

                      {item.note && (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          “{item.note}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ĐÁNH GIÁ ỨNG VIÊN ĐÃ NHẬN TỪ NHÀ TUYỂN DỤNG KHÁC */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Star className="size-4 text-primary" />
                Uy tín ứng viên
              </CardTitle>
              <CardDescription>
                Đánh giá ứng viên này đã nhận từ các nhà tuyển dụng khác.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidateReviewsPending && (
                <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
              )}

              {!candidateReviewsPending && candidateReviews.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ứng viên chưa nhận đánh giá nào từ nhà tuyển dụng khác.
                </p>
              )}

              {!candidateReviewsPending && candidateReviews.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <RatingStars
                      value={candidateAvgRating}
                      size="sm"
                      showValue
                      count={candidateReviews.length}
                    />
                  </div>

                  <ul className="space-y-3">
                    {candidateReviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {review.fromName}
                            {isOwnReview(review) && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (bạn)
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <RatingStars value={review.rating} size="xs" />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {new Date(review.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                          </div>
                        </div>
                        {review.jobTitle && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Vị trí: {review.jobTitle}
                          </p>
                        )}
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          “{review.comment}”
                        </p>

                        {/* Phản hồi của sinh viên (người bị đánh giá) */}
                        {review.reply && (
                          <div className="mt-2 rounded-md border-l-2 border-primary bg-background/60 p-2.5">
                            <p className="mb-0.5 text-xs font-semibold text-primary">
                              Phản hồi của {review.targetName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {review.reply}
                            </p>
                          </div>
                        )}

                        {/* Phản hồi của NTD (người viết đánh giá) */}
                        {review.reviewerReply && (
                          <div className="mt-2 rounded-md border-l-2 border-border bg-background/60 p-2.5">
                            <p className="mb-0.5 text-xs font-semibold text-foreground">
                              Phản hồi của {review.fromName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {review.reviewerReply}
                            </p>
                          </div>
                        )}

                        {/* NTD phản hồi lại đánh giá mình đã viết */}
                        {isOwnReview(review) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setReplyTarget(review)}
                          >
                            <MessageSquare className="size-4" />
                            {review.reviewerReply
                              ? "Sửa phản hồi"
                              : "Phản hồi ứng viên"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
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
                    disabled={updateNote.isPending}
                    onClick={() => void handleSaveNote()}
                  >
                    <Save className="size-4" />
                    {updateNote.isPending ? "Đang lưu..." : "Lưu ghi chú"}
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

      {/* DIALOG PHẢN HỒI LẠI ĐÁNH GIÁ (NTD là người viết đánh giá) */}
      <Dialog
        open={replyTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReplyTarget(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Phản hồi ứng viên</DialogTitle>
          </DialogHeader>

          {replyTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <RatingStars value={replyTarget.rating} className="mb-1.5" />
                <p className="text-sm text-muted-foreground">
                  “{replyTarget.comment}”
                </p>
              </div>

              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder={`Viết phản hồi của bạn tới ${replyTarget.targetName}...`}
              />
              <p className="text-xs text-muted-foreground">
                {replyText.length}/500 ký tự
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyTarget(null);
                setReplyText("");
              }}
              disabled={replyAsReviewer.isPending}
            >
              Huỷ
            </Button>
            <Button onClick={handleReviewerReply} disabled={replyAsReviewer.isPending}>
              {replyAsReviewer.isPending ? "Đang gửi..." : "Gửi phản hồi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
