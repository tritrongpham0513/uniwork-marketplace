import { useState } from "react";
import { Link } from "react-router";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RatingStars } from "@/components/shared/rating-stars";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";
import type { Review } from "@/features/shared/types";

/** Chiều phản hồi đang được chỉnh sửa. */
type ReplySlot = "reviewee" | "reviewer";

interface ReviewThreadProps {
  review: Review;
  /**
   * Ô phản hồi nào mà người đang xem được phép viết.
   *
   * - `reviewee`: người BỊ đánh giá — SV xem đánh giá của NTD.
   * - `reviewer`: người VIẾT đánh giá — NTD xem đánh giá mình đã viết cho SV.
   * - `null`: không được phản hồi (chỉ xem).
   */
  canReply: ReplySlot | null;
  /** Tên hiển thị của bên đối diện (dùng trong tiêu đề dialog). */
  counterpartName: string;
  /** Hành động gửi phản hồi. */
  onSubmit: (reply: string) => Promise<void>;
  /** Đang gửi hay không. */
  isPending?: boolean;
  /** Ẩn phần liên kết vị trí (dùng khi nhúng trong card uy tín ứng viên). */
  hideJobLink?: boolean;
}

/**
 * Luồng đánh giá 2 chiều — hiển thị đánh giá + phản hồi của cả hai bên.
 *
 * <p>Cấu trúc lưu trữ:
 * - `reply` — phản hồi của người BỊ đánh giá (reviewee).
 * - `reviewerReply` — phản hồi của người VIẾT đánh giá (reviewer).
 */
export function ReviewThread({
  review,
  canReply,
  counterpartName,
  onSubmit,
  isPending = false,
  hideJobLink = false,
}: ReviewThreadProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  /** Ô phản hồi đã có nội dung -> nút chuyển sang "Sửa phản hồi". */
  const slotFilled = canReply
    ? canReply === "reviewee"
      ? Boolean(review.reply)
      : Boolean(review.reviewerReply)
    : true;

  const openDialog = () => {
    setReplyText(
      canReply === "reviewee" ? (review.reply ?? "") : (review.reviewerReply ?? "")
    );
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      toast.warning("Vui lòng nhập nội dung phản hồi.");
      return;
    }

    try {
      await onSubmit(replyText.trim());
      toast.success("Đã gửi phản hồi.");
      setDialogOpen(false);
      setReplyText("");
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <>
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
                {!hideJobLink && review.jobTitle && (
                  <p className="text-xs text-muted-foreground">
                    {review.jobId ? (
                      <Link
                        to={PATHS.JOBS.DETAIL(review.jobId)}
                        className="underline-offset-4 hover:underline"
                      >
                        Vị trí: {review.jobTitle}
                      </Link>
                    ) : (
                      `Vị trí: ${review.jobTitle}`
                    )}
                  </p>
                )}
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

          {/* Phản hồi của người bị đánh giá */}
          {review.reply && (
            <div className="rounded-lg border-l-2 border-primary bg-muted/40 p-3">
              <p className="mb-1 text-xs font-semibold text-primary">
                Phản hồi của {review.targetName}
              </p>
              <p className="text-sm text-muted-foreground">{review.reply}</p>
            </div>
          )}

          {/* Phản hồi của người viết đánh giá */}
          {review.reviewerReply && (
            <div className="rounded-lg border-l-2 border-border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-semibold text-foreground">
                Phản hồi của {review.fromName}
              </p>
              <p className="text-sm text-muted-foreground">
                {review.reviewerReply}
              </p>
            </div>
          )}

          {canReply && (
            <Button variant="outline" size="sm" onClick={openDialog}>
              <MessageSquare className="size-4" />
              {slotFilled ? "Sửa phản hồi" : "Phản hồi"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Phản hồi đánh giá</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <RatingStars value={review.rating} className="mb-1.5" />
              <p className="text-sm text-muted-foreground">“{review.comment}”</p>
            </div>

            <Textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder={`Viết phản hồi của bạn tới ${counterpartName}...`}
            />
            <p className="text-xs text-muted-foreground">
              {replyText.length}/500 ký tự
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              <Send className="size-4" />
              {isPending ? "Đang gửi..." : "Gửi phản hồi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReviewThread;
export type { ReplySlot };
