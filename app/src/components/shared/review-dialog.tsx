import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RatingInput } from "@/components/shared/rating-stars";
import { useCreateReview } from "@/features/reviews/hooks";
import { showApiError, toast } from "@/lib/toast";
import type { ReviewTargetType } from "@/features/shared/types";

/** 3 tag nhanh — chọn 1 tag = điền nhanh nội dung đánh giá */
const QUICK_TAGS = [
  "Trả lương đúng hẹn",
  "Làm việc thân thiện",
  "Cơ hội phát triển",
];

const QUICK_COMMENTS: Record<string, string> = {
  "Trả lương đúng hẹn": "Công ty trả lương đúng hẹn, không có chậm trễ.",
  "Làm việc thân thiện": "Môi trường làm việc thân thiện, đồng nghiệp hỗ trợ nhiệt tình.",
  "Cơ hội phát triển": "Có cơ hội học hỏi và phát triển bản thân trong công việc.",
};

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id đơn ứng tuyển đã hoàn thành */
  applicationId: string;
  /** Đánh giá nhà tuyển dụng hay sinh viên */
  targetType: ReviewTargetType;
  /** Tên đối tượng bị đánh giá (hiển thị trong tiêu đề) */
  targetName?: string;
  /** Tên vị trí công việc */
  jobTitle?: string;
}

/**
 * Dialog đánh giá 2 chiều (FR-06).
 * Sinh viên đánh giá NTD sau khi công việc hoàn thành, và ngược lại.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  applicationId,
  targetType,
  targetName,
  jobTitle,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const createReview = useCreateReview();

  const isStudent = targetType === "EMPLOYER";
  const title = isStudent
    ? "Đánh giá nhà tuyển dụng"
    : "Đánh giá sinh viên";

  const reset = () => {
    setRating(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.warning("Vui lòng chấm điểm trước khi gửi đánh giá.");
      return;
    }
    if (!comment.trim()) {
      toast.warning("Vui lòng viết nhận xét về trải nghiệm của bạn.");
      return;
    }

    try {
      await createReview.mutateAsync({
        applicationId,
        rating,
        comment: comment.trim(),
      });
      toast.success("Cảm ơn bạn đã đánh giá!", {
        description: "Đánh giá của bạn giúp cộng đồng có lựa chọn tốt hơn.",
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {jobTitle && (
              <>
                Công việc:{" "}
                <span className="font-medium">{jobTitle}</span>
                {targetName && (
                  <span className="font-medium"> · {targetName}</span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Field>
            <FieldLabel>Mức độ hài lòng</FieldLabel>
            <RatingInput value={rating} onChange={setRating} />
          </Field>

          <Field>
            <FieldLabel>Nhận xét của bạn</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary"
                  onClick={() => setComment(QUICK_COMMENTS[tag] ?? tag)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setComment(QUICK_COMMENTS[tag] ?? tag);
                    }
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Chia sẻ trải nghiệm làm việc của bạn..."
              rows={4}
              maxLength={500}
            />
            <FieldDescription>
              {comment.length}/500 ký tự · Đánh giá 2 chiều giúp đánh giá được
              công bằng hơn.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createReview.isPending}>
            {createReview.isPending ? "Đang gửi..." : "Gửi đánh giá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReviewDialog;
