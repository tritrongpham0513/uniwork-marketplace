import type * as React from "react";
import { toastManager, type ToastType } from "@/lib/toast-manager";
import {
  normalizeApiError,
  type ApiError,
  type ApiErrorKind,
} from "@/lib/api-error";

/**
 * 🔔 Facade của hệ thống Toast.
 *
 * Đây là **plain module function** (không phải hook) nên có thể gọi từ bất kỳ
 * đâu ngoài React: Axios interceptor, TanStack Query cache, service, util...
 *
 * Ba lớp chống "toast storm":
 *   1. Dedupe theo `id`    -> cùng một `id` sẽ UPDATE toast đang có (Base UI upsert).
 *   2. Merge theo nội dung -> cùng `type + title + description` trong 2s gộp lại,
 *                             hiển thị bộ đếm "×N" thay vì đẩy toast mới.
 *   3. Rate limit           -> tối đa 5 toast mới / giây, phần dư gộp thành 1
 *                             toast tổng hợp.
 */

// ============================================
// CONSTANTS
// ============================================

/** Cửa sổ (ms) để gộp 2 toast có cùng nội dung. */
const MERGE_WINDOW_MS = 2000;

/** Số toast mới tối đa trong 1 giây. */
const MAX_TOASTS_PER_SECOND = 5;

/** Thời lượng mặc định (ms) cho từng loại toast. */
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
  loading: 0, // 0 = không tự đóng, chờ được update
};

// ============================================
// TYPES
// ============================================

export interface ToastOptions {
  /** Mô tả bổ sung (nội dung phụ). */
  description?: string;
  /** Thời lượng hiển thị (ms). 0 = không tự đóng. */
  duration?: number;
  /** Định danh cố định — gọi lại với cùng id sẽ UPDATE thay vì thêm mới. */
  id?: string;
  /** Ưu tiên đọc bằng screen reader: "high" = thông báo gấp. */
  priority?: "low" | "high";
  /**
   * Nút hành động trên toast.
   *
   * Dùng cho thông báo realtime: nút "Xem" điều hướng tới trang liên quan
   * và đánh dấu thông báo đã đọc.
   */
  actionProps?: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  };
}

export interface ShowApiErrorOptions {
  /** Không hiển thị toast (dùng khi muốn tự xử lý). */
  silent?: boolean;
  /** Bỏ qua việc gộp/dedupe theo id cố định. */
  useCustomId?: boolean;
  /** Định danh toast tuỳ chỉnh. */
  id?: string;
}

// ============================================
// INTERNAL STATE
// ============================================

interface RecentToast {
  id: string;
  key: string;
  count: number;
  title: string;
  description?: string;
  lastAt: number;
}

/** Toast đã phát gần đây, dùng cho lớp merge theo nội dung. */
const recentToasts = new Map<string, RecentToast>();

/** Mốc thời gian các toast mới đã phát (dùng cho rate limit). */
const emissionTimestamps: number[] = [];

let overflowToastId: string | null = null;
let overflowCount = 0;
let lastOverflowAt = 0;
let counter = 0;

const now = (): number => Date.now();

const buildKey = (
  type: ToastType,
  title: string,
  description?: string
): string => `${type}::${title}::${description ?? ""}`;

/** Dọn các bản ghi cũ để tránh rò rỉ bộ nhớ. */
const pruneRecentToasts = (): void => {
  const threshold = now() - MERGE_WINDOW_MS * 10;
  for (const [key, item] of recentToasts) {
    if (item.lastAt < threshold) recentToasts.delete(key);
  }
};

// ============================================
// RATE LIMIT
// ============================================

/**
 * Kiểm tra rate limit. Trả về `true` nếu toast MỚI được phép hiển thị.
 *
 * CHỈ toast mới mới bị tính vào ngân sách. Toast update (cùng `id` hoặc
 * cùng nội dung) không bị tính, vì chúng không làm người dùng khó chịu thêm.
 */
const passRateLimit = (): boolean => {
  const current = now();
  while (
    emissionTimestamps.length > 0 &&
    current - emissionTimestamps[0] > 1000
  ) {
    emissionTimestamps.shift();
  }

  if (emissionTimestamps.length < MAX_TOASTS_PER_SECOND) {
    emissionTimestamps.push(current);
    return true;
  }

  // Vượt ngưỡng -> dồn lại, gộp thành 1 toast tổng hợp.
  // Chỉ flush 1 lần mỗi giây để không spam toast tổng hợp.
  overflowCount += 1;
  if (current - lastOverflowAt >= 1000) {
    flushOverflow();
  }
  return false;
};

/** Hiển thị/gộp toast tổng hợp cho các toast bị rate limit. */
const flushOverflow = (): void => {
  if (overflowCount <= 0) return;

  const count = overflowCount;
  overflowCount = 0;

  // Id cố định -> toast tổng hợp luôn UPDATE chứ không nhân bản
  if (!overflowToastId) {
    overflowToastId = `toast:overflow:${now()}`;
  }
  lastOverflowAt = now();

  toastManager.add({
    id: overflowToastId,
    type: "warning",
    title: `${count} thông báo khác đang chờ`,
    description: "Vui lòng kiểm tra lại các thao tác vừa thực hiện.",
    timeout: DEFAULT_DURATION.warning,
    priority: "high",
  });
};

// ============================================
// CORE ADD
// ============================================

const emit = (
  type: ToastType,
  title: string,
  options: ToastOptions = {}
): string => {
  const {
    description,
    duration = DEFAULT_DURATION[type],
    id,
    priority = type === "error" ? "high" : "low",
    actionProps,
  } = options;

  pruneRecentToasts();

  // Lớp 1: id cố định do caller cung cấp -> upsert, không tạo toast mới
  // (không bị tính vào rate limit vì đây là update, không phải toast mới)
  if (id) {
    return toastManager.add({
      id,
      type,
      title,
      description,
      timeout: duration,
      priority,
      actionProps,
    });
  }

  // Lớp 2: merge theo nội dung trong cửa sổ MERGE_WINDOW_MS
  const key = buildKey(type, title, description);
  const existing = recentToasts.get(key);
  const current = now();

  if (existing && current - existing.lastAt < MERGE_WINDOW_MS) {
    existing.count += 1;
    existing.lastAt = current;

    return toastManager.add({
      id: existing.id,
      type,
      title: existing.title,
      description: existing.description
        ? `${existing.description} (×${existing.count})`
        : `(×${existing.count})`,
      timeout: duration,
      priority,
      actionProps,
    });
  }

  // Lớp 3: rate limit — chỉ áp dụng cho toast MỚI
  if (!passRateLimit()) {
    return "";
  }

  // Toast mới
  counter += 1;
  const newId = `toast:${now()}:${counter}`;

  recentToasts.set(key, {
    id: newId,
    key,
    count: 1,
    title,
    description,
    lastAt: current,
  });

  return toastManager.add({
    id: newId,
    type,
    title,
    description,
    timeout: duration,
    priority,
    actionProps,
  });
};

// ============================================
// PUBLIC API
// ============================================

export const toast = {
  /** ✅ Thông báo thành công. */
  success(title: string, options?: ToastOptions): string {
    return emit("success", title, options);
  },

  /** ❌ Thông báo lỗi. */
  error(title: string, options?: ToastOptions): string {
    return emit("error", title, options);
  },

  /** ⚠️ Thông báo cảnh báo. */
  warning(title: string, options?: ToastOptions): string {
    return emit("warning", title, options);
  },

  /** ℹ️ Thông báo thông tin. */
  info(title: string, options?: ToastOptions): string {
    return emit("info", title, options);
  },

  /** ⏳ Thông báo đang xử lý (không tự đóng). */
  loading(title: string, options?: ToastOptions): string {
    return emit("loading", title, { duration: 0, ...options });
  },

  /** 🔄 Toast dạng promise: loading -> success/error. */
  promise<T>(
    promiseValue: Promise<T>,
    messages: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: ToastOptions
  ): Promise<T> {
    counter += 1;
    const id = options?.id ?? `toast:promise:${now()}:${counter}`;

    toastManager.add({
      id,
      type: "loading",
      title: messages.loading,
      timeout: 0,
    });

    return promiseValue.then(
      (result) => {
        const title =
          typeof messages.success === "function"
            ? messages.success(result)
            : messages.success;
        toastManager.add({
          id,
          type: "success",
          title,
          timeout: DEFAULT_DURATION.success,
          priority: "low",
        });
        return result;
      },
      (error) => {
        const title =
          typeof messages.error === "function"
            ? messages.error(error)
            : messages.error;
        toastManager.add({
          id,
          type: "error",
          title,
          timeout: DEFAULT_DURATION.error,
          priority: "high",
        });
        // Không nuốt lỗi — caller vẫn có thể catch
        throw error;
      }
    );
  },

  /** ❌ Đóng một toast cụ thể, hoặc đóng tất cả nếu không truyền id. */
  dismiss(id?: string): void {
    toastManager.close(id);
  },
};

/**
 * 🔗 Hiển thị lỗi từ Backend dưới dạng toast.
 *
 * - Lỗi đã được xử lý ở tầng global (`handled === true`) -> bỏ qua.
 * - Lỗi validation CÓ field errors -> bỏ qua (component sẽ hiển thị inline tại field).
 * - Dedupe theo `code` của backend (fallback theo `status` khi code null).
 */
export const showApiError = (
  error: unknown,
  options: ShowApiErrorOptions = {}
): void => {
  if (options.silent) return;

  const apiError: ApiError = normalizeApiError(error);

  if (apiError.handled) return;
  if (apiError.silent) return;

  const hasFieldErrors = apiError.fieldErrors.length > 0;
  if (apiError.kind === "validation" && hasFieldErrors) return;

  const id =
    options.id ??
    (options.useCustomId
      ? undefined
      : `api-error:${apiError.code ?? `status:${apiError.status ?? "network"}`}`);

  emit("error", apiError.message, { id });
};

/**
 * 🔗 Hiển thị lỗi từ Backend với mức độ tuỳ chỉnh (vd: cảnh báo thay vì lỗi).
 */
export const showApiErrorAs = (
  error: unknown,
  type: Exclude<ToastType, "loading">,
  options: ShowApiErrorOptions = {}
): void => {
  if (options.silent) return;

  const apiError: ApiError = normalizeApiError(error);
  if (apiError.handled) return;
  if (apiError.silent) return;

  const id =
    options.id ??
    (options.useCustomId
      ? undefined
      : `api-error:${apiError.code ?? `status:${apiError.status ?? "network"}`}`);

  emit(type, apiError.message, { id });
};

/** Kiểm tra một lỗi có phải lỗi validation cần hiển thị inline hay không. */
export const hasFieldErrors = (error: unknown): boolean =>
  normalizeApiError(error).fieldErrors.length > 0;

/** Lấy `kind` của lỗi (tiện cho logic rẽ nhánh). */
export const getApiErrorKind = (error: unknown): ApiErrorKind =>
  normalizeApiError(error).kind;

/**
 * 🧪 Reset toàn bộ state nội bộ của toast (dùng cho test).
 * Không dùng trong code ứng dụng.
 */
export const __resetToastState = (): void => {
  recentToasts.clear();
  emissionTimestamps.length = 0;
  overflowToastId = null;
  overflowCount = 0;
  lastOverflowAt = 0;
  counter = 0;
};

export type { ApiError, ApiErrorKind, ToastType };
