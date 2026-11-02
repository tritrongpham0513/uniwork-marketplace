export interface JobItem {
  id: string;
  title: string;
  company: string;
  category: string;
  logoBg: string;
  logoLetter: string;
  location: string;
  salary: string;
  period: string;
  shifts: string[];
  tags: string[];
  verified: boolean;
  postedAgo: string;
  urgent?: boolean;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  jobCount: number;
  salaryRange: string;
  description: string;
  popularShifts: string;
  badge?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  schoolOrOrg: string;
  content: string;
  rating: number;
  badge: string;
  income?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: "student" | "employer" | "general";
}

export const POPULAR_LOCATIONS = [
  "Tất cả địa điểm",
  "Hồ Chí Minh (Quận 1, 3, 10)",
  "TP. Thủ Đức (Làng Đại học)",
  "Hà Nội (Cầu Giấy, Nam Từ Liêm)",
  "Hà Nội (Đống Đa, Bách Khoa)",
  "Đà Nẵng (Hải Châu, Ngũ Hành Sơn)",
  "Cần Thơ (Ninh Kiều)",
  "Làm việc từ xa (Online)",
];

export const SHIFT_TYPES = [
  "Tất cả ca làm",
  "Ca sáng (07:00 - 12:00)",
  "Ca chiều (12:00 - 17:00)",
  "Ca tối (17:00 - 22:00)",
  "Ca đêm linh hoạt",
  "Cuối tuần (Thứ 7, CN)",
  "Đăng ký theo lịch rảnh",
];

export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: "fb",
    name: "F&B, Barista & Phục vụ",
    slug: "f-and-b",
    iconName: "Coffee",
    jobCount: 420,
    salaryRange: "25.000đ - 38.000đ/h",
    description: "Quán cà phê, trà sữa, chuỗi nhà hàng thức ăn nhanh",
    popularShifts: "Ca xoay 4h, ca tối",
    badge: "Hot tuyển gấp",
  },
  {
    id: "tutor",
    name: "Gia sư & Trợ giảng",
    slug: "gia-su",
    iconName: "GraduationCap",
    jobCount: 285,
    salaryRange: "60.000đ - 180.000đ/h",
    description: "Gia sư Toán/Anh, trợ giảng trung tâm IELTS, luyện thi",
    popularShifts: "Tối & Cuối tuần",
    badge: "Thu nhập cao",
  },
  {
    id: "retail",
    name: "Bán hàng & Thu ngân",
    slug: "ban-hang",
    iconName: "ShoppingBag",
    jobCount: 310,
    salaryRange: "28.000đ - 42.000đ/h",
    description: "Cửa hàng tiện lợi, siêu thị mini, shop thời trang",
    popularShifts: "Linh hoạt 3 - 5 ca/tuần",
  },
  {
    id: "marketing",
    name: "Thực tập & Văn phòng",
    slug: "thuc-tap",
    iconName: "Laptop",
    jobCount: 195,
    salaryRange: "3.5tr - 7.5tr/tháng",
    description: "Content Creator, Design, Admin, IT Fresher, Telesales",
    popularShifts: "Part-time 20h/tuần",
    badge: "Tích lũy CV",
  },
  {
    id: "event",
    name: "Sự kiện, PG/PB & MC",
    slug: "su-kien",
    iconName: "Sparkles",
    jobCount: 140,
    salaryRange: "50.000đ - 120.000đ/h",
    description: "Sự kiện triễn lãm, giới thiệu sản phẩm, hội nghị",
    popularShifts: "Thời vụ theo ngày",
  },
  {
    id: "warehouse",
    name: "Đóng gói & Kho vận",
    slug: "kho-van",
    iconName: "Package",
    jobCount: 165,
    salaryRange: "32.000đ - 48.000đ/h",
    description: "Soạn đơn hàng thương mại điện tử, kiểm đếm hàng hóa",
    popularShifts: "Ca chiều & ca tối",
  },
];

export const FEATURED_JOBS: JobItem[] = [
  {
    id: "job-1",
    title: "Nhân viên Pha chế / Barista Part-time (Được đào tạo)",
    company: "Chuỗi Cà phê Highlands Landmark",
    category: "f-and-b",
    logoBg: "bg-red-500",
    logoLetter: "HL",
    location: "Q. Bình Thạnh, TP.HCM (Gần ĐH Hutech, UEF)",
    salary: "30.000đ - 35.000đ",
    period: "giờ",
    shifts: ["Ca sáng", "Ca chiều", "Đăng ký theo tuần"],
    tags: ["Không cần kinh nghiệm", "Phụ cấp gửi xe", "Bao thức uống"],
    verified: true,
    postedAgo: "2 giờ trước",
    urgent: true,
  },
  {
    id: "job-2",
    title: "Trợ giảng tiếng Anh IELTS (Hỗ trợ chấm bài & luyện Speaking)",
    company: "Trung tâm Anh ngữ The IELTS Workshop",
    category: "gia-su",
    logoBg: "bg-blue-600",
    logoLetter: "TIW",
    location: "Cầu Giấy, Hà Nội (Gần ĐH Quốc Gia, Sư Phạm)",
    salary: "65.000đ - 90.000đ",
    period: "giờ",
    shifts: ["Tối 18h - 21h", "Thứ 7 & CN"],
    tags: ["IELTS 7.0+", "Môi trường học thuật", "Cấp chứng nhận"],
    verified: true,
    postedAgo: "4 giờ trước",
    urgent: true,
  },
  {
    id: "job-3",
    title: "Thực tập sinh Content Marketing & Social Media (Có trợ cấp)",
    company: "Công ty Cổ phần Truyền thông GenZ Media",
    category: "thuc-tap",
    logoBg: "bg-violet-600",
    logoLetter: "GZ",
    location: "Q.3, TP.HCM / Có hỗ trợ Hybrid 2 ngày/tuần",
    salary: "3.500.000đ - 5.000.000đ",
    period: "tháng",
    shifts: ["Linh động 20h/tuần", "Off ngày thi"],
    tags: ["Dấu mộc thực tập", "Đào tạo TikTok/Reels", "Có mentor 1-1"],
    verified: true,
    postedAgo: "Hôm nay",
  },
  {
    id: "job-4",
    title: "Nhân viên Bán hàng & Thu ngân Cửa hàng tiện lợi",
    company: "Circle K Vietnam Express",
    category: "ban-hang",
    logoBg: "bg-amber-600",
    logoLetter: "CK",
    location: "TP. Thủ Đức (Khu Làng Đại Học Quốc Gia)",
    salary: "28.000đ - 34.000đ",
    period: "giờ",
    shifts: ["Ca 4 tiếng", "Ca đêm (+30% lương)"],
    tags: ["Làm gần KTX", "Nhận lương tuần", "Thưởng lễ tết"],
    verified: true,
    postedAgo: "1 ngày trước",
  },
  {
    id: "job-5",
    title: "Cộng tác viên Sự kiện Cuối tuần (Check-in & Hướng dẫn khách)",
    company: "Vietnam Expo & Event Services",
    category: "su-kien",
    logoBg: "bg-emerald-600",
    logoLetter: "VE",
    location: "Trung tâm Hội chợ SECC, Quận 7, TP.HCM",
    salary: "350.000đ - 500.000đ",
    period: "ngày (ca 7 tiếng)",
    shifts: ["Thứ 7 & Chủ Nhật"],
    tags: ["Bao cơm trưa", "Thanh toán ngay trong ngày", "Đồng phục cấp"],
    verified: true,
    postedAgo: "1 ngày trước",
    urgent: true,
  },
  {
    id: "job-6",
    title: "Gia sư Kèm Toán & Khoa học Tự nhiên Lớp 7-9",
    company: "CLB Gia sư Sinh viên Bách Khoa",
    category: "gia-su",
    logoBg: "bg-indigo-600",
    logoLetter: "BK",
    location: "Quận Hai Bà Trưng, Hà Nội",
    salary: "140.000đ - 180.000đ",
    period: "buổi (2 giờ)",
    shifts: ["Tối 19h30 - 21h30"],
    tags: ["Gần ĐH Bách Khoa", "Gia đình thân thiện", "Thanh toán 2 tuần/lần"],
    verified: true,
    postedAgo: "2 ngày trước",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    name: "Nguyễn Minh Thư",
    role: "Sinh viên năm 3",
    avatarBg: "bg-pink-500",
    schoolOrOrg: "ĐH Kinh Tế TP.HCM (UEH)",
    content:
      "Trước đây mình xin việc qua mấy group Facebook toàn bị lừa tiền cọc giữ áo với tài liệu 300k. Nhờ UniWork, việc làm được thẩm định rõ ràng, mình làm Barista 16 tiếng/tuần vừa đủ trả tiền trọ mà lịch làm đổi theo lịch thi rất thoải mái!",
    rating: 5,
    badge: "Đã đi làm 8 tháng",
    income: "Kiếm thêm ~3.8tr/tháng",
  },
  {
    id: "test-2",
    name: "Trần Hoàng Nam",
    role: "Sinh viên năm 2",
    avatarBg: "bg-sky-500",
    schoolOrOrg: "ĐH Bách Khoa Hà Nội",
    content:
      "Bộ lọc ca làm theo lịch rảnh trên UniWork đúng là cứu tinh. Mình chỉ rảnh tối thứ 3, 5 và ngày Chủ Nhật, vậy mà vẫn tìm được lớp làm trợ giảng Toán gần trường với mức thù lao rất xứng đáng, không hề sợ bị bùng lương.",
    rating: 5,
    badge: "Đã hoàn thành 3 ca dạy",
    income: "Kiếm thêm ~4.5tr/tháng",
  },
  {
    id: "test-3",
    name: "Anh Vũ Đình Khoa",
    role: "Quản lý chuỗi Cửa hàng",
    avatarBg: "bg-amber-600",
    schoolOrOrg: "Katinat & The Daily Brew",
    content:
      "Trước đây tuyển part-time qua mạng hay bị bùng ca phút chót. Từ khi dùng UniWork, các bạn sinh viên apply đều có hồ sơ minh bạch, xem được trường lớp và lịch học nên tỷ lệ gắn bó lâu dài cao hơn hẳn. Đăng tin 2 tiếng là đủ người!",
    rating: 5,
    badge: "Nhà tuyển dụng kim cương",
    income: "Đã tuyển 45+ nhân sự",
  },
];

export const FAQS: FaqItem[] = [
  {
    question: "Sinh viên năm nhất chưa có kinh nghiệm có tìm được việc không?",
    answer:
      "Hoàn toàn được! Trên UniWork có hơn 70% tin tuyển dụng không yêu cầu kinh nghiệm trước, chỉ cần bạn nhiệt tình, đúng giờ và ham học hỏi. Các nhà tuyển dụng cam kết có buổi hướng dẫn đào tạo việc ban đầu miễn phí.",
    category: "student",
  },
  {
    question: "Tôi có phải nộp tiền cọc, giữ giấy tờ gốc hay phí trung gian không?",
    answer:
      "TUYỆT ĐỐI KHÔNG. UniWork hoạt động theo nguyên tắc 100% miễn phí cho sinh viên. Chúng tôi cấm tuyệt đối mọi hành vi thu tiền đặt cọc giữ chỗ, tiền làm hồ sơ hay giữ bằng cấp/CCCD gốc. Nếu phát hiện nhà tuyển dụng vi phạm, hệ thống sẽ xử lý và hỗ trợ sinh viên ngay.",
    category: "student",
  },
  {
    question: "Nếu bận thi học kỳ hoặc lịch học thay đổi, tôi có thể đổi ca được không?",
    answer:
      "Tất cả công việc part-time sinh viên trên UniWork đều theo cơ chế đăng ký lịch hàng tuần. Bạn chỉ cần báo trước quản lý theo quy định (thường từ 2-3 ngày) để đổi ca hoặc sắp xếp người thay thế mà không lo bị trừ lương.",
    category: "student",
  },
  {
    question: "Doanh nghiệp / Quán cần gì để đăng tin tuyển dụng sinh viên?",
    answer:
      "Doanh nghiệp chỉ cần tạo tài khoản Nhà tuyển dụng, cung cấp thông tin liên hệ và giấy phép kinh doanh (hoặc chứng minh địa điểm kinh doanh). Đội ngũ UniWork sẽ xác thực tài khoản trong vòng 1-2 giờ làm việc để tin đăng hiển thị ngay.",
    category: "employer",
  },
  {
    question: "Sau khi bấm ứng tuyển, bao lâu thì tôi nhận được phản hồi?",
    answer:
      "Nhà tuyển dụng trên UniWork cam kết phản hồi hồ sơ trong vòng 24 - 48 giờ. Bạn sẽ nhận được thông báo trạng thái hồ sơ trực tiếp qua website và email đã đăng ký.",
    category: "general",
  },
];

export const SAFETY_PERKS = [
  {
    title: "100% Xác thực danh tính & Doanh nghiệp",
    desc: "Mọi nhà tuyển dụng đều phải cung cấp mã số thuế hoặc giấy phép kinh doanh hợp pháp trước khi đăng tin.",
    icon: "ShieldCheck",
  },
  {
    title: "Cam kết 0đ Phí cọc & Giữ giấy tờ",
    desc: "Nói KHÔNG với các bẫy cọc tiền, mua đồng phục giá cắt cổ, giữ CCCD gốc hoặc dụ dỗ tham gia đa cấp trá hình.",
    icon: "Lock",
  },
  {
    title: "Minh bạch mức lương & Giờ công",
    desc: "Công khai mức thù lao theo giờ, chu kỳ thanh toán (theo tuần/tháng) và hợp đồng lao động thời vụ rõ ràng.",
    icon: "BadgeCheck",
  },
  {
    title: "Cộng đồng đánh giá 2 chiều minh bạch",
    desc: "Sinh viên được quyền để lại review thực tế về môi trường làm việc sau khi kết thúc ca làm.",
    icon: "Star",
  },
];

