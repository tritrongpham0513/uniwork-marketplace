/**
 * Query keys của feature thông báo.
 *
 * Tách riêng thành file để tránh vòng import giữa `index.ts` (nơi khai báo
 * hook) và các hook realtime.
 *
 * Định nghĩa gốc nằm ở `features/shared/query-keys` — giữ toàn bộ query key
 * ở một chỗ để feature khác không phải import chéo vào đây.
 */
import { NOTIFICATION_KEYS } from "@/features/shared/query-keys";

export { NOTIFICATION_KEYS };
