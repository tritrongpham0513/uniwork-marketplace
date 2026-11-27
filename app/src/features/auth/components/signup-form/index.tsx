import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { PATHS, ROLE_HOME } from "@/config/paths";
import {
  signupSchema,
  type SignupSchema,
} from "@/features/auth/schema/auth.schema";
import { useRegister, useResendVerification } from "@/features/auth/hooks";
import { normalizeApiError } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { GoogleAuthSection } from "@/features/auth/components/google-auth-section";

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
  const [resendNotification, setResendNotification] = useState<string | null>(
    null
  );

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

  const selectedRole = useWatch({ control: form.control, name: "role" });
  const watchPassword =
    useWatch({ control: form.control, name: "password" }) || "";
  const selectedEmployerType = useWatch({
    control: form.control,
    name: "employerType",
  });

  // Tính toán độ mạnh mật khẩu (Password Strength Meter)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score <= 2)
      return { label: "Yếu", color: "bg-destructive", percent: 30 };
    if (score <= 4)
      return { label: "Trung bình", color: "bg-muted-foreground", percent: 70 };
    return { label: "Mạnh", color: "bg-primary", percent: 100 };
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
        toast.success("Đăng ký tài khoản thành công!", {
          description:
            "Vui lòng kiểm tra hộp thư để kích hoạt tài khoản của bạn.",
        });
        onSubmitSuccess?.(data);
      },
      onError: (error) => {
        // Lỗi validation từ backend: hiển thị inline tại đúng field bị lỗi
        const fieldErrors = normalizeApiError(error).fieldErrors;
        if (fieldErrors.length === 0) return;

        for (const fieldError of fieldErrors) {
          form.setError(fieldError.field as keyof SignupSchema, {
            type: "server",
            message: fieldError.message,
          });
        }
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
          toast.success("Đã gửi lại email kích hoạt!");
        },
      }
    );
  };

  const handleGoogleAuthSuccess = useCallback(
    (user: { role: string }) => {
      navigate(ROLE_HOME[user.role] ?? PATHS.HOME, { replace: true });
    },
    [navigate]
  );

  // ==========================================================
  // TRẠNG THÁI 2: MÀN HÌNH CHỜ KÍCH HOẠT EMAIL SAU KHI ĐĂNG KÝ
  // ==========================================================
  if (isSubmittedSuccess) {
    return (
      <div
        className={cn(
          "flex flex-col items-center space-y-6 py-2 text-center",
          className
        )}
      >
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
          <Mail className="size-10 stroke-[1.75]" />
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 className="size-4" />
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Kiểm tra email của bạn
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Chúng tôi đã gửi liên kết kích hoạt tài khoản đến địa chỉ:
          </p>
          <div className="inline-block rounded-xl bg-muted px-3.5 py-1.5 text-sm font-semibold break-all text-primary">
            {registeredEmail}
          </div>
        </div>

        <div className="w-full space-y-2 rounded-2xl border border-border/70 bg-card p-4 text-left text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Send className="size-3.5 text-primary" />
            Các bước tiếp theo:
          </p>
          <ol className="list-inside list-decimal space-y-1 pl-1">
            <li>Mở hộp thư đến (Inbox) của email trên.</li>
            <li>
              Nhấn vào nút hoặc liên kết <strong>Xác thực tài khoản</strong>.
            </li>
            <li>
              Kiểm tra cả thư mục <em>Spam / Thư rác</em> nếu không thấy.
            </li>
          </ol>
        </div>

        {/* Thông báo gửi lại email thành công hoặc lỗi từ mutation */}
        {resendNotification && (
          <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            {resendNotification}
          </div>
        )}

        <div className="w-full space-y-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full cursor-pointer rounded-2xl"
            disabled={countdown > 0 || resendMutation.isPending}
            onClick={handleResendEmail}
          >
            {resendMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 size-4 animate-spin" />
                Đang gửi lại...
              </>
            ) : countdown > 0 ? (
              `Gửi lại email sau (${countdown}s)`
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Gửi lại email kích hoạt
              </>
            )}
          </Button>

          <Button
            type="button"
            className="h-10 w-full cursor-pointer rounded-2xl"
            onClick={() => navigate(PATHS.AUTH.LOGIN)}
          >
            Đi đến màn hình Đăng nhập
            <ArrowRight className="ml-1.5 size-4" />
          </Button>

          <button
            type="button"
            className="cursor-pointer pt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
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
          Tạo tài khoản VieJob
        </h1>
        <p className="text-xs text-balance text-muted-foreground sm:text-sm">
          Bắt đầu tìm kiếm cơ hội hoặc kết nối ứng viên tài năng
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <FieldGroup className="gap-4">
          {/* 1. CHỌN VAI TRÒ (ROLE SELECTION) */}
          <div className="space-y-2">
            <FieldLabel className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Bạn tham gia với tư cách
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  form.setValue("role", "STUDENT", { shouldValidate: true });
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all",
                  selectedRole === "STUDENT"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <GraduationCap className="size-5 shrink-0" />
                <span className="text-xs font-semibold">Sinh viên</span>
                <span className="hidden text-[10px] leading-tight text-muted-foreground sm:inline">
                  Tìm việc part-time
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  form.setValue("role", "EMPLOYER", { shouldValidate: true });
                  if (!form.getValues("employerType")) {
                    form.setValue("employerType", "COMPANY", {
                      shouldValidate: true,
                    });
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all",
                  selectedRole === "EMPLOYER"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
              >
                <Building2 className="size-5 shrink-0" />
                <span className="text-xs font-semibold">Nhà tuyển dụng</span>
                <span className="hidden text-[10px] leading-tight text-muted-foreground sm:inline">
                  Đăng tin tuyển dụng
                </span>
              </button>
            </div>
          </div>

          {/* 1.1 LOẠI NHÀ TUYỂN DỤNG (Chỉ hiện khi role = EMPLOYER) */}
          {selectedRole === "EMPLOYER" && (
            <div className="animate-in space-y-1.5 rounded-2xl border border-primary/20 bg-primary/5 p-3 duration-200 fade-in-50">
              <span className="block text-[11px] font-medium text-foreground">
                Hình thức tuyển dụng:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => form.setValue("employerType", "COMPANY")}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors",
                    selectedEmployerType === "COMPANY"
                      ? "border-primary bg-background font-semibold text-primary shadow-2xs"
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
                    "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors",
                    selectedEmployerType === "INDIVIDUAL"
                      ? "border-primary bg-background font-semibold text-primary shadow-2xs"
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
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium"
                >
                  Họ và tên
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type="text"
                    placeholder="Nguyễn Văn A"
                    aria-invalid={fieldState.invalid}
                    className="h-10 rounded-2xl pl-9"
                  />
                  <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* 3. EMAIL */}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium"
                >
                  Địa chỉ Email
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="student@example.com"
                    aria-invalid={fieldState.invalid}
                    className="h-10 rounded-2xl pl-9"
                  />
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* 4. MẬT KHẨU */}
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium"
                >
                  Mật khẩu
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 8 ký tự, có hoa, thường & số"
                    aria-invalid={fieldState.invalid}
                    className="h-10 rounded-2xl pr-10 pl-9"
                  />
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {/* Password strength meter */}
                {watchPassword.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Độ an toàn:</span>
                      <span className="font-medium text-foreground">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          passwordStrength.color
                        )}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* 5. XÁC NHẬN MẬT KHẨU */}
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.5">
                <FieldLabel
                  htmlFor={field.name}
                  className="text-xs font-medium"
                >
                  Xác nhận lại mật khẩu
                </FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu vừa đặt"
                    aria-invalid={fieldState.invalid}
                    className="h-10 rounded-2xl pr-10 pl-9"
                  />
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* NÚT SUBMIT VỚI TANSTACK QUERY MUTATION PENDING */}
          <Field className="pt-1">
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="h-10 w-full cursor-pointer rounded-2xl font-semibold"
            >
              {registerMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
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
            <GoogleAuthSection
              mode="signup"
              defaultRole={selectedRole}
              defaultEmployerType={selectedEmployerType}
              disabled={registerMutation.isPending}
              onAuthSuccess={handleGoogleAuthSuccess}
            />

            <FieldDescription className="pt-1 text-center text-xs">
              Đã có tài khoản VieJob?{" "}
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
