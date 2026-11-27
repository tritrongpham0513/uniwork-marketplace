import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Globe,
  MapPin,
  Phone,
  Save,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RatingStars } from "@/components/shared/rating-stars";
import { ErrorState } from "@/components/shared/empty-state";
import {
  useEmployerProfile,
  useUpdateEmployerProfile,
} from "@/features/profile/hooks";
import { useEmployerJobs } from "@/features/employer/hooks";
import { useEmployerApplications } from "@/features/applications/hooks";
import { useProvinces } from "@/features/jobs/hooks/useJobs";
import { cleanupReplacedFile, useUploadFile } from "@/features/files/hooks";
import {
  EMPLOYER_TYPE_LABELS,
  type EmployerProfile,
  type EmployerType,
} from "@/features/shared/types";

import { showApiError, toast } from "@/lib/toast";
import { cn } from "cn";

export default function EmployerOrganizationPage() {
  const { data: profile, isPending, isError, refetch } = useEmployerProfile();
  const updateProfile = useUpdateEmployerProfile();
  const { data: jobs = [] } = useEmployerJobs();
  const { data: applications = [] } = useEmployerApplications();
  const { data: provinces = [] } = useProvinces();

  const [form, setForm] = useState<EmployerProfile | null>(null);
  // Đồng bộ form khi hồ sơ tải về — pattern "adjust state khi dữ liệu đổi"
  const [syncedProfile, setSyncedProfile] = useState<EmployerProfile | null>(
    null
  );
  // Input file ẩn cho logo
  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useUploadFile();

  /** File vừa upload trong phiên nhưng chưa lưu — xoá khi rời trang. */
  const unsavedFilesRef = useRef<Set<string>>(new Set());

  /**
   * Logo mà người dùng **chủ động gỡ** khỏi hồ sơ.
   *
   * Phân biệt 2 trường hợp khi lưu: `logoUrl = null` vì người dùng bấm xoá
   * → gửi `""` để xoá; `logoUrl = null` vì hồ sơ vốn chưa có logo → gửi `null`
   * (không đổi). Nếu không phân biệt, `handleSave` xoá nhầm logo đã lưu trong DB.
   */
  const removedLogoRef = useRef(false);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (!form) setForm(profile);
  }

  const patch = (partial: Partial<EmployerProfile>) =>
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));

  /**
   * Tải logo lên server rồi **lưu ngay** vào hồ sơ.
   *
   * Vì sao lưu ngay chứ không đợi bấm "Lưu thay đổi": trước đây URL chỉ nằm
   * trong state của form → bấm F5 là mất logo (DB vẫn `logo_url = NULL`),
   * dù người dùng đã upload thành công và nhìn thấy logo. Logo là thay đổi
   * độc lập, không cần chờ lưu cả hồ sơ.
   */
  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    const previous = form?.logoUrl;
    try {
      const uploaded = await uploadFile.mutateAsync({ file, kind: "LOGO" });
      unsavedFilesRef.current.add(uploaded.url);
      patch({ logoUrl: uploaded.url });
      removedLogoRef.current = false;

      try {
        // Ghi pointer file vào DB ngay → F5 / mở tab khác vẫn thấy logo.
        // Không dùng `setForm(updated)` để không xoá mất các thay đổi chưa lưu
        // khác của người dùng.
        await updateProfile.mutateAsync({ logoUrl: uploaded.url });
      } catch {
        // Lưu pointer thất bại → trả lại logo cũ và dọn file mới, nếu không
        // hồ sơ sẽ trỏ tới một file bị xoá khi rời trang.
        patch({ logoUrl: previous ?? null });
        removedLogoRef.current = previous ? false : true;
        unsavedFilesRef.current.delete(uploaded.url);
        void cleanupReplacedFile(uploaded.url);
        return;
      }

      // Logo đã trở thành chính thức → không cần dọn khi rời trang nữa.
      unsavedFilesRef.current.delete(uploaded.url);
      if (previous && previous !== uploaded.url) {
        void cleanupReplacedFile(previous);
      }
    } catch {
      // Lỗi đã được hiển thị qua toast trong useUploadFile.
    }
  };

  /**
   * Tháo logo khỏi hồ sơ.
   *
   * File chưa lưu (vừa upload) → xoá ngay; file đã lưu trong DB → chỉ xoá sau
   * khi bấm "Lưu thay đổi" thành công.
   */
  const handleLogoRemove = async () => {
    const logoUrl = form?.logoUrl;
    patch({ logoUrl: null });
    removedLogoRef.current = true;
    if (!logoUrl) return;

    // File vừa upload trong phiên chưa gắn vào hồ sơ → xoá ngay.
    if (unsavedFilesRef.current.delete(logoUrl)) {
      void cleanupReplacedFile(logoUrl);
      return;
    }

    // Gỡ logo khỏi hồ sơ ngay — không đợi bấm "Lưu thay đổi",
    // nếu không người dùng bấm xoá rồi F5 thì logo cũ vẫn còn.
    try {
      await updateProfile.mutateAsync({ logoUrl: "" });
      await cleanupReplacedFile(logoUrl);
    } catch {
      // Lỗi đã được hiển thị qua toast.
    }
  };

  const handleSave = async () => {
    if (!form) return;

    // Quy ước với backend: `null` = "không đổi", chuỗi rỗng = "xoá file".
    const payload: Partial<EmployerProfile> = {
      ...form,
      // Chỉ gửi `""` (xoá) khi người dùng thực sự bấm xoá logo. Nếu hồ sơ vốn
      // chưa có logo thì gửi `null` → backend giữ nguyên, tránh xoá nhầm logo
      // đã lưu sẵn trong DB.
      logoUrl: form.logoUrl ?? (removedLogoRef.current ? "" : null),
    };

    try {
      const updated = await updateProfile.mutateAsync(payload);
      if (updated) setForm(updated);

      // File cũ đã được xoá ngay lúc thay/tháo nên không cần dọn ở đây.
      unsavedFilesRef.current.clear();
      removedLogoRef.current = false;

      toast.success("Đã cập nhật thông tin tổ chức.");
    } catch (error) {
      showApiError(error);
    }
  };

  // Rời trang khi chưa lưu → dọn file vừa upload để không để rác + hao quota.
  useEffect(() => {
    const unsaved = unsavedFilesRef.current;
    return () => {
      unsaved.forEach((url) => void cleanupReplacedFile(url));
      unsaved.clear();
    };
  }, []);

  if (isPending || !form) {
    return (
      <DashboardLayout title="Thông tin tổ chức">
        <div className="h-96 animate-pulse rounded-xl bg-muted/60" />
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title="Thông tin tổ chức">
        <ErrorState
          title="Không tải được thông tin tổ chức"
          onRetry={() => void refetch()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Thông tin tổ chức"
      description="Thông tin này được hiển thị công khai trên mọi tin tuyển dụng của bạn."
      actions={
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateProfile.isPending}
        >
          <Save className="size-4" />
          {updateProfile.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* FORM */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Thông tin doanh nghiệp
              </CardTitle>
              <CardDescription>
                Giúp sinh viên hiểu rõ hơn về đơn vị đang tuyển dụng
              </CardDescription>
            </CardHeader>

            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="employerType">
                      Loại hình nhà tuyển dụng *
                    </FieldLabel>
                    <Select
                      value={form.employerType}
                      onValueChange={(value) =>
                        patch({ employerType: value as EmployerType })
                      }
                      items={Object.entries(EMPLOYER_TYPE_LABELS).map(
                        ([value, label]) => ({ value, label })
                      )}
                    >
                      <SelectTrigger id="employerType" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EMPLOYER_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="displayName">
                      Tên hiển thị *
                    </FieldLabel>
                    <Input
                      id="displayName"
                      value={form.displayName ?? ""}
                      onChange={(event) =>
                        patch({ displayName: event.target.value })
                      }
                      placeholder="VD: Công ty TNHH ABC"
                    />
                  </Field>

                  {form.employerType === "COMPANY" && (
                    <Field>
                      <FieldLabel htmlFor="taxCode">Mã số thuế</FieldLabel>
                      <Input
                        id="taxCode"
                        value={form.taxCode ?? ""}
                        onChange={(event) =>
                          patch({ taxCode: event.target.value || null })
                        }
                        placeholder="VD: 0312345678"
                      />
                      <FieldDescription>
                        Mã số thuế là thông tin bắt buộc để xác minh doanh
                        nghiệp.
                      </FieldDescription>
                    </Field>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="contactName">
                        Người liên hệ *
                      </FieldLabel>
                      <Input
                        id="contactName"
                        value={form.contactName ?? ""}
                        onChange={(event) =>
                          patch({ contactName: event.target.value })
                        }
                        placeholder="Họ và tên người phụ trách"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="contactPhone">
                        Số điện thoại liên hệ *
                      </FieldLabel>
                      <Input
                        id="contactPhone"
                        value={form.contactPhone ?? ""}
                        onChange={(event) =>
                          patch({ contactPhone: event.target.value })
                        }
                        placeholder="VD: 0901 234 567"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="province">
                        Tỉnh / Thành phố
                      </FieldLabel>
                      <Select
                        value={form.provinceId ?? "none"}
                        onValueChange={(value) =>
                          patch({
                            provinceId: value === "none" ? null : value,
                          })
                        }
                        items={[
                          { value: "none", label: "Không xác định" },
                          ...provinces.map((province) => ({
                            value: province.id,
                            label: province.name,
                          })),
                        ]}
                      >
                        <SelectTrigger id="province" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không xác định</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="website">Website</FieldLabel>
                      <Input
                        id="website"
                        value={form.website ?? ""}
                        onChange={(event) =>
                          patch({ website: event.target.value || null })
                        }
                        placeholder="https://..."
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="address">Địa chỉ *</FieldLabel>
                    <Input
                      id="address"
                      value={form.address ?? ""}
                      onChange={(event) =>
                        patch({ address: event.target.value })
                      }
                      placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="description">
                      Mô tả giới thiệu
                    </FieldLabel>
                    <Textarea
                      id="description"
                      rows={6}
                      maxLength={1000}
                      value={form.description ?? ""}
                      onChange={(event) =>
                        patch({ description: event.target.value })
                      }
                      placeholder="Giới thiệu về công ty, môi trường làm việc, văn hóa làm việc..."
                    />
                    <FieldDescription>
                      {(form.description ?? "").length}/1000 ký tự
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>Logo</FieldLabel>
                    <FieldDescription>
                      Chấp nhận PNG, JPG, WEBP — tối đa 2MB.
                    </FieldDescription>
                    {form.logoUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={form.logoUrl}
                          alt={form.displayName}
                          className="size-14 rounded-2xl object-cover"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploadFile.isPending}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Camera className="size-4" />
                          {uploadFile.isPending ? "Đang tải..." : "Thay logo"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updateProfile.isPending}
                          onClick={handleLogoRemove}
                        >
                          Xoá logo
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadFile.isPending}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Camera className="size-4" />
                        {uploadFile.isPending ? "Đang tải..." : "Tải logo lên"}
                      </Button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void handleLogoUpload(file);
                        event.target.value = "";
                      }}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </div>

        {/* PANEL PHẢI */}
        <div className="space-y-6">
          {/* TRẠNG THÁI XÁC MINH */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Trạng thái xác minh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.isVerified ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <BadgeCheck className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Đã xác minh
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hồ sơ của bạn đã được quản trị viên kiểm tra.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Badge variant="secondary" className="gap-1">
                    Chờ xác minh
                  </Badge>
                  <ol className="space-y-2.5 text-sm">
                    {[
                      "Điền đầy đủ thông tin doanh nghiệp bên trái",
                      "Chờ quản trị viên kiểm tra MST và hồ sơ",
                      "Dấu xác minh hiển thị trên mọi tin tuyển dụng",
                    ].map((step, index) => (
                      <li
                        key={step}
                        className="flex gap-2.5 text-muted-foreground"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>

          {/* THỐNG KÊ */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Thống kê tuyển dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BadgeCheck className="size-4" />
                  Tổng tin đã đăng
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {jobs.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  Tổng ứng viên
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {applications.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Star className="size-4" />
                  Điểm đánh giá
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {form.avgRating.toFixed(1)} ({form.ratingCount})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" />
                  Liên hệ
                </span>
                <span className="font-semibold text-foreground">
                  {form.contactPhone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  Địa chỉ
                </span>
                <span className="max-w-40 truncate text-right font-medium text-foreground">
                  {form.address || "—"}
                </span>
              </div>
              {form.website && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="size-4" />
                    Website
                  </span>
                  <a
                    href={form.website}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-40 truncate text-right font-medium text-primary hover:underline"
                  >
                    {form.website}
                  </a>
                </div>
              )}

              <div
                className={cn(
                  "mt-3 rounded-lg border p-3",
                  form.isVerified
                    ? "border-border/60 bg-muted/30"
                    : "border-primary/30 bg-primary/5"
                )}
              >
                <RatingStars
                  value={form.avgRating}
                  count={form.ratingCount}
                  showValue
                  size="md"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Điểm đánh giá từ sinh viên sau khi công việc hoàn thành.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
