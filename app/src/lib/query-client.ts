import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { normalizeApiError } from "@/lib/api-error";
import { showApiError } from "@/lib/toast";

/**
 * 🧠 QueryClient với global error handler.
 *
 * Đây là tầng DUY NHẤT chịu trách nhiệm bắn toast cho lỗi mutation/query
 * (thay vì mỗi hook tự `toast.error` trong `onError` -> dễ dính lỗi double toast).
 *
 * Quy tắc:
 * - Mutation lỗi validation (`fieldErrors` có phần tử) -> KHÔNG bắn toast,
 *   component sẽ hiển thị inline tại từng field.
 * - Mutation có `meta.skipToast = true` -> component tự chịu trách nhiệm hiển thị.
 * - Query lỗi 4xx -> để component tự hiển thị inline (không spam toast khi refetch).
 * - Query lỗi 5xx / network -> bắn toast (lỗi vận hành, người dùng cần biết).
 */

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Bỏ qua toast global — dùng khi mutation tự bắn toast hoặc tự hiển thị inline. */
      skipToast?: boolean;
      /** Message thành công (tuỳ chọn, dành cho các mutation muốn dùng chung). */
      successMessage?: string;
    };
    queryMeta: {
      /** Bỏ qua toast global cho query này. */
      skipToast?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipToast) return;

      const apiError = normalizeApiError(error);

      // Lỗi validation sẽ được hiển thị inline tại field -> không bắn toast
      if (apiError.kind === "validation" && apiError.fieldErrors.length > 0) {
        return;
      }

      showApiError(apiError);
    },
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipToast) return;

      const apiError = normalizeApiError(error);

      // Lỗi 4xx của query: component tự hiển thị inline, không spam toast
      const isClientError =
        apiError.status !== null &&
        apiError.status >= 400 &&
        apiError.status < 500;
      if (isClientError) return;

      showApiError(apiError);
    },
  }),
});
