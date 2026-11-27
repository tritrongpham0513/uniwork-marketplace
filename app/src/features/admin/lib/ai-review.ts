import type {
  AdminJob,
  AiReason,
  AiVerdict,
  AiViolationCode,
  JobStatus,
} from "@/features/shared/types";

/**
 * Nhóm ưu tiên theo mức độ vi phạm của AI.
 *
 * <p>Số càng nhỏ càng được đưa lên đầu danh sách hàng đợi duyệt:
 * `SUSPECT` (0) → `WARN` (1) → `OK` (2) → chưa kiểm tra (3).
 */
export type AiSeverityGroup = 0 | 1 | 2 | 3;

/**
 * Bộ lọc theo tín hiệu AI ở trang duyệt tin của quản trị viên.
 *
 * <p>`FLAGGED` gộp cả `SUSPECT` và `WARN` để quản trị viên gom nhanh mọi tin
 * cần soi kỹ trong một lượt.
 */
export type AiSignalFilter = "ALL" | "FLAGGED" | AiVerdict | "NOT_CHECKED";

/**
 * Mô tả đầy đủ cho mỗi verdict của AI.
 *
 * <p>Gộp nhãn, thứ tự ưu tiên và màu hiển thị vào **một** chỗ, thay vì
 * tra cứu rải rác ở nhiều bảng song song — tránh tình trạng thêm verdict mới
 * mà quên cập nhật một trong các bảng đó.
 */
export interface AiVerdictMeta {
  /** Nhãn hiển thị — khoá vựng theo `notes/01-ket-qua-thu.md` mục 4.1. */
  label: string;
  /** Nhóm ưu tiên khi sắp xếp — số nhỏ được đưa lên đầu. */
  severity: AiSeverityGroup;
  /** Lớp CSS cho badge. */
  badgeClassName: string;
}

/**
 * Bảng tra cứu verdict → mô tả. Nhãn chính thức của từng verdict nằm ở đây.
 */
export const AI_VERDICT_META: Record<AiVerdict, AiVerdictMeta> = {
  SUSPECT: {
    label: "AI: cần xem",
    severity: 0,
    badgeClassName: "bg-destructive/10 text-destructive",
  },
  WARN: {
    label: "AI: nghi ngờ",
    severity: 1,
    badgeClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  OK: {
    label: "AI: ổn",
    severity: 2,
    badgeClassName: "bg-primary/10 text-primary",
  },
};

/** Nhãn khi tin chưa được kiểm tra bằng AI. */
export const AI_NOT_CHECKED_LABEL = "Chưa kiểm tra";

/**
 * Nhãn tiếng Việt cho 6 mã vi phạm — cố định theo `CONTRACT.md` mục 1.
 *
 * <p>Đặt ở tầng lib để cả bảng danh sách lẫn panel chi tiết dùng chung một nguồn.
 */
export const AI_VIOLATION_LABELS: Record<AiViolationCode, string> = {
  FEE_ADVANCE: "Yêu cầu tiền trước",
  UNREGISTERED_WORK: "Tuyển lao động phi chính quyền",
  OFF_PLATFORM: "Tuyển ngoài nền tảng",
  SALARY_ANOMALY: "Mức lương bất thường",
  DISCRIMINATION: "Phân biệt đối xử",
  ILLEGAL_WORK: "Công việc vi phạm pháp luật",
};

/**
 * Mẫu lý do từ chối gửi nhà tuyển dụng tương ứng từng mã vi phạm.
 *
 * <p>Chủ đích không nhắc tới "AI" trong nội dung mẫu — tuân thủ ADR 0005 mục 2
 * (nhà tuyển dụng chỉ nhận lý do nghiệp vụ rõ ràng từ quản trị viên).
 */
export const AI_VIOLATION_REJECT_TEMPLATES: Record<AiViolationCode, string> = {
  FEE_ADVANCE:
    "Tin tuyển dụng có dấu hiệu yêu cầu ứng viên đóng phí hoặc đặt cọc trước khi nhận việc.",
  UNREGISTERED_WORK:
    "Tin tuyển dụng thiếu thông tin giao kết lao động hợp pháp hoặc yêu cầu làm việc không giấy tờ.",
  OFF_PLATFORM:
    "Tin tuyển dụng điều hướng ứng viên liên hệ và nộp hồ sơ ngoài nền tảng VieJob.",
  SALARY_ANOMALY:
    "Mức lương khai báo chưa phù hợp hoặc chênh lệch bất thường so với mặt bằng chung của vị trí.",
  DISCRIMINATION:
    "Nội dung tin tuyển dụng chứa tiêu chí phân biệt đối xử về giới tính, độ tuổi hoặc nơi ở.",
  ILLEGAL_WORK:
    "Nội dung công việc không phù hợp quy định pháp luật và tiêu chuẩn cộng đồng của nền tảng.",
};

/** Tạo danh sách gợi ý lý do từ chối không trùng lặp dựa trên kết quả AI. */
export const buildRejectSuggestions = (
  reasons: AiReason[] | null | undefined
): Array<{ code: AiViolationCode; label: string; template: string }> => {
  if (!reasons || reasons.length === 0) return [];

  const seen = new Set<AiViolationCode>();
  const suggestions: Array<{
    code: AiViolationCode;
    label: string;
    template: string;
  }> = [];

  for (const reason of reasons) {
    if (seen.has(reason.code)) continue;
    seen.add(reason.code);
    suggestions.push({
      code: reason.code,
      label: AI_VIOLATION_LABELS[reason.code],
      template: AI_VIOLATION_REJECT_TEMPLATES[reason.code],
    });
  }

  return suggestions;
};

/** Thống kê số lượng tin theo tín hiệu AI trong danh sách hiện hành. */
export interface AiSignalCounts {
  all: number;
  flagged: number;
  suspect: number;
  warn: number;
  ok: number;
  notChecked: number;
}

/** Đếm số lượng tin theo từng nhóm tín hiệu AI (dùng cho bộ lọc đếm số). */
export const countJobsByAiSignal = (
  jobs: Pick<AdminJob, "aiVerdict">[]
): AiSignalCounts => {
  let suspect = 0;
  let warn = 0;
  let ok = 0;
  let notChecked = 0;

  for (const job of jobs) {
    if (job.aiVerdict === "SUSPECT") suspect += 1;
    else if (job.aiVerdict === "WARN") warn += 1;
    else if (job.aiVerdict === "OK") ok += 1;
    else notChecked += 1;
  }

  return {
    all: jobs.length,
    flagged: suspect + warn,
    suspect,
    warn,
    ok,
    notChecked,
  };
};

/** Kiểm tra 1 tin tuyển dụng có khớp bộ lọc tín hiệu AI đang chọn không. */
export const matchesAiSignalFilter = (
  job: Pick<AdminJob, "aiVerdict">,
  filter: AiSignalFilter
): boolean => {
  switch (filter) {
    case "ALL":
      return true;
    case "FLAGGED":
      return job.aiVerdict === "SUSPECT" || job.aiVerdict === "WARN";
    case "NOT_CHECKED":
      return job.aiVerdict === null;
    default:
      return job.aiVerdict === filter;
  }
};

/** Lọc và sắp xếp danh sách tin quản trị theo trạng thái, tín hiệu AI và từ khoá. */
export const filterAdminJobs = (
  jobs: AdminJob[],
  options: {
    status: JobStatus | "ALL";
    aiFilter: AiSignalFilter;
    keyword: string;
  }
): AdminJob[] => {
  const query = options.keyword.trim().toLowerCase();

  const filtered = jobs.filter((job) => {
    if (options.status !== "ALL" && job.status !== options.status) return false;
    if (!matchesAiSignalFilter(job, options.aiFilter)) return false;
    if (!query) return true;

    return (
      job.title.toLowerCase().includes(query) ||
      job.employer.name.toLowerCase().includes(query) ||
      job.category.name.toLowerCase().includes(query) ||
      (job.position?.name.toLowerCase().includes(query) ?? false)
    );
  });

  // Tin bị gắn cờ luôn nổi lên đầu trong cùng bộ lọc.
  return sortJobsByAiSeverity(filtered);
};

export interface TextHighlightSegment {
  text: string;
  isHighlighted: boolean;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tách một đoạn văn bản thành các phân đoạn thường và phân đoạn trùng với
 * bằng chứng nguyên văn của AI để highlight trực tiếp trên giao diện.
 *
 * <p>Khớp không phân biệt hoa/thường và dung thứ chênh lệch khoảng trắng
 * (xuống dòng / nhiều dấu cách) tương tự quy tắc chuẩn hoá của backend,
 * nhưng luôn trả về đúng lát cắt chuỗi gốc để không làm sai lệch nội dung.
 */
export const splitTextByEvidences = (
  text: string,
  evidences: string[]
): TextHighlightSegment[] => {
  if (!text) return [];

  const normalizedTerms = Array.from(
    new Set(
      evidences.map((item) => item.trim()).filter((item) => item.length > 0)
    )
  ).sort((a, b) => b.length - a.length);

  if (normalizedTerms.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Cho phép chuỗi khoảng trắng liên tiếp trong evidence khớp với space/newline bất kỳ.
  const patternBody = normalizedTerms
    .map((term) =>
      term
        .split(/\s+/)
        .map((part) => escapeRegex(part))
        .join("\\s+")
    )
    .join("|");

  const regex = new RegExp(`(${patternBody})`, "gi");
  const segments: TextHighlightSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const matchIndex = match.index ?? 0;
    const matchedText = match[0];
    if (!matchedText) continue;

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        isHighlighted: false,
      });
    }
    segments.push({
      text: matchedText,
      isHighlighted: true,
    });
    lastIndex = matchIndex + matchedText.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, isHighlighted: false }];
};

/**
 * Xếp nhóm mức độ của 1 tin tuyển dụng.
 *
 * <p>`null` (chưa kiểm tra) nằm cuối cùng vì tin đó chưa có kết quả nào để
 * quản trị viên cần soi — nhưng tuyệt đối không bị loại khỏi hàng đợi.
 */
export const getAiSeverityGroup = (
  job: Pick<AdminJob, "aiVerdict">
): AiSeverityGroup =>
  job.aiVerdict ? AI_VERDICT_META[job.aiVerdict].severity : 3;

/**
 * Sắp xếp danh sách tin tuyển dụng theo mức độ vi phạm của AI.
 *
 * <p>Thứ tự: `SUSPECT` → `WARN` → `OK` → chưa kiểm tra.
 * Trong cùng một nhóm, thứ tự ban đầu được giữ nguyên (stable sort) để
 * tin `OK` và tin chưa kiểm tra vẫn theo đúng thứ tự thời gian hiện tại.
 *
 * <p>Hàm thuần: không mutate mảng đầu vào, trả về mảng mới.
 */
export const sortJobsByAiSeverity = (jobs: AdminJob[]): AdminJob[] => {
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

/**
 * Trạng thái hiển thị của khối "Đánh giá của AI".
 *
 * <p>`REVIEW` là trạng thái **có nội dung** — khối hiển thị tóm tắt + danh
 * sách lý do thật, không dùng thông điệp nào.
 */
export type AiPanelState =
  "CHECKING" | "REVIEW" | "FAILED" | "CHECKED_NO_RESULT" | "NOT_CHECKED";

/**
 * Quyết định khối "Đánh giá của AI" nên hiện gì.
 *
 * <p>Hàm thuần để test được — component chỉ gọi và render theo kết quả.
 *
 * <p>Điểm quan trọng: khi lần kiểm tra **thất bại** (`hasFailed`), trạng thái là
 * `FAILED` chứ không phải `CHECKED_NO_RESULT`. Cả hai đều hiển thị "chưa kiểm
 * tra", nhưng tách riêng để thông điệp dành cho trường hợp lỗi khác với
 * trường hợp chưa bấm — và để không bao giờ lộ lỗi kỹ thuật cho quản trị viên.
 *
 * @param input Trạng thái hiện tại.
 * @returns Trạng thái để render.
 */
export const getAiPanelState = (input: {
  hasReview: boolean;
  isChecking: boolean;
  hasChecked: boolean;
  hasFailed: boolean;
}): AiPanelState => {
  if (input.isChecking) return "CHECKING";
  if (input.hasReview) return "REVIEW";
  if (input.hasFailed) return "FAILED";
  if (input.hasChecked) return "CHECKED_NO_RESULT";
  return "NOT_CHECKED";
};

/**
 * Thông điệp của khối "Đánh giá của AI" theo trạng thái.
 *
 * <p>Chỉ các trạng thái **không có nội dung** mới cần thông điệp. Trạng thái
 * `REVIEW` không có mục này — panel render nội dung đánh giá thật.
 */
export const AI_PANEL_MESSAGES: Partial<Record<AiPanelState, string>> = {
  CHECKING: "Đang kiểm tra bằng AI...",
  FAILED:
    "Tin này chưa được kiểm tra bằng AI. Bạn vẫn có thể tự đối chiếu nội dung bên trên.",
  CHECKED_NO_RESULT: "Chưa có kết quả kiểm tra AI cho tin này.",
  NOT_CHECKED: "Tin này chưa được kiểm tra bằng AI.",
};
