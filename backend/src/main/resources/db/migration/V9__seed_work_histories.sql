-- ---------------------------------------------------------------------
-- V9 — KINH NGHIỆM LÀM VIỆC TỰ ĐỘNG CHO DỮ LIỆU SEED
--
-- Mỗi đơn ứng tuyển `COMPLETED` sẽ tự sinh 1 dòng trong bảng
-- `work_assignments` (sinh viên được nhà tuyển dụng xác nhận hoàn thành).
-- V3 — vốn chạy trước — không thể INSERT các cột mới của V8, nên file
-- này bổ sung dữ liệu cho các đơn seed đã hoàn thành.
--
-- File được sinh tự động bởi `pnpm seed:sql` — không sửa tay.
-- ---------------------------------------------------------------------

INSERT INTO work_assignments (
    slug, application_id, job_post_id, student_id, employer_id, status,
    started_at, ended_at, employer_confirmed_at,
    job_title, company_name, position_name,
    salary_type, salary_min, salary_max, note, rating, created_at
) SELECT
    'wh-001',
    a.id,
    j.id,
    8,
    2,
    'COMPLETED',
    '2026-11-07 13:00:00',
    '2026-11-13 09:00:00',
    '2026-11-13 09:00:00',
    'Nhân viên thu ngân ca đêm — Đã đóng',
    'Công ty Cổ phần VieJob Demo',
    'Thu ngân',
    'HOURLY',
    32000,
    38000,
    'Đã làm xong 2 ca, trả lương đúng hẹn.',
    5,
    '2026-11-13 09:00:00'
FROM applications a
JOIN job_posts j ON j.slug = 'job-demo-005'
WHERE a.slug = 'app-007'
ON DUPLICATE KEY UPDATE
    note = VALUES(note),
    rating = VALUES(rating);
INSERT INTO work_assignments (
    slug, application_id, job_post_id, student_id, employer_id, status,
    started_at, ended_at, employer_confirmed_at,
    job_title, company_name, position_name,
    salary_type, salary_min, salary_max, note, rating, created_at
) SELECT
    'wh-002',
    a.id,
    j.id,
    1,
    2,
    'COMPLETED',
    '2026-10-31 01:00:00',
    '2026-11-10 01:00:00',
    '2026-11-10 01:00:00',
    'Nhân viên lễ tân — Hà Nội',
    'Công ty Cổ phần VieJob Demo',
    'Lễ tân / Order',
    'HOURLY',
    25000,
    30000,
    'Đã làm xong 6 ca, trả lương đúng hẹn.',
    4,
    '2026-11-10 09:00:00'
FROM applications a
JOIN job_posts j ON j.slug = 'job-demo-002'
WHERE a.slug = 'app-008'
ON DUPLICATE KEY UPDATE
    note = VALUES(note),
    rating = VALUES(rating);
INSERT INTO work_assignments (
    slug, application_id, job_post_id, student_id, employer_id, status,
    started_at, ended_at, employer_confirmed_at,
    job_title, company_name, position_name,
    salary_type, salary_min, salary_max, note, rating, created_at
) SELECT
    'wh-003',
    a.id,
    j.id,
    1,
    2,
    'COMPLETED',
    '2026-10-25 05:00:00',
    '2026-11-05 01:00:00',
    '2026-11-05 01:00:00',
    'Nhân viên thu ngân ca đêm — Đã đóng',
    'Công ty Cổ phần VieJob Demo',
    'Thu ngân',
    'HOURLY',
    32000,
    38000,
    'Đã làm xong 8 ca, ứng viên rất chuyên nghiệp.',
    5,
    '2026-11-05 09:00:00'
FROM applications a
JOIN job_posts j ON j.slug = 'job-demo-005'
WHERE a.slug = 'app-009'
ON DUPLICATE KEY UPDATE
    note = VALUES(note),
    rating = VALUES(rating);
