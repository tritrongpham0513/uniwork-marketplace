import {
  ShieldCheck,
  Lock,
  Coins,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

export function SafetyGuaranteeSection() {
  const PILLARS = [
    {
      icon: Lock,
      title: "0đ Phí đặt cọc & Đồng phục",
      description:
        "Nghiêm cấm mọi hành vi thu tiền đặt cọc giữ chỗ, phí tài liệu, tiền may đồng phục hoặc bất kỳ khoản phí phát sinh vô lý nào.",
      highlight: "Hoàn toàn miễn phí",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: ShieldCheck,
      title: "100% Xác thực Nhà tuyển dụng",
      description:
        "Mọi tài khoản tuyển dụng đều phải xác thực giấy phép ĐKKD hoặc địa chỉ thực tế và CCCD người đại diện trước khi được duyệt đăng tin.",
      highlight: "Không việc ma, đa cấp",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: FileCheck,
      title: "Linh hoạt tuyệt đối theo lịch thi",
      description:
        "Cam kết quyền ưu tiên lịch học. Sinh viên được phép đổi ca, báo nghỉ ôn thi học kỳ theo quy chế minh bạch mà không bị trừ lương.",
      highlight: "Ưu tiên việc học",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: Coins,
      title: "Minh bạch công nhật & Chống bùng lương",
      description:
        "Bảng chấm công điện tử lưu lại số giờ thực làm. Đội ngũ UniWork trực tiếp hỗ trợ khiếu nại và đòi quyền lợi nếu phát sinh chậm lương.",
      highlight: "Đảm bảo quyền lợi",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-muted/30 p-6 sm:p-10 lg:p-12 shadow-sm">
        {/* Glow */}
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" />
            Tiêu chuẩn an toàn UniWork Shield™
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Xóa bỏ hoàn toàn nỗi lo bị lừa đảo khi tìm việc làm thêm
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Chúng tôi hiểu rằng sinh viên rất dễ trở thành mục tiêu của các bẫy cọc tiền hoặc đa cấp. Tại UniWork, sự an toàn và uy tín được đặt lên hàng đầu.
          </p>
        </div>

        {/* 4 Trụ cột cam kết */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-6 backdrop-blur-xs transition-all hover:border-border hover:shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex size-11 items-center justify-center rounded-2xl border ${pillar.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[11px] font-bold rounded-full bg-muted px-2.5 py-1 text-foreground">
                    {pillar.highlight}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Hotline báo cáo sai phạm */}
        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-xs">
              <AlertTriangle className="size-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-foreground">
                Gặp tin tuyển dụng nghi vấn thu tiền hoặc ép mua hàng?
              </span>
              <p className="text-muted-foreground mt-0.5">
                Bấm nút &quot;Báo cáo vi phạm&quot; dưới bất kỳ bài đăng nào, hệ thống sẽ khoá tài khoản và xử lý trong 30 phút.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-bold text-amber-500">
            Hotline hỗ trợ: 1900 6868
          </span>
        </div>
      </div>
    </section>
  );
}
