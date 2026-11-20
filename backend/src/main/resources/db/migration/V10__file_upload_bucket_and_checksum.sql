-- ---------------------------------------------------------------------
-- V10 — FILE UPLOAD: BUCKET + CHECKSUM
--
-- Bổ sung metadata cho luồng upload trực tiếp (presigned PUT) lên
-- Cloudflare R2:
--
--   `bucket`   — bucket chứa file: 'public' (avatar / logo) hoặc 'private' (CV).
--                Tách bucket là điều kiện để CV KHÔNG bị lộ link tĩnh:
--                bucket public phục vụ ảnh qua CDN, bucket private chỉ tải
--                được bằng presigned URL có hạn.
--
--   `checksum` — SHA-256 của nội dung file (hex). Cho phép đối soát file
--                sau khi upload trực tiếp (client có thể gửi khác file so
--                với presigned URL đã cấp).
--
-- Ghi chú: SQL tĩnh — không sửa V1..V9 (tránh "Migration checksum mismatch").
-- ---------------------------------------------------------------------

ALTER TABLE file_uploads
    ADD COLUMN bucket VARCHAR(40) NOT NULL DEFAULT 'public' AFTER storage_key,
    ADD COLUMN checksum VARCHAR(64) NULL AFTER bucket;

-- File cũ (upload trước V10) được gán bucket theo loại:
--   CV -> private (tài nguyên riêng tư), AVATAR / LOGO -> public.
UPDATE file_uploads
SET bucket = 'private'
WHERE kind = 'CV';

-- Gợi ý truy vấn: tìm file theo chủ sở hữu + loại + chưa xoá
CREATE INDEX idx_file_uploads_owner_kind ON file_uploads (owner_user_id, kind, deleted_at);
