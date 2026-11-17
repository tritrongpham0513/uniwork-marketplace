-- ---------------------------------------------------------------------
-- V2 — CHUẨN HOÁ CSDL THEO DOMAIN VIEJOB MARKETPLACE
--
-- Mục tiêu: đưa schema từ "bản khái niệm SRS" về đúng shape mà frontend
-- (app/src/features/shared/types/index.ts) đang sử dụng.
--
-- Thay đổi chính:
--   1. Bỏ trigger/procedure sp_refresh_rating (tính điểm trong Java).
--   2. Thêm bảng: job_positions, salary_benchmarks,
--      student_experiences, student_job_preferences.
--   3. Bổ sung cột cho các bảng cũ (employment_type, position_id,
--      icon, logo_variant, branch_name, is_urgent, cv_url, skills,
--      experience, available_from, body, link, reply, is_hidden...).
--   4. Tái tạo bảng `reviews` theo shape 2 chiều của frontend.
--   5. `saved_jobs` có cột `id` riêng (frontend cần SavedJob.id).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. BỎ TRIGGER TÍNH ĐIỂM ĐÁNH GIÁ (chuyển sang tầng service Java)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_reviews_ai;
DROP TRIGGER IF EXISTS trg_reviews_au;
DROP TRIGGER IF EXISTS trg_reviews_ad;
DROP PROCEDURE IF EXISTS sp_refresh_rating;

-- ---------------------------------------------------------------------
-- 2. NHÓM DANH MỤC — bổ sung icon & bảng vị trí công việc
-- ---------------------------------------------------------------------
-- `code` là ID công khai (string) của nhóm việc — frontend dùng string id
-- (ví dụ "cat-fnb"), còn `slug` là slug SEO ("f-and-b").
ALTER TABLE job_categories
    ADD COLUMN code VARCHAR(40) NOT NULL DEFAULT '' AFTER id,
    ADD COLUMN icon VARCHAR(60) NOT NULL DEFAULT 'Briefcase' AFTER description;

CREATE UNIQUE INDEX uq_job_categories_code ON job_categories (code);

CREATE TABLE job_positions (
    id         INT          NOT NULL AUTO_INCREMENT,
    code       VARCHAR(40)  NOT NULL,                 -- ID công khai (ví dụ "pos-phuc-vu")
    category_id SMALLINT    NOT NULL,
    name       VARCHAR(120) NOT NULL,
    slug       VARCHAR(140) NOT NULL,
    sort_order SMALLINT     NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_job_positions_slug (slug),
    UNIQUE KEY uq_job_positions_code (code),
    KEY idx_job_positions_category (category_id),
    CONSTRAINT fk_job_positions_category FOREIGN KEY (category_id) REFERENCES job_categories (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bảng xếp hạng lương theo ngành × tỉnh (quy đổi về đồng/giờ)
CREATE TABLE salary_benchmarks (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    category_id  SMALLINT     NOT NULL,
    province_id  SMALLINT     NOT NULL,
    avg_hourly   DECIMAL(12,0) NOT NULL,
    min_hourly   DECIMAL(12,0) NOT NULL,
    max_hourly   DECIMAL(12,0) NOT NULL,
    sample_size  INT          NOT NULL DEFAULT 0,
    updated_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_salary_benchmarks (category_id, province_id),
    CONSTRAINT fk_salary_benchmarks_category FOREIGN KEY (category_id) REFERENCES job_categories (id) ON DELETE CASCADE,
    CONSTRAINT fk_salary_benchmarks_province FOREIGN KEY (province_id) REFERENCES provinces (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- `code` là ID công khai (string) của tỉnh — frontend dùng string id (ví dụ "hcm")
-- (cột `code` đã có sẵn từ V1, dùng lại làm public id)

-- `code` của quận đã là ID công khai (ví dụ "q1") — dùng luôn cho frontend
-- Nới độ dài cột `code` cho phép mã dài hơn (ví dụ "q-binh-thanh").
ALTER TABLE districts MODIFY COLUMN code VARCHAR(40) NOT NULL;

CREATE UNIQUE INDEX uq_districts_code ON districts (code);

-- ---------------------------------------------------------------------
-- 3. HỒ SƠ SINH VIÊN — kỹ năng (JSON), CV, kinh nghiệm, mục tiêu việc làm
-- ---------------------------------------------------------------------
-- `slug` là ID công khai (string) của hồ sơ — frontend dùng string id.
ALTER TABLE student_profiles
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER user_id,
    ADD COLUMN cv_url VARCHAR(500) NULL AFTER avatar_url,
    ADD COLUMN skills JSON NULL AFTER cv_url;

CREATE UNIQUE INDEX uq_student_profiles_slug ON student_profiles (slug);

-- Kỹ năng dạng danh sách tự do (người dùng có thể nhập kỹ năng mới,
-- không bắt buộc phải có trong bảng `skills`).
CREATE TABLE student_experiences (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    student_id  BIGINT       NOT NULL,
    company     VARCHAR(150) NOT NULL,
    position    VARCHAR(150) NOT NULL,
    start_date  DATE         NULL,
    end_date    DATE         NULL,
    description TEXT         NULL,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_student_experiences_student (student_id),
    CONSTRAINT fk_student_experiences_student FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE student_job_preferences (
    student_id       BIGINT        NOT NULL,
    category_ids     JSON          NOT NULL,
    employment_types JSON          NOT NULL,
    province_ids     JSON          NOT NULL,
    salary_min       DECIMAL(12,0) NOT NULL DEFAULT 0,
    salary_max       DECIMAL(12,0) NOT NULL DEFAULT 0,
    PRIMARY KEY (student_id),
    CONSTRAINT fk_student_prefs_student FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. HỒ SƠ NHÀ TUYỂN DỤNG — màu logo (token-safe) cho EmployerSummary
-- ---------------------------------------------------------------------
-- `slug` là ID công khai (string) của hồ sơ — frontend dùng string id.
ALTER TABLE employer_profiles
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER user_id,
    ADD COLUMN logo_variant VARCHAR(16) NOT NULL DEFAULT 'primary' AFTER logo_url;

CREATE UNIQUE INDEX uq_employer_profiles_slug ON employer_profiles (slug);

-- ---------------------------------------------------------------------
-- 5. TIN TUYỂN DỤNG — loại hình làm việc, vị trí, chi nhánh, gấp
-- ---------------------------------------------------------------------
-- `slug` là ID công khai (string) của tin — frontend dùng string id.
ALTER TABLE job_posts
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER id,    ADD COLUMN employment_type VARCHAR(20) NOT NULL DEFAULT 'PART_TIME' AFTER work_mode,
    ADD COLUMN position_id INT NULL AFTER category_id,
    ADD COLUMN branch_name VARCHAR(150) NULL AFTER address_detail,
    ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT FALSE AFTER view_count,
    ADD COLUMN applicant_count INT NOT NULL DEFAULT 0 AFTER is_urgent,
    ADD CONSTRAINT fk_job_posts_position FOREIGN KEY (position_id) REFERENCES job_positions (id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_job_employment_type CHECK (employment_type IN ('FULL_TIME','PART_TIME','FLEXIBLE','CASUAL'));

CREATE UNIQUE INDEX uq_job_posts_slug ON job_posts (slug);

-- Mức lương quy đổi về đồng/giờ (generated column) để lọc & sắp xếp
-- nhất quán bất kể tin trả lương theo giờ / ngày / tuần / tháng.
-- Hằng số quy ước giống frontend: HOURS_PER_SALARY_UNIT (giờ=1, ngày=8, tuần=40, tháng=160).
ALTER TABLE job_posts
    ADD COLUMN salary_min_hourly DECIMAL(12,0)
        GENERATED ALWAYS AS (
            CASE salary_type
                WHEN 'HOURLY'   THEN ROUND(COALESCE(salary_min, 0) / 1)
                WHEN 'DAILY'    THEN ROUND(COALESCE(salary_min, 0) / 8)
                WHEN 'WEEKLY'   THEN ROUND(COALESCE(salary_min, 0) / 40)
                WHEN 'MONTHLY'  THEN ROUND(COALESCE(salary_min, 0) / 160)
                WHEN 'PER_TASK' THEN ROUND(COALESCE(salary_min, 0) / 3)
                ELSE 0
            END
        ) VIRTUAL,
    ADD COLUMN salary_max_hourly DECIMAL(12,0)
        GENERATED ALWAYS AS (
            CASE
                WHEN salary_max IS NULL THEN (
                    CASE salary_type
                        WHEN 'HOURLY'   THEN ROUND(COALESCE(salary_min, 0) / 1)
                        WHEN 'DAILY'    THEN ROUND(COALESCE(salary_min, 0) / 8)
                        WHEN 'WEEKLY'   THEN ROUND(COALESCE(salary_min, 0) / 40)
                        WHEN 'MONTHLY'  THEN ROUND(COALESCE(salary_min, 0) / 160)
                        WHEN 'PER_TASK' THEN ROUND(COALESCE(salary_min, 0) / 3)
                        ELSE 0
                    END
                )
                WHEN salary_type = 'HOURLY'   THEN ROUND(salary_max / 1)
                WHEN salary_type = 'DAILY'    THEN ROUND(salary_max / 8)
                WHEN salary_type = 'WEEKLY'   THEN ROUND(salary_max / 40)
                WHEN salary_type = 'MONTHLY'  THEN ROUND(salary_max / 160)
                WHEN salary_type = 'PER_TASK' THEN ROUND(salary_max / 3)
                ELSE 0
            END
        ) VIRTUAL;

CREATE INDEX idx_job_posts_salary_hourly ON job_posts (salary_min_hourly);

-- Ca qua đêm (22:00 -> 06:00) là hợp lệ -> nới ràng buộc end_time > start_time
ALTER TABLE job_post_schedules DROP CHECK ck_schedule_time;

-- `requirements` & `benefits` là danh sách chuỗi -> đổi từ TEXT sang JSON
-- để khớp với entity `List<String>` (Hibernate @JdbcTypeCode(SqlTypes.JSON)).
ALTER TABLE job_posts
    MODIFY COLUMN requirements JSON NULL,
    MODIFY COLUMN benefits JSON NULL;

-- ---------------------------------------------------------------------
-- 6. ỨNG TUYỂN — trạng thái COMPLETED, kinh nghiệm, ngày bắt đầu, CV
-- ---------------------------------------------------------------------
ALTER TABLE applications DROP CHECK ck_application_status;

ALTER TABLE applications
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER id,
    ADD COLUMN experience TEXT NULL AFTER cover_letter,
    ADD COLUMN available_from DATE NULL AFTER experience,
    ADD COLUMN cv_url VARCHAR(500) NULL AFTER available_from,
    ADD COLUMN cv_file_name VARCHAR(255) NULL AFTER cv_url,
    ADD CONSTRAINT ck_application_status CHECK (status IN ('PENDING','VIEWED','SHORTLISTED','ACCEPTED','COMPLETED','REJECTED','WITHDRAWN'));

CREATE UNIQUE INDEX uq_applications_slug ON applications (slug);

-- ---------------------------------------------------------------------
-- 7. TIN ĐÃ LƯU — cần `id` riêng (frontend đọc SavedJob.id)
--
-- Bảng gốc dùng composite PK (student_id, job_post_id), đồng thời PK này
-- còn là index phục vụ cho FK `fk_saved_jobs_student` nên không thể
-- DROP PRIMARY KEY trực tiếp (MySQL: "Cannot drop index 'PRIMARY'").
-- V2 chạy trước khi seed dữ liệu nên ta tạo lại bảng từ đầu.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS saved_jobs;

CREATE TABLE saved_jobs (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(80)  NOT NULL DEFAULT '',
    student_id  BIGINT       NOT NULL,
    job_post_id BIGINT       NOT NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_saved_jobs_student_job (student_id, job_post_id),
    UNIQUE KEY uq_saved_jobs_slug (slug),
    KEY idx_saved_jobs_job (job_post_id),
    CONSTRAINT fk_saved_jobs_student FOREIGN KEY (student_id)  REFERENCES student_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_jobs_job     FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. ĐÁNH GIÁ 2 CHIỀU — tái tạo theo shape frontend
--    (bỏ FK work_assignments: frontend không có mô hình "phân công việc")
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS reviews;

CREATE TABLE reviews (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    slug            VARCHAR(80)   NOT NULL DEFAULT '',
    application_id  BIGINT        NULL,
    job_id          BIGINT        NULL,
    reviewer_id     BIGINT        NOT NULL,
    reviewee_id     BIGINT        NOT NULL,
    reviewer_role   VARCHAR(10)   NOT NULL,
    target_type     VARCHAR(10)   NOT NULL,
    from_name       VARCHAR(150)  NOT NULL,
    from_avatar_url VARCHAR(500)  NULL,
    target_name     VARCHAR(150)  NOT NULL,
    rating          SMALLINT      NOT NULL,
    comment         VARCHAR(1000) NOT NULL,
    reply           VARCHAR(1000) NULL,
    is_hidden       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_review_once (application_id, reviewer_id),
    KEY idx_reviews_reviewee (reviewee_id, is_hidden),
    KEY idx_reviews_application (application_id),
    CONSTRAINT fk_reviews_application FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_job FOREIGN KEY (job_id) REFERENCES job_posts (id) ON DELETE SET NULL,
    CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_review_role CHECK (reviewer_role IN ('STUDENT','EMPLOYER')),
    CONSTRAINT ck_review_target_type CHECK (target_type IN ('EMPLOYER','STUDENT')),
    CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_review_not_self CHECK (reviewer_id <> reviewee_id)
) ENGINE=InnoDB;

CREATE UNIQUE INDEX uq_reviews_slug ON reviews (slug);

-- ---------------------------------------------------------------------
-- 9. THÔNG BÁO — frontend đọc `body` và `link`
-- ---------------------------------------------------------------------
ALTER TABLE notifications
    ADD COLUMN slug VARCHAR(80) NOT NULL DEFAULT '' AFTER id,
    ADD COLUMN body VARCHAR(500) NULL AFTER title,
    ADD COLUMN link VARCHAR(255) NULL AFTER body;

CREATE UNIQUE INDEX uq_notifications_slug ON notifications (slug);

-- ---------------------------------------------------------------------
-- 11. KỸ NĂNG CỦA TIN TUYỂN DỤNG — thêm cột `id` riêng
--
-- Bảng gốc dùng composite PK (job_post_id, skill_id); entity `JobPostSkill`
-- cần surrogate key `id` (IDENTITY) nên ta tạo lại bảng.
-- V2 chạy trước khi seed dữ liệu nên không mất dữ liệu.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS job_post_skills;

CREATE TABLE job_post_skills (
    id          BIGINT   NOT NULL AUTO_INCREMENT,
    job_post_id BIGINT  NOT NULL,
    skill_id    INT      NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_job_post_skills (job_post_id, skill_id),
    KEY idx_job_post_skills_skill (skill_id),
    CONSTRAINT fk_job_post_skills_job   FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_job_post_skills_skill FOREIGN KEY (skill_id)    REFERENCES skills (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. VIEW hỗ trợ — bổ sung cột mới
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_open_job_posts;

CREATE OR REPLACE VIEW v_open_job_posts AS
SELECT  j.id, j.title, j.salary_type, j.salary_min, j.salary_max, j.positions_count,
        j.positions_filled, j.province_id, j.category_id, j.published_at, j.application_deadline,
        e.user_id AS employer_id, e.display_name AS employer_name, e.is_verified,
        e.avg_rating AS employer_rating,
        (SELECT COUNT(*) FROM applications a WHERE a.job_post_id = j.id) AS application_count
FROM    job_posts j
JOIN    employer_profiles e ON e.user_id = j.employer_id
WHERE   j.status = 'OPEN' AND j.deleted_at IS NULL
  AND   (j.application_deadline IS NULL OR j.application_deadline > NOW());
