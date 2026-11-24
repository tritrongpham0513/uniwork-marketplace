import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { isoToDate, dateToIso, todayIso, formatDateVi, ISO_DATE_PATTERN } from "./date";

describe("date utilities", () => {
  describe("ISO_DATE_PATTERN", () => {
    it("should match valid ISO date format", () => {
      expect(ISO_DATE_PATTERN.test("2025-01-15")).toBe(true);
      expect(ISO_DATE_PATTERN.test("2024-12-31")).toBe(true);
    });

    it("should not match invalid formats", () => {
      expect(ISO_DATE_PATTERN.test("2025-1-15")).toBe(false);
      expect(ISO_DATE_PATTERN.test("15/01/2025")).toBe(false);
      expect(ISO_DATE_PATTERN.test("2025-13-01")).toBe(true); // Pattern only checks format, not validity
    });
  });

  describe("isoToDate", () => {
    it("should parse ISO date string to Date", () => {
      const iso = "2025-01-15";
      const date = isoToDate(iso);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it("should handle full ISO datetime string", () => {
      const iso = "2025-01-15T10:30:00Z";
      const date = isoToDate(iso);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it("should return Invalid Date for invalid input", () => {
      const date = isoToDate("invalid");
      expect(Number.isNaN(date.getTime())).toBe(true);
    });
  });

  describe("dateToIso", () => {
    it("should convert Date to ISO string format", () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const iso = dateToIso(date);
      expect(iso).toBe("2025-01-15");
    });

    it("should pad single digit months and days", () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      const iso = dateToIso(date);
      expect(iso).toBe("2025-01-05");
    });

    it("should handle end of year", () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      const iso = dateToIso(date);
      expect(iso).toBe("2025-12-31");
    });
  });

  describe("todayIso", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return today date in ISO format", () => {
      vi.setSystemTime(new Date("2025-01-15"));
      expect(todayIso()).toBe("2025-01-15");
    });

    it("should return current date even on different days", () => {
      vi.setSystemTime(new Date("2024-12-25"));
      expect(todayIso()).toBe("2024-12-25");
    });
  });

  describe("formatDateVi", () => {
    it("should format ISO date to Vietnamese format", () => {
      const iso = "2025-01-15";
      expect(formatDateVi(iso)).toBe("15/01/2025");
    });

    it("should return fallback for null input", () => {
      expect(formatDateVi(null)).toBe("—");
      expect(formatDateVi(null, "N/A")).toBe("N/A");
    });

    it("should return fallback for undefined input", () => {
      expect(formatDateVi(undefined)).toBe("—");
    });

    it("should return fallback for empty string", () => {
      expect(formatDateVi("")).toBe("—");
    });

    it("should return fallback for invalid date", () => {
      expect(formatDateVi("invalid-date")).toBe("—");
      expect(formatDateVi("2025-13-01")).toBe("—");
    });

    it("should use custom fallback", () => {
      expect(formatDateVi(null, "Not available")).toBe("Not available");
      expect(formatDateVi(undefined, "—")).toBe("—");
    });

    it("should handle full ISO datetime string", () => {
      const iso = "2025-01-15T10:30:00Z";
      expect(formatDateVi(iso)).toBe("15/01/2025");
    });
  });

  describe("round-trip conversion", () => {
    it("should convert back and forth correctly", () => {
      const originalIso = "2025-01-15";
      const date = isoToDate(originalIso);
      const convertedIso = dateToIso(date);
      expect(convertedIso).toBe(originalIso);
    });

    it("should format correctly after conversion", () => {
      const originalIso = "2025-01-15";
      const formatted = formatDateVi(originalIso);
      expect(formatted).toBe("15/01/2025");
    });
  });
});
