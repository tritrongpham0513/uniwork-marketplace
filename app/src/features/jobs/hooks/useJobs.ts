import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { jobsService } from "../services/jobs.service";
import type {
  Job,
  JobFilters,
  JobListResponse,
} from "@/features/jobs/types";

export const JOB_KEYS = {
  all: ["jobs"] as const,
  lists: () => [...JOB_KEYS.all, "list"] as const,
  list: (filters: JobFilters) => [...JOB_KEYS.lists(), filters] as const,
  details: () => [...JOB_KEYS.all, "detail"] as const,
  detail: (id: string) => [...JOB_KEYS.details(), id] as const,
  related: (categoryId: string, excludeId: string) =>
    [...JOB_KEYS.details(), "related", categoryId, excludeId] as const,
  meta: () => [...JOB_KEYS.all, "meta"] as const,
  categories: () => [...JOB_KEYS.all, "categories"] as const,
  positions: () => [...JOB_KEYS.all, "positions"] as const,
  provinces: () => [...JOB_KEYS.all, "provinces"] as const,
  districts: (provinceId?: string) =>
    [...JOB_KEYS.all, "districts", provinceId ?? "all"] as const,
  skills: () => [...JOB_KEYS.all, "skills"] as const,
  benchmarks: () => [...JOB_KEYS.all, "salary-benchmarks"] as const,
};

/** Danh sách tin tuyển dụng theo bộ lọc */
export const useJobs = (
  filters: JobFilters,
  options?: Partial<UseQueryOptions<JobListResponse, Error>>
) =>
  useQuery({
    queryKey: JOB_KEYS.list(filters),
    queryFn: () => jobsService.list(filters),
    placeholderData: (previous) => previous,
    ...options,
  });

/** Chi tiết 1 tin tuyển dụng */
export const useJob = (
  id: string,
  options?: Partial<UseQueryOptions<Job, Error>>
) =>
  useQuery({
    queryKey: JOB_KEYS.detail(id),
    queryFn: () => jobsService.detail(id),
    enabled: !!id,
    ...options,
  });

/** Tin liên quan (cùng nhóm việc) */
export const useRelatedJobs = (categoryId: string, excludeId: string) =>
  useQuery({
    queryKey: JOB_KEYS.related(categoryId, excludeId),
    queryFn: () => jobsService.related(categoryId, excludeId),
    enabled: !!categoryId && !!excludeId,
    staleTime: 5 * 60_000,
  });

/** Nhóm việc */
export const useJobCategories = () =>
  useQuery({
    queryKey: JOB_KEYS.categories(),
    queryFn: () => jobsService.categories(),
    staleTime: 10 * 60_000,
  });

/** Vị trí công việc */
export const useJobPositions = () =>
  useQuery({
    queryKey: JOB_KEYS.positions(),
    queryFn: () => jobsService.positions(),
    staleTime: 10 * 60_000,
  });

/** Tỉnh / thành phố */
export const useProvinces = () =>
  useQuery({
    queryKey: JOB_KEYS.provinces(),
    queryFn: () => jobsService.provinces(),
    staleTime: 30 * 60_000,
  });

/** Quận / huyện (lọc theo tỉnh) */
export const useDistricts = (provinceId?: string) =>
  useQuery({
    queryKey: JOB_KEYS.districts(provinceId),
    queryFn: () => jobsService.districts(provinceId),
    staleTime: 30 * 60_000,
  });

/** Danh sách kỹ năng */
export const useSkills = () =>
  useQuery({
    queryKey: JOB_KEYS.skills(),
    queryFn: () => jobsService.skills(),
    staleTime: 30 * 60_000,
  });

/** Xếp hạng lương theo ngành × tỉnh */
export const useSalaryBenchmarks = () =>
  useQuery({
    queryKey: JOB_KEYS.benchmarks(),
    queryFn: () => jobsService.salaryBenchmarks(),
    staleTime: 60 * 60_000,
  });
