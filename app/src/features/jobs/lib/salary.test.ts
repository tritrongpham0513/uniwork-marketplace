import { describe, it, expect } from "vitest";
import { jobToHourly, compareSalary, findBenchmarkFor } from "./salary";
import type { Job, SalaryBenchmark } from "@/features/shared/types";

describe("salary utilities", () => {
  describe("jobToHourly", () => {
    it("should convert hourly salary 1:1", () => {
      const job = { salaryType: "HOURLY" as const, salaryMin: 100 };
      expect(jobToHourly(job)).toBe(100);
    });

    it("should convert daily salary (8 hours)", () => {
      const job = { salaryType: "DAILY" as const, salaryMin: 160 };
      expect(jobToHourly(job)).toBe(20); // 160 / 8
    });

    it("should convert weekly salary (40 hours)", () => {
      const job = { salaryType: "WEEKLY" as const, salaryMin: 400 };
      expect(jobToHourly(job)).toBe(10); // 400 / 40
    });

    it("should convert monthly salary (160 hours)", () => {
      const job = { salaryType: "MONTHLY" as const, salaryMin: 3200 };
      expect(jobToHourly(job)).toBe(20); // 3200 / 160
    });

    it("should convert per-task salary (3 hours per task)", () => {
      const job = { salaryType: "PER_TASK" as const, salaryMin: 300 };
      expect(jobToHourly(job)).toBe(100); // 300 / 3
    });

    it("should return 0 for negotiable salary", () => {
      const job = { salaryType: "NEGOTIABLE" as const, salaryMin: 0 };
      expect(jobToHourly(job)).toBe(0);
    });
  });

  describe("compareSalary", () => {
    const mockBenchmark: SalaryBenchmark = {
      categoryId: "cat1",
      provinceId: "79",
      avgHourly: 100,
      minHourly: 50,
      maxHourly: 150,
      sampleSize: 100,
      updatedAt: new Date().toISOString(),
    };

    const mockJob = (hourlyEquivalent: number): Pick<Job, "salaryType" | "salaryMin" | "salaryMax"> => ({
      salaryType: "HOURLY" as const,
      salaryMin: hourlyEquivalent,
      salaryMax: hourlyEquivalent,
    });

    it("should return null if no benchmark provided", () => {
      const result = compareSalary(mockJob(100), undefined);
      expect(result).toBeNull();
    });

    it("should return null if job is negotiable", () => {
      const result = compareSalary(
        { salaryType: "NEGOTIABLE" as const, salaryMin: 0, salaryMax: 0 },
        mockBenchmark
      );
      expect(result).toBeNull();
    });

    it("should return null if hourly is 0", () => {
      const result = compareSalary(mockJob(0), mockBenchmark);
      expect(result).toBeNull();
    });

    it("should mark salary as ABOVE average when higher by >5%", () => {
      const result = compareSalary(mockJob(110), mockBenchmark);
      expect(result?.verdict).toBe("ABOVE");
      expect(result?.diff).toBe(10);
    });

    it("should mark salary as BELOW average when lower by >5%", () => {
      const result = compareSalary(mockJob(90), mockBenchmark);
      expect(result?.verdict).toBe("BELOW");
      expect(result?.diff).toBe(-10);
    });

    it("should mark salary as AVERAGE when within ±5% of avg", () => {
      const result = compareSalary(mockJob(100), mockBenchmark);
      expect(result?.verdict).toBe("AVERAGE");
    });

    it("should calculate percentile correctly at min", () => {
      const result = compareSalary(mockJob(50), mockBenchmark);
      expect(result?.percentile).toBe(100); // Top 100% (lowest)
    });

    it("should calculate percentile correctly at max", () => {
      const result = compareSalary(mockJob(150), mockBenchmark);
      expect(result?.percentile).toBe(1); // Top 1% (highest)
    });

    it("should calculate percentile correctly at midpoint", () => {
      const result = compareSalary(mockJob(100), mockBenchmark);
      // 100 is exactly middle (50-150), so ratio = 0.5, percentile = 50
      expect(result?.percentile).toBe(50);
    });

    it("should ensure percentile >= 1", () => {
      const result = compareSalary(mockJob(151), mockBenchmark);
      expect(result?.percentile).toBeGreaterThanOrEqual(1);
    });
  });

  describe("findBenchmarkFor", () => {
    const benchmarks: SalaryBenchmark[] = [
      {
        categoryId: "cat1",
        provinceId: "79",
        avgHourly: 100,
        minHourly: 50,
        maxHourly: 150,
        sampleSize: 100,
        updatedAt: new Date().toISOString(),
      },
      {
        categoryId: "cat1",
        provinceId: "01",
        avgHourly: 110,
        minHourly: 60,
        maxHourly: 160,
        sampleSize: 80,
        updatedAt: new Date().toISOString(),
      },
    ];

    it("should find exact match by categoryId and provinceId", () => {
      const result = findBenchmarkFor(benchmarks, "cat1", "01");
      expect(result?.provinceId).toBe("01");
      expect(result?.avgHourly).toBe(110);
    });

    it("should fallback to Hanoi (79) if province not found", () => {
      const result = findBenchmarkFor(benchmarks, "cat1", "99");
      expect(result?.provinceId).toBe("79");
    });

    it("should return undefined if category not found", () => {
      const result = findBenchmarkFor(benchmarks, "cat_unknown", "79");
      expect(result).toBeUndefined();
    });
  });
});
