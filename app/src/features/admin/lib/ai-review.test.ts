import { describe, it, expect } from "vitest";
import {
  AI_PANEL_MESSAGES,
  AI_VIOLATION_REJECT_TEMPLATES,
  buildRejectSuggestions,
  countJobsByAiSignal,
  filterAdminJobs,
  getAiPanelState,
  getAiSeverityGroup,
  matchesAiSignalFilter,
  sortJobsByAiSeverity,
  splitTextByEvidences,
} from "./ai-review";
import type {
  AdminJob,
  AiReason,
  AiVerdict,
  JobStatus,
} from "@/features/shared/types";

/** Dựng 1 tin tuyển dụng tối thiểu — chỉ cần các trường liên quan tới lọc/sắp xếp. */
const makeJob = (
  id: string,
  aiVerdict: AiVerdict | null,
  overrides?: {
    status?: JobStatus;
    title?: string;
    employerName?: string;
    categoryName?: string;
    positionName?: string;
  }
): AdminJob =>
  ({
    id,
    title: overrides?.title ?? `Tin ${id}`,
    status: overrides?.status ?? "PENDING_REVIEW",
    employer: { name: overrides?.employerName ?? "Công ty ABC" },
    category: { name: overrides?.categoryName ?? "Bán hàng" },
    position: overrides?.positionName ? { name: overrides.positionName } : null,
    aiVerdict,
    aiReasons: null,
    aiSummary: null,
    aiCheckedAt: null,
  }) as AdminJob;

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

  describe("getAiPanelState", () => {
    it("should show CHECKING while the request is in flight", () => {
      expect(
        getAiPanelState({
          hasReview: false,
          isChecking: true,
          hasChecked: false,
          hasFailed: false,
        })
      ).toBe("CHECKING");
    });

    it("should show REVIEW when there is a result", () => {
      expect(
        getAiPanelState({
          hasReview: true,
          isChecking: false,
          hasChecked: true,
          hasFailed: false,
        })
      ).toBe("REVIEW");
    });

    it("should show FAILED (not a technical error) when the check failed", () => {
      expect(
        getAiPanelState({
          hasReview: false,
          isChecking: false,
          hasChecked: true,
          hasFailed: true,
        })
      ).toBe("FAILED");
    });

    it("should show CHECKED_NO_RESULT when the check returned nothing", () => {
      expect(
        getAiPanelState({
          hasReview: false,
          isChecking: false,
          hasChecked: true,
          hasFailed: false,
        })
      ).toBe("CHECKED_NO_RESULT");
    });

    it("should show NOT_CHECKED before any check", () => {
      expect(
        getAiPanelState({
          hasReview: false,
          isChecking: false,
          hasChecked: false,
          hasFailed: false,
        })
      ).toBe("NOT_CHECKED");
    });
  });

  describe("AI_PANEL_MESSAGES", () => {
    it("should never expose a technical error message to the admin", () => {
      const technicalWords = ["lỗi", "error", "500", "503", "exception"];
      for (const message of Object.values(AI_PANEL_MESSAGES)) {
        for (const word of technicalWords) {
          expect(message?.toLowerCase()).not.toContain(word);
        }
      }
    });

    it("should tell the admin the job was not checked when the check failed", () => {
      expect(AI_PANEL_MESSAGES.FAILED).toContain("chưa được kiểm tra");
    });

    it("should not define a message for REVIEW — that state renders the real result", () => {
      expect(AI_PANEL_MESSAGES.REVIEW).toBeUndefined();
    });
  });

  describe("countJobsByAiSignal & matchesAiSignalFilter", () => {
    it("should count each AI verdict bucket accurately", () => {
      const jobs = [
        makeJob("1", "SUSPECT"),
        makeJob("2", "WARN"),
        makeJob("3", "WARN"),
        makeJob("4", "OK"),
        makeJob("5", null),
      ];

      expect(countJobsByAiSignal(jobs)).toEqual({
        all: 5,
        flagged: 3,
        suspect: 1,
        warn: 2,
        ok: 1,
        notChecked: 1,
      });
    });

    it("should match FLAGGED for both SUSPECT and WARN", () => {
      expect(matchesAiSignalFilter(makeJob("1", "SUSPECT"), "FLAGGED")).toBe(
        true
      );
      expect(matchesAiSignalFilter(makeJob("2", "WARN"), "FLAGGED")).toBe(true);
      expect(matchesAiSignalFilter(makeJob("3", "OK"), "FLAGGED")).toBe(false);
      expect(matchesAiSignalFilter(makeJob("4", null), "FLAGGED")).toBe(false);
    });

    it("should match NOT_CHECKED only when aiVerdict is null", () => {
      expect(matchesAiSignalFilter(makeJob("1", null), "NOT_CHECKED")).toBe(
        true
      );
      expect(matchesAiSignalFilter(makeJob("2", "OK"), "NOT_CHECKED")).toBe(
        false
      );
    });
  });

  describe("filterAdminJobs", () => {
    it("should filter by status, AI signal, keyword and keep severity ordering", () => {
      const jobs = [
        makeJob("ok", "OK", { title: "Phục vụ quán cà phê" }),
        makeJob("suspect", "SUSPECT", {
          title: "Phục vụ đặt cọc",
          employerName: "Quán A",
        }),
        makeJob("warn", "WARN", {
          title: "Phục vụ ca tối",
          positionName: "Nhân viên phục vụ",
        }),
        makeJob("open-suspect", "SUSPECT", {
          status: "OPEN",
          title: "Phục vụ đang tuyển",
        }),
      ];

      const result = filterAdminJobs(jobs, {
        status: "PENDING_REVIEW",
        aiFilter: "FLAGGED",
        keyword: "phục vụ",
      });

      expect(result.map((job) => job.id)).toEqual(["suspect", "warn"]);
    });
  });

  describe("buildRejectSuggestions", () => {
    it("should deduplicate violation codes and avoid mentioning AI in templates", () => {
      const reasons: AiReason[] = [
        { code: "FEE_ADVANCE", evidence: "cọc 500k", detail: "Thu phí" },
        { code: "FEE_ADVANCE", evidence: "mua đồng phục", detail: "Thu phí 2" },
        {
          code: "OFF_PLATFORM",
          evidence: "nhắn Zalo",
          detail: "Ngoài nền tảng",
        },
      ];

      const suggestions = buildRejectSuggestions(reasons);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((item) => item.code)).toEqual([
        "FEE_ADVANCE",
        "OFF_PLATFORM",
      ]);
      for (const template of Object.values(AI_VIOLATION_REJECT_TEMPLATES)) {
        expect(template).not.toMatch(/\bAI\b/i);
      }
    });
  });

  describe("splitTextByEvidences", () => {
    it("should highlight exact and whitespace-variant matches case-insensitively", () => {
      const segments = splitTextByEvidences(
        "Yêu cầu đặt   cọc 500k khi nhận việc. Liên hệ Zalo 0909.",
        ["đặt cọc 500k", "zalo 0909"]
      );

      expect(segments).toEqual([
        { text: "Yêu cầu ", isHighlighted: false },
        { text: "đặt   cọc 500k", isHighlighted: true },
        { text: " khi nhận việc. Liên hệ ", isHighlighted: false },
        { text: "Zalo 0909", isHighlighted: true },
        { text: ".", isHighlighted: false },
      ]);
    });

    it("should safely handle regex metacharacters in evidence strings", () => {
      const segments = splitTextByEvidences("Phí (500k+) mỗi tháng.", [
        "(500k+)",
      ]);

      expect(segments).toEqual([
        { text: "Phí ", isHighlighted: false },
        { text: "(500k+)", isHighlighted: true },
        { text: " mỗi tháng.", isHighlighted: false },
      ]);
    });

    it("should return single non-highlighted segment when evidences are empty", () => {
      expect(splitTextByEvidences("Nội dung bình thường", [])).toEqual([
        { text: "Nội dung bình thường", isHighlighted: false },
      ]);
    });
  });
});
