import type { JobPosition } from "@/features/shared/types";
import { JOB_POSITIONS } from "./categories";

/**
 * Bảng ánh xạ tiêu đề tin → vị trí công việc.
 * Cho phép gán vị trí chi tiết (lồng trong nhóm việc) mà không phải sửa
 * từng seed job trong `jobs.ts`.
 *
 * Khớp theo thứ tự: mẫu khớp đầu tiên trong danh sách thắng.
 */
const TITLE_TO_POSITION: Array<[RegExp, string]> = [
  // F&B
  [/phục vụ tiệc|phục vụ /i, "pos-phuc-vu"],
  [/chạy bàn|tiếp thực/i, "pos-chay-ban"],
  [/đón khách|host/i, "pos-don-khach"],
  [/pha chế trà sữa|trà sữa/i, "pos-tra-sua"],
  [/pha chế.*bar|barista/i, "pos-bar"],
  [/pha chế.*c[aâ]fe|c[aâ]fe|quán cafe/i, "pos-cafe"],
  [/koi/i, "pos-tra-sua"],
  // Bếp
  [/bếp phụ/i, "pos-phu-bep-tap-vu"],
  [/bếp chính/i, "pos-bep-chinh"],
  [/bếp nóng/i, "pos-bep-nong"],
  [/bếp lạnh/i, "pos-bep-lanh"],
  [/thợ làm bánh|làm bánh/i, "pos-tho-lam-banh"],
  [/bếp\b/i, "pos-nhan-vien-bep"],
  // Bán hàng & thu ngân
  [/thu ngân/i, "pos-thu-ngan"],
  [/lễ tân|order/i, "pos-le-tan"],
  [/bán hàng|livestream|bán lẻ/i, "pos-ban-hang"],
  // Giao hàng & vận chuyển
  [/giao hàng|shipper/i, "pos-giao-hang"],
  [/bảo vệ/i, "pos-bao-ve"],
  // Marketing
  [/content|seo/i, "pos-noi-dung"],
  [/marketing|livestream/i, "pos-marketing"],
  // Văn phòng
  [/văn phòng|hành chính/i, "pos-hanh-chinh-van-phong"],
  [/trợ lý|tạp vụ|setup/i, "pos-tap-vu-ve-sinh"],
  // Dạy kèm
  [/gia sư/i, "pos-gia-su"],
  [/trợ giảng|dạy.*tiếng anh/i, "pos-day-ngoai-ngu"],
  [/phiên dịch/i, "pos-day-ngoai-ngu"],
  // Công nghệ
  [/kiểm thử|qa/i, "pos-kiem-thu"],
  [/lập trình|react|phần mềm/i, "pos-lap-trinh"],
];

const POSITION_MAP = new Map<string, JobPosition>(
  JOB_POSITIONS.map((p) => [p.id, p]),
);

/** Suy ra vị trí công việc từ tiêu đề tin. */
export const inferPosition = (title: string): JobPosition | null => {
  for (const [pattern, positionId] of TITLE_TO_POSITION) {
    if (pattern.test(title)) {
      return POSITION_MAP.get(positionId) ?? null;
    }
  }
  return null;
};
