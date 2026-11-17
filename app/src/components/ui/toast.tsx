"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  CircleCheck,
  Info,
  Loader2,
  OctagonX,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "cn";
import { createToastManager, toastManager } from "@/lib/toast-manager";
import type { ToastType } from "@/lib/toast-manager";

/**
 * 🔔 Hệ thống Toast của VieJob — dựa trên Base UI Toast (shadcn/ui base-luma).
 *
 * - `toast` là một **global manager** (không phải hook) nên có thể gọi từ
 *   bất kỳ đâu ngoài React: Axios interceptor, TanStack Query cache, service...
 * - `<Toaster />` phải được mount **đúng 1 lần** ở gốc ứng dụng.
 * - Base UI tự xử lý: dedupe/upsert theo `id`, giới hạn số toast hiển thị,
 *   timer tự đóng, swipe-dismiss, và accessibility (F6, aria-live).
 */

export type { ToastType };

/** Manager dùng chung cho toàn app. */
export const toast = toastManager;

/** Tạo manager riêng (dành cho test hoặc multi-tenant). */
export { createToastManager };

/** Hook đọc danh sách toast đang hiển thị (dùng trong component). */
export const useToastManager = ToastPrimitive.useToastManager;

// ============================================
// PROVIDER
// ============================================

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

// ============================================
// PORTAL
// ============================================

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

// ============================================
// VIEWPORT
// ============================================

function ToastViewport({
  className,
  ...props
}: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  );
}

// ============================================
// ROOT
// ============================================

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-2xl border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "[min-height:var(--height)] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:[min-height:var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className
      )}
      {...props}
    />
  );
}

// ============================================
// CONTENT
// ============================================

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  );
}

// ============================================
// TITLE / DESCRIPTION
// ============================================

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("line-clamp-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

// ============================================
// ACTION / CLOSE
// ============================================

function ToastAction({ className, ...props }: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      className={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        className
      )}
      {...props}
    >
      {children ?? <X className="size-4" />}
    </ToastPrimitive.Close>
  );
}

// ============================================
// ICON THEO TYPE
// ============================================

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = <CircleCheck aria-hidden="true" />;
  }

  if (type === "info") {
    icon = <Info aria-hidden="true" />;
  }

  if (type === "warning") {
    icon = <TriangleAlert aria-hidden="true" />;
  }

  if (type === "error") {
    icon = <OctagonX className="text-destructive" aria-hidden="true" />;
  }

  if (type === "loading") {
    icon = <Loader2 className="animate-spin" aria-hidden="true" />;
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {icon}
    </span>
  );
}

// ============================================
// LIST
// ============================================

function ToastList() {
  const { toasts } = useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {toastItem.title && <ToastTitle>{toastItem.title}</ToastTitle>}
          {toastItem.description && (
            <ToastDescription>{toastItem.description}</ToastDescription>
          )}
        </div>
        {toastItem.actionProps && <ToastAction {...toastItem.actionProps} />}
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

// ============================================
// TOASTER (mount đúng 1 lần)
// ============================================

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider
      data-slot="toast-provider"
      toastManager={toastManager}
      limit={props.limit ?? 3}
      timeout={props.timeout ?? 5000}
      {...props}
    >
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastList,
  ToastIcon,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
};
