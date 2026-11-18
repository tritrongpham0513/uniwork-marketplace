-- ---------------------------------------------------------------------
-- V4 — FILE UPLOAD & TUỲ CHỌN THÔNG BÁO TIN TUYỂN DỤNG
--
-- 1. `file_uploads`         : metadata của file đã upload (CV / avatar / logo)
-- 2. `job_notify_preferences`: tuỳ chọn "Bật thông báo" của sinh viên
--                              theo nhóm việc × tỉnh
--
-- Hibernate chạy với `ddl-auto: validate` nên mọi entity mới đều cần
-- migration tương ứng — nếu thiếu, backend sẽ fail lúc boot.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. FILE UPLOAD
--
-- `storage_key` là tên file ngẫu nhiên trong thư mục lưu trữ (đã giữ
-- extension gốc). `original_name` giữ tên file người dùng chọn để hiển thị.
-- `kind` phân biệt mục đích dùng để áp quy tắc truy cập:
--   AVATAR / LOGO : công khai (ảnh hiển thị trong danh sách)
--   CV            : chỉ chủ sở hữu (hoặc nhà tuyển dụng đã duyệt hồ sơ) xem được
-- ---------------------------------------------------------------------
CREATE TABLE file_uploads (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    slug          VARCHAR(80)  NOT NULL DEFAULT '',
    owner_user_id BIGINT       NOT NULL,
    kind          VARCHAR(20)  NOT NULL,
    storage_key   VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type     VARCHAR(120) NOT NULL,
    size_bytes    BIGINT       NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at    DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_file_uploads_slug (slug),
    UNIQUE KEY uq_file_uploads_storage_key (storage_key),
    KEY idx_file_uploads_owner (owner_user_id, kind),
    CONSTRAINT fk_file_uploads_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_file_uploads_kind CHECK (kind IN ('CV', 'AVATAR', 'LOGO'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. TUỲ CHỌN THÔNG BÁO TIN TUYỂN DỤNG
--
-- Sinh viên bật thông báo cho (nhóm việc, tỉnh). Khi có tin tuyển dụng
-- mới được duyệt khớp nhóm việc + tỉnh, các sinh viên này sẽ nhận
-- thông báo.
--
-- `province_code` dùng giá trị sentinel 'ALL' để theo dõi mọi tỉnh.
-- (MySQL cho phép nhiều NULL trong UNIQUE index nên NULL không dùng
-- được làm "giá trị duy nhất" cho ràng buộc UNIQUE.)
-- ---------------------------------------------------------------------
CREATE TABLE job_notify_preferences (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       BIGINT       NOT NULL,
    category_code VARCHAR(40)  NOT NULL,
    province_code VARCHAR(40)  NOT NULL DEFAULT 'ALL',
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_job_notify_pref (user_id, category_code, province_code),
    KEY idx_job_notify_pref_lookup (category_code, province_code),
    CONSTRAINT fk_job_notify_pref_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
