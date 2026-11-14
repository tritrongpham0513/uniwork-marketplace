import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PATHS } from "@/config/paths";

/** Lý do nên chọn VieJob */
const REASONS = [
  {
    icon: Search,
    title: "Tìm việc đúng chuyên ngành",
    description:
      "Bộ lọc theo nhóm việc, vị trí công việc chi tiết, quận/huyện và mức lương — chỉ hiện tin phù hợp với lịch học của bạn.",
  },
  {
    icon: Wallet,
    title: "Xếp hạng lương minh bạch",
    description:
      "Mỗi tin tuyển dụng đều có xếp hạng lương so với trung bình ngành, dựa trên dữ liệu 3 tháng gần nhất.",
  },
  {
    icon: ShieldCheck,
    title: "Nhà tuyển dụng được xác minh",
    description:
      "Hồ sơ doanh nghiệp có MST, người liên hệ và hình thức hoạt động đều được kiểm tra trước khi hiển thị nút xác minh.",
  },
  {
    icon: BookOpenCheck,
    title: "Lịch làm linh hoạt",
    description:
      "Xem rõ ca sáng, ca chiều, ca tối trước khi ứng tuyển. Đăng ký theo tuần, không cam kết cố định.",
  },
  {
    icon: Handshake,
    title: "Đánh giá 2 chiều",
    description:
      "Cả sinh viên và nhà tuyển dụng đều có thể đánh giá nhau sau khi công việc hoàn thành — minh bạch từ cả hai phía.",
  },
  {
    icon: Sparkles,
    title: "Ứng tuyển nhanh bằng hồ sơ",
    description:
      "Tạo hồ sơ một lần, ứng tuyển vào nhiều tin chỉ với vài cú chạm. Không cần tải lại CV mỗi lần.",
  },
];

/** Cam kết 2 chiều */
const COMMITMENTS = {
  student: {
    title: "Cam kết dành cho sinh viên",
    icon: GraduationCap,
    items: [
      "100% miễn phí — không mất bất kỳ khoản phí đăng hồ sơ hay ứng tuyển nào.",
      "Không yêu cầu đặt cọc, không thu phí đào tạo, không thu phí thiết bị.",
      "Thông tin nhà tuyển dụng luôn hiển thị trạng thái xác minh để bạn chủ động lựa chọn.",
      "Báo cáo nhanh khi phát hiện tin tuyển dụng lừa đảo hoặc mức lương không đúng thực tế.",
    ],
  },
  employer: {
    title: "Cam kết dành cho nhà tuyển dụng",
    icon: Building2,
    items: [
      "Duyệt hồ sơ trước khi phỏng vấn, không bắt buộc đi làm thử không hưởng lương.",
      "Nhận đánh giá công khai từ sinh viên để cải thiện quy trình tuyển dụng.",
      "Trả phí đăng tin minh bạch, không phí ẩn cho quảng cáo hay ưu tiên vị trí.",
      "Quản trị viên kiểm duyệt mọi tin đăng trước khi hiển thị công khai.",
    ],
  },
} as const;

/** Tiêu chuẩn VieJob Shield */
const STANDARDS = [
  {
    icon: BadgeCheck,
    title: "Xác minh 2 chiều",
    description:
      "Sinh viên xác minh email và mã số sinh viên. Nhà tuyển dụng xác minh MST hoặc CMND.",
  },
  {
    icon: Wallet,
    title: "Lương minh bạch",
    description:
      "Mọi tin đăng phải khai báo mức lương và loại hình trả lương trước khi được duyệt.",
  },
  {
    icon: Users,
    title: "Đánh giá có kiểm chứng",
    description:
      "Chỉ những đơn ứng tuyển đã hoàn thành mới được đánh giá, tránh đánh giá ảo.",
  },
  {
    icon: HeartHandshake,
    title: "Hỗ trợ khiếu nại",
    description:
      "Kênh báo cáo nội bộ, xử lý vi phạm và gỡ tin đăng trong thời gian sớm nhất.",
  },
];

/** Cảm nhận từ sinh viên */
const TESTIMONIALS = [
  {
    name: "Nguyễn Thanh Hà",
    role: "Sinh viên Quản trị Kinh doanh — ĐH Bách Khoa TP.HCM",
    rating: 5,
    content:
      "Mình tìm được việc phục vụ cuối tuần ngay tuần đầu dùng VieJob. Phần lương và ca làm được ghi rõ ngay từ đầu nên không mất thời gian đi hỏi lại.",
  },
  {
    name: "Phạm Ngọc Linh",
    role: "Sinh viên Sư phạm Toán — ĐH Sư phạm Kỹ thuật Hà Nội",
    rating: 5,
    content:
      "Tính năng xếp hạng lương rất hữu ích. Mình so được mức lương của tin gia sư với trung bình ngành trước khi ứng tuyển nên không bị hứa hẹn sai.",
  },
  {
    name: "Phạm Đức Bình",
    role: "Sinh viên Kỹ thuật Phần mềm — ĐH FPT",
    rating: 4,
    content:
      "Ứng tuyển bằng hồ sơ có sẵn rất nhanh, không cần chuẩn bị CV mới mỗi lần. Hồ sơ của nhà tuyển dụng cũng hiển thị rõ đã xác minh hay chưa.",
  },
];

const STATS = [
  { value: "1.200+", label: "Sinh viên đã đăng ký" },
  { value: "3.400+", label: "Tin tuyển dụng đang mở" },
  { value: "8", label: "Nhóm việc đa dạng" },
  { value: "6", label: "Tỉnh/thành phổ trọng điểm" },
];

export default function AboutPage() {
  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="size-3" />
              Về VieJob Marketplace
            </Badge>

            <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Cầu nối giữa sinh viên và{" "}
              <span className="text-primary">việc làm bán thời gian</span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              VieJob được xây dựng cho sinh viên cần thu nhập thêm mà vẫn giữ
              được lịch học, và cho các doanh nghiệp cần tuyển người linh hoạt
              mà vẫn đảm bảo chất lượng ứng viên.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link to={PATHS.JOBS.ROOT} />}>
                <Search className="size-4" />
                Tìm việc làm
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link to={PATHS.AUTH.REGISTER} />}
              >
                Tạo tài khoản miễn phí
              </Button>
            </div>
          </div>

          {/* Thống kê */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.label} size="sm" className="border-border/60 bg-card/70 text-center">
                <CardContent className="p-5">
                  <p className="font-heading text-2xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LÝ DO CHỌN VIEJOB */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Vì sao nên chọn VieJob
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Mọi tính năng đều được thiết kế xoay quanh hai bên: sinh viên và
            nhà tuyển dụng.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason) => {
            const Icon = reason.icon;
            return (
              <Card key={reason.title} className="border-border/60">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="font-heading text-base">
                    {reason.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {reason.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CAM KẾT 2 CHIỀU */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cam kết an toàn 2 chiều
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Chúng tôi bảo vệ cả người tìm việc lẫn người tuyển dụng trên mọi
              giao dịch.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {Object.values(COMMITMENTS).map((commitment) => {
              const Icon = commitment.icon;
              return (
                <Card key={commitment.title} className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="font-heading text-base">
                        {commitment.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {commitment.items.map((item) => (
                        <li key={item} className="flex gap-2.5 text-sm">
                          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* TIÊU CHUẨN VIEJOB SHIELD */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="size-3" />
            Tiêu chuẩn VieJob Shield
          </Badge>
          <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bốn tiêu chuẩn cho mọi giao dịch
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STANDARDS.map((standard) => {
            const Icon = standard.icon;
            return (
              <Card key={standard.title} size="sm" className="border-border/60">
                <CardContent className="space-y-3 p-5">
                  <Icon className="size-6 text-primary" />
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {standard.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {standard.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CẢM NHẬN */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sinh viên nói gì về VieJob
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="border-border/60">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={
                          index < testimonial.rating
                            ? "size-4 fill-primary text-primary"
                            : "size-4 fill-transparent text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    “{testimonial.content}”
                  </p>

                  <Separator />

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Bắt đầu tìm việc làm ngay hôm nay
              </h2>
              <CardDescription className="mx-auto mt-3 max-w-xl text-sm">
                Tạo hồ sơ miễn phí, ứng tuyển vào các tin tuyển dụng đang mở và
                theo dõi trạng thái ứng tuyển ngay trên VieJob.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link to={PATHS.AUTH.REGISTER} />}>
                Đăng ký sinh viên
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link to={PATHS.AUTH.LOGIN} />}
              >
                Tôi đã có tài khoản
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
