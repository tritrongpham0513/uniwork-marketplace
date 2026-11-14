import { useMemo, useState } from "react";
import { Briefcase, FileText, MessageSquare, Send, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout, navItem } from "@/components/layout/dashboard-layout";
import { RatingStars } from "@/components/shared/rating-stars";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { useEmployerProfile } from "@/features/profile/hooks";
import { useReplyReview, useReviews } from "@/features/reviews/hooks";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";
import type { Review } from "@/features/shared/types";

/** Tính phân bố số sao 1–5 */
const buildDistribution = (reviews: Review[]) => {
  const distribution = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    const index = Math.min(5, Math.max(1, review.rating)) - 1;
    distribution[index] += 1;
  }
  return distribution;
};

export default function EmployerReviewsPage() {
  const { data: profile } = useEmployerProfile();
  const {
    data: allReviews = [],
    isPending,
    isError,
    refetch,
  } = useReviews({ targetType: "EMPLOYER" });
  const replyReview = useReplyReview();

  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  const reviews = useMemo(
    () => allReviews.filter((review) => review.targetUserId === profile?.userId),
    [allReviews, profile]
  );

  const distribution = useMemo(() => buildDistribution(reviews), [reviews]);
  const total = reviews.length;

  const handleReply = async () => {
    if (!replyTarget) return;
    if (!replyText.trim()) {
      toast.warning("Vui lòng nhập nội dung trả lời.");
      return;
    }

    try {
      await replyReview.mutateAsync({ id: replyTarget.id, reply: replyText.trim() });
      toast.success("Đã gửi trả lời đánh giá.");
      setReplyTarget(null);
      setReplyText("");
    } catch (error) {
      showApiError(error);
    }
  };

  const navItems = [
    navItem("Bảng điều khiển", PATHS.EMPLOYER.ROOT, FileText),
    navItem("Tin tuyển dụng", PATHS.EMPLOYER.JOBS, Briefcase),
    navItem("Ứng viên", PATHS.EMPLOYER.APPLICATIONS, Users),
    navItem("Đánh giá", PATHS.EMPLOYER.REVIEWS, Star),
    navItem("Thông tin tổ chức", PATHS.EMPLOYER.ORGANIZATION, Users),
  ];

  return (
    <DashboardLayout
      role="EMPLOYER"
      title="Đánh giá từ sinh viên"
      description="Những đánh giá này hiển thị công khai trên hồ sơ tổ chức của bạn."
      navItems={navItems}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* TỔNG QUAN */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Điểm đánh giá trung bình
              </CardTitle>
              <CardDescription>
                {total > 0
                  ? `${total} đánh giá từ sinh viên`
                  : "Chưa có đánh giá nào"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-5xl font-bold tracking-tight text-primary tabular-nums">
                  {(profile?.avgRating ?? 0).toFixed(1)}
                </span>
                <div>
                  <RatingStars value={profile?.avgRating ?? 0} size="md" />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    trên 5 sao
                  </p>
                </div>
              </div>

              {total > 0 && (
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = distribution[star - 1];
                    const percent =
                      total > 0 ? Math.round((count / total) * 100) : 0;

                    return (
                      <div key={star} className="flex items-center gap-2.5">
                        <span className="w-8 text-xs text-muted-foreground tabular-nums">
                          {star} sao
                        </span>
                        <Progress value={percent} className="flex-1 gap-1" />
                        <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* DANH SÁCH ĐÁNH GIÁ */}
        <div className="lg:col-span-2">
          {isPending && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Không tải được danh sách đánh giá"
              onRetry={() => void refetch()}
            />
          )}

          {!isPending && !isError && reviews.length === 0 && (
            <EmptyState
              icon="inbox"
              title="Chưa có đánh giá nào"
              description="Đánh giá sẽ xuất hiện sau khi bạn hoàn thành công việc với sinh viên."
            />
          )}

          {!isPending && !isError && reviews.length > 0 && (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <Card className="border-border/60">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                            {review.fromName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {review.fromName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {review.jobTitle
                                ? `Vị trí: ${review.jobTitle}`
                                : "Đánh giá tổng quát"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <RatingStars value={review.rating} />
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-muted-foreground">
                        “{review.comment}”
                      </p>

                      {review.reply && (
                        <div className="rounded-lg border-l-2 border-primary bg-muted/40 p-3">
                          <p className="mb-1 text-xs font-semibold text-primary">
                            Phản hồi của bạn
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {review.reply}
                          </p>
                        </div>
                      )}

                      {!review.reply && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyTarget(review);
                            setReplyText("");
                          }}
                        >
                          <MessageSquare className="size-4" />
                          Trả lời
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={replyTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReplyTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Trả lời đánh giá</DialogTitle>
          </DialogHeader>

          {replyTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <RatingStars value={replyTarget.rating} className="mb-1.5" />
                <p className="text-sm text-muted-foreground">
                  “{replyTarget.comment}”
                </p>
              </div>

              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Viết phản hồi của bạn tới sinh viên..."
              />
              <p className="text-xs text-muted-foreground">
                {replyText.length}/500 ký tự
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyTarget(null)}
              disabled={replyReview.isPending}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleReply}
              disabled={replyReview.isPending}
            >
              <Send className="size-4" />
              {replyReview.isPending ? "Đang gửi..." : "Gửi trả lời"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
