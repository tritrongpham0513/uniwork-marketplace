import type {
  Job,
  SalaryBenchmark,
  SalaryComparison,
} from "@/features/shared/types";

/**
 * Số giờ quy ước cho từng đơn vị trả lương (để quy đổi về đồng/giờ).
 *
 * <p>Chỉ gồm các đơn vị **quy đổi được**. `PER_TASK` và `NEGOTIABLE` vắng mặt
 * có chủ đích — theo `CONTRACT.md` mục 5A.6, AI không được suy luận
 * `SALARY_ANOMALY` từ chúng, nên giao diện cũng không được hiển thị mức quy đổi
 * cho hai đơn vị đó (tránh hai bên nhìn thấy hai con số khác nhau).
 */
const HOURS_PER_UNIT = {
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
} as const;

/** Đơn vị trả lương nào quy đổi được sang đồng/giờ. */
export const isSalaryConvertible = (
  salaryType: Job["salaryType"]
): salaryType is keyof typeof HOURS_PER_UNIT => salaryType in HOURS_PER_UNIT;

/**
 * Quy đổi mức lương tối thiểu của tin về đồng/giờ.
 *
 * <p>Trả về `null` khi đơn vị không quy đổi được (`PER_TASK`, `NEGOTIABLE`) —
 * không phải `0`, vì `0` là "không có mức lương" (lương thỏa thuận) chứ không
 * phải "không quy đổi được".
 */
export const jobToHourly = (
  job: Pick<Job, "salaryType" | "salaryMin">
): number | null => {
  if (!isSalaryConvertible(job.salaryType)) return null;
  return job.salaryMin / HOURS_PER_UNIT[job.salaryType];
};

/**
 * Tìm dòng xếp hạng phù hợp với nhóm việc × tỉnh của tin.
 *
 * <p>Không có dòng đúng tỉnh thì lùi về tỉnh mặc định (`79` — Thành phố Hồ
 * Chí Minh) — cùng cách backend dựng ngữ cảnh AI, để giao diện và AI nhìn
 * thấy cùng một con số.
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
 * So sánh lương của tin tuyển dụng với bảng xếp hạng lương cùng ngành + tỉnh.
 *
 * <p>Trả về `null` khi không có bảng xếp hạng, lương thỏa thuận, hoặc đơn vị
 * trả lương không quy đổi được — vì khi đó không có căn cứ để kết luận lương
 * bất thường.
 */
export const compareSalary = (
  job: Pick<Job, "salaryType" | "salaryMin" | "salaryMax">,
  benchmark: SalaryBenchmark | undefined
): SalaryComparison | null => {
  if (!benchmark) return null;

  const hourly = jobToHourly(job);
  if (hourly === null || hourly <= 0) return null;

  const { avgHourly, minHourly, maxHourly } = benchmark;

  // Xếp hạng: vị trí của mức lương trong dải [min, max].
  //
  // `ratio` = phần trăm tin có lương THẤP HƠN mức này (tính từ dưới lên).
  // Nhưng "Top X%" trên UI được hiểu là "cao hơn (100 - X)% tin còn lại" —
  // tức tính từ TRÊN xuống. Nên ta đảo lại: percentile = 100 - ratio.
  //
  // Ví dụ lương = min → ratio 0 → percentile 100 → "Top 100%" (thấp nhất).
  //       lương = max → ratio 1 → percentile 1   → "Top 1%"   (cao nhất).
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
