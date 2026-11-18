import type {
  AdminUser,
  EmployerProfile,
  StudentProfile,
  UserSummaryResponse,
} from "@/features/shared/types";
import { EMPLOYERS } from "./employers";
import { daysAgo } from "./time";

// ============================================
// USERS — dùng cho đăng nhập mock & màn hình Admin
// ============================================

export interface MockUser {
  id: number;
  email: string;
  password: string;
  role: "STUDENT" | "EMPLOYER" | "ADMIN";
  fullName: string;
  status: "ACTIVE" | "PENDING_VERIFY" | "LOCKED";
  phone: string;
  isLocked: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 1,
    email: "student@viejob.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Nguyễn Thanh Hà",
    status: "ACTIVE",
    phone: "0901 234 567",
    isLocked: false,
    joinedAt: daysAgo(120),
    lastLoginAt: daysAgo(1),
  },
  {
    id: 2,
    email: "employer@viejob.vn",
    password: "Employer@123",
    role: "EMPLOYER",
    fullName: "Trần Minh Khoa",
    status: "ACTIVE",
    phone: "0912 345 678",
    isLocked: false,
    joinedAt: daysAgo(200),
    lastLoginAt: daysAgo(2),
  },
  {
    id: 3,
    email: "admin@viejob.vn",
    password: "Admin@123",
    role: "ADMIN",
    fullName: "Lê Thu Hà",
    status: "ACTIVE",
    phone: "0923 456 789",
    isLocked: false,
    joinedAt: daysAgo(400),
    lastLoginAt: daysAgo(0),
  },
  {
    id: 4,
    email: "hoa.nguyen@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Nguyễn Thị Hoa",
    status: "ACTIVE",
    phone: "0934 567 890",
    isLocked: false,
    joinedAt: daysAgo(80),
    lastLoginAt: daysAgo(4),
  },
  {
    id: 5,
    email: "binh.pham@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Phạm Đức Bình",
    status: "ACTIVE",
    phone: "0945 678 901",
    isLocked: false,
    joinedAt: daysAgo(65),
    lastLoginAt: daysAgo(7),
  },
  {
    id: 6,
    email: "linh.pham@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Phạm Ngọc Linh",
    status: "ACTIVE",
    phone: "0956 789 012",
    isLocked: false,
    joinedAt: daysAgo(45),
    lastLoginAt: daysAgo(3),
  },
  {
    id: 7,
    email: "son.tran@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Trần Đức Sơn",
    status: "ACTIVE",
    phone: "0967 890 123",
    isLocked: false,
    joinedAt: daysAgo(30),
    lastLoginAt: daysAgo(9),
  },
  {
    id: 8,
    email: "mai.le@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Lê Ngọc Mai",
    status: "ACTIVE",
    phone: "0978 901 234",
    isLocked: false,
    joinedAt: daysAgo(25),
    lastLoginAt: daysAgo(6),
  },
  {
    id: 9,
    email: "quang.co@sv.edu.vn",
    password: "Student@123",
    role: "STUDENT",
    fullName: "Cổ Văn Quang",
    status: "PENDING_VERIFY",
    phone: "0989 012 345",
    isLocked: false,
    joinedAt: daysAgo(3),
    lastLoginAt: null,
  },
  {
    id: 10,
    email: "tu.an@fnb.vn",
    password: "Employer@123",
    role: "EMPLOYER",
    fullName: "An Tú",
    status: "ACTIVE",
    phone: "0901 111 222",
    isLocked: false,
    joinedAt: daysAgo(150),
    lastLoginAt: daysAgo(5),
  },
  {
    id: 11,
    email: "hai.nv@retail.vn",
    password: "Employer@123",
    role: "EMPLOYER",
    fullName: "Nguyễn Văn Hải",
    status: "ACTIVE",
    phone: "0902 222 333",
    isLocked: false,
    joinedAt: daysAgo(90),
    lastLoginAt: daysAgo(11),
  },
  {
    id: 12,
    email: "spam.user@mail.com",
    password: "Employer@123",
    role: "EMPLOYER",
    fullName: "Tài khoản vi phạm",
    status: "LOCKED",
    phone: "0903 333 444",
    isLocked: true,
    joinedAt: daysAgo(10),
    lastLoginAt: daysAgo(8),
  },
];

/** Đếm số chữ cái đầu để làm avatar */
export const getInitials = (name?: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Chuyển MockUser sang UserSummaryResponse (shape khớp backend) */
export const toUserSummary = (user: MockUser): UserSummaryResponse => ({
  id: user.id,
  email: user.email,
  role: user.role,
  fullName: user.fullName,
  status: user.status,
  emailVerifiedAt: user.status === "PENDING_VERIFY" ? null : daysAgo(1),
  authProvider: "LOCAL",
});

// ============================================
// STUDENT PROFILES
// ============================================

export const MOCK_STUDENT_PROFILES: StudentProfile[] = [
  {
    id: "stu-001",
    userId: 1,
    fullName: "Nguyễn Thanh Hà",
    phone: "0901 234 567",
    dateOfBirth: "2003-05-12",
    gender: "FEMALE",
    studentCode: "SE2001",
    university: "Đại học Bách Khoa TP.HCM",
    major: "Quản trị Kinh doanh",
    yearOfStudy: 3,
    provinceId: "hcm",
    address: "Khu đô thị Đại học Quốc Gia, Thủ Đức, TP.HCM",
    bio: "Sinh viên năm 3 ngành Quản trị Kinh doanh, có 1 năm kinh nghiệm phục vụ quán cà phê và muốn tìm việc làm thêm phù hợp lịch học.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-service", "sk-barista", "sk-excel"],
    experiences: [
      {
        id: "exp-001",
        company: "Tiệm Chè Táo Tào",
        position: "Nhân viên phục vụ",
        startDate: "2025-06-01",
        endDate: "2025-09-30",
        description: "Phục vụ khách, pha chè theo công thức, vệ sinh khu vực làm việc.",
      },
    ],
    jobPreferences: {
      categoryIds: ["cat-fnb", "cat-ban-tang"],
      employmentTypes: ["PART_TIME", "FLEXIBLE"],
      salaryMin: 25000,
      salaryMax: 45000,
      provinceIds: ["hcm"],
    },
    avgRating: 4.8,
    ratingCount: 5,
    createdAt: daysAgo(120),
  },
  {
    id: "stu-002",
    userId: 4,
    fullName: "Nguyễn Thị Hoa",
    phone: "0934 567 890",
    dateOfBirth: "2002-11-03",
    gender: "FEMALE",
    studentCode: "SE2002",
    university: "Đại học Kinh tế TP.HCM",
    major: "Marketing",
    yearOfStudy: 4,
    provinceId: "hcm",
    address: "Quận Bình Thạnh, TP.HCM",
    bio: "Yêu thích content và social media, từng làm freelancer cho nhiều thương hiệu nhỏ.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-content", "sk-excel"],
    experiences: [],
    jobPreferences: {
      categoryIds: ["cat-marketing"],
      employmentTypes: ["PART_TIME", "FLEXIBLE"],
      salaryMin: 30000,
      salaryMax: 60000,
      provinceIds: ["hcm", "hn"],
    },
    avgRating: 4.5,
    ratingCount: 2,
    createdAt: daysAgo(80),
  },
  {
    id: "stu-003",
    userId: 5,
    fullName: "Phạm Đức Bình",
    phone: "0945 678 901",
    dateOfBirth: "2003-09-18",
    gender: "MALE",
    studentCode: "SE2101",
    university: "Đại học FPT TP.HCM",
    major: "Kỹ thuật Phần mềm",
    yearOfStudy: 3,
    provinceId: "hcm",
    address: "Thủ Đức, TP.HCM",
    bio: "Sinh viên CNTT, biết React và TypeScript, muốn thực tập frontend.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-manual-test", "sk-excel"],
    experiences: [],
    jobPreferences: {
      categoryIds: ["cat-cong-nghe"],
      employmentTypes: ["PART_TIME", "FLEXIBLE"],
      salaryMin: 40000,
      salaryMax: 90000,
      provinceIds: ["hcm"],
    },
    avgRating: 5,
    ratingCount: 1,
    createdAt: daysAgo(65),
  },
  {
    id: "stu-004",
    userId: 6,
    fullName: "Phạm Ngọc Linh",
    phone: "0956 789 012",
    dateOfBirth: "2004-02-25",
    gender: "FEMALE",
    studentCode: "SE2205",
    university: "Đại học Sư phạm Kỹ thuật Hà Nội",
    major: "Sư phạm Toán",
    yearOfStudy: 2,
    provinceId: "hn",
    address: "Cầu Giấy, Hà Nội",
    bio: "Sinh viên Sư phạm Toán, có kinh nghiệm gia sư cấp THPT.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-teaching"],
    experiences: [],
    jobPreferences: {
      categoryIds: ["cat-day-hoc"],
      employmentTypes: ["FLEXIBLE", "CASUAL"],
      salaryMin: 60000,
      salaryMax: 150000,
      provinceIds: ["hn"],
    },
    avgRating: 4.7,
    ratingCount: 3,
    createdAt: daysAgo(45),
  },
  {
    id: "stu-005",
    userId: 7,
    fullName: "Trần Đức Sơn",
    phone: "0967 890 123",
    dateOfBirth: "2002-07-07",
    gender: "MALE",
    studentCode: "SE1908",
    university: "Đại học Bách Khoa TP.HCM",
    major: "Cơ khí",
    yearOfStudy: 4,
    provinceId: "hcm",
    address: "Gò Vấp, TP.HCM",
    bio: "Có thể lái xe máy, từng giao hàng cho quán cà phê trong khuôn viên trường.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-driver"],
    experiences: [],
    jobPreferences: {
      categoryIds: ["cat-giao-hang"],
      employmentTypes: ["PART_TIME", "CASUAL"],
      salaryMin: 20000,
      salaryMax: 35000,
      provinceIds: ["hcm"],
    },
    avgRating: 4.2,
    ratingCount: 2,
    createdAt: daysAgo(30),
  },
  {
    id: "stu-006",
    userId: 8,
    fullName: "Lê Ngọc Mai",
    phone: "0978 901 234",
    dateOfBirth: "2003-12-01",
    gender: "FEMALE",
    studentCode: "SE2009",
    university: "Đại học Ngoại thương TP.HCM",
    major: "Quản trị Kinh doanh",
    yearOfStudy: 3,
    provinceId: "hcm",
    address: "Quận 1, TP.HCM",
    bio: "Muốn làm thử ở cửa hàng để rèn kinh nghiệm bán hàng và dịch vụ khách hàng.",
    avatarUrl: null,
    cvUrl: null,
    skills: ["sk-service", "sk-cashier"],
    experiences: [],
    jobPreferences: {
      categoryIds: ["cat-ban-tang", "cat-fnb"],
      employmentTypes: ["PART_TIME"],
      salaryMin: 25000,
      salaryMax: 40000,
      provinceIds: ["hcm"],
    },
    avgRating: 4.4,
    ratingCount: 1,
    createdAt: daysAgo(25),
  },
];

// ============================================
// EMPLOYER PROFILES
// ============================================

export const MOCK_EMPLOYER_PROFILES: EmployerProfile[] = [
  {
    id: "emp-viejob-demo",
    userId: 2,
    employerType: "COMPANY",
    displayName: "Công ty Cổ phần VieJob Demo",
    contactName: "Trần Minh Khoa",
    contactPhone: "0912 345 678",
    taxCode: "0319635156",
    description:
      "Chuỗi cà phê và nhà hàng với hệ thống 8 chi nhánh tại TP.HCM. Chúng tôi thường xuyên tuyển sinh viên làm thêm theo ca linh hoạt, đào tạo bài bản và trả lương đúng hẹn.",
    logoUrl: null,
    website: "https://viejob-demo.vn",
    provinceId: "hcm",
    address: "89 Phan Đình Phùng, Phú Nhuận, TP.HCM",
    isVerified: true,
    avgRating: 4.6,
    ratingCount: 12,
    createdAt: daysAgo(200),
  },
  ...EMPLOYERS.filter((e) => e.id !== "emp-viejob-demo").map((e, index) => ({
    id: e.id,
    userId: 10 + index,
    employerType: (index % 4 === 3 ? "INDIVIDUAL" : "COMPANY") as
      | "COMPANY"
      | "INDIVIDUAL",
    displayName: e.name,
    contactName: e.name,
    contactPhone: "0900 000 00" + index,
    taxCode: index % 4 === 3 ? null : `0${310000000 + index}`,
    description: `${e.name} đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.`,
    logoUrl: null,
    website: null,
    provinceId: index % 2 === 0 ? "hcm" : "hn",
    address: "Địa chỉ trụ sở",
    isVerified: e.verified,
    avgRating: Number((3.9 + (index % 12) * 0.08).toFixed(1)),
    ratingCount: 3 + index,
    createdAt: daysAgo(150 - index * 5),
  })),
];

// ============================================
// ADMIN USERS VIEW
// ============================================

export const toAdminUser = (
  user: MockUser,
  jobs = 0,
  applications = 0
): AdminUser => {
  const student = MOCK_STUDENT_PROFILES.find((p) => p.userId === user.id);
  const employer = MOCK_EMPLOYER_PROFILES.find((p) => p.userId === user.id);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    status: user.status,
    emailVerifiedAt: user.status === "PENDING_VERIFY" ? null : daysAgo(1),
    authProvider: "LOCAL",
    phone: user.phone,
    companyName: employer?.displayName ?? null,
    university: student?.university ?? null,
    isLocked: user.isLocked,
    joinedAt: user.joinedAt,
    lastLoginAt: user.lastLoginAt,
    totalApplications: applications,
    totalJobs: jobs,
  };
};
