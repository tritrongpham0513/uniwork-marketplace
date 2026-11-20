/**
 * Tài khoản demo hiển thị trên form đăng nhập.
 *
 * Dữ liệu demo được seed bởi backend (migration `V3__seed_demo_data.sql`) và
 * mật khẩu được băm BCrypt lúc khởi động app (`DemoAccountInitializer`).
 *
 * Lưu ý: đây chỉ là **hằng số hiển thị** — không dùng để bypass xác thực.
 */
export const DEMO_ACCOUNTS = [
  {
    email: "student@viejob.vn",
    password: "Student@123",
    role: "Sinh viên",
  },
  {
    email: "employer@viejob.vn",
    password: "Employer@123",
    role: "Nhà tuyển dụng",
  },
  {
    email: "admin@viejob.vn",
    password: "Admin@123",
    role: "Quản trị viên",
  },
] as const;

export type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
