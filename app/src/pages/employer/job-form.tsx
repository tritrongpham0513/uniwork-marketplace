import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  Clock,
  Eye,
  MapPin,
  Plus,
  Save,
  Send,
  Trash2,
  Wallet,
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  useCreateJob,
  useEmployerJob,
  useUpdateJob,
} from "@/features/employer/hooks";
import {
  useDistricts,
  useJobCategories,
  useJobPositions,
  useProvinces,
  useSkills,
} from "@/features/jobs/hooks/useJobs";
import {
  DAY_OF_WEEK_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SALARY_TYPE_LABELS,
  WORK_MODE_LABELS,
  type DayOfWeek,
  type EmploymentType,
  type Job,
  type JobSchedule,
  type SalaryType,
  type WorkMode,
} from "@/features/shared/types";
import { PATHS } from "@/config/paths";
import { todayIso } from "@/lib/date";
import { showApiError, toast } from "@/lib/toast";

/** 4 bước của form đăng tin */
const STEPS = [
  { value: "basic", label: "Thông tin cơ bản", icon: Briefcase },
  { value: "salary", label: "Lương & suất", icon: Wallet },
  { value: "location", label: "Địa điểm & ca", icon: MapPin },
  { value: "preview", label: "Xem trước", icon: Eye },
] as const;

type StepValue = (typeof STEPS)[number]["value"];

interface FormState {
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  categoryId: string;
  positionId: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  salaryType: SalaryType;
  salaryMin: string;
  salaryMax: string;
  positionsCount: string;
  positionsFilled: string;
  provinceId: string;
  districtId: string;
  address: string;
  branchName: string;
  deadline: string;
  schedules: JobSchedule[];
  /** Danh sách kỹ năng đã chọn (public id) */
  skillIds: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  requirements: [],
  benefits: [],
  categoryId: "",
  positionId: "",
  employmentType: "PART_TIME",
  workMode: "ONSITE",
  salaryType: "HOURLY",
  salaryMin: "",
  salaryMax: "",
  positionsCount: "1",
  positionsFilled: "0",
  provinceId: "",
  districtId: "",
  address: "",
  branchName: "",
  deadline: "",
  schedules: [],
  skillIds: [],
};

const EMPLOYMENT_VALUES = Object.keys(
  EMPLOYMENT_TYPE_LABELS
) as EmploymentType[];
const WORK_MODE_VALUES = Object.keys(WORK_MODE_LABELS) as WorkMode[];
const SALARY_TYPE_VALUES = Object.keys(SALARY_TYPE_LABELS) as SalaryType[];
const DAY_VALUES = Object.keys(DAY_OF_WEEK_LABELS).map(Number) as DayOfWeek[];

/** Tổng giờ làm việc trong tuần */
const totalWeeklyHours = (schedules: JobSchedule[]): number =>
  schedules.reduce((total, schedule) => {
    const [startHour = 0, startMinute = 0] = schedule.startTime
      .split(":")
      .map(Number);
    const [endHour = 0, endMinute = 0] = schedule.endTime.split(":").map(Number);
    let hours = endHour + endMinute / 60 - (startHour + startMinute / 60);
    if (hours < 0) hours += 24;
    return total + hours;
  }, 0);

export default function EmployerJobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [step, setStep] = useState<StepValue>("basic");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [requirementInput, setRequirementInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");

  const { data: categories = [] } = useJobCategories();
  const { data: positions = [] } = useJobPositions();
  const { data: provinces = [] } = useProvinces();
  const { data: districts = [] } = useDistricts(form.provinceId || undefined);
  const { data: skills = [] } = useSkills();

  // Lưu ý: useEmployerJob bị `enabled: false` khi tạo tin mới → trạng thái
  // vẫn là "pending" (isPending = true vô điều kiện vì không có data).
  // Phải dùng isLoading (= isPending && isFetching) để không disable nút gửi.
  const { data: existingJob, isLoading: loadingJob, isError } = useEmployerJob(
    id ?? ""
  );
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  // Nạp dữ liệu khi sửa tin — pattern "adjust state khi dữ liệu đổi"
  const [syncedJob, setSyncedJob] = useState<Job | null>(null);

  if (existingJob && isEdit && existingJob !== syncedJob) {
    setSyncedJob(existingJob);
    setForm({
      title: existingJob.title,
      description: existingJob.description,
      requirements: [...existingJob.requirements],
      benefits: [...existingJob.benefits],
      categoryId: existingJob.category.id,
      positionId: existingJob.position?.id ?? "",
      employmentType: existingJob.employmentType,
      workMode: existingJob.workMode,
      salaryType: existingJob.salaryType,
      salaryMin: String(existingJob.salaryMin),
      salaryMax: existingJob.salaryMax ? String(existingJob.salaryMax) : "",
      positionsCount: String(existingJob.positionsCount),
      positionsFilled: String(existingJob.positionsFilled),
      provinceId: existingJob.location.provinceId,
      districtId: existingJob.location.districtId,
      address: existingJob.location.address,
      branchName: existingJob.location.branchName ?? "",
      deadline: existingJob.deadline?.slice(0, 10) ?? "",
      schedules: [...existingJob.schedules],
      skillIds: existingJob.skills.map((skill) => skill.id),
    });
  }

  const patch = (partial: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const visiblePositions = useMemo(
    () => positions.filter((position) => position.categoryId === form.categoryId),
    [positions, form.categoryId]
  );

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedPosition = positions.find((p) => p.id === form.positionId);
  const selectedProvince = provinces.find((p) => p.id === form.provinceId);
  const selectedDistrict = districts.find((d) => d.id === form.districtId);

  /** Kỹ năng đã chọn — gửi lên API dưới dạng nested object { id, name }. */
  const selectedSkills = useMemo(
    () =>
      skills
        .filter((skill) => form.skillIds.includes(skill.id))
        .map((skill) => ({ id: skill.id, name: skill.name })),
    [skills, form.skillIds]
  );

  /** Bật/tắt một kỹ năng trong danh sách đã chọn. */
  const toggleSkill = (skillId: string) => {
    patch({
      skillIds: form.skillIds.includes(skillId)
        ? form.skillIds.filter((id) => id !== skillId)
        : [...form.skillIds, skillId],
    });
  };

  /** Kiểm tra nội dung thiếu (dùng ở bước xem trước) */
  const missing = useMemo(() => {
    const items: string[] = [];
    if (!form.title.trim()) items.push("Tiêu đề tin");
    if (!form.categoryId) items.push("Nhóm việc");
    if (!form.description.trim()) items.push("Mô tả công việc");
    if (form.requirements.length === 0) items.push("Yêu cầu ứng tuyển");
    if (!form.salaryMin) items.push("Mức lương tối thiểu");
    if (!form.provinceId) items.push("Tỉnh/thành phố");
    if (!form.districtId) items.push("Quận/huyện");
    if (!form.address.trim()) items.push("Địa chỉ chi tiết");
    if (form.schedules.length === 0) items.push("Ca làm việc");
    return items;
  }, [form]);

  const goNext = () => {
    const index = STEPS.findIndex((item) => item.value === step);
    if (index < STEPS.length - 1) {
      setStep(STEPS[index + 1].value);
    }
  };

  const goPrev = () => {
    const index = STEPS.findIndex((item) => item.value === step);
    if (index > 0) setStep(STEPS[index - 1].value);
  };

  const handleSubmit = async () => {
    if (missing.length > 0) {
      toast.warning("Vui lòng bổ sung đầy đủ thông tin trước khi gửi.", {
        description: `Còn thiếu: ${missing.join(", ")}.`,
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements,
      benefits: form.benefits,
      category: selectedCategory!,
      position: selectedPosition ?? null,
      employmentType: form.employmentType,
      workMode: form.workMode,
      salaryType: form.salaryType,
      salaryMin: Number(form.salaryMin),
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      location: {
        provinceId: form.provinceId,
        province: selectedProvince?.name ?? "",
        districtId: form.districtId,
        district: selectedDistrict?.name ?? "",
        address: form.address.trim(),
        branchName: form.branchName.trim() || null,
      },
      positionsCount: Number(form.positionsCount) || 1,
      positionsFilled: Number(form.positionsFilled) || 0,
      schedules: form.schedules,
      skills: selectedSkills,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    };

    try {
      if (isEdit && id) {
        await updateJob.mutateAsync({ id, payload });
        toast.success("Đã cập nhật tin tuyển dụng.", {
          description: "Tin đã được gửi lại hàng đợi duyệt của quản trị viên.",
        });
      } else {
        await createJob.mutateAsync(payload);
        toast.success("Đã gửi tin tuyển dụng, đang chờ duyệt.", {
          description:
            "Quản trị viên sẽ duyệt tin trước khi hiển thị công khai.",
        });
      }
      navigate(PATHS.EMPLOYER.JOBS);
    } catch (error) {
      showApiError(error);
    }
  };

  const isPending = loadingJob || createJob.isPending || updateJob.isPending;

  if (isEdit && isError) {
    return (
      <DashboardLayout
        title="Sửa tin tuyển dụng"
      >
        <ErrorState
          title="Không tìm thấy tin tuyển dụng"
          description="Tin có thể đã bị xoá hoặc bạn không có quyền sửa."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={isEdit ? "Sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}
      description={
        isEdit
          ? "Cập nhật thông tin tin tuyển dụng. Tin sẽ được duyệt lại trước khi hiển thị."
          : "Điền đầy đủ thông tin để tin tuyển dụng được duyệt nhanh nhất."
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={PATHS.EMPLOYER.JOBS} />}
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
      }
    >
      {/* THANH BƯỚC */}
      <Tabs value={step} onValueChange={(value) => setStep(value as StepValue)}>
        <TabsList className="w-full flex-wrap justify-start gap-1 rounded-2xl p-1 group-data-horizontal/tabs:h-auto">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const currentIndex = STEPS.findIndex((s) => s.value === step);
            const done = index < currentIndex;

            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="h-9 flex-none gap-1.5"
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* ============ BƯỚC 1 — THÔNG TIN CƠ BẢN ============ */}
          {step === "basic" && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Thông tin cơ bản
                </CardTitle>
                <CardDescription>
                  Nhóm việc, vị trí và nội dung tin tuyển dụng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="title">Tiêu đề tin *</FieldLabel>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(event) =>
                          patch({ title: event.target.value })
                        }
                        placeholder="VD: Nhân viên phục vụ part-time cuối tuần"
                        maxLength={120}
                      />
                      <FieldDescription>
                        {form.title.length}/120 ký tự
                      </FieldDescription>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="category">Nhóm việc *</FieldLabel>
                        <Select
                          value={form.categoryId || "none"}
                          onValueChange={(value) =>
                            patch({
                              categoryId: value && value !== "none" ? value : "",
                              positionId: "",
                            })
                          }
                          items={[
                            { value: "none", label: "Chọn nhóm việc" },
                            ...categories.map((category) => ({
                              value: category.id,
                              label: category.name,
                            })),
                          ]}
                        >
                          <SelectTrigger id="category" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Chọn nhóm việc</SelectItem>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="position">
                          Vị trí công việc
                        </FieldLabel>
                        <Select
                          value={form.positionId || "none"}
                          onValueChange={(value) =>
                            patch({ positionId: value && value !== "none" ? value : "" })
                          }
                          disabled={!form.categoryId}
                          items={[
                            { value: "none", label: "Chọn vị trí" },
                            ...visiblePositions.map((position) => ({
                              value: position.id,
                              label: position.name,
                            })),
                          ]}
                        >
                          <SelectTrigger id="position" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Chọn vị trí</SelectItem>
                            {visiblePositions.map((position) => (
                              <SelectItem key={position.id} value={position.id}>
                                {position.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="description">
                        Mô tả công việc *
                      </FieldLabel>
                      <Textarea
                        id="description"
                        rows={8}
                        maxLength={2000}
                        value={form.description}
                        onChange={(event) =>
                          patch({ description: event.target.value })
                        }
                        placeholder="Mô tả công việc, yêu cầu và quyền lợi... Bạn có thể dùng emoji như 📣🔥💰"
                      />
                      <FieldDescription>
                        {form.description.length}/2000 ký tự
                      </FieldDescription>
                    </Field>

                    {/* YÊU CẦU ỨNG TUYỂN */}
                    <Field>
                      <FieldLegend variant="label">
                        Yêu cầu ứng tuyển *
                      </FieldLegend>
                      <div className="flex gap-2">
                        <Input
                          value={requirementInput}
                          onChange={(event) =>
                            setRequirementInput(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              if (requirementInput.trim()) {
                                patch({
                                  requirements: [
                                    ...form.requirements,
                                    requirementInput.trim(),
                                  ],
                                });
                                setRequirementInput("");
                              }
                            }
                          }}
                          placeholder="VD: Không yêu cầu kinh nghiệm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!requirementInput.trim()) return;
                            patch({
                              requirements: [
                                ...form.requirements,
                                requirementInput.trim(),
                              ],
                            });
                            setRequirementInput("");
                          }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      {form.requirements.length > 0 && (
                        <ul className="space-y-2">
                          {form.requirements.map((item, index) => (
                            <li
                              key={`${item}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                            >
                              <span className="text-sm text-foreground">
                                {item}
                              </span>
                              <button
                                type="button"
                                aria-label="Xoá yêu cầu"
                                className="cursor-pointer text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  patch({
                                    requirements: form.requirements.filter(
                                      (_, i) => i !== index
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Field>

                    {/* QUYỀN LỢI */}
                    <Field>
                      <FieldLegend variant="label">Quyền lợi</FieldLegend>
                      <div className="flex gap-2">
                        <Input
                          value={benefitInput}
                          onChange={(event) =>
                            setBenefitInput(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              if (benefitInput.trim()) {
                                patch({
                                  benefits: [...form.benefits, benefitInput.trim()],
                                });
                                setBenefitInput("");
                              }
                            }
                          }}
                          placeholder="VD: Cơm trưa, đồng phục, hoa hồng"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!benefitInput.trim()) return;
                            patch({
                              benefits: [...form.benefits, benefitInput.trim()],
                            });
                            setBenefitInput("");
                          }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      {form.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.benefits.map((item, index) => (
                            <Badge key={`${item}-${index}`} className="gap-1.5">
                              {item}
                              <button
                                type="button"
                                aria-label={`Xoá ${item}`}
                                className="cursor-pointer opacity-70 hover:opacity-100"
                                onClick={() =>
                                  patch({
                                    benefits: form.benefits.filter(
                                      (_, i) => i !== index
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Field>

                    {/* KỸ NĂNG */}
                    <Field>
                      <FieldLegend variant="label">Kỹ năng</FieldLegend>
                      <FieldDescription>
                        Chọn các kỹ năng cần cho vị trí này — giúp ứng viên
                        phù hợp nhận được tin tuyển dụng.
                      </FieldDescription>

                      {form.skillIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill.id} className="gap-1.5">
                              {skill.name}
                              <button
                                type="button"
                                aria-label={`Xoá ${skill.name}`}
                                className="cursor-pointer opacity-70 hover:opacity-100"
                                onClick={() => toggleSkill(skill.id)}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {skills
                          .filter((skill) => !form.skillIds.includes(skill.id))
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
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </CardContent>
            </Card>
          )}

          {/* ============ BƯỚC 2 — LƯƠNG & SUẤT ============ */}
          {step === "salary" && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Lương & suất tuyển
                </CardTitle>
                <CardDescription>
                  Khoảng lương hiển thị rõ giúp tin của bạn được xếp hạng cao
                  hơn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldSet>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="employmentType">
                          Loại hình làm việc *
                        </FieldLabel>
                        <Select
                          value={form.employmentType}
                          onValueChange={(value) =>
                            patch({ employmentType: value as EmploymentType })
                          }
                          items={EMPLOYMENT_VALUES.map((value) => ({
                            value,
                            label: EMPLOYMENT_TYPE_LABELS[value],
                          }))}
                        >
                          <SelectTrigger
                            id="employmentType"
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_VALUES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {EMPLOYMENT_TYPE_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="workMode">
                          Hình thức làm việc
                        </FieldLabel>
                        <Select
                          value={form.workMode}
                          onValueChange={(value) =>
                            patch({ workMode: value as WorkMode })
                          }
                          items={WORK_MODE_VALUES.map((value) => ({
                            value,
                            label: WORK_MODE_LABELS[value],
                          }))}
                        >
                          <SelectTrigger id="workMode" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORK_MODE_VALUES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {WORK_MODE_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="salaryType">Kiểu trả lương *</FieldLabel>
                      <Select
                        value={form.salaryType}
                        onValueChange={(value) =>
                          patch({ salaryType: value as SalaryType })
                        }
                        items={SALARY_TYPE_VALUES.map((value) => ({
                          value,
                          label: SALARY_TYPE_LABELS[value],
                        }))}
                      >
                        <SelectTrigger id="salaryType" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SALARY_TYPE_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {SALARY_TYPE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="salaryMin">
                          Khoảng lương tối thiểu *
                        </FieldLabel>
                        <Input
                          id="salaryMin"
                          type="number"
                          step={1000}
                          min={0}
                          value={form.salaryMin}
                          onChange={(event) =>
                            patch({ salaryMin: event.target.value })
                          }
                          placeholder="VD: 25000"
                        />
                        <FieldDescription>
                          {SALARY_TYPE_LABELS[form.salaryType]}
                        </FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="salaryMax">
                          Khoảng lương tối đa
                        </FieldLabel>
                        <Input
                          id="salaryMax"
                          type="number"
                          step={1000}
                          min={0}
                          value={form.salaryMax}
                          onChange={(event) =>
                            patch({ salaryMax: event.target.value })
                          }
                          placeholder="Để trống nếu không giới hạn"
                        />
                      </Field>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="positionsCount">
                          Số suất tuyển *
                        </FieldLabel>
                        <Input
                          id="positionsCount"
                          type="number"
                          min={1}
                          value={form.positionsCount}
                          onChange={(event) =>
                            patch({ positionsCount: event.target.value })
                          }
                        />
                      </Field>

                      {isEdit && (
                        <Field>
                          <FieldLabel htmlFor="positionsFilled">
                            Số suất đã tuyển
                          </FieldLabel>
                          <Input
                            id="positionsFilled"
                            type="number"
                            min={0}
                            value={form.positionsFilled}
                            onChange={(event) =>
                              patch({ positionsFilled: event.target.value })
                            }
                          />
                        </Field>
                      )}
                    </div>
                  </FieldGroup>
                </FieldSet>
              </CardContent>
            </Card>
          )}

          {/* ============ BƯỚC 3 — ĐỊA ĐIỂM & CA LÀM ============ */}
          {step === "location" && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Địa điểm & ca làm việc
                </CardTitle>
                <CardDescription>
                  Ứng viên cần biết chính xác ca làm và địa điểm trước khi ứng
                  tuyển
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldSet>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="province">
                          Tỉnh / Thành phố *
                        </FieldLabel>
                        <Select
                          value={form.provinceId || "none"}
                          onValueChange={(value) =>
                            patch({
                              provinceId: value && value !== "none" ? value : "",
                              districtId: "",
                            })
                          }
                          items={[
                            { value: "none", label: "Chọn tỉnh/thành" },
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
                            <SelectItem value="none">
                              Chọn tỉnh/thành
                            </SelectItem>
                            {provinces.map((province) => (
                              <SelectItem
                                key={province.id}
                                value={province.id}
                              >
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="district">
                          Quận / Huyện *
                        </FieldLabel>
                        <Select
                          value={form.districtId || "none"}
                          onValueChange={(value) =>
                            patch({
                              districtId: value && value !== "none" ? value : "",
                            })
                          }
                          disabled={!form.provinceId}
                          items={[
                            { value: "none", label: "Chọn quận/huyện" },
                            ...districts.map((district) => ({
                              value: district.id,
                              label: district.name,
                            })),
                          ]}
                        >
                          <SelectTrigger id="district" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Chọn quận/huyện
                            </SelectItem>
                            {districts.map((district) => (
                              <SelectItem
                                key={district.id}
                                value={district.id}
                              >
                                {district.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="address">Địa chỉ chi tiết *</FieldLabel>
                      <Input
                        id="address"
                        value={form.address}
                        onChange={(event) =>
                          patch({ address: event.target.value })
                        }
                        placeholder="Số nhà, đường, tòa nhà..."
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="branchName">
                        Tên chi nhánh / địa điểm
                      </FieldLabel>
                      <Input
                        id="branchName"
                        value={form.branchName}
                        onChange={(event) =>
                          patch({ branchName: event.target.value })
                        }
                        placeholder="VD: Chi nhánh chính, Khu đô thị Đại học Quốc Gia"
                      />
                    </Field>

                    <Separator />

                    {/* SCHEDULE EDITOR */}
                    <Field>
                      <FieldLegend variant="label">Ca làm việc *</FieldLegend>
                      <FieldDescription>
                        Thêm ca theo ngày trong tuần. Tổng:{" "}
                        <span className="font-semibold text-foreground">
                          {totalWeeklyHours(form.schedules).toFixed(1)} giờ/tuần
                        </span>
                      </FieldDescription>

                      <div className="space-y-2">
                        {form.schedules.map((schedule, index) => (
                          <div
                            key={`${schedule.dayOfWeek}-${index}`}
                            className="grid items-end gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[auto_1fr_1fr_auto]"
                          >
                            <Select
                              value={String(schedule.dayOfWeek)}
                              onValueChange={(value) =>
                                patch({
                                  schedules: form.schedules.map((item, i) =>
                                    i === index
                                      ? {
                                          ...item,
                                          dayOfWeek: Number(value) as DayOfWeek,
                                        }
                                      : item
                                  ),
                                })
                              }
                              items={DAY_VALUES.map((value) => ({
                                value: String(value),
                                label: DAY_OF_WEEK_LABELS[value],
                              }))}
                            >
                              <SelectTrigger className="w-full sm:w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAY_VALUES.map((value) => (
                                  <SelectItem
                                    key={value}
                                    value={String(value)}
                                  >
                                    {DAY_OF_WEEK_LABELS[value]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Field>
                              <FieldLabel htmlFor={`start-${index}`}>
                                Bắt đầu
                              </FieldLabel>
                              <Input
                                id={`start-${index}`}
                                type="time"
                                value={schedule.startTime}
                                onChange={(event) =>
                                  patch({
                                    schedules: form.schedules.map((item, i) =>
                                      i === index
                                        ? { ...item, startTime: event.target.value }
                                        : item
                                    ),
                                  })
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`end-${index}`}>
                                Kết thúc
                              </FieldLabel>
                              <Input
                                id={`end-${index}`}
                                type="time"
                                value={schedule.endTime}
                                onChange={(event) =>
                                  patch({
                                    schedules: form.schedules.map((item, i) =>
                                      i === index
                                        ? { ...item, endTime: event.target.value }
                                        : item
                                    ),
                                  })
                                }
                              />
                            </Field>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Xoá ca"
                              onClick={() =>
                                patch({
                                  schedules: form.schedules.filter(
                                    (_, i) => i !== index
                                  ),
                                })
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          patch({
                            schedules: [
                              ...form.schedules,
                              {
                                dayOfWeek: 1,
                                startTime: "08:00",
                                endTime: "16:00",
                              },
                            ],
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Thêm ca làm
                      </Button>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="deadline">
                        Hạn nộp ứng tuyển
                      </FieldLabel>
                      <DatePicker
                        id="deadline"
                        value={form.deadline}
                        onChange={(value) =>
                          patch({ deadline: value ?? "" })
                        }
                        min={todayIso()}
                        placeholder="Chọn hạn nộp"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </CardContent>
            </Card>
          )}

          {/* ============ BƯỚC 4 — XEM TRƯỚC ============ */}
          {step === "preview" && (
            <div className="space-y-4">
              {missing.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="flex gap-3 p-4">
                    <AlertTriangle className="size-5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Còn thiếu {missing.length} thông tin
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {missing.join(" · ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/60">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedCategory && (
                      <Badge variant="secondary">{selectedCategory.name}</Badge>
                    )}
                    {selectedPosition && (
                      <Badge variant="outline">{selectedPosition.name}</Badge>
                    )}
                    <Badge variant="outline">
                      {EMPLOYMENT_TYPE_LABELS[form.employmentType]}
                    </Badge>
                  </div>
                  <CardTitle className="font-heading text-lg">
                    {form.title || "Tiêu đề tin tuyển dụng"}
                  </CardTitle>
                  <CardDescription>
                    {form.provinceId
                      ? `${selectedDistrict?.name ?? ""}, ${selectedProvince?.name ?? ""}`
                      : "Địa điểm chưa được chọn"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* THANH TÓM TẮT 4 Ô */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Lương
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {form.salaryMin
                          ? `${Number(form.salaryMin).toLocaleString("vi-VN")}${
                              form.salaryMax
                                ? ` – ${Number(form.salaryMax).toLocaleString("vi-VN")}`
                                : ""
                            }`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Loại hình
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {EMPLOYMENT_TYPE_LABELS[form.employmentType]}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Cần tuyển
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {form.positionsCount || 0} người
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        Địa điểm
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedDistrict?.name ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-heading text-sm font-semibold text-foreground">
                      Mô tả công việc
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                      {form.description || "Chưa có mô tả công việc."}
                    </p>
                  </div>

                  {form.requirements.length > 0 && (
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Yêu cầu ứng tuyển
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {form.requirements.map((item, index) => (
                          <li
                            key={`${item}-${index}`}
                            className="flex gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {form.benefits.length > 0 && (
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Quyền lợi
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {form.benefits.map((item, index) => (
                          <Badge key={`${item}-${index}`} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSkills.length > 0 && (
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Kỹ năng
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedSkills.map((skill) => (
                          <Badge key={skill.id} variant="secondary">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.schedules.length > 0 && (
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Ca làm việc
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {form.schedules.map((schedule, index) => (
                          <li
                            key={`${schedule.dayOfWeek}-${index}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Clock className="size-4 shrink-0" />
                            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}:{" "}
                            {schedule.startTime} – {schedule.endTime}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ĐIỀU HƯỚNG BƯỚC */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={step === "basic"}
            >
              <ArrowLeft className="size-4" />
              Trước
            </Button>

            {step !== "preview" ? (
              <Button onClick={goNext}>
                Tiếp theo
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending}>
                <Send className="size-4" />
                {isPending
                  ? "Đang gửi..."
                  : isEdit
                    ? "Lưu & gửi duyệt"
                    : "Gửi tin tuyển dụng"}
              </Button>
            )}
          </div>
        </div>

        {/* CỘT PHẢI — TÓM TẮT */}
        <div>
          <div className="space-y-4 lg:sticky lg:top-20">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Tóm tắt tin đăng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Nhóm việc</span>
                  <span className="text-right font-medium text-foreground">
                    {selectedCategory?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Vị trí</span>
                  <span className="text-right font-medium text-foreground">
                    {selectedPosition?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Loại hình</span>
                  <span className="text-right font-medium text-foreground">
                    {EMPLOYMENT_TYPE_LABELS[form.employmentType]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Kiểu trả lương</span>
                  <span className="text-right font-medium text-foreground">
                    {SALARY_TYPE_LABELS[form.salaryType]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Suất tuyển</span>
                  <span className="text-right font-medium text-foreground">
                    {form.positionsCount || 0} người
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tổng giờ/tuần</span>
                  <span className="text-right font-medium text-foreground">
                    {totalWeeklyHours(form.schedules).toFixed(1)} giờ
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Số ca</span>
                  <span className="text-right font-medium text-foreground">
                    {form.schedules.length} ca
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-primary/5">
              <CardContent className="flex gap-3 p-4">
                <CalendarClock className="size-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Tin sẽ ở trạng thái "Chờ duyệt"
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quản trị viên duyệt trước khi tin hiển thị công khai. Bạn
                    sẽ nhận được thông báo khi có kết quả.
                  </p>
                </div>
              </CardContent>
            </Card>

            {isEdit && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSubmit}
                disabled={isPending}
              >
                <Save className="size-4" />
                Lưu thay đổi
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
