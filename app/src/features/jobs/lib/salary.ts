import type {
  Job,
  SalaryBenchmark,
  SalaryComparison,
} from "@/features/shared/types";

/** Số giờ quy ước cho từng kiểu trả lương (để quy đổi về đồng/giờ) */
const HOURS_PER_UNIT = {
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
  PER_TASK: 3,
  NEGOTIABLE: 0,
} as const;

/** Quy đổi mức lương tối thiểu của tin về đồng/giờ */
export const jobToHourly = (job: Pick<Job, "salaryType" | "salaryMin">): number => {
  if (job.salaryType === "NEGOTIABLE") return 0;
  return job.salaryMin / HOURS_PER_UNIT[job.salaryType];
};

/**
 * So sánh lương của tin tuyển dụng với benchmark cùng ngành + tỉnh.
 *
 * Trả về `null` khi không có dữ liệu benchmark.
 */
export const compareSalary = (
  job: Job,
  benchmark: SalaryBenchmark | undefined
): SalaryComparison | null => {
  if (!benchmark || job.salaryType === "NEGOTIABLE") return null;

  const hourly = jobToHourly(job);
  if (hourly <= 0) return null;

  const { avgHourly, minHourly, maxHourly } = benchmark;

  // Xếp hạng: vị trí của mức lương trong dải [min, max]
  const span = Math.max(1, maxHourly - minHourly);
  const ratio = Math.min(1, Math.max(0, (hourly - minHourly) / span));
  const percentile = Math.round(ratio * 100);

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

/** Tìm benchmark phù hợp từ danh sách */
export const findBenchmarkFor = (
  benchmarks: SalaryBenchmark[],
  categoryId: string,
  provinceId: string
): SalaryBenchmark | undefined =>
  benchmarks.find(
    (b) => b.categoryId === categoryId && b.provinceId === provinceId
  ) ??
  benchmarks.find(
    (b) => b.categoryId === categoryId && b.provinceId === "79"
  );
