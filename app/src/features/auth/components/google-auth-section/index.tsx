import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { env } from "@/config/env";
import { toast } from "@/lib/toast";
import { useGoogleGsiButton, useGoogleLogin } from "../../hooks";
import type {
  EmployerType,
  RegisterRoleType,
  UserSummaryResponse,
} from "../../types";
import { GoogleRoleDialog } from "./google-role-dialog";

interface PendingGoogleAuth {
  idToken: string;
  email?: string;
  fullName?: string;
}

interface GoogleAuthSectionProps {
  mode: "login" | "signup";
  defaultRole?: RegisterRoleType;
  defaultEmployerType?: EmployerType;
  disabled?: boolean;
  onAuthSuccess: (user: UserSummaryResponse, isNewUser: boolean) => void;
}

function GoogleGlyph() {
  return (
    <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/**
 * Khối đăng nhập / đăng ký bằng Google OAuth2 (Google Identity Services).
 * Tự xử lý nạp SDK, gửi ID Token về backend và mở hộp thoại chọn vai trò
 * nếu tài khoản Google đăng nhập lần đầu.
 */
export function GoogleAuthSection({
  mode,
  defaultRole = "STUDENT",
  defaultEmployerType = "COMPANY",
  disabled = false,
  onAuthSuccess,
}: GoogleAuthSectionProps) {
  const [pendingGoogleAuth, setPendingGoogleAuth] =
    useState<PendingGoogleAuth | null>(null);

  const { mutate: loginWithGoogle, isPending: isGooglePending } =
    useGoogleLogin();

  const handleCredential = useCallback(
    (idToken: string) => {
      loginWithGoogle(
        { idToken },
        {
          onSuccess: (res) => {
            if (res.data?.needsRole) {
              setPendingGoogleAuth({
                idToken,
                email: res.data.email,
                fullName: res.data.fullName,
              });
              return;
            }

            if (res.data?.accessToken && res.data?.user) {
              toast.success("Đăng nhập thành công!", {
                description: `Chào mừng ${res.data.user.fullName ?? "bạn"} trở lại!`,
              });
              onAuthSuccess(res.data.user, false);
            }
          },
        }
      );
    },
    [loginWithGoogle, onAuthSuccess]
  );

  const { buttonContainerRef, isConfigured, isReady, loadError, retryLoad } =
    useGoogleGsiButton({
      clientId: env.CLIENT_ID_GOOGLE,
      text: mode === "signup" ? "signup_with" : "signin_with",
      onCredential: handleCredential,
    });

  const handleConfirmRole = (
    role: RegisterRoleType,
    employerType?: EmployerType
  ) => {
    if (!pendingGoogleAuth) return;

    loginWithGoogle(
      {
        idToken: pendingGoogleAuth.idToken,
        role,
        employerType,
      },
      {
        onSuccess: (res) => {
          if (res.data?.accessToken && res.data?.user) {
            setPendingGoogleAuth(null);
            toast.success("Đăng ký & đăng nhập thành công!", {
              description: `Chào mừng ${res.data.user.fullName ?? "bạn"} gia nhập VieJob!`,
            });
            onAuthSuccess(res.data.user, true);
          }
        },
        onError: () => {
          // Token Google có thể đã hết hạn trong lúc chọn vai trò -> đóng modal để bấm lại
          setPendingGoogleAuth(null);
        },
      }
    );
  };

  const fallbackLabel =
    mode === "signup" ? "Đăng ký nhanh với Google" : "Đăng nhập với Google";

  const isBusy = disabled || isGooglePending;

  return (
    <>
      <div className="relative w-full">
        {!isConfigured ? (
          <Button
            variant="outline"
            type="button"
            disabled={isBusy}
            className="h-10 w-full cursor-pointer rounded-2xl font-medium"
            onClick={() => {
              toast.error("Chưa cấu hình Google Client ID", {
                description:
                  "Vui lòng thiết lập VITE_CLIENT_ID_GOOGLE để sử dụng đăng nhập Google.",
              });
            }}
          >
            <GoogleGlyph />
            {fallbackLabel}
          </Button>
        ) : loadError ? (
          <Button
            variant="outline"
            type="button"
            disabled={isBusy}
            className="h-10 w-full cursor-pointer rounded-2xl font-medium"
            onClick={retryLoad}
          >
            <GoogleGlyph />
            Thử tải lại đăng nhập Google
          </Button>
        ) : (
          <div className="relative flex min-h-10 w-full items-center justify-center">
            {!isReady && (
              <Button
                variant="outline"
                type="button"
                disabled
                className="h-10 w-full rounded-2xl font-medium"
              >
                <RefreshCw className="mr-2 size-4 animate-spin" />
                Đang tải Google Sign-In...
              </Button>
            )}

            <div
              ref={buttonContainerRef}
              aria-hidden={!isReady}
              className={
                isReady
                  ? "flex w-full justify-center overflow-hidden rounded-full"
                  : "pointer-events-none absolute inset-0 opacity-0"
              }
            />

            {isBusy && isReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-[1px]">
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Đang xác thực với Google...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <GoogleRoleDialog
        open={pendingGoogleAuth !== null}
        email={pendingGoogleAuth?.email}
        fullName={pendingGoogleAuth?.fullName}
        defaultRole={defaultRole}
        defaultEmployerType={defaultEmployerType}
        isPending={isGooglePending}
        onConfirm={handleConfirmRole}
        onClose={() => setPendingGoogleAuth(null)}
      />
    </>
  );
}
