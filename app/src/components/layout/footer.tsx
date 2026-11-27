import { Link } from "react-router";
import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { PATHS } from "@/config/paths";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Logo & Giới thiệu */}
          <div className="space-y-4 lg:col-span-2">
            <Link to={PATHS.HOME} className="flex items-center gap-2.5">
              <img
                src="/favicon.png"
                alt="VieJob"
                className="size-9 shrink-0 rounded-xl object-contain shadow-xs"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Vie<span className="text-primary">Job</span>
                </span>
                <span className="-mt-1 text-[10px] font-medium text-muted-foreground">
                  Nền tảng việc làm sinh viên thế hệ mới
                </span>
              </div>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Cầu nối minh bạch, an toàn giữa sinh viên các trường Đại học/Cao
              đẳng với hàng nghìn doanh nghiệp, chuỗi dịch vụ uy tín. Cam kết
              100% không thu phí đặt cọc.
            </p>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-primary" />
                <span>Khu Công nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-primary" />
                <span>Hotline hỗ trợ sinh viên: 1900 6868 (8:00 - 21:00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0 text-primary" />
                <span>support@viejob.vn</span>
              </div>
            </div>
          </div>

          {/* Dành cho sinh viên */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Dành cho Sinh viên
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {[
                "Tìm việc part-time theo ca",
                "Việc làm gần Làng Đại học",
                "Việc F&B & Quán Cafe",
                "Gia sư & Trợ giảng tiếng Anh",
                "Thực tập sinh có lương",
              ].map((label) => (
                <li key={label}>
                  <Link
                    to={PATHS.JOBS.ROOT}
                    className="transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Dành cho nhà tuyển dụng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Dành cho Doanh nghiệp
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {[
                "Đăng tin tuyển dụng nhanh",
                "Tuyển nhân sự part-time theo giờ",
                "Quy trình xác minh doanh nghiệp",
                "Quy chế chấm công & đánh giá",
              ].map((label) => (
                <li key={label}>
                  <Link
                    to={PATHS.AUTH.REGISTER}
                    className="transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cam kết & Pháp lý */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Cam kết & Bảo vệ
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Tiêu chuẩn VieJob Shield™
              </li>
              {[
                "Chính sách không thu cọc",
                "Điều khoản sử dụng",
                "Chính sách bảo mật dữ liệu",
                "Báo cáo tin tuyển dụng xấu",
              ].map((label) => (
                <li key={label}>
                  <Link
                    to={PATHS.ABOUT}
                    className="cursor-pointer transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} VieJob Marketplace. Bản quyền thuộc về
            đội ngũ phát triển VieJob.
          </p>
          <div className="flex items-center gap-4">
            <span>Bảo vệ quyền lợi sinh viên 24/7</span>
            <span aria-hidden>•</span>
            <span>Tối ưu cho cả thiết bị di động</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
