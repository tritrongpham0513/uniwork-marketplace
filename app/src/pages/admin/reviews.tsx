import { useMemo, useState } from "react";
import {
  Briefcase,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Search,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout, navItem } from "@/components/layout/dashboard-layout";
import { RatingStars } from "@/components/shared/rating-stars";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import {
  useReviews,
  useToggleReviewVisibility,
} from "@/features/reviews/hooks";
import { PATHS } from "@/config/paths";
import { showApiError, toast } from "@/lib/toast";

export default function AdminReviewsPage() {
  const [keyword, setKeyword] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);

  // hideHidden = false -> lấy cả đánh giá đang bị ẩn để quản trị viên xử lý
  const { data: reviews = [], isPending, isError, refetch } = useReviews({
    hideHidden: false,
  });
  const toggleVisibility = useToggleReviewVisibility();

  const visible = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return reviews.filter((review) => {
      if (onlyHidden && !review.isHidden) return false;
      if (!query) return true;
      const haystack =
        `${review.fromName} ${review.targetName} ${review.comment} ${review.jobTitle ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [reviews, keyword, onlyHidden]);

  const hiddenCount = reviews.filter((review) => review.isHidden).length;

  const handleToggle = async (id: string, isHidden: boolean) => {
    try {
      await toggleVisibility.mutateAsync({ id, isHidden });
      toast.success(
        isHidden ? "Đã ẩn đánh giá." : "Đã khôi phục đánh giá."
      );
    } catch (error) {
      showApiError(error);
    }
  };

  const navItems = [
    navItem("Bảng điều khiển", PATHS.ADMIN.ROOT, FileText),
    navItem("Duyệt tin đăng", PATHS.ADMIN.JOBS, Briefcase),
    navItem("Danh mục", PATHS.ADMIN.CATEGORIES, FolderKanban),
    navItem("Người dùng", PATHS.ADMIN.USERS, Users),
    navItem(
      "Kiểm duyệt đánh giá",
      PATHS.ADMIN.REVIEWS,
      Star,
      hiddenCount
    ),
  ];

  return (
    <DashboardLayout
      role="ADMIN"
      title="Kiểm duyệt đánh giá"
      description="Ẩn những đánh giá vi phạm nguyên tắc cộng đồng hoặc có nội dung không phù hợp."
      navItems={navItems}
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {reviews.length} đánh giá · {hiddenCount} đang bị ẩn
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo người đánh giá, nội dung hoặc vị trí"
              className="pl-9"
            />
          </div>

          <Button
            variant={onlyHidden ? "default" : "outline"}
            onClick={() => setOnlyHidden((prev) => !prev)}
          >
            {onlyHidden ? (
              <>
                <Eye className="size-4" />
                Đang lọc đánh giá ẩn
              </>
            ) : (
              <>
                <EyeOff className="size-4" />
                Chỉ xem đánh giá bị ẩn
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách đánh giá"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && visible.length === 0 && (
          <EmptyState
            icon="search"
            title="Không tìm thấy đánh giá"
            description="Thử đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
          />
        )}

        {!isPending && !isError && visible.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người đánh giá</TableHead>
                      <TableHead>Đối tượng</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {review.fromName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {review.targetName}
                          </p>
                          {review.jobTitle && (
                            <p className="text-xs text-muted-foreground">
                              {review.jobTitle}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <RatingStars value={review.rating} size="xs" />
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            “{review.comment}”
                          </p>
                          {review.reply && (
                            <p className="mt-1 line-clamp-1 text-xs text-primary">
                              Phản hồi: {review.reply}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={review.isHidden ? "destructive" : "secondary"}
                          >
                            {review.isHidden ? "Đang ẩn" : "Đang hiển thị"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              review.isHidden ? "" : "text-destructive"
                            }
                            onClick={() =>
                              handleToggle(review.id, !review.isHidden)
                            }
                            disabled={toggleVisibility.isPending}
                          >
                            {review.isHidden ? (
                              <>
                                <Eye className="size-4" />
                                Hiện lại
                              </>
                            ) : (
                              <>
                                <EyeOff className="size-4" />
                                Ẩn
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
