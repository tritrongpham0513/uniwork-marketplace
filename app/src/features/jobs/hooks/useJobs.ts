import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { jobsService } from "../services/jobs.service";
import type { Job, JobFilters, JobListResponse } from "@/features/jobs/types";
import { JOB_KEYS } from "@/features/shared/query-keys";

export { JOB_KEYS };

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

/**
 * Xã / phường / đặc khu (lọc theo tỉnh) — cấp hành chính chính thức từ 01/07/2025.
 *
 * Chỉ tải khi đã chọn tỉnh: toàn bộ 3.321 đơn vị (~600 KB) là payload rất nặng
 * và không cần thiết khi người dùng chưa chọn tỉnh.
 */
export const useWards = (provinceId?: string) =>
  useQuery({
    queryKey: JOB_KEYS.wards(provinceId),
    queryFn: () => jobsService.wards(provinceId),
    enabled: Boolean(provinceId),
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

/**
 * Nhiều tin tuyển dụng theo danh sách id.
 *
 * <p>Dùng cho trang "Việc đã lưu" — nếu tải danh sách chung rồi lọc client
 * thì tin đã lưu cũ (ngoài trang đầu) sẽ biến mất.
 *
 * <p>Tin không còn tồn tại (đã đóng) bị bỏ qua thay vì làm hỏng cả trang.
 */
export const useJobsByIds = (ids: string[]) =>
  useQuery({
    queryKey: JOB_KEYS.detailsByIds(ids),
    queryFn: async () => {
      const results = await Promise.allSettled(
        ids.map((id) => jobsService.detail(id))
      );
      return results
        .filter(
          (result): result is PromiseFulfilledResult<Job> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
