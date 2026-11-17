/**
 * 🔌 Client realtime cho kênh thông báo.
 *
 * Vài điểm thiết kế quan trọng:
 *
 * 1. **Vé một-lần.** Trình duyệt không cho gắn header `Authorization` khi mở
 *    WebSocket, nên token phải đi qua query string. Thay vì đưa JWT (hạn 24h)
 *    vào URL — sẽ lọt vào access log của nginx — ta xin một vé dùng một lần,
 *    hạn 60 giây từ `POST /api/v1/ws/ticket`.
 *
 * 2. **Bảng `notifications` là nguồn sự thật.** Frame nhận được chỉ là *tín
 *    hiệu + payload nhẹ* để UI phản hồi tức thì. Client vẫn phải refetch danh
 *    sách từ REST để có dữ liệu chuẩn.
 *
 * 3. **Kết nối rơi -> tự nối lại** với backoff luỹ thừa. Mỗi lần kết nối lại
 *    thành công sẽ refetch để bù cho các thông báo bị lỡ trong lúc mất kết nối.
 */

/** Payload nhẹ do backend đẩy xuống. */
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  unreadCount?: number;
}

/** Trạng thái kết nối hiện tại. */
export type RealtimeStatus = "idle" | "connecting" | "open" | "closed";

export interface RealtimeNotificationClientOptions {
  /** Base URL của API — dùng để suy ra URL WebSocket (giữ nguyên origin). */
  apiBaseUrl: string;
  /** Xin vé kết nối (một lần cho mỗi lần mở socket). */
  requestTicket: () => Promise<string>;
  /** Nhận payload thông báo mới. */
  onNotification: (payload: RealtimeNotification) => void;
  /** Được gọi khi kết nối lại thành công — dùng để refetch bù thông báo lỡ. */
  onReconnect?: () => void;
  /** Được gọi mỗi khi trạng thái kết nối thay đổi. */
  onStatusChange?: (status: RealtimeStatus) => void;
}

/** Thời gian chờ tối đa giữa các lần thử lại (ms). */
const MAX_RECONNECT_DELAY = 30_000;

/** Thời gian chờ ban đầu giữa các lần thử lại (ms). */
const BASE_RECONNECT_DELAY = 1_000;

/** Chu kỳ gửi ping để giữ kết nối (ms). */
const PING_INTERVAL = 25_000;

/**
 * Suy ra URL WebSocket từ base URL của API.
 *
 * `http://localhost:5173` -> `ws://localhost:5173/ws/notifications`.
 * Giữ nguyên origin để request đi qua đúng proxy (nginx ở production,
 * Vite ở development) thay vì bị CORS chặn.
 */
export const buildNotificationSocketUrl = (
  apiBaseUrl: string,
  ticket: string
): string => {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const wsBase = base.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${wsBase}/ws/notifications?ticket=${encodeURIComponent(ticket)}`;
};

/**
 * Một kết nối WebSocket tới kênh thông báo, tự quản lý vòng đời.
 */
export class RealtimeNotificationClient {
  private socket: WebSocket | null = null;
  private readonly options: RealtimeNotificationClientOptions;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closedByUser = false;

  constructor(options: RealtimeNotificationClientOptions) {
    this.options = options;
  }

  /** Mở kết nối (an toàn gọi lại nhiều lần). */
  async connect(): Promise<void> {
    this.closedByUser = false;
    await this.openSocket();
  }

  /** Đóng kết nối và huỷ mọi hẹn giờ thử lại. */
  close(): void {
    this.closedByUser = true;
    this.clearTimers();

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      try {
        this.socket.close();
      } catch {
        // Bỏ qua — socket có thể đã đóng.
      }
      this.socket = null;
    }

    this.options.onStatusChange?.("closed");
  }

  /** Đang kết nối hay chưa. */
  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // ------------------------------------------------------------------
  // INTERNALS
  // ------------------------------------------------------------------

  private async openSocket(): Promise<void> {
    if (this.closedByUser) return;

    this.options.onStatusChange?.("connecting");

    let ticket: string;
    try {
      ticket = await this.options.requestTicket();
    } catch {
      // Không lấy được vé (chưa đăng nhập / token hết hạn) -> thử lại sau.
      this.scheduleReconnect();
      return;
    }

    if (this.closedByUser) return;

    const url = buildNotificationSocketUrl(this.options.apiBaseUrl, ticket);

    try {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.options.onStatusChange?.("open");
        this.startPing();

        // Lần đầu kết nối không cần refetch bù, nhưng kết nối lại thì có.
        if (this.reconnectAttempt > 0) {
          this.options.onReconnect?.();
        }
        this.reconnectAttempt = 0;
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        this.handleMessage(event.data);
      };

      socket.onerror = () => {
        // `onclose` sẽ luôn được gọi sau `onerror` -> xử lý reconnect ở đó.
      };

      socket.onclose = () => {
        this.stopPing();
        this.socket = null;
        this.options.onStatusChange?.("closed");
        if (!this.closedByUser) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as RealtimeNotification;

      if (!parsed || typeof parsed.id !== "string") return;

      this.options.onNotification(parsed);
    } catch {
      // Frame không hợp lệ -> bỏ qua, không được làm sập client.
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempt += 1;

    // Backoff luỹ thừa có chặn trần: 1s, 2s, 4s, 8s... tối đa 30s.
    const delay = Math.min(
      BASE_RECONNECT_DELAY * 2 ** (this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSocket();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send("ping");
        } catch {
          // Bỏ qua — `onclose` sẽ xử lý.
        }
      }
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
  }
}
