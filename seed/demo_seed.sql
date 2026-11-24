-- =====================================================================
-- VieJob Marketplace — DỮ LIỆU DEMO HOÀN CHỈNH (app product thật)
-- =====================================================================
--
-- Mục đích
--   Nạp một bộ dữ liệu "như đã vận hành thật" để:
--     1. Quay video demo có số liệu đẹp, đủ màn hình, đủ trạng thái.
--     2. Có dữ liệu sạch để chụp lại nhiều lần.
--
-- Chạy bằng
--     ./seed/seed-demo.sh
-- (KHÔNG chạy tự động khi dev — chỉ chạy khi bạn muốn.)
--
-- ---------------------------------------------------------------------
-- NGUYÊN TẮC
-- ---------------------------------------------------------------------
--   1. IDEMPOTENT
--      Chạy lại bao nhiêu lần cũng cho cùng kết quả: file này XOÁ toàn
--      bộ dữ liệu demo cũ (theo prefix slug `demo-` + email domain
--      `viejob.demo`) rồi nạp lại từ đầu.
--
--   2. KHÔNG ĐỤNG DỮ LIỆU THẬT
--      Mọi bản ghi demo đều nhận diện được:
--        - slug bắt đầu bằng `demo-` (job, application, review, ...)
--        - hoặc email kết thúc bằng `@viejob.demo`
--        - hoặc thuộc bộ user id 1000..1999
--      Xoá theo nguyên tắc này → không đụng dữ liệu của người dùng thật.
--
--   3. ID TÁCH VÙNG
--      Mọi id nằm trong khoảng 1000+ để không đụng dữ liệu seed sẵn có
--      của Flyway (V3/V7/V9 — id 1..52). Demo có thể chạy song song với
--      dữ liệu cũ mà vẫn nhìn ra ranh giới rõ ràng.
--
--   4. MASTER DATA DO FLYWAY LO
--      Tỉnh / xã / nhóm việc / vị trí / kỹ năng đã có sẵn trong DB sau khi
--      migrate. File này chỉ THAM CHIẾU (theo `code` / `slug`), không tạo
--      lại — nên seed chạy trên DB nào cũng đúng.
--
--   5. MẬT KHẨU THẬT
--      Dùng BCrypt cost=10 (khớp `BCryptPasswordEncoder(10)` trong
--      `ApplicationConfig`). Không dùng marker 'SEED_PENDING' như V3 vì
--      file này phải chạy độc lập, không phụ thuộc app khởi động.
--
-- ---------------------------------------------------------------------
-- CẤU TRÚC
-- ---------------------------------------------------------------------
--   0. Vệ sinh dữ liệu demo cũ
--   1. Người dùng (12 SV · 8 NTD · 1 Admin)
--   2. Hồ sơ sinh viên + kỹ năng + kinh nghiệm + mục tiêu việc làm
--   3. Hồ sơ nhà tuyển dụng
--   4. Tin tuyển dụng (40 tin — đủ mọi nhóm việc, tỉnh, trạng thái)
--   5. Ca làm việc
--   6. Kỹ năng của tin tuyển dụng
--   7. Đơn ứng tuyển (đủ 6 trạng thái) + timeline
--   8. Kinh nghiệm làm việc (work_assignments)
--   9. Đánh giá 2 chiều (kèm phản hồi 2 bên)
--  10. Tin đã lưu
--  11. Thông báo
--  12. Báo cáo vi phạm (admin xử lý được)
--  13. Nhật ký hệ thống (audit log) — cho dashboard admin có số liệu
--  14. Xếp hạng lương (salary benchmarks) theo ngành × tỉnh
--  15. Tùy chọn thông báo tin tuyển dụng
--
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET @now := '2026-11-23 09:00:00';

-- =====================================================================
-- 0. VỆ SINH DỮ LIỆU DEMO CŨ
-- =====================================================================
-- Xoá theo thứ tự ngược phụ thuộc để không vướng FK.
--
-- MỐC NHẬN DIỆN "LÀ DỮ LIỆU DEMO":
--   - id nằm trong khoảng 1000..1999 (dữ liệu do file này tạo ra)
--   - email kết thúc bằng `@viejob.demo`
--   - slug bắt đầu bằng `demo-`
--   - HOẶC: là bản ghi seed cũ của Flyway V3/V7/V9 (dùng để trả DB về
--     trạng thái "chỉ có dữ liệu demo" → app trông như đã vận hành thật).
--
-- Lưu ý quan trọng:
--   Migration Flyway V3/V7/V9 cũng seed sẵn dữ liệu demo (email
--   `student@viejob.vn`, `employer@viejob.vn`, `admin@viejob.vn`...). File này
--   dùng CHÍNH 3 email đó cho 3 tài khoản chính (để video demo đăng nhập
--   được theo tài khoản quen thuộc). Vì vậy bước vệ sinh phải xoá cả bản
--   ghi seed cũ trước, nếu không sẽ đụng UNIQUE `uq_users_active_email`.
--
--   → Hệ quả: sau khi chạy `seed-demo.sh`, DB sẽ KHÔNG còn dữ liệu seed
--     gốc của Flyway V3/V7/V9. Đây là chủ ý — để khi quay video, mọi con
--     số đều nhất quán trong 1 câu chuyện.
--     Muốn đưa DB về trạng thái gốc: `./dev.sh reset` (xoá volume MySQL).

-- --- 0.1. Xoá bản ghi demo do Flyway V3/V7/V9 tạo (id < 1000) ---
DELETE FROM notifications         WHERE user_id < 1000;
DELETE FROM reviews               WHERE slug LIKE 'rev-%';
DELETE FROM work_assignments       WHERE id < 1000;
DELETE FROM application_status_history WHERE application_id IN (
        SELECT id FROM applications WHERE id < 1000);
DELETE FROM applications          WHERE id < 1000;
DELETE FROM saved_jobs            WHERE id < 1000;
DELETE FROM job_post_skills       WHERE job_post_id IN (
        SELECT id FROM job_posts WHERE id < 1000);
DELETE FROM job_post_schedules    WHERE job_post_id IN (
        SELECT id FROM job_posts WHERE id < 1000);
DELETE FROM job_posts             WHERE id < 1000;
DELETE FROM student_job_preferences WHERE student_id < 1000;
DELETE FROM student_experiences    WHERE student_id < 1000;
DELETE FROM student_skills         WHERE student_id < 1000;
DELETE FROM student_resumes        WHERE student_id < 1000;
DELETE FROM student_profiles       WHERE user_id < 1000;
DELETE FROM employer_profiles      WHERE user_id < 1000;
DELETE FROM job_notify_preferences WHERE user_id < 1000;
DELETE FROM salary_benchmarks      WHERE id < 1000;
DELETE FROM audit_logs             WHERE actor_id < 1000;
DELETE FROM reports                WHERE reporter_id < 1000;
DELETE FROM refresh_tokens         WHERE user_id < 1000;
DELETE FROM user_tokens            WHERE user_id < 1000;
DELETE FROM users                  WHERE id < 1000;

-- --- 0.2. Xoá bản ghi demo từ lần chạy trước của file này ---
DELETE FROM notifications         WHERE user_id BETWEEN 1000 AND 1999;DELETE FROM reviews               WHERE reviewer_id BETWEEN 1000 AND 1999
                                    OR reviewee_id BETWEEN 1000 AND 1999
                                    OR slug LIKE 'demo-%';
DELETE FROM work_assignments       WHERE student_id BETWEEN 1000 AND 1999
                                    OR employer_id BETWEEN 1000 AND 1999
                                    OR slug LIKE 'demo-%';
DELETE FROM application_status_history WHERE application_id IN (
        SELECT id FROM applications WHERE student_id BETWEEN 1000 AND 1999
                                          OR job_post_id BETWEEN 1000 AND 1999);
DELETE FROM applications          WHERE student_id BETWEEN 1000 AND 1999
                                    OR job_post_id BETWEEN 1000 AND 1999
                                    OR slug LIKE 'demo-%';
DELETE FROM saved_jobs            WHERE student_id BETWEEN 1000 AND 1999
                                    OR job_post_id BETWEEN 1000 AND 1999
                                    OR slug LIKE 'demo-%';
DELETE FROM job_post_skills       WHERE job_post_id BETWEEN 1000 AND 1999;
DELETE FROM job_post_schedules    WHERE job_post_id BETWEEN 1000 AND 1999;
DELETE FROM job_posts             WHERE id BETWEEN 1000 AND 1999
                                    OR slug LIKE 'demo-%'
                                    OR employer_id BETWEEN 1000 AND 1999;
DELETE FROM student_job_preferences WHERE student_id BETWEEN 1000 AND 1999;
DELETE FROM student_experiences    WHERE student_id BETWEEN 1000 AND 1999;
DELETE FROM student_skills         WHERE student_id BETWEEN 1000 AND 1999;
DELETE FROM student_resumes        WHERE student_id BETWEEN 1000 AND 1999;
DELETE FROM student_profiles       WHERE user_id BETWEEN 1000 AND 1999;
DELETE FROM employer_profiles      WHERE user_id BETWEEN 1000 AND 1999;
DELETE FROM job_notify_preferences WHERE user_id BETWEEN 1000 AND 1999;
DELETE FROM audit_logs             WHERE actor_id BETWEEN 1000 AND 1999;
DELETE FROM reports                WHERE reporter_id BETWEEN 1000 AND 1999;
DELETE FROM refresh_tokens         WHERE user_id BETWEEN 1000 AND 1999;
DELETE FROM user_tokens            WHERE user_id BETWEEN 1000 AND 1999;
DELETE FROM users                  WHERE id BETWEEN 1000 AND 1999
                                    OR email LIKE '%@viejob.demo';

-- --- 0.2b. Dọn dữ liệu rác sinh ra khi THỬ nghiệm trên app ---
-- Khi bấm nút "ứng tuyển" / "tạo tin" trong lúc test, app sinh ra các
-- bản ghi có slug ngẫu nhiên (vd. `job-689bce5a-1aa`, `app-951b53ea-...`)
-- và id nằm ngoài dải demo (vd. 1049, 1126). Dải này XOÁ HẾT để DB luôn
-- sạch đúng như lúc vừa seed xong — không lẻn dữ liệu test vào video.
DELETE FROM notifications         WHERE slug NOT LIKE 'demo-%' AND id >= 1000;
DELETE FROM reviews               WHERE slug NOT LIKE 'demo-%' AND id >= 1000;
DELETE FROM work_assignments       WHERE slug NOT LIKE 'demo-%' AND id >= 1000;
DELETE FROM application_status_history WHERE application_id IN (
        SELECT id FROM applications WHERE slug NOT LIKE 'demo-%');
DELETE FROM applications          WHERE slug NOT LIKE 'demo-%' AND id >= 1000;
DELETE FROM saved_jobs            WHERE slug NOT LIKE 'demo-%' AND id >= 1000;
DELETE FROM job_post_skills       WHERE job_post_id IN (
        SELECT id FROM job_posts WHERE slug NOT LIKE 'demo-%');
DELETE FROM job_post_schedules    WHERE job_post_id IN (
        SELECT id FROM job_posts WHERE slug NOT LIKE 'demo-%');
DELETE FROM job_posts             WHERE slug NOT LIKE 'demo-%' AND id >= 1000;

-- --- 0.3. Dọn AUTO_INCREMENT cho gọn ---
ALTER TABLE users            AUTO_INCREMENT = 1000;
ALTER TABLE job_posts        AUTO_INCREMENT = 1000;
ALTER TABLE applications     AUTO_INCREMENT = 1100;
ALTER TABLE work_assignments AUTO_INCREMENT = 1200;
ALTER TABLE reviews          AUTO_INCREMENT = 1300;
ALTER TABLE saved_jobs       AUTO_INCREMENT = 1400;
ALTER TABLE notifications    AUTO_INCREMENT = 1500;
ALTER TABLE reports          AUTO_INCREMENT = 1600;
ALTER TABLE audit_logs       AUTO_INCREMENT = 1700;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. NGƯỜI DÙNG
-- =====================================================================
-- Mật khẩu (BCrypt cost 10):
--   Sinh viên    -> Student@123
--   Nhà tuyển dụng -> Employer@123
--   Quản trị viên  -> Admin@123
--
-- 1001 = sinh viên chính (dùng cho video demo)
-- 1002 = nhà tuyển dụng chính (dùng cho video demo)
-- 1003 = quản trị viên
-- 1010..1021 = 12 sinh viên
-- 1100..1107 = 8 nhà tuyển dụng

INSERT INTO users (id, email, password_hash, role_id, status, email_verified_at, auth_provider, failed_login_count, last_login_at, created_at, updated_at) VALUES
  -- --- 3 tài khoản chính (dùng cho quay demo) ---
  (1001, 'student@viejob.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-06-02 09:00:00', 'LOCAL', 0, '2026-11-22 20:12:00', '2026-06-02 09:00:00', '2026-06-02 09:00:00'),
  (1002, 'employer@viejob.vn',     '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-04-11 09:00:00', 'LOCAL', 0, '2026-11-22 19:40:00', '2026-04-11 09:00:00', '2026-04-11 09:00:00'),
  (1003, 'admin@viejob.vn',        '$2a$10$Fh2T.UIDccPxz5ccUrY1MenOjTVw2603xCHnGeLD2TL7VtDQAc5bS', 3, 'ACTIVE', '2026-01-05 09:00:00', 'LOCAL', 0, '2026-11-22 18:05:00', '2026-01-05 09:00:00', '2026-01-05 09:00:00'),

  -- --- 12 sinh viên ---
  (1010, 'hoa.nguyen@sv.edu.vn',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-06-18 09:00:00', 'LOCAL', 0, '2026-11-21 08:30:00', '2026-06-18 09:00:00', '2026-06-18 09:00:00'),
  (1011, 'binh.pham@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-02 09:00:00', 'LOCAL', 0, '2026-11-20 21:15:00', '2026-07-02 09:00:00', '2026-07-02 09:00:00'),
  (1012, 'linh.pham@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-19 09:00:00', 'LOCAL', 0, '2026-11-21 12:44:00', '2026-07-19 09:00:00', '2026-07-19 09:00:00'),
  (1013, 'son.tran@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-05 09:00:00', 'LOCAL', 0, '2026-11-19 17:22:00', '2026-08-05 09:00:00', '2026-08-05 09:00:00'),
  (1014, 'mai.le@sv.edu.vn',       '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-14 09:00:00', 'LOCAL', 0, '2026-11-22 07:50:00', '2026-08-14 09:00:00', '2026-08-14 09:00:00'),
  (1015, 'quang.co@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-28 09:00:00', 'LOCAL', 0, '2026-11-18 10:05:00', '2026-08-28 09:00:00', '2026-08-28 09:00:00'),
  (1016, 'thao.nguyen@sv.edu.vn',  '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-08 09:00:00', 'LOCAL', 0, '2026-11-17 19:30:00', '2026-09-08 09:00:00', '2026-09-08 09:00:00'),
  (1017, 'duc.huynh@sv.edu.vn',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-21 09:00:00', 'LOCAL', 0, '2026-11-21 15:38:00', '2026-09-21 09:00:00', '2026-09-21 09:00:00'),
  (1018, 'an.do@sv.edu.vn',        '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-03 09:00:00', 'LOCAL', 0, '2026-11-16 09:12:00', '2026-10-03 09:00:00', '2026-10-03 09:00:00'),
  (1019, 'ngan.vo@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-15 09:00:00', 'LOCAL', 0, '2026-11-22 08:00:00', '2026-10-15 09:00:00', '2026-10-15 09:00:00'),
  (1020, 'tu.an@viejob.demo',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-24 09:00:00', 'LOCAL', 0, '2026-11-19 13:26:00', '2026-10-24 09:00:00', '2026-10-24 09:00:00'),
  (1021, 'khoa.bui@viejob.demo',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'PENDING_VERIFY', NULL, 'LOCAL', 0, NULL, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),

  -- --- 8 nhà tuyển dụng ---
  (1100, 'quan.lym@viejob.demo',   '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-03-12 09:00:00', 'LOCAL', 0, '2026-11-22 18:45:00', '2026-03-12 09:00:00', '2026-03-12 09:00:00'),
  (1101, 'kim.phat@viejob.demo',   '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-04-02 09:00:00', 'LOCAL', 0, '2026-11-21 16:20:00', '2026-04-02 09:00:00', '2026-04-02 09:00:00'),
  (1102, 'tao.tao@viejob.demo',    '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-04-20 09:00:00', 'LOCAL', 0, '2026-11-20 11:05:00', '2026-04-20 09:00:00', '2026-04-20 09:00:00'),
  (1103, 'banh.chao@viejob.demo',  '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-05-09 09:00:00', 'LOCAL', 0, '2026-11-22 09:14:00', '2026-05-09 09:00:00', '2026-05-09 09:00:00'),
  (1104, 'fozu@viejob.demo',       '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-05-27 09:00:00', 'LOCAL', 0, '2026-11-19 14:52:00', '2026-05-27 09:00:00', '2026-05-27 09:00:00'),
  (1105, 'cozy.breakfast@viejob.demo', '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-06-14 09:00:00', 'LOCAL', 0, '2026-11-21 20:33:00', '2026-06-14 09:00:00', '2026-06-14 09:00:00'),
  (1106, 'in.hospitality@viejob.demo', '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-07-01 09:00:00', 'LOCAL', 0, '2026-11-18 10:41:00', '2026-07-01 09:00:00', '2026-07-01 09:00:00'),
  (1107, 'koi.the@viejob.demo',    '$2a$10$oHlNjQZYg9xRnPu6CeNqmupz4wZ3fw5K69EB6K5o2WDIKiQcLgQUO', 2, 'ACTIVE', '2026-07-22 09:00:00', 'LOCAL', 0, '2026-11-17 08:26:00', '2026-07-22 09:00:00', '2026-07-22 09:00:00');

-- =====================================================================
-- 2. HỒ SƠ SINH VIÊN
-- =====================================================================
-- `province_id` tham chiếu `provinces.id` (nội bộ): 1=HCM, 2=Hà Nội,
-- 3=Đà Nẵng, 4=Cần Thơ, 5=Đồng Nai, 6=Đắk Lắk.
-- `skills` là JSON mảng slug kỹ năng (theo `skills.slug`).

INSERT INTO student_profiles (user_id, slug, full_name, phone, date_of_birth, gender, student_code, university, major, year_of_study, province_id, address, bio, avatar_url, cv_url, skills, avg_rating, rating_count, created_at, updated_at) VALUES
  (1001, 'demo-stu-001', 'Nguyễn Thanh Hà', '0901 234 567', '2003-05-12', 'FEMALE', 'SE2001', 'Đại học Bách Khoa TP.HCM', 'Quản trị Kinh doanh', 3, 1, 'Khu đô thị Đại học Quốc Gia, Thủ Đức, TP.HCM', 'Sinh viên năm 3 ngành Quản trị Kinh doanh, có 1 năm kinh nghiệm phục vụ quán cà phê. Tìm việc làm thêm buổi tối hoặc cuối tuần, làm việc chăm chỉ và có tinh thần phục vụ khách hàng.', NULL, NULL, '["sk-service","sk-barista","sk-excel"]', 4.8, 5, '2026-06-02 09:00:00', '2026-06-02 09:00:00'),
  (1010, 'demo-stu-002', 'Nguyễn Thị Hoa', '0934 567 890', '2002-11-03', 'FEMALE', 'SE2002', 'Đại học Kinh tế TP.HCM', 'Marketing', 4, 1, 'Phường Bình Thạnh, TP. Hồ Chí Minh', 'Yêu thích content và social media, từng làm freelancer cho nhiều thương hiệu nhỏ. Có kinh nghiệm quản lý fanpage và thiết kế nội dung bán hàng.', NULL, NULL, '["sk-content","sk-excel","sk-seo"]', 4.5, 2, '2026-06-18 09:00:00', '2026-06-18 09:00:00'),
  (1011, 'demo-stu-003', 'Phạm Đức Bình', '0945 678 901', '2003-09-18', 'MALE', 'SE2101', 'Đại học FPT TP.HCM', 'Kỹ thuật Phần mềm', 3, 1, 'Phường Thủ Đức, TP. Hồ Chí Minh', 'Sinh viên CNTT biết React và TypeScript, muốn thực tập frontend để hoàn thiện portfolio cá nhân.', NULL, NULL, '["sk-react","sk-manual-test","sk-excel"]', 5.00, 1, '2026-07-02 09:00:00', '2026-07-02 09:00:00'),
  (1012, 'demo-stu-004', 'Phạm Ngọc Linh', '0956 789 012', '2004-02-25', 'FEMALE', 'SE2205', 'Đại học Sư phạm Kỹ thuật Hà Nội', 'Sư phạm Toán', 2, 2, 'Phường Cầu Giấy, Hà Nội', 'Sinh viên Sư phạm Toán, có 3 năm gia sư cấp THPT. Lịch học buổi chiều và tối nên phù hợp việc dạy online hoặc tại nhà.', NULL, NULL, '["sk-teaching","sk-translate"]', 4.7, 3, '2026-07-19 09:00:00', '2026-07-19 09:00:00'),
  (1013, 'demo-stu-005', 'Trần Đức Sơn', '0967 890 123', '2002-07-07', 'MALE', 'SE1908', 'Đại học Bách Khoa TP.HCM', 'Cơ khí', 4, 1, 'Phường Gò Vấp, TP. Hồ Chí Minh', 'Có xe máy và CCCD gắn chip, từng giao hàng cho quán cà phê trong khuôn viên trường. Sẵn sàng làm ca sáng lúc 5h.', NULL, NULL, '["sk-driver","sk-stock"]', 4.2, 2, '2026-08-05 09:00:00', '2026-08-05 09:00:00'),
  (1014, 'demo-stu-006', 'Lê Ngọc Mai', '0978 901 234', '2003-12-01', 'FEMALE', 'SE2009', 'Đại học Ngoại thương TP.HCM', 'Quản trị Kinh doanh', 3, 1, 'Phường Tân Định, Quận 1, TP. Hồ Chí Minh', 'Muốn làm thử ở cửa hàng để rèn kinh nghiệm bán hàng và dịch vụ khách hàng.', NULL, NULL, '["sk-service","sk-cashier"]', 4.4, 1, '2026-08-14 09:00:00', '2026-08-14 09:00:00'),
  (1015, 'demo-stu-007', 'Cao Văn Quang', '0908 111 222', '2003-03-08', 'MALE', 'SE2210', 'Đại học Điện lực TP.HCM', 'Kỹ thuật Điện', 3, 1, 'Phường Tân Bình, TP. Hồ Chí Minh', 'Sinh viên kỹ thuật điện, thích làm thêm kỹ thuật hỗ trợ và kiểm thử phần mềm.', NULL, NULL, '["sk-manual-test","sk-security"]', 4.1, 1, '2026-08-28 09:00:00', '2026-08-28 09:00:00'),
  (1016, 'demo-stu-008', 'Nguyễn Thu Thảo', '0911 222 333', '2003-06-19', 'FEMALE', 'SE2208', 'Trường Đại học Ngoại thương Hà Nội', 'Kinh tế quốc tế', 4, 2, 'Phường Đống Đa, Hà Nội', 'Có khả năng giao tiếp tiếng Anh tốt, từng làm part-time phiên dịch cho hội nghị nhỏ.', NULL, NULL, '["sk-translate","sk-content","sk-excel"]', 4.9, 4, '2026-09-08 09:00:00', '2026-09-08 09:00:00'),
  (1017, 'demo-stu-009', 'Huỳnh Đức Duy', '0922 333 444', '2004-01-30', 'MALE', 'SE2301', 'Đại học FPT Hà Nội', 'Kỹ thuật Phần mềm', 2, 2, 'Phường Thanh Xuân, Hà Nội', 'Sinh viên năm 2 ngành CNTT, biết lập trình web, tìm cơ hội làm remote để rèn kỹ năng.', NULL, NULL, '["sk-react","sk-design"]', 4.3, 1, '2026-09-21 09:00:00', '2026-09-21 09:00:00'),
  (1018, 'demo-stu-010', 'Đỗ Thanh An', '0933 444 555', '2003-08-22', 'FEMALE', 'SE2215', 'Đại học Kinh tế Đà Nẵng', 'Marketing', 3, 3, 'Phường Hải Châu, Đà Nẵng', 'Sinh viên Marketing tại Đà Nẵng, muốn tìm việc làm thêm để xây dựng portfolio trước khi ra trường.', NULL, NULL, '["sk-content","sk-seo","sk-pos","sk-teaching"]', 4.0, 1, '2026-10-03 09:00:00', '2026-10-03 09:00:00'),
  (1019, 'demo-stu-011', 'Võ Thị Ngân', '0944 555 666', '2002-05-14', 'FEMALE', 'SE1907', 'Đại học Cần Thơ', 'Kế toán', 4, 4, 'Phường Ninh Kiều, Cần Thơ', 'Sinh viên Kế toán năm 4, thành thạo Excel và phần mềm kế toán, tìm việc văn phòng part-time tại Cần Thơ.', NULL, NULL, '["sk-excel","sk-pos"]', 4.6, 2, '2026-10-15 09:00:00', '2026-10-15 09:00:00'),
  (1020, 'demo-stu-012', 'Bùi Minh Khoa', '0955 666 777', '2003-10-02', 'MALE', 'SE2212', 'Đại học Bình Dương', 'Quản trị Kinh doanh', 3, 5, 'Phường Suối Tiên, TP. Đồng Nai', 'Sinh viên gần khu công nghiệp, sẵn sàng làm ca khoảng giao hàng hoặc kho hàng.', NULL, NULL, '["sk-driver","sk-stock","sk-pos"]', 4.2, 1, '2026-10-24 09:00:00', '2026-10-24 09:00:00');

-- Kỹ năng của sinh viên (mức độ)
INSERT INTO student_skills (student_id, skill_id, level) VALUES
  (1001, 2, 'ADVANCED'), (1001, 1, 'INTERMEDIATE'), (1001, 7, 'BEGINNER'),
  (1010, 6, 'ADVANCED'), (1010, 14, 'INTERMEDIATE'), (1010, 7, 'INTERMEDIATE'),
  (1011, 15, 'ADVANCED'), (1011, 9, 'INTERMEDIATE'), (1011, 7, 'INTERMEDIATE'),
  (1012, 8, 'ADVANCED'), (1012, 12, 'INTERMEDIATE'),
  (1013, 5, 'ADVANCED'), (1013, 11, 'BEGINNER'),
  (1014, 2, 'INTERMEDIATE'), (1014, 4, 'INTERMEDIATE'),
  (1015, 9, 'INTERMEDIATE'), (1015, 16, 'BEGINNER'),
  (1016, 12, 'ADVANCED'), (1016, 6, 'INTERMEDIATE'), (1016, 7, 'ADVANCED'),
  (1017, 15, 'INTERMEDIATE'), (1017, 13, 'BEGINNER'),
  (1018, 6, 'INTERMEDIATE'), (1018, 14, 'BEGINNER'), (1018, 10, 'INTERMEDIATE'),
  (1019, 7, 'ADVANCED'), (1019, 10, 'INTERMEDIATE'),
  (1020, 5, 'INTERMEDIATE'), (1020, 11, 'BEGINNER'), (1020, 10, 'BEGINNER');

-- Kinh nghiệm làm việc tự khai (bảng student_experiences)
INSERT INTO student_experiences (student_id, company, position, start_date, end_date, description, sort_order) VALUES
  (1001, 'Tiệm Chè Táo Tào', 'Nhân viên phục vụ', '2025-06-01', '2025-09-30', 'Phục vụ khách, pha chè theo công thức, vệ sinh khu vực làm việc.', 1),
  (1001, 'Café_The_Space', 'Barista part-time', '2025-10-15', NULL, 'Pha cà phê máy, gọi món, làm việc ca tối 3 ca/tuần.', 2),
  (1010, 'Freelance content', 'Content freelancer', '2025-03-01', '2026-02-28', 'Viết nội dung mạng xã hội cho 3 thương hiệu mỹ phẩm, quản lý lịch đăng bài.', 1),
  (1012, 'Trung tâm Tương Tác', 'Trợ giảng Toán', '2024-09-01', '2025-06-30', 'Trợ giảng khóa Toán lớp 9-10, 4 buổi/tuần.', 1),
  (1013, 'GrabFood', 'Giao hàng thuê xe', '2025-05-01', '2025-11-30', 'Giao hàng khu vực Thủ Đức, giữ tỷ lệ hoàn thành cao.', 1),
  (1016, 'Hội nghị Việt Nam-Japan', 'Phiên dịch viên', '2025-08-01', '2025-08-30', 'Phiên dịch Anh - Việt cho hội nghị doanh nghiệp.', 1),
  (1019, 'Chuỗi siêu thị A', 'Nhân viên quầy thu ngân', '2024-12-01', '2025-08-31', 'Thu ngân ca tối, kiểm kê quỹ cuối ca.', 1);

-- Mục tiêu việc làm (student_job_preferences)
-- `province_ids` dùng MÃ TỈNH mới 2 chữ số (V12 đã chuẩn hoá): 79=HCM, 01=HN.
INSERT INTO student_job_preferences (student_id, category_ids, employment_types, province_ids, salary_min, salary_max) VALUES
  (1001, '["cat-fnb","cat-ban-tang"]',        '["PART_TIME","FLEXIBLE"]',        '["79"]',       25000,  45000),
  (1010, '["cat-marketing"]',                 '["PART_TIME","FLEXIBLE"]',        '["79","01"]',  30000,  60000),
  (1011, '["cat-cong-nghe"]',                 '["PART_TIME","FLEXIBLE","FULL_TIME"]', '["79"]', 40000,  90000),
  (1012, '["cat-day-hoc"]',                   '["FLEXIBLE","CASUAL"]',           '["01"]',       60000, 150000),
  (1013, '["cat-giao-hang"]',                 '["PART_TIME","CASUAL"]',          '["79"]',       20000,  35000),
  (1014, '["cat-ban-tang","cat-fnb"]',        '["PART_TIME"]',                   '["79"]',       25000,  40000),
  (1015, '["cat-cong-nghe"]',                 '["PART_TIME"]',                   '["79"]',       30000,  60000),
  (1016, '["cat-marketing","cat-day-hoc"]',   '["PART_TIME","FLEXIBLE"]',        '["01"]',       40000, 120000),
  (1017, '["cat-cong-nghe"]',                 '["PART_TIME","FLEXIBLE"]',        '["01"]',       35000,  70000),
  (1018, '["cat-marketing","cat-ban-tang"]',  '["PART_TIME","FLEXIBLE"]',        '["48"]',       30000,  55000),
  (1019, '["cat-van-phong","cat-ban-tang"]',  '["PART_TIME"]',                   '["92"]',       25000,  45000),
  (1020, '["cat-giao-hang","cat-ban-tang"]',  '["PART_TIME","CASUAL"]',          '["75"]',       22000,  38000);

-- =====================================================================
-- 2b. NHÓM SINH VIÊN BỔ SUNG (mở rộng quy mô)
-- =====================================================================
-- 28 sinh viên bổ sung (id 1022..1049) + hồ sơ + kỹ năng + mục tiêu.
--
-- VÌ SAO CẦN:
--   Mỗi sinh viên chỉ ứng tuyển được 1 lần cho mỗi tin (UNIQUE
--   `job_post_id + student_id`). Nếu chỉ có 12 SV thì mỗi tin tuyển dụng
--   chỉ có tối đa 12 ứng viên — và trên thực tế mỗi tin chỉ nhận được
--   1-3 đơn → con số "ứng viên" nhìn như tin MỚI MỞ, không giống app
--   đã vận hành lâu.
--
--   Mở rộng lên 40 SV cho phép mỗi tin có 2-6 ứng viên THẬT, và bộ đếm
--   `applicant_count` được tính lại từ dữ liệu (phần 16) → số trên UI
--   luôn khớp dữ liệu trong DB.
--
-- Nhóm theo tỉnh để hồ sơ nhất quán với tin tuyển dụng cùng tỉnh:
--   1022..1031 → TP.HCM (tỉnh 1) — phần lớn F&B, bán hàng, giao hàng
--   1032..1039 → Hà Nội (tỉnh 2) — văn phòng, dạy kèm, công nghệ
--   1040..1043 → Đà Nẵng / Cần Thơ (tỉnh 3, 4)
--   1044..1049 → Đồng Nai / Đắk Lắk (tỉnh 5, 6)

INSERT INTO users (id, email, password_hash, role_id, status, email_verified_at, auth_provider, failed_login_count, last_login_at, created_at, updated_at) VALUES
  (1022, 'son.binh@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-08 09:00:00', 'LOCAL', 0, '2026-11-22 10:15:00', '2026-07-08 09:00:00', '2026-07-08 09:00:00'),
  (1023, 'linh.tran@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-15 09:00:00', 'LOCAL', 0, '2026-11-21 18:40:00', '2026-07-15 09:00:00', '2026-07-15 09:00:00'),
  (1024, 'quang.nguyen@sv.edu.vn', '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-22 09:00:00', 'LOCAL', 0, '2026-11-22 08:20:00', '2026-07-22 09:00:00', '2026-07-22 09:00:00'),
  (1025, 'hoa.le@sv.edu.vn',       '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-07-29 09:00:00', 'LOCAL', 0, '2026-11-20 14:05:00', '2026-07-29 09:00:00', '2026-07-29 09:00:00'),
  (1026, 'nam.pham@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-05 09:00:00', 'LOCAL', 0, '2026-11-22 09:30:00', '2026-08-05 09:00:00', '2026-08-05 09:00:00'),
  (1027, 'thao.phuong@sv.edu.vn',  '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-12 09:00:00', 'LOCAL', 0, '2026-11-21 16:10:00', '2026-08-12 09:00:00', '2026-08-12 09:00:00'),
  (1028, 'dat.vo@sv.edu.vn',       '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-19 09:00:00', 'LOCAL', 0, '2026-11-19 11:25:00', '2026-08-19 09:00:00', '2026-08-19 09:00:00'),
  (1029, 'mai.do@sv.edu.vn',       '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-08-26 09:00:00', 'LOCAL', 0, '2026-11-22 12:45:00', '2026-08-26 09:00:00', '2026-08-26 09:00:00'),
  (1030, 'hieu.nguyen@sv.edu.vn',  '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-02 09:00:00', 'LOCAL', 0, '2026-11-21 07:50:00', '2026-09-02 09:00:00', '2026-09-02 09:00:00'),
  (1031, 'trang.bui@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-09 09:00:00', 'LOCAL', 0, '2026-11-20 20:15:00', '2026-09-09 09:00:00', '2026-09-09 09:00:00'),
  (1032, 'khang.tran@sv.edu.vn',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-16 09:00:00', 'LOCAL', 0, '2026-11-22 10:55:00', '2026-09-16 09:00:00', '2026-09-16 09:00:00'),
  (1033, 'linh.hoang@sv.edu.vn',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-23 09:00:00', 'LOCAL', 0, '2026-11-22 13:30:00', '2026-09-23 09:00:00', '2026-09-23 09:00:00'),
  (1034, 'quynh.lam@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-09-30 09:00:00', 'LOCAL', 0, '2026-11-21 09:05:00', '2026-09-30 09:00:00', '2026-09-30 09:00:00'),
  (1035, 'phuc.nguyen@sv.edu.vn',  '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-07 09:00:00', 'LOCAL', 0, '2026-11-22 15:20:00', '2026-10-07 09:00:00', '2026-10-07 09:00:00'),
  (1036, 'tu.dang@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-14 09:00:00', 'LOCAL', 0, '2026-11-19 22:05:00', '2026-10-14 09:00:00', '2026-10-14 09:00:00'),
  (1037, 'nhi.pham@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-21 09:00:00', 'LOCAL', 0, '2026-11-22 11:10:00', '2026-10-21 09:00:00', '2026-10-21 09:00:00'),
  (1038, 'long.bui@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-10-28 09:00:00', 'LOCAL', 0, '2026-11-20 17:40:00', '2026-10-28 09:00:00', '2026-10-28 09:00:00'),
  (1039, 'an.tran@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-04 09:00:00', 'LOCAL', 0, '2026-11-22 08:45:00', '2026-11-04 09:00:00', '2026-11-04 09:00:00'),
  (1040, 'my.tran@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-06 09:00:00', 'LOCAL', 0, '2026-11-21 14:35:00', '2026-11-06 09:00:00', '2026-11-06 09:00:00'),
  (1041, 'chi.dang@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-08 09:00:00', 'LOCAL', 0, '2026-11-22 14:00:00', '2026-11-08 09:00:00', '2026-11-08 09:00:00'),
  (1042, 'linh.dao@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-10 09:00:00', 'LOCAL', 0, '2026-11-20 10:20:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00'),
  (1043, 'nhat.hoang@sv.edu.vn',   '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-12 09:00:00', 'LOCAL', 0, '2026-11-21 19:50:00', '2026-11-12 09:00:00', '2026-11-12 09:00:00'),
  (1044, 'vinh.le@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-14 09:00:00', 'LOCAL', 0, '2026-11-22 16:15:00', '2026-11-14 09:00:00', '2026-11-14 09:00:00'),
  (1045, 'phuong.hung@sv.edu.vn',  '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-16 09:00:00', 'LOCAL', 0, '2026-11-19 12:30:00', '2026-11-16 09:00:00', '2026-11-16 09:00:00'),
  (1046, 'tuan.do@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-18 09:00:00', 'LOCAL', 0, '2026-11-22 17:05:00', '2026-11-18 09:00:00', '2026-11-18 09:00:00'),
  (1047, 'minh.tran@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-19 09:00:00', 'LOCAL', 0, '2026-11-21 15:20:00', '2026-11-19 09:00:00', '2026-11-19 09:00:00'),
  (1048, 'yen.tran@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-20 09:00:00', 'LOCAL', 0, '2026-11-22 09:10:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00'),
  (1049, 'bach.pham@sv.edu.vn',    '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'PENDING_VERIFY', NULL, 'LOCAL', 0, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00'),
  (1050, 'anh.vu@sv.edu.vn',       '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-23 09:00:00', 'LOCAL', 0, '2026-11-23 10:20:00', '2026-11-23 09:00:00', '2026-11-23 09:00:00'),
  (1051, 'phong.do@sv.edu.vn',     '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-23 09:00:00', 'LOCAL', 0, '2026-11-23 11:05:00', '2026-11-23 09:00:00', '2026-11-23 09:00:00'),
  (1052, 'mai.anh@sv.edu.vn',      '$2a$10$08NLnpWj0qyCm6AtVPiltuPiVp8k90bwHVgHmB20kYVaGbOj/hZ1e', 1, 'ACTIVE', '2026-11-23 09:00:00', 'LOCAL', 0, '2026-11-23 12:10:00', '2026-11-23 09:00:00', '2026-11-23 09:00:00');

INSERT INTO student_profiles (user_id, slug, full_name, phone, date_of_birth, gender, student_code, university, major, year_of_study, province_id, address, bio, avatar_url, cv_url, skills, avg_rating, rating_count, created_at, updated_at) VALUES
  (1022, 'demo-stu-013', 'Bùi Ngọc Sơn', '0966 111 222', '2003-07-14', 'MALE', 'SE2221', 'Đại học Công Thương TP.HCM', 'Kế toán', 3, 1, 'Phường Tân Bình, TP. Hồ Chí Minh', 'Sinh viên Kế toán năm 3, thành thạo Excel và phần mềm kế toán, tìm việc quầy thu ngân ca tối.', NULL, NULL, '["sk-excel","sk-pos","sk-cashier"]', 0, 0, '2026-07-08 09:00:00', '2026-07-08 09:00:00'),
  (1023, 'demo-stu-014', 'Trần Ngọc Linh', '0966 222 333', '2004-04-21', 'FEMALE', 'SE2305', 'Đại học Khoa học Tự nhiên TP.HCM', 'Hóa học', 2, 1, 'Phường Bình Thạnh, TP. Hồ Chí Minh', 'Sinh viên năm 2 ngành Hóa học, từng bán bánh ngọt online và muốn làm thêm ca tối.', NULL, NULL, '["sk-cooking","sk-service","sk-barista"]', 0, 0, '2026-07-15 09:00:00', '2026-07-15 09:00:00'),
  (1024, 'demo-stu-015', 'Nguyễn Hữu Quang', '0966 333 444', '2002-12-09', 'MALE', 'SE1915', 'Đại học Bách Khoa TP.HCM', 'Cơ khí', 4, 1, 'Phường Gò Vấp, TP. Hồ Chí Minh', 'Sinh viên Cơ khí năm 4, có xe máy, sẵn sàng làm giao hàng hoặc kho hàng.', NULL, NULL, '["sk-driver","sk-stock"]', 0, 0, '2026-07-22 09:00:00', '2026-07-22 09:00:00'),
  (1025, 'demo-stu-016', 'Lê Thị Hoa', '0966 444 555', '2003-02-18', 'FEMALE', 'SE2225', 'Đại học Kinh tế TP.HCM', 'Marketing', 3, 1, 'Phường Tân Định, Quận 1, TP.HCM', 'Sinh viên Marketing năm 3, yêu thích livestream bán hàng và quản lý fanpage.', NULL, NULL, '["sk-content","sk-seo","sk-pos"]', 0, 0, '2026-07-29 09:00:00', '2026-07-29 09:00:00'),
  (1026, 'demo-stu-017', 'Phạm Văn Nam', '0966 555 666', '2002-09-30', 'MALE', 'SE1917', 'Đại học Giao thông Vận tải TP.HCM', 'Quản trị Vận tải', 4, 1, 'Phường Thủ Đức, TP. Hồ Chí Minh', 'Có xe máy và CCCD gắn chip, từng giao hàng thuê xe 8 tháng, quen địa ngữ Thủ Đức.', NULL, NULL, '["sk-driver","sk-stock"]', 0, 0, '2026-08-05 09:00:00', '2026-08-05 09:00:00'),
  (1027, 'demo-stu-018', 'Phương Ngọc Thảo', '0966 666 777', '2003-11-05', 'FEMALE', 'SE2230', 'Đại học Ngoại thương TP.HCM', 'Quản trị Kinh doanh', 3, 1, 'Phường Phú Nhuận, TP. Hồ Chí Minh', 'Sinh viên năm 3, từng làm lễ tân tư vấn bán hàng, muốn làm thêm ca tối.', NULL, NULL, '["sk-service","sk-pos","sk-excel","sk-cooking","sk-cashier"]', 0, 0, '2026-08-12 09:00:00', '2026-08-12 09:00:00'),
  (1028, 'demo-stu-019', 'Võ Tiến Đạt', '0966 777 888', '2004-01-22', 'MALE', 'SE2310', 'Đại học FPT TP.HCM', 'Kỹ thuật Phần mềm', 2, 1, 'Phường Thanh Xuân, TP. Hồ Chí Minh', 'Sinh viên CNTT năm 2, biết React cơ bản, tìm cơ hội làm remote.', NULL, NULL, '["sk-react","sk-design"]', 0, 0, '2026-08-19 09:00:00', '2026-08-19 09:00:00'),
  (1029, 'demo-stu-020', 'Đỗ Khánh Mai', '0966 888 999', '2003-05-16', 'FEMALE', 'SE2228', 'Đại học Sư phạm TP.HCM', 'Giáo dục Mầm non', 3, 1, 'Quận Gò Vấp, TP. Hồ Chí Minh', 'Sinh viên Sư phạm Mầm non, yêu thích trẻ con và muốn làm thêm ca sáng.', NULL, NULL, '["sk-teaching","sk-service","sk-barista","sk-cooking"]', 0, 0, '2026-08-26 09:00:00', '2026-08-26 09:00:00'),
  (1030, 'demo-stu-021', 'Nguyễn Quang Hiếu', '0966 999 000', '2002-06-27', 'MALE', 'SE1921', 'Đại học Công nghệ TP.HCM', 'Kỹ thuật Phần mềm', 3, 1, 'Phường Bình Thạnh, TP. Hồ Chí Minh', 'Sinh viên CNTT, từng làm kiểm thử phần mềm cho đồ án, biết viết test case.', NULL, NULL, '["sk-manual-test","sk-react","sk-security"]', 0, 0, '2026-09-02 09:00:00', '2026-09-02 09:00:00'),
  (1031, 'demo-stu-022', 'Bùi Thùy Trang', '0967 000 111', '2003-10-11', 'FEMALE', 'SE2222', 'Đại học Kinh tế TP.HCM', 'Marketing', 4, 1, 'Phường Đống Đa, TP. Hồ Chí Minh', 'Sinh viên Marketing năm 4, có kinh nghiệm thực tập content tại agency.', NULL, NULL, '["sk-content","sk-seo","sk-excel"]', 0, 0, '2026-09-09 09:00:00', '2026-09-09 09:00:00'),
  (1032, 'demo-stu-023', 'Trần Đình Khang', '0967 111 222', '2002-08-02', 'MALE', 'SE1923', 'Đại học Bách Khoa Hà Nội', 'Cơ khí', 4, 2, 'Phường Cầu Giấy, Hà Nội', 'Sinh viên Cơ khí Hà Nội, từng làm bảo vệ ca đêm và thủ kho kho hàng.', NULL, NULL, '["sk-stock","sk-driver"]', 0, 0, '2026-09-16 09:00:00', '2026-09-16 09:00:00'),
  (1033, 'demo-stu-024', 'Hoàng Thị Linh', '0967 222 333', '2003-12-19', 'FEMALE', 'SE2233', 'Đại học Ngoại thương Hà Nội', 'Kinh tế quốc tế', 3, 2, 'Phường Đống Đa, Hà Nội', 'Sinh viên Kinh tế quốc tế, phiên dịch được tiếng Anh trong hội nghị nhỏ.', NULL, NULL, '["sk-translate","sk-content","sk-service","sk-barista"]', 0, 0, '2026-09-23 09:00:00', '2026-09-23 09:00:00'),
  (1034, 'demo-stu-025', 'Lâm Thị Quỳnh', '0967 333 444', '2004-03-28', 'FEMALE', 'SE2310', 'Đại học Sư phạm Hà Nội', 'Sư phạm Toán', 2, 2, 'Phường Ba Đình, Hà Nội', 'Sinh viên Sư phạm Toán năm 2, từng gia sư lớp 9-10, muốn dạy THPT.', NULL, NULL, '["sk-teaching","sk-excel","sk-translate"]', 0, 0, '2026-09-30 09:00:00', '2026-09-30 09:00:00'),
  (1035, 'demo-stu-026', 'Nguyễn Phúc Thành', '0967 444 555', '2002-11-23', 'MALE', 'SE1926', 'Đại học Công nghệ Hà Nội', 'Kỹ thuật Phần mềm', 4, 2, 'Phường Thanh Xuân, Hà Nội', 'Sinh viên CNTT năm 4, có 3 project cá nhân trên GitHub, biết Git.', NULL, NULL, '["sk-react","sk-manual-test"]', 0, 0, '2026-10-07 09:00:00', '2026-10-07 09:00:00'),
  (1036, 'demo-stu-027', 'Đặng Tuấn Phúc', '0967 555 666', '2003-07-07', 'MALE', 'SE2231', 'Đại học Luật Hà Nội', 'Quản trị Kinh doanh', 3, 2, 'Phường Cầu Giấy, Hà Nội', 'Sinh viên Luật, thành thạo Excel và từng làm thực tập kế toán.', NULL, NULL, '["sk-excel","sk-pos"]', 0, 0, '2026-10-14 09:00:00', '2026-10-14 09:00:00'),
  (1037, 'demo-stu-028', 'Phạm Thị Nhi', '0967 666 777', '2004-05-26', 'FEMALE', 'SE2315', 'Đại học Kinh tế Quốc dân Hà Nội', 'Marketing', 3, 2, 'Phường Đống Đa, Hà Nội', 'Sinh viên Marketing, từng viết content cho chuỗi bán lẻ trong học kỳ thực tập.', NULL, NULL, '["sk-content","sk-seo","sk-design"]', 0, 0, '2026-10-21 09:00:00', '2026-10-21 09:00:00'),
  (1038, 'demo-stu-029', 'Bùi Quốc Long', '0967 777 888', '2002-04-03', 'MALE', 'SE1929', 'Đại học Thương mại Hà Nội', 'Quản trị Kinh doanh', 4, 2, 'Phường Long Biên, Hà Nội', 'Sinh viên năm 4, từng làm tổng đài tư vấn và bán hàng.', NULL, NULL, '["sk-pos","sk-cashier","sk-service"]', 0, 0, '2026-10-28 09:00:00', '2026-10-28 09:00:00'),
  (1039, 'demo-stu-030', 'Trần Minh An', '0967 888 999', '2003-09-12', 'MALE', 'SE2233', 'Đại học FPT Hà Nội', 'Kỹ thuật Phần mềm', 2, 2, 'Phường Hà Đông, Hà Nội', 'Sinh viên CNTT năm 2, tìm cơ hội thực tập kiểm thử phần mềm.', NULL, NULL, '["sk-manual-test","sk-security"]', 0, 0, '2026-11-04 09:00:00', '2026-11-04 09:00:00'),
  (1040, 'demo-stu-031', 'Trần Thị Mỹ', '0967 999 000', '2003-03-30', 'FEMALE', 'SE2234', 'Đại học Kinh tế Đà Nẵng', 'Marketing', 3, 3, 'Phường Hải Châu, Đà Nẵng', 'Sinh viên Marketing Đà Nẵng, thích trợ giảng tiếng Anh và viết content.', NULL, NULL, '["sk-content","sk-translate","sk-design","sk-teaching"]', 0, 0, '2026-11-06 09:00:00', '2026-11-06 09:00:00'),
  (1041, 'demo-stu-032', 'Đặng Thị Chi', '0968 000 111', '2004-06-14', 'FEMALE', 'SE2318', 'Đại học Đà Nẵng', 'Kế toán', 2, 3, 'Phường Thanh Khê, Đà Nẵng', 'Sinh viên Kế toán năm 2, thành thạo Excel, tìm việc văn phòng part-time.', NULL, NULL, '["sk-excel","sk-pos","sk-service","sk-barista"]', 0, 0, '2026-11-08 09:00:00', '2026-11-08 09:00:00'),
  (1042, 'demo-stu-033', 'Đào Như Linh', '0968 111 222', '2002-10-31', 'FEMALE', 'SE1933', 'Đại học Cần Thơ', 'Kế toán', 4, 4, 'Phường Ninh Kiều, Cần Thơ', 'Sinh viên Kế toán năm 4 tại Cần Thơ, quen phần mềm kế toán và làm thu ngân.', NULL, NULL, '["sk-excel","sk-pos","sk-cashier","sk-service"]', 0, 0, '2026-11-10 09:00:00', '2026-11-10 09:00:00'),
  (1043, 'demo-stu-034', 'Hoàng Đức Nhật', '0968 222 333', '2003-01-08', 'MALE', 'SE2234', 'Đại học Cần Thơ', 'Công nghệ thông tin', 3, 4, 'Phường Ninh Kiều, Cần Thơ', 'Sinh viên CNTT Cần Thơ, từng làm tổng đài tư vấn cho trung tâm.', NULL, NULL, '["sk-manual-test","sk-excel","sk-service"]', 0, 0, '2026-11-12 09:00:00', '2026-11-12 09:00:00'),
  (1044, 'demo-stu-035', 'Lê Quang Vinh', '0968 333 444', '2002-05-25', 'MALE', 'SE1935', 'Đại học Đồng Nai', 'Kỹ thuật Phần mềm', 4, 5, 'Phường Dầu Giây, TP. Đồng Nai', 'Sinh viên gần KCN Suối Tiên, sẵn sàng làm ca kho hoặc giao hàng.', NULL, NULL, '["sk-driver","sk-stock","sk-manual-test"]', 0, 0, '2026-11-14 09:00:00', '2026-11-14 09:00:00'),
  (1045, 'demo-stu-036', 'Phương Thị Hồng Phượng', '0968 444 555', '2003-08-17', 'FEMALE', 'SE2236', 'Đại học Đồng Nai', 'Quản trị Kinh doanh', 3, 5, 'Phường Biên Hoà, TP. Đồng Nai', 'Sinh viên Quản trị Kinh doanh, muốn làm thêm bán hàng cuối tuần.', NULL, NULL, '["sk-pos","sk-service","sk-cooking","sk-cashier"]', 0, 0, '2026-11-16 09:00:00', '2026-11-16 09:00:00'),
  (1046, 'demo-stu-037', 'Đỗ Anh Tuấn', '0968 555 666', '2002-02-14', 'MALE', 'SE1937', 'Đại học Bình Dương', 'Quản trị Kinh doanh', 4, 5, 'Phường Suối Tiên, TP. Đồng Nai', 'Sinh viên Bình Dương, có xe máy, sẵn sàng làm giao hàng khu vực Suối Tiên.', NULL, NULL, '["sk-driver","sk-stock"]', 0, 0, '2026-11-18 09:00:00', '2026-11-18 09:00:00'),
  (1047, 'demo-stu-038', 'Trần Minh Khôi', '0968 666 777', '2003-11-28', 'MALE', 'SE2238', 'Đại học Tôn Đức Thắng', 'Công nghệ thông tin', 2, 6, 'Phường Buôn Ma Thuột, Đắk Lắk', 'Sinh viên CNTT Đắk Lắk, tìm cơ hội làm việc remote.', NULL, NULL, '["sk-react","sk-manual-test","sk-design"]', 0, 0, '2026-11-19 09:00:00', '2026-11-19 09:00:00'),
  (1048, 'demo-stu-039', 'Trần Thị Yến', '0968 777 888', '2003-04-21', 'FEMALE', 'SE2239', 'Đại học Buôn Ma Thuột', 'Kinh tế', 3, 6, 'Phường Buôn Ma Thuột, Đắk Lắk', 'Sinh viên Kinh tế Đắk Lắk, muốn làm thêm bán hàng và tư vấn.', NULL, NULL, '["sk-pos","sk-content","sk-service","sk-cooking"]', 0, 0, '2026-11-20 09:00:00', '2026-11-20 09:00:00'),
  (1049, 'demo-stu-040', 'Phạm Văn Bách', '0968 888 999', '2003-06-06', 'MALE', 'SE2240', 'Đại học Đắk Lắk', 'Kỹ thuật Phần mềm', 3, 6, 'Phường Buôn Ma Thuột, Đắk Lắk', 'Sinh viên mới đăng ký, hồ sơ còn đang chờ xác thực email.', NULL, NULL, '["sk-react"]', 0, 0, '2026-11-22 09:00:00', '2026-11-22 09:00:00'),
  (1050, 'demo-stu-041', 'Vũ Ngọc Anh', '0969 000 111', '2003-02-28', 'FEMALE', 'SE2241', 'Đại học Kinh tế Đà Nẵng', 'Marketing', 3, 3, 'Phường Thanh Khê, Đà Nẵng', 'Sinh viên Marketing Đà Nẵng, từng viết content cho CLB và trợ giảng lớp tiếng Anh.', NULL, NULL, '["sk-content","sk-teaching"]', 0, 0, '2026-11-23 09:00:00', '2026-11-23 09:00:00'),
  (1051, 'demo-stu-042', 'Đỗ Thanh Phong', '0969 111 222', '2002-11-11', 'MALE', 'SE2242', 'Đại học Sư phạm Kỹ thuật Đà Nẵng', 'Sư phạm Vật lý', 4, 3, 'Phường Hải Châu, Đà Nẵng', 'Sinh viên Sư phạm Vật lý Đà Nẵng, đã trợ giảng lớp 10-12 và phiên dịch hội nghị.', NULL, NULL, '["sk-teaching","sk-translate"]', 0, 0, '2026-11-23 09:00:00', '2026-11-23 09:00:00'),
  (1052, 'demo-stu-043', 'Huỳnh Thị Mai Anh', '0969 222 333', '2003-05-19', 'FEMALE', 'SE2243', 'Đại học Sư phạm Ngoại ngữ TP.HCM', 'Sư phạm Anh ngữ', 3, 1, 'Phường Tân Định, Quận 1, TP.HCM', 'Sinh viên Sư phạm Anh ngữ, đã trợ giảng lớp 9-10 và dịch hội nghị nhỏ.', NULL, NULL, '["sk-teaching","sk-translate"]', 0, 0, '2026-11-23 09:00:00', '2026-11-23 09:00:00');

-- Kỹ năng của nhóm sinh viên bổ sung
INSERT INTO student_skills (student_id, skill_id, level) VALUES
  (1022, 7, 'ADVANCED'), (1022, 10, 'INTERMEDIATE'), (1022, 4, 'BEGINNER'),
  (1023, 3, 'INTERMEDIATE'), (1023, 2, 'BEGINNER'),
  (1024, 5, 'ADVANCED'), (1024, 11, 'INTERMEDIATE'),
  (1025, 6, 'ADVANCED'), (1025, 14, 'INTERMEDIATE'), (1025, 10, 'BEGINNER'),
  (1026, 5, 'ADVANCED'), (1026, 11, 'INTERMEDIATE'),
  (1027, 2, 'ADVANCED'), (1027, 10, 'INTERMEDIATE'),
  (1028, 15, 'INTERMEDIATE'), (1028, 13, 'BEGINNER'),
  (1029, 8, 'ADVANCED'), (1029, 2, 'INTERMEDIATE'),
  (1030, 9, 'ADVANCED'), (1030, 15, 'INTERMEDIATE'), (1030, 16, 'BEGINNER'),
  (1031, 6, 'ADVANCED'), (1031, 14, 'INTERMEDIATE'), (1031, 7, 'INTERMEDIATE'),
  (1032, 11, 'ADVANCED'), (1032, 5, 'INTERMEDIATE'),
  (1033, 12, 'ADVANCED'), (1033, 6, 'INTERMEDIATE'),
  (1034, 8, 'ADVANCED'), (1034, 7, 'INTERMEDIATE'),
  (1035, 15, 'ADVANCED'), (1035, 9, 'INTERMEDIATE'),
  (1036, 7, 'ADVANCED'), (1036, 10, 'INTERMEDIATE'),
  (1037, 6, 'ADVANCED'), (1037, 13, 'INTERMEDIATE'), (1037, 14, 'BEGINNER'),
  (1038, 10, 'ADVANCED'), (1038, 4, 'INTERMEDIATE'),
  (1039, 9, 'ADVANCED'), (1039, 16, 'BEGINNER'),
  (1040, 6, 'ADVANCED'), (1040, 12, 'INTERMEDIATE'), (1040, 13, 'BEGINNER'),
  (1041, 7, 'ADVANCED'), (1041, 10, 'INTERMEDIATE'),
  (1042, 7, 'ADVANCED'), (1042, 10, 'INTERMEDIATE'), (1042, 4, 'INTERMEDIATE'),
  (1043, 9, 'INTERMEDIATE'), (1043, 7, 'BEGINNER'),
  (1044, 5, 'ADVANCED'), (1044, 11, 'INTERMEDIATE'), (1044, 9, 'BEGINNER'),
  (1045, 10, 'ADVANCED'), (1045, 2, 'INTERMEDIATE'),
  (1046, 5, 'ADVANCED'), (1046, 11, 'INTERMEDIATE'),
  (1047, 15, 'ADVANCED'), (1047, 9, 'INTERMEDIATE'), (1047, 13, 'INTERMEDIATE'),
  (1048, 10, 'ADVANCED'), (1048, 6, 'INTERMEDIATE'),
  (1049, 15, 'BEGINNER'),
  -- Bổ sung kỹ năng cho các vị trí F&B / Bếp / Lễ tân / Dạy kèm để mỗi tin
  -- tuyển dụng đều có đủ ứng viên ứng tuyển THẬT (xem Section 7b).
  -- (các kỹ năng đã có sẵn ở trên thì không lặp lại)
  (1023, 1, 'BEGINNER'),                                      -- Hóa học, từng bán bánh ngọt → pha chế
  (1027, 3, 'INTERMEDIATE'), (1027, 4, 'INTERMEDIATE'), (1027, 7, 'BEGINNER'),  -- Ngoại thương, từng làm lễ tân tư vấn → nấu ăn + thu ngân + Excel
  (1029, 3, 'BEGINNER'), (1029, 1, 'BEGINNER'),               -- Sư phạm Mầm non, từng làm quán → nấu ăn + pha chế
  (1033, 2, 'INTERMEDIATE'), (1033, 1, 'BEGINNER'),           -- Kinh tế quốc tế, phiên dịch → phục vụ + pha chế
  (1038, 2, 'INTERMEDIATE'),                                  -- Quản trị, từng làm tổng đài → phục vụ
  (1041, 2, 'INTERMEDIATE'), (1041, 1, 'BEGINNER'),           -- Kế toán Đà Nẵng → phục vụ + pha chế
  (1042, 2, 'INTERMEDIATE'),                                  -- Kế toán Cần Thơ, thu ngân → phục vụ (ca đêm)
  (1043, 2, 'INTERMEDIATE'),                                  -- CNTT Cần Thơ, tổng đài → phục vụ
  (1045, 3, 'INTERMEDIATE'), (1045, 4, 'INTERMEDIATE'),       -- Quản trị Đồng Nai, bán hàng → nấu ăn + thu ngân
  (1048, 2, 'INTERMEDIATE'), (1048, 3, 'BEGINNER'),           -- Kinh tế Đắk Lắk, tư vấn → phục vụ + nấu ăn
  (1034, 12, 'INTERMEDIATE'),                                 -- Sư phạm Toán, gia sư → phiên dịch (dạy ngoại ngữ)
  (1018, 8, 'BEGINNER'),                                      -- Marketing Đà Nẵng, đã trợ giảng → kèm cặp
  (1040, 8, 'INTERMEDIATE'),                                  -- Marketing Đà Nẵng, trợ giảng → kèm cặp
  (1050, 6, 'INTERMEDIATE'), (1050, 8, 'INTERMEDIATE'),       -- SV mới Đà Nẵng, content + kèm cặp
  (1051, 8, 'ADVANCED'), (1051, 12, 'INTERMEDIATE'),          -- SV mới Đà Nẵng, kèm cặp + phiên dịch
  (1052, 8, 'ADVANCED'), (1052, 12, 'ADVANCED'),              -- Sư phạm Anh ngữ TP.HCM → kèm cặp + phiên dịch
  (1029, 12, 'BEGINNER'),                                     -- Sư phạm Mầm non TP.HCM → dạy ngoại ngữ
  (1041, 12, 'BEGINNER'),                                     -- Kế toán Đà Nẵng → dạy ngoại ngữ
  (1037, 2, 'BEGINNER');                                      -- Marketing Hà Nội, từng phục vụ → phục vụ

-- Mục tiêu việc làm của nhóm sinh viên bổ sung
INSERT INTO student_job_preferences (student_id, category_ids, employment_types, province_ids, salary_min, salary_max) VALUES
  (1022, '["cat-ban-tang","cat-van-phong"]',   '["PART_TIME","FLEXIBLE"]', '["79"]',       22000,  38000),
  (1023, '["cat-fnb"]',                        '["PART_TIME","FLEXIBLE"]', '["79"]',       22000,  32000),
  (1024, '["cat-giao-hang"]',                  '["PART_TIME","CASUAL"]',    '["79"]',       20000,  35000),
  (1025, '["cat-marketing"]',                  '["PART_TIME","FLEXIBLE"]', '["79"]',       25000,  45000),
  (1026, '["cat-giao-hang"]',                  '["PART_TIME","FLEXIBLE"]', '["79"]',       22000,  35000),
  (1027, '["cat-fnb","cat-ban-tang"]',          '["PART_TIME","FLEXIBLE"]', '["79"]',       25000,  40000),
  (1028, '["cat-cong-nghe"]',                  '["PART_TIME","FLEXIBLE","FULL_TIME"]', '["79"]', 40000,  90000),
  (1029, '["cat-day-hoc","cat-fnb"]',           '["PART_TIME","FLEXIBLE"]', '["79"]',       28000,  45000),
  (1030, '["cat-cong-nghe"]',                  '["PART_TIME","FULL_TIME"]', '["79"]',      40000,  80000),
  (1031, '["cat-marketing"]',                  '["PART_TIME","FLEXIBLE"]', '["79","01"]',  28000,  50000),
  (1032, '["cat-giao-hang"]',                  '["PART_TIME","CASUAL"]',    '["01"]',       20000,  35000),
  (1033, '["cat-marketing","cat-day-hoc"]',     '["PART_TIME","FLEXIBLE"]', '["01"]',       30000,  60000),
  (1034, '["cat-day-hoc"]',                    '["PART_TIME","FLEXIBLE"]', '["01"]',       60000, 120000),
  (1035, '["cat-cong-nghe"]',                  '["PART_TIME","FULL_TIME"]', '["01"]',      40000,  90000),
  (1036, '["cat-van-phong","cat-ban-tang"]',    '["PART_TIME"]',             '["01"]',       25000,  45000),
  (1037, '["cat-marketing"]',                  '["PART_TIME","FLEXIBLE"]', '["01"]',       30000,  55000),
  (1038, '["cat-van-phong","cat-ban-tang"]',    '["PART_TIME","FLEXIBLE"]', '["01"]',       22000,  40000),
  (1039, '["cat-cong-nghe"]',                  '["PART_TIME","FLEXIBLE"]', '["01"]',       35000,  70000),
  (1040, '["cat-marketing","cat-day-hoc"]',     '["PART_TIME","FLEXIBLE"]', '["48"]',       28000,  55000),
  (1041, '["cat-van-phong"]',                  '["PART_TIME"]',             '["48"]',       25000,  42000),
  (1042, '["cat-van-phong","cat-ban-tang"]',    '["PART_TIME"]',             '["92"]',       22000,  38000),
  (1043, '["cat-cong-nghe","cat-van-phong"]',   '["PART_TIME","FLEXIBLE"]', '["92"]',       30000,  60000),
  (1044, '["cat-giao-hang"]',                  '["PART_TIME","CASUAL"]',    '["75"]',       20000,  35000),
  (1045, '["cat-ban-tang"]',                   '["PART_TIME","FLEXIBLE"]', '["75"]',       22000,  38000),
  (1046, '["cat-giao-hang"]',                  '["PART_TIME","FLEXIBLE"]', '["75"]',       22000,  35000),
  (1047, '["cat-cong-nghe"]',                  '["PART_TIME","FLEXIBLE"]', '["92"]',       35000,  75000),
  (1048, '["cat-ban-tang","cat-marketing"]',    '["PART_TIME","FLEXIBLE"]', '["92"]',       22000,  40000),
  (1049, '["cat-cong-nghe"]',                  '["PART_TIME"]',             '["92"]',       35000,  70000),
  (1050, '["cat-marketing","cat-day-hoc"]',     '["PART_TIME","FLEXIBLE"]',  '["48"]',       28000,  55000),
  (1051, '["cat-day-hoc"]',                    '["PART_TIME","FLEXIBLE"]',  '["48"]',       60000, 110000),
  (1052, '["cat-day-hoc"]',                    '["PART_TIME","FLEXIBLE"]',  '["79"]',       60000, 120000);

-- Kinh nghiệm làm việc tự khai của nhóm bổ sung (một phần SV đã từng đi làm)
INSERT INTO student_experiences (student_id, company, position, start_date, end_date, description, sort_order) VALUES
  (1022, 'Chuỗi siêu thị A', 'Thu ngân', '2025-04-01', '2025-10-31', 'Thu ngân ca tối, kiểm kê quỹ cuối ca.', 1),
  (1024, 'GrabFood', 'Giao hàng thuê xe', '2025-06-01', '2025-12-15', 'Giao hàng khu vực Gò Vấp - Thủ Đức.', 1),
  (1025, 'Cửa hàng mỹ phẩm', 'Livestreamer', '2025-08-01', NULL, 'Livestream bán hàng 3 buổi/tuần.', 1),
  (1026, 'Quán cà phê Gò Vấp', 'Giao hàng nội bộ', '2025-05-01', '2025-11-30', 'Giao đồ trong khuôn viên trường.', 1),
  (1029, 'Trung tâm tư liệu', 'Trợ giảng', '2025-09-01', '2026-02-28', 'Hỗ trợ lớp 1-2 cho giáo viên chính.', 1),
  (1032, 'Kho hàng Long Biên', 'Thủ kho', '2025-07-01', '2026-01-31', 'Kiểm kê và xếp hàng, làm ca đêm.', 1),
  (1033, 'Hội nghị quốc tế', 'Phiên dịch viên', '2025-10-01', '2025-10-30', 'Phiên dịch Anh - Việt cho hội nghị doanh nghiệp.', 1),
  (1034, 'Trung tâm gia sư', 'Gia sư Toán', '2024-10-01', '2026-03-31', 'Dạy Toán lớp 10-12, 3 buổi/tuần.', 1),
  (1035, 'Startup SaaS', 'Thực tập frontend', '2025-11-01', '2026-04-30', 'Xây dựng component React cho sản phẩm nội bộ.', 1),
  (1037, 'Agency nhỏ', 'Content freelancer', '2025-06-01', '2026-03-31', 'Viết content mạng xã hội cho 5 khách hàng.', 1),
  (1038, 'Trung tâm tổng đài', 'Nhân viên tổng đài', '2025-03-01', '2025-09-30', 'Tư vấn khách hàng qua điện thoại.', 1),
  (1042, 'Chuỗi siêu thị B', 'Nhân viên quầy thu ngân', '2025-02-01', '2025-08-31', 'Thu ngân ca chiều tối.', 1),
  (1044, 'Kho hàng Suối Tiên', 'Nhân viên kho', '2025-07-01', '2026-02-28', 'Kiểm kê hàng hóa, hỗ trợ xuất hàng.', 1);

-- =====================================================================
-- 3. HỒ SƠ NHÀ TUYỂN DỤNG
-- =====================================================================
-- `logo_variant` là token màu an toàn cho frontend (primary|secondary|muted|accent).

INSERT INTO employer_profiles (user_id, slug, employer_type, display_name, contact_name, contact_phone, tax_code, description, logo_url, logo_variant, website, province_id, address, is_verified, verified_at, verified_by, avg_rating, rating_count, created_at, updated_at) VALUES
  (1002, 'demo-emp-viejob', 'COMPANY', 'Công ty Cổ phần VieJob Demo', 'Trần Minh Khoa', '0912 345 678', '0319635156', 'Chuỗi cà phê và nhà hàng với hệ thống 8 chi nhánh tại TP.HCM. Chúng tôi thường xuyên tuyển sinh viên làm thêm theo ca linh hoạt, đào tạo bài bản và trả lương đúng hẹn.', NULL, 'primary', 'https://viejob-demo.vn', 1, '89 Phan Đình Phùng, Phường Phú Nhuận, TP.HCM', 1, '2026-04-15 09:00:00', 1003, 4.6, 12, '2026-04-11 09:00:00', '2026-04-11 09:00:00'),
  (1100, 'demo-emp-quanly', 'COMPANY', 'Quản Lý Retail Chain', 'Lâm Quốc Việt', '0900 100 001', '0311111001', 'Chuỗi bán lẻ 12 cửa hàng trên toàn quốc, tuyển nhân viên bán hàng và thu ngân làm thêm theo ca linh hoạt, đào tạo miễn phí.', NULL, 'secondary', 'https://quanlyretail.vn', 1, '123 Nguyễn Huệ, Phường Tân Định, TP.HCM', 1, '2026-03-20 09:00:00', 1003, 4.4, 18, '2026-03-12 09:00:00', '2026-03-12 09:00:00'),
  (1101, 'demo-emp-kimphat', 'COMPANY', 'Kim Phát Jobs', 'Kim Phát', '0900 100 002', '0311111002', 'Kim Phát Jobs đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên tại TP.HCM.', NULL, 'primary', NULL, 1, '456 Lê Thánh Tôn, Phường Bến Thành, TP.HCM', 1, '2026-04-08 09:00:00', 1003, 3.9, 6, '2026-04-02 09:00:00', '2026-04-02 09:00:00'),
  (1102, 'demo-emp-taotao', 'COMPANY', 'Tiệm Chè Táo Tào', 'Nguyễn Thị Táo', '0900 100 003', '0311111003', 'Tiệm chè Táo Tào nổi tiếng với món chè trái cây đặc trưng. Chúng tôi tuyển nhân viên phục vụ và thợ làm bánh, ưu tiên sinh viên gần khu vực Quận 1.', NULL, 'accent', 'https://taotao.vn', 1, '12 Hàm Nghi, Phường Tân Định, TP.HCM', 1, '2026-05-01 09:00:00', 1003, 4.7, 9, '2026-04-20 09:00:00', '2026-04-20 09:00:00'),
  (1103, 'demo-emp-banhchao', 'COMPANY', 'Bánh Mì Chảo Nóng 6H', 'Trần Văn Bánh', '0900 100 004', '0311111004', 'Hệ thống bánh mì chảo mở bán từ 6h sáng. Chúng tôi luôn cần nhân viên phục vụ làm ca sáng và nhân viên bếp bánh.', NULL, 'secondary', NULL, 1, 'Quận Gò Vấp, Phường Gò Vấp, TP.HCM', 1, '2026-05-15 09:00:00', 1003, 4.2, 7, '2026-05-09 09:00:00', '2026-05-09 09:00:00'),
  (1104, 'demo-emp-fozu', 'INDIVIDUAL', 'Trà Sữa Fozu', 'Phạm Thùy Dương', '0900 100 005', NULL, 'Trà Sữa Fozu tuyển barista part-time ca tối. Được đào tạo pha chế từ đầu nếu chưa có kinh nghiệm.', NULL, 'muted', NULL, 2, '256 Điện Biên Phủ, Phường Bình Thạnh, TP.HCM', 1, '2026-06-01 09:00:00', 1003, 4.3, 6, '2026-05-27 09:00:00', '2026-05-27 09:00:00'),
  (1105, 'demo-emp-breakfast', 'COMPANY', 'Hệ thống Ăn sáng 1 phút 30 giây', 'Nguyễn Quốc Hùng', '0900 100 006', '0311111006', 'Chuỗi ăn sáng phục vụ nhanh, tuyển nhân viên bán hàng làm ca sáng sớm, ca trưa và ca tối theo thời gian linh hoạt.', NULL, 'primary', 'https://an30s.vn', 1, 'Các chi nhánh Quận 3, TP.HCM', 1, '2026-06-20 09:00:00', 1003, 4.5, 11, '2026-06-14 09:00:00', '2026-06-14 09:00:00'),
  (1106, 'demo-emp-inhosp', 'COMPANY', 'Công ty CP IN Hospitality', 'Đỗ Anh Hoài', '0900 100 007', '0311111007', 'Tập đoàn nhà hàng khách sạn IN Hospitality tuyển bếp chính, nhân viên phục vụ và thợ làm bánh cho các nhà hàng Việt - Á.', NULL, 'secondary', 'https://inhospitality.vn', 1, 'GEM Center, Phường Tân Hưng, TP.HCM', 1, '2026-07-10 09:00:00', 1003, 4.3, 8, '2026-07-01 09:00:00', '2026-07-01 09:00:00'),
  (1107, 'demo-emp-koithe', 'COMPANY', 'Koi Thé', 'Trần Bảo Khang', '0900 100 008', '0311111008', 'Koi Thé chuyên trà sữa Phú Quốc và bánh handmade. Chúng tôi tuyển nhân viên pha chế và phục vụ, đào tạo miễn phí, lộ trình thăng tiến rõ ràng.', NULL, 'accent', 'https://koithe.vn', 1, 'Khu Thảo Điền, Phường An Phú Đông, TP.HCM', 1, '2026-07-30 09:00:00', 1003, 4.8, 14, '2026-07-22 09:00:00', '2026-07-22 09:00:00');

-- =====================================================================
-- 4. TIN TUYỂN DỤNG
-- =====================================================================
-- `ward_id` tham chiếu `wards.id` (id nội bộ), `ward_name` là snapshot tên.
-- Tỉnh: 1=HCM, 2=Hà Nội, 3=Đà Nẵng, 4=Cần Thơ, 5=Đồng Nai.
-- `category_id` / `position_id` tham chiếu id nội bộ của master data.
-- `applicant_count` & `view_count` là số liệu "đã vận hành" để demo đẹp.

INSERT INTO job_posts (id, slug, employer_id, category_id, position_id, title, description, requirements, benefits, work_mode, employment_type, province_id, district_id, ward_id, ward_name, address_detail, branch_name, salary_type, salary_min, salary_max, salary_currency, positions_count, positions_filled, start_date, end_date, application_deadline, status, reviewed_by, reviewed_at, reject_reason, view_count, is_urgent, applicant_count, published_at, closed_at, created_at, updated_at, deleted_at) VALUES
  -- ===== Nhóm F&B / Barista (cat 1) — 10 tin =====
  (1001, 'demo-job-001', 1002, 1, 1, 'Nhân viên phục vụ part-time — Phường Tân Định', 'Công ty Cổ phần VieJob Demo cần nhân viên phục vụ làm thêm cuối tuần tại cửa hàng. Công việc đơn giản, được đào tạo bài bản, phù hợp sinh viên làm thêm. Ca 6 tiếng, có thể chọn ca sáng hoặc ca tối.', '["Không yêu cầu kinh nghiệm","Ngoại hình gọn gàng","Cởi mở trong giao tiếp"]', '["Bao ăn","Cấp đồng phục","Ca linh hoạt","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', '123 Nguyễn Huệ, Phường Tân Định, TP.HCM', 'Chi nhánh trung tâm', 'HOURLY', 28000, 35000, 'VND', 5, 2, NULL, NULL, '2026-12-05 09:00:00', 'OPEN', 1003, '2026-11-18 09:00:00', NULL, 184, 1, 12, '2026-11-18 09:00:00', NULL, '2026-11-18 09:00:00', '2026-11-18 09:00:00', NULL),
  (1002, 'demo-job-002', 1102, 1, 2, 'Tiệm Chè Táo Tào — Tuyển nhân viên cửa hàng cuối tuần', 'Tiệm chè Táo Tào cần nhân viên bán hàng part-time cuối tuần, phục vụ khách và pha chè theo công thức. Có thể làm 2–4 ca/tuần. Cơ hội được tăng lương sau 3 tháng.', '["Thân thiện, cười tươi","Đam mê pha chè","Sẵn sàng làm cuối tuần"]', '["Bao ăn","Đào tạo pha chè","Ca linh hoạt","Thưởng tháng"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', '12 Hàm Nghi, Phường Tân Định, TP.HCM', NULL, 'HOURLY', 25000, 28000, 'VND', 8, 3, NULL, NULL, '2026-12-08 09:00:00', 'OPEN', 1003, '2026-11-17 09:00:00', NULL, 264, 0, 14, '2026-11-17 09:00:00', NULL, '2026-11-17 09:00:00', '2026-11-17 09:00:00', NULL),
  (1003, 'demo-job-003', 1104, 1, 7, 'Tuyển pha chế trà sữa — Trà Sữa Fozu', 'Trà Sữa Fozu tuyển barista part-time ca tối. Được đào tạo pha chế từ đầu nếu chưa có kinh nghiệm. Mức lương 22–27k/giờ, thưởng thêm theo số ly bán ra.', '["Từ 18 tuổi","Sẵn sàng làm ca tối","Tinh thần vui vẻ"]', '["Đào tạo","Cấp đồng phục","Hoàn tiền đồ uống","Thưởng doanh số"]', 'ONSITE', 'PART_TIME', 1, NULL, 2655, 'Phường Bình Thạnh', '256 Điện Biên Phủ, Phường Bình Thạnh, TP.HCM', NULL, 'HOURLY', 22000, 27000, 'VND', 6, 1, NULL, NULL, '2026-12-02 09:00:00', 'OPEN', 1003, '2026-11-16 09:00:00', NULL, 364, 1, 27, '2026-11-16 09:00:00', NULL, '2026-11-16 09:00:00', '2026-11-16 09:00:00', NULL),
  (1004, 'demo-job-004', 1107, 1, 7, 'Trà sữa Koi Thé — Tuyển nhân viên pha chế và phục vụ', 'Koi Thé tuyển nhân viên pha chế và phục vụ, làm việc tại chuỗi. Đào tạo miễn phí, phát triển lên vị trí quản lý sau 6 tháng. Ưu tiên ứng viên có thể làm ca cuối tuần.', '["Có tinh thần cầu tiến","Sẵn sàng làm ca xoay","Nhanh nhẹn"]', '["Đào tạo","Lộ trình thăng tiến","Bao ăn","Cấp đồng phục"]', 'ONSITE', 'FULL_TIME', 1, NULL, 2633, 'Phường An Phú Đông', 'Khu Thảo Điền, Phường An Phú Đông, TP.HCM', NULL, 'MONTHLY', 5000000, 7000000, 'VND', 12, 4, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-15 09:00:00', NULL, 316, 0, 23, '2026-11-15 09:00:00', NULL, '2026-11-15 09:00:00', '2026-11-15 09:00:00', NULL),
  (1005, 'demo-job-005', 1102, 1, 1, 'Nhà hàng VieJob Demo — Tuyển phục vụ ca chiều', 'Nhà hàng fine-dining chuỗi VieJob Demo tuyển phục vụ ca chiều cố định 16h–23h, thu nhập 8,9 – 10,3 triệu/tháng. Yêu cầu giao tiếp tốt, có thể làm lâu dài.', '["Giao tiếp tốt","Có kinh nghiệm 1 năm trở lên","Ngoại hình tự tin"]', '["Bao ăn","Đào tạo nghiệp vụ","Lương ổn định","Tip ca"]', 'ONSITE', 'FULL_TIME', 1, NULL, 2703, 'Phường Tân Hưng', 'GEM Center, Phường Tân Hưng, TP.HCM', 'Chi nhánh GEM Center', 'MONTHLY', 8900000, 10300000, 'VND', 4, 1, NULL, NULL, '2026-12-10 09:00:00', 'OPEN', 1003, '2026-11-14 09:00:00', NULL, 148, 0, 9, '2026-11-14 09:00:00', NULL, '2026-11-14 09:00:00', '2026-11-14 09:00:00', NULL),
  (1006, 'demo-job-006', 1103, 1, 2, 'Bánh Mì Chảo Nóng 6H — Tuyển phục vụ ca sáng', 'Quán bánh mì chảo tuyển phục vụ full-time, làm việc cả ngày từ 6h sáng. Có bữa ăn sáng miễn phí cho nhân viên. Phù hợp sinh viên năm 1-2 vừa học vừa làm.', '["Sức khỏe tốt","Chịu được ca sáng sớm","Không yêu cầu kinh nghiệm"]', '["Bao ăn","Cấp đồng phục","Lương ổn định hàng tháng"]', 'ONSITE', 'FULL_TIME', 1, NULL, 2650, 'Phường Gò Vấp', 'Quận Gò Vấp, Phường Gò Vấp, TP.HCM', NULL, 'MONTHLY', 6000000, 7000000, 'VND', 5, 2, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-13 09:00:00', NULL, 256, 0, 18, '2026-11-13 09:00:00', NULL, '2026-11-13 09:00:00', '2026-11-13 09:00:00', NULL),
  (1007, 'demo-job-007', 1107, 1, 4, 'Pha chế (Bar) — Koi Thé Thảo Điền', 'Vị trí barista tại Koi Thé Thảo Điền, làm việc ca chiều tối. Có thể đào tạo nâng cao, đặc biệt ưu tiên ứng viên đã từng pha chế cà phê.', '["Có kinh nghiệm pha chế là một lợi thế","Kiên nhẫn, tỉ mỉ"]', '["Đào tạo chuyên sâu","Tip ca cao","Bao ăn"]', 'ONSITE', 'PART_TIME', 1, NULL, 2633, 'Phường An Phú Đông', 'Khu Thảo Điền, Phường An Phú Đông, TP.HCM', 'Chi nhánh Thảo Điền', 'HOURLY', 30000, 38000, 'VND', 4, 0, NULL, NULL, '2026-12-01 09:00:00', 'OPEN', 1003, '2026-11-12 09:00:00', NULL, 132, 0, 7, '2026-11-12 09:00:00', NULL, '2026-11-12 09:00:00', '2026-11-12 09:00:00', NULL),
  (1008, 'demo-job-008', 1100, 1, 3, 'Đón khách (Host) — Quản Lý Retail Chain', 'Chuỗi bán lẻ Quản Lý Retail tuyển host đón khách tại cửa hàng Quận 1. Ca 6 tiếng, ưu tiên sinh viên nữ có kinh nghiệm làm lễ tân hoặc phục vụ.', '["Giao tiếp tự tin","Ngoại hình ưu diện","Sẵn sàng làm ca đêm"]', '["Đào tạo","Đồng phục","Bao ăn","Thưởng KPI"]', 'ONSITE', 'FLEXIBLE', 1, NULL, 2629, 'Phường Tân Định', '456 Lê Thánh Tôn, Phường Tân Định, TP.HCM', 'Chi nhánh Trung tâm', 'HOURLY', 24000, 30000, 'VND', 6, 2, NULL, NULL, '2026-12-12 09:00:00', 'OPEN', 1003, '2026-11-11 09:00:00', NULL, 198, 0, 11, '2026-11-11 09:00:00', NULL, '2026-11-11 09:00:00', '2026-11-11 09:00:00', NULL),
  (1009, 'demo-job-009', 1101, 1, 2, '500K/8H PART TIME PHỤC VỤ TIỆC — Quận 1', 'Tuyển nhân viên phục vụ tiệc đại tiệc tại Quận 1. Ca 8 tiếng, xuất phát 05h00, về 15h00. Xe đưa đón theo lịch trình, hỗ trợ xăng xe đến điểm tập hợp. Lương 500k/ca tương đương 62.500đ/giờ.', '["Phục vụ tiệc","Ngoại hình gọn gàng","Sẵn sàng làm ca sáng"]', '["Bao ăn","Cấp đồng phục","Xe đưa đón","Hỗ trợ xăng xe","Giữ 100% tiền tip"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', '585 Đường Âu Cơ, Phường Tân Bình, TP.HCM', NULL, 'HOURLY', 62000, 62000, 'VND', 50, 12, NULL, NULL, '2026-12-18 09:00:00', 'OPEN', 1003, '2026-11-20 09:00:00', NULL, 448, 1, 34, '2026-11-20 09:00:00', NULL, '2026-11-20 09:00:00', '2026-11-20 09:00:00', NULL),
  (1010, 'demo-job-010', 1102, 1, 5, 'Phụ bar — Tiệm Chè Táo Tào', 'Cần thêm phụ bar hỗ trợ rửa ly, sắp xếp và phục vụ trong ca tối. Công việc nhẹ nhàng, phù hợp sinh viên làm thêm 3 ca/tuần.', '["Không yêu cầu kinh nghiệm","Chăm chỉ, vui vẻ"]', '["Bao ăn","Ca linh hoạt","Đào tạo"]', 'ONSITE', 'CASUAL', 1, NULL, 2629, 'Phường Tân Định', '12 Hàm Nghi, Phường Tân Định, TP.HCM', NULL, 'HOURLY', 22000, 24000, 'VND', 3, 0, NULL, NULL, '2026-12-15 09:00:00', 'OPEN', 1003, '2026-11-10 09:00:00', NULL, 96, 0, 5, '2026-11-10 09:00:00', NULL, '2026-11-10 09:00:00', '2026-11-10 09:00:00', NULL),

  -- ===== Nhóm Bếp & Nấu ăn (cat 2) — 5 tin =====
  (1011, 'demo-job-011', 1102, 2, 17, 'Tuyển thợ làm bánh part-time — Tiệm Chè Táo Tào', 'Tiệm chè Táo Tào tuyển thợ làm bánh part-time khép kín, làm bánh trang trí và bánh ngọt theo thời gian vụ. Phù hợp sinh viên khối ngành thực phẩm hoặc làm bánh.', '["Có kinh nghiệm làm bánh","Tỉ mẩn, kiên nhẫn"]', '["Đào tạo","Ca linh hoạt","Bao ăn"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Tiệm Chè Táo Tào, Phường Tân Định, TP.HCM', NULL, 'HOURLY', 26000, 32000, 'VND', 3, 0, NULL, NULL, '2026-12-06 09:00:00', 'OPEN', 1003, '2026-11-09 09:00:00', NULL, 112, 1, 6, '2026-11-09 09:00:00', NULL, '2026-11-09 09:00:00', '2026-11-09 09:00:00', NULL),
  (1012, 'demo-job-012', 1106, 2, 8, 'Tuyển bếp chính nhà hàng Việt — IN Hospitality', 'Nhà hàng IN Hospitality tuyển bếp chính, kinh nghiệm món Việt và món Á. Lương 12–15 triệu/tháng tùy kinh nghiệm, ở ngay GEM Center.', '["Trên 2 năm kinh nghiệm","Chịu được áp lực cao điểm","Thành thạo món Việt"]', '["Bao ăn","Lương ổn định","Môi trường làm việc chuyên nghiệp","Thưởng tháng"]', 'ONSITE', 'FULL_TIME', 1, NULL, 2703, 'Phường Tân Hưng', 'GEM Center, Phường Tân Hưng, TP.HCM', 'Nhà hàng GEM Center', 'MONTHLY', 12000000, 15000000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-08 09:00:00', NULL, 124, 0, 7, '2026-11-08 09:00:00', NULL, '2026-11-08 09:00:00', '2026-11-08 09:00:00', NULL),
  (1013, 'demo-job-013', 1103, 2, 16, 'Nhân viên bếp phụ — Khu căn hộ Thủ Đức', 'Tuyển phụ bếp làm bếp phụ tại khu căn hộ Thủ Đức, làm việc ca sáng hoặc ca tối. Có thể ăn cơm tại chỗ. Không yêu cầu kinh nghiệm.', '["Sức khỏe tốt","Chịu được nóng"]', '["Bao ăn","Cấp đồng phục","Lương ổn định"]', 'ONSITE', 'PART_TIME', 1, NULL, 2641, 'Phường Thủ Đức', 'Khu căn hộ Thủ Đức, Phường Thủ Đức, TP.HCM', NULL, 'HOURLY', 24000, 28000, 'VND', 6, 3, NULL, NULL, '2026-12-04 09:00:00', 'OPEN', 1003, '2026-11-07 09:00:00', NULL, 340, 0, 25, '2026-11-07 09:00:00', NULL, '2026-11-07 09:00:00', '2026-11-07 09:00:00', NULL),
  (1014, 'demo-job-014', 1106, 2, 10, 'Bếp nóng part-time — IN Hospitality', 'Nhà hàng tuyển bếp nóng part-time, làm ca tối cuối tuần. Hỗ trợ ăn ca, đào tạo món theo thực đơn.', '["Có kinh nghiệm bếp nóng","Tinh thần trách nhiệm"]', '["Bao ăn","Cấp đồng phục","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, NULL, 2703, 'Phường Tân Hưng', 'GEM Center, Phường Tân Hưng, TP.HCM', NULL, 'HOURLY', 25000, 30000, 'VND', 3, 0, NULL, NULL, '2026-12-09 09:00:00', 'OPEN', 1003, '2026-11-06 09:00:00', NULL, 100, 0, 5, '2026-11-06 09:00:00', NULL, '2026-11-06 09:00:00', '2026-11-06 09:00:00', NULL),
  (1015, 'demo-job-015', 1103, 2, 18, 'Rửa chén bát — Bánh Mì Chảo 6H', 'Tuyển nhân viên rửa chén bát và hỗ trợ khu vực làm việc, ca 5h sáng - 11h trưa. Công việc ổn định, phù hợp sinh viên làm thêm buổi sáng.', '["Không yêu cầu kinh nghiệm","Làm việc nghiêm túc"]', '["Bao ăn sáng","Đồng phục","Công việc ổn định"]', 'ONSITE', 'CASUAL', 1, NULL, 2650, 'Phường Gò Vấp', 'Quận Gò Vấp, Phường Gò Vấp, TP.HCM', NULL, 'HOURLY', 21000, 23000, 'VND', 4, 1, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-05 09:00:00', NULL, 88, 0, 6, '2026-11-05 09:00:00', NULL, '2026-11-05 09:00:00', '2026-11-05 09:00:00', NULL),

  -- ===== Nhóm Bán hàng & Thu ngân (cat 3) — 6 tin =====
  (1016, 'demo-job-016', 1105, 3, 19, 'Nhân viên bán hàng ăn sáng — 1 phút 30 giây', 'Hệ thống ăn sáng 1 phút 30 giây cần nhân viên bán hàng làm ca sáng, ca trưa và ca tối theo thời gian linh hoạt. Lương 1,5 – 4,5 triệu/tháng tùy số ca.', '["Nhanh nhẹn tay","Chịu được ca sáng sớm","Giao tiếp thân thiện"]', '["Bao ăn","Ca linh hoạt","Thưởng tháng","Cấp đồng phục"]', 'ONSITE', 'FLEXIBLE', 1, NULL, 2675, 'Phường Xuân Hoà', 'Các chi nhánh Quận 3, TP.HCM', NULL, 'MONTHLY', 1500000, 4500000, 'VND', 15, 9, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-04 09:00:00', NULL, 532, 0, 41, '2026-11-04 09:00:00', NULL, '2026-11-04 09:00:00', '2026-11-04 09:00:00', NULL),
  (1017, 'demo-job-017', 1101, 3, 19, 'Nhân viên bán lẻ quần áo cuối tuần — Quận 5', 'Tuyển nhân viên bán lẻ part-time cuối tuần tại cửa hàng quần áo, tư vấn và sắp xếp sản phẩm. Lương 180–220k/ngày.', '["Giao tiếp tốt","Thích làm việc cuối tuần"]', '["Ca linh hoạt","Thưởng doanh số","Hỗ trợ đồng phục"]', 'ONSITE', 'FLEXIBLE', 1, NULL, 2688, 'Phường Chợ Quán', 'Phường Chợ Quán, Quận 5, TP.HCM', NULL, 'DAILY', 180000, 220000, 'VND', 8, 4, NULL, NULL, NULL, 'OPEN', 1003, '2026-11-03 09:00:00', NULL, 160, 0, 10, '2026-11-03 09:00:00', NULL, '2026-11-03 09:00:00', '2026-11-03 09:00:00', NULL),
  (1018, 'demo-job-018', 1101, 3, 23, 'Thu ngân part-time — chuỗi cà phê Quận 1', 'Tuyển thu ngân part-time ca sáng và ca chiều, quen dùng phần mềm POS. Ưu tiên sinh viên khả năng làm việc ổn định lâu dài.', '["Nhanh nhẹn tay","Cẩn thận với tiền mặt","Có thể làm ca sáng"]', '["Ca linh hoạt","Đào tạo","Bao ăn"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP.HCM', NULL, 'HOURLY', 26000, 30000, 'VND', 5, 2, NULL, NULL, '2026-12-03 09:00:00', 'OPEN', 1003, '2026-11-02 09:00:00', NULL, 196, 0, 13, '2026-11-02 09:00:00', NULL, '2026-11-02 09:00:00', '2026-11-02 09:00:00', NULL),
  (1019, 'demo-job-019', 1102, 3, 23, 'Nhân viên thu ngân ca đêm — Tiệm Chè Táo Tào', 'Cửa hàng tuyển thu ngân ca đêm, làm 22h–06h, thưởng theo ca. Phù hợp sinh viên khỏe mạnh, quen làm ca khuya.', '["Cẩn thận xử lý tiền mặt","Làm ca đêm sức khỏe tốt"]', '["Phụ cấp ca đêm","Cơm đêm","Thưởng tháng"]', 'ONSITE', 'FLEXIBLE', 1, NULL, 2629, 'Phường Tân Định', '585 Đường Âu Cơ, Phường Tân Bình, TP.HCM', NULL, 'HOURLY', 32000, 38000, 'VND', 2, 2, NULL, NULL, NULL, 'CLOSED', 1003, '2026-11-01 09:00:00', NULL, 210, 0, 19, '2026-11-01 09:00:00', '2026-11-09 09:00:00', '2026-11-01 09:00:00', '2026-11-09 09:00:00', NULL),
  (1020, 'demo-job-020', 1100, 3, 24, 'Nhân viên lễ tân — Hà Nội', 'Tuyển nhân viên lễ tân part-time tại văn phòng công ty. Giao tiếp tiếng Anh tốt là một lợi thế. Công việc nhẹ nhàng, môi trường văn phòng chuyên nghiệp.', '["Tiếng Anh giao tiếp tốt","Cẩn thận, thân thiện"]', '["Bàn làm việc riêng","Cà phê miễn phí","Đào tạo nghiệp vụ"]', 'ONSITE', 'PART_TIME', 2, NULL, 14, 'Phường Cầu Giấy', '28 Mai Dương, Phường Cầu Giấy, Hà Nội', NULL, 'HOURLY', 25000, 30000, 'VND', 2, 0, NULL, NULL, '2026-12-14 09:00:00', 'OPEN', 1003, '2026-10-30 09:00:00', NULL, 96, 0, 6, '2026-10-30 09:00:00', NULL, '2026-10-30 09:00:00', '2026-10-30 09:00:00', NULL),
  (1021, 'demo-job-021', 1100, 3, 20, 'Tư vấn bán hàng — Quản Lý Retail Chain', 'Nhân viên tư vấn bán hàng tại cửa hàng trung tâm, tư vấn sản phẩm và chăm sóc khách hàng thân thiết. Cơ hội tăng lương theo doanh số.', '["Giao tiếp tốt","Tự tin trình bày","Có thể làm cuối tuần"]', '["Thưởng doanh số","Đào tạo","Bao ăn"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', '123 Nguyễn Huệ, Phường Tân Định, TP.HCM', 'Chi nhánh Trung tâm', 'HOURLY', 27000, 34000, 'VND', 7, 3, NULL, NULL, '2026-12-11 09:00:00', 'OPEN', 1003, '2026-10-28 09:00:00', NULL, 142, 0, 9, '2026-10-28 09:00:00', NULL, '2026-10-28 09:00:00', '2026-10-28 09:00:00', NULL),

  -- ===== Nhóm Giao hàng & Vận chuyển (cat 4) — 5 tin =====
  (1022, 'demo-job-022', 1100, 4, 26, 'Giao hàng part-time — khu vực Thủ Đức', 'Tuyển tài xế giao hàng part-time, xe máy, ưu tiên sinh viên có xe. Công việc linh hoạt theo khung giờ bạn chọn. Thưởng giao nhiều, hỗ trợ xăng.', '["Có xe máy","Có CCCD gắn chip","Có smartphone"]', '["Ca linh hoạt","Thưởng giao nhiều","Hỗ trợ xăng"]', 'ONSITE', 'PART_TIME', 1, NULL, 2641, 'Phường Thủ Đức', 'Khu vực Thủ Đức, TP. Hồ Chí Minh', NULL, 'HOURLY', 25000, 32000, 'VND', 20, 7, NULL, NULL, '2026-12-16 09:00:00', 'OPEN', 1003, '2026-10-27 09:00:00', NULL, 436, 0, 33, '2026-10-27 09:00:00', NULL, '2026-10-27 09:00:00', '2026-10-27 09:00:00', NULL),
  (1023, 'demo-job-023', 1100, 4, 26, 'Giao hàng thuê xe — khu vực trung tâm', 'Tuyển giao hàng thuê xe máy, làm theo ca 4 tiếng. Không yêu cầu kinh nghiệm, hướng dẫn cảnh giác giao hàng chi tiết.', '["Có xe máy","Làm việc được 2 ca/tuần"]', '["Ca linh hoạt","Hỗ trợ xăng","Không yêu cầu kinh nghiệm"]', 'ONSITE', 'FLEXIBLE', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP. Hồ Chí Minh', NULL, 'HOURLY', 23000, 27000, 'VND', 30, 18, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-26 09:00:00', NULL, 580, 0, 45, '2026-10-26 09:00:00', NULL, '2026-10-26 09:00:00', '2026-10-26 09:00:00', NULL),
  (1024, 'demo-job-024', 1101, 4, 27, 'Thủ kho kho hàng Quản Lý Retail — Đồng Nai', 'Tuyển thủ kho làm việc theo ca, kiểm kê hàng hóa, sắp xếp và hỗ trợ xuất hàng. Công việc ổn định theo lịch cố định.', '["Cẩn thận, có trách nhiệm","Sức khỏe tốt"]', '["Bao ăn","Đồng phục","Lương ổn định"]', 'ONSITE', 'PART_TIME', 5, NULL, 2540, 'Phường Dầu Giây', 'KCN Dầu Giây, Phường Dầu Giây, TP. Đồng Nai', NULL, 'HOURLY', 24000, 29000, 'VND', 8, 3, NULL, NULL, '2026-12-20 09:00:00', 'OPEN', 1003, '2026-10-25 09:00:00', NULL, 168, 0, 12, '2026-10-25 09:00:00', NULL, '2026-10-25 09:00:00', '2026-10-25 09:00:00', NULL),
  (1025, 'demo-job-025', 1100, 4, 28, 'Nhân viên bảo vệ ca đêm — Cần Thơ', 'Tuyển nhân viên bảo vệ ca đêm tại kho hàng, làm 22h–06h, hỗ trợ cơm đêm. Lương 220–260k/ngày.', '["Có sức khỏe","Cẩn thận, không sơ suất"]', '["Bao ăn","Thưởng ca đêm","Cơm đêm"]', 'ONSITE', 'FLEXIBLE', 4, NULL, 3156, 'Phường Ninh Kiều', 'Phường Ninh Kiều, Cần Thơ', NULL, 'DAILY', 220000, 260000, 'VND', 3, 2, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-24 09:00:00', NULL, 124, 0, 7, '2026-10-24 09:00:00', NULL, '2026-10-24 09:00:00', '2026-10-24 09:00:00', NULL),
  (1026, 'demo-job-026', 1101, 4, 30, 'Tạp vụ vệ sinh — Quản Lý Retail Chain', 'Tuyển nhân viên tạp vụ vệ sinh part-time cho các chi nhánh Quận 3, ca tối sau giờ đóng cửa. Công việc ổn định, có môi trường làm việc sạch sẽ.', '["Cẩn thận, có trách nhiệm","Không yêu cầu kinh nghiệm"]', '["Bao ăn","Ca linh hoạt","Đồng phục"]', 'ONSITE', 'CASUAL', 1, NULL, 2675, 'Phường Xuân Hoà', 'Các chi nhánh Quận 3, TP.HCM', NULL, 'HOURLY', 22000, 25000, 'VND', 5, 2, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-23 09:00:00', NULL, 108, 0, 8, '2026-10-23 09:00:00', NULL, '2026-10-23 09:00:00', '2026-10-23 09:00:00', NULL),

  -- ===== Nhóm Marketing & Truyền thông (cat 5) — 5 tin =====
  (1027, 'demo-job-027', 1002, 5, 31, 'Thực tập sinh Marketing — Remote', 'Cơ hội thực tập sinh bộ phận marketing làm việc remote, hỗ trợ chạy chiến dịch mạng xã hội và sản xuất nội dung. Có mentor hướng dẫn 1-1.', '["Đang là sinh viên","Biết Canva/Photoshop cơ bản","Viết content tốt"]', '["Làm remote","Có mentor hướng dẫn","Thương hiệu trong CV","Công trình thực tập"]', 'REMOTE', 'PART_TIME', 1, NULL, 2655, 'Phường Bình Thạnh', 'Văn phòng điện tử, Phường Bình Thạnh, TP.HCM', NULL, 'MONTHLY', 4000000, 6000000, 'VND', 3, 1, NULL, NULL, '2026-12-08 09:00:00', 'OPEN', 1003, '2026-11-14 09:00:00', NULL, 342, 0, 28, '2026-11-14 09:00:00', NULL, '2026-11-14 09:00:00', '2026-11-14 09:00:00', NULL),
  (1028, 'demo-job-028', 1002, 5, 33, 'Chuyên viên content marketing part-time — Hà Nội', 'Tuyển content marketing part-time viết bài mạng xã hội và chuẩn bị nội dung chiến dịch. Ưu tiên sinh viên khối kinh tế/marketing, làm được 15–20h/tuần.', '["Viết tốt","Biết Canva hoặc Photoshop cơ bản","Chịu được deadline"]', '["Làm việc linh hoạt","Cơ hội làm dự án thực tập","Lương ổn định"]', 'HYBRID', 'PART_TIME', 2, NULL, 20, 'Phường Đống Đa', 'Phường Đống Đa, Hà Nội', NULL, 'MONTHLY', 2500000, 4000000, 'VND', 4, 1, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-22 09:00:00', NULL, 304, 0, 22, '2026-10-22 09:00:00', NULL, '2026-10-22 09:00:00', '2026-10-22 09:00:00', NULL),
  (1029, 'demo-job-029', 1100, 5, 31, 'Thực tập sinh Marketing — Đà Nẵng', 'Cơ hội thực tập sinh Marketing tại văn phòng Đà Nẵng, hỗ trợ chiến dịch và xây dựng nội dung. Công trình thực tập 1 năm, môi trường sáng tạo.', '["Sinh viên năm 3 trở lên","Thích nghiên cứu thị trường"]', '["Đào tạo","Công trình 1 năm","Môi trường làm việc sáng tạo"]', 'ONSITE', 'FULL_TIME', 3, NULL, 1856, 'Phường Hải Châu', 'Phường Hải Châu, Đà Nẵng', NULL, 'MONTHLY', 3000000, 4000000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-21 09:00:00', NULL, 412, 0, 31, '2026-10-21 09:00:00', NULL, '2026-10-21 09:00:00', '2026-10-21 09:00:00', NULL),
  (1030, 'demo-job-030', 1002, 5, 32, 'Thực tập sinh Marketing — làm remote 20h/tuần', 'Thực tập marketing làm remote 20 giờ/tuần, hỗ trợ email marketing và SEO cơ bản. Phù hợp sinh viên ở xa hoặc lịch học bất ổn định.', '["Tiếng Anh đọc tốt","Chịu được deadline"]', '["Làm việc remote","Công trình thực tập","Mentor hướng dẫn"]', 'REMOTE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Làm việc từ xa', NULL, 'MONTHLY', 2000000, 3000000, 'VND', 2, 0, NULL, NULL, '2026-12-20 09:00:00', 'OPEN', 1003, '2026-10-20 09:00:00', NULL, 328, 0, 24, '2026-10-20 09:00:00', NULL, '2026-10-20 09:00:00', '2026-10-20 09:00:00', NULL),
  (1031, 'demo-job-031', 1101, 5, 31, 'Nhân viên livestream bán hàng', 'Tuyển nhân viên livestream bán hàng part-time, ca tối. Ưu tiên bạn tự tin trước camera, có kinh nghiệm livestream là một lợi thế.', '["Tự tin giao tiếp","Có kinh nghiệm livestream là một lợi thế"]', '["Đào tạo","Hoàn tiền sản phẩm","Thưởng theo doanh thu"]', 'ONSITE', 'PART_TIME', 1, NULL, 2703, 'Phường Tân Hưng', 'Phường Tân Hưng, Quận 7, TP.HCM', NULL, 'HOURLY', 25000, 30000, 'VND', 3, 0, NULL, NULL, '2026-12-13 09:00:00', 'OPEN', 1003, '2026-10-19 09:00:00', NULL, 148, 1, 9, '2026-10-19 09:00:00', NULL, '2026-10-19 09:00:00', '2026-10-19 09:00:00', NULL),

  -- ===== Nhóm Văn phòng & Hành chính (cat 6) — 4 tin =====
  (1032, 'demo-job-032', 1002, 6, 34, 'Nhân viên văn phòng part-time — Quận 1', 'Tuyển nhân viên hỗ trợ văn phòng part-time, nhập liệu, sắp xếp hồ sơ và hỗ trợ lịch họp. Môi trường làm việc chuyên nghiệp, cơ hội thực tập dài hạn.', '["Thành thạo Excel","Tiếng Anh giao tiếp cơ bản","Cẩn thận với hồ sơ"]', '["Môi trường văn phòng","Ca linh hoạt","Cơ hội thực tập dài hạn"]', 'HYBRID', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'GEM Center, Phường Tân Định, TP.HCM', NULL, 'MONTHLY', 2500000, 3500000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-18 09:00:00', NULL, 220, 0, 15, '2026-10-18 09:00:00', NULL, '2026-10-18 09:00:00', '2026-10-18 09:00:00', NULL),
  (1033, 'demo-job-033', 1100, 6, 35, 'Tổng đài tư vấn — Cần Thơ', 'Tuyển nhân viên tổng đài part-time, tư vấn khách hàng qua điện thoại theo kịch bản có sẵn. Ca 4 tiếng buổi tối, đào tạo miễn phí.', '["Giao tiếp rõ ràng","Kiên nhẫn","Tiếng Anh cơ bản"]', '["Đào tạo","Ca linh hoạt","Thưởng KPI"]', 'ONSITE', 'PART_TIME', 4, NULL, 3156, 'Phường Ninh Kiều', 'Phường Ninh Kiều, Cần Thơ', NULL, 'HOURLY', 23000, 27000, 'VND', 6, 2, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-17 09:00:00', NULL, 154, 0, 11, '2026-10-17 09:00:00', NULL, '2026-10-17 09:00:00', '2026-10-17 09:00:00', NULL),
  (1034, 'demo-job-034', 1100, 6, 36, 'Nhân viên kế toán part-time — Hà Nội', 'Tuyển nhân viên kế toán part-time hỗ trợ nhập sổ, đối chiếu chứng từ và lập báo cáo. Ưu tiên sinh viên khối kinh tế thành thạo Excel.', '["Thành thạo Excel","Cẩn thận số liệu","Biết kế toán cơ bản"]', '["Môi trường văn phòng","Cơ hội thực tập dài hạn","Ca linh hoạt"]', 'HYBRID', 'PART_TIME', 2, NULL, 1, 'Phường Ba Đình', 'Phường Ba Đình, Hà Nội', NULL, 'HOURLY', 28000, 33000, 'VND', 2, 0, NULL, NULL, '2026-12-19 09:00:00', 'OPEN', 1003, '2026-10-16 09:00:00', NULL, 132, 0, 8, '2026-10-16 09:00:00', NULL, '2026-10-16 09:00:00', '2026-10-16 09:00:00', NULL),
  (1035, 'demo-job-035', 1101, 6, 30, 'Trợ lý buổi sáng — quán cà phê Quận 1', 'Tuyển nhân viên trợ lý buổi sáng: rửa dụng cụ, sắp xếp kho, hỗ trợ pha chế sơ bộ. Công việc nhẹ, phù hợp ca sáng.', '["Cẩn thận","Không yêu cầu kinh nghiệm"]', '["Bao ăn","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP.HCM', NULL, 'HOURLY', 22000, 24000, 'VND', 4, 2, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-15 09:00:00', NULL, 184, 0, 12, '2026-10-15 09:00:00', NULL, '2026-10-15 09:00:00', '2026-10-15 09:00:00', NULL),

  -- ===== Nhóm Dạy kèm & Tư vấn (cat 7) — 3 tin =====
  (1036, 'demo-job-036', 1002, 7, 37, 'Gia sư Toán cấp THPT — Hà Nội', 'Cần gia sư Toán cho học sinh lớp 10-12, dạy tại nhà hoặc online. Ưu tiên sinh viên Sư phạm Toán. 2 buổi/tuần, 90 phút/buổi.', '["Sinh viên Sư phạm Toán hoặc khá môn Toán","Kiên nhẫn, truyền đạt tốt"]', '["Ca linh hoạt","Học bổng theo buổi","Hỗ trợ tài liệu"]', 'HYBRID', 'FLEXIBLE', 2, NULL, 1, 'Phường Ba Đình', 'Chung cư Vũ Vi, Phường Ba Đình, Hà Nội', NULL, 'HOURLY', 80000, 120000, 'VND', 4, 0, NULL, NULL, '2026-12-22 09:00:00', 'PENDING_REVIEW', NULL, NULL, NULL, 12, 0, 0, NULL, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00', NULL),
  (1037, 'demo-job-037', 1101, 7, 39, 'Trợ giảng Tiếng Anh cho sinh viên', 'Trung tâm tuyển trợ giảng tiếng Anh giao tiếp cho sinh viên, làm việc tối và cuối tuần. Lương 80–120k/giờ.', '["IELTS 6.0 trở lên","Nói rõ ràng","Kiên nhẫn với người mới học"]', '["Đào tạo","Ca linh hoạt","Thưởng giờ dạy thêm"]', 'ONSITE', 'PART_TIME', 1, NULL, 2675, 'Phường Xuân Hoà', 'Phường Xuân Hoà, Quận 3, TP.HCM', NULL, 'HOURLY', 80000, 120000, 'VND', 3, 1, NULL, NULL, '2026-12-16 09:00:00', 'OPEN', 1003, '2026-10-13 09:00:00', NULL, 136, 0, 8, '2026-10-13 09:00:00', NULL, '2026-10-13 09:00:00', '2026-10-13 09:00:00', NULL),
  (1038, 'demo-job-038', 1100, 7, 38, 'Trợ giảng Vật lý — Đà Nẵng', 'Trung tâm luyện thi tuyển trợ giảng Vật lý cấp 12, dạy tối các ngày trong tuần. Công việc ổn định lâu dài.', '["Sinh viên giỏi Vật lý","Có kinh nghiệm luyện thi là một lợi thế"]', '["Lương ổn định","Công trình thực tập","Môi trường chuyên nghiệp"]', 'ONSITE', 'PART_TIME', 3, NULL, 1856, 'Phường Hải Châu', 'Phường Hải Châu, Đà Nẵng', NULL, 'HOURLY', 70000, 100000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-12 09:00:00', NULL, 118, 0, 7, '2026-10-12 09:00:00', NULL, '2026-10-12 09:00:00', '2026-10-12 09:00:00', NULL),

  -- ===== Nhóm Công nghệ & Kiểm thử (cat 8) — 4 tin =====
  (1039, 'demo-job-039', 1100, 8, 40, 'Kiểm thử phần mềm thực tập — remote', 'Tuyển kiểm thử thực tập làm remote, ghi nhận lỗi và viết test case. Phù hợp sinh viên CNTT. Mentor review định kỳ.', '["Kiến thức cơ bản về test","Cẩn thận, chi tiết"]', '["Làm việc remote","Công trình thực tập","Mentor hướng dẫn"]', 'REMOTE', 'PART_TIME', 2, NULL, 20, 'Phường Đống Đa', 'Làm việc từ xa', NULL, 'MONTHLY', 3000000, 4500000, 'VND', 3, 0, NULL, NULL, '2026-12-24 09:00:00', 'OPEN', 1003, '2026-10-11 09:00:00', NULL, 268, 0, 19, '2026-10-11 09:00:00', NULL, '2026-10-11 09:00:00', '2026-10-11 09:00:00', NULL),
  (1040, 'demo-job-040', 1002, 8, 41, 'Lập trình viên React thực tập — hybrid', 'Tuyển lập trình viên React thực tập làm sản phẩm thật, mentor review code hằng tuần. Làm 3 ngày/tuần tại văn phòng hoặc online.', '["Nắm vững React và TypeScript","Có portfolio hoặc project cá nhân"]', '["Công trình thực tập","Mentor 1-1","Làm việc hybrid","Lương ổn định"]', 'HYBRID', 'FULL_TIME', 1, NULL, 2655, 'Phường Bình Thạnh', 'Landmark 81, Phường Bình Thạnh, TP.HCM', NULL, 'MONTHLY', 5000000, 7000000, 'VND', 2, 1, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-10 09:00:00', NULL, 208, 0, 14, '2026-10-10 09:00:00', NULL, '2026-10-10 09:00:00', '2026-10-10 09:00:00', NULL),
  (1041, 'demo-job-041', 1100, 8, 42, 'Kỹ sư phần mềm thực tập — Hà Nội', 'Tuyển kỹ sư phần mềm thực tập hỗ trợ phát triển tính năng, làm việc hybrid 3 ngày/tuần. Cơ hội chuyển full-time sau thực tập.', '["Biết Git","Có kinh nghiệm project trường","Java hoặc Python"]', '["Công trình thực tập","Mentor hướng dẫn","Cơ hội full-time"]', 'HYBRID', 'FULL_TIME', 2, NULL, 14, 'Phường Cầu Giấy', 'Bách Khoa, Phường Cầu Giấy, Hà Nội', NULL, 'MONTHLY', 6000000, 8000000, 'VND', 2, 0, NULL, NULL, '2026-12-28 09:00:00', 'OPEN', 1003, '2026-10-09 09:00:00', NULL, 232, 0, 16, '2026-10-09 09:00:00', NULL, '2026-10-09 09:00:00', '2026-10-09 09:00:00', NULL),
  (1042, 'demo-job-042', 1100, 8, 40, 'Kiểm thử phần mềm — Đắk Lắk (remote)', 'Tuyển kiểm thử phần mềm làm remote từ Đắk Lắk, viết test case và báo cáo lỗi. Phù hợp sinh viên yêu thích làm việc độc lập.', '["Cẩn thận trong ghi nhận lỗi","Có thể làm việc từ xa"]', '["Làm việc remote","Công trình thực tập","Thưởng hoàn thành dự án"]', 'REMOTE', 'PART_TIME', 6, NULL, 2277, 'Phường Buôn Ma Thuột', 'Làm việc từ xa', NULL, 'HOURLY', 35000, 45000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', 1003, '2026-10-08 09:00:00', NULL, 142, 0, 9, '2026-10-08 09:00:00', NULL, '2026-10-08 09:00:00', '2026-10-08 09:00:00', NULL),

  -- ===== Các tin ở trạng thái khác (để demo màn hình quản trị) =====
  (1043, 'demo-job-043', 1101, 1, 1, 'Tin tuyển dụng — Đã đủ người (FILLED)', 'Tin tuyển dụng đã tuyển đủ số lượng, đã ngừng nhận hồ sơ. Vẫn hiển thị trong danh sách quản trị của nhà tuyển dụng.', '["Không yêu cầu kinh nghiệm"]', '["Bao ăn","Cấp đồng phục"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP.HCM', NULL, 'HOURLY', 32000, 38000, 'VND', 2, 2, NULL, NULL, NULL, 'FILLED', 1003, '2026-10-07 09:00:00', NULL, 210, 0, 19, '2026-10-07 09:00:00', NULL, '2026-10-07 09:00:00', '2026-10-12 09:00:00', NULL),
  (1044, 'demo-job-044', 1103, 1, 2, 'Tin tuyển dụng — Bị từ chối (REJECTED)', 'Tin bị quản trị viên từ chối vì mô tả không rõ ràng. Nhà tuyển dụng có thể sửa và đăng lại.', '[]', '[]', 'ONSITE', 'PART_TIME', 1, NULL, 2650, 'Phường Gò Vấp', 'Phường Gò Vấp, TP.HCM', NULL, 'HOURLY', 25000, 30000, 'VND', 2, 0, NULL, NULL, NULL, 'REJECTED', 1003, '2026-10-06 09:00:00', 'Mô tả tin tuyển dụng chưa đủ thông tin về ca làm việc và mức lương.', 8, 0, 0, NULL, NULL, '2026-10-06 09:00:00', '2026-10-06 09:00:00', NULL),
  (1045, 'demo-job-045', 1105, 3, 19, 'Tin tuyển dụng — Bản nháp (DRAFT)', 'Bản nháp chưa được gửi duyệt của nhà tuyển dụng. Chỉ hiển thị trong khu vực quản lý tin của NTD.', '["Có kinh nghiệm bán hàng"]', '["Thưởng doanh số"]', 'ONSITE', 'PART_TIME', 1, NULL, 2675, 'Phường Xuân Hoà', 'Phường Xuân Hoà, Quận 3, TP.HCM', NULL, 'HOURLY', 26000, 30000, 'VND', 3, 0, NULL, NULL, NULL, 'DRAFT', NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-11-21 09:00:00', '2026-11-21 09:00:00', NULL),
  (1046, 'demo-job-046', 1106, 2, 8, 'Tin tuyển dụng — Đã hủy (CANCELLED)', 'Tin tuyển dụng đã bị hủy do nhà tuyển dụng hủy vị trí.', '["Trên 2 năm kinh nghiệm"]', '["Bao ăn","Lương ổn định"]', 'ONSITE', 'FULL_TIME', 1, NULL, 2703, 'Phường Tân Hưng', 'GEM Center, Phường Tân Hưng, TP.HCM', NULL, 'MONTHLY', 12000000, 15000000, 'VND', 1, 0, NULL, NULL, NULL, 'CANCELLED', 1003, '2026-10-05 09:00:00', NULL, 64, 0, 3, '2026-10-05 09:00:00', '2026-10-14 09:00:00', '2026-10-05 09:00:00', '2026-10-14 09:00:00', NULL),
  (1047, 'demo-job-047', 1100, 3, 19, 'Tin tuyển dụng — Đang làm (IN_PROGRESS)', 'Tin tuyển dụng đã tuyển đủ người và đang trong quá trình làm việc, theo dõi hằng tuần.', '["Nhanh nhẹn tay","Giao tiếp tốt"]', '["Bao ăn","Lương ổn định"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP.HCM', NULL, 'HOURLY', 26000, 31000, 'VND', 4, 4, '2026-11-01', '2026-12-01', NULL, 'IN_PROGRESS', 1003, '2026-10-04 09:00:00', NULL, 176, 0, 12, '2026-10-04 09:00:00', NULL, '2026-10-04 09:00:00', '2026-11-02 09:00:00', NULL),
  (1048, 'demo-job-048', 1102, 1, 1, 'Tin tuyển dụng — Hoàn thành (COMPLETED)', 'Tin tuyển dụng đã hoàn tất tuyển dụng và kết thúc hợp tác. Vẫn giữ lại để xem lại lịch sử.', '["Có kinh nghiệm phục vụ"]', '["Bao ăn","Cấp đồng phục"]', 'ONSITE', 'PART_TIME', 1, NULL, 2629, 'Phường Tân Định', 'Phường Tân Định, Quận 1, TP.HCM', NULL, 'HOURLY', 25000, 29000, 'VND', 3, 3, '2026-10-01', '2026-11-01', NULL, 'COMPLETED', 1003, '2026-10-03 09:00:00', NULL, 132, 0, 9, '2026-10-03 09:00:00', '2026-11-03 09:00:00', '2026-10-03 09:00:00', '2026-11-03 09:00:00', NULL);

-- =====================================================================
-- 5. CA LÀM VIỆC
-- =====================================================================
-- `day_of_week`: 1 = Thứ 2 ... 7 = Chủ nhật.

INSERT INTO job_post_schedules (job_post_id, day_of_week, start_time, end_time) VALUES
  (1001, 6, '17:00', '23:00'), (1001, 7, '10:00', '18:00'),
  (1002, 6, '08:00', '14:00'), (1002, 7, '08:00', '14:00'),
  (1003, 5, '17:00', '23:00'), (1003, 6, '17:00', '23:00'),
  (1004, 3, '08:00', '16:00'), (1004, 4, '08:00', '16:00'),
  (1005, 4, '14:00', '22:00'), (1005, 5, '14:00', '22:00'),
  (1006, 2, '06:00', '14:00'), (1006, 3, '06:00', '14:00'),
  (1007, 5, '17:00', '23:00'), (1007, 6, '17:00', '23:00'),
  (1008, 1, '09:00', '15:00'), (1008, 5, '16:00', '22:00'),
  (1009, 7, '05:00', '15:00'),
  (1010, 6, '19:00', '22:00'),
  (1011, 4, '08:00', '14:00'), (1011, 5, '08:00', '14:00'),
  (1012, 2, '10:00', '18:00'), (1012, 3, '10:00', '18:00'),
  (1013, 2, '06:00', '12:00'), (1013, 6, '17:00', '23:00'),
  (1014, 5, '17:00', '23:00'), (1014, 7, '17:00', '23:00'),
  (1015, 1, '05:00', '11:00'), (1015, 2, '05:00', '11:00'), (1015, 3, '05:00', '11:00'),
  (1016, 1, '06:00', '11:00'), (1016, 5, '16:00', '21:00'),
  (1017, 6, '09:00', '18:00'), (1017, 7, '09:00', '18:00'),
  (1018, 2, '07:00', '13:00'), (1018, 4, '13:00', '19:00'),
  (1019, 7, '22:00', '06:00'),
  (1020, 1, '09:00', '13:00'), (1020, 3, '13:00', '18:00'),
  (1021, 6, '10:00', '17:00'), (1021, 7, '10:00', '17:00'),
  (1022, 3, '16:00', '21:00'), (1022, 6, '10:00', '16:00'),
  (1023, 2, '18:00', '22:00'), (1023, 5, '18:00', '22:00'),
  (1024, 2, '07:00', '15:00'), (1024, 4, '07:00', '15:00'), (1024, 6, '07:00', '15:00'),
  (1025, 1, '22:00', '06:00'),
  (1026, 6, '21:00', '23:30'),
  (1027, 2, '19:00', '22:00'), (1027, 4, '19:00', '22:00'),
  (1028, 2, '09:00', '12:00'), (1028, 6, '09:00', '12:00'),
  (1029, 1, '09:00', '18:00'),
  (1030, 6, '09:00', '14:00'),
  (1031, 6, '19:00', '23:00'),
  (1032, 3, '13:00', '18:00'), (1032, 5, '13:00', '18:00'),
  (1033, 2, '18:00', '22:00'), (1033, 4, '18:00', '22:00'),
  (1034, 6, '09:00', '13:00'),
  (1035, 2, '06:30', '11:30'), (1035, 3, '06:30', '11:30'),
  (1037, 4, '18:00', '21:00'), (1037, 6, '14:00', '17:00'),
  (1038, 2, '18:00', '21:00'), (1038, 4, '18:00', '21:00'),
  (1039, 1, '09:00', '17:00'), (1039, 3, '09:00', '17:00'),
  (1040, 1, '09:00', '18:00'), (1040, 5, '09:00', '18:00'),
  (1041, 2, '09:00', '18:00'), (1041, 3, '09:00', '18:00'),
  (1042, 6, '14:00', '18:00'),
  (1047, 2, '09:00', '15:00'), (1047, 4, '13:00', '19:00');

-- =====================================================================
-- 6. KỸ NĂNG CỦA TIN TUYỂN DỤNG
-- =====================================================================

INSERT INTO job_post_skills (job_post_id, skill_id) VALUES
  (1001, 2), (1001, 1),
  (1002, 1), (1002, 2),
  (1003, 1),
  (1004, 1), (1004, 2),
  (1005, 2),
  (1006, 2),
  (1007, 1),
  (1008, 2),
  (1009, 2),
  (1010, 2),
  (1011, 3),
  (1012, 3),
  (1013, 3),
  (1014, 3),
  (1015, 2),
  (1016, 4), (1016, 2),
  (1017, 4), (1017, 10),
  (1018, 4),
  (1019, 4),
  (1020, 2),
  (1021, 10),
  (1022, 5),
  (1023, 5),
  (1024, 11),
  (1025, 2),
  (1026, 2),
  (1027, 6), (1027, 7),
  (1028, 6), (1028, 14),
  (1029, 6),
  (1030, 6), (1030, 7),
  (1031, 6),
  (1032, 7),
  (1033, 7),
  (1034, 7),
  (1035, 2),
  (1037, 8), (1037, 12),
  (1038, 8),
  (1039, 9),
  (1040, 9), (1040, 15),
  (1041, 9),
  (1042, 9),
  (1043, 2),
  (1044, 2),
  (1045, 10),
  (1046, 3),
  (1047, 4), (1047, 10),
  (1048, 2);

-- =====================================================================
-- 7. ĐƠN ỨNG TUYỂN + TIMELINE
-- =====================================================================
-- Đủ cả 6 trạng thái: PENDING · SHORTLISTED · ACCEPTED · COMPLETED ·
-- REJECTED · WITHDRAWN.

INSERT INTO applications (id, slug, job_post_id, student_id, cover_letter, expected_salary, status, employer_note, reject_reason, experience, available_from, cv_url, cv_file_name, applied_at, reviewed_at, decided_at, updated_at) VALUES
  -- --- Sinh viên chính (1001) — dùng cho video demo ---
  (1101, 'demo-app-001', 1001, 1001, 'Em chào anh/chị, em đang là sinh viên năm 3 và muốn làm thêm để rèn kinh nghiệm phục vụ. Em có 1 năm làm phục vụ tại quán cà phê nên quen với việc đón khách và pha chế cơ bản. Em sẵn sàng làm ca sáng hoặc ca tối như tin đăng.', 32000, 'COMPLETED', 'Đã làm xong 8 ca ca tối, em rất chuyên nghiệp và đúng giờ.', NULL, 'Có 1 năm kinh nghiệm phục vụ quán cà phê, pha chế cơ bản và xử lý thanh toán.', '2026-11-24', NULL, NULL, '2026-11-15 09:00:00', '2026-11-17 09:00:00', '2026-11-18 09:00:00', '2026-11-24 09:00:00'),
  (1102, 'demo-app-002', 1027, 1001, 'Em muốn thử sức ở mảng marketing để mở rộng kiến thức ngoài chuyên ngành. Em quen Canva và viết nội dung mạng xã hội, sẵn sàng làm remote 15-20h/tuần.', 5000000, 'PENDING', NULL, NULL, 'Không có kinh nghiệm thực tế, nhưng đã làm content cho các bài tập nhóm và fanpage câu lạc bộ.', '2026-11-26', NULL, NULL, '2026-11-18 09:00:00', '2026-11-18 09:00:00', NULL, '2026-11-18 09:00:00'),
  (1103, 'demo-app-003', 1003, 1001, 'Em xin ứng tuyển vị trí pha chế trà sữa ca tối. Em từng pha chè và cà phê hơn 1 năm, rất thích môi trường làm việc đông vui.', 26000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, '1 năm pha chè Táo Tào và 6 tháng barista tại Café_The_Space.', '2026-11-25', NULL, NULL, '2026-11-16 09:00:00', '2026-11-17 09:00:00', NULL, '2026-11-17 09:00:00'),
  (1104, 'demo-app-004', 1019, 1001, 'Em xin ứng tuyển vị trí thu ngân ca đêm. Em quen với thao tác thanh toán và kiểm kê từ ca tối.', 35000, 'COMPLETED', 'Đã làm xong 8 ca, ứng viên rất chuyên nghiệp.', NULL, 'Không có kinh nghiệm thu ngân chuyên nghiệp, nhưng đã làm thu ngân bán lẻ 8 tháng.', '2026-10-20', NULL, NULL, '2026-10-23 09:00:00', '2026-10-25 09:00:00', '2026-11-05 09:00:00', '2026-11-05 09:00:00'),
  (1105, 'demo-app-005', 1018, 1001, 'Em xin ứng tuyển vị trí thu ngân part-time. Em có kinh nghiệm đón khách và xử lý thủ tục cơ bản.', 28000, 'COMPLETED', 'Đã làm xong 6 ca, trả lương đúng hẹn.', NULL, 'Có 8 tháng làm thu ngân bán lẻ, quen phần mềm POS.', '2026-10-29', NULL, NULL, '2026-10-29 09:00:00', '2026-10-31 09:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00'),
  (1106, 'demo-app-006', 1020, 1001, 'Em xin ứng tuyển vị trí lễ tân part-time. Em từng đón khách ở quán cà phê nên quen xử lý thủ tục cơ bản.', 27000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '1 năm phục vụ quán cà phê.', '2026-11-19', NULL, NULL, '2026-11-13 09:00:00', '2026-11-15 09:00:00', '2026-11-15 09:00:00', '2026-11-15 09:00:00'),
  (1107, 'demo-app-007', 1043, 1001, 'Em xin ứng tuyển vị trí phục vụ. Em sẵn sàng làm ngay.', 33000, 'WITHDRAWN', NULL, 'Đã tìm được việc phù hợp hơn.', 'Không có kinh nghiệm.', '2026-11-20', NULL, NULL, '2026-11-16 09:00:00', '2026-11-16 09:00:00', '2026-11-17 09:00:00', '2026-11-17 09:00:00'),

  -- --- Sinh viên khác ---
  (1108, 'demo-app-008', 1027, 1010, 'Em là sinh viên Marketing năm 4, đã quen với Canva, CapCut và viết content bán hàng. Em muốn được làm việc thật để hoàn thiện portfolio.', 5000000, 'PENDING', NULL, NULL, 'Freelance content cho 3 thương hiệu mỹ phẩm trong 1 năm.', '2026-11-27', NULL, NULL, '2026-11-17 09:00:00', '2026-11-17 09:00:00', NULL, '2026-11-17 09:00:00'),
  (1109, 'demo-app-009', 1027, 1015, 'Em thấy vị trí này phù hợp với kỹ năng của em. Em có thể hỗ trợ phần landing page và tracking.', 4500000, 'COMPLETED', 'Đã làm xong chiến dịch, em tự chủ động và có sáng kiến.', NULL, 'Có project cá nhân React, tự học và tự build.', '2026-11-25', NULL, NULL, '2026-11-15 09:00:00', '2026-11-17 09:00:00', '2026-11-18 09:00:00', '2026-11-26 09:00:00'),
  (1110, 'demo-app-010', 1020, 1012, 'Em là sinh viên năm 2, muốn làm thêm lễ tân để cải thiện giao tiếp.', 27000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Chưa có kinh nghiệm.', '2026-11-19', NULL, NULL, '2026-11-14 09:00:00', '2026-11-15 09:00:00', '2026-11-15 09:00:00', '2026-11-15 09:00:00'),
  (1111, 'demo-app-011', 1019, 1014, 'Em muốn làm ca đêm để kiếm thêm thu nhập.', 35000, 'COMPLETED', 'Đã làm xong 2 ca, trả lương đúng hẹn.', NULL, 'Không có kinh nghiệm, nhưng làm được ca đêm.', '2026-11-07', NULL, NULL, '2026-11-05 09:00:00', '2026-11-07 09:00:00', '2026-11-13 09:00:00', '2026-11-13 09:00:00'),
  (1112, 'demo-app-012', 1004, 1019, 'Em xin ứng tuyển vị trí nhân viên phục vụ. Em có thể làm ca sáng và ca tối.', 5500000, 'COMPLETED', 'Đã làm xong 6 ca, em rất chuyên nghiệp và đúng giờ.', NULL, 'Đã làm thu ngân và bán hàng 8 tháng.', '2026-11-28', NULL, NULL, '2026-11-16 09:00:00', '2026-11-18 09:00:00', '2026-11-19 09:00:00', '2026-11-26 09:00:00'),
  (1113, 'demo-app-013', 1022, 1013, 'Em có xe máy và CCCD gắn chip, sẵn sàng giao hàng khu vực Thủ Đức.', 30000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca sáng.', NULL, 'Đã giao hàng GrabFood 7 tháng.', '2026-11-24', NULL, NULL, '2026-11-16 09:00:00', '2026-11-17 09:00:00', '2026-11-18 09:00:00', '2026-11-18 09:00:00'),
  (1114, 'demo-app-014', 1036, 1012, 'Em là sinh viên Sư phạm Toán năm 2, đã gia sư khóa 9-10 trong 2 năm. Em muốn tiếp tục dạy THPT.', 100000, 'PENDING', NULL, NULL, '2 năm trợ giảng Toán cấp 9-10.', '2026-11-25', NULL, NULL, '2026-11-20 09:00:00', '2026-11-20 09:00:00', NULL, '2026-11-20 09:00:00'),
  (1115, 'demo-app-015', 1040, 1011, 'Em nắm rõ React và TypeScript, có 2 project cá nhân trên GitHub. Em muốn học hỏi trong môi trường làm việc thật.', 6000000, 'SHORTLISTED', 'Portfolio khá tốt, mời phỏng vấn kỹ thuật.', NULL, '3 project cá nhân: web bán hàng, dashboard quản lý, landing page.', '2026-11-27', NULL, NULL, '2026-11-19 09:00:00', '2026-11-21 09:00:00', NULL, '2026-11-21 09:00:00'),
  (1116, 'demo-app-016', 1039, 1017, 'Em biết kiểm thử cơ bản, từng làm project trường có test case. Em sẵn sàng làm remote.', 3500000, 'PENDING', NULL, NULL, 'Project môn Testing, viết test case và report lỗi.', '2026-11-28', NULL, NULL, '2026-11-21 09:00:00', '2026-11-21 09:00:00', NULL, '2026-11-21 09:00:00'),
  (1117, 'demo-app-017', 1005, 1014, 'Em xin ứng tuyển vị trí phục vụ ca chiều. Em có kinh nghiệm đón khách.', 9500000, 'COMPLETED', 'Ứng viên làm việc chăm chỉ, khách hàng phản hồi tốt.', NULL, '1 năm phục vụ quán cà phê.', '2026-11-02', NULL, NULL, '2026-11-01 09:00:00', '2026-11-03 09:00:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00'),
  (1118, 'demo-app-018', 1028, 1016, 'Em là sinh viên Kinh tế quốc tế, viết content mạng xã hội từ năm 2 và có kinh nghiệm SEO cơ bản.', 3000000, 'COMPLETED', 'Đã hoàn thành chuỗi content tháng, bài viết đúng tone thương hiệu.', NULL, 'Freelance content 1 năm, quen Google Analytics.', '2026-11-25', NULL, NULL, '2026-11-18 09:00:00', '2026-11-19 09:00:00', '2026-11-20 09:00:00', '2026-11-27 09:00:00'),
  (1119, 'demo-app-019', 1034, 1019, 'Em thành thạo Excel và đã làm kế toán thực tập tại công ty trong 2 tháng.', 30000, 'PENDING', NULL, NULL, 'Thực tập kế toán 2 tháng, nhập sổ và đối chiếu chứng từ.', '2026-11-29', NULL, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00', NULL, '2026-11-22 09:00:00'),
  (1120, 'demo-app-020', 1002, 1018, 'Em xin ứng tuyển vị trí nhân viên cửa hàng cuối tuần tại Táo Tào. Em yêu thích làm việc với nước và đồ ăn.', 26000, 'REJECTED', 'Hồ sơ phù hợp nhưng vị trí đã đủ người.', 'Hồ sơ phù hợp nhưng vị trí đã đủ người.', 'Không có kinh nghiệm.', '2026-11-23', NULL, NULL, '2026-11-18 09:00:00', '2026-11-19 09:00:00', '2026-11-19 09:00:00', '2026-11-19 09:00:00'),
  (1121, 'demo-app-021', 1011, 1019, 'Em từng làm bánh ngọt cho sinh hoạt và rất thích làm bánh trang trí.', 28000, 'PENDING', NULL, NULL, 'Làm bánh ngọt tự do 2 năm, có bán online.', '2026-11-24', NULL, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00', NULL, '2026-11-22 09:00:00'),
  (1122, 'demo-app-022', 1006, 1020, 'Em xin ứng tuyển vị trí phục vụ ca sáng. Em sức khỏe tốt, chịu được dậy sớm.', 6000000, 'PENDING', NULL, NULL, 'Chưa có kinh nghiệm nhưng chịu được ca sáng.', '2026-11-24', NULL, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00', NULL, '2026-11-22 09:00:00'),
  (1123, 'demo-app-023', 1043, 1020, 'Em xin ứng tuyển vị trí phục vụ ca đêm. Em khỏe và quen ca đêm.', 34000, 'PENDING', NULL, NULL, 'Đã giao hàng ca đêm nhiều lần.', '2026-11-23', NULL, NULL, '2026-11-22 09:00:00', '2026-11-22 09:00:00', NULL, '2026-11-22 09:00:00'),
  (1124, 'demo-app-024', 1009, 1013, 'Em xin ứng tuyển ca tiệc 8 tiếng. Em sẵn sàng dậy từ 4h sáng.', 62000, 'COMPLETED', 'Đã làm xong ca tiệc, em đúng giờ và chuyên nghiệp.', NULL, 'Giao hàng ca sáng 7 tháng.', '2026-11-25', NULL, NULL, '2026-11-20 09:00:00', '2026-11-21 09:00:00', '2026-11-22 09:00:00', '2026-11-28 09:00:00'),
  (1125, 'demo-app-025', 1012, 1015, 'Em thành thạo món Việt và món Á, có 2 năm kinh nghiệm bếp nhà hàng.', 14000000, 'COMPLETED', 'Đã làm xong ca, món ăn đạt yêu cầu và bếp ghi nhận tiến bộ rõ rệt.', NULL, '2 năm bếp nhà hàng, 6 tháng bếp chính.', '2026-11-30', NULL, NULL, '2026-11-21 09:00:00', '2026-11-22 09:00:00', '2026-11-23 09:00:00', '2026-11-29 09:00:00');

-- Lịch sử trạng thái đơn ứng tuyển (timeline)
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, changed_at) VALUES
  (1101, NULL, 'PENDING', 1001, NULL, '2026-11-15 09:00:00'),
  (1101, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp yêu cầu', '2026-11-17 09:00:00'),
  (1101, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận vào làm ca tối', '2026-11-18 09:00:00'),
  (1101, 'ACCEPTED', 'COMPLETED', 1002, 'Hoàn thành công việc', '2026-11-24 09:00:00'),
  (1102, NULL, 'PENDING', 1001, NULL, '2026-11-18 09:00:00'),
  (1103, NULL, 'PENDING', 1001, NULL, '2026-11-16 09:00:00'),
  (1103, 'PENDING', 'SHORTLISTED', 1104, 'Mời phỏng vấn nhanh qua điện thoại', '2026-11-17 09:00:00'),
  (1104, NULL, 'PENDING', 1001, NULL, '2026-10-23 09:00:00'),
  (1104, 'PENDING', 'SHORTLISTED', 1102, 'Hồ sơ phù hợp', '2026-10-24 09:00:00'),
  (1104, 'SHORTLISTED', 'ACCEPTED', 1102, 'Đã nhận', '2026-10-25 09:00:00'),
  (1104, 'ACCEPTED', 'COMPLETED', 1102, 'Hoàn thành công việc', '2026-11-05 09:00:00'),
  (1105, NULL, 'PENDING', 1001, NULL, '2026-10-29 09:00:00'),
  (1105, 'PENDING', 'ACCEPTED', 1102, 'Đã nhận', '2026-10-31 09:00:00'),
  (1105, 'ACCEPTED', 'COMPLETED', 1102, 'Hoàn thành công việc', '2026-11-10 09:00:00'),
  (1106, NULL, 'PENDING', 1001, NULL, '2026-11-13 09:00:00'),
  (1106, 'PENDING', 'REJECTED', 1002, 'Đã tuyển đủ', '2026-11-15 09:00:00'),
  (1107, NULL, 'PENDING', 1001, NULL, '2026-11-16 09:00:00'),
  (1107, 'PENDING', 'WITHDRAWN', 1001, 'Đã tìm được việc phù hợp hơn', '2026-11-17 09:00:00'),
  (1108, NULL, 'PENDING', 1010, NULL, '2026-11-17 09:00:00'),
  (1109, NULL, 'PENDING', 1015, NULL, '2026-11-15 09:00:00'),
  (1109, 'PENDING', 'SHORTLISTED', 1002, 'Kỹ năng phù hợp', '2026-11-17 09:00:00'),
  (1109, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận', '2026-11-18 09:00:00'),
  (1109, 'ACCEPTED', 'COMPLETED', 1002, 'Hoàn thành công việc', '2026-11-26 09:00:00'),
  (1110, NULL, 'PENDING', 1012, NULL, '2026-11-14 09:00:00'),
  (1110, 'PENDING', 'REJECTED', 1100, 'Đã tuyển đủ', '2026-11-15 09:00:00'),
  (1111, NULL, 'PENDING', 1014, NULL, '2026-11-05 09:00:00'),
  (1111, 'PENDING', 'ACCEPTED', 1102, 'Đã nhận', '2026-11-07 09:00:00'),
  (1111, 'ACCEPTED', 'COMPLETED', 1102, 'Hoàn thành công việc', '2026-11-13 09:00:00'),
  (1112, NULL, 'PENDING', 1019, NULL, '2026-11-16 09:00:00'),
  (1112, 'PENDING', 'SHORTLISTED', 1107, 'Hồ sơ tốt, mời phỏng vấn', '2026-11-18 09:00:00'),
  (1112, 'SHORTLISTED', 'ACCEPTED', 1107, 'Đã nhận', '2026-11-19 09:00:00'),
  (1112, 'ACCEPTED', 'COMPLETED', 1107, 'Hoàn thành công việc', '2026-11-26 09:00:00'),
  (1113, NULL, 'PENDING', 1013, NULL, '2026-11-16 09:00:00'),
  (1113, 'PENDING', 'SHORTLISTED', 1100, 'Có xe, giao hàng quen', '2026-11-17 09:00:00'),
  (1113, 'SHORTLISTED', 'ACCEPTED', 1100, 'Đã nhận, mời bắt đầu ca sáng', '2026-11-18 09:00:00'),
  (1114, NULL, 'PENDING', 1012, NULL, '2026-11-20 09:00:00'),
  (1115, NULL, 'PENDING', 1011, NULL, '2026-11-19 09:00:00'),
  (1115, 'PENDING', 'SHORTLISTED', 1100, 'Portfolio khá tốt, mời phỏng vấn kỹ thuật', '2026-11-21 09:00:00'),
  (1116, NULL, 'PENDING', 1017, NULL, '2026-11-21 09:00:00'),
  (1117, NULL, 'PENDING', 1014, NULL, '2026-11-01 09:00:00'),
  (1117, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp', '2026-11-02 09:00:00'),
  (1117, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận', '2026-11-03 09:00:00'),
  (1117, 'ACCEPTED', 'COMPLETED', 1002, 'Hoàn thành công việc', '2026-11-20 09:00:00'),
  (1118, NULL, 'PENDING', 1016, NULL, '2026-11-18 09:00:00'),
  (1118, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ tốt', '2026-11-19 09:00:00'),
  (1118, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận, mời bắt đầu tuần sau', '2026-11-20 09:00:00'),
  (1118, 'ACCEPTED', 'COMPLETED', 1002, 'Hoàn thành công việc', '2026-11-27 09:00:00'),
  (1119, NULL, 'PENDING', 1019, NULL, '2026-11-22 09:00:00'),
  (1120, NULL, 'PENDING', 1018, NULL, '2026-11-18 09:00:00'),
  (1120, 'PENDING', 'REJECTED', 1102, 'Vị trí đã đủ người', '2026-11-19 09:00:00'),
  (1121, NULL, 'PENDING', 1019, NULL, '2026-11-22 09:00:00'),
  (1122, NULL, 'PENDING', 1020, NULL, '2026-11-22 09:00:00'),
  (1123, NULL, 'PENDING', 1020, NULL, '2026-11-22 09:00:00'),
  (1124, NULL, 'PENDING', 1013, NULL, '2026-11-20 09:00:00'),
  (1124, 'PENDING', 'SHORTLISTED', 1101, 'Sẵn sàng ca sáng', '2026-11-21 09:00:00'),
  (1124, 'SHORTLISTED', 'ACCEPTED', 1101, 'Đã nhận, xác nhận lịch tiệc', '2026-11-22 09:00:00'),
  (1124, 'ACCEPTED', 'COMPLETED', 1101, 'Hoàn thành công việc', '2026-11-28 09:00:00'),
  (1125, NULL, 'PENDING', 1015, NULL, '2026-11-21 09:00:00'),
  (1125, 'PENDING', 'SHORTLISTED', 1106, 'Kinh nghiệm phù hợp, mời phỏng vấn trực tiếp', '2026-11-22 09:00:00'),
  (1125, 'SHORTLISTED', 'ACCEPTED', 1106, 'Đã nhận', '2026-11-23 09:00:00'),
  (1125, 'ACCEPTED', 'COMPLETED', 1106, 'Hoàn thành công việc', '2026-11-29 09:00:00');

-- =====================================================================
-- 7b. ĐƠN ỨNG TUYỂN CHÉO (sinh từ nhóm sinh viên mở rộng)
-- =====================================================================
-- Mỗi tin tuyển dụng đang mở có 2-6 ứng viên THẬT. Đơn được sinh
-- theo mức độ phù hợp (kỹ năng + tỉnh + mục tiêu việc làm) nên
-- hồ sơ ứng viên nhìn "có lý do" chứ không phải số ngẫu nhiên.
--
-- Mọi bộ đếm (applicant_count, positions_filled, view_count) được
-- TÍNH LẠI ở Section 16 từ chính những dòng đơn này.

INSERT INTO applications (id, slug, job_post_id, student_id, cover_letter, expected_salary, status, employer_note, reject_reason, experience, available_from, cv_url, cv_file_name, applied_at, reviewed_at, decided_at, updated_at) VALUES
  (1200, 'demo-app-100', 1001, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 35000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-22', NULL, NULL, '2026-11-19 02:00:00', NULL, NULL, '2026-11-19 02:00:00'),
  (1201, 'demo-app-101', 1001, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 35000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-23', NULL, NULL, '2026-11-20 02:00:00', '2026-11-22 02:00:00', '2026-11-22 02:00:00', '2026-11-20 02:00:00'),
  (1202, 'demo-app-102', 1001, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 35000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-24', NULL, NULL, '2026-11-21 02:00:00', '2026-11-23 02:00:00', '2026-11-23 02:00:00', '2026-11-21 02:00:00'),
  (1203, 'demo-app-103', 1002, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-24', NULL, NULL, '2026-11-21 02:00:00', NULL, NULL, '2026-11-21 02:00:00'),
  (1204, 'demo-app-104', 1002, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-25', NULL, NULL, '2026-11-22 02:00:00', '2026-11-24 02:00:00', '2026-11-24 02:00:00', '2026-11-22 02:00:00'),
  (1205, 'demo-app-105', 1002, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-21', NULL, NULL, '2026-11-18 02:00:00', '2026-11-20 02:00:00', NULL, '2026-11-18 02:00:00'),
  (1206, 'demo-app-106', 1003, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-21', NULL, NULL, '2026-11-18 02:00:00', NULL, NULL, '2026-11-18 02:00:00'),
  (1207, 'demo-app-107', 1003, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-22', NULL, NULL, '2026-11-19 02:00:00', '2026-11-21 02:00:00', NULL, '2026-11-19 02:00:00'),
  (1208, 'demo-app-108', 1004, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-22', NULL, NULL, '2026-11-19 02:00:00', NULL, NULL, '2026-11-19 02:00:00'),
  (1209, 'demo-app-109', 1004, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-23', NULL, NULL, '2026-11-20 02:00:00', '2026-11-22 02:00:00', '2026-11-22 02:00:00', '2026-11-20 02:00:00'),
  (1210, 'demo-app-110', 1004, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-19', NULL, NULL, '2026-11-16 02:00:00', '2026-11-18 02:00:00', '2026-11-18 02:00:00', '2026-11-16 02:00:00'),
  (1211, 'demo-app-111', 1005, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 10300000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-19', NULL, NULL, '2026-11-16 02:00:00', NULL, NULL, '2026-11-16 02:00:00'),
  (1212, 'demo-app-112', 1005, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 10300000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-20', NULL, NULL, '2026-11-17 02:00:00', '2026-11-19 02:00:00', '2026-11-19 02:00:00', '2026-11-17 02:00:00'),
  (1213, 'demo-app-113', 1006, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-20', NULL, NULL, '2026-11-17 02:00:00', NULL, NULL, '2026-11-17 02:00:00'),
  (1214, 'demo-app-114', 1006, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-21', NULL, NULL, '2026-11-18 02:00:00', '2026-11-20 02:00:00', NULL, '2026-11-18 02:00:00'),
  (1215, 'demo-app-115', 1006, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-17', NULL, NULL, '2026-11-14 02:00:00', '2026-11-16 02:00:00', '2026-11-16 02:00:00', '2026-11-14 02:00:00'),
  (1216, 'demo-app-116', 1007, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 38000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-17', NULL, NULL, '2026-11-14 02:00:00', NULL, NULL, '2026-11-14 02:00:00'),
  (1217, 'demo-app-117', 1007, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 38000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-18', NULL, NULL, '2026-11-15 02:00:00', '2026-11-17 02:00:00', NULL, '2026-11-15 02:00:00'),
  (1218, 'demo-app-118', 1008, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-18', NULL, NULL, '2026-11-15 02:00:00', NULL, NULL, '2026-11-15 02:00:00'),
  (1219, 'demo-app-119', 1008, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-19', NULL, NULL, '2026-11-16 02:00:00', '2026-11-18 02:00:00', NULL, '2026-11-16 02:00:00'),
  (1220, 'demo-app-120', 1008, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-15', NULL, NULL, '2026-11-12 02:00:00', '2026-11-14 02:00:00', '2026-11-14 02:00:00', '2026-11-12 02:00:00'),
  (1221, 'demo-app-121', 1009, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 62000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-25', NULL, NULL, '2026-11-22 02:00:00', NULL, NULL, '2026-11-22 02:00:00'),
  (1222, 'demo-app-122', 1009, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 62000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-26', NULL, NULL, '2026-11-23 02:00:00', '2026-11-25 02:00:00', '2026-11-25 02:00:00', '2026-11-23 02:00:00'),
  (1223, 'demo-app-123', 1009, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 62000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-27', NULL, NULL, '2026-11-24 02:00:00', '2026-11-26 02:00:00', '2026-11-26 02:00:00', '2026-11-24 02:00:00'),
  (1224, 'demo-app-124', 1010, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-18', NULL, NULL, '2026-11-15 02:00:00', NULL, NULL, '2026-11-15 02:00:00'),
  (1225, 'demo-app-125', 1010, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-14', NULL, NULL, '2026-11-11 02:00:00', '2026-11-13 02:00:00', NULL, '2026-11-11 02:00:00'),
  (1226, 'demo-app-126', 1010, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-15', NULL, NULL, '2026-11-12 02:00:00', '2026-11-14 02:00:00', '2026-11-14 02:00:00', '2026-11-12 02:00:00'),
  (1227, 'demo-app-127', 1011, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 32000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-15', NULL, NULL, '2026-11-12 02:00:00', NULL, NULL, '2026-11-12 02:00:00'),
  (1228, 'demo-app-128', 1012, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 15000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-15', NULL, NULL, '2026-11-12 02:00:00', NULL, NULL, '2026-11-12 02:00:00'),
  (1229, 'demo-app-129', 1013, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-15', NULL, NULL, '2026-11-12 02:00:00', NULL, NULL, '2026-11-12 02:00:00'),
  (1230, 'demo-app-130', 1013, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-11', NULL, NULL, '2026-11-08 02:00:00', '2026-11-10 02:00:00', NULL, '2026-11-08 02:00:00'),
  (1231, 'demo-app-131', 1013, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 28000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-12', NULL, NULL, '2026-11-09 02:00:00', '2026-11-11 02:00:00', '2026-11-11 02:00:00', '2026-11-09 02:00:00'),
  (1232, 'demo-app-132', 1014, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-12', NULL, NULL, '2026-11-09 02:00:00', NULL, NULL, '2026-11-09 02:00:00'),
  (1233, 'demo-app-133', 1014, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-13', NULL, NULL, '2026-11-10 02:00:00', '2026-11-12 02:00:00', NULL, '2026-11-10 02:00:00'),
  (1234, 'demo-app-134', 1014, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-14', NULL, NULL, '2026-11-11 02:00:00', '2026-11-13 02:00:00', '2026-11-13 02:00:00', '2026-11-11 02:00:00'),
  (1235, 'demo-app-135', 1015, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 23000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-09', NULL, NULL, '2026-11-06 02:00:00', NULL, NULL, '2026-11-06 02:00:00'),
  (1236, 'demo-app-136', 1015, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 23000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-10', NULL, NULL, '2026-11-07 02:00:00', '2026-11-09 02:00:00', NULL, '2026-11-07 02:00:00'),
  (1237, 'demo-app-137', 1015, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 23000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-11', NULL, NULL, '2026-11-08 02:00:00', '2026-11-10 02:00:00', '2026-11-10 02:00:00', '2026-11-08 02:00:00'),
  (1238, 'demo-app-138', 1016, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4500000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-11', NULL, NULL, '2026-11-08 02:00:00', '2026-11-10 02:00:00', '2026-11-10 02:00:00', '2026-11-08 02:00:00'),
  (1239, 'demo-app-139', 1016, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4500000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-12', NULL, NULL, '2026-11-09 02:00:00', NULL, NULL, '2026-11-09 02:00:00'),
  (1240, 'demo-app-140', 1016, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4500000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-08', NULL, NULL, '2026-11-05 02:00:00', '2026-11-07 02:00:00', NULL, '2026-11-05 02:00:00'),
  (1241, 'demo-app-141', 1016, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4500000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-09', NULL, NULL, '2026-11-06 02:00:00', '2026-11-08 02:00:00', NULL, '2026-11-06 02:00:00'),
  (1242, 'demo-app-142', 1017, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4840000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-09', NULL, NULL, '2026-11-06 02:00:00', NULL, NULL, '2026-11-06 02:00:00'),
  (1243, 'demo-app-143', 1017, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4840000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-10', NULL, NULL, '2026-11-07 02:00:00', '2026-11-09 02:00:00', '2026-11-09 02:00:00', '2026-11-07 02:00:00'),
  (1244, 'demo-app-144', 1017, 1025, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4840000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, pos, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-11', NULL, NULL, '2026-11-08 02:00:00', '2026-11-10 02:00:00', NULL, '2026-11-08 02:00:00'),
  (1245, 'demo-app-145', 1018, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-06', NULL, NULL, '2026-11-03 02:00:00', NULL, NULL, '2026-11-03 02:00:00'),
  (1246, 'demo-app-146', 1018, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-07', NULL, NULL, '2026-11-04 02:00:00', '2026-11-06 02:00:00', '2026-11-06 02:00:00', '2026-11-04 02:00:00'),
  (1247, 'demo-app-147', 1021, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 34000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-03', NULL, NULL, '2026-10-31 02:00:00', NULL, NULL, '2026-10-31 02:00:00'),
  (1248, 'demo-app-148', 1021, 1025, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 34000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, pos, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-04', NULL, NULL, '2026-11-01 02:00:00', '2026-11-03 02:00:00', NULL, '2026-11-01 02:00:00'),
  (1249, 'demo-app-149', 1021, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 34000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-05', NULL, NULL, '2026-11-02 02:00:00', '2026-11-04 02:00:00', '2026-11-04 02:00:00', '2026-11-02 02:00:00'),
  (1250, 'demo-app-150', 1022, 1024, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Cơ khí năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 32000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: driver, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-31', NULL, NULL, '2026-10-28 02:00:00', NULL, NULL, '2026-10-28 02:00:00'),
  (1251, 'demo-app-151', 1022, 1026, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Vận tải năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 32000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: driver, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-01', NULL, NULL, '2026-10-29 02:00:00', '2026-10-31 02:00:00', '2026-10-31 02:00:00', '2026-10-29 02:00:00'),
  (1252, 'demo-app-152', 1023, 1024, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Cơ khí năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: driver, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-01', NULL, NULL, '2026-10-29 02:00:00', NULL, NULL, '2026-10-29 02:00:00'),
  (1253, 'demo-app-153', 1023, 1026, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Vận tải năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: driver, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-02', NULL, NULL, '2026-10-30 02:00:00', '2026-11-01 02:00:00', NULL, '2026-10-30 02:00:00'),
  (1254, 'demo-app-154', 1024, 1044, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 29000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: driver, manual-test, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-11-02', NULL, NULL, '2026-10-30 02:00:00', NULL, NULL, '2026-10-30 02:00:00'),
  (1255, 'demo-app-155', 1024, 1046, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 29000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: driver, stock. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-29', NULL, NULL, '2026-10-26 02:00:00', '2026-10-28 02:00:00', NULL, '2026-10-26 02:00:00'),
  (1256, 'demo-app-156', 1025, 1042, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 5720000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: service, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-29', NULL, NULL, '2026-10-26 02:00:00', NULL, NULL, '2026-10-26 02:00:00'),
  (1257, 'demo-app-157', 1025, 1043, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Công nghệ thông tin năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 5720000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, excel, manual-test. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-30', NULL, NULL, '2026-10-27 02:00:00', '2026-10-29 02:00:00', NULL, '2026-10-27 02:00:00'),
  (1258, 'demo-app-158', 1026, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 25000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-30', NULL, NULL, '2026-10-27 02:00:00', NULL, NULL, '2026-10-27 02:00:00'),
  (1259, 'demo-app-159', 1026, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 25000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-31', NULL, NULL, '2026-10-28 02:00:00', '2026-10-30 02:00:00', NULL, '2026-10-28 02:00:00'),
  (1260, 'demo-app-160', 1026, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 25000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-27', NULL, NULL, '2026-10-24 02:00:00', '2026-10-26 02:00:00', '2026-10-26 02:00:00', '2026-10-24 02:00:00'),
  (1261, 'demo-app-161', 1028, 1037, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4000000, 'ACCEPTED', 'Đã nhận, mời bắt đầu ca làm việc.', NULL, 'Kỹ năng hiện có: service, content, design, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-27', NULL, NULL, '2026-10-24 02:00:00', '2026-10-26 02:00:00', '2026-10-26 02:00:00', '2026-10-24 02:00:00'),
  (1262, 'demo-app-162', 1028, 1033, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kinh tế quốc tế năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, content, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-28', NULL, NULL, '2026-10-25 02:00:00', NULL, NULL, '2026-10-25 02:00:00'),
  (1263, 'demo-app-163', 1029, 1040, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: content, teaching, translate, design. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-28', NULL, NULL, '2026-10-25 02:00:00', NULL, NULL, '2026-10-25 02:00:00'),
  (1264, 'demo-app-164', 1029, 1050, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4000000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, teaching. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-29', NULL, NULL, '2026-10-26 02:00:00', '2026-10-28 02:00:00', NULL, '2026-10-26 02:00:00'),
  (1265, 'demo-app-165', 1030, 1031, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3000000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: content, excel, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-24', NULL, NULL, '2026-10-21 02:00:00', '2026-10-23 02:00:00', '2026-10-23 02:00:00', '2026-10-21 02:00:00'),
  (1266, 'demo-app-166', 1030, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-25', NULL, NULL, '2026-10-22 02:00:00', NULL, NULL, '2026-10-22 02:00:00'),
  (1267, 'demo-app-167', 1030, 1025, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3000000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, pos, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-26', NULL, NULL, '2026-10-23 02:00:00', '2026-10-25 02:00:00', NULL, '2026-10-23 02:00:00'),
  (1268, 'demo-app-168', 1031, 1025, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: content, pos, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-26', NULL, NULL, '2026-10-23 02:00:00', NULL, NULL, '2026-10-23 02:00:00'),
  (1269, 'demo-app-169', 1031, 1031, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 30000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, excel, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-27', NULL, NULL, '2026-10-24 02:00:00', '2026-10-26 02:00:00', NULL, '2026-10-24 02:00:00'),
  (1270, 'demo-app-170', 1032, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3500000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-22', NULL, NULL, '2026-10-19 02:00:00', NULL, NULL, '2026-10-19 02:00:00'),
  (1271, 'demo-app-171', 1032, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3500000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-23', NULL, NULL, '2026-10-20 02:00:00', '2026-10-22 02:00:00', NULL, '2026-10-20 02:00:00'),
  (1272, 'demo-app-172', 1032, 1031, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 3500000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: content, excel, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-24', NULL, NULL, '2026-10-21 02:00:00', '2026-10-23 02:00:00', '2026-10-23 02:00:00', '2026-10-21 02:00:00'),
  (1273, 'demo-app-173', 1033, 1042, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: service, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-24', NULL, NULL, '2026-10-21 02:00:00', NULL, NULL, '2026-10-21 02:00:00'),
  (1274, 'demo-app-174', 1033, 1043, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Công nghệ thông tin năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 27000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, excel, manual-test. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-25', NULL, NULL, '2026-10-22 02:00:00', '2026-10-24 02:00:00', NULL, '2026-10-22 02:00:00'),
  (1275, 'demo-app-175', 1034, 1034, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Sư phạm Toán năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 33000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: excel, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-20', NULL, NULL, '2026-10-17 02:00:00', NULL, NULL, '2026-10-17 02:00:00'),
  (1276, 'demo-app-176', 1035, 1023, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Hóa học năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-20', NULL, NULL, '2026-10-17 02:00:00', NULL, NULL, '2026-10-17 02:00:00'),
  (1277, 'demo-app-177', 1035, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-21', NULL, NULL, '2026-10-18 02:00:00', '2026-10-20 02:00:00', NULL, '2026-10-18 02:00:00'),
  (1278, 'demo-app-178', 1035, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 24000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-22', NULL, NULL, '2026-10-19 02:00:00', '2026-10-21 02:00:00', '2026-10-21 02:00:00', '2026-10-19 02:00:00'),
  (1279, 'demo-app-179', 1037, 1029, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Giáo dục Mầm non năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 120000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: barista, service, cooking, teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-21', NULL, NULL, '2026-10-18 02:00:00', NULL, NULL, '2026-10-18 02:00:00'),
  (1280, 'demo-app-180', 1037, 1052, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Sư phạm Anh ngữ năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 120000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: teaching, translate. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-17', NULL, NULL, '2026-10-14 02:00:00', '2026-10-16 02:00:00', NULL, '2026-10-14 02:00:00'),
  (1281, 'demo-app-181', 1038, 1040, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 100000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: content, teaching, translate, design. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-17', NULL, NULL, '2026-10-14 02:00:00', NULL, NULL, '2026-10-14 02:00:00'),
  (1282, 'demo-app-182', 1038, 1050, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 100000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, teaching. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-18', NULL, NULL, '2026-10-15 02:00:00', '2026-10-17 02:00:00', NULL, '2026-10-15 02:00:00'),
  (1283, 'demo-app-183', 1039, 1035, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 4500000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: manual-test, react. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-18', NULL, NULL, '2026-10-15 02:00:00', NULL, NULL, '2026-10-15 02:00:00'),
  (1284, 'demo-app-184', 1040, 1030, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 7000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: manual-test, react, security. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-18', NULL, NULL, '2026-10-15 02:00:00', NULL, NULL, '2026-10-15 02:00:00'),
  (1285, 'demo-app-185', 1041, 1035, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 8000000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: manual-test, react. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-13', NULL, NULL, '2026-10-10 02:00:00', NULL, NULL, '2026-10-10 02:00:00'),
  (1286, 'demo-app-186', 1041, 1039, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 8000000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: manual-test, security. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-14', NULL, NULL, '2026-10-11 02:00:00', '2026-10-13 02:00:00', NULL, '2026-10-11 02:00:00'),
  (1287, 'demo-app-187', 1042, 1047, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Công nghệ thông tin năm 2, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 45000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: manual-test, design, react. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-14', NULL, NULL, '2026-10-11 02:00:00', '2026-10-13 02:00:00', '2026-10-13 02:00:00', '2026-10-11 02:00:00'),
  (1288, 'demo-app-188', 1042, 1030, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 45000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: manual-test, react, security. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-15', NULL, NULL, '2026-10-12 02:00:00', NULL, NULL, '2026-10-12 02:00:00'),
  (1289, 'demo-app-189', 1042, 1035, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kỹ thuật Phần mềm năm 4, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 45000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: manual-test, react. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-16', NULL, NULL, '2026-10-13 02:00:00', '2026-10-15 02:00:00', NULL, '2026-10-13 02:00:00'),
  (1290, 'demo-app-190', 1047, 1022, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Kế toán năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 31000, 'PENDING', NULL, NULL, 'Kỹ năng hiện có: cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-08', NULL, NULL, '2026-10-05 02:00:00', NULL, NULL, '2026-10-05 02:00:00'),
  (1291, 'demo-app-191', 1047, 1027, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Quản trị Kinh doanh năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 31000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', 'Kỹ năng hiện có: service, cooking, cashier, excel, pos. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-09', NULL, NULL, '2026-10-06 02:00:00', '2026-10-08 02:00:00', '2026-10-08 02:00:00', '2026-10-06 02:00:00'),
  (1292, 'demo-app-192', 1047, 1025, 'Em chào anh/chị, Em thấy vị trí phù hợp với kỹ năng và lịch học của em. Em là sinh viên ngành Marketing năm 3, có thể làm part-time theo lịch linh hoạt. Em sẵn sàng bắt đầu sớm và cam kết làm đúng giờ, đúng lịch đã hẹn. Em gửi kèm CV và rất mong được phản hồi từ phía công ty.', 31000, 'SHORTLISTED', 'Hồ sơ phù hợp, mời phỏng vấn nhanh qua điện thoại.', NULL, 'Kỹ năng hiện có: content, pos, seo. Em từng tham gia làm thêm theo lịch linh hoạt trong quá trình học.', '2026-10-10', NULL, NULL, '2026-10-07 02:00:00', '2026-10-09 02:00:00', NULL, '2026-10-07 02:00:00')
;

-- Lịch sử trạng thái của các đơn sinh chéo
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, changed_at) VALUES
  (1200, NULL, 'PENDING', 1023, NULL, '2026-11-19 02:00:00'),
  (1201, NULL, 'PENDING', 1029, NULL, '2026-11-20 02:00:00'),
  (1201, 'PENDING', 'REJECTED', 1002, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-22 02:00:00'),
  (1202, NULL, 'PENDING', 1027, NULL, '2026-11-21 02:00:00'),
  (1202, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp yêu cầu.', '2026-11-22 02:00:00'),
  (1202, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận ứng viên.', '2026-11-23 02:00:00'),
  (1203, NULL, 'PENDING', 1023, NULL, '2026-11-21 02:00:00'),
  (1204, NULL, 'PENDING', 1029, NULL, '2026-11-22 02:00:00'),
  (1204, 'PENDING', 'REJECTED', 1102, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-24 02:00:00'),
  (1205, NULL, 'PENDING', 1027, NULL, '2026-11-18 02:00:00'),
  (1205, 'PENDING', 'SHORTLISTED', 1102, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-19 02:00:00'),
  (1206, NULL, 'PENDING', 1023, NULL, '2026-11-18 02:00:00'),
  (1207, NULL, 'PENDING', 1029, NULL, '2026-11-19 02:00:00'),
  (1207, 'PENDING', 'SHORTLISTED', 1104, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-20 02:00:00'),
  (1208, NULL, 'PENDING', 1023, NULL, '2026-11-19 02:00:00'),
  (1209, NULL, 'PENDING', 1029, NULL, '2026-11-20 02:00:00'),
  (1209, 'PENDING', 'REJECTED', 1107, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-22 02:00:00'),
  (1210, NULL, 'PENDING', 1027, NULL, '2026-11-16 02:00:00'),
  (1210, 'PENDING', 'SHORTLISTED', 1107, 'Hồ sơ phù hợp yêu cầu.', '2026-11-17 02:00:00'),
  (1210, 'SHORTLISTED', 'ACCEPTED', 1107, 'Đã nhận ứng viên.', '2026-11-18 02:00:00'),
  (1211, NULL, 'PENDING', 1023, NULL, '2026-11-16 02:00:00'),
  (1212, NULL, 'PENDING', 1027, NULL, '2026-11-17 02:00:00'),
  (1212, 'PENDING', 'SHORTLISTED', 1102, 'Hồ sơ phù hợp yêu cầu.', '2026-11-18 02:00:00'),
  (1212, 'SHORTLISTED', 'ACCEPTED', 1102, 'Đã nhận ứng viên.', '2026-11-19 02:00:00'),
  (1213, NULL, 'PENDING', 1023, NULL, '2026-11-17 02:00:00'),
  (1214, NULL, 'PENDING', 1027, NULL, '2026-11-18 02:00:00'),
  (1214, 'PENDING', 'SHORTLISTED', 1103, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-19 02:00:00'),
  (1215, NULL, 'PENDING', 1029, NULL, '2026-11-14 02:00:00'),
  (1215, 'PENDING', 'REJECTED', 1103, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-16 02:00:00'),
  (1216, NULL, 'PENDING', 1023, NULL, '2026-11-14 02:00:00'),
  (1217, NULL, 'PENDING', 1029, NULL, '2026-11-15 02:00:00'),
  (1217, 'PENDING', 'SHORTLISTED', 1107, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-16 02:00:00'),
  (1218, NULL, 'PENDING', 1023, NULL, '2026-11-15 02:00:00'),
  (1219, NULL, 'PENDING', 1027, NULL, '2026-11-16 02:00:00'),
  (1219, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-17 02:00:00'),
  (1220, NULL, 'PENDING', 1029, NULL, '2026-11-12 02:00:00'),
  (1220, 'PENDING', 'REJECTED', 1100, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-14 02:00:00'),
  (1221, NULL, 'PENDING', 1023, NULL, '2026-11-22 02:00:00'),
  (1222, NULL, 'PENDING', 1027, NULL, '2026-11-23 02:00:00'),
  (1222, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu.', '2026-11-24 02:00:00'),
  (1222, 'SHORTLISTED', 'ACCEPTED', 1101, 'Đã nhận ứng viên.', '2026-11-25 02:00:00'),
  (1223, NULL, 'PENDING', 1029, NULL, '2026-11-24 02:00:00'),
  (1223, 'PENDING', 'REJECTED', 1101, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-26 02:00:00'),
  (1224, NULL, 'PENDING', 1023, NULL, '2026-11-15 02:00:00'),
  (1225, NULL, 'PENDING', 1027, NULL, '2026-11-11 02:00:00'),
  (1225, 'PENDING', 'SHORTLISTED', 1102, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-12 02:00:00'),
  (1226, NULL, 'PENDING', 1029, NULL, '2026-11-12 02:00:00'),
  (1226, 'PENDING', 'REJECTED', 1102, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-14 02:00:00'),
  (1227, NULL, 'PENDING', 1023, NULL, '2026-11-12 02:00:00'),
  (1228, NULL, 'PENDING', 1023, NULL, '2026-11-12 02:00:00'),
  (1229, NULL, 'PENDING', 1023, NULL, '2026-11-12 02:00:00'),
  (1230, NULL, 'PENDING', 1027, NULL, '2026-11-08 02:00:00'),
  (1230, 'PENDING', 'SHORTLISTED', 1103, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-09 02:00:00'),
  (1231, NULL, 'PENDING', 1029, NULL, '2026-11-09 02:00:00'),
  (1231, 'PENDING', 'REJECTED', 1103, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-11 02:00:00'),
  (1232, NULL, 'PENDING', 1023, NULL, '2026-11-09 02:00:00'),
  (1233, NULL, 'PENDING', 1027, NULL, '2026-11-10 02:00:00'),
  (1233, 'PENDING', 'SHORTLISTED', 1106, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-11 02:00:00'),
  (1234, NULL, 'PENDING', 1029, NULL, '2026-11-11 02:00:00'),
  (1234, 'PENDING', 'REJECTED', 1106, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-13 02:00:00'),
  (1235, NULL, 'PENDING', 1023, NULL, '2026-11-06 02:00:00'),
  (1236, NULL, 'PENDING', 1027, NULL, '2026-11-07 02:00:00'),
  (1236, 'PENDING', 'SHORTLISTED', 1103, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-08 02:00:00'),
  (1237, NULL, 'PENDING', 1029, NULL, '2026-11-08 02:00:00'),
  (1237, 'PENDING', 'REJECTED', 1103, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-10 02:00:00'),
  (1238, NULL, 'PENDING', 1027, NULL, '2026-11-08 02:00:00'),
  (1238, 'PENDING', 'REJECTED', 1105, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-10 02:00:00'),
  (1239, NULL, 'PENDING', 1022, NULL, '2026-11-09 02:00:00'),
  (1240, NULL, 'PENDING', 1023, NULL, '2026-11-05 02:00:00'),
  (1240, 'PENDING', 'SHORTLISTED', 1105, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-06 02:00:00'),
  (1241, NULL, 'PENDING', 1029, NULL, '2026-11-06 02:00:00'),
  (1241, 'PENDING', 'SHORTLISTED', 1105, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-07 02:00:00'),
  (1242, NULL, 'PENDING', 1022, NULL, '2026-11-06 02:00:00'),
  (1243, NULL, 'PENDING', 1027, NULL, '2026-11-07 02:00:00'),
  (1243, 'PENDING', 'REJECTED', 1101, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-09 02:00:00'),
  (1244, NULL, 'PENDING', 1025, NULL, '2026-11-08 02:00:00'),
  (1244, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-09 02:00:00'),
  (1245, NULL, 'PENDING', 1022, NULL, '2026-11-03 02:00:00'),
  (1246, NULL, 'PENDING', 1027, NULL, '2026-11-04 02:00:00'),
  (1246, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu.', '2026-11-05 02:00:00'),
  (1246, 'SHORTLISTED', 'ACCEPTED', 1101, 'Đã nhận ứng viên.', '2026-11-06 02:00:00'),
  (1247, NULL, 'PENDING', 1022, NULL, '2026-10-31 02:00:00'),
  (1248, NULL, 'PENDING', 1025, NULL, '2026-11-01 02:00:00'),
  (1248, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-11-02 02:00:00'),
  (1249, NULL, 'PENDING', 1027, NULL, '2026-11-02 02:00:00'),
  (1249, 'PENDING', 'REJECTED', 1100, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-11-04 02:00:00'),
  (1250, NULL, 'PENDING', 1024, NULL, '2026-10-28 02:00:00'),
  (1251, NULL, 'PENDING', 1026, NULL, '2026-10-29 02:00:00'),
  (1251, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu.', '2026-10-30 02:00:00'),
  (1251, 'SHORTLISTED', 'ACCEPTED', 1100, 'Đã nhận ứng viên.', '2026-10-31 02:00:00'),
  (1252, NULL, 'PENDING', 1024, NULL, '2026-10-29 02:00:00'),
  (1253, NULL, 'PENDING', 1026, NULL, '2026-10-30 02:00:00'),
  (1253, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-31 02:00:00'),
  (1254, NULL, 'PENDING', 1044, NULL, '2026-10-30 02:00:00'),
  (1255, NULL, 'PENDING', 1046, NULL, '2026-10-26 02:00:00'),
  (1255, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-27 02:00:00'),
  (1256, NULL, 'PENDING', 1042, NULL, '2026-10-26 02:00:00'),
  (1257, NULL, 'PENDING', 1043, NULL, '2026-10-27 02:00:00'),
  (1257, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-28 02:00:00'),
  (1258, NULL, 'PENDING', 1023, NULL, '2026-10-27 02:00:00'),
  (1259, NULL, 'PENDING', 1027, NULL, '2026-10-28 02:00:00'),
  (1259, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-29 02:00:00'),
  (1260, NULL, 'PENDING', 1029, NULL, '2026-10-24 02:00:00'),
  (1260, 'PENDING', 'REJECTED', 1101, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-26 02:00:00'),
  (1261, NULL, 'PENDING', 1037, NULL, '2026-10-24 02:00:00'),
  (1261, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp yêu cầu.', '2026-10-25 02:00:00'),
  (1261, 'SHORTLISTED', 'ACCEPTED', 1002, 'Đã nhận ứng viên.', '2026-10-26 02:00:00'),
  (1262, NULL, 'PENDING', 1033, NULL, '2026-10-25 02:00:00'),
  (1263, NULL, 'PENDING', 1040, NULL, '2026-10-25 02:00:00'),
  (1264, NULL, 'PENDING', 1050, NULL, '2026-10-26 02:00:00'),
  (1264, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-27 02:00:00'),
  (1265, NULL, 'PENDING', 1031, NULL, '2026-10-21 02:00:00'),
  (1265, 'PENDING', 'REJECTED', 1002, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-23 02:00:00'),
  (1266, NULL, 'PENDING', 1022, NULL, '2026-10-22 02:00:00'),
  (1267, NULL, 'PENDING', 1025, NULL, '2026-10-23 02:00:00'),
  (1267, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-24 02:00:00'),
  (1268, NULL, 'PENDING', 1025, NULL, '2026-10-23 02:00:00'),
  (1269, NULL, 'PENDING', 1031, NULL, '2026-10-24 02:00:00'),
  (1269, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-25 02:00:00'),
  (1270, NULL, 'PENDING', 1022, NULL, '2026-10-19 02:00:00'),
  (1271, NULL, 'PENDING', 1027, NULL, '2026-10-20 02:00:00'),
  (1271, 'PENDING', 'SHORTLISTED', 1002, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-21 02:00:00'),
  (1272, NULL, 'PENDING', 1031, NULL, '2026-10-21 02:00:00'),
  (1272, 'PENDING', 'REJECTED', 1002, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-23 02:00:00'),
  (1273, NULL, 'PENDING', 1042, NULL, '2026-10-21 02:00:00'),
  (1274, NULL, 'PENDING', 1043, NULL, '2026-10-22 02:00:00'),
  (1274, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-23 02:00:00'),
  (1275, NULL, 'PENDING', 1034, NULL, '2026-10-17 02:00:00'),
  (1276, NULL, 'PENDING', 1023, NULL, '2026-10-17 02:00:00'),
  (1277, NULL, 'PENDING', 1027, NULL, '2026-10-18 02:00:00'),
  (1277, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-19 02:00:00'),
  (1278, NULL, 'PENDING', 1029, NULL, '2026-10-19 02:00:00'),
  (1278, 'PENDING', 'REJECTED', 1101, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-21 02:00:00'),
  (1279, NULL, 'PENDING', 1029, NULL, '2026-10-18 02:00:00'),
  (1280, NULL, 'PENDING', 1052, NULL, '2026-10-14 02:00:00'),
  (1280, 'PENDING', 'SHORTLISTED', 1101, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-15 02:00:00'),
  (1281, NULL, 'PENDING', 1040, NULL, '2026-10-14 02:00:00'),
  (1282, NULL, 'PENDING', 1050, NULL, '2026-10-15 02:00:00'),
  (1282, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-16 02:00:00'),
  (1283, NULL, 'PENDING', 1035, NULL, '2026-10-15 02:00:00'),
  (1284, NULL, 'PENDING', 1030, NULL, '2026-10-15 02:00:00'),
  (1285, NULL, 'PENDING', 1035, NULL, '2026-10-10 02:00:00'),
  (1286, NULL, 'PENDING', 1039, NULL, '2026-10-11 02:00:00'),
  (1286, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-12 02:00:00'),
  (1287, NULL, 'PENDING', 1047, NULL, '2026-10-11 02:00:00'),
  (1287, 'PENDING', 'REJECTED', 1100, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-13 02:00:00'),
  (1288, NULL, 'PENDING', 1030, NULL, '2026-10-12 02:00:00'),
  (1289, NULL, 'PENDING', 1035, NULL, '2026-10-13 02:00:00'),
  (1289, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-14 02:00:00'),
  (1290, NULL, 'PENDING', 1022, NULL, '2026-10-05 02:00:00'),
  (1291, NULL, 'PENDING', 1027, NULL, '2026-10-06 02:00:00'),
  (1291, 'PENDING', 'REJECTED', 1100, 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', '2026-10-08 02:00:00'),
  (1292, NULL, 'PENDING', 1025, NULL, '2026-10-07 02:00:00'),
  (1292, 'PENDING', 'SHORTLISTED', 1100, 'Hồ sơ phù hợp yêu cầu, mời phỏng vấn nhanh.', '2026-10-08 02:00:00')
;

-- =====================================================================
-- 8. KINH NGHIỆM LÀM VIỆC (work_assignments)
-- =====================================================================
-- Sinh ra tự động khi NTD đánh dấu đơn `COMPLETED`.
--
-- Quy tắc: MỖI đơn `COMPLETED` ứng với ĐÚNG 1 dòng lịch sử làm việc
-- (UNIQUE `application_id`) — nên bảng này phải khớp 1-1 với các đơn
-- `COMPLETED` trong bảng `applications`. Xem phần 16.3 để kiểm tra.

INSERT INTO work_assignments (id, slug, application_id, job_post_id, student_id, employer_id, job_title, company_name, position_name, salary_type, salary_min, salary_max, note, rating, status, started_at, ended_at, employer_confirmed_at, student_confirmed_at, created_at, updated_at) VALUES
  (1210, 'demo-wh-010', 1101, 1001, 1001, 1002, 'Nhân viên phục vụ part-time — Phường Tân Định', 'Công ty Cổ phần VieJob Demo', 'Phục vụ', 'HOURLY', 28000, 35000, 'Đã làm xong 8 ca ca tối, em rất chuyên nghiệp và đúng giờ.', 5, 'COMPLETED', '2026-11-18 09:00:00', '2026-11-24 09:00:00', '2026-11-24 09:00:00', '2026-11-24 09:00:00', '2026-11-24 09:00:00', '2026-11-24 09:00:00'),
  (1201, 'demo-wh-001', 1104, 1019, 1001, 1102, 'Nhân viên thu ngân ca đêm — Tiệm Chè Táo Tào', 'Tiệm Chè Táo Tào', 'Thu ngân', 'HOURLY', 32000, 38000, 'Đã làm xong 8 ca, ứng viên rất chuyên nghiệp.', 5, 'COMPLETED', '2026-10-25 09:00:00', '2026-11-05 09:00:00', '2026-11-05 09:00:00', '2026-11-05 09:00:00', '2026-11-05 09:00:00', '2026-11-05 09:00:00'),
  (1202, 'demo-wh-002', 1105, 1018, 1001, 1101, 'Thu ngân part-time — chuỗi cà phê Quận 1', 'Kim Phát Jobs', 'Thu ngân', 'HOURLY', 26000, 30000, 'Đã làm xong 6 ca, trả lương đúng hẹn.', 4, 'COMPLETED', '2026-10-31 09:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00', '2026-11-10 09:00:00'),
  (1203, 'demo-wh-003', 1111, 1019, 1014, 1102, 'Nhân viên thu ngân ca đêm — Tiệm Chè Táo Tào', 'Tiệm Chè Táo Tào', 'Thu ngân', 'HOURLY', 32000, 38000, 'Đã làm xong 2 ca, trả lương đúng hẹn.', 4, 'COMPLETED', '2026-11-07 09:00:00', '2026-11-13 09:00:00', '2026-11-13 09:00:00', '2026-11-13 09:00:00', '2026-11-13 09:00:00', '2026-11-13 09:00:00'),
  (1204, 'demo-wh-004', 1117, 1005, 1014, 1002, 'Nhà hàng VieJob Demo — Tuyển phục vụ ca chiều', 'Công ty Cổ phần VieJob Demo', 'Phục vụ', 'MONTHLY', 8900000, 10300000, 'Ứng viên làm việc chăm chỉ, khách hàng phản hồi tốt.', 5, 'COMPLETED', '2026-11-03 09:00:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00', '2026-11-20 09:00:00'),
  (1205, 'demo-wh-005', 1109, 1027, 1015, 1002, 'Thực tập sinh Marketing — Remote', 'Công ty Cổ phần VieJob Demo', 'Marketing', 'MONTHLY', 4000000, 6000000, 'Đã làm xong chiến dịch, em tự chủ động và có sáng kiến.', 5, 'COMPLETED', '2026-11-18 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00'),
  (1206, 'demo-wh-006', 1112, 1004, 1019, 1107, 'Trà sữa Koi Thé — Tuyển nhân viên pha chế và phục vụ', 'Koi Thé', 'Pha chế (Trà sữa, sinh tố)', 'MONTHLY', 5000000, 7000000, 'Đã làm xong 6 ca, em rất chuyên nghiệp và đúng giờ.', 4, 'COMPLETED', '2026-11-19 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00', '2026-11-26 09:00:00'),
  (1207, 'demo-wh-007', 1118, 1028, 1016, 1002, 'Chuyên viên content marketing part-time — Hà Nội', 'Công ty Cổ phần VieJob Demo', 'Sáng tạo nội dung', 'MONTHLY', 2500000, 4000000, 'Đã hoàn thành chuỗi content tháng, bài viết đúng tone thương hiệu.', 5, 'COMPLETED', '2026-11-20 09:00:00', '2026-11-27 09:00:00', '2026-11-27 09:00:00', '2026-11-27 09:00:00', '2026-11-27 09:00:00', '2026-11-27 09:00:00'),
  (1208, 'demo-wh-008', 1124, 1009, 1013, 1101, '500K/8H PART TIME PHỤC VỤ TIỆC — Quận 1', 'Kim Phát Jobs', 'Chạy bàn / Tiếp thực', 'HOURLY', 62000, 62000, 'Đã làm xong ca tiệc, em đúng giờ và chuyên nghiệp.', 5, 'COMPLETED', '2026-11-22 09:00:00', '2026-11-28 09:00:00', '2026-11-28 09:00:00', '2026-11-28 09:00:00', '2026-11-28 09:00:00', '2026-11-28 09:00:00'),
  (1209, 'demo-wh-009', 1125, 1012, 1015, 1106, 'Tuyển bếp chính nhà hàng Việt — IN Hospitality', 'Công ty CP IN Hospitality', 'Bếp chính', 'MONTHLY', 12000000, 15000000, 'Đã làm xong ca, món ăn đạt yêu cầu và bếp ghi nhận tiến bộ rõ rệt.', 4, 'COMPLETED', '2026-11-23 09:00:00', '2026-11-29 09:00:00', '2026-11-29 09:00:00', '2026-11-29 09:00:00', '2026-11-29 09:00:00', '2026-11-29 09:00:00');

-- =====================================================================
-- 9. ĐÁNH GIÁ 2 CHIỀU
-- =====================================================================
-- `reply`         = phản hồi của NGƯỜI BỊ ĐÁNH GIÁ (reviewee)
-- `reviewer_reply`= phản hồi của NGƯỜI VIẾT ĐÁNH GIÁ (reviewer)

INSERT INTO reviews (id, slug, application_id, job_id, reviewer_id, reviewee_id, reviewer_role, target_type, from_name, from_avatar_url, target_name, rating, comment, reply, reviewer_reply, is_hidden, created_at) VALUES
  (1301, 'demo-rev-001', 1101, 1001, 1001, 1002, 'STUDENT', 'EMPLOYER', 'Nguyễn Thanh Hà', NULL, 'Công ty Cổ phần VieJob Demo', 5, 'Công ty rất chuẩn bị, bao cơm đầy đủ và trả lương đúng hẹn. Xe đưa đón cũng đúng giờ. Sẽ giới thiệu cho bạn bè.', 'Cảm ơn Hà đã đồng hành cùng chúng tôi!', 'Hà làm việc rất chuyên nghiệp, chúng tôi rất mong được hợp tác lâu dài.', 0, '2026-11-19 09:00:00'),
  (1302, 'demo-rev-002', 1101, 1001, 1002, 1001, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Nguyễn Thanh Hà', 5, 'Hà đón khách rất lịch sự, xử lý thủ tục nhanh gọn và luôn đúng giờ. Rất hài lòng với ca làm việc.', 'Cảm ơn anh, em rất vui được làm việc cùng công ty.', NULL, 0, '2026-11-19 09:00:00'),
  (1303, 'demo-rev-003', 1104, 1019, 1001, 1102, 'STUDENT', 'EMPLOYER', 'Nguyễn Thanh Hà', NULL, 'Tiệm Chè Táo Tào', 4, 'Môi trường làm việc thân thiện, hướng dẫn rõ ràng. Điểm trừ là ca đêm hơi mệt.', NULL, NULL, 0, '2026-11-06 09:00:00'),
  (1304, 'demo-rev-004', 1105, 1018, 1002, 1001, 'EMPLOYER', 'STUDENT', 'Kim Phát', NULL, 'Nguyễn Thanh Hà', 4, 'Ứng viên làm việc chăm chỉ, kiểm kê cuối ca cẩn thận. Cần cải thiện tốc độ xử lý thanh toán.', NULL, NULL, 0, '2026-11-11 09:00:00'),
  (1305, 'demo-rev-005', 1109, 1027, 1002, 1015, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Cao Văn Quang', 5, 'Quang làm việc rất chuyên nghiệp, tự tra cứu và chủ động hỏi khi chưa rõ. Rất hài lòng.', NULL, NULL, 0, '2026-11-19 09:00:00'),
  (1306, 'demo-rev-006', 1112, 1004, 1107, 1019, 'EMPLOYER', 'STUDENT', 'Trần Bảo Khang', NULL, 'Võ Thị Ngân', 4, 'Ngân làm việc cẩn thận, đúng giờ. Mong được hợp tác thêm lâu dài.', NULL, NULL, 0, '2026-11-19 09:00:00'),
  (1307, 'demo-rev-007', 1111, 1019, 1014, 1102, 'STUDENT', 'EMPLOYER', 'Lê Ngọc Mai', NULL, 'Tiệm Chè Táo Tào', 4, 'Chỗ làm ổn, trả lương đúng hẹn và hỗ trợ nhân viên nhiệt tình.', NULL, NULL, 0, '2026-11-14 09:00:00'),
  (1308, 'demo-rev-008', NULL, NULL, 1010, 1100, 'STUDENT', 'EMPLOYER', 'Nguyễn Thị Hoa', NULL, 'Quản Lý Retail Chain', 1, 'Quảng cáo sai mức lương, rất thất vọng. Tệp nhất mà tôi từng ứng tuyển!', NULL, NULL, 1, '2026-11-17 09:00:00'),
  (1309, 'demo-rev-009', 1118, 1028, 1002, 1016, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Nguyễn Thu Thảo', 5, 'Thảo viết content nhanh, đúng tone thương hiệu và tự chủ động đề xuất ý tưởng.', NULL, NULL, 0, '2026-11-21 09:00:00'),
  (1310, 'demo-rev-010', 1124, 1009, 1101, 1013, 'EMPLOYER', 'STUDENT', 'Kim Phát', NULL, 'Trần Đức Sơn', 5, 'Sơn làm việc chăm chỉ, đúng giờ và rất hợp tác với nhóm khách.', NULL, NULL, 0, '2026-11-22 09:00:00'),
  (1311, 'demo-rev-011', 1117, 1005, 1002, 1014, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Lê Ngọc Mai', 5, 'Mai phục vụ khách rất chuyên nghiệp, được khách hàng khen nhiều lần.', NULL, NULL, 0, '2026-11-21 09:00:00'),
  (1312, 'demo-rev-012', 1125, 1012, 1106, 1015, 'EMPLOYER', 'STUDENT', 'Đỗ Anh Hoài', NULL, 'Cao Văn Quang', 4, 'Quang có nền tảng bếp tốt nhưng cần thêm kinh nghiệm với món Á.', NULL, NULL, 0, '2026-11-22 09:00:00');

-- =====================================================================
-- 10. TIN ĐÃ LƯU
-- =====================================================================

INSERT INTO saved_jobs (id, slug, student_id, job_post_id, created_at) VALUES
  (1401, 'demo-saved-001', 1001, 1002, '2026-11-18 09:00:00'),
  (1402, 'demo-saved-002', 1001, 1027, '2026-11-18 09:00:00'),
  (1403, 'demo-saved-003', 1001, 1003, '2026-11-19 09:00:00'),
  (1404, 'demo-saved-004', 1010, 1027, '2026-11-17 09:00:00'),
  (1405, 'demo-saved-005', 1011, 1040, '2026-11-19 09:00:00'),
  (1406, 'demo-saved-006', 1012, 1036, '2026-11-20 09:00:00'),
  (1407, 'demo-saved-007', 1013, 1022, '2026-11-17 09:00:00'),
  (1408, 'demo-saved-008', 1016, 1028, '2026-11-18 09:00:00'),
  (1409, 'demo-saved-009', 1019, 1034, '2026-11-22 09:00:00'),
  (1410, 'demo-saved-010', 1019, 1016, '2026-11-22 09:00:00');

-- =====================================================================
-- 11. THÔNG BÁO
-- =====================================================================

INSERT INTO notifications (id, slug, user_id, type, title, body, content, ref_type, ref_id, is_read, read_at, link, created_at) VALUES
  -- Sinh viên chính
  (1501, 'demo-ntf-001', 1001, 'APPLICATION_STATUS', 'Hồ sơ của bạn đã được nhận', 'Nhà tuyển dụng VieJob Demo đã nhận hồ sơ ứng tuyển cho vị trí Nhân viên phục vụ part-time.', NULL, NULL, NULL, 0, NULL, '/student/applications/demo-app-001', '2026-11-18 09:00:00'),
  (1502, 'demo-ntf-002', 1001, 'APPLICATION', 'Có tin tuyển dụng mới phù hợp', 'Nhân viên lễ tân — Hà Nội phù hợp với mục tiêu việc làm của bạn.', NULL, NULL, NULL, 0, NULL, '/jobs/demo-job-020', '2026-11-17 09:00:00'),
  (1503, 'demo-ntf-003', 1001, 'REVIEW', 'Hãy đánh giá trải nghiệm làm việc', 'Bạn đã hoàn thành công việc. Đánh giá giúp nhà tuyển dụng cải thiện trải nghiệm tuyển dụng.', NULL, NULL, NULL, 1, '2026-11-13 09:00:00', '/student/reviews', '2026-11-13 09:00:00'),
  (1504, 'demo-ntf-004', 1001, 'SYSTEM', 'Hoàn thiện hồ sơ để tăng cơ hội ứng tuyển', 'Hồ sơ của bạn đang thiếu ảnh đại diện và CV. Hoàn thiện hồ sơ giúp bạn nổi bật hơn.', NULL, NULL, NULL, 0, NULL, '/student/profile', '2026-11-15 09:00:00'),
  (1505, 'demo-ntf-005', 1001, 'APPLICATION', 'Hồ sơ của bạn đã được duyệt sơ bộ', 'Trà Sữa Fozu đã duyệt sơ bộ hồ sơ ứng tuyển của bạn cho vị trí pha chế trà sữa.', NULL, NULL, NULL, 0, NULL, '/student/applications/demo-app-003', '2026-11-17 09:00:00'),
  (1506, 'demo-ntf-006', 1001, 'APPLICATION_STATUS', 'Đơn ứng tuyển đã được từ chối', 'Đơn ứng tuyển cho vị trí Nhân viên lễ tân — Hà Nội đã được từ chối. Bạn có thể tìm việc tương tự ngay.', NULL, NULL, NULL, 1, '2026-11-15 09:00:00', '/student/applications/demo-app-006', '2026-11-15 09:00:00'),
  (1507, 'demo-ntf-007', 1001, 'SYSTEM', 'Bạn đã có thêm việc làm đã hoàn thành', 'Hồ sơ của bạn đã được ghi nhận thêm kinh nghiệm làm việc. Hãy cập nhật hồ sơ để ứng viên khác thấy điều đó.', NULL, NULL, NULL, 0, NULL, '/student/profile', '2026-11-10 09:00:00'),

  -- Nhà tuyển dụng chính
  (1508, 'demo-ntf-008', 1002, 'APPLICATION', '3 hồ sơ mới chờ bạn xem xét', 'Có 3 ứng viên mới ứng tuyển vào vị trí Thực tập sinh Marketing — Remote.', NULL, NULL, NULL, 0, NULL, '/employer/applications', '2026-11-18 09:00:00'),
  (1509, 'demo-ntf-009', 1002, 'JOB', 'Tin tuyển dụng đã được gửi duyệt', 'Tin "Gia sư Toán cấp THPT — Hà Nội" đã được gửi quản trị viên duyệt và đang chờ phản hồi.', NULL, NULL, NULL, 1, '2026-11-22 09:00:00', '/employer/jobs', '2026-11-22 09:00:00'),
  (1510, 'demo-ntf-010', 1002, 'REVIEW', 'Bạn có đánh giá mới', 'Nguyễn Thanh Hà đã đánh giá 5/5 cho trải nghiệm làm việc tại công ty.', NULL, NULL, NULL, 0, NULL, '/employer/reviews', '2026-11-19 09:00:00'),
  (1511, 'demo-ntf-011', 1101, 'APPLICATION', 'Ứng viên đã rút đơn ứng tuyển', 'Ứng viên Nguyễn Thanh Hà đã rút đơn ứng tuyển cho vị trí Tin tuyển dụng — Đã đủ người.', NULL, NULL, NULL, 1, '2026-11-17 09:00:00', '/employer/applications', '2026-11-17 09:00:00'),

  -- Nhà tuyển dụng khác
  (1512, 'demo-ntf-012', 1100, 'APPLICATION', 'Có hồ sơ mới cho vị trí Nhân viên lễ tân — Hà Nội', 'Có 2 ứng viên mới ứng tuyển vào vị trí Nhân viên lễ tân — Hà Nội.', NULL, NULL, NULL, 0, NULL, '/employer/applications', '2026-11-21 09:00:00'),
  (1513, 'demo-ntf-013', 1102, 'APPLICATION', 'Có hồ sơ mới cho vị trí nhân viên cửa hàng', 'Có 4 ứng viên mới ứng tuyển vào vị trí nhân viên cửa hàng cuối tuần.', NULL, NULL, NULL, 0, NULL, '/employer/applications', '2026-11-22 09:00:00'),
  (1514, 'demo-ntf-014', 1106, 'REVIEW', 'Bạn có đánh giá mới', 'Cao Văn Quang đã đánh giá 4/5 cho trải nghiệm làm việc tại nhà hàng.', NULL, NULL, NULL, 0, NULL, '/employer/reviews', '2026-11-22 09:00:00'),
  (1515, 'demo-ntf-015', 1104, 'APPLICATION', 'Có 3 hồ sơ mới cho vị trí pha chế trà sữa', 'Có 3 ứng viên mới ứng tuyển vào vị trí pha chế trà sữa ca tối.', NULL, NULL, NULL, 0, NULL, '/employer/applications', '2026-11-17 09:00:00'),

  -- Quản trị viên
  (1516, 'demo-ntf-016', 1003, 'JOB', 'Có 1 tin tuyển dụng chờ duyệt', 'Tin "Gia sư Toán cấp THPT — Hà Nội" của VieJob Demo đang chờ bạn duyệt.', NULL, NULL, NULL, 0, NULL, '/admin/jobs', '2026-11-22 09:00:00'),
  (1517, 'demo-ntf-017', 1003, 'REVIEW', 'Có 1 đánh giá cần kiểm duyệt', 'Có 1 đánh giá đang ẩn chờ quản trị viên xử lý.', NULL, NULL, NULL, 0, NULL, '/admin/reviews', '2026-11-17 09:00:00'),
  (1518, 'demo-ntf-018', 1003, 'SYSTEM', 'Có 1 báo cáo vi phạm mới', 'Có 1 báo cáo vi phạm mới cần được xử lý.', NULL, NULL, NULL, 0, NULL, '/admin/users', '2026-11-20 09:00:00'),

  -- Sinh viên khác
  (1519, 'demo-ntf-019', 1010, 'APPLICATION_STATUS', 'Hồ sơ của bạn đã được gửi', 'VieJob Demo đã nhận hồ sơ ứng tuyển của bạn cho vị trí Thực tập sinh Marketing. Hồ sơ đang chờ nhà tuyển dụng xét duyệt.', NULL, NULL, NULL, 0, NULL, '/student/applications/demo-app-008', '2026-11-18 09:00:00'),
  (1520, 'demo-ntf-020', 1011, 'APPLICATION_STATUS', 'Hồ sơ của bạn đã được duyệt sơ bộ', 'Công ty Cổ phần VieJob Demo đã duyệt sơ bộ hồ sơ của bạn cho vị trí Lập trình viên React thực tập.', NULL, NULL, NULL, 0, NULL, '/student/applications/demo-app-015', '2026-11-21 09:00:00'),
  (1521, 'demo-ntf-021', 1012, 'REVIEW', 'Hãy đánh giá trải nghiệm làm việc', 'Bạn đã hoàn thành công việc. Đánh giá giúp nhà tuyển dụng cải thiện trải nghiệm tuyển dụng.', NULL, NULL, NULL, 0, NULL, '/student/reviews', '2026-11-14 09:00:00'),
  (1522, 'demo-ntf-022', 1013, 'APPLICATION_STATUS', 'Hồ sơ của bạn đã được nhận', 'Quản Lý Retail Chain đã nhận hồ sơ ứng tuyển của bạn cho vị trí giao hàng.', NULL, NULL, NULL, 1, '2026-11-18 09:00:00', '/student/applications/demo-app-013', '2026-11-18 09:00:00');

-- =====================================================================
-- 12. BÁO CÁO VI PHẠM
-- =====================================================================

INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description, status, handled_by, handled_at, resolution_note, created_at) VALUES
  (1601, 1001, 'JOB_POST', 1009, 'FAKE_INFO', 'Tin này quảng cáo mức lương 62k/giờ nhưng thực tế là 500k/ca bao gồm cả thời gian chờ. Thông tin gây hiểu lầm.', 'OPEN', NULL, NULL, NULL, '2026-11-20 09:00:00'),
  (1602, 1010, 'REVIEW', 1308, 'INAPPROPRIATE', 'Đánh giá này có ngôn từ không phù hợp với tiêu chuẩn cộng đồng.', 'RESOLVED', 1003, '2026-11-18 09:00:00', 'Đã ẩn đánh giá khỏi trang công khai.', '2026-11-17 09:00:00'),
  (1603, 1014, 'JOB_POST', 1043, 'OTHER', 'Tin tuyển dụng đã đóng nhưng vẫn cho tôi ứng tuyển được, gây hiểu nhầm.', 'DISMISSED', 1003, '2026-11-21 09:00:00', 'Tin đã đủ người, hành vi người dùng hợp lý.', '2026-11-19 09:00:00');

-- =====================================================================
-- 13. NHẬT KÝ HỆ THỐNG (audit log)
-- =====================================================================
-- Cho dashboard quản trị có số liệu hoạt động.

INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at) VALUES
  (1701, 1002, 'JOB_CREATE', 'JOB_POST', 1001, NULL, '{"title":"Nhân viên phục vụ part-time — Phường Tân Định","status":"PENDING_REVIEW"}', '113.162.14.22', '2026-11-17 09:00:00'),
  (1702, 1003, 'JOB_APPROVE', 'JOB_POST', 1001, '{"status":"PENDING_REVIEW"}', '{"status":"OPEN"}', '113.162.14.22', '2026-11-18 09:00:00'),
  (1703, 1003, 'JOB_REJECT', 'JOB_POST', 1044, '{"status":"PENDING_REVIEW"}', '{"status":"REJECTED","reason":"Mô tả chưa đủ thông tin"}', '113.162.14.22', '2026-10-06 09:00:00'),
  (1704, 1002, 'APPLICATION_STATUS_CHANGE', 'APPLICATION', 1101, '{"status":"PENDING"}', '{"status":"SHORTLISTED"}', '113.162.14.22', '2026-11-17 09:00:00'),
  (1705, 1002, 'APPLICATION_STATUS_CHANGE', 'APPLICATION', 1101, '{"status":"SHORTLISTED"}', '{"status":"ACCEPTED"}', '113.162.14.22', '2026-11-18 09:00:00'),
  (1706, 1002, 'APPLICATION_STATUS_CHANGE', 'APPLICATION', 1104, '{"status":"ACCEPTED"}', '{"status":"COMPLETED"}', '113.162.14.22', '2026-11-05 09:00:00'),
  (1707, 1003, 'REVIEW_HIDE', 'REVIEW', 1308, '{"is_hidden":false}', '{"is_hidden":true}', '113.162.14.22', '2026-11-18 09:00:00'),
  (1708, 1100, 'JOB_CREATE', 'JOB_POST', 1040, NULL, '{"title":"Lập trình viên React thực tập — hybrid","status":"PENDING_REVIEW"}', '14.225.98.7', '2026-10-09 09:00:00'),
  (1709, 1003, 'JOB_APPROVE', 'JOB_POST', 1040, '{"status":"PENDING_REVIEW"}', '{"status":"OPEN"}', '113.162.14.22', '2026-10-10 09:00:00'),
  (1710, 1003, 'USER_LOCK', 'USER', 1107, '{"status":"ACTIVE"}', '{"status":"LOCKED"}', '113.162.14.22', '2026-10-02 09:00:00'),
  (1711, 1003, 'USER_UNLOCK', 'USER', 1107, '{"status":"LOCKED"}', '{"status":"ACTIVE"}', '113.162.14.22', '2026-10-04 09:00:00'),
  (1712, 1001, 'PROFILE_UPDATE', 'STUDENT_PROFILE', 1001, '{"skills":null}', '{"skills":["sk-service","sk-barista","sk-excel"]}', '14.225.98.7', '2026-11-15 09:00:00'),
  (1713, 1102, 'APPLICATION_STATUS_CHANGE', 'APPLICATION', 1120, '{"status":"PENDING"}', '{"status":"REJECTED"}', '14.225.98.7', '2026-11-19 09:00:00'),
  (1714, 1003, 'CATEGORY_UPDATE', 'JOB_CATEGORY', 1, '{"name":"F&B, Barista & Phục vụ"}', '{"name":"F&B, Barista & Phục vụ","icon":"UtensilsCrossed"}', '113.162.14.22', '2026-09-30 09:00:00'),
  (1715, 1002, 'PROFILE_UPDATE', 'EMPLOYER_PROFILE', 1002, '{"description":null}', '{"description":"Chuỗi cà phê và nhà hàng với hệ thống 8 chi nhánh tại TP.HCM."}', '14.225.98.7', '2026-11-16 09:00:00');

-- =====================================================================
-- 14. XẾP HẠNG LƯƠNG THEO NGÀNH × TỈNH
-- =====================================================================
-- `category_id` × `province_id` (id nội bộ). Giá trị quy đổi về đồng/giờ.

INSERT INTO salary_benchmarks (category_id, province_id, avg_hourly, min_hourly, max_hourly, sample_size, updated_at) VALUES
  -- TP. Hồ Chí Minh
  (1, 1, 29000, 22000, 62000, 412, '2026-11-01 00:00:00'),
  (2, 1, 31000, 24000, 58000, 187, '2026-11-01 00:00:00'),
  (3, 1, 27000, 20000, 45000, 268, '2026-11-01 00:00:00'),
  (4, 1, 26000, 21000, 40000, 203, '2026-11-01 00:00:00'),
  (5, 1, 38000, 25000, 80000, 96,  '2026-11-01 00:00:00'),
  (6, 1, 32000, 24000, 60000, 88,  '2026-11-01 00:00:00'),
  (7, 1, 55000, 35000, 120000, 64, '2026-11-01 00:00:00'),
  (8, 1, 65000, 40000, 150000, 71, '2026-11-01 00:00:00'),
  -- Hà Nội
  (1, 2, 28000, 21000, 55000, 356, '2026-11-01 00:00:00'),
  (2, 2, 30000, 23000, 52000, 152, '2026-11-01 00:00:00'),
  (3, 2, 26000, 20000, 43000, 221, '2026-11-01 00:00:00'),
  (4, 2, 25000, 20000, 38000, 178, '2026-11-01 00:00:00'),
  (5, 2, 36000, 24000, 75000, 104, '2026-11-01 00:00:00'),
  (6, 2, 30000, 23000, 55000, 92,  '2026-11-01 00:00:00'),
  (7, 2, 52000, 33000, 110000, 71, '2026-11-01 00:00:00'),
  (8, 2, 62000, 38000, 140000, 83, '2026-11-01 00:00:00'),
  -- Đà Nẵng
  (1, 3, 27000, 20000, 48000, 74,  '2026-11-01 00:00:00'),
  (3, 3, 25000, 19000, 40000, 51,  '2026-11-01 00:00:00'),
  (5, 3, 31000, 21000, 65000, 28,  '2026-11-01 00:00:00'),
  (7, 3, 44000, 28000, 95000, 19,  '2026-11-01 00:00:00'),
  -- Cần Thơ
  (1, 4, 24000, 18000, 40000, 42,  '2026-11-01 00:00:00'),
  (3, 4, 23000, 18000, 38000, 33,  '2026-11-01 00:00:00'),
  (6, 4, 26000, 20000, 46000, 21,  '2026-11-01 00:00:00'),
  -- Đồng Nai
  (1, 5, 25000, 19000, 42000, 58,  '2026-11-01 00:00:00'),
  (4, 5, 24000, 20000, 36000, 44,  '2026-11-01 00:00:00'),
  (8, 5, 48000, 30000, 100000, 66, '2026-11-01 00:00:00'),
  -- Đắk Lắk
  (1, 6, 23000, 17000, 38000, 26,  '2026-11-01 00:00:00'),
  (7, 6, 38000, 25000, 70000, 23,  '2026-11-01 00:00:00');

-- =====================================================================
-- 15. TÙY CHỌN THÔNG BÁO TIN TUYỂN DỤNG
-- =====================================================================
-- `category_code` = `job_categories.code`, `province_code` = mã tỉnh 2 chữ số
-- hoặc 'ALL' để theo dõi mọi tỉnh.

INSERT INTO job_notify_preferences (user_id, category_code, province_code, created_at) VALUES
  (1001, 'cat-fnb', '79', '2026-08-01 09:00:00'),
  (1001, 'cat-ban-tang', '79', '2026-08-01 09:00:00'),
  (1010, 'cat-marketing', 'ALL', '2026-08-15 09:00:00'),
  (1011, 'cat-cong-nghe', 'ALL', '2026-08-20 09:00:00'),
  (1012, 'cat-day-hoc', '01', '2026-08-25 09:00:00'),
  (1013, 'cat-giao-hang', '79', '2026-09-01 09:00:00'),
  (1016, 'cat-marketing', '01', '2026-09-05 09:00:00'),
  (1019, 'cat-van-phong', '92', '2026-09-10 09:00:00');

-- =====================================================================
-- 16. ĐỒNG BỘ SỐ LIỆU DẪN XUẤT (quan trọng cho video demo)
-- =====================================================================
-- Mọi số liệu "đã vận hành" ở trên được TÍNH LẠI từ dữ liệu thật đang có
-- trong DB, thay vì để con số bịa rời rạc. Cụ thể:
--
--   job_posts.applicant_count  = số đơn ứng tuyển THẬT của tin đó
--                                (không tính đơn đã WITHDRAWN — đúng như
--                                 logic backend giảm bộ đếm khi SV rút đơn)
--   job_posts.positions_filled  = số đơn ACCEPTED (đã vào làm)
--   job_posts.view_count        = applicant_count + lượt xem tự nhiên
--                                 (luôn >= số ứng viên)
--   student_profiles / employer_profiles
--       .avg_rating/.rating_count = tính từ bảng `reviews` (bỏ qua đánh
--                                 giá đang ẩn) — y hệt công thức
--                                 `ReviewServiceImpl.recalculateRating`
--
-- Cách làm: tạo bảng tạm, tính bằng SQL, rồi UPDATE bằng JOIN. Cách này
-- đảm bảo "số trên UI luôn bằng số bên trong DB" — không bao giờ lệch.
--
-- ---------------------------------------------------------------------
-- 16.1. Bộ đếm ứng viên + suất đã tuyển + lượt xem của từng tin
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_job_stats;
CREATE TEMPORARY TABLE tmp_job_stats (
  job_post_id    BIGINT PRIMARY KEY,
  real_apps      INT NOT NULL,
  real_accepted  INT NOT NULL,
  real_completed INT NOT NULL
);

INSERT INTO tmp_job_stats (job_post_id, real_apps, real_accepted, real_completed)
SELECT j.id,
       COALESCE(SUM(a.status <> 'WITHDRAWN'), 0),
       COALESCE(SUM(a.status IN ('ACCEPTED', 'COMPLETED')), 0),
       COALESCE(SUM(a.status =  'COMPLETED'), 0)
FROM job_posts j
LEFT JOIN applications a ON a.job_post_id = j.id
WHERE j.id BETWEEN 1000 AND 1999
GROUP BY j.id;

UPDATE job_posts j
JOIN tmp_job_stats s ON s.job_post_id = j.id
SET j.applicant_count = s.real_apps,
    j.positions_filled = LEAST(s.real_accepted, j.positions_count),
    j.view_count       = GREATEST(j.view_count, s.real_apps * 7 + 20);

-- 16.1b. Trạng thái tin tuyển dụng phải khớp số suất đã tuyển
--        (đúng như `ApplicationServiceImpl.syncJobPositions`)
UPDATE job_posts j
JOIN tmp_job_stats s ON s.job_post_id = j.id
SET j.status = CASE
        WHEN j.status IN ('OPEN', 'IN_PROGRESS', 'FILLED')
             AND s.real_accepted >= j.positions_count THEN 'FILLED'
        WHEN j.status IN ('OPEN', 'IN_PROGRESS')
             AND s.real_accepted > 0 THEN 'IN_PROGRESS'
        ELSE j.status
      END
WHERE j.id BETWEEN 1000 AND 1999;

-- ---------------------------------------------------------------------
-- 16.2. Điểm đánh giá của SV / NTD — tính từ bảng `reviews`
-- ---------------------------------------------------------------------
UPDATE student_profiles p
SET p.avg_rating  = COALESCE((
        SELECT ROUND(AVG(r.rating), 1)
        FROM reviews r
        WHERE r.reviewee_id = p.user_id
          AND r.is_hidden = 0
          AND r.application_id IS NOT NULL
      ), 0),
    p.rating_count = (
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.reviewee_id = p.user_id
          AND r.is_hidden = 0
          AND r.application_id IS NOT NULL
      )
WHERE p.user_id BETWEEN 1000 AND 1999;

UPDATE employer_profiles p
SET p.avg_rating  = COALESCE((
        SELECT ROUND(AVG(r.rating), 1)
        FROM reviews r
        WHERE r.reviewee_id = p.user_id
          AND r.is_hidden = 0
          AND r.application_id IS NOT NULL
      ), 0),
    p.rating_count = (
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.reviewee_id = p.user_id
          AND r.is_hidden = 0
          AND r.application_id IS NOT NULL
      )
WHERE p.user_id BETWEEN 1000 AND 1999;

-- 16.2b. Điểm trong lịch sử làm việc = điểm NTD đã đánh giá SV đó
--        (khớp `ReviewServiceImpl.syncWorkHistoryRating`)
UPDATE work_assignments w
JOIN reviews r
  ON r.application_id = w.application_id
 AND r.reviewer_role = 'EMPLOYER'
 AND r.is_hidden = 0
SET w.rating = r.rating
WHERE w.id BETWEEN 1000 AND 1999;

DROP TEMPORARY TABLE IF EXISTS tmp_job_stats;

-- ---------------------------------------------------------------------
-- 16.3. TỰ KIỂM TRA TÍNH NHẤT QUÁN
-- ---------------------------------------------------------------------
-- Mọi dòng dưới đây PHẢI ra 0. Nếu khác 0 → dữ liệu demo bị lệch,
-- nghĩa là con số hiển thị trên UI không khớp dữ liệu thật trong DB.
--
-- 1) Bộ đếm ứng viên của tin = số đơn ứng tuyển thật (bỏ đơn đã rút)
SELECT '1) applicant_count khớp đơn thật' AS kiem_tra, COUNT(*) AS loi
FROM job_posts j
JOIN (SELECT job_post_id, SUM(status <> 'WITHDRAWN') n
      FROM applications GROUP BY job_post_id) a ON a.job_post_id = j.id
WHERE j.applicant_count <> a.n
UNION ALL
-- 2) Suất đã tuyển = số đơn đã vào làm (ACCEPTED + COMPLETED)
SELECT '2) positions_filled khớp đơn đã vào làm', COUNT(*)
FROM job_posts j
JOIN (SELECT job_post_id, SUM(status IN ('ACCEPTED','COMPLETED')) n
      FROM applications GROUP BY job_post_id) a ON a.job_post_id = j.id
WHERE j.positions_filled <> LEAST(a.n, j.positions_count)
UNION ALL
-- 3) Lượt xem luôn >= số ứng viên
SELECT '3) view_count >= applicant_count', COUNT(*)
FROM job_posts WHERE view_count < applicant_count
UNION ALL
-- 4) Điểm đánh giá của SV = tính từ bảng reviews
SELECT '4) avg_rating SV khớp reviews', COUNT(*)
FROM student_profiles p
LEFT JOIN (SELECT reviewee_id, ROUND(AVG(rating), 1) avg, COUNT(*) c
           FROM reviews WHERE is_hidden = 0 AND application_id IS NOT NULL
           GROUP BY reviewee_id) r ON r.reviewee_id = p.user_id
WHERE p.avg_rating <> COALESCE(r.avg, 0) OR p.rating_count <> COALESCE(r.c, 0)
UNION ALL
-- 5) Điểm đánh giá của NTD = tính từ bảng reviews
SELECT '5) avg_rating NTD khớp reviews', COUNT(*)
FROM employer_profiles p
LEFT JOIN (SELECT reviewee_id, ROUND(AVG(rating), 1) avg, COUNT(*) c
           FROM reviews WHERE is_hidden = 0 AND application_id IS NOT NULL
           GROUP BY reviewee_id) r ON r.reviewee_id = p.user_id
WHERE p.avg_rating <> COALESCE(r.avg, 0) OR p.rating_count <> COALESCE(r.c, 0)
UNION ALL
-- 6) Chỉ đánh giá được sau khi công việc HOÀN THÀNH (luật của backend)
SELECT '6) review trên đơn chưa COMPLETED', COUNT(*)
FROM reviews r JOIN applications a ON a.id = r.application_id
WHERE a.status <> 'COMPLETED'
UNION ALL
-- 7) Mỗi đơn COMPLETED có đúng 1 dòng lịch sử làm việc
SELECT '7) đơn COMPLETED thiếu work_history', COUNT(*)
FROM applications a
LEFT JOIN work_assignments w ON w.application_id = a.id
WHERE a.status = 'COMPLETED' AND w.application_id IS NULL
UNION ALL
-- 8) Không có work_history cho đơn chưa hoàn thành
SELECT '8) work_history cho đơn chưa xong', COUNT(*)
FROM work_assignments w JOIN applications a ON a.id = w.application_id
WHERE a.status <> 'COMPLETED'
UNION ALL
-- 9) Timeline kết thúc đúng bằng trạng thái hiện tại của đơn
SELECT '9) timeline lệch trạng thái đơn', COUNT(*)
FROM applications a
LEFT JOIN (SELECT application_id, MAX(changed_at) mt
           FROM application_status_history GROUP BY application_id) h
  ON h.application_id = a.id
LEFT JOIN application_status_history l
  ON l.application_id = a.id AND l.changed_at = h.mt
WHERE l.to_status <> a.status
UNION ALL
-- 10) Mọi đơn đều có timeline
SELECT '10) đơn thiếu timeline', COUNT(*)
FROM applications a
LEFT JOIN application_status_history h ON h.application_id = a.id
WHERE h.application_id IS NULL
UNION ALL
-- 11) Ward của tin thuộc đúng tỉnh
SELECT '11) ward không thuộc tỉnh của tin', COUNT(*)
FROM job_posts j JOIN wards w ON w.id = j.ward_id
WHERE w.province_id <> j.province_id
UNION ALL
-- 12) Tỉnh của hồ sơ SV/NTD phải tồn tại
SELECT '12) tỉnh hồ sơ không tồn tại', (
        SELECT COUNT(*) FROM student_profiles s
          LEFT JOIN provinces p ON p.id = s.province_id
         WHERE s.province_id IS NOT NULL AND p.id IS NULL)
     + (SELECT COUNT(*) FROM employer_profiles e
          LEFT JOIN provinces p ON p.id = e.province_id
         WHERE e.province_id IS NOT NULL AND p.id IS NULL)
UNION ALL
-- 13) Điểm trong lịch sử làm việc = điểm NTD đã đánh giá
SELECT '13) rating work_history khớp đánh giá', COUNT(*)
FROM work_assignments w
LEFT JOIN (SELECT application_id, rating FROM reviews
           WHERE reviewer_role = 'EMPLOYER' AND is_hidden = 0) r
  ON r.application_id = w.application_id
WHERE w.rating <> COALESCE(r.rating, w.rating)
UNION ALL
-- 14) Mỗi sinh viên không ứng tuyển trùng tin
SELECT '14) ứng tuyển trùng tin', COUNT(*)
FROM (SELECT job_post_id, student_id FROM applications
      GROUP BY job_post_id, student_id HAVING COUNT(*) > 1) d
UNION ALL
-- 15) Thông báo phải trỏ tới đơn/tin có thật
SELECT '15) thông báo trỏ tới đơn không tồn tại', COUNT(*)
FROM notifications n
JOIN applications a ON a.slug = SUBSTRING_INDEX(n.link, '/', -1)
WHERE n.link LIKE '/student/applications/%' AND a.id IS NULL;

-- =====================================================================
-- KẾT THÚC
-- =====================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- Bảng tổng kết (tiện kiểm tra sau khi seed)
SELECT 'Nguồn dùng demo'      AS bang, COUNT(*) AS so_luong FROM users                 WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Tin tuyển dụng',      COUNT(*) FROM job_posts             WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Đơn ứng tuyển',        COUNT(*) FROM applications          WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Đánh giá',             COUNT(*) FROM reviews               WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Thông báo',             COUNT(*) FROM notifications         WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Kinh nghiệm làm việc',  COUNT(*) FROM work_assignments       WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Tin đã lưu',            COUNT(*) FROM saved_jobs            WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Báo cáo vi phạm',       COUNT(*) FROM reports                WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Nhật ký hệ thống',      COUNT(*) FROM audit_logs             WHERE id BETWEEN 1000 AND 1999;

-- Số liệu dẫn xuất (đã được đồng bộ ở phần 16) — để đối chiếu nhanh
SELECT 'Đơn đang chờ (PENDING)'     AS chi_so, COUNT(*) AS so_lieu FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'PENDING'
UNION ALL SELECT 'Đơn được duyệt sơ bộ',   COUNT(*) FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'SHORTLISTED'
UNION ALL SELECT 'Đơn đã nhận',           COUNT(*) FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'ACCEPTED'
UNION ALL SELECT 'Đơn hoàn thành',        COUNT(*) FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'COMPLETED'
UNION ALL SELECT 'Đơn bị từ chối',        COUNT(*) FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'REJECTED'
UNION ALL SELECT 'Đơn đã rút',            COUNT(*) FROM applications  WHERE id BETWEEN 1000 AND 1999 AND status = 'WITHDRAWN'
UNION ALL SELECT 'Tổng số ứng viên (đếm được)', COALESCE(SUM(applicant_count), 0) FROM job_posts WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Tổng lượt xem tin',      COALESCE(SUM(view_count), 0) FROM job_posts WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Tổng suất đã tuyển',    COALESCE(SUM(positions_filled), 0) FROM job_posts WHERE id BETWEEN 1000 AND 1999
UNION ALL SELECT 'Tổng số điểm đánh giá',  COALESCE(SUM(rating_count), 0) FROM student_profiles WHERE user_id BETWEEN 1000 AND 1999;
