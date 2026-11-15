import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobListHeader } from "@/features/jobs/components/job-list-header";
import { JobsPagination } from "@/features/jobs/components/jobs-pagination";
import { JobCardSkeleton } from "@/features/jobs/components/job-card-skeleton";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { useJobFilters } from "@/features/jobs/hooks/useJobFilters";
import {
  useJobCategories,
  useJobPositions,
  useJobs,
  useProvinces,
  useSalaryBenchmarks,
} from "@/features/jobs/hooks/useJobs";
import { compareSalary, findBenchmarkFor } from "@/features/jobs/lib/salary";
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/features/jobs/types";
import { PATHS } from "@/config/paths";

export function JobsPage() {
  const { filters, update, toggleInList, reset, activeCount } = useJobFilters();
  const { data, isLoading, isError, refetch } = useJobs(filters);
  const { data: benchmarks = [] } = useSalaryBenchmarks();
  const { data: categories = [] } = useJobCategories();
  const { data: positions = [] } = useJobPositions();
  const { data: provinces = [] } = useProvinces();
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Theo dõi giá trị filter.keyword để đồng bộ ô tìm kiếm khi URL đổi
  // (back/forward, chip bị xoá) — dùng pattern "adjust state khi props đổi".
  const [syncedKeyword, setSyncedKeyword] = useState(filters.keyword);

  if (filters.keyword !== syncedKeyword) {
    setSyncedKeyword(filters.keyword);
    setKeywordInput(filters.keyword);
  }

  // Debounce từ khoá — chỉ cập nhật URL sau 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keywordInput !== filters.keyword) {
        update({ keyword: keywordInput, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput, filters.keyword, update]);

  const jobs = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;

  /** Chip đang áp dụng — hiển thị tên hiển thị, không phải id/slug */
  const chips = [
    ...filters.categoryIds.map((id) => ({
      key: `cat-${id}`,
      label: categories.find((category) => category.id === id)?.name ?? id,
      onRemove: () => toggleInList("categoryIds", id),
    })),
    ...filters.positionIds.map((id) => ({
      key: `pos-${id}`,
      label: positions.find((position) => position.id === id)?.name ?? id,
      onRemove: () => toggleInList("positionIds", id),
    })),
    ...filters.provinceIds.map((id) => ({
      key: `prov-${id}`,
      label: provinces.find((province) => province.id === id)?.name ?? id,
      onRemove: () => toggleInList("provinceIds", id),
    })),
    ...filters.employmentTypes.map((type) => ({
      key: `emp-${type}`,
      label: EMPLOYMENT_TYPE_LABELS[type],
      onRemove: () => toggleInList("employmentTypes", type),
    })),
    ...filters.workModes.map((mode) => ({
      key: `wm-${mode}`,
      label: WORK_MODE_LABELS[mode],
      onRemove: () => toggleInList("workModes", mode),
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* TIÊU ĐỀ */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Việc làm cho sinh viên
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isLoading
            ? "Đang tải việc làm..."
            : `Tìm thấy ${totalItems.toLocaleString("vi-VN")} cơ hội việc làm phù hợp`}
        </p>
      </div>

      {/* Ô TÌM KIẾM */}
      <div className="mb-5">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Tìm theo vị trí, quán ăn, khu vực..."
            aria-label="Tìm kiếm việc làm"
          />
          {keywordInput && (
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => setKeywordInput("")}
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Xoá từ khoá"
              >
                <X className="size-4" />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* BỘ LỌC — desktop */}
        <aside className="hidden w-72 shrink-0 lg:block">
          {/*
            Card cao bằng màn hình (trừ header 80px + lề dưới 24px + padding 32px
            của Card), phần nội dung tự cuộn và mờ dần ở hai cạnh bằng `scroll-fade`.
          */}
          <div className="sticky top-20">
            <JobFilters className="no-scrollbar max-h-[calc(100dvh-18rem)] scroll-fade" />
          </div>
        </aside>

        {/* DANH SÁCH */}
        <div className="min-w-0 flex-1">
          {/* Thanh công cụ */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <JobListHeader total={totalItems} isLoading={isLoading} />

            {/* Nút mở bộ lọc trên mobile */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                    Bộ lọc
                    {activeCount > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {activeCount}
                      </Badge>
                    )}
                  </Button>
                }
              />
              <SheetContent side="left" className="w-[90vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="size-4" />
                    Bộ lọc việc làm
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-4 pb-6">
                    <JobFilters onApplied={() => setIsFilterOpen(false)} />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          {/* CHIPS bộ lọc đang áp dụng */}
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs font-normal"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-background/60"
                    aria-label={`Xoá bộ lọc ${chip.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-6 cursor-pointer px-2 text-xs"
              >
                Xoá tất cả
              </Button>
            </div>
          )}

          {/* DANH SÁCH VIỆC */}
          {isError ? (
            <ErrorState
              title="Không tải được danh sách việc làm"
              description="Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại."
              onRetry={() => void refetch()}
            />
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <JobCardSkeleton key={index} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon="search"
              title="Không tìm thấy việc làm phù hợp"
              description="Thử điều chỉnh bộ lọc hoặc xoá từ khoá để xem thêm cơ hội."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="cursor-pointer"
                >
                  Xoá bộ lọc
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-4">
                {jobs.map((job) => {
                  const benchmark = findBenchmarkFor(
                    benchmarks,
                    job.category.id,
                    job.location.provinceId
                  );
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      comparison={compareSalary(job, benchmark)}
                    />
                  );
                })}
              </div>

              <JobsPagination
                currentPage={data?.currentPage ?? 1}
                totalPages={data?.totalPages ?? 1}
                onPageChange={(page) => {
                  update({ page });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}

          {/* Gợi ý khi chưa đăng nhập */}
          {jobs.length > 0 && (
            <div className="mt-8 rounded-xl border border-border/60 bg-card p-6 text-center">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Nhận thông báo khi có việc làm mới
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                Tạo hồ sơ tìm việc miễn phí để được gợi ý các cơ hội phù hợp với
                ngành học và lịch làm của bạn.
              </p>
              <Button
                size="sm"
                className="mt-4"
                nativeButton={false}
                render={<Link to={PATHS.AUTH.REGISTER} />}
              >
                Tạo hồ sơ miễn phí
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobsPage;
