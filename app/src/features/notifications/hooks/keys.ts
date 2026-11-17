/**
 * Query keys của feature thông báo.
 *
 * Tách riêng thành file để tránh vòng import giữa `index.ts` (nơi khai báo
 * hook) và các hook realtime.
 */
export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (unreadOnly?: boolean) => ["notifications", "list", unreadOnly] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};
