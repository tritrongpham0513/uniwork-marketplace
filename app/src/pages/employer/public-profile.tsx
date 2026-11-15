import { Link, useParams } from "react-router";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { EmployerAvatar } from "@/components/shared/employer-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { JobCard } from "@/features/jobs/components/job-card";
import { usePublicEmployerProfile } from "@/features/profile/hooks";
import { EMPLOYER_TYPE_LABELS } from "@/features/shared/types";
import { PATHS } from "@/config/paths";

export function PublicEmployerPage() {
  const { id = "" } = useParams();
  const { data, isLoading, isError, refetch } = usePublicEmployerProfile(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="mb-4 h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* HỒ SƠ NHÀ TUYỂN DỤNG */}
      <Card className="border-border/60">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <EmployerAvatar
              name={profile.displayName}
              variant="primary"
              verified={profile.isVerified}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {profile.displayName}
                </h1>
                {profile.isVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <BadgeCheck className="size-3.5" />
                    Đã xác minh
                  </Badge>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {EMPLOYER_TYPE_LABELS[profile.employerType]}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="size-4" />
                  {jobs.length} tin tuyển dụng đang mở
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {jobs.reduce((sum, job) => sum + job.applicantCount, 0)}{" "}
                  lượt ứng tuyển
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  Tham gia {new Date(profile.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {profile.avgRating > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <RatingStars value={profile.avgRating} />
                  <span className="text-sm font-semibold text-foreground">
                    {profile.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({profile.ratingCount} đánh giá)
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 sm:grid-cols-2">
            {profile.contactName && (
              <InfoRow
                icon={Users}
                label="Người liên hệ"
                value={profile.contactName}
              />
            )}
            {profile.contactPhone && (
              <InfoRow
                icon={Phone}
                label="Số điện thoại"
                value={profile.contactPhone}
              />
            )}
            {profile.address && (
              <InfoRow
                icon={MapPin}
                label="Địa chỉ"
                value={profile.address}
              />
            )}
            {profile.website && (
              <InfoRow
                icon={Globe}
                label="Website"
                value={profile.website}
              />
            )}
          </div>

          {profile.description && (
            <>
              <Separator className="my-5" />
              <h2 className="font-heading text-base font-semibold text-foreground">
                Giới thiệu
              </h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {profile.description}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* TIN TUYỂN DỤNG */}
      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Tin tuyển dụng đang mở
        </h2>
        {jobs.length === 0 ? (
          <EmptyState
            icon="search"
            title="Hiện chưa có tin tuyển dụng nào đang mở"
            description="Hãy quay lại danh sách để xem các cơ hội khác."
            action={
              <Button
                size="sm"
                nativeButton={false}
                render={<Link to={PATHS.JOBS.ROOT} />}
              >
                Xem tất cả việc làm
              </Button>
            }
          />
        ) : (
          <div className="mt-4 space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* ĐÁNH GIÁ */}
      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Đánh giá từ sinh viên
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            icon="message"
            title="Chưa có đánh giá nào"
            description="Nhà tuyển dụng này chưa nhận được đánh giá từ sinh viên."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="border-border/60">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {review.fromName}
                    </span>
                    <RatingStars value={review.rating} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                  {review.jobTitle && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="size-3.5" />
                      {review.jobTitle}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default PublicEmployerPage;
