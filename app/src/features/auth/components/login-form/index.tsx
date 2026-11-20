import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, RefreshCw } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PATHS, ROLE_HOME } from "@/config/paths";
import {
  loginSchema,
  type LoginSchema,
} from "@/features/auth/schema/auth.schema";
import { useLogin } from "@/features/auth/hooks";
import { saveAuthSession } from "@/utils/authStorage";
import { toast } from "@/lib/toast";
import { DEMO_ACCOUNTS } from "@/features/auth/constants/demo-accounts";

interface LoginFormProps extends React.ComponentProps<"form"> {
  onSubmitSuccess?: (data: LoginSchema) => void;
}

function LoginForm({ className, onSubmitSuccess, ...props }: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  /** Điều hướng theo vai trò, ưu tiên trang người dùng định truy cập trước đó */
  const redirectAfterLogin = (role?: string) => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && !from.startsWith("/login")) {
      navigate(from, { replace: true });
      return;
    }
    navigate(role ? (ROLE_HOME[role] ?? PATHS.HOME) : PATHS.HOME, {
      replace: true,
    });
  };

  const onSubmit = (data: LoginSchema) => {
    loginMutation.mutate(
      {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      },
      {
        onSuccess: (res) => {
          // 🔐 Lưu Access Token và User Profile vào localStorage
          if (res.data) {
            saveAuthSession(res.data);
          }
          toast.success("Đăng nhập thành công!", {
            description: `Chào mừng ${res.data?.user?.fullName ?? "bạn"} trở lại!`,
          });
          onSubmitSuccess?.(data);
          redirectAfterLogin(res.data?.user?.role);
        },
      }
    );
  };

  /** Điền nhanh tài khoản demo */
  const fillDemo = (email: string, password: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
  };

  // Lỗi từ backend được hiển thị bằng Toast (tầng global của TanStack Query).
  // Lỗi validation phía client vẫn hiển thị inline tại từng field bên dưới.

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      {...props}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Đăng nhập tài khoản
        </h1>
        <p className="text-xs text-balance text-muted-foreground sm:text-sm">
          Nhập thông tin bên dưới để tiếp tục trải nghiệm VieJob
        </p>
      </div>

      <FieldGroup className="gap-4">
        {/* Email */}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5">
              <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                Email
              </FieldLabel>
              <div className="relative">
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="m@example.com"
                  aria-invalid={fieldState.invalid}
                  className="h-10 rounded-2xl pl-9"
                />
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Mật khẩu */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                  Mật khẩu
                </FieldLabel>
                <a
                  href="#"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative">
                <Input
                  {...field}
                  id={field.name}
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  aria-invalid={fieldState.invalid}
                  className="h-10 rounded-2xl pl-9 pr-10"
                />
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Nút Đăng nhập */}
        <Field className="pt-1">
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="h-10 w-full cursor-pointer rounded-2xl font-semibold"
          >
            {loginMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 size-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </Field>

        <FieldSeparator>Hoặc tiếp tục với</FieldSeparator>

        {/* Google Login */}
        <Field>
          <Button
            variant="outline"
            type="button"
            className="h-10 w-full cursor-pointer rounded-2xl font-medium"
            onClick={() => {
              toast.info("Đăng nhập Google", {
                description:
                  "Tính năng OAuth2 đã sẵn sàng — backend cần cấu hình Client ID.",
              });
            }}
          >
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
            Đăng nhập với Google
          </Button>

          <FieldDescription className="pt-1 text-center text-xs">
            Chưa có tài khoản?{" "}
            <Link
              to={PATHS.AUTH.REGISTER}
              className="font-semibold text-primary underline underline-offset-4 hover:opacity-85"
            >
              Đăng ký ngay
            </Link>
          </FieldDescription>
        </Field>

        {/* Tài khoản demo — điền nhanh để thử các luồng theo vai trò */}
        <Field className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <FieldLabel className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Tài khoản demo
          </FieldLabel>
          <div className="mt-2 grid gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.email, account.password)}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-card"
              >
                <span className="font-medium text-foreground">{account.role}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {account.email}
                </span>
              </button>
            ))}
          </div>
        </Field>
      </FieldGroup>
    </form>
  );
}

export default LoginForm;
