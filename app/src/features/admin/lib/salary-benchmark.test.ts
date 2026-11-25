import { describe, it, expect } from "vitest";
import {
  compareSalary,
  findBenchmarkFor,
  jobToHourly,
} from "./salary-benchmark";
import type { Job, SalaryBenchmark } from "@/features/shared/types";

const makeBenchmark = (
  overrides: Partial<SalaryBenchmark> = {}
): SalaryBenchmark => ({
  categoryId: "cat1",
  provinceId: "79",
  avgHourly: 100,
  minHourly: 50,
  maxHourly: 150,
  sampleSize: 100,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("admin salary-benchmark utilities", () => {
  describe("jobToHourly", () => {
    it("should convert hourly salary 1:1", () => {
      expect(jobToHourly({ salaryType: "HOURLY", salaryMin: 100 })).toBe(100);
    });

    it("should convert daily salary using 8 hours", () => {
      expect(jobToHourly({ salaryType: "DAILY", salaryMin: 160 })).toBe(20);
    });

    it("should convert monthly salary using 160 hours", () => {
      expect(jobToHourly({ salaryType: "MONTHLY", salaryMin: 3200 })).toBe(20);
    });

    it("should return 0 for negotiable salary", () => {
      expect(jobToHourly({ salaryType: "NEGOTIABLE", salaryMin: 0 })).toBe(0);
    });
  });

  describe("findBenchmarkFor", () => {
    const benchmarks: SalaryBenchmark[] = [
      makeBenchmark({ categoryId: "cat1", provinceId: "79" }),
      makeBenchmark({
        categoryId: "cat1",
        provinceId: "01",
        avgHourly: 110,
      }),
    ];

    it("should find exact match by categoryId and provinceId", () => {
      expect(findBenchmarkFor(benchmarks, "cat1", "01")?.avgHourly).toBe(110);
    });

    it("should fallback to Hanoi when province not found", () => {
      expect(findBenchmarkFor(benchmarks, "cat1", "99")?.provinceId).toBe("79");
    });

    it("should return undefined when category not found", () => {
      expect(findBenchmarkFor(benchmarks, "cat_unknown", "79")).toBeUndefined();
    });
  });

  describe("compareSalary", () => {
    const job = (
      salaryMin: number
    ): Pick<Job, "salaryType" | "salaryMin" | "salaryMax"> => ({
      salaryType: "HOURLY",
      salaryMin,
      salaryMax: salaryMin,
    });

    it("should return null when no benchmark provided", () => {
      expect(compareSalary(job(100), undefined)).toBeNull();
    });

    it("should return null for negotiable salary", () => {
      expect(
        compareSalary(
          { salaryType: "NEGOTIABLE", salaryMin: 0, salaryMax: 0 },
          makeBenchmark()
        )
      ).toBeNull();
    });

    it("should mark salary as ABOVE average when higher by >5%", () => {
      const result = compareSalary(job(110), makeBenchmark());
      expect(result?.verdict).toBe("ABOVE");
      expect(result?.diff).toBe(10);
    });

    it("should mark salary as BELOW average when lower by >5%", () => {
      const result = compareSalary(job(90), makeBenchmark());
      expect(result?.verdict).toBe("BELOW");
    });

    it("should mark salary as AVERAGE when within ±5% of average", () => {
      const result = compareSalary(job(100), makeBenchmark());
      expect(result?.verdict).toBe("AVERAGE");
    });

    it("should calculate percentile at min and max", () => {
      expect(compareSalary(job(50), makeBenchmark())?.percentile).toBe(100);
      expect(compareSalary(job(150), makeBenchmark())?.percentile).toBe(1);
    });
  });
});
