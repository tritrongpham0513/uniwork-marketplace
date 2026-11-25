import type { AiVerdict, Job } from "@/features/shared/types";

/**
 * Nhóm ưu tiên theo mức độ vi phạm của AI.
 *
 * <p>Số càng nhỏ càng được đưa lên đầu danh sách hàng đợi duyệt:
 * `SUSPECT` (0) → `WARN` (1) → `OK` (2) → chưa kiểm tra (3).
 */
export type AiSeverityGroup = 0 | 1 | 2 | 3;

/**
 * Xếp nhóm mức độ của 1 tin tuyển dụng.
 *
 * <p>`null` (chưa kiểm tra) nằm cuối cùng vì tin đó chưa có kết quả nào để
 * quản trị viên cần soi — nhưng tuyệt đối không bị loại khỏi hàng đợi.
 */
export const getAiSeverityGroup = (
  job: Pick<Job, "aiVerdict">
): AiSeverityGroup => {
  switch (job.aiVerdict) {
    case "SUSPECT":
      return 0;
    case "WARN":
      return 1;
    case "OK":
      return 2;
    default:
      return 3;
  }
};

/**
 * Sắp xếp danh sách tin tuyển dụng theo mức độ vi phạm của AI.
 *
 * <p>Thứ tự: `SUSPECT` → `WARN` → `OK` → chưa kiểm tra.
 * Trong cùng một nhóm, thứ tự ban đầu được giữ nguyên (stable sort) để
 * tin `OK` và tin chưa kiểm tra vẫn theo đúng thứ tự thời gian hiện tại.
 *
 * <p>Hàm thuần: không mutate mảng đầu vào, trả về mảng mới.
 */
export const sortJobsByAiSeverity = (jobs: Job[]): Job[] => {
  // `map` + `sort` trên chỉ số: giữ được tính ổn định mà không cần so sánh
  // phụ tùy theo mảng gốc (giả định sort ổn định không được đảm bảo ở mọi
  // runtime cũ).
  return jobs
    .map((job, index) => ({ job, index }))
    .sort((a, b) => {
      const diff = getAiSeverityGroup(a.job) - getAiSeverityGroup(b.job);
      // Cùng nhóm -> giữ nguyên thứ tự ban đầu.
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map((entry) => entry.job);
};

/** Nhãn hiển thị của mức độ — khoá vựng theo `notes/01-ket-qua-thu.md` mục 4.1. */
export const AI_VERDICT_LABELS: Record<AiVerdict | "NOT_CHECKED", string> = {
  SUSPECT: "AI: cần xem",
  WARN: "AI: nghi ngờ",
  OK: "AI: ổn",
  NOT_CHECKED: "Chưa kiểm tra",
};
