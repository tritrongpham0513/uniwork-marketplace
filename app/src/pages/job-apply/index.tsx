import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  Info,
  Phone,
  Send,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useJob } from "@/features/jobs/hooks/useJobs";
import { useAuth } from "@/features/auth/hooks";
import { useStudentProfile } from "@/features/profile/hooks";
import { useCreateApplication } from "@/features/applications/hooks";
import { EMPLOYMENT_TYPE_LABELS } from "@/features/jobs/types";
import { formatSalary } from "@/features/jobs/lib/format";
import { PATHS } from "@/config/paths";
import { toast } from "@/lib/toast";

export function ApplyJobPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: job, isLoading } = useJob(id);
  const { data: profile } = useStudentProfile();
  const createApplication = useCreateApplication();

  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [cvFileName, setCvFileName] = useState<string | null>(
    profile?.cvUrl ? "CV_cua_ban.pdf" : null
  );

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!coverLetter.trim()) {
      toast.error("Vui lòng viết lời giới thiệu ngắn");
      return;
    }

    createApplication.mutate(
      {
        jobId: job.id,
        coverLetter: coverLetter.trim(),
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        cvUrl: profile?.cvUrl ?? null,
        cvFileName,
      },
      {
        onSuccess: () => {
          toast.success("Gửi đơn ứng tuyển thành công!", {
            description:
              "Nhà tuyển dụng sẽ xem xét hồ sơ và thông báo kết quả cho bạn.",
          });
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
        Ứng tuyển việc làm
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Hoàn thiện thông tin bên dưới để gửi hồ sơ ứng tuyển.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
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
                    {profile?.fullName?.slice(0, 1)?.toUpperCase() ?? "S"}
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

          {/* CV */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">CV / Hồ sơ tài liệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="cv-upload"
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
                >
                  <Upload className="size-4" />
                  {cvFileName ? "Chọn CV khác" : "Tải CV lên"}
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setCvFileName(file.name);
                    }}
                  />
                </label>

                {cvFileName && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <FileText className="size-3.5" />
                    {cvFileName}
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
                <FieldLabel htmlFor="cover-letter" className="text-xs font-medium">
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
                <FieldLabel htmlFor="salary" className="text-xs font-medium">
                  Mức lương mong muốn (đồng/giờ)
                </FieldLabel>
                <Input
                  id="salary"
                  type="number"
                  min={0}
                  step={1000}
                  value={expectedSalary}
                  onChange={(event) => setExpectedSalary(event.target.value)}
                  placeholder="Ví dụ: 30000"
                />
                <FieldDescription>
                  Mức lương đề xuất của tin này là{" "}
                  <span className="font-medium text-foreground">
                    {formatSalary(job)}
                  </span>
                  .
                </FieldDescription>
              </Field>
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
                    {job.location.district}
                  </span>
                </div>
              </div>

              <Separator />

              <Button
                type="submit"
                className="h-10 w-full cursor-pointer font-semibold"
                disabled={createApplication.isPending}
              >
                <Send className="size-4" />
                {createApplication.isPending
                  ? "Đang gửi..."
                  : "Gửi đơn ứng tuyển"}
              </Button>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Bạn có thể theo dõi trạng thái đơn ứng tuyển tại mục “Đơn ứng
                tuyển”.
              </p>
            </CardContent>
          </Card>

          <Badge variant="outline" className="w-full justify-center py-2">
            Hồ sơ của bạn được chia sẻ với {job.employer.name}
          </Badge>
        </aside>
      </form>
    </div>
  );
}

export default ApplyJobPage;
