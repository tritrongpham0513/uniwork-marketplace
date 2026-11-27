import { Link, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellRing,
  BookmarkCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Eye,
  Info,
  MapPin,
  Pencil,
  Share2,
  TrendingDown,
  TrendingUp,
  Users,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmployerAvatar } from "@/components/shared/employer-avatar";
import { JobImageLightbox } from "@/components/shared/job-image-lightbox";
import { useState } from "react";
import { ErrorState } from "@/components/shared/empty-state";
import { JobCard } from "@/features/jobs/components/job-card";
import { SaveJobButton } from "@/components/shared/save-job-button";
import {
  useJob,
  useRelatedJobs,
  useSalaryBenchmarks,
} from "@/features/jobs/hooks/useJobs";
import { compareSalary, findBenchmarkFor } from "@/features/shared/lib/salary";
import { usePublicEmployerProfile } from "@/features/profile/hooks";
import { RatingStars } from "@/components/shared/rating-stars";
import {
  DAY_OF_WEEK_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SALARY_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/features/jobs/types";
import {
  formatPostedAgo,
  formatSalary,
  locationFull,
  locationName,
} from "@/features/jobs/lib/format";
import { useAuth } from "@/features/auth/hooks";
import { useStudentApplicationByJob } from "@/features/applications/hooks";
import {
  APPLICATION_STATUS_LABELS,
  isJobRecruiting,
  JOB_STATUS_LABELS,
  type Job,
  type RoleType,
} from "@/features/shared/types";
import {
  useJobNotifyPreferences,
  useToggleJobNotify,
} from "@/features/notifications/hooks";
import { PATHS } from "@/config/paths";
import { SHOW_SALARY_RANKING } from "@/config/feature-flags";
import { showApiError, toast } from "@/lib/toast";

/** Tạo link Google Maps từ địa chỉ của tin tuyển dụng */
const buildMapUrl = (
  address: string,
  district: string,
  province: string
): string => {
  const query = [address, district, province].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export function JobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const { data: job, isLoading, isError, refetch } = useJob(id);
  const { data: benchmarks = [] } = useSalaryBenchmarks();
  const isOpen = job ? isJobRecruiting(job.status) : false;
  const { data: related = [] } = useRelatedJobs(
    isOpen ? (job?.category.id ?? "") : "",
    id
  );
  const { data: employerProfile } = usePublicEmployerProfile(
    job?.employerId ?? ""
  );
  const { data: notifyPreferences = [] } = useJobNotifyPreferences();
  const toggleJobNotify = useToggleJobNotify();

  /** Hộp thoại phóng to ảnh preview. */
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /** Đơn ứng tuyển của SV hiện tại cho tin này (null nếu chưa ứng tuyển). */
  const { data: myApplication } = useStudentApplicationByJob(
    user?.role === "STUDENT" ? job?.id : undefined
  );

  const hasApplied = !!myApplication;
  const canReapply = myApplication?.status === "WITHDRAWN";

  if (isLoading) return <JobDetailSkeleton />;

  if (isError || !job) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <ErrorState
          title="Không tìm thấy tin tuyển dụng"
          description="Tin tuyển dụng này có thể đã bị gỡ hoặc đường dẫn không đúng."
          onRetry={() => void refetch()}
        />
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to={PATHS.JOBS.ROOT} />}
          >
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const benchmark = findBenchmarkFor(
    benchmarks,
    job.category.id,
    job.location.provinceId
  );
  const comparison = compareSalary(job, benchmark);
  const remaining = job.positionsCount - job.positionsFilled;

  /** Đang bật thông báo cho nhóm việc + tỉnh của tin này (lấy từ server). */
  const notifyOn = notifyPreferences.some(
    (pref) =>
      pref.categoryCode === job.category.id &&
      (pref.provinceCode === job.location.provinceId ||
        pref.provinceCode === "ALL")
  );

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để ứng tuyển việc làm này.",
      });
      navigate(PATHS.AUTH.LOGIN, {
        state: { from: PATHS.JOBS.APPLY(job.id) },
      });
      return;
    }
    if (user?.role !== "STUDENT") {
      toast.info("Chỉ sinh viên mới ứng tuyển được", {
        description:
          "Bạn đang đăng nhập với tài khoản nhà tuyển dụng hoặc quản trị viên.",
      });
      return;
    }
    navigate(PATHS.JOBS.APPLY(job.id));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép liên kết", {
          description: "Chia sẻ tin tuyển dụng này với bạn bè.",
        });
      }
    } catch {
      toast.error("Không chia sẻ được");
    }
  };

  /** Sao chép địa chỉ làm việc (Chốt Ca: nút "Sao chép") */
  const handleCopyAddress = async () => {
    const full = [
      job.location.branchName,
      job.location.address,
      locationName(job.location),
      job.location.province,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      await navigator.clipboard.writeText(full);
      toast.success("Đã sao chép địa chỉ", {
        description: full,
      });
    } catch {
      toast.error("Không sao chép được địa chỉ");
    }
  };

  /**
   * Bật/tắt theo dõi nhóm việc + tỉnh (Viecoday).
   *
   * Trạng thái lấy từ server (`useJobNotifyPreferences`) — không dùng
   * `useState` cục bộ để trạng thái không bị mất khi tải lại trang.
   */
  const handleToggleNotify = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để bật thông báo.",
      });
      navigate(PATHS.AUTH.LOGIN, {
        state: { from: PATHS.JOBS.DETAIL(job.id) },
      });
      return;
    }

    try {
      await toggleJobNotify.mutateAsync({
        categoryCode: job.category.id,
        provinceCode: job.location.provinceId,
        enabled: !notifyOn,
      });

      if (!notifyOn) {
        toast.success("Đã bật thông báo tin tuyển dụng", {
          description: `Bạn sẽ được thông báo khi có tin mới thuộc ${job.category.name} tại ${job.location.province}.`,
        });
      } else {
        toast.info("Đã tắt thông báo tin tuyển dụng");
      }
    } catch (error) {
      showApiError(error);
    }
  };

  const isNonOpen = !isJobRecruiting(job.status);
  const backTarget =
    isNonOpen && user?.role === "EMPLOYER"
      ? { to: PATHS.EMPLOYER.JOBS, label: "Quay lại danh sách tin" }
      : isNonOpen && user?.role === "ADMIN"
        ? { to: PATHS.ADMIN.JOBS, label: "Quay lại duyệt tin" }
        : { to: PATHS.JOBS.ROOT, label: "Tất cả việc làm" };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Nút quay lại */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 cursor-pointer"
        nativeButton={false}
        render={<Link to={backTarget.to} />}
      >
        <ArrowLeft className="size-4" />
        {backTarget.label}
      </Button>

      {isNonOpen && (
        <div className="mb-6">
          <JobStatusPreviewBanner job={job} role={user?.role} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* CỘT CHÍNH */}
        <div className="min-w-0 space-y-6">
          {/* TIÊU ĐỀ */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {job.isUrgent && <Badge>Tuyển gấp</Badge>}
                <Badge variant="secondary">{job.category.name}</Badge>
                {job.position && (
                  <Badge variant="outline">{job.position.name}</Badge>
                )}
              </div>

              <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
                {job.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {locationName(job.location)}, {job.location.province}
                  {job.location.branchName && ` · ${job.location.branchName}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  Đăng {formatPostedAgo(job.postedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-4" />
                  {job.viewCount.toLocaleString("vi-VN")} lượt xem
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {job.applicantCount} ứng viên
                </span>
              </div>

              {/* Lương nổi bật */}
              <div className="mt-5 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-heading text-2xl font-bold text-primary">
                    {formatSalary(job)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SALARY_TYPE_LABELS[job.salaryType]}
                  </span>
                </div>

                {SHOW_SALARY_RANKING && comparison && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {comparison.verdict === "BELOW" ? (
                      <TrendingDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <TrendingUp className="size-3.5 text-primary" />
                    )}
                    <span className="font-semibold text-foreground">
                      Top {comparison.percentile}%
                    </span>
                    <span className="text-muted-foreground">
                      {comparison.verdict === "ABOVE"
                        ? "· Cao hơn trung bình"
                        : comparison.verdict === "BELOW"
                          ? "· Thấp hơn trung bình"
                          : "· Trung bình ngành"}
                    </span>
                    <span className="text-muted-foreground">
                      · Dữ liệu {comparison.benchmark.sampleSize} tin ·{" "}
                      {new Date(
                        comparison.benchmark.updatedAt
                      ).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NỘI DUNG */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <Tabs defaultValue="description">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="description">Mô tả</TabsTrigger>
                  <TabsTrigger value="requirements">Yêu cầu</TabsTrigger>
                  <TabsTrigger value="benefits">Quyền lợi</TabsTrigger>
                  <TabsTrigger value="schedule">Ca làm việc</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Mô tả công việc
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {job.description || "Chưa có mô tả chi tiết."}
                  </p>

                  {job.skills.length > 0 && (
                    <>
                      <Separator className="my-5" />
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Kỹ năng yêu cầu
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.skills.map((skill) => (
                          <Badge key={skill.id} variant="outline">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="requirements" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Yêu cầu ứng viên
                  </h2>
                  {job.requirements.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {job.requirements.map((requirement, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Không có yêu cầu cụ thể.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="benefits" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Quyền lợi
                  </h2>
                  {job.benefits.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {job.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chưa có thông tin quyền lợi.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="pt-5">
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Lịch làm việc
                  </h2>
                  {job.schedules.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {job.schedules.map((schedule, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Clock className="size-4 text-muted-foreground" />
                            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {schedule.startTime} — {schedule.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nhà tuyển dụng chưa cập nhật lịch làm việc.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ĐỊA ĐIỂM LÀM VIỆC */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Địa điểm làm việc
              </h2>
              <div className="mt-3 flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  {job.location.branchName && (
                    <p className="text-sm font-semibold text-foreground">
                      {job.location.branchName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {job.location.address || locationFull(job.location)}
                  </p>
                  {!job.location.branchName && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {locationName(job.location)}, {job.location.province}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  nativeButton={false}
                  render={
                    <a
                      href={buildMapUrl(
                        job.location.address,
                        locationName(job.location),
                        job.location.province
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <MapPin className="size-4" />
                  Mở bản đồ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => void handleCopyAddress()}
                >
                  <Copy className="size-4" />
                  Sao chép địa chỉ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TIN LIÊN QUAN */}
          {!isNonOpen && related.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
                Việc làm cùng nhóm ngành
              </h2>
              <div className="space-y-4">
                {related.slice(0, 4).map((item) => (
                  <JobCard key={item.id} job={item} showApply={false} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CỘT PHẢI */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* HÀNH ĐỘNG */}
          {(!isNonOpen ||
            Boolean(job.previewImageUrl) ||
            Boolean(job.deadline)) && (
            <Card>
              <CardContent className="space-y-3 p-5">
                {job.previewImageUrl && (
                  <button
                    type="button"
                    className="group relative block w-full overflow-hidden rounded-lg border border-border"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Xem ảnh preview"
                  >
                    <img
                      src={job.previewImageUrl}
                      alt={job.title}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                    <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm">
                      <ZoomIn className="size-3.5" />
                      Phóng to
                    </span>
                  </button>
                )}
                {!isNonOpen && (
                  <>
                    {canReapply ? (
                      <>
                        <Button
                          size="lg"
                          className="h-11 w-full cursor-pointer font-semibold"
                          onClick={handleApply}
                        >
                          Ứng tuyển lại
                        </Button>
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          Bạn đã rút đơn ứng tuyển — có thể gửi lại hồ sơ cho
                          tin này.
                        </p>
                      </>
                    ) : hasApplied ? (
                      <>
                        <Button
                          size="lg"
                          className="h-11 w-full cursor-pointer font-semibold"
                          nativeButton={false}
                          render={
                            <Link
                              to={PATHS.STUDENT.APPLICATION_DETAIL(
                                myApplication!.id
                              )}
                            />
                          }
                        >
                          Đã ứng tuyển — xem hồ sơ
                        </Button>
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          Hồ sơ của bạn đang ở trạng thái{" "}
                          {APPLICATION_STATUS_LABELS[myApplication!.status]}.
                        </p>
                      </>
                    ) : (
                      <>
                        <Button
                          size="lg"
                          className="h-11 w-full cursor-pointer font-semibold"
                          onClick={handleApply}
                        >
                          Ứng tuyển ngay
                        </Button>
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          Không cần CV, chỉ cần hồ sơ UniJob — ứng tuyển trong 1
                          chạm.
                        </p>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={handleShare}
                      >
                        <Share2 className="size-4" />
                        Chia sẻ
                      </Button>
                      <SaveJobButton jobId={job.id} variant="button" />
                    </div>
                  </>
                )}

                {job.deadline && (
                  <Alert>
                    <Clock className="size-4" />
                    <AlertTitle>Hạn ứng tuyển</AlertTitle>
                    <AlertDescription>
                      {new Date(job.deadline).toLocaleDateString("vi-VN")}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* TÓM TẮT */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                icon={Coins}
                label="Mức lương"
                value={formatSalary(job)}
              />
              <InfoRow
                icon={Building2}
                label="Loại hình"
                value={EMPLOYMENT_TYPE_LABELS[job.employmentType]}
              />
              <InfoRow
                icon={MapPin}
                label="Hình thức"
                value={WORK_MODE_LABELS[job.workMode]}
              />
              <InfoRow
                icon={Users}
                label="Số lượng tuyển"
                value={`${job.positionsCount} vị trí (còn ${remaining})`}
              />
              <InfoRow
                icon={Building2}
                label="Nhóm ngành"
                value={job.category.name}
              />
            </CardContent>
          </Card>

          {/* NHÀ TUYỂN DỤNG */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Thông tin nhà tuyển dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <EmployerAvatar
                  name={job.employer.name}
                  variant={job.employer.logoVariant}
                  logoUrl={job.employer.logoUrl}
                  verified={job.employer.verified}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    {job.employer.name}
                    {job.employer.verified && (
                      <CheckCircle2
                        className="size-3.5 shrink-0 text-primary"
                        aria-label="Đã xác minh"
                      />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Đang tuyển {remaining} vị trí
                  </p>
                </div>
              </div>

              {/* Đánh giá + số tin đang tuyển — Viecoday: "13 tin · 30 ngày" */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {employerProfile && employerProfile.profile.avgRating > 0 && (
                  <Link
                    to={PATHS.EMPLOYER.PUBLIC_PROFILE(job.employerId)}
                    className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    <RatingStars
                      value={employerProfile.profile.avgRating}
                      size="xs"
                    />
                    <span className="font-medium text-foreground">
                      {employerProfile.profile.avgRating.toFixed(1)}
                    </span>
                    <span>
                      ({employerProfile.profile.ratingCount} đánh giá)
                    </span>
                  </Link>
                )}
                {employerProfile && employerProfile.jobs.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="size-3.5" />
                    {employerProfile.jobs.length} tin đang tuyển
                  </span>
                )}
                {employerProfile && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    Tham gia{" "}
                    {new Date(
                      employerProfile.profile.createdAt
                    ).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                nativeButton={false}
                render={
                  <Link to={PATHS.EMPLOYER.PUBLIC_PROFILE(job.employerId)} />
                }
              >
                Xem hồ sơ công ty
              </Button>

              {employerProfile && employerProfile.jobs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full cursor-pointer"
                  nativeButton={false}
                  render={
                    <Link
                      to={`${PATHS.JOBS.ROOT}?keyword=${encodeURIComponent(job.employer.name)}`}
                    />
                  }
                >
                  Xem tất cả việc làm
                </Button>
              )}
            </CardContent>
          </Card>

          {/* THÔNG BÁO TIN MỚI — Viecoday */}
          {!isNonOpen && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  {notifyOn ? (
                    <BellRing className="size-5 shrink-0 text-primary" />
                  ) : (
                    <Bell className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Bạn có muốn được thông báo khi có tin mới?
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Nhóm {job.category.name} · {job.location.province}
                    </p>
                  </div>
                </div>
                <Button
                  variant={notifyOn ? "outline" : "default"}
                  size="sm"
                  className="w-full cursor-pointer"
                  disabled={toggleJobNotify.isPending}
                  onClick={() => void handleToggleNotify()}
                >
                  {toggleJobNotify.isPending
                    ? "Đang cập nhật..."
                    : notifyOn
                      ? "Đã bật thông báo"
                      : "Bật thông báo"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* SAVED */}
          {!isNonOpen && (
            <Card className="hidden lg:block">
              <CardContent className="flex items-center gap-3 p-4">
                <BookmarkCheck className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Đã lưu tin này? Kiểm tra mục{" "}
                  <Link
                    to={PATHS.SAVED}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Việc làm đã lưu
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {job.previewImageUrl && (
        <JobImageLightbox
          src={job.previewImageUrl}
          alt={job.title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </div>
  );
}

function JobStatusPreviewBanner({ job, role }: { job: Job; role?: RoleType }) {
  const isRejected = job.status === "REJECTED";
  const isPending = job.status === "PENDING_REVIEW";
  const isDraft = job.status === "DRAFT";

  const title = isRejected
    ? "Tin tuyển dụng bị từ chối"
    : isPending
      ? "Tin tuyển dụng đang chờ duyệt"
      : isDraft
        ? "Tin tuyển dụng đang ở bản nháp"
        : `Tin tuyển dụng đang ở trạng thái: ${JOB_STATUS_LABELS[job.status]}`;

  const description = isRejected
    ? job.rejectReason
      ? `Lý do từ chối: ${job.rejectReason}. Tin này không hiển thị công khai — bạn có thể chỉnh sửa và gửi duyệt lại.`
      : "Tin này không đáp ứng yêu cầu duyệt và không hiển thị công khai. Bạn có thể chỉnh sửa để gửi duyệt lại."
    : isPending
      ? "Chế độ xem trước dành cho chủ tin. Tin chưa hiển thị công khai và chưa nhận hồ sơ ứng tuyển cho đến khi quản trị viên phê duyệt."
      : "Chế độ xem trước — tin này hiện không hiển thị trên danh sách tuyển dụng công khai và không nhận thêm hồ sơ ứng tuyển.";

  const Icon = isRejected ? AlertTriangle : isPending ? Clock : Info;

  return (
    <Alert
      variant={isRejected ? "destructive" : "default"}
      className={
        isPending
          ? "border-amber-500/40 bg-amber-500/5 text-foreground"
          : undefined
      }
    >
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {role === "EMPLOYER" && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isRejected ? "default" : "outline"}
              className="cursor-pointer"
              nativeButton={false}
              render={<Link to={PATHS.EMPLOYER.JOB_EDIT(job.id)} />}
            >
              <Pencil className="size-3.5" />
              {isRejected ? "Chỉnh sửa & gửi duyệt lại" : "Chỉnh sửa tin"}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default JobDetailPage;
