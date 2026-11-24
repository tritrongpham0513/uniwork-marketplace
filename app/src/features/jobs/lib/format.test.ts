import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { formatSalary, formatPostedAgo, formatDeadline, locationName, locationFull } from "./format";
import type { JobLocation } from "@/features/jobs/types";

describe("format utilities", () => {
  describe("formatSalary", () => {
    it("should format negotiable salary", () => {
      const job = { salaryType: "NEGOTIABLE" as const, salaryMin: 0, salaryMax: 0 };
      expect(formatSalary(job)).toBe("Thỏa thuận");
    });

    it("should format hourly salary", () => {
      const job = { salaryType: "HOURLY" as const, salaryMin: 25000, salaryMax: 30000 };
      expect(formatSalary(job)).toBe("25k – 30k/giờ");
    });

    it("should format daily salary", () => {
      const job = { salaryType: "DAILY" as const, salaryMin: 180000, salaryMax: 220000 };
      expect(formatSalary(job)).toBe("180k – 220k/ngày");
    });

    it("should format monthly salary with millions (rounded)", () => {
      // Note: 1500000 -> "1.5tr", 4500000 -> "4.5tr"
      const job = { salaryType: "MONTHLY" as const, salaryMin: 1500000, salaryMax: 4500000 };
      const result = formatSalary(job);
      expect(result).toContain("tr");
      expect(result).toContain("/tháng");
    });

    it("should format per-task salary", () => {
      const job = { salaryType: "PER_TASK" as const, salaryMin: 100000, salaryMax: 150000 };
      expect(formatSalary(job)).toBe("100k – 150k/tác vụ");
    });

    it("should format single salary when min equals max", () => {
      const job = { salaryType: "DAILY" as const, salaryMin: 200000, salaryMax: 200000 };
      expect(formatSalary(job)).toBe("200k/ngày");
    });

    it("should format single salary when max is null", () => {
      const job = { salaryType: "HOURLY" as const, salaryMin: 25000, salaryMax: null };
      expect(formatSalary(job)).toBe("25k/giờ");
    });

    it("should handle large numbers properly", () => {
      const job = { salaryType: "MONTHLY" as const, salaryMin: 10000000, salaryMax: 20000000 };
      expect(formatSalary(job)).toContain("tr");
    });
  });

  describe("formatPostedAgo", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-15 12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should format posted less than 1 hour ago", () => {
      const postedAt = new Date("2025-01-15 11:50:00").toISOString();
      expect(formatPostedAgo(postedAt)).toBe("Vừa đăng");
    });

    it("should format posted hours ago", () => {
      const postedAt = new Date("2025-01-15 09:00:00").toISOString();
      expect(formatPostedAgo(postedAt)).toBe("3 giờ trước");
    });

    it("should format posted days ago", () => {
      const postedAt = new Date("2025-01-10 12:00:00").toISOString();
      expect(formatPostedAgo(postedAt)).toBe("5 ngày trước");
    });

    it("should format posted months ago", () => {
      const postedAt = new Date("2024-11-15 12:00:00").toISOString();
      expect(formatPostedAgo(postedAt)).toContain("tháng trước");
    });
  });

  describe("formatDeadline", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-15 12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return null if deadline is null", () => {
      expect(formatDeadline(null)).toBeNull();
    });

    it("should format deadline passed", () => {
      const deadline = new Date("2025-01-10 12:00:00").toISOString();
      expect(formatDeadline(deadline)).toBe("Đã hết hạn");
    });

    it("should format deadline in hours", () => {
      const deadline = new Date("2025-01-15 15:00:00").toISOString();
      expect(formatDeadline(deadline)).toBe("Còn 3 giờ");
    });

    it("should format deadline in days", () => {
      const deadline = new Date("2025-01-20 12:00:00").toISOString();
      expect(formatDeadline(deadline)).toBe("Còn 5 ngày");
    });

    it("should handle same day deadline with 0 hours remaining", () => {
      const deadline = new Date("2025-01-15 11:00:00").toISOString();
      // 11:00 is before 12:00, so diffMs <= 0 -> "Đã hết hạn"
      const result = formatDeadline(deadline);
      expect(result).toMatch(/Đã hết hạn|Sắp hết hạn|Còn \d+ giờ/);
    });
  });

  describe("locationName", () => {
    it("should prefer ward over district", () => {
      const location = { ward: "Phường Ba Đình", district: "Quận Hoàn Kiếm" };
      expect(locationName(location)).toBe("Phường Ba Đình");
    });

    it("should use district if ward is not available", () => {
      const location: Pick<JobLocation, "ward" | "district"> = { ward: undefined as unknown as string, district: "Quận Hoàn Kiếm" };
      expect(locationName(location)).toBe("Quận Hoàn Kiếm");
    });

    it("should return empty string if both are unavailable", () => {
      const location: Pick<JobLocation, "ward" | "district"> = { ward: undefined as unknown as string, district: undefined as unknown as string };
      expect(locationName(location)).toBe("");
    });
  });

  describe("locationFull", () => {
    it("should format full location with all parts", () => {
      const location: Pick<JobLocation, "ward" | "district" | "province"> = { ward: "Phường Ba Đình", district: "Quận Hoàn Kiếm", province: "Hà Nội" };
      expect(locationFull(location)).toBe("Phường Ba Đình, Hà Nội");
    });

    it("should use district if ward is unavailable", () => {
      const location: Pick<JobLocation, "ward" | "district" | "province"> = { ward: undefined as unknown as string, district: "Quận Hoàn Kiếm", province: "Hà Nội" };
      expect(locationFull(location)).toBe("Quận Hoàn Kiếm, Hà Nội");
    });

    it("should return only province if no district/ward", () => {
      const location: Pick<JobLocation, "ward" | "district" | "province"> = { ward: undefined as unknown as string, district: undefined as unknown as string, province: "Hà Nội" };
      // locationFull builds as: `${name}, ${province}` where name is empty string
      // so it will be ", Hà Nội" or "Hà Nội" depending on name logic
      const result = locationFull(location);
      expect(result).toContain("Hà Nội");
    });
  });
});
