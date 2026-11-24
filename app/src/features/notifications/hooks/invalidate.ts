/**
 * 🧩 Ánh xạ loại thông báo -> các query key cần đồng bộ.
 *
 * Khi một thông báo tới (realtime hoặc người dùng bấm "Xem"), dữ liệu ở
 * trang đích có thể đã cũ trong cache TanStack Query. Ta invalidate theo
 * **loại thông báo** để chỉ refetch đúng phần liên quan.
 *
 * Ví dụ: thông báo `REVIEW` tới -> trang `/student/reviews` phải hiện đánh giá
 * mới, và `avgRating` / `ratingCount` trên hồ sơ phải cập nhật.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  ADMIN_KEYS,
  APPLICATION_KEYS,
  EMPLOYER_JOB_KEYS,
  PROFILE_KEYS,
  REVIEW_KEYS,
  WORK_HISTORY_KEYS,
} from "@/features/shared/query-keys";

/** Loại thông báo -> danh sách query key cần invalidate. */
const RELATED_KEYS_BY_TYPE: Record<
  string,
  ReadonlyArray<readonly unknown[]>
> = {
  /** Sinh viên ứng tuyển -> danh sách đơn của NTD đổi. */
  APPLICATION: [APPLICATION_KEYS.all],
  /**
   * NTD đổi trạng thái đơn -> trạng thái đơn của SV đổi. Khi đơn chuyển
   * sang `COMPLETED` thì hệ thống ghi thêm 1 mục kinh nghiệm làm việc.
   */
  APPLICATION_STATUS: [APPLICATION_KEYS.all, WORK_HISTORY_KEYS.all],
  /** Tin tuyển dụng được duyệt/từ chối -> danh sách tin đổi. */
  JOB: [EMPLOYER_JOB_KEYS.all, ADMIN_KEYS.jobs()],
  /**
   * Đánh giá 2 chiều -> danh sách đánh giá MỚI + điểm trung bình trên hồ sơ
   * (vì `avgRating` / `ratingCount` được tính lại ở tầng service).
   */
  REVIEW: [REVIEW_KEYS.all, PROFILE_KEYS.all],
};

/**
 * Invalidate các query liên quan tới một loại thông báo.
 *
 * @param queryClient client của TanStack Query
 * @param type loại thông báo (`REVIEW`, `APPLICATION`, ...) — bỏ trống thì
 *        invalidate toàn bộ nhóm để không bỏ sót.
 */
export const invalidateByNotificationType = (
  queryClient: QueryClient,
  type?: string | null
): void => {
  const keys = type ? RELATED_KEYS_BY_TYPE[type.toUpperCase()] : undefined;

  if (keys) {
    for (const queryKey of keys) {
      void queryClient.invalidateQueries({ queryKey });
    }
    return;
  }

  // Không rõ loại -> invalidate tất cả nhóm đã biết.
  const allKeys = new Set<string>();
  for (const keysOfType of Object.values(RELATED_KEYS_BY_TYPE)) {
    for (const queryKey of keysOfType) {
      allKeys.add(JSON.stringify(queryKey));
    }
  }

  for (const key of allKeys) {
    void queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
  }
};

export default invalidateByNotificationType;
