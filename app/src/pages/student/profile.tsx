import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  Camera,
  Check,
  FileText,
  GraduationCap,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  X,
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ErrorState } from "@/components/shared/empty-state";
import { DatePicker } from "@/components/shared/date-picker";
import { RatingStars } from "@/components/shared/rating-stars";
import {
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
  type EmploymentType,
  type GenderType,
  type StudentExperience,
  type StudentProfile,
} from "@/features/shared/types";
import {
  useStudentProfile,
  useUpdateStudentProfile,
} from "@/features/profile/hooks";
import { useStudentWorkHistory } from "@/features/work-history/hooks";
import { useJobCategories, useProvinces, useSkills } from "@/features/jobs/hooks/useJobs";
import { useDeleteFile, useUploadFile } from "@/features/files/hooks";
import { formatDateVi, todayIso } from "@/lib/date";
import { showApiError, toast } from "@/lib/toast";
import { PATHS } from "@/config/paths";

import { cn } from "cn";

/** Các nhóm kiểm tra để tính mức độ hoàn thiện hồ sơ */
const COMPLETION_CHECKS = [
  { key: "avatar", label: "Ảnh đại diện" },
  { key: "contact", label: "Thông tin liên hệ" },
  { key: "education", label: "Thông tin học vấn" },
  { key: "skills", label: "Kỹ năng" },
  { key: "bio", label: "Giới thiệu bản thân" },
  { key: "preferences", label: "Mục tiêu việc làm" },
  { key: "cv", label: "CV" },
  { key: "experience", label: "Kinh nghiệm" },
] as const;

type CompletionKey = (typeof COMPLETION_CHECKS)[number]["key"];

const EMPTY_EXPERIENCE: StudentExperience = {
  id: "",
  company: "",
  position: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function StudentProfilePage() {
  const { data: profile, isPending, isError, refetch } = useStudentProfile();
  const updateProfile = useUpdateStudentProfile();

  const { data: categories = [] } = useJobCategories();
  const { data: provinces = [] } = useProvinces();
  const { data: skills = [] } = useSkills();
  // Kinh nghiệm làm việc do hệ thống tự ghi nhận (đơn ứng tuyển hoàn thành)
  const { data: workHistories = [] } = useStudentWorkHistory();

  const [form, setForm] = useState<StudentProfile | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState<StudentExperience | null>(null);
  // Đồng bộ form khi hồ sơ tải về — pattern "adjust state khi dữ liệu đổi"
  const [syncedProfile, setSyncedProfile] = useState<StudentProfile | null>(null);
  // Input file ẩn cho CV & ảnh đại diện
  const cvInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (!form) setForm(profile);
  }

  const completion = useMemo(() => {
    if (!form) return { percent: 0, checks: {} as Record<CompletionKey, boolean> };

    const checks: Record<CompletionKey, boolean> = {
      avatar: Boolean(form.avatarUrl),
      contact: Boolean(form.phone && form.address),
      education: Boolean(form.studentCode && form.university && form.major),
      skills: form.skills.length > 0,
      bio: Boolean(form.bio.trim()),
      preferences:
        form.jobPreferences.categoryIds.length > 0 &&
        form.jobPreferences.employmentTypes.length > 0,
      cv: Boolean(form.cvUrl),
      experience: form.experiences.length > 0,
    };

    const done = COMPLETION_CHECKS.filter((item) => checks[item.key]).length;
    return {
      percent: Math.round((done / COMPLETION_CHECKS.length) * 100),
      checks,
    };
  }, [form]);

  const handleSave = async () => {
    if (!form) return;
    try {
      await updateProfile.mutateAsync(form);
      toast.success("Đã lưu hồ sơ tìm việc.", {
        description: "Hồ sơ của bạn đã được cập nhật thành công.",
      });
    } catch (error) {
      showApiError(error);
    }
  };

  const patch = (partial: Partial<StudentProfile>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  /**
   * Tải CV lên server rồi lưu URL vào hồ sơ.
   *
   * File được upload ngay khi chọn — URL trả về được ghi vào form, người dùng
   * bấm "Lưu hồ sơ" để lưu xuống DB.
   */
  const handleCvUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const uploaded = await uploadFile.mutateAsync({ file, kind: "CV" });
      patch({ cvUrl: uploaded.url });
    } catch {
      // Lỗi đã được hiển thị qua toast trong useUploadFile.
    }
  };

  /** Tải ảnh đại diện lên server rồi lưu URL vào hồ sơ. */
  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const uploaded = await uploadFile.mutateAsync({ file, kind: "AVATAR" });
      patch({ avatarUrl: uploaded.url });
    } catch {
      // Lỗi đã được hiển thị qua toast trong useUploadFile.
    }
  };

  /** Xoá CV khỏi hồ sơ (xoá mềm file trên server + gỡ URL). */
  const handleCvRemove = async () => {
    const cvUrl = form?.cvUrl;
    patch({ cvUrl: null });

    if (!cvUrl) return;
    const fileId = cvUrl.split("/").pop();
    if (!fileId) return;
    try {
      await deleteFile.mutateAsync({ id: fileId, kind: "CV" });
    } catch {
      // Đã gỡ khỏi hồ sơ rồi — không cần báo lỗi thêm.
    }
  };

  const toggleSkill = (skillId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const skills = prev.skills.includes(skillId)
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId];
      return { ...prev, skills };
    });
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || !form) return;
    // Nếu người dùng gõ đúng tên một kỹ năng có sẵn thì lưu id để
    // đồng bộ với danh sách kỹ năng (tránh trùng "Excel" và "sk-excel").
    const matched = skills.find(
      (skill) => skill.name.toLowerCase() === value.toLowerCase()
    );
    const skillId = matched?.id ?? value;
    if (!form.skills.includes(skillId)) {
      patch({ skills: [...form.skills, skillId] });
    }
    setSkillInput("");
  };

  const removeExperience = (id: string) => {
    patch({
      experiences: form?.experiences.filter((item) => item.id !== id) ?? [],
    });
  };

  const saveExperience = () => {
    if (!experience || !form) return;
    if (!experience.company.trim() || !experience.position.trim()) {
      toast.warning("Vui lòng nhập tên công ty và vai trò.");
      return;
    }

    const id = experience.id || `exp-${Date.now()}`;
    const next = { ...experience, id };
    const exists = form.experiences.some((item) => item.id === id);

    patch({
      experiences: exists
        ? form.experiences.map((item) => (item.id === id ? next : item))
        : [...form.experiences, next],
    });

    setExperience(null);
    toast.success(exists ? "Đã cập nhật kinh nghiệm." : "Đã thêm kinh nghiệm.");
  };

  if (isPending || !form) {
    return (
      <DashboardLayout
        title="Hồ sơ tìm việc"
        description="Quản lý thông tin cá nhân, học vấn và kỹ năng của bạn."
      >
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-96 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout
        title="Hồ sơ tìm việc"
      >
        <ErrorState
          title="Không tải được hồ sơ"
          description="Vui lòng thử lại sau."
          onRetry={() => void refetch()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Hồ sơ tìm việc"
      description="Quản lý thông tin cá nhân, học vấn và kỹ năng của bạn."
      actions={
        <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
          <Save className="size-4" />
          {updateProfile.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      }
    >
      {/* THANH MỨC ĐỘ HOÀN THIỆN */}
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={form.fullName}
                  className="size-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                  {form.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                aria-label="Đổi ảnh đại diện"
                disabled={uploadFile.isPending}
                className="absolute -right-1 -bottom-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void handleAvatarUpload(file);
                  // Cho phép chọn lại cùng một file ngay sau khi upload
                  event.target.value = "";
                }}
              />
            </div>

            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                {form.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                {form.major} · {form.university}
              </p>

              {/* Điểm đánh giá từ nhà tuyển dụng — dẫn tới trang /student/reviews */}
              {form.ratingCount > 0 && (
                <Link
                  to={PATHS.STUDENT.REVIEWS}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <RatingStars
                    value={form.avgRating}
                    size="xs"
                    showValue
                    count={form.ratingCount}
                  />
                  Xem đánh giá
                </Link>
              )}
            </div>
          </div>

          <div className="flex-1 sm:ml-auto sm:max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Mức độ hoàn thiện hồ sơ
              </span>
              <span className="font-semibold text-primary tabular-nums">
                {completion.percent}%
              </span>
            </div>
            <Progress value={completion.percent} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COMPLETION_CHECKS.map((item) => (
                <Badge
                  key={item.key}
                  variant={completion.checks[item.key] ? "secondary" : "outline"}
                  className={cn(
                    "gap-1 text-[10px]",
                    !completion.checks[item.key] && "text-muted-foreground"
                  )}
                >
                  {completion.checks[item.key] ? (
                    <Check className="size-2.5" />
                  ) : (
                    <X className="size-2.5" />
                  )}
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
          <TabsTrigger value="skills">Kỹ năng & kinh nghiệm</TabsTrigger>
        </TabsList>

        {/* ================= TAB 1 — HỒ SƠ ================= */}
        <TabsContent value="profile" className="mt-5 space-y-5">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <User className="size-4 text-primary" />
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="fullName">Họ và tên</FieldLabel>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(event) =>
                          patch({ fullName: event.target.value })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(event) =>
                          patch({ phone: event.target.value })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="dateOfBirth">Ngày sinh</FieldLabel>
                      <DatePicker
                        id="dateOfBirth"
                        value={form.dateOfBirth}
                        onChange={(value) => patch({ dateOfBirth: value })}
                        max={todayIso()}
                        placeholder="Chọn ngày sinh"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="gender">Giới tính</FieldLabel>
                      <Select
                        value={form.gender ?? "OTHER"}
                        onValueChange={(value) =>
                          patch({ gender: value as GenderType })
                        }
                        items={Object.entries(GENDER_LABELS).map(
                          ([value, label]) => ({ value, label })
                        )}
                      >
                        <SelectTrigger id="gender" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GENDER_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="provinceId">Tỉnh / Thành phố</FieldLabel>
                    <Select
                      value={form.provinceId ?? "__none__"}
                      onValueChange={(value) =>
                        patch({ provinceId: value === "__none__" ? null : value })
                      }
                      items={[
                        { value: "__none__", label: "Chưa chọn tỉnh" },
                        ...provinces.map((province) => ({
                          value: province.id,
                          label: province.name,
                        })),
                      ]}
                    >
                      <SelectTrigger id="provinceId" className="w-full">
                        <SelectValue placeholder="Chọn tỉnh / thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Chưa chọn tỉnh</SelectItem>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="address">Địa chỉ</FieldLabel>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(event) =>
                        patch({ address: event.target.value })
                      }
                      placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <GraduationCap className="size-4 text-primary" />
                Học vấn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="studentCode">Mã sinh viên</FieldLabel>
                      <Input
                        id="studentCode"
                        value={form.studentCode}
                        onChange={(event) =>
                          patch({ studentCode: event.target.value })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="yearOfStudy">Năm học</FieldLabel>
                      <Input
                        id="yearOfStudy"
                        type="number"
                        min={1}
                        max={7}
                        value={form.yearOfStudy ?? ""}
                        onChange={(event) =>
                          patch({
                            yearOfStudy: event.target.value
                              ? Number(event.target.value)
                              : null,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="university">Trường đại học</FieldLabel>
                    <Input
                      id="university"
                      value={form.university}
                      onChange={(event) =>
                        patch({ university: event.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="major">Ngành học</FieldLabel>
                    <Input
                      id="major"
                      value={form.major}
                      onChange={(event) =>
                        patch({ major: event.target.value })
                      }
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Briefcase className="size-4 text-primary" />
                Mục tiêu việc làm
              </CardTitle>
              <CardDescription>
                Giúp chúng tôi gợi ý những tin tuyển dụng phù hợp nhất với bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLegend variant="label">
                      Nhóm việc muốn làm
                    </FieldLegend>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => {
                        const selected =
                          form.jobPreferences.categoryIds.includes(category.id);
                        return (
                          <Badge
                            key={category.id}
                            variant={selected ? "default" : "outline"}
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() =>
                              patch({
                                jobPreferences: {
                                  ...form.jobPreferences,
                                  categoryIds: selected
                                    ? form.jobPreferences.categoryIds.filter(
                                        (id) => id !== category.id
                                      )
                                    : [
                                        ...form.jobPreferences.categoryIds,
                                        category.id,
                                      ],
                                },
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                              }
                            }}
                          >
                            {category.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </Field>

                  <Field>
                    <FieldLegend variant="label">
                      Loại hình việc làm mong muốn
                    </FieldLegend>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]
                      ).map((type) => {
                        const selected =
                          form.jobPreferences.employmentTypes.includes(type);
                        return (
                          <Badge
                            key={type}
                            variant={selected ? "default" : "outline"}
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() =>
                              patch({
                                jobPreferences: {
                                  ...form.jobPreferences,
                                  employmentTypes: selected
                                    ? form.jobPreferences.employmentTypes.filter(
                                        (item) => item !== type
                                      )
                                    : [
                                        ...form.jobPreferences.employmentTypes,
                                        type,
                                      ],
                                },
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                              }
                            }}
                          >
                            {EMPLOYMENT_TYPE_LABELS[type]}
                          </Badge>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="salaryMin">
                        Lương kỳ vọng tối thiểu (đ/giờ)
                      </FieldLabel>
                      <Input
                        id="salaryMin"
                        type="number"
                        step={1000}
                        value={form.jobPreferences.salaryMin}
                        onChange={(event) =>
                          patch({
                            jobPreferences: {
                              ...form.jobPreferences,
                              salaryMin: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="salaryMax">
                        Lương kỳ vọng tối đa (đ/giờ)
                      </FieldLabel>
                      <Input
                        id="salaryMax"
                        type="number"
                        step={1000}
                        value={form.jobPreferences.salaryMax}
                        onChange={(event) =>
                          patch({
                            jobPreferences: {
                              ...form.jobPreferences,
                              salaryMax: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="preferenceProvince">
                        Địa điểm mong muốn
                      </FieldLabel>
                      <Select
                        value={form.jobPreferences.provinceIds[0] ?? "none"}
                        onValueChange={(value) =>
                          patch({
                            jobPreferences: {
                              ...form.jobPreferences,
                              provinceIds: value && value !== "none" ? [value] : [],
                            },
                          })
                        }
                        items={[
                          { value: "none", label: "Không giới hạn" },
                          ...provinces.map((province) => ({
                            value: province.id,
                            label: province.name,
                          })),
                        ]}
                      >
                        <SelectTrigger id="preferenceProvince" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không giới hạn</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <FileText className="size-4 text-primary" />
                Giới thiệu bản thân & CV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="bio">Giới thiệu bản thân</FieldLabel>
                  <Textarea
                    id="bio"
                    rows={5}
                    maxLength={800}
                    value={form.bio}
                    onChange={(event) => patch({ bio: event.target.value })}
                    placeholder="Giới thiệu ngắn gọn về bạn, kỹ năng và động lực làm việc..."
                  />
                  <FieldDescription>
                    {form.bio.length}/800 ký tự
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>CV / Hồ sơ tải về</FieldLabel>
                  <FieldDescription>
                    Chấp nhận PDF, DOC, DOCX — tối đa 5MB.
                  </FieldDescription>
                  {form.cvUrl ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span className="truncate text-sm text-foreground">
                          {form.cvUrl.split("/").pop()}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={uploadFile.isPending}
                          onClick={() => cvInputRef.current?.click()}
                        >
                          <Upload className="size-4" />
                          Thay CV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteFile.isPending}
                          onClick={() => void handleCvRemove()}
                        >
                          <Trash2 className="size-4" />
                          Xoá
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadFile.isPending}
                      onClick={() => cvInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      {uploadFile.isPending ? "Đang tải lên..." : "Tải CV lên"}
                    </Button>
                  )}
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleCvUpload(file);
                      event.target.value = "";
                    }}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2 — KỸ NĂNG & KINH NGHIỆM ================= */}
        <TabsContent value="skills" className="mt-5 space-y-5">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">Kỹ năng</CardTitle>
              <CardDescription>
                Chọn các kỹ năng bạn thành thạo để nhà tuyển dụng nhanh chóng
                đánh giá hồ sơ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Nhập kỹ năng khác rồi nhấn Enter"
                />
                <Button variant="outline" onClick={addSkill}>
                  <Plus className="size-4" />
                  Thêm
                </Button>
              </div>

              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map((skillId) => {
                    const skill = skills.find((item) => item.id === skillId);
                    return (
                      <Badge key={skillId} className="gap-1.5">
                        {skill?.name ?? skillId}
                        <button
                          type="button"
                          aria-label={`Xoá ${skill?.name ?? skillId}`}
                          className="cursor-pointer opacity-70 hover:opacity-100"
                          onClick={() => toggleSkill(skillId)}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Kỹ năng phổ biến
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skills
                    .filter((skill) => !form.skills.includes(skill.id))
                    .map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => toggleSkill(skill.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleSkill(skill.id);
                          }
                        }}
                      >
                        <Plus className="size-3" />
                        {skill.name}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Kinh nghiệm làm việc
              </CardTitle>
              <CardDescription>
                Kinh nghiệm thực tế giúp bạn nổi bật hơn khi ứng tuyển
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.experiences.length > 0 && (
                <ul className="space-y-3">
                  {form.experiences.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.position}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.company} · {formatDateVi(item.startDate)} —{" "}
                          {item.endDate ? formatDateVi(item.endDate) : "Hiện tại"}
                        </p>
                        {item.description && (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Sửa kinh nghiệm"
                          onClick={() => setExperience(item)}
                        >
                          <FileText className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Xoá kinh nghiệm"
                          onClick={() => removeExperience(item.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {experience ? (
                <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {experience.id ? "Sửa kinh nghiệm" : "Thêm kinh nghiệm mới"}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="exp-company">Công ty</FieldLabel>
                      <Input
                        id="exp-company"
                        value={experience.company}
                        onChange={(event) =>
                          setExperience({ ...experience, company: event.target.value })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="exp-position">Vai trò</FieldLabel>
                      <Input
                        id="exp-position"
                        value={experience.position}
                        onChange={(event) =>
                          setExperience({
                            ...experience,
                            position: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="exp-start">Bắt đầu</FieldLabel>
                      <DatePicker
                        id="exp-start"
                        value={experience.startDate}
                        onChange={(value) =>
                          setExperience({
                            ...experience,
                            startDate: value ?? "",
                          })
                        }
                        max={todayIso()}
                        placeholder="Chọn ngày bắt đầu"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="exp-end">Kết thúc</FieldLabel>
                      <DatePicker
                        id="exp-end"
                        value={experience.endDate}
                        onChange={(value) =>
                          setExperience({
                            ...experience,
                            endDate: value,
                          })
                        }
                        min={experience.startDate || null}
                        max={todayIso()}
                        placeholder="Chọn ngày kết thúc"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="exp-desc">Mô tả công việc</FieldLabel>
                    <Textarea
                      id="exp-desc"
                      rows={3}
                      value={experience.description}
                      onChange={(event) =>
                        setExperience({
                          ...experience,
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveExperience}>
                      <Check className="size-4" />
                      Lưu kinh nghiệm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExperience(null)}
                    >
                      Huỷ
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExperience({ ...EMPTY_EXPERIENCE })}
                >
                  <Plus className="size-4" />
                  Thêm kinh nghiệm
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ===== KINH NGHIỆM TỰ HỆ THỐNG GHI NHẬN ===== */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Briefcase className="size-4 text-primary" />
                Kinh nghiệm đã hoàn thành trên VieJob
              </CardTitle>
              <CardDescription>
                VieJob tự động ghi nhận mỗi công việc mà nhà tuyển dụng xác nhận
                bạn đã hoàn thành. Nhà tuyển dụng khác có thể xem mục này khi
                xét duyệt hồ sơ của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workHistories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có công việc nào được ghi nhận. Khi bạn hoàn thành một
                  công việc, nhà tuyển dụng sẽ xác nhận và mục này tự động cập
                  nhật.
                </p>
              )}

              {workHistories.length > 0 && (
                <ul className="space-y-3">
                  {workHistories.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {item.positionName || item.jobTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.companyName}
                          </p>
                        </div>
                        {item.rating != null && (
                          <RatingStars
                            value={item.rating}
                            size="xs"
                            showValue
                          />
                        )}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.jobTitle}
                      </p>

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatDateVi(item.startedAt)} —{" "}
                        {formatDateVi(item.completedAt)}
                      </p>

                      {item.note && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          “{item.note}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Nút lưu cố định cuối trang (mobile-friendly) */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          <Save className="size-4" />
          {updateProfile.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
