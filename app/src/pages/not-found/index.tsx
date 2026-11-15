import { Link, useNavigate } from "react-router";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PATHS } from "@/config/paths";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX className="size-8" />
      </div>

      <p className="mt-6 font-heading text-6xl font-bold tracking-tight text-foreground">
        404
      </p>

      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
        Không tìm thấy trang bạn yêu cầu
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Đường dẫn không tồn tại hoặc nội dung đã được chuyển sang vị trí khác.
        Bạn có thể quay lại trang chủ hoặc tìm việc làm ngay.
      </p>

      <Card className="mt-8 w-full border-border/60">
        <CardContent className="flex flex-col items-center space-y-4 p-6 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Home className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Tìm kiếm cơ hội làm việc mới
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hàng nghìn việc làm bán thời gian đang chờ bạn.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link to={PATHS.HOME} />}
            >
              <Home className="size-4" />
              Về trang chủ
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link to={PATHS.JOBS.ROOT} />}
            >
              Tìm việc làm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
