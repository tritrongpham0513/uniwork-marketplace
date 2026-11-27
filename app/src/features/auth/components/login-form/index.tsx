import { useCallback, useState } from "react";
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
import { GoogleAuthSection } from "@/features/auth/components/google-auth-section";

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
  const redirectAfterLogin = useCallback(
    (role?: string) => {
      const from = (location.state as { from?: string } | null)?.from;
      if (from && !from.startsWith("/login")) {
        navigate(from, { replace: true });
        return;
      }
      navigate(role ? (ROLE_HOME[role] ?? PATHS.HOME) : PATHS.HOME, {
        replace: true,
      });
    },
    [location.state, navigate]
  );

  const handleGoogleAuthSuccess = useCallback(
    (user: { role: string }) => {
      redirectAfterLogin(user.role);
    },
    [redirectAfterLogin]
  );

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
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium"
                >
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
                  className="h-10 rounded-2xl pr-10 pl-9"
                />
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
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
          <GoogleAuthSection
            mode="login"
            disabled={loginMutation.isPending}
            onAuthSuccess={handleGoogleAuthSuccess}
          />

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
                <span className="font-medium text-foreground">
                  {account.role}
                </span>
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
