import type { Application } from "@/features/shared/types";

/**
 * Định dạng mức lương của tin tuyển dụng mà sinh viên đã ứng tuyển.
 *
 * <p>Đơn ứng tuyển không lưu bản sao lương của tin — chỉ giữ `jobId` và đọc
 * lại từ tin khi trả về response. Dùng chung quy tắc hiển thị với
 * `formatSalary` của tin để SV thấy đúng con số khi bấm vào tin.
 */
export const formatApplicationJobSalary = (
  application: Pick<
    Application,
    "jobSalaryType" | "jobSalaryMin" | "jobSalaryMax"
  >
): string => {
  const {
    jobSalaryType: type,
    jobSalaryMin: min,
    jobSalaryMax: max,
  } = application;

  if (type === "NEGOTIABLE") return "Thỏa thuận";
  if (min == null || min <= 0) return "—";

  const unit: Record<string, string> = {
    HOURLY: "/giờ",
    DAILY: "/ngày",
    WEEKLY: "/tuần",
    MONTHLY: "/tháng",
    PER_TASK: "/tác vụ",
  };
  const suffix = unit[type] ?? "";

  const format = (value: number) =>
    value.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

  if (max == null || max === min) return `${format(min)}${suffix}`;
  return `${format(min)} – ${format(max)}${suffix}`;
};
