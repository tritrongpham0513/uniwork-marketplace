import { describe, expect, it } from "vitest";
import {
  canCloseJob,
  canCompleteJob,
  canReopenJob,
  getJobStatusConfirmMeta,
  getJobStatusSuccessMessage,
} from "./job-status-actions";

describe("job-status-actions", () => {
  it("canCloseJob allows only OPEN and IN_PROGRESS", () => {
    expect(canCloseJob("OPEN")).toBe(true);
    expect(canCloseJob("IN_PROGRESS")).toBe(true);
    expect(canCloseJob("CLOSED")).toBe(false);
    expect(canCloseJob("FILLED")).toBe(false);
    expect(canCloseJob("COMPLETED")).toBe(false);
    expect(canCloseJob("PENDING_REVIEW")).toBe(false);
  });

  it("canReopenJob allows CLOSED only when positionsFilled < positionsCount", () => {
    expect(
      canReopenJob({ status: "CLOSED", positionsFilled: 0, positionsCount: 2 })
    ).toBe(true);
    expect(
      canReopenJob({ status: "CLOSED", positionsFilled: 1, positionsCount: 2 })
    ).toBe(true);
    expect(
      canReopenJob({ status: "CLOSED", positionsFilled: 2, positionsCount: 2 })
    ).toBe(false);
    expect(
      canReopenJob({ status: "OPEN", positionsFilled: 0, positionsCount: 2 })
    ).toBe(false);
  });

  it("canCompleteJob allows OPEN, IN_PROGRESS, FILLED and CLOSED", () => {
    expect(canCompleteJob("OPEN")).toBe(true);
    expect(canCompleteJob("IN_PROGRESS")).toBe(true);
    expect(canCompleteJob("FILLED")).toBe(true);
    expect(canCompleteJob("CLOSED")).toBe(true);
    expect(canCompleteJob("COMPLETED")).toBe(false);
    expect(canCompleteJob("PENDING_REVIEW")).toBe(false);
    expect(canCompleteJob("REJECTED")).toBe(false);
  });

  it("getJobStatusConfirmMeta adapts reopen copy based on filled positions", () => {
    const reopenFresh = getJobStatusConfirmMeta(
      { title: "Phục vụ", positionsFilled: 0, positionsCount: 2 },
      "OPEN"
    );
    expect(reopenFresh.description).toContain("Đang tuyển");

    const reopenPartial = getJobStatusConfirmMeta(
      { title: "Phục vụ", positionsFilled: 1, positionsCount: 2 },
      "OPEN"
    );
    expect(reopenPartial.description).toContain("1/2 suất");
    expect(reopenPartial.description).toContain("Đang tuyển thêm");
  });

  it("getJobStatusSuccessMessage returns clear Vietnamese feedback", () => {
    expect(getJobStatusSuccessMessage("CLOSED", "CLOSED")).toBe(
      "Đã đóng tin tuyển dụng."
    );
    expect(getJobStatusSuccessMessage("OPEN", "OPEN")).toBe(
      "Đã mở lại tin tuyển dụng."
    );
    expect(getJobStatusSuccessMessage("OPEN", "IN_PROGRESS")).toBe(
      "Đã mở lại tin ở trạng thái Đang tuyển thêm."
    );
    expect(getJobStatusSuccessMessage("COMPLETED", "COMPLETED")).toBe(
      "Đã đánh dấu hoàn thành tin tuyển dụng."
    );
  });
});
