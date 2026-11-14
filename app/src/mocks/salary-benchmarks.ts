import type { SalaryBenchmark } from "@/features/shared/types";

/**
 * Xếp hạng lương theo ngành × tỉnh.
 * Lấy cảm hứng từ mục "Xếp hạng lương" của Viecoday
 * ("Top 34% · Cao hơn trung bình · dữ liệu 3 tháng gần nhất").
 *
 * Giá trị là mức lương trung bình quy đổi về đồng/giờ.
 */
export const SALARY_BENCHMARKS: SalaryBenchmark[] = [
  // TP. Hồ Chí Minh
  {
    categoryId: "cat-fnb",
    provinceId: "hcm",
    avgHourly: 29000,
    minHourly: 22000,
    maxHourly: 62000,
    sampleSize: 412,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-bep",
    provinceId: "hcm",
    avgHourly: 31000,
    minHourly: 24000,
    maxHourly: 58000,
    sampleSize: 187,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-ban-tang",
    provinceId: "hcm",
    avgHourly: 27000,
    minHourly: 20000,
    maxHourly: 45000,
    sampleSize: 268,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-giao-hang",
    provinceId: "hcm",
    avgHourly: 26000,
    minHourly: 21000,
    maxHourly: 40000,
    sampleSize: 203,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-marketing",
    provinceId: "hcm",
    avgHourly: 38000,
    minHourly: 25000,
    maxHourly: 80000,
    sampleSize: 96,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-van-phong",
    provinceId: "hcm",
    avgHourly: 32000,
    minHourly: 24000,
    maxHourly: 60000,
    sampleSize: 88,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-day-hoc",
    provinceId: "hcm",
    avgHourly: 55000,
    minHourly: 35000,
    maxHourly: 120000,
    sampleSize: 64,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-cong-nghe",
    provinceId: "hcm",
    avgHourly: 65000,
    minHourly: 40000,
    maxHourly: 150000,
    sampleSize: 71,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },

  // Hà Nội
  {
    categoryId: "cat-fnb",
    provinceId: "hn",
    avgHourly: 28000,
    minHourly: 21000,
    maxHourly: 55000,
    sampleSize: 356,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-bep",
    provinceId: "hn",
    avgHourly: 30000,
    minHourly: 23000,
    maxHourly: 52000,
    sampleSize: 152,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-ban-tang",
    provinceId: "hn",
    avgHourly: 26000,
    minHourly: 20000,
    maxHourly: 43000,
    sampleSize: 221,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-giao-hang",
    provinceId: "hn",
    avgHourly: 25000,
    minHourly: 20000,
    maxHourly: 38000,
    sampleSize: 178,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-marketing",
    provinceId: "hn",
    avgHourly: 36000,
    minHourly: 24000,
    maxHourly: 75000,
    sampleSize: 104,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-van-phong",
    provinceId: "hn",
    avgHourly: 30000,
    minHourly: 23000,
    maxHourly: 55000,
    sampleSize: 92,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-day-hoc",
    provinceId: "hn",
    avgHourly: 52000,
    minHourly: 33000,
    maxHourly: 110000,
    sampleSize: 71,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-cong-nghe",
    provinceId: "hn",
    avgHourly: 62000,
    minHourly: 38000,
    maxHourly: 140000,
    sampleSize: 83,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },

  // Các tỉnh còn lại — dùng chung số liệu HCM làm mốc
  {
    categoryId: "cat-fnb",
    provinceId: "dn",
    avgHourly: 27000,
    minHourly: 20000,
    maxHourly: 48000,
    sampleSize: 74,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-ban-tang",
    provinceId: "dn",
    avgHourly: 25000,
    minHourly: 19000,
    maxHourly: 40000,
    sampleSize: 51,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-fnb",
    provinceId: "ct",
    avgHourly: 24000,
    minHourly: 18000,
    maxHourly: 40000,
    sampleSize: 42,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-cong-nghe",
    provinceId: "bd",
    avgHourly: 48000,
    minHourly: 30000,
    maxHourly: 100000,
    sampleSize: 66,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    categoryId: "cat-day-hoc",
    provinceId: "dak",
    avgHourly: 38000,
    minHourly: 25000,
    maxHourly: 70000,
    sampleSize: 23,
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
];

/** Lấy benchmark theo ngành + tỉnh, fallback về benchmark cùng ngành ở HCM. */
export const findBenchmark = (
  categoryId: string,
  provinceId: string
): SalaryBenchmark | undefined =>
  SALARY_BENCHMARKS.find(
    (b) => b.categoryId === categoryId && b.provinceId === provinceId
  ) ??
  SALARY_BENCHMARKS.find(
    (b) => b.categoryId === categoryId && b.provinceId === "hcm"
  );
