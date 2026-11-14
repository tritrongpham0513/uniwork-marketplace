import type { JobCategory, JobPosition } from "@/features/shared/types";

/**
 * Nhóm việc — mirror bảng `job_categories`.
 * Icon là tên component lucide-react (dùng để render động).
 */
export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: "cat-fnb",
    name: "F&B, Barista & Phục vụ",
    slug: "f-and-b",
    description: "Phục vụ, barista, chạy bàn, tiếp thực tại quán cà phê, nhà hàng",
    icon: "UtensilsCrossed",
    jobCount: 128,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "cat-bep",
    name: "Bếp & Nấu ăn",
    slug: "bep",
    description: "Bếp chính, bếp nóng, bếp lạnh, thợ làm bánh",
    icon: "ChefHat",
    jobCount: 74,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "cat-ban-tang",
    name: "Bán hàng & Thu ngân",
    slug: "ban-hang",
    description: "Bán hàng, tư vấn bán hàng, thu ngân, lễ tân",
    icon: "ShoppingBag",
    jobCount: 61,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "cat-giao-hang",
    name: "Giao hàng & Vận chuyển",
    slug: "giao-hang",
    description: "Giao hàng nội bộ, shipper, thủ kho, vệ sinh",
    icon: "Truck",
    jobCount: 49,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "cat-marketing",
    name: "Marketing & Truyền thông",
    slug: "marketing",
    description: "Content, marketing, quản trị mạng xã hội, thiết kế",
    icon: "Megaphone",
    jobCount: 33,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: "cat-van-phong",
    name: "Văn phòng & Hành chính",
    slug: "van-phong",
    description: "Hành chính văn phòng, tổng đài, kế toán",
    icon: "Briefcase",
    jobCount: 27,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: "cat-day-hoc",
    name: "Dạy kèm & Tư vấn",
    slug: "day-hoc",
    description: "Gia sư, trợ giảng, dạy kèm ngoại ngữ",
    icon: "GraduationCap",
    jobCount: 22,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: "cat-cong-nghe",
    name: "Công nghệ & Kiểm thử",
    slug: "cong-nghe",
    description: "Lập trình, kiểm thử phần mềm, hỗ trợ kỹ thuật",
    icon: "Code2",
    jobCount: 18,
    isActive: true,
    sortOrder: 8,
  },
];

/**
 * Vị trí công việc — chi tiết hơn nhóm việc.
 * Lấy cảm hứng từ bộ "Vị trí công việc" của Chốt Ca (~30 vị trí lồng trong nhóm).
 */
export const JOB_POSITIONS: JobPosition[] = [
  // F&B
  { id: "pos-phuc-vu", categoryId: "cat-fnb", name: "Phục vụ", slug: "phuc-vu", jobCount: 62 },
  { id: "pos-chay-ban", categoryId: "cat-fnb", name: "Chạy bàn / Tiếp thực", slug: "chay-ban", jobCount: 24 },
  { id: "pos-don-khach", categoryId: "cat-fnb", name: "Đón khách (Host)", slug: "don-khach", jobCount: 11 },
  { id: "pos-bar", categoryId: "cat-fnb", name: "Pha chế (Bar)", slug: "bar", jobCount: 9 },
  { id: "pos-phu-bar", categoryId: "cat-fnb", name: "Phụ bar", slug: "phu-bar", jobCount: 8 },
  { id: "pos-cafe", categoryId: "cat-fnb", name: "Pha chế (Café)", slug: "cafe", jobCount: 14 },
  { id: "pos-tra-sua", categoryId: "cat-fnb", name: "Pha chế (Trà sữa, sinh tố)", slug: "tra-sua", jobCount: 19 },
  // Bếp
  { id: "pos-bep-chinh", categoryId: "cat-bep", name: "Bếp chính", slug: "bep-chinh", jobCount: 16 },
  { id: "pos-giam-sat-bep", categoryId: "cat-bep", name: "Giám sát bếp", slug: "giam-sat-bep", jobCount: 6 },
  { id: "pos-bep-nong", categoryId: "cat-bep", name: "Bếp nóng", slug: "bep-nong", jobCount: 14 },
  { id: "pos-phu-bep-nong", categoryId: "cat-bep", name: "Phụ bếp nóng", slug: "phu-bep-nong", jobCount: 12 },
  { id: "pos-bep-lanh", categoryId: "cat-bep", name: "Bếp lạnh", slug: "bep-lanh", jobCount: 8 },
  { id: "pos-phu-bep-lanh", categoryId: "cat-bep", name: "Phụ bếp lạnh", slug: "phu-bep-lanh", jobCount: 7 },
  { id: "pos-bep-phu", categoryId: "cat-bep", name: "Bếp phụ", slug: "bep-phu", jobCount: 6 },
  { id: "pos-nhan-vien-bep", categoryId: "cat-bep", name: "Nhân viên Bếp", slug: "nhan-vien-bep", jobCount: 9 },
  { id: "pos-phu-bep-tap-vu", categoryId: "cat-bep", name: "Phụ bếp / Tạp vụ bếp", slug: "phu-bep-tap-vu", jobCount: 11 },
  { id: "pos-tho-lam-banh", categoryId: "cat-bep", name: "Thợ làm bánh", slug: "tho-lam-banh", jobCount: 5 },
  { id: "pos-rua-chen-bat", categoryId: "cat-bep", name: "Rửa chén bát", slug: "rua-chen-bat", jobCount: 13 },
  // Bán hàng
  { id: "pos-ban-hang", categoryId: "cat-ban-tang", name: "Bán hàng", slug: "ban-hang", jobCount: 34 },
  { id: "pos-tu-van-ban-hang", categoryId: "cat-ban-tang", name: "Tư vấn bán hàng", slug: "tu-van-ban-hang", jobCount: 15 },
  { id: "pos-telesales", categoryId: "cat-ban-tang", name: "Telesales", slug: "telesales", jobCount: 8 },
  { id: "pos-cham-soc-khach", categoryId: "cat-ban-tang", name: "Chăm sóc khách hàng", slug: "cham-soc-khach", jobCount: 10 },
  { id: "pos-thu-ngan", categoryId: "cat-ban-tang", name: "Thu ngân", slug: "thu-ngan", jobCount: 22 },
  { id: "pos-le-tan", categoryId: "cat-ban-tang", name: "Lễ tân / Order", slug: "le-tan", jobCount: 17 },
  // Giao hàng
  { id: "pos-giao-hang-noi-bo", categoryId: "cat-giao-hang", name: "Giao hàng nội bộ", slug: "giao-hang-noi-bo", jobCount: 14 },
  { id: "pos-giao-hang", categoryId: "cat-giao-hang", name: "Giao hàng", slug: "giao-hang", jobCount: 19 },
  { id: "pos-kho", categoryId: "cat-giao-hang", name: "Thủ kho", slug: "kho", jobCount: 8 },
  { id: "pos-bao-ve", categoryId: "cat-giao-hang", name: "Bảo vệ", slug: "bao-ve", jobCount: 5 },
  { id: "pos-trong-xe", categoryId: "cat-giao-hang", name: "Trông xe", slug: "trong-xe", jobCount: 3 },
  { id: "pos-tap-vu-ve-sinh", categoryId: "cat-giao-hang", name: "Tạp vụ vệ sinh", slug: "tap-vu-ve-sinh", jobCount: 7 },
  // Marketing
  { id: "pos-marketing", categoryId: "cat-marketing", name: "Marketing", slug: "marketing", jobCount: 12 },
  { id: "pos-truyen-thong-design", categoryId: "cat-marketing", name: "Truyền thông / Design", slug: "truyen-thong-design", jobCount: 11 },
  { id: "pos-noi-dung", categoryId: "cat-marketing", name: "Sáng tạo nội dung", slug: "noi-dung", jobCount: 10 },
  // Văn phòng
  { id: "pos-hanh-chinh-van-phong", categoryId: "cat-van-phong", name: "Hành chính văn phòng", slug: "hanh-chinh-van-phong", jobCount: 13 },
  { id: "pos-tong-dai", categoryId: "cat-van-phong", name: "Tổng đài", slug: "tong-dai", jobCount: 7 },
  { id: "pos-ke-toan", categoryId: "cat-van-phong", name: "Kế toán", slug: "ke-toan", jobCount: 7 },
  // Dạy kèm
  { id: "pos-gia-su", categoryId: "cat-day-hoc", name: "Gia sư", slug: "gia-su", jobCount: 9 },
  { id: "pos-tro-giang", categoryId: "cat-day-hoc", name: "Trợ giảng", slug: "tro-giang", jobCount: 7 },
  { id: "pos-day-ngoai-ngu", categoryId: "cat-day-hoc", name: "Dạy ngoại ngữ", slug: "day-ngoai-ngu", jobCount: 6 },
  // Công nghệ
  { id: "pos-kiem-thu", categoryId: "cat-cong-nghe", name: "Kiểm thử phần mềm", slug: "kiem-thu", jobCount: 6 },
  { id: "pos-lap-trinh", categoryId: "cat-cong-nghe", name: "Lập trình viên", slug: "lap-trinh", jobCount: 7 },
  { id: "pos-ho-tro-ky-thuat", categoryId: "cat-cong-nghe", name: "Hỗ trợ kỹ thuật", slug: "ho-tro-ky-thuat", jobCount: 5 },
];

export const PROVINCES = [
  { id: "hcm", name: "TP. Hồ Chí Minh" },
  { id: "hn", name: "Hà Nội" },
  { id: "dn", name: "Đà Nẵng" },
  { id: "ct", name: "Cần Thơ" },
  { id: "bd", name: "Bình Dương" },
  { id: "dak", name: "Đắk Lắk" },
] as const;

export type ProvinceId = (typeof PROVINCES)[number]["id"];
