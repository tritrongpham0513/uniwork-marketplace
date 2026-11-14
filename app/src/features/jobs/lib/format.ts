import type { Job, SalaryType } from "@/features/jobs/types";

/** 62_000 -> "62k" */
const compact = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`
    : value >= 1000
      ? `${Math.round(value / 1000)}k`
      : `${value}`;

/**
 * Định dạng khoảng lương theo kiểu trả.
 * - HOURLY: "25 – 26k/giờ"
 * - DAILY: "180k – 220k/ngày"
 * - MONTHLY: "1.5 – 4.5tr/tháng"
 * - NEGOTIABLE: "Thỏa thuận"
 */
export const formatSalary = (job: Pick<Job, "salaryType" | "salaryMin" | "salaryMax">) => {
  if (job.salaryType === "NEGOTIABLE") return "Thỏa thuận";

  const unit: Record<Exclude<SalaryType, "NEGOTIABLE">, string> = {
    HOURLY: "/giờ",
    DAILY: "/ngày",
    WEEKLY: "/tuần",
    MONTHLY: "/tháng",
    PER_TASK: "/tác vụ",
  };

  const { salaryMin, salaryMax } = job;

  if (salaryMax == null || salaryMax === salaryMin) {
    return `${compact(salaryMin)}${unit[job.salaryType]}`;
  }

  return `${compact(salaryMin)} – ${compact(salaryMax)}${unit[job.salaryType]}`;
};

/** "3 giờ trước", "2 ngày trước" */
export const formatPostedAgo = (postedAt: string) => {
  const diffMs = Date.now() - new Date(postedAt).getTime();
  const hours = Math.floor(diffMs / 3600_000);

  if (hours < 1) return "Vừa đăng";
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
};

/** "còn 5 ngày" / "hết hạn" */
export const formatDeadline = (deadline: string | null) => {
  if (!deadline) return null;

  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return "Đã hết hạn";

  const days = Math.floor(diffMs / 86400_000);
  if (days === 0) {
    const hours = Math.floor(diffMs / 3600_000);
    return hours > 0 ? `Còn ${hours} giờ` : "Sắp hết hạn";
  }
  return `Còn ${days} ngày`;
};
