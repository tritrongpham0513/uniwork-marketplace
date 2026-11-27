-- ---------------------------------------------------------------------
-- V19 — ẢNH PREVIEW TIN TUYỂN DỤNG
--
-- Bối cảnh:
--   Nhà tuyển dụng cần một ảnh duy nhất cho mỗi tin tuyển dụng (ảnh quán,
--   không gian làm việc, món ăn...) để sinh viên hình dung nơi mình sẽ
--   làm việc trước khi ứng tuyển.
--
--   `preview_image_url` lưu URL công khai tương đối (`/api/v1/files/{slug}`)
--   — cùng cách lưu `employer_profiles.logo_url` / `student_profiles.avatar_url`.
--   Không có FK sang `file_uploads` vì cột này là URL, không phải id.
--
--   Loại file mới `JOB_IMAGE` tách riêng khỏi LOGO/AVATAR để:
--     - giới hạn dung lượng riêng (5MB),
--     - resize về cạnh dài 1200px (thay vì 512px của avatar/logo),
--     - cộng dồn vào quota 20MB/user.
--
-- Ghi chú: SQL tĩnh — không sửa V1..V18 (tránh "Migration checksum mismatch").
-- ---------------------------------------------------------------------

ALTER TABLE job_posts
    ADD COLUMN preview_image_url VARCHAR(500) NULL AFTER title;

-- Nới check constraint của `file_uploads.kind` để nhận thêm loại ảnh preview.
-- MySQL 8.x dùng `DROP CHECK` (đã dùng cùng cú pháp ở V2/V5).
ALTER TABLE file_uploads DROP CHECK ck_file_uploads_kind;

ALTER TABLE file_uploads
    ADD CONSTRAINT ck_file_uploads_kind
    CHECK (kind IN ('CV', 'AVATAR', 'LOGO', 'JOB_IMAGE'));
