-- ---------------------------------------------------------------------
-- V14 — FILE UPLOAD: GIỮ BLOB KHI CV CÒN ĐƯỢC DÙNG TRONG ĐƠN ỨNG TUYỂN
--
-- Bối cảnh:
--   CV được gỡ khỏi hồ sơ vẫn có thể đang được đơn ứng tuyển trỏ tới
--   (`applications.cv_url`). Trước đây backend chặn xoá với lỗi 409
--   FILE_IN_USE → file sống mãi trong DB, chiếm quota, khiến người dùng
--   không tải được CV mới.
--
--   Nay đã bỏ giới hạn số file nên vấn đề quota không còn kẹt, nhưng vẫn
--   cần giữ CV cho nhà tuyển dụng xem được trong đơn ứng tuyển cũ.
--
-- `blob_kept`:
--   FALSE (mặc định) — xoá thật: object trên R2 đã bị xoá.
--   TRUE               — xoá mềm nhưng GIỮ object trên R2 vì đơn ứng tuyển
--                        còn trỏ tới; nhà tuyển dụng vẫn xem được CV cũ.
--
-- Ghi chú: SQL tĩnh — không sửa V1..V13 (tránh "Migration checksum mismatch").
-- ---------------------------------------------------------------------

ALTER TABLE file_uploads
    ADD COLUMN blob_kept BOOLEAN NOT NULL DEFAULT FALSE AFTER deleted_at;

-- Cần tra cứu nhanh: file đã xoá mềm nhưng còn giữ blob.
CREATE INDEX idx_file_uploads_blob_kept ON file_uploads (deleted_at, blob_kept);
