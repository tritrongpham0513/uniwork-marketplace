import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, MailCheck, RotateCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PATHS } from "@/config/paths";
import { authService } from "@/features/auth/services/auth.services";
import { useResendVerification } from "@/features/auth/hooks";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    token ? "" : "Link xác thực không hợp lệ hoặc đã hết hạn."
  );

  const resend = useResendVerification();
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    authService
      .verifyEmail({ token })
      .then(() => {
        setState("success");
        setMessage("Email của bạn đã được xác thực thành công.");
      })
      .catch((error: unknown) => {
        setState("error");
        const fallback =
          "Không thể xác thực email. Link có thể đã hết hạn hoặc đã được sử dụng.";
        setMessage(
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : fallback
        );
      });
  }, [token]);

  const handleResend = () => {
    if (!email) {
      setState("error");
      setMessage("Không tìm thấy địa chỉ email để gửi lại link xác thực.");
      return;
    }
    resend.mutate(
      { email },
      {
        onSuccess: () => {
          setState("success");
          setMessage(
            "Link xác thực mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư."
          );
        },
        onError: () => {
          setState("error");
        },
      }
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <Card className="w-full border-border/60">
        <CardHeader className="items-center text-center">
          <div
            className={
              state === "success"
                ? "flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                : state === "error"
                  ? "flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
                  : "flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
            }
          >
            {state === "success" ? (
              <CheckCircle2 className="size-7" />
            ) : state === "error" ? (
              <XCircle className="size-7" />
            ) : (
              <RotateCw className="size-7 animate-spin" />
            )}
          </div>

          <CardTitle className="mt-3 font-heading text-xl">
            {state === "loading"
              ? "Đang xác thực email..."
              : state === "success"
                ? "Xác thực thành công"
                : "Xác thực không thành công"}
          </CardTitle>

          <CardDescription>{message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === "error" && (
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>Không xác thực được</AlertTitle>
              <AlertDescription>
                Bạn có thể yêu cầu gửi lại link xác thực mới qua email đã đăng
                ký.
              </AlertDescription>
            </Alert>
          )}

          {state === "success" && email && (
            <Alert>
              <MailCheck />
              <AlertTitle>Đã gửi email</AlertTitle>
              <AlertDescription>
                Kiểm tra hộp thư (kể cả thư rác) của {email} để hoàn tất.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {state !== "success" && (
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resend.isPending}
              >
                <RotateCw className="size-4" />
                {resend.isPending ? "Đang gửi..." : "Gửi lại link xác thực"}
              </Button>
            )}

            <Button nativeButton={false} render={<Link to={PATHS.AUTH.LOGIN} />}>
              Đi tới trang đăng nhập
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
