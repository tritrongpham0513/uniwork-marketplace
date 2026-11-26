import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  EmployerProfile,
  SalaryComparison,
} from "@/features/shared/types";

interface JobTrustInfoProps {
  /** Kết quả so sánh lương với bảng xếp hạng — null khi không có căn cứ. */
  comparison: SalaryComparison | null;
  /**
   * Điểm uy tín + trạng thái xác minh của nhà tuyển dụng.
   *
   * <p>Tuỳ chọn: thẻ tin trong danh sách không có dữ liệu này (tải hồ sơ cho
   * từng tin sẽ tốn N request) — chỉ dialog xem nội dung mới tải. Khi thiếu,
   * giao diện chỉ hiện trạng thái xác minh.
   */
  trust?: EmployerProfile;
  /** Nhà tuyển dụng đã xác minh (lấy từ tóm tắt trên tin tuyển dụng). */
  verified: boolean;
}

/** Nhãn + màu cho mức so sánh lương. */
const VERDICT_META: Record<
  SalaryComparison["verdict"],
  { label: string; className: string }
> = {
  ABOVE: { label: "Lương cao hơn trung bình", className: "text-primary" },
  BELOW: { label: "Lương thấp hơn trung bình", className: "text-destructive" },
  AVERAGE: { label: "Lương đúng mức trung bình", className: "text-foreground" },
};

/**
 * Dòng thông tin giúp quản trị viên đối chiếu tin tuyển dụng với dữ liệu
 * thị trường và uy tín nhà tuyển dụng.
 *
 * <p>Đây là dữ liệu tham chiếu cho con người — AI dùng chính những dữ liệu
 * này để suy luận mã `SALARY_ANOMALY`.
 */
export function JobTrustInfo({
  comparison,
  trust,
  verified,
}: JobTrustInfoProps) {
  const verdictMeta = comparison ? VERDICT_META[comparison.verdict] : null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {comparison && verdictMeta && (
        <span className="inline-flex items-center gap-1.5">
          <span className={verdictMeta.className}>{verdictMeta.label}</span>
          <span>
            (Top {comparison.percentile}% · trung bình{" "}
            {Math.round(comparison.benchmark.avgHourly).toLocaleString("vi-VN")}
            đ/giờ
            {comparison.diff !== 0 && (
              <>
                {" · "}
                {comparison.diff > 0 ? "+" : ""}
                {Math.round(comparison.diff).toLocaleString("vi-VN")}đ/giờ
              </>
            )}
            )
          </span>
        </span>
      )}

      {!comparison && <span>Chưa có bảng xếp hạng lương để so sánh</span>}

      <span className="inline-flex items-center gap-1.5">
        {verified ? (
          <BadgeCheck className="size-3.5 text-primary" />
        ) : (
          <ShieldCheck className="size-3.5 text-muted-foreground" />
        )}
        {verified
          ? "Nhà tuyển dụng đã xác minh"
          : "Nhà tuyển dụng chưa xác minh"}
        {trust && trust.ratingCount > 0 && (
          <>
            {" · "}
            <Badge variant="secondary" className="text-[10px]">
              {trust.avgRating.toFixed(1)}/5 ({trust.ratingCount} đánh giá)
            </Badge>
          </>
        )}
      </span>
    </div>
  );
}

export default JobTrustInfo;
