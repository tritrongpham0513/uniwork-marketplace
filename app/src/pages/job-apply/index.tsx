import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  Info,
  Phone,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useJob } from "@/features/jobs/hooks/useJobs";
import { useAuth } from "@/features/auth/hooks";
import { useStudentProfile } from "@/features/profile/hooks";
import { useCreateApplication, useStudentApplicationByJob } from "@/features/applications/hooks";
import { useUploadFile, cleanupReplacedFile } from "@/features/files/hooks";
import { EMPLOYMENT_TYPE_LABELS } from "@/features/jobs/types";
import { formatSalary } from "@/features/jobs/lib/format";
import { DatePicker } from "@/components/shared/date-picker";
import { todayIso } from "@/lib/date";
import { PATHS } from "@/config/paths";
import { toast } from "@/lib/toast";
import { cn } from "cn";

export function ApplyJobPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: job, isLoading } = useJob(id);
  const { data: profile } = useStudentProfile();
  const createApplication = useCreateApplication();
  /** Đơn cũ của SV cho tin này — `WITHDRAWN` nghĩa là đang ứng tuyển lại. */
  const { data: myApplication } = useStudentApplicationByJob(job?.id);
  const isReapply = myApplication?.status === "WITHDRAWN";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [experience, setExperience] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [agreed, setAgreed] = useState(false);
  // CV đã chọn: file được upload ngay, giữ URL + tên file để gửi kèm đơn.
  const [cvFile, setCvFile] = useState<{ url: string; fileName: string } | null>(
    null
  );

  const uploadFile = useUploadFile();

  /**
   * CV vừa upload trong phiên nhưng chưa gửi đơn — xoá khi rời trang để
   * không để rác trong bucket. CV lấy từ hồ sơ (prefill) không nằm trong đây.
   */
  const unsavedCvRef = useRef<Set<string>>(new Set());

  /** Ghi nhận CV mới upload + dọn CV vừa upload trước đó (nếu có). */
  const trackUploadedCv = (url: string) => {
    const previous = cvFile?.url;
    unsavedCvRef.current.add(url);
    if (previous && previous !== url && unsavedCvRef.current.delete(previous)) {
      void cleanupReplacedFile(previous);
    }
  };

  // Rời trang khi chưa gửi đơn → dọn CV vừa upload.
  useEffect(() => {
    const unsaved = unsavedCvRef.current;
    return () => {
      unsaved.forEach((url) => void cleanupReplacedFile(url));
      unsaved.clear();
    };
  }, []);

  /** Dữ liệu hồ sơ dùng làm giá trị mặc định (prefill) */
  const effectiveName = fullName || profile?.fullName || user?.fullName || "";
  const effectivePhone = phone || profile?.phone || "";
  const effectiveEmail = email || user?.email || "";

  /** Ứng tuyển nhanh — điền toàn bộ thông tin từ hồ sơ UniJob (Viecoday) */
  const fillFromProfile = () => {
    if (!profile) {
      toast.warning("Chưa có hồ sơ của bạn", {
        description: "Hãy tạo hồ sơ tìm việc trước khi ứng tuyển nhanh.",
      });
      return;
    }
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setEmail(user?.email ?? "");
    setExperience(profile.bio ?? "");
    if (profile.cvUrl) {
      setCvFile({
        url: profile.cvUrl,
        // Backend trả kèm tên file gốc; trước đây lấy slug "file-xxxx" trên URL
        // nên NTD nhận được tên file vô nghĩa.
        fileName: profile.cvFileName ?? "CV của bạn",
      });
    }
    toast.success("Đã điền thông tin từ hồ sơ của bạn", {
      description: "Bạn vẫn có thể chỉnh sửa trước khi gửi đơn.",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <Alert variant="destructive">
          <Info className="size-4" />
          <AlertTitle>Không tìm thấy tin tuyển dụng</AlertTitle>
          <AlertDescription>
            Tin tuyển dụng này không còn tồn tại hoặc đã ngừng nhận ứng tuyển.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          nativeButton={false}
          render={<Link to={PATHS.JOBS.ROOT} />}
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  // Đã ứng tuyển (không phải đơn đã rút) → không cho gửi lại.
  const alreadyApplied = !!myApplication && !isReapply;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (alreadyApplied) {
      toast.info("Bạn đã ứng tuyển vào tin này rồi", {
        description:
          "Bạn có thể xem hồ sơ hoặc rút đơn nếu còn ở trạng thái 'Đang chờ'.",
      });
      return;
    }

    if (!coverLetter.trim()) {
      toast.error("Vui lòng viết lời giới thiệu ngắn");
      return;
    }

    if (!effectiveName.trim()) {
      toast.error("Vui lòng nhập họ tên của bạn");
      return;
    }

    if (!effectivePhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại liên hệ");
      return;
    }

    if (!effectiveEmail.trim()) {
      toast.error("Vui lòng nhập email liên hệ");
      return;
    }

    if (!agreed) {
      toast.error("Vui lòng đồng ý với điều khoản ứng tuyển");
      return;
    }

    // CV đang được tải lên — chặn gửi đơn cho tới khi xong
    if (uploadFile.isPending) {
      toast.warning("CV đang được tải lên, vui lòng đợi");
      return;
    }

    createApplication.mutate(
      {
        jobId: job.id,
        coverLetter: coverLetter.trim(),
        experience: experience.trim(),
        availableFrom: availableFrom || null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        // Ưu tiên CV vừa upload; nếu không thì dùng CV trong hồ sơ
        cvUrl: cvFile?.url ?? profile?.cvUrl ?? null,
        cvFileName: cvFile?.fileName ?? null,
      },
      {
        onSuccess: () => {
          // CV đã được đơn ứng tuyển tham chiếu → không dọn nữa.
          unsavedCvRef.current.clear();
          toast.success(
            isReapply ? "Gửi lại đơn ứng tuyển thành công!" : "Gửi đơn ứng tuyển thành công!",
            {
              description:
                "Nhà tuyển dụng sẽ xem xét hồ sơ và thông báo kết quả cho bạn.",
            }
          );
          navigate(PATHS.STUDENT.APPLICATIONS);
        },
      }
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 cursor-pointer"
        nativeButton={false}
        render={<Link to={PATHS.JOBS.DETAIL(job.id)} />}
      >
        <ArrowLeft className="size-4" />
        Quay lại tin tuyển dụng
      </Button>

      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        {isReapply
          ? "Ứng tuyển lại việc làm"
          : alreadyApplied
            ? "Bạn đã ứng tuyển việc làm này"
            : "Ứng tuyển việc làm"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isReapply
          ? "Bạn đã rút đơn trước đó — điền lại thông tin để gửi hồ sơ mới cho tin này."
          : alreadyApplied
            ? "Hồ sơ của bạn đang được nhà tuyển dụng xem xét."
            : "Hoàn thiện thông tin bên dưới để gửi hồ sơ ứng tuyển."}
      </p>

      {alreadyApplied && (
        <Alert className="mt-4">
          <Info className="size-4" />
          <AlertTitle>Bạn đã ứng tuyển vào tin này</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Hồ sơ đang ở trạng thái đã gửi — không thể gửi lại.</span>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link to={PATHS.STUDENT.APPLICATION_DETAIL(myApplication!.id)} />
              }
            >
              Xem hồ sơ của tôi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]"
      >
        <div className="space-y-6">
          {/* HỒ SƠ SINH VIÊN */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Hồ sơ sinh viên</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
                    {(profile?.fullName ?? user?.fullName ?? "S")
                      ?.slice(0, 1)
                      ?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile?.fullName ?? user?.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile?.university || "Chưa cập nhật trường"} ·{" "}
                      {profile?.major || "Chưa cập nhật ngành"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {profile?.phone || "Chưa cập nhật số điện thoại"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 cursor-pointer"
                    nativeButton={false}
                    render={<Link to={PATHS.STUDENT.PROFILE} />}
                  >
                    Sửa hồ sơ
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                onClick={fillFromProfile}
              >
                <Sparkles className="size-4" />
                Ứng tuyển nhanh với hồ sơ của bạn
              </Button>

              {!profile?.cvUrl && (
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>Chưa có CV trong hồ sơ</AlertTitle>
                  <AlertDescription>
                    Bạn vẫn có thể ứng tuyển, nhưng nên tải CV lên để tăng cơ
                    hội được nhà tuyển dụng quan tâm.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* THÔNG TIN LIÊN HỆ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Thông tin liên hệ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="full-name" className="text-xs font-medium">
                  Họ và tên <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={
                    profile?.fullName ?? user?.fullName ?? "Nguyễn Văn A"
                  }
                />
              </Field>

              <Field className="gap-1.5">
                <FieldLabel htmlFor="phone" className="text-xs font-medium">
                  Số điện thoại <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={profile?.phone ?? "0900 000 000"}
                />
              </Field>

              <Field className="gap-1.5 sm:col-span-2">
                <FieldLabel htmlFor="email" className="text-xs font-medium">
                  Email <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={user?.email ?? "ban@example.com"}
                />
              </Field>
            </CardContent>
          </Card>

          {/* CV */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">CV / Hồ sơ tài liệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="cv-upload"
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-xs transition-colors",
                    uploadFile.isPending
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:bg-muted"
                  )}
                >
                  <Upload className="size-4" />
                  {uploadFile.isPending
                    ? "Đang tải lên..."
                    : cvFile
                      ? "Chọn CV khác"
                      : "Tải CV lên"}
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="sr-only"
                    disabled={uploadFile.isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      void uploadFile
                        .mutateAsync({ file, kind: "CV" })
                        .then((uploaded) => {
                          trackUploadedCv(uploaded.url);
                          setCvFile({
                            url: uploaded.url,
                            fileName: uploaded.fileName,
                          });
                        })
                        .catch(() => {
                          // Lỗi đã được hiển thị qua toast trong useUploadFile.
                        });
                    }}
                  />
                </label>

                {cvFile && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <FileText className="size-3.5" />
                    {cvFile.fileName}
                  </span>
                )}
              </div>

              <FieldDescription>
                Hỗ trợ định dạng PDF, DOC, DOCX. Dung lượng tối đa 5MB.
              </FieldDescription>
            </CardContent>
          </Card>

          {/* LƯỜI GIỚI THIỆU */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Lời giới thiệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field className="gap-1.5">
                <FieldLabel
                  htmlFor="cover-letter"
                  className="text-xs font-medium"
                >
                  Nội dung <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id="cover-letter"
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                  rows={6}
                  maxLength={1000}
                  placeholder="Giới thiệu ngắn về bản thân, kinh nghiệm và lý do bạn phù hợp với vị trí này..."
                />
                <div className="flex items-center justify-between">
                  <FieldDescription>
                    Viết ngắn gọn, ưu tiên kinh nghiệm liên quan.
                  </FieldDescription>
                  <span className="text-xs text-muted-foreground">
                    {coverLetter.length}/1000
                  </span>
                </div>
              </Field>

              <Field className="gap-1.5">
                <FieldLabel
                  htmlFor="experience"
                  className="text-xs font-medium"
                >
                  Kinh nghiệm liên quan
                </FieldLabel>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ví dụ: 6 tháng làm phục vụ quán cà phê, 2 năm gia đình kinh doanh..."
                />
                <div className="flex items-center justify-between">
                  <FieldDescription>
                    Nêu các công việc/kỹ năng liên quan tới vị trí.
                  </FieldDescription>
                  <span className="text-xs text-muted-foreground">
                    {experience.length}/1000
                  </span>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5">
                  <FieldLabel
                    htmlFor="expected-salary"
                    className="text-xs font-medium"
                  >
                    Mức lương mong muốn (đồng/giờ)
                  </FieldLabel>
                  <Input
                    id="expected-salary"
                    type="number"
                    min={0}
                    step={1000}
                    value={expectedSalary}
                    onChange={(event) => setExpectedSalary(event.target.value)}
                    placeholder="Ví dụ: 30000"
                  />
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel
                    htmlFor="available-from"
                    className="text-xs font-medium"
                  >
                    Ngày có thể bắt đầu
                  </FieldLabel>
                  <DatePicker
                    id="available-from"
                    value={availableFrom}
                    onChange={(value) => setAvailableFrom(value ?? "")}
                    min={todayIso()}
                    placeholder="Chọn ngày"
                  />
                </Field>
              </div>

              <FieldDescription>
                Mức lương đề xuất của tin này là{" "}
                <span className="font-medium text-foreground">
                  {formatSalary(job)}
                </span>
                .
              </FieldDescription>
            </CardContent>
          </Card>

          {/* ĐIỀU KHOẢN */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <p>
                  Tôi đồng ý với{" "}
                  <span className="font-medium text-foreground">
                    điều khoản ứng tuyển
                  </span>{" "}
                  của VieJob và cho phép nhà tuyển dụng liên hệ với tôi qua số
                  điện thoại / email đã cung cấp. Tôi cam kết thông tin trên là
                  chính xác.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TÓM TẮT */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tóm tắt vị trí</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Briefcase className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {job.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.employer.name}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lương</span>
                  <span className="font-semibold text-primary">
                    {formatSalary(job)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Loại hình</span>
                  <span className="font-medium text-foreground">
                    {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Địa điểm</span>
                  <span className="text-right font-medium text-foreground">
                    {job.location.ward || job.location.district}
                  </span>
                </div>
                {job.schedules.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ca làm</span>
                    <span className="text-right font-medium text-foreground">
                      {job.schedules.length} ca trong tuần
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <Button
                type="submit"
                className="h-10 w-full cursor-pointer font-semibold"
                disabled={createApplication.isPending || alreadyApplied}
              >
                <Send className="size-4" />
                {createApplication.isPending
                  ? "Đang gửi..."
                  : alreadyApplied
                    ? "Bạn đã ứng tuyển"
                    : isReapply
                      ? "Gửi lại đơn ứng tuyển"
                      : "Gửi đơn ứng tuyển"}
              </Button>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Bạn có thể theo dõi trạng thái đơn ứng tuyển tại mục “Đơn ứng
                tuyển”.
              </p>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}

export default ApplyJobPage;
