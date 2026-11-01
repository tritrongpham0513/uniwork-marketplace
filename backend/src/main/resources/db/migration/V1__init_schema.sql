
-- ---------------------------------------------------------------------
-- 1. NHÓM DANH MỤC (MASTER DATA)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          SMALLINT     NOT NULL AUTO_INCREMENT,
    code        VARCHAR(20)  NOT NULL,                 -- STUDENT | EMPLOYER | ADMIN
    name        VARCHAR(50)  NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE provinces (
    id   SMALLINT     NOT NULL AUTO_INCREMENT,
    code VARCHAR(10)  NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_provinces_code (code),
    UNIQUE KEY uq_provinces_name (name)
) ENGINE=InnoDB;

CREATE TABLE districts (
    id          INT          NOT NULL AUTO_INCREMENT,
    province_id SMALLINT     NOT NULL,
    code        VARCHAR(10)  NULL,
    name        VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_districts_province_name (province_id, name),
    CONSTRAINT fk_districts_province FOREIGN KEY (province_id) REFERENCES provinces (id)
) ENGINE=InnoDB;

CREATE TABLE job_categories (
    id          SMALLINT     NOT NULL AUTO_INCREMENT,
    parent_id   SMALLINT     NULL,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_job_categories_slug (slug),
    CONSTRAINT fk_job_categories_parent FOREIGN KEY (parent_id) REFERENCES job_categories (id)
) ENGINE=InnoDB;

CREATE TABLE skills (
    id        INT          NOT NULL AUTO_INCREMENT,
    name      VARCHAR(80)  NOT NULL,
    slug      VARCHAR(100) NOT NULL,
    is_active BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_skills_name (name),
    UNIQUE KEY uq_skills_slug (slug)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. NHÓM TÀI KHOẢN & XÁC THỰC
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    email              VARCHAR(255) NOT NULL,            -- collation _ci: không phân biệt hoa/thường
    password_hash      VARCHAR(255) NOT NULL,            -- BCrypt
    role_id            SMALLINT     NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDING_VERIFY',
    email_verified_at  DATETIME(6)  NULL,
    auth_provider      VARCHAR(10)  NOT NULL DEFAULT 'LOCAL',
    google_sub         VARCHAR(64)  NULL,
    failed_login_count SMALLINT     NOT NULL DEFAULT 0,
    locked_until       DATETIME(6)  NULL,
    last_login_at      DATETIME(6)  NULL,
    created_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at         DATETIME(6)  NULL,
    -- Email chỉ cần duy nhất trong các tài khoản chưa xóa (thay cho partial index của PostgreSQL)
    active_email       VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL, email, NULL)) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_active_email (active_email),
    UNIQUE KEY uq_users_google_sub (google_sub),
    KEY idx_users_role_status (role_id, status),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT ck_users_status CHECK (status IN ('PENDING_VERIFY','ACTIVE','LOCKED','DELETED')),
    CONSTRAINT ck_users_provider CHECK (auth_provider IN ('LOCAL','GOOGLE'))
) ENGINE=InnoDB;

-- Token xác thực email / quên mật khẩu (lưu hash, dùng 1 lần)
CREATE TABLE user_tokens (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    token_type VARCHAR(20) NOT NULL,
    token_hash CHAR(64)    NOT NULL,                     -- SHA-256 hex
    expires_at DATETIME(6) NOT NULL,
    used_at    DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_tokens_hash (token_hash),
    KEY idx_user_tokens_user (user_id, token_type),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_tokens_type CHECK (token_type IN ('EMAIL_VERIFY','PASSWORD_RESET'))
) ENGINE=InnoDB;

-- Refresh token cho JWT (cho phép thu hồi / đăng xuất)
CREATE TABLE refresh_tokens (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    revoked_at DATETIME(6)  NULL,
    ip_address VARCHAR(45)  NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_hash (token_hash),
    KEY idx_refresh_tokens_user (user_id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. NHÓM HỒ SƠ
-- ---------------------------------------------------------------------
CREATE TABLE student_profiles (
    user_id       BIGINT       NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20)  NULL,
    date_of_birth DATE         NULL,
    gender        VARCHAR(10)  NULL,
    student_code  VARCHAR(20)  NULL,
    university    VARCHAR(150) NULL,
    major         VARCHAR(100) NULL,
    year_of_study SMALLINT     NULL,
    province_id   SMALLINT     NULL,
    address       VARCHAR(255) NULL,
    bio           TEXT         NULL,
    avatar_url    VARCHAR(500) NULL,
    avg_rating    DECIMAL(3,2) NOT NULL DEFAULT 0,       -- trigger tự cập nhật
    rating_count  INT          NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    KEY idx_student_profiles_province (province_id),
    CONSTRAINT fk_student_profiles_user     FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_profiles_province FOREIGN KEY (province_id) REFERENCES provinces (id),
    CONSTRAINT ck_student_gender CHECK (gender IN ('MALE','FEMALE','OTHER')),
    CONSTRAINT ck_student_year   CHECK (year_of_study BETWEEN 1 AND 8),
    CONSTRAINT ck_student_rating CHECK (avg_rating BETWEEN 0 AND 5 AND rating_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE employer_profiles (
    user_id       BIGINT       NOT NULL,
    employer_type VARCHAR(12)  NOT NULL DEFAULT 'COMPANY',
    display_name  VARCHAR(150) NOT NULL,                 -- tên công ty / tên cá nhân
    contact_name  VARCHAR(100) NULL,
    contact_phone VARCHAR(20)  NULL,
    tax_code      VARCHAR(20)  NULL,
    description   TEXT         NULL,
    logo_url      VARCHAR(500) NULL,
    website       VARCHAR(255) NULL,
    province_id   SMALLINT     NULL,
    address       VARCHAR(255) NULL,
    is_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at   DATETIME(6)  NULL,
    verified_by   BIGINT       NULL,                     -- admin xác minh
    avg_rating    DECIMAL(3,2) NOT NULL DEFAULT 0,
    rating_count  INT          NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    KEY idx_employer_profiles_verified (is_verified),
    CONSTRAINT fk_employer_profiles_user     FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_employer_profiles_province FOREIGN KEY (province_id) REFERENCES provinces (id),
    CONSTRAINT fk_employer_profiles_verifier FOREIGN KEY (verified_by) REFERENCES users (id),
    CONSTRAINT ck_employer_type   CHECK (employer_type IN ('COMPANY','INDIVIDUAL')),
    CONSTRAINT ck_employer_rating CHECK (avg_rating BETWEEN 0 AND 5 AND rating_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE student_skills (
    student_id BIGINT      NOT NULL,
    skill_id   INT         NOT NULL,
    level      VARCHAR(12) NOT NULL DEFAULT 'BEGINNER',
    PRIMARY KEY (student_id, skill_id),
    KEY idx_student_skills_skill (skill_id),
    CONSTRAINT fk_student_skills_student FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_student_skills_skill   FOREIGN KEY (skill_id)   REFERENCES skills (id),
    CONSTRAINT ck_student_skills_level CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED'))
) ENGINE=InnoDB;

CREATE TABLE student_resumes (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    student_id   BIGINT       NOT NULL,
    title        VARCHAR(150) NOT NULL,
    file_url     VARCHAR(500) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_size_kb INT          NULL,
    mime_type    VARCHAR(100) NULL,
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at   DATETIME(6)  NULL,
    -- Mỗi sinh viên chỉ có tối đa 1 CV mặc định (chưa xóa)
    default_owner BIGINT GENERATED ALWAYS AS (IF(is_default = 1 AND deleted_at IS NULL, student_id, NULL)) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_resumes_default (default_owner),
    KEY idx_student_resumes_student (student_id),
    CONSTRAINT fk_student_resumes_student FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT ck_resume_size CHECK (file_size_kb IS NULL OR file_size_kb > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. NHÓM TIN TUYỂN DỤNG
-- ---------------------------------------------------------------------
CREATE TABLE job_posts (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    employer_id          BIGINT        NOT NULL,
    category_id          SMALLINT      NOT NULL,
    title                VARCHAR(200)  NOT NULL,
    description          TEXT          NOT NULL,
    requirements         TEXT          NULL,
    benefits             TEXT          NULL,
    work_mode            VARCHAR(10)   NOT NULL DEFAULT 'ONSITE',
    province_id          SMALLINT      NULL,
    district_id          INT           NULL,
    address_detail       VARCHAR(255)  NULL,
    salary_type          VARCHAR(12)   NOT NULL,
    salary_min           DECIMAL(12,0) NULL,
    salary_max           DECIMAL(12,0) NULL,
    salary_currency      CHAR(3)       NOT NULL DEFAULT 'VND',
    positions_count      SMALLINT      NOT NULL DEFAULT 1,
    positions_filled     SMALLINT      NOT NULL DEFAULT 0,
    start_date           DATE          NULL,
    end_date             DATE          NULL,
    application_deadline DATETIME(6)   NULL,
    status               VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
    reviewed_by          BIGINT        NULL,             -- admin kiểm duyệt
    reviewed_at          DATETIME(6)   NULL,
    reject_reason        VARCHAR(500)  NULL,
    view_count           INT           NOT NULL DEFAULT 0,
    published_at         DATETIME(6)   NULL,
    closed_at            DATETIME(6)   NULL,
    created_at           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at           DATETIME(6)   NULL,
    PRIMARY KEY (id),
    KEY idx_job_posts_employer  (employer_id, status),
    KEY idx_job_posts_search    (status, category_id, province_id, salary_min),
    KEY idx_job_posts_published (status, published_at),
    FULLTEXT KEY ft_job_posts_title_desc (title, description),
    CONSTRAINT fk_job_posts_employer FOREIGN KEY (employer_id) REFERENCES employer_profiles (user_id),
    CONSTRAINT fk_job_posts_category FOREIGN KEY (category_id) REFERENCES job_categories (id),
    CONSTRAINT fk_job_posts_province FOREIGN KEY (province_id) REFERENCES provinces (id),
    CONSTRAINT fk_job_posts_district FOREIGN KEY (district_id) REFERENCES districts (id),
    CONSTRAINT fk_job_posts_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
    CONSTRAINT ck_job_work_mode CHECK (work_mode IN ('ONSITE','REMOTE','HYBRID')),
    CONSTRAINT ck_job_salary_type CHECK (salary_type IN ('HOURLY','DAILY','WEEKLY','MONTHLY','PER_TASK','NEGOTIABLE')),
    CONSTRAINT ck_job_status CHECK (status IN ('DRAFT','PENDING_REVIEW','REJECTED','OPEN','FILLED',
                                               'IN_PROGRESS','COMPLETED','CLOSED','CANCELLED')),
    CONSTRAINT ck_job_salary_nonneg  CHECK (salary_min >= 0 AND salary_max >= 0),
    CONSTRAINT ck_job_salary_range   CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min),
    CONSTRAINT ck_job_salary_present CHECK (salary_type = 'NEGOTIABLE' OR salary_min IS NOT NULL),
    CONSTRAINT ck_job_positions      CHECK (positions_count > 0 AND positions_filled >= 0 AND positions_filled <= positions_count),
    CONSTRAINT ck_job_dates          CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB;

CREATE TABLE job_post_skills (
    job_post_id BIGINT NOT NULL,
    skill_id    INT    NOT NULL,
    PRIMARY KEY (job_post_id, skill_id),
    KEY idx_job_post_skills_skill (skill_id),
    CONSTRAINT fk_job_post_skills_job   FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_job_post_skills_skill FOREIGN KEY (skill_id)    REFERENCES skills (id)
) ENGINE=InnoDB;

-- Lịch làm việc theo tuần của 1 tin (VD: T2, T4 18:00-22:00)
CREATE TABLE job_post_schedules (
    id          BIGINT   NOT NULL AUTO_INCREMENT,
    job_post_id BIGINT   NOT NULL,
    day_of_week SMALLINT NOT NULL,                       -- 1=Thứ 2 ... 7=CN
    start_time  TIME     NOT NULL,
    end_time    TIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_job_post_schedules_job (job_post_id),
    CONSTRAINT fk_job_post_schedules_job FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE CASCADE,
    CONSTRAINT ck_schedule_day  CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_schedule_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

CREATE TABLE saved_jobs (
    student_id  BIGINT      NOT NULL,
    job_post_id BIGINT      NOT NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (student_id, job_post_id),
    CONSTRAINT fk_saved_jobs_student FOREIGN KEY (student_id)  REFERENCES student_profiles (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_jobs_job     FOREIGN KEY (job_post_id) REFERENCES job_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. NHÓM ỨNG TUYỂN & THỰC HIỆN CÔNG VIỆC
-- ---------------------------------------------------------------------
CREATE TABLE applications (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    job_post_id     BIGINT        NOT NULL,
    student_id      BIGINT        NOT NULL,
    resume_id       BIGINT        NULL,
    cover_letter    TEXT          NULL,
    expected_salary DECIMAL(12,0) NULL,
    status          VARCHAR(12)   NOT NULL DEFAULT 'PENDING',
    employer_note   VARCHAR(500)  NULL,
    reject_reason   VARCHAR(500)  NULL,
    applied_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reviewed_at     DATETIME(6)   NULL,
    decided_at      DATETIME(6)   NULL,
    updated_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_application_once (job_post_id, student_id),   -- 1 SV chỉ ứng tuyển 1 lần / tin
    KEY idx_applications_job     (job_post_id, status),
    KEY idx_applications_student (student_id, status, applied_at),
    CONSTRAINT fk_applications_job     FOREIGN KEY (job_post_id) REFERENCES job_posts (id),
    CONSTRAINT fk_applications_student FOREIGN KEY (student_id)  REFERENCES student_profiles (user_id),
    CONSTRAINT fk_applications_resume  FOREIGN KEY (resume_id)   REFERENCES student_resumes (id) ON DELETE SET NULL,
    CONSTRAINT ck_application_status CHECK (status IN ('PENDING','VIEWED','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN')),
    CONSTRAINT ck_application_salary CHECK (expected_salary IS NULL OR expected_salary >= 0)
) ENGINE=InnoDB;

CREATE TABLE application_status_history (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    application_id BIGINT       NOT NULL,
    from_status    VARCHAR(12)  NULL,
    to_status      VARCHAR(12)  NOT NULL,
    changed_by     BIGINT       NULL,
    note           VARCHAR(500) NULL,
    changed_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_app_history_app (application_id, changed_at),
    CONSTRAINT fk_app_history_app FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
    CONSTRAINT fk_app_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- Công việc thực tế phát sinh sau khi đơn ứng tuyển được ACCEPTED
CREATE TABLE work_assignments (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    application_id        BIGINT       NOT NULL,
    job_post_id           BIGINT       NOT NULL,
    student_id            BIGINT       NOT NULL,
    employer_id           BIGINT       NOT NULL,
    status                VARCHAR(12)  NOT NULL DEFAULT 'ONGOING',
    started_at            DATETIME(6)  NULL,
    ended_at              DATETIME(6)  NULL,
    employer_confirmed_at DATETIME(6)  NULL,             -- NTD xác nhận hoàn thành
    student_confirmed_at  DATETIME(6)  NULL,             -- SV xác nhận hoàn thành
    cancel_reason         VARCHAR(500) NULL,
    cancelled_by          BIGINT       NULL,
    created_at            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_assignments_application (application_id),
    KEY idx_assignments_student  (student_id, status),
    KEY idx_assignments_employer (employer_id, status),
    KEY idx_assignments_job      (job_post_id),
    CONSTRAINT fk_assignments_application FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT fk_assignments_job         FOREIGN KEY (job_post_id)    REFERENCES job_posts (id),
    CONSTRAINT fk_assignments_student     FOREIGN KEY (student_id)     REFERENCES student_profiles (user_id),
    CONSTRAINT fk_assignments_employer    FOREIGN KEY (employer_id)    REFERENCES employer_profiles (user_id),
    CONSTRAINT fk_assignments_cancelled   FOREIGN KEY (cancelled_by)   REFERENCES users (id),
    CONSTRAINT ck_assignment_status CHECK (status IN ('ONGOING','COMPLETED','CANCELLED'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. NHÓM ĐÁNH GIÁ
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    assignment_id BIGINT        NOT NULL,
    reviewer_id   BIGINT        NOT NULL,
    reviewee_id   BIGINT        NOT NULL,
    reviewer_role VARCHAR(10)   NOT NULL,
    rating        SMALLINT      NOT NULL,
    comment       VARCHAR(1000) NULL,
    is_visible    BOOLEAN       NOT NULL DEFAULT TRUE,   -- admin có thể ẩn đánh giá vi phạm
    created_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_review_once (assignment_id, reviewer_id),
    KEY idx_reviews_reviewee (reviewee_id, is_visible),
    CONSTRAINT fk_reviews_assignment FOREIGN KEY (assignment_id) REFERENCES work_assignments (id),
    CONSTRAINT fk_reviews_reviewer   FOREIGN KEY (reviewer_id)   REFERENCES users (id),
    CONSTRAINT fk_reviews_reviewee   FOREIGN KEY (reviewee_id)   REFERENCES users (id),
    CONSTRAINT ck_review_role     CHECK (reviewer_role IN ('STUDENT','EMPLOYER')),
    CONSTRAINT ck_review_rating   CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_review_not_self CHECK (reviewer_id <> reviewee_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. THÔNG BÁO, BÁO CÁO VI PHẠM, NHẬT KÝ HỆ THỐNG
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    type       VARCHAR(40)  NOT NULL,       -- APPLICATION_SUBMITTED, APPLICATION_ACCEPTED, JOB_APPROVED...
    title      VARCHAR(150) NOT NULL,
    content    VARCHAR(500) NULL,
    ref_type   VARCHAR(30)  NULL,           -- JOB_POST | APPLICATION | ASSIGNMENT | REVIEW
    ref_id     BIGINT       NULL,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at    DATETIME(6)  NULL,
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_notifications_user (user_id, is_read, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reports (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    reporter_id     BIGINT        NOT NULL,
    target_type     VARCHAR(10)   NOT NULL,
    target_id       BIGINT        NOT NULL,
    reason          VARCHAR(30)   NOT NULL,
    description     VARCHAR(1000) NULL,
    status          VARCHAR(10)   NOT NULL DEFAULT 'OPEN',
    handled_by      BIGINT        NULL,
    handled_at      DATETIME(6)   NULL,
    resolution_note VARCHAR(500)  NULL,
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_reports_status (status, created_at),
    KEY idx_reports_target (target_type, target_id),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
    CONSTRAINT fk_reports_handler  FOREIGN KEY (handled_by)  REFERENCES users (id),
    CONSTRAINT ck_report_target CHECK (target_type IN ('JOB_POST','USER','REVIEW')),
    CONSTRAINT ck_report_reason CHECK (reason IN ('SPAM','SCAM','INAPPROPRIATE','FAKE_INFO','OTHER')),
    CONSTRAINT ck_report_status CHECK (status IN ('OPEN','RESOLVED','DISMISSED'))
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    actor_id    BIGINT       NULL,
    action      VARCHAR(50)  NOT NULL,      -- LOGIN, JOB_APPROVE, USER_LOCK...
    entity_type VARCHAR(30)  NULL,
    entity_id   BIGINT       NULL,
    old_data    JSON         NULL,
    new_data    JSON         NULL,
    ip_address  VARCHAR(45)  NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_audit_actor  (actor_id, created_at),
    KEY idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 8. TRIGGER CẬP NHẬT ĐIỂM ĐÁNH GIÁ TRUNG BÌNH
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE sp_refresh_rating(IN p_user BIGINT)
BEGIN
    DECLARE v_avg DECIMAL(3,2);
    DECLARE v_cnt INT;

    SELECT COALESCE(ROUND(AVG(rating), 2), 0), COUNT(*)
      INTO v_avg, v_cnt
      FROM reviews
     WHERE reviewee_id = p_user AND is_visible = 1;

    UPDATE student_profiles  SET avg_rating = v_avg, rating_count = v_cnt WHERE user_id = p_user;
    UPDATE employer_profiles SET avg_rating = v_avg, rating_count = v_cnt WHERE user_id = p_user;
END$$

CREATE TRIGGER trg_reviews_ai AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    CALL sp_refresh_rating(NEW.reviewee_id);
END$$

CREATE TRIGGER trg_reviews_au AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    CALL sp_refresh_rating(NEW.reviewee_id);
    IF OLD.reviewee_id <> NEW.reviewee_id THEN
        CALL sp_refresh_rating(OLD.reviewee_id);
    END IF;
END$$

CREATE TRIGGER trg_reviews_ad AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    CALL sp_refresh_rating(OLD.reviewee_id);
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 9. VIEW HỖ TRỢ TRUY VẤN
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------