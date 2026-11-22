import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SaveJobButton } from "@/components/shared/save-job-button";
import { EmployerAvatar } from "@/components/shared/employer-avatar";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Job, SalaryComparison } from "@/features/jobs/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/features/jobs/types";
import { formatDeadline, formatPostedAgo, formatSalary, locationName } from "@/features/jobs/lib/format";
import { CategoryIcon } from "@/features/jobs/lib/category-icon";
import { PATHS } from "@/config/paths";
import { cn } from "cn";

interface JobCardProps {
  job: Job;
  /** So sánh lương với benchmark (Viecoday: "Top 34% · Cao hơn trung bình") */
  comparison?: SalaryComparison | null;
  /** Ẩn nút ứng tuyển khi đang ở màn hình quản lý của NTD */
  showApply?: boolean;
  /** Ẩn nút lưu tin (ví dụ trong danh sách tin đã lưu) */
  showSave?: boolean;
}

/** Tin đăng trong vòng 24 giờ -> hiện badge "Mới" */
const isNewJob = (postedAt: string): boolean =>
  Date.now() - new Date(postedAt).getTime() < 24 * 60 * 60 * 1000;

export function JobCard({
  job,
  comparison,
  showApply = true,
  showSave = true,
}: JobCardProps) {
  const remaining = job.positionsCount - job.positionsFilled;

  return (
    <Card className="group transition-colors hover:bg-muted/30">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {job.isUrgent && <Badge>Tuyển gấp</Badge>}
          {isNewJob(job.postedAt) && (
            <Badge className="gap-1 bg-primary text-primary-foreground">
              <Sparkles className="size-3" />
              Mới
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <CategoryIcon name={job.category.icon} className="size-3" />
            {job.category.name}
          </Badge>
          <Badge variant="outline">
            {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
          </Badge>
          {job.position && (
            <Badge variant="outline" className="text-muted-foreground">
              {job.position.name}
            </Badge>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <EmployerAvatar
              name={job.employer.name}
              variant={job.employer.logoVariant}
              logoUrl={job.employer.logoUrl}
              verified={job.employer.verified}
              size="md"
            />

            <div className="min-w-0">
              <CardTitle className="font-heading text-base font-medium">
                <Link
                  to={PATHS.JOBS.DETAIL(job.id)}
                  className="transition-colors hover:text-primary"
                >
                  {job.title}
                </Link>
              </CardTitle>

              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link
                  to={PATHS.EMPLOYER.PUBLIC_PROFILE(job.employerId)}
                  className="underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {job.employer.name}
                </Link>
                {job.employer.verified && (
                  <CheckCircle2
                    className="size-3.5 text-primary"
                    aria-label="Đã xác minh"
                  />
                )}
              </p>
            </div>
          </div>

          {showSave && <SaveJobButton jobId={job.id} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 4 ô thông tin tóm tắt — layout giống Chốt Ca */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted p-3 sm:grid-cols-4">
          <SummaryItem label="Lương" value={formatSalary(job)} highlight />
          <SummaryItem
            label="Loại hình"
            value={EMPLOYMENT_TYPE_LABELS[job.employmentType]}
          />
          <SummaryItem label="Cần tuyển" value={`${remaining} người`} />
          <SummaryItem label="Địa điểm" value={`${locationName(job.location)}`} />
        </div>

        {/* Xếp hạng lương — Viecoday */}
        {comparison && comparison.verdict !== "AVERAGE" && (
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">
              Top {comparison.percentile}%
            </span>
            <span className="text-muted-foreground">
              {comparison.verdict === "ABOVE"
                ? "· Cao hơn trung bình"
                : "· Thấp hơn trung bình"}
            </span>
            <span className="ml-auto text-muted-foreground">
              {comparison.benchmark.sampleSize} tin cùng ngành
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {locationName(job.location)}, {job.location.province}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {job.applicantCount} ứng viên
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatPostedAgo(job.postedAt)}
          </span>
          {job.deadline && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              Hạn {formatDeadline(job.deadline)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2 border-t">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={PATHS.JOBS.DETAIL(job.id)} />}
        >
          Chi tiết
        </Button>
        {showApply && (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to={PATHS.JOBS.APPLY(job.id)} />}
          >
            Ứng tuyển
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-sm font-semibold",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default JobCard;
