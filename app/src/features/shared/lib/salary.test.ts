import { describe, expect, it } from "vitest";
import type { Job, SalaryBenchmark } from "@/features/shared/types";
import {
  compareSalary,
  findBenchmarkFor,
  isSalaryConvertible,
  jobToHourly,
} from "./salary";

const mockJob = (
  salaryType: Job["salaryType"],
  salaryMin: number,
  salaryMax: number | null = null
): Pick<Job, "salaryType" | "salaryMin" | "salaryMax"> => ({
  salaryType,
  salaryMin,
  salaryMax,
});

const mockBenchmark = (
  avgHourly: number,
  minHourly: number,
  maxHourly: number
): SalaryBenchmark => ({
  categoryId: "cat1",
  provinceId: "01",
  avgHourly,
  minHourly,
  maxHourly,
  sampleSize: 100,
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("isSalaryConvertible", () => {
  it("chỉ các đơn vị quy đổi được mới quy đổi được", () => {
    expect(isSalaryConvertible("HOURLY")).toBe(true);
    expect(isSalaryConvertible("DAILY")).toBe(true);
    expect(isSalaryConvertible("WEEKLY")).toBe(true);
    expect(isSalaryConvertible("MONTHLY")).toBe(true);
  });

  it("PER_TASK và NEGOTIABLE không quy đổi được (CONTRACT 5A.6)", () => {
    expect(isSalaryConvertible("PER_TASK")).toBe(false);
    expect(isSalaryConvertible("NEGOTIABLE")).toBe(false);
  });
});

describe("jobToHourly", () => {
  it("quy đổi theo bảng giờ quy ước", () => {
    expect(jobToHourly(mockJob("HOURLY", 100))).toBe(100);
    expect(jobToHourly(mockJob("DAILY", 160))).toBe(20); // 160 / 8
    expect(jobToHourly(mockJob("WEEKLY", 400))).toBe(10); // 400 / 40
    expect(jobToHourly(mockJob("MONTHLY", 3200))).toBe(20); // 3200 / 160
  });

  it("trả null cho PER_TASK — không được suy luận lương bất thường", () => {
    expect(jobToHourly(mockJob("PER_TASK", 300))).toBeNull();
  });

  it("trả null cho NEGOTIABLE", () => {
    expect(jobToHourly(mockJob("NEGOTIABLE", 0))).toBeNull();
  });
});

describe("compareSalary", () => {
  it("trả null khi không có benchmark", () => {
    expect(compareSalary(mockJob("HOURLY", 100), undefined)).toBeNull();
  });

  it("trả null khi đơn vị không quy đổi được", () => {
    expect(
      compareSalary(mockJob("PER_TASK", 300), mockBenchmark(100, 50, 150))
    ).toBeNull();
    expect(
      compareSalary(mockJob("NEGOTIABLE", 0), mockBenchmark(100, 50, 150))
    ).toBeNull();
  });

  it("cao hơn trung bình -> ABOVE", () => {
    const result = compareSalary(
      mockJob("HOURLY", 110),
      mockBenchmark(100, 50, 150)
    );
    expect(result?.verdict).toBe("ABOVE");
    expect(result?.diff).toBe(10);
  });

  it("thấp hơn trung bình -> BELOW", () => {
    const result = compareSalary(
      mockJob("HOURLY", 90),
      mockBenchmark(100, 50, 150)
    );
    expect(result?.verdict).toBe("BELOW");
  });

  it("bằng trung bình -> AVERAGE", () => {
    const result = compareSalary(
      mockJob("HOURLY", 100),
      mockBenchmark(100, 50, 150)
    );
    expect(result?.verdict).toBe("AVERAGE");
  });

  it("chênh lệch nhỏ hơn ngưỡng 5% -> AVERAGE", () => {
    const result = compareSalary(
      mockJob("HOURLY", 151),
      mockBenchmark(150, 100, 200)
    );
    expect(result?.verdict).toBe("AVERAGE");
  });

  it("lương bằng min -> percentile 100", () => {
    const result = compareSalary(
      mockJob("HOURLY", 50),
      mockBenchmark(100, 50, 150)
    );
    expect(result?.percentile).toBe(100);
  });

  it("lương bằng max -> percentile 1", () => {
    const result = compareSalary(
      mockJob("HOURLY", 150),
      mockBenchmark(100, 50, 150)
    );
    expect(result?.percentile).toBe(1);
  });
});

describe("findBenchmarkFor", () => {
  const benchmarks: SalaryBenchmark[] = [
    { ...mockBenchmark(110, 50, 150), provinceId: "01" },
    { ...mockBenchmark(130, 60, 160), provinceId: "79" },
  ];

  it("tìm đúng nhóm việc + tỉnh", () => {
    const result = findBenchmarkFor(benchmarks, "cat1", "01");
    expect(result?.avgHourly).toBe(110);
  });

  it("lùi về tỉnh mặc định khi tỉnh của tin chưa có dòng", () => {
    const result = findBenchmarkFor(benchmarks, "cat1", "99");
    expect(result?.provinceId).toBe("79");
  });

  it("trả undefined khi cả nhóm việc không có dòng nào", () => {
    expect(findBenchmarkFor(benchmarks, "cat_unknown", "79")).toBeUndefined();
  });
});
