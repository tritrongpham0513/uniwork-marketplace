import { Toast as ToastPrimitive } from "@base-ui/react/toast";

/**
 * 🔔 Toast manager dùng chung cho toàn ứng dụng.
 *
 * Tách riêng khỏi file JSX (`components/ui/toast.tsx`) để:
 * - Tầng logic (`lib/toast.ts`) không phụ thuộc React -> test được bằng Node.
 * - Đảm bảo chỉ có DUY NHẤT một manager -> chỉ một `<Toaster />` hiển thị.
 *
 * Manager nằm ngoài React tree nên có thể gọi từ Axios interceptor,
 * TanStack Query cache, service hay bất kỳ module nào.
 */
export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export const toastManager = ToastPrimitive.createToastManager();

/** Tạo manager riêng (dành cho test hoặc nhiều vùng độc lập). */
export const createToastManager = ToastPrimitive.createToastManager;
