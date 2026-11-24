import { Link, useNavigate } from "react-router";
import { ArrowLeft, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PATHS, ROLE_HOME } from "@/config/paths";
import { useAuth } from "@/features/auth/hooks";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const homePath = user ? (ROLE_HOME[user.role] ?? PATHS.HOME) : PATHS.HOME;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-8" />
      </div>

      <p className="mt-6 font-heading text-6xl font-bold tracking-tight text-foreground">
        403
      </p>

      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
        Bạn không có quyền truy cập trang này
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Khu vực này chỉ dành cho một vai trò cụ thể. Nếu bạn đang đăng nhập sai
        tài khoản, hãy đăng xuất và thử lại bằng đúng vai trò.
      </p>

      <Card className="mt-8 w-full border-border/60">
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-6 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Home className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Quay lại trang chủ theo vai trò của bạn
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user
                  ? `Bạn đang đăng nhập với vai trò ${
                      user.role === "STUDENT"
                        ? "Sinh viên"
                        : user.role === "EMPLOYER"
                          ? "Nhà tuyển dụng"
                          : "Quản trị viên"
                    }.`
                  : "Hãy đăng nhập để tiếp tục."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link to={homePath} />}
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
