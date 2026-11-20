-- ---------------------------------------------------------------------
-- V8 — KINH NGHIỆM LÀM VIỆC TỰ ĐỘNG CỦA ỨNG VIÊN
--
-- Khi nhà tuyển dụng đánh dấu đơn ứng tuyển là `COMPLETED`, hệ thống tự
-- động ghi lại 1 dòng vào bảng `work_assignments` (bảng vốn đã có sẵn từ
-- V1 với `UNIQUE(application_id)` nhưng chưa được dùng — V2 chỉ bỏ FK
-- `reviews.assignment_id`).
--
-- Bảng này nay đóng vai trò "lịch sử làm việc" của ứng viên:
--   - `application_id` UNIQUE  -> 1 đơn chỉ ghi 1 lần (idempotent)
--   - snapshot tên tin / NTD / chức danh / lương tại thời điểm hoàn thành
--     (tên tin có thể bị sửa hoặc tin bị xoá sau này)
--
-- Các cột mới thêm bằng `ALTER TABLE` (V8) vì bảng đã tồn tại từ V1.
-- Không sửa V1–V7 (đã apply) để tránh lỗi `Migration checksum mismatch`.
-- ---------------------------------------------------------------------

ALTER TABLE work_assignments
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER id,
    ADD COLUMN job_title VARCHAR(200) NULL AFTER employer_id,
    ADD COLUMN company_name VARCHAR(150) NULL AFTER job_title,
    ADD COLUMN position_name VARCHAR(150) NULL AFTER company_name,
    ADD COLUMN salary_type VARCHAR(12) NULL AFTER position_name,
    ADD COLUMN salary_min DECIMAL(12,0) NULL AFTER salary_type,
    ADD COLUMN salary_max DECIMAL(12,0) NULL AFTER salary_min,
    ADD COLUMN note VARCHAR(500) NULL AFTER salary_max,
    ADD COLUMN rating SMALLINT NULL AFTER note;

CREATE UNIQUE INDEX uq_work_assignments_slug ON work_assignments (slug);

-- Cho phép xoá đơn ứng tuyển thì lịch sử làm việc đi theo.
-- Tách DROP + ADD thành 2 lệnh: MySQL không cho dùng lại đúng tên ràng buộc
-- trong cùng một ALTER TABLE.
ALTER TABLE work_assignments
    DROP FOREIGN KEY fk_assignments_application;

ALTER TABLE work_assignments
    ADD CONSTRAINT fk_assignments_application FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE;

-- Tin tuyển dụng bị xoá mềm -> giữ lịch sử, chỉ gỡ liên kết.
-- `job_post_id` gốc là NOT NULL nên phải nới thành NULL trước khi đổi FK.
ALTER TABLE work_assignments
    MODIFY COLUMN job_post_id BIGINT NULL,
    DROP FOREIGN KEY fk_assignments_job;

ALTER TABLE work_assignments
    ADD CONSTRAINT fk_assignments_job FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE SET NULL;
