import { describe, it, expect } from "vitest";
import { getAiSeverityGroup, sortJobsByAiSeverity } from "./ai-review";
import type { AiVerdict, Job } from "@/features/shared/types";

/** Dựng 1 tin tuyển dụng tối thiểu — chỉ cần id + verdict để test sắp xếp. */
const makeJob = (id: string, aiVerdict: AiVerdict | null): Job =>
  ({
    id,
    aiVerdict,
    aiReasons: null,
    aiCheckedAt: null,
  }) as Job;

describe("ai-review utilities", () => {
  describe("getAiSeverityGroup", () => {
    it("should put SUSPECT first, then WARN, then OK, then not checked", () => {
      expect(getAiSeverityGroup({ aiVerdict: "SUSPECT" })).toBe(0);
      expect(getAiSeverityGroup({ aiVerdict: "WARN" })).toBe(1);
      expect(getAiSeverityGroup({ aiVerdict: "OK" })).toBe(2);
      expect(getAiSeverityGroup({ aiVerdict: null })).toBe(3);
    });
  });

  describe("sortJobsByAiSeverity", () => {
    it("should order SUSPECT before WARN before OK before not checked", () => {
      const jobs = [
        makeJob("ok", "OK"),
        makeJob("none", null),
        makeJob("warn", "WARN"),
        makeJob("suspect", "SUSPECT"),
      ];

      const sorted = sortJobsByAiSeverity(jobs);

      expect(sorted.map((job) => job.id)).toEqual([
        "suspect",
        "warn",
        "ok",
        "none",
      ]);
    });

    it("should keep original order within the same group", () => {
      const jobs = [
        makeJob("ok-1", "OK"),
        makeJob("suspect-1", "SUSPECT"),
        makeJob("ok-2", "OK"),
        makeJob("none-1", null),
        makeJob("suspect-2", "SUSPECT"),
        makeJob("none-2", null),
      ];

      const sorted = sortJobsByAiSeverity(jobs);

      expect(sorted.map((job) => job.id)).toEqual([
        "suspect-1",
        "suspect-2",
        "ok-1",
        "ok-2",
        "none-1",
        "none-2",
      ]);
    });

    it("should not throw on an empty list and return an empty array", () => {
      expect(() => sortJobsByAiSeverity([])).not.toThrow();
      expect(sortJobsByAiSeverity([])).toEqual([]);
    });

    it("should not mutate the input array", () => {
      const jobs = [
        makeJob("ok", "OK"),
        makeJob("none", null),
        makeJob("suspect", "SUSPECT"),
      ];
      const snapshot = jobs.map((job) => job.id);

      const sorted = sortJobsByAiSeverity(jobs);

      expect(jobs.map((job) => job.id)).toEqual(snapshot);
      expect(sorted).not.toBe(jobs);
    });

    it("should not remove flagged jobs from the queue", () => {
      const jobs = [
        makeJob("suspect", "SUSPECT"),
        makeJob("ok", "OK"),
        makeJob("none", null),
      ];

      expect(sortJobsByAiSeverity(jobs)).toHaveLength(jobs.length);
    });
  });
});
