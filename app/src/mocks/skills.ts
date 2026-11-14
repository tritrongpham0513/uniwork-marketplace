import type { Skill } from "@/features/shared/types";

/**
 * Kỹ năng — mirror bảng `skills`.
 * Sinh viên chọn kỹ năng khi xây dựng hồ sơ tìm việc.
 */
export const SKILLS: Skill[] = [
  { id: "sk-barista", name: "Pha chế cà phê" },
  { id: "sk-service", name: "Phục vụ" },
  { id: "sk-cooking", name: "Nấu ăn" },
  { id: "sk-cashier", name: "Thu ngân" },
  { id: "sk-driver", name: "Giao hàng" },
  { id: "sk-content", name: "Sáng tạo nội dung" },
  { id: "sk-excel", name: "Excel" },
  { id: "sk-teaching", name: "Kèm cặp" },
  { id: "sk-manual-test", name: "Kiểm thử phần mềm" },
  { id: "sk-pos", name: "Bán hàng" },
  { id: "sk-stock", name: "Quản lý kho" },
  { id: "sk-translate", name: "Phiên dịch" },
  { id: "sk-design", name: "Thiết kế" },
  { id: "sk-seo", name: "SEO" },
  { id: "sk-react", name: "React" },
  { id: "sk-security", name: "An ninh mạng" },
];
