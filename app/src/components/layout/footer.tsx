import { Link } from "react-router";
import { Briefcase, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { PATHS } from "@/config/paths";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo & Giới thiệu */}
          <div className="lg:col-span-2 space-y-4">
            <Link to={PATHS.HOME} className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Briefcase className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Uni<span className="text-amber-500">Work</span>
                </span>
                <span className="text-[10px] font-medium text-muted-foreground -mt-1">
                  Nền tảng việc làm sinh viên thế hệ mới
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Cầu nối minh bạch, an toàn giữa sinh viên các trường Đại học/Cao đẳng với hàng nghìn doanh nghiệp, chuỗi dịch vụ uy tín. Cam kết 100% không thu phí đặt cọc.
            </p>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-amber-500 shrink-0" />
                <span>Khu Công nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-amber-500 shrink-0" />
                <span>Hotline hỗ trợ sinh viên: 1900 6868 (8:00 - 21:00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-amber-500 shrink-0" />
                <span>support@uniwork.vn</span>
              </div>
            </div>
          </div>

          {/* Dành cho sinh viên */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Dành cho Sinh viên
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Tìm việc part-time theo ca
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Việc làm gần Làng Đại học
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Việc F&B & Quán Cafe
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Gia sư & Trợ giảng tiếng Anh
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Thực tập sinh có lương
                </Link>
              </li>
            </ul>
          </div>

          {/* Dành cho nhà tuyển dụng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Dành cho Doanh nghiệp
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Đăng tin tuyển dụng nhanh
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Tuyển nhân sự part-time theo giờ
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Quy trình xác minh doanh nghiệp
                </Link>
              </li>
              <li>
                <Link to={PATHS.AUTH.REGISTER} className="hover:text-amber-500 transition-colors">
                  Quy chế chấm công & đánh giá
                </Link>
              </li>
            </ul>
          </div>

          {/* Cam kết & Pháp lý */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Cam kết & Bảo vệ
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="size-3.5" />
                Tiêu chuẩn UniWork Shield™
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer">
                  Chính sách không thu cọc
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer">
                  Điều khoản sử dụng
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer">
                  Chính sách bảo mật dữ liệu
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer">
                  Báo cáo tin tuyển dụng xấu
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} UniWork Marketplace. Bản quyền thuộc về đội ngũ phát triển UniWork.</p>
          <div className="flex items-center gap-4">
            <span>Bảo vệ quyền lợi sinh viên 24/7</span>
            <span>•</span>
            <span>Tối ưu cho cả thiết bị di động</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default Footer;

