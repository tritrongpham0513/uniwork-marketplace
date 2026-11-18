-- ---------------------------------------------------------------------
-- V5 — BỎ TRẠNG THÁI `VIEWED` KHỎI ĐƠN ỨNG TUYỂN
--
-- Pipeline mới (nhà tuyển dụng tự điều khiển):
--   PENDING → SHORTLISTED → ACCEPTED → COMPLETED
-- kèm `REJECTED` (từ chối) và `WITHDRAWN` (sinh viên rút đơn).
--
-- `VIEWED` trước đây là trạng thái "nhà tuyển dụng đã mở xem hồ sơ" —
-- không phải một bước cố ý trong pipeline nên bị gỡ khỏi hệ thống.
--
-- `reviewed_at` được giữ lại: nay đánh dấu thời điểm nhà tuyển dụng
-- lần đầu chủ động xử lý hồ sơ (duyệt sơ bộ hoặc từ chối).
-- ---------------------------------------------------------------------

-- 1. Nới ràng buộc CHECK cũ (V2 đã thêm lại kèm 'VIEWED').
ALTER TABLE applications DROP CHECK ck_application_status;

-- 2. Ràng buộc mới — không còn 'VIEWED'.
ALTER TABLE applications
    ADD CONSTRAINT ck_application_status CHECK (status IN ('PENDING','SHORTLISTED','ACCEPTED','COMPLETED','REJECTED','WITHDRAWN'));

-- 3. Dọn dữ liệu cũ:
--    - Đơn đang ở `VIEWED` → đưa về `PENDING` (chưa có quyết định nào).
--    - Xoá các bước timeline `VIEWED` (đã bị gỡ khỏi mô hình trạng thái).
UPDATE applications SET status = 'PENDING' WHERE status = 'VIEWED';

DELETE FROM application_status_history
WHERE to_status = 'VIEWED' OR from_status = 'VIEWED';
