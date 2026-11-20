import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RatingStars } from "@/components/shared/rating-stars";
import { ReviewThread } from "@/components/shared/review-thread";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { useEmployerProfile } from "@/features/profile/hooks";
import { useEmployerReviews, useReplyReview } from "@/features/reviews/hooks";
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
  } = useEmployerReviews();
  const replyReview = useReplyReview();

  // Endpoint riêng đã lọc sẵn theo NTD đang đăng nhập + ẩn đánh giá bị ẩn.
  const reviews = allReviews;

  const distribution = useMemo(() => buildDistribution(reviews), [reviews]);
  const total = reviews.length;

  /**
   * NTD là người BỊ đánh giá trong các đánh giá này (SV đánh giá NTD) ->
   * được phản hồi vào ô `reply` (phía reviewee).
   */
  const handleReply = async (id: string, reply: string) => {
    await replyReview.mutateAsync({ id, reply });
  };

  return (
    <DashboardLayout
      title="Đánh giá từ sinh viên"
      description="Những đánh giá này hiển thị công khai trên hồ sơ tổ chức của bạn."
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
                  <ReviewThread
                    review={review}
                    canReply="reviewee"
                    counterpartName={review.fromName}
                    isPending={replyReview.isPending}
                    onSubmit={(reply) => handleReply(review.id, reply)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
