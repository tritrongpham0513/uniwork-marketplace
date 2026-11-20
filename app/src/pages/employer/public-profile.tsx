import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/empty-state";
import { EmployerAvatar } from "@/components/shared/employer-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { usePublicEmployerProfile } from "@/features/profile/hooks";
import type { Job } from "@/features/jobs/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/features/jobs/types";
import { formatSalary } from "@/features/jobs/lib/format";
import { EMPLOYER_TYPE_LABELS } from "@/features/shared/types";
import { PATHS } from "@/config/paths";

export function PublicEmployerPage() {
  const { id = "" } = useParams();
  const { data, isLoading, isError, refetch } = usePublicEmployerProfile(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="h-44 w-full rounded-4xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-4xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <ErrorState
          title="Không tìm thấy nhà tuyển dụng"
          description="Hồ sơ này có thể đã bị gỡ hoặc đường dẫn không đúng."
          onRetry={() => void refetch()}
        />
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to={PATHS.JOBS.ROOT} />}
          >
            Quay lại danh sách việc làm
          </Button>
        </div>
      </div>
    );
  }

  const { profile, jobs, reviews } = data;
  const applicantTotal = jobs.reduce((sum, job) => sum + job.applicantCount, 0);
  const remainingTotal = jobs.reduce(
    (sum, job) => sum + Math.max(0, job.positionsCount - job.positionsFilled),
    0
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Lối quay lại — vào từ trang chi tiết việc làm thì cần đường về */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 cursor-pointer"
        nativeButton={false}
        render={<Link to={PATHS.JOBS.ROOT} />}
      >
        <ArrowLeft className="size-4" />
        Tất cả việc làm
      </Button>

      {/* HỒ SƠ NHÀ TUYỂN DỤNG */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <EmployerAvatar
              name={profile.displayName}
              variant="primary"
              verified={profile.isVerified}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {profile.displayName}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {EMPLOYER_TYPE_LABELS[profile.employerType]}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  Tham gia{" "}
                  {new Date(profile.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {profile.avgRating > 0 && (
                <div className="mt-2.5">
                  <RatingStars
                    value={profile.avgRating}
                    size="md"
                    showValue
                    count={profile.ratingCount}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dải số liệu — ba ô, mỗi ô một ý */}
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <Stat
              icon={Briefcase}
              label="Tin đang tuyển"
              value={`${jobs.length}`}
            />
            <Stat
              icon={Users}
              label="Lượt ứng tuyển"
              value={`${applicantTotal}`}
            />
            <Stat
              icon={BadgeCheck}
              label="Vị trí còn tuyển"
              value={`${remainingTotal}`}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* CỘT CHÍNH */}
        <div className="min-w-0 space-y-6">
          {/*
            Hai nhóm nội dung dài được gói trong tab để trang không phải cuộn
            qua một danh sách quá dài: "Đánh giá từ sinh viên" đứng trước vì
            đây là thông tin giúp sinh viên quyết định có ứng tuyển hay không.
          */}
          <Tabs defaultValue="reviews">
            <TabsList className="w-full justify-start overflow-x-auto rounded-2xl group-data-horizontal/tabs:h-auto">
              <TabsTrigger value="reviews" className="h-8 flex-none">
                Đánh giá từ sinh viên
                {reviews.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {reviews.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="h-8 flex-none">
                Tin tuyển dụng đang mở
                {jobs.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {jobs.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ĐÁNH GIÁ */}
            <TabsContent value="reviews" className="pt-4">
              {reviews.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Chưa có đánh giá nào từ sinh viên.
                </p>
              ) : (
                <Card>
                  <ul className="divide-y divide-border">
                    {reviews.map((review) => (
                      <li key={review.id} className="px-4 py-4 sm:px-5">
                        {/* Tên + vị trí + sao + ngày — gộp một hàng cho gọn */}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="min-w-0 text-sm font-semibold text-foreground">
                            {review.fromName}
                            {review.jobTitle && (
                              <span className="font-normal text-muted-foreground">
                                {" · "}
                                {review.jobTitle}
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-2">
                            <RatingStars value={review.rating} />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {new Date(review.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                          “{review.comment}”
                        </p>

                        {review.reply && (
                          <div className="mt-2.5 rounded-lg border-l-2 border-primary bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-foreground">
                              Phản hồi của nhà tuyển dụng
                            </p>
                            <p className="mt-1 text-sm text-pretty text-muted-foreground">
                              {review.reply}
                            </p>
                          </div>
                        )}

                        {review.reviewerReply && (
                          <div className="mt-2.5 rounded-lg border-l-2 border-border bg-muted/30 p-3">
                            <p className="text-xs font-semibold text-foreground">
                              Phản hồi của sinh viên
                            </p>
                            <p className="mt-1 text-sm text-pretty text-muted-foreground">
                              {review.reviewerReply}
                            </p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </TabsContent>

            {/* TIN TUYỂN DỤNG */}
            <TabsContent value="jobs" className="pt-4">
              {jobs.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Công ty này hiện chưa có tin tuyển dụng nào đang mở.{" "}
                  <Link
                    to={PATHS.JOBS.ROOT}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Xem tất cả việc làm
                  </Link>
                </p>
              ) : (
                <Card>
                  <ul className="divide-y divide-border">
                    {jobs.map((job) => (
                      <OpenJobRow key={job.id} job={job} />
                    ))}
                  </ul>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-6">
          {/* GIỚI THIỆU */}
          {profile.description && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Về công ty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-pretty text-muted-foreground">
                  {profile.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* THÔNG TIN LIÊN HỆ */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {profile.contactName && (
                  <InfoRow icon={Users} label="Người liên hệ">
                    {profile.contactName}
                  </InfoRow>
                )}
                {profile.contactPhone && (
                  <InfoRow icon={Phone} label="Số điện thoại">
                    <a
                      href={`tel:${profile.contactPhone.replace(/\s/g, "")}`}
                      className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                    >
                      {profile.contactPhone}
                    </a>
                  </InfoRow>
                )}
                {profile.address && (
                  <InfoRow icon={MapPin} label="Địa chỉ">
                    {profile.address}
                  </InfoRow>
                )}
                {profile.website && (
                  <InfoRow icon={Globe} label="Website">
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium break-all text-foreground underline underline-offset-4 hover:no-underline"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </InfoRow>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Ô số liệu: nhãn + giá trị, mỗi ô một ý */
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** Hàng nhãn + giá trị trong khối liên hệ */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-pretty break-words text-foreground">
          {children}
        </dd>
      </div>
    </div>
  );
}

/** Một tin tuyển dụng dạng dòng gọn — không lặp lại tên công ty (đã ở đầu trang) */
function OpenJobRow({ job }: { job: Job }) {
  return (
    <li className="px-4 py-3.5 sm:px-5">
      {/* Tên tin + nút ứng tuyển cùng hàng — nút luôn ở tầm mắt, không đẩy xuống cuối */}
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 min-w-0 text-sm font-semibold text-pretty text-foreground">
          <Link
            to={PATHS.JOBS.DETAIL(job.id)}
            className="underline-offset-4 hover:underline"
          >
            {job.title}
          </Link>
        </p>

        <Button
          size="sm"
          className="shrink-0 cursor-pointer"
          nativeButton={false}
          render={<Link to={PATHS.JOBS.APPLY(job.id)} />}
        >
          Ứng tuyển
        </Button>
      </div>

      {/*
        Dấu "·" nằm trong chính mảnh chữ trước nó (`whitespace-nowrap`) để không
        bao giờ rơi xuống đầu dòng khi khung hẹp. Mỗi dòng phụ tối đa hai mảnh
        để khung hẹp không dồn chữ thành nhiều dòng.
      */}
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="whitespace-nowrap font-semibold text-foreground">
          {formatSalary(job)} ·
        </span>{" "}
        <span className="whitespace-nowrap">
          {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          {job.location.district}, {job.location.province} ·
        </span>{" "}
        <span className="whitespace-nowrap">{job.applicantCount} ứng viên</span>
      </p>

      {job.isUrgent && (
        <p className="mt-1 text-xs font-medium text-destructive">Tuyển gấp</p>
      )}
    </li>
  );
}

export default PublicEmployerPage;
