import type {
  Job,
  SalaryBenchmark,
  SalaryComparison,
} from "@/features/shared/types";

/**
 * Số giờ quy ước cho từng kiểu trả lương (để quy đổi về đồng/giờ).
 *
 * <p>Trùng với bảng quy đổi của hệ thống — giữ ở đây vì feature `admin`
 * không được import chéo từ feature `jobs` (xem AGENTS.md > Ranh giới import).
 */
const HOURS_PER_UNIT = {
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
  PER_TASK: 3,
  NEGOTIABLE: 0,
} as const;

/** Quy đổi mức lương tối thiểu của tin về đồng/giờ. */
export const jobToHourly = (
  job: Pick<Job, "salaryType" | "salaryMin">
): number => {
  if (job.salaryType === "NEGOTIABLE") return 0;
  return job.salaryMin / HOURS_PER_UNIT[job.salaryType];
};

/**
 * Tìm benchmark phù hợp với nhóm việc × tỉnh của tin.
 *
 * <p>Không có benchmark đúng tỉnh thì lùi về Hà Nội (79) — cùng cách mà
 * trang danh sách tin công khai đang làm, để hai nơi hiển thị giống nhau.
 */
export const findBenchmarkFor = (
  benchmarks: SalaryBenchmark[],
  categoryId: string,
  provinceId: string
): SalaryBenchmark | undefined =>
  benchmarks.find(
    (b) => b.categoryId === categoryId && b.provinceId === provinceId
  ) ??
  benchmarks.find((b) => b.categoryId === categoryId && b.provinceId === "79");

/**
 * So sánh lương của tin với benchmark cùng ngành + tỉnh.
 *
 * <p>Trả về `null` khi không có benchmark, lương thỏa thuận, hoặc không quy
 * đổi được — vì khi đó không có căn cứ để kết luận lương bất thường.
 */
export const compareSalary = (
  job: Pick<Job, "salaryType" | "salaryMin" | "salaryMax">,
  benchmark: SalaryBenchmark | undefined
): SalaryComparison | null => {
  if (!benchmark || job.salaryType === "NEGOTIABLE") return null;

  const hourly = jobToHourly(job);
  if (hourly <= 0) return null;

  const { avgHourly, minHourly, maxHourly } = benchmark;

  // Xếp hạng: vị trí của mức lương trong dải [min, max].
  // `ratio` = phần trăm tin có lương THẤP HƠN mức này (tính từ dưới lên).
  // Nhưng "Top X%" trên UI được hiểu là "cao hơn (100 - X)% tin còn lại" —
  // tức tính từ TRÊN xuống. Nên ta đảo lại: percentile = 100 - ratio.
  const span = Math.max(1, maxHourly - minHourly);
  const ratio = Math.min(1, Math.max(0, (hourly - minHourly) / span));
  const percentile = Math.round((1 - ratio) * 100);

  const diff = hourly - avgHourly;

  // Ngưỡng chênh lệch 5% để tránh hiển thị "cao hơn" cho chênh lệch rất nhỏ
  const threshold = avgHourly * 0.05;
  const verdict: SalaryComparison["verdict"] =
    diff > threshold ? "ABOVE" : diff < -threshold ? "BELOW" : "AVERAGE";

  return {
    benchmark,
    percentile: Math.max(1, percentile),
    verdict,
    diff,
  };
};
