import { useState } from "react";
import { useNavigate } from "react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks";
import {
  useSavedJobIds,
  useToggleSavedJob,
} from "@/features/saved-jobs/hooks";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";
import { cn } from "cn";

interface SaveJobButtonProps {
  jobId: string;
  /** Hiển thị dạng icon nhỏ (trong card) hoặc nút đầy đủ (trong sidebar) */
  variant?: "icon" | "button";
  className?: string;
}

/**
 * Nút lưu tin — gọi API thật (`POST/DELETE /api/v1/student/saved-jobs`)
 * thay vì chỉ hiện toast giả. Chỉ sinh viên đã đăng nhập mới lưu được.
 */
export function SaveJobButton({
  jobId,
  variant = "icon",
  className,
}: SaveJobButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { data: savedIds = [] } = useSavedJobIds();
  const toggleSaved = useToggleSavedJob();

  const isStudent = user?.role === "STUDENT";
  const isSaved = savedIds.includes(jobId);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để lưu tin tuyển dụng.",
      });
      navigate(PATHS.AUTH.LOGIN, { state: { from: window.location.pathname } });
      return;
    }

    if (!isStudent) {
      toast.info("Chỉ sinh viên mới lưu tin được", {
        description: "Tính năng lưu tin dành cho tài khoản sinh viên.",
      });
      return;
    }

    setPending(true);
    try {
      await toggleSaved.mutateAsync({ jobId, saved: isSaved });
      toast.success(isSaved ? "Đã bỏ lưu tin" : "Đã lưu tin tuyển dụng", {
        description: isSaved
          ? "Bạn có thể lưu lại tin này bất cứ lúc nào."
          : "Xem lại trong mục Việc làm đã lưu.",
      });
    } catch (error) {
      showApiError(error);
    } finally {
      setPending(false);
    }
  };

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("w-full cursor-pointer", className)}
        onClick={() => void handleClick()}
        disabled={pending}
      >
        {isSaved ? (
          <BookmarkCheck className="size-4 text-primary" />
        ) : (
          <Bookmark className="size-4" />
        )}
        {isSaved ? "Đã lưu tin" : "Lưu tin"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      className={cn(
        "shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors",
        isSaved
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      aria-label={isSaved ? "Bỏ lưu tin" : "Lưu tin"}
      aria-pressed={isSaved}
    >
      {isSaved ? (
        <BookmarkCheck className="size-4.5" />
      ) : (
        <Bookmark className="size-4.5" />
      )}
    </button>
  );
}

export default SaveJobButton;
