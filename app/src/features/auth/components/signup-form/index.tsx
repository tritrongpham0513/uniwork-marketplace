import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GraduationCap,
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Send,
  Building,
} from "lucide-react";
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
import { PATHS } from "@/config/paths";
import {
  signupSchema,
  type SignupSchema,
} from "@/features/auth/schema/auth.schema";
import { useRegister, useResendVerification } from "@/features/auth/hooks";

interface SignupFormProps extends React.ComponentProps<"div"> {
  onSubmitSuccess?: (data: SignupSchema) => void;
}

function SignupForm({ className, onSubmitSuccess }: SignupFormProps) {
  const navigate = useNavigate();

  // Trạng thái hiển thị mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái màn hình sau khi đăng ký thành công
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Countdown 60s cho việc gửi lại email kích hoạt
  const [countdown, setCountdown] = useState(0);
  const [resendNotification, setResendNotification] = useState<string | null>(null);

  // TanStack Query Mutations
  const registerMutation = useRegister();
  const resendMutation = useResendVerification();

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "STUDENT",
      employerType: "COMPANY",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const selectedRole = form.watch("role");
  const watchPassword = form.watch("password") || "";

  // Tính toán độ mạnh mật khẩu (Password Strength Meter)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: "Yếu", color: "bg-red-500", percent: 30 };
    if (score <= 4) return { label: "Trung bình", color: "bg-amber-500", percent: 70 };
    return { label: "Mạnh", color: "bg-emerald-500", percent: 100 };
  };

  const passwordStrength = getPasswordStrength(watchPassword);

  // Quản lý đồng hồ đếm ngược 60 giây
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Xử lý submit form với TanStack Query Mutation
  const onSubmit = (data: SignupSchema) => {
    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      confirmPassword: data.confirmPassword,
      role: data.role,
      employerType: data.role === "EMPLOYER" ? data.employerType : undefined,
    };

    registerMutation.mutate(payload, {
      onSuccess: () => {
        setRegisteredEmail(payload.email);
        setIsSubmittedSuccess(true);
        setCountdown(60);
        onSubmitSuccess?.(data);
      },
    });
  };

  // Xử lý gửi lại email kích hoạt với TanStack Query Mutation
  const handleResendEmail = () => {
    if (countdown > 0 || !registeredEmail || resendMutation.isPending) return;

    setResendNotification(null);
    resendMutation.mutate(
      { email: registeredEmail },
      {
        onSuccess: () => {
          setResendNotification(
            "Đã gửi lại liên kết kích hoạt. Vui lòng kiểm tra hộp thư!"
          );
          setCountdown(60);
        },
      }
    );
  };

  // Trích xuất thông báo lỗi từ TanStack Query Error Object
  const registerErrorMessage =
    registerMutation.error?.response?.data?.message ||
    registerMutation.error?.message;

  const resendErrorMessage =
    resendMutation.error?.response?.data?.message ||
    resendMutation.error?.message;

  // ==========================================================
  // TRẠNG THÁI 2: MÀN HÌNH CHỜ KÍCH HOẠT EMAIL SAU KHI ĐĂNG KÝ
  // ==========================================================
  if (isSubmittedSuccess) {
    return (
      <div className={cn("flex flex-col items-center text-center space-y-6 py-2", className)}>
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
          <Mail className="size-10 stroke-[1.75]" />
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 className="size-4" />
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Kiểm tra email của bạn
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Chúng tôi đã gửi liên kết kích hoạt tài khoản đến địa chỉ:
          </p>
          <div className="inline-block rounded-xl bg-muted px-3.5 py-1.5 font-semibold text-primary text-sm break-all">
            {registeredEmail}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-left text-xs space-y-2 text-muted-foreground w-full">
          <p className="font-medium text-foreground flex items-center gap-1.5">
            <Send className="size-3.5 text-primary" />
            Các bước tiếp theo:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Mở hộp thư đến (Inbox) của email trên.</li>
            <li>Nhấn vào nút hoặc liên kết <strong>Xác thực tài khoản</strong>.</li>
            <li>Kiểm tra cả thư mục <em>Spam / Thư rác</em> nếu không thấy.</li>
          </ol>
        </div>

        {/* Thông báo gửi lại email thành công hoặc lỗi từ mutation */}
        {resendNotification && (
          <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            {resendNotification}
          </div>
        )}

        {resendErrorMessage && (
          <div className="w-full rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            {resendErrorMessage}
          </div>
        )}

        <div className="w-full space-y-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-2xl cursor-pointer"
            disabled={countdown > 0 || resendMutation.isPending}
            onClick={handleResendEmail}
          >
            {resendMutation.isPending ? (
              <>
                <RefreshCw className="size-4 animate-spin mr-2" />
                Đang gửi lại...
              </>
            ) : countdown > 0 ? (
              `Gửi lại email sau (${countdown}s)`
            ) : (
              <>
                <RefreshCw className="size-4 mr-2" />
                Gửi lại email kích hoạt
              </>
            )}
          </Button>

          <Button
            type="button"
            className="w-full h-10 rounded-2xl cursor-pointer"
            onClick={() => navigate(PATHS.AUTH.LOGIN)}
          >
            Đi đến màn hình Đăng nhập
            <ArrowRight className="size-4 ml-1.5" />
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 pt-1 cursor-pointer"
            onClick={() => {
              setIsSubmittedSuccess(false);
              setResendNotification(null);
            }}
          >
            Nhập sai email? Đăng ký lại
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // TRẠNG THÁI 1: FORM ĐIỀN THÔNG TIN ĐĂNG KÝ
  // ==========================================================
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* Header Form */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tạo tài khoản UniWork
        </h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground">
          Bắt đầu tìm kiếm cơ hội hoặc kết nối ứng viên tài năng
        </p>
      </div>

      {/* Hiển thị lỗi từ TanStack Query Error State (ví dụ 409 Email đã tồn tại) */}
      {registerErrorMessage && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{registerErrorMessage}</p>
            {registerErrorMessage.toLowerCase().includes("đăng nhập") && (
              <Link
                to={PATHS.AUTH.LOGIN}
                className="inline-block font-bold underline underline-offset-2 hover:opacity-80"
              >
                Nhấn vào đây để Đăng nhập ngay
              </Link>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <FieldGroup className="gap-4">
          {/* 1. CHỌN VAI TRÒ (ROLE SELECTION) */}
          <div className="space-y-2">
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bạn tham gia với tư cách
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  form.setValue("role", "STUDENT", { shouldValidate: true });
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all cursor-pointer",
                  selectedRole === "STUDENT"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <GraduationCap className="size-5 shrink-0" />
                <span className="text-xs font-semibold">Sinh viên</span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:inline">
                  Tìm việc part-time
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  form.setValue("role", "EMPLOYER", { shouldValidate: true });
                  if (!form.getValues("employerType")) {
                    form.setValue("employerType", "COMPANY", { shouldValidate: true });
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all cursor-pointer",
                  selectedRole === "EMPLOYER"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <Building2 className="size-5 shrink-0" />
                <span className="text-xs font-semibold">Nhà tuyển dụng</span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:inline">
                  Đăng tin tuyển dụng
                </span>
              </button>
            </div>
          </div>

          {/* 1.1 LOẠI NHÀ TUYỂN DỤNG (Chỉ hiện khi role = EMPLOYER) */}
          {selectedRole === "EMPLOYER" && (
            <div className="space-y-1.5 rounded-2xl border border-primary/20 bg-primary/5 p-3 animate-in fade-in-50 duration-200">
              <span className="text-[11px] font-medium text-foreground block">
                Hình thức tuyển dụng:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue("employerType", "COMPANY")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors",
                    form.watch("employerType") === "COMPANY"
                      ? "border-primary bg-background text-primary shadow-2xs font-semibold"
                      : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Building className="size-3.5" />
                  Doanh nghiệp
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("employerType", "INDIVIDUAL")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors",
                    form.watch("employerType") === "INDIVIDUAL"
                      ? "border-primary bg-background text-primary shadow-2xs font-semibold"
                      : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <User className="size-3.5" />
                  Cá nhân
                </button>
              </div>
            </div>
          )}

          {/* 2. HỌ VÀ TÊN */}
          <Controller
            name="fullName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                  Họ và tên
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type="text"
                    placeholder="Nguyễn Văn A"
                    aria-invalid={fieldState.invalid}
                    className="h-10 pl-9 rounded-2xl"
                  />
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* 3. EMAIL */}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                  Địa chỉ Email
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="student@example.com"
                    aria-invalid={fieldState.invalid}
                    className="h-10 pl-9 rounded-2xl"
                  />
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* 4. MẬT KHẨU */}
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                  Mật khẩu
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 8 ký tự, có hoa, thường & số"
                    aria-invalid={fieldState.invalid}
                    className="h-10 pl-9 pr-10 rounded-2xl"
                  />
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {watchPassword.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Độ an toàn:</span>
                      <span className="font-medium text-foreground">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full transition-all duration-300", passwordStrength.color)}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* 5. XÁC NHẬN MẬT KHẨU */}
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel htmlFor={field.name} className="text-xs font-medium">
                  Xác nhận lại mật khẩu
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu vừa đặt"
                    aria-invalid={fieldState.invalid}
                    className="h-10 pl-9 pr-10 rounded-2xl"
                  />
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* NÚT SUBMIT VỚI TANSTACK QUERY MUTATION PENDING */}
          <Field className="pt-1">
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full h-10 font-semibold rounded-2xl cursor-pointer"
            >
              {registerMutation.isPending ? (
                <>
                  <RefreshCw className="size-4 animate-spin mr-2" />
                  Đang khởi tạo tài khoản...
                </>
              ) : (
                "Đăng ký tài khoản"
              )}
            </Button>
          </Field>

          <FieldSeparator>Hoặc tiếp tục với</FieldSeparator>

          {/* ĐĂNG KÝ VỚI GOOGLE */}
          <Field>
            <Button
              variant="outline"
              type="button"
              className="w-full h-10 rounded-2xl cursor-pointer font-medium"
              onClick={() => {
                alert("Tính năng đăng ký qua Google OAuth ID Token đã sẵn sàng ở Backend.");
              }}
            >
              <svg className="size-4 mr-2" viewBox="0 0 24 24">
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
              Đăng ký nhanh với Google
            </Button>

            <FieldDescription className="text-center pt-1 text-xs">
              Đã có tài khoản UniWork?{" "}
              <Link
                to={PATHS.AUTH.LOGIN}
                className="font-semibold text-primary underline underline-offset-4 hover:opacity-85"
              >
                Đăng nhập
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

export default SignupForm;
