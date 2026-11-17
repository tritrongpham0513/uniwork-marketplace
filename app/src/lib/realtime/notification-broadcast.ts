/**
 * 📡 Đồng bộ thông báo realtime giữa nhiều tab của cùng một người dùng.
 *
 * Vấn đề: mở 3 tab cùng một tài khoản -> mỗi tab đều nhận frame WebSocket
 * -> 3 toast trùng nhau bay lên. Người dùng thấy "spam".
 *
 * Cách xử lý: dùng `BroadcastChannel` để các tab thỏa thuận ai là *tab trưởng*.
 * Chỉ tab đang được focus mới hiển thị toast; các tab khác chỉ cập nhật badge
 * đếm chưa đọc. Đây là quyết định đã chốt: "dedupe theo tab được focus".
 *
 * Nếu trình duyệt không hỗ trợ `BroadcastChannel`, mỗi tab tự hiển thị toast —
 * vẫn hoạt động được, chỉ mất tính năng chống trùng.
 */

const CHANNEL_NAME = "viejob:realtime:notifications";

/** Sự kiện trao đổi giữa các tab. */
export type BroadcastEvent =
  | { kind: "notification"; payload: unknown }
  | { kind: "focus-changed"; focused: boolean };

type BroadcastListener = (event: BroadcastEvent) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<BroadcastListener>();

/** Cờ cho biết tab này có đang được focus hay không. */
let isFocused = typeof document !== "undefined" && document.hasFocus();

/** Khởi tạo kênh (idempotent). */
const ensureChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel === "undefined") return null;
  if (channel) return channel;

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<BroadcastEvent>) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    for (const listener of listeners) {
      listener(data);
    }
  };

  // Theo dõi focus để biết tab này có phải tab trưởng hay không.
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      isFocused = true;
      broadcast({ kind: "focus-changed", focused: true });
    });
    window.addEventListener("blur", () => {
      isFocused = false;
      broadcast({ kind: "focus-changed", focused: false });
    });
  }

  return channel;
};

/** Gửi sự kiện tới các tab khác (không gửi lại chính mình). */
export const broadcast = (event: BroadcastEvent): void => {
  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage(event);
  } catch {
    // Bỏ qua — payload không serializable được thì không gửi.
  }
};

/** Đăng ký listener cho sự kiện từ các tab khác. */
export const subscribe = (listener: BroadcastListener): (() => void) => {
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Tab này có đang được focus không? */
export const isTabFocused = (): boolean => isFocused;

/**
 * Tab này có nên hiển thị toast cho thông báo tới không?
 *
 * Quy tắc: chỉ hiển thị khi tab đang được focus.
 */
export const shouldShowToast = (): boolean => {
  if (typeof document === "undefined") return true;
  return document.hasFocus() || isFocused;
};

/** Đóng kênh (dùng khi test hoặc dọn dẹp). */
export const closeBroadcastChannel = (): void => {
  channel?.close();
  channel = null;
  listeners.clear();
};
