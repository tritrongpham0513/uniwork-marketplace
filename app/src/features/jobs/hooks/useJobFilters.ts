import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type {
  EmploymentType,
  JobFilters,
  JobSort,
  SalaryUnit,
  WorkMode,
} from "@/features/jobs/types";

export const DEFAULT_FILTERS: JobFilters = {
  keyword: "",
  categoryIds: [],
  positionIds: [],
  provinceIds: [],
  districtIds: [],
  wardIds: [],
  employmentTypes: [],
  workModes: [],
  salaryUnit: "HOURLY",
  salaryMin: 0,
  salaryMax: 200000,
  sort: "newest",
  page: 1,
  pageSize: 10,
};

const readList = (value: string | null): string[] =>
  value ? value.split(",").filter(Boolean) : [];

const readNumber = (value: string | null, fallback: number) => {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SORT_VALUES: JobSort[] = [
  "newest",
  "salary_desc",
  "salary_asc",
  "popular",
];
const EMPLOYMENT_VALUES: EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "FLEXIBLE",
  "CASUAL",
];
const WORK_MODE_VALUES: WorkMode[] = ["ONSITE", "REMOTE", "HYBRID"];
const SALARY_UNIT_VALUES: SalaryUnit[] = [
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
];

/**
 * Filter đọc/ghi trên URL query để:
 * - người dùng F5 / share link vẫn giữ được bộ lọc
 * - map 1–1 sang query string của API
 */
export function useJobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<JobFilters>(() => {
    const salaryMin = readNumber(
      searchParams.get("salaryMin"),
      DEFAULT_FILTERS.salaryMin
    );
    const salaryMax = readNumber(
      searchParams.get("salaryMax"),
      DEFAULT_FILTERS.salaryMax
    );
    const sortParam = searchParams.get("sort") as JobSort | null;
    const salaryUnitParam = searchParams.get("salaryUnit") as SalaryUnit | null;
    const salaryUnit =
      salaryUnitParam && SALARY_UNIT_VALUES.includes(salaryUnitParam)
        ? salaryUnitParam
        : DEFAULT_FILTERS.salaryUnit;

    return {
      keyword: searchParams.get("keyword") ?? DEFAULT_FILTERS.keyword,
      categoryIds: readList(searchParams.get("categoryIds")),
      positionIds: readList(searchParams.get("positionIds")),
      provinceIds: readList(searchParams.get("provinceIds")),
      districtIds: readList(searchParams.get("districtIds")),
      wardIds: readList(searchParams.get("wardIds")),
      employmentTypes: readList(searchParams.get("employmentTypes")).filter(
        (v): v is EmploymentType =>
          EMPLOYMENT_VALUES.includes(v as EmploymentType)
      ),
      workModes: readList(searchParams.get("workModes")).filter(
        (v): v is WorkMode => WORK_MODE_VALUES.includes(v as WorkMode)
      ),
      salaryUnit,
      salaryMin,
      salaryMax,
      sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : "newest",
      page: readNumber(searchParams.get("page"), 1),
      pageSize: readNumber(
        searchParams.get("pageSize"),
        DEFAULT_FILTERS.pageSize
      ),
    };
  }, [searchParams]);

  const update = useCallback(
    (patch: Partial<JobFilters>) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams();

      if (next.keyword) params.set("keyword", next.keyword);
      if (next.categoryIds.length)
        params.set("categoryIds", next.categoryIds.join(","));
      if (next.positionIds.length)
        params.set("positionIds", next.positionIds.join(","));
      if (next.provinceIds.length)
        params.set("provinceIds", next.provinceIds.join(","));
      if (next.districtIds.length)
        params.set("districtIds", next.districtIds.join(","));
      if (next.wardIds.length) params.set("wardIds", next.wardIds.join(","));
      if (next.employmentTypes.length)
        params.set("employmentTypes", next.employmentTypes.join(","));
      if (next.workModes.length)
        params.set("workModes", next.workModes.join(","));
      if (next.salaryUnit !== DEFAULT_FILTERS.salaryUnit)
        params.set("salaryUnit", next.salaryUnit);
      if (next.salaryMin !== DEFAULT_FILTERS.salaryMin)
        params.set("salaryMin", String(next.salaryMin));
      if (next.salaryMax !== DEFAULT_FILTERS.salaryMax)
        params.set("salaryMax", String(next.salaryMax));
      if (next.sort !== DEFAULT_FILTERS.sort) params.set("sort", next.sort);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.pageSize !== DEFAULT_FILTERS.pageSize)
        params.set("pageSize", String(next.pageSize));

      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  const toggleInList = useCallback(
    (
      key:
        | "categoryIds"
        | "positionIds"
        | "provinceIds"
        | "districtIds"
        | "wardIds"
        | "employmentTypes"
        | "workModes",
      value: string
    ) => {
      const current = filters[key] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      update({ [key]: next, page: 1 } as Partial<JobFilters>);
    },
    [filters, update]
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  /** Số bộ lọc đang áp dụng (dùng cho badge trên mobile) */
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.keyword) count += 1;
    count += filters.categoryIds.length;
    count += filters.positionIds.length;
    count += filters.provinceIds.length;
    count += filters.districtIds.length;
    count += filters.wardIds.length;
    count += filters.employmentTypes.length;
    count += filters.workModes.length;
    if (filters.salaryUnit !== DEFAULT_FILTERS.salaryUnit) count += 1;
    if (filters.salaryMin !== DEFAULT_FILTERS.salaryMin) count += 1;
    if (filters.salaryMax !== DEFAULT_FILTERS.salaryMax) count += 1;
    return count;
  }, [filters]);

  return { filters, update, toggleInList, reset, activeCount };
}
