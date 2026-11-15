import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  EMPLOYMENT_TYPE_LABELS,
  SALARY_UNIT_LABELS,
  WORK_MODE_LABELS,
  type EmploymentType,
  type SalaryUnit,
  type WorkMode,
} from "@/features/jobs/types";
import { useJobFilters } from "@/features/jobs/hooks/useJobFilters";
import {
  useDistricts,
  useJobCategories,
  useJobPositions,
  useProvinces,
} from "@/features/jobs/hooks/useJobs";

const SALARY_STEP = 5000;

/** Trần lương theo từng đơn vị (đồng) */
const SALARY_MAX_BY_UNIT: Record<SalaryUnit, number> = {
  HOURLY: 200000,
  DAILY: 1600000,
  WEEKLY: 8000000,
  MONTHLY: 32000000,
};

const SALARY_UNIT_ITEMS = (
  Object.keys(SALARY_UNIT_LABELS) as SalaryUnit[]
).map((value) => ({
  value,
  label: SALARY_UNIT_LABELS[value],
}));

const compact = (value: number) =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;

interface JobFiltersProps {
  /** Gọi khi người dùng đóng sheet bộ lọc trên mobile */
  onApplied?: () => void;
  /**
   * Class cho vùng cuộn bên trong Card. Ở sidebar desktop truyền vào
   * `max-h-* overflow-y-auto scroll-fade no-scrollbar` để card cao bằng màn hình,
   * tự cuộn và có hiệu ứng mờ dần ở hai cạnh (kiểu shadcn `scroll-fade`).
   */
  className?: string;
}

export function JobFilters({ onApplied, className }: JobFiltersProps) {
  const { filters, update, toggleInList, reset } = useJobFilters();

  const { data: categories = [] } = useJobCategories();
  const { data: provinces = [] } = useProvinces();
  const { data: positions = [] } = useJobPositions();
  const { data: districts = [] } = useDistricts(filters.provinceIds[0]);

  // Vị trí thuộc nhóm việc đang chọn (hoặc tất cả nếu chưa chọn nhóm nào)
  const visiblePositions = positions.filter(
    (position) =>
      filters.categoryIds.length === 0 ||
      filters.categoryIds.includes(position.categoryId)
  );

  const provinceItems = [
    { value: "all", label: "Tất cả địa điểm" },
    ...provinces.map((province) => ({
      value: province.id,
      label: province.name,
    })),
  ];

  return (
    <Card size="sm" className="border-border/60">
      {/*
        Vùng cuộn nằm trong Card (không phải chính Card) để `scroll-fade` chỉ
        làm mờ nội dung, không làm mờ nền/viền của Card.
      */}
      <div
        className={cn(
          "flex flex-col gap-(--card-spacing)",
          "min-h-0 overflow-y-auto",
          className
        )}
      >
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Bộ lọc</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              onApplied?.();
            }}
            className="h-7 text-xs"
          >
            Xoá tất cả
          </Button>
        </CardHeader>

        <CardContent>
          <FieldSet>
            <FieldGroup>
              {/* ---------------- Nhóm việc ---------------- */}
              <Field>
                <FieldLegend variant="label">Nhóm việc</FieldLegend>
                <div className="flex flex-col gap-2">
                  {categories.map((category) => {
                    const id = `category-${category.id}`;
                    const checked = filters.categoryIds.includes(category.id);
                    return (
                      <div
                        key={category.id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() =>
                            toggleInList("categoryIds", category.id)
                          }
                        />
                        <Label
                          htmlFor={id}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {category.name}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {category.jobCount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Field>

              {/* ---------------- Vị trí công việc ---------------- */}
              {visiblePositions.length > 0 && (
                <>
                  <Separator />
                  <Field>
                    <FieldLegend variant="label">Vị trí</FieldLegend>
                    <div className="flex flex-col gap-2">
                      {visiblePositions.map((position) => {
                        const id = `position-${position.id}`;
                        const checked = filters.positionIds.includes(
                          position.id
                        );
                        return (
                          <div
                            key={position.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={() =>
                                toggleInList("positionIds", position.id)
                              }
                            />
                            <Label
                              htmlFor={id}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              {position.name}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {position.jobCount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Field>
                </>
              )}

              <Separator />

              {/* ---------------- Tỉnh / Thành ---------------- */}
              <Field>
                <FieldLabel htmlFor="province">Tỉnh / Thành</FieldLabel>
                <Select
                  value={filters.provinceIds[0] ?? "all"}
                  onValueChange={(value) => {
                    update({
                      provinceIds: value && value !== "all" ? [value] : [],
                      districtIds: [],
                      page: 1,
                    });
                  }}
                  items={provinceItems}
                >
                  <SelectTrigger id="province" className="w-full">
                    <SelectValue placeholder="Tất cả địa điểm" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinceItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* ---------------- Quận / Huyện ---------------- */}
              {filters.provinceIds[0] && districts.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="district">Quận / Huyện</FieldLabel>
                  <Select
                    value={filters.districtIds[0] ?? "all"}
                    onValueChange={(value) => {
                      update({
                        districtIds: value && value !== "all" ? [value] : [],
                        page: 1,
                      });
                    }}
                    items={[
                      { value: "all", label: "Tất cả quận/huyện" },
                      ...districts.map((district) => ({
                        value: district.id,
                        label: district.name,
                      })),
                    ]}
                  >
                    <SelectTrigger id="district" className="w-full">
                      <SelectValue placeholder="Tất cả quận/huyện" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả quận/huyện</SelectItem>
                      {districts.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Separator />

              {/* ---------------- Mức lương ---------------- */}
              <Field>
                <FieldLegend variant="label">Mức lương</FieldLegend>

                {/* Chọn đơn vị lương (Chốt Ca: giờ / ngày / tuần / tháng) */}
                <Select
                  value={filters.salaryUnit}
                  onValueChange={(value) => {
                    const unit = (value || "HOURLY") as SalaryUnit;
                    // Giữ nguyên khoảng lương đang chọn khi đổi đơn vị
                    update({
                      salaryUnit: unit,
                      salaryMin: 0,
                      salaryMax: SALARY_MAX_BY_UNIT[unit],
                      page: 1,
                    });
                  }}
                  items={SALARY_UNIT_ITEMS}
                >
                  <SelectTrigger id="salary-unit" className="w-full">
                    <SelectValue placeholder="Đơn vị lương" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_UNIT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Slider
                  value={[filters.salaryMin, filters.salaryMax]}
                  min={0}
                  max={SALARY_MAX_BY_UNIT[filters.salaryUnit]}
                  step={SALARY_STEP}
                  onValueChange={(value) => {
                    if (!Array.isArray(value)) return;
                    const [min = 0, max = SALARY_MAX_BY_UNIT[filters.salaryUnit]] =
                      value as number[];
                    update({ salaryMin: min, salaryMax: max, page: 1 });
                  }}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {compact(filters.salaryMin)}
                    {SALARY_UNIT_LABELS[filters.salaryUnit]}
                  </span>
                  <span>
                    {compact(filters.salaryMax)}
                    {SALARY_UNIT_LABELS[filters.salaryUnit]}
                  </span>
                </div>
              </Field>

              <Separator />

              {/* ---------------- Loại hình ---------------- */}
              <Field>
                <FieldLegend variant="label">Loại hình</FieldLegend>
                <div className="flex flex-col gap-2">
                  {(Object.keys(
                    EMPLOYMENT_TYPE_LABELS
                  ) as EmploymentType[]).map((type) => {
                    const id = `employment-${type}`;
                    const checked = filters.employmentTypes.includes(type);
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() =>
                            toggleInList("employmentTypes", type)
                          }
                        />
                        <Label
                          htmlFor={id}
                          className="cursor-pointer font-normal"
                        >
                          {EMPLOYMENT_TYPE_LABELS[type]}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </Field>

              <Separator />

              {/* ---------------- Hình thức làm việc ---------------- */}
              <Field>
                <FieldLegend variant="label">Hình thức</FieldLegend>
                <div className="flex flex-col gap-2">
                  {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => {
                    const id = `workmode-${mode}`;
                    const checked = filters.workModes.includes(mode);
                    return (
                      <div key={mode} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() => toggleInList("workModes", mode)}
                        />
                        <Label
                          htmlFor={id}
                          className="cursor-pointer font-normal"
                        >
                          {WORK_MODE_LABELS[mode]}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </div>
    </Card>
  );
}

export default JobFilters;
