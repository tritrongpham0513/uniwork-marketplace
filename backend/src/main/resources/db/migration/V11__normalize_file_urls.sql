-- ---------------------------------------------------------------------
-- V11 — CHUẨN HOÁ URL FILE + INDEX TRA CỨU
--
-- 1. URL file chuyển về dạng TƯƠNG ĐỐI: /api/v1/files/{slug}
--
--    Trước đây backend trả URL tuyệt đối ghép từ APP_PUBLIC_BASE_URL
--    (mặc định http://localhost:8080). Hệ quả:
--      - bản dev (:5173 -> API :8081) trỏ nhầm sang backend prod :8080,
--      - deploy thật thì localhost:8080 không tồn tại với người dùng.
--
--    App và API luôn cùng origin (nginx / Vite proxy) nên URL tương đối là
--    đúng ở mọi môi trường. Migration này chỉ tác động lên các URL do hệ
--    thống cũ sinh ra (có chứa /api/v1/files/) — URL ngoài giữ nguyên.
--
-- 2. Index cho truy vấn "file còn được tham chiếu không?" trước khi xoá.
-- ---------------------------------------------------------------------

UPDATE student_profiles
SET avatar_url = CONCAT('/api/v1/files/', SUBSTRING_INDEX(avatar_url, '/api/v1/files/', -1))
WHERE avatar_url LIKE '%/api/v1/files/%';

UPDATE student_profiles
SET cv_url = CONCAT('/api/v1/files/', SUBSTRING_INDEX(cv_url, '/api/v1/files/', -1))
WHERE cv_url LIKE '%/api/v1/files/%';

UPDATE employer_profiles
SET logo_url = CONCAT('/api/v1/files/', SUBSTRING_INDEX(logo_url, '/api/v1/files/', -1))
WHERE logo_url LIKE '%/api/v1/files/%';

UPDATE applications
SET cv_url = CONCAT('/api/v1/files/', SUBSTRING_INDEX(cv_url, '/api/v1/files/', -1))
WHERE cv_url LIKE '%/api/v1/files/%';

UPDATE reviews
SET from_avatar_url = CONCAT('/api/v1/files/', SUBSTRING_INDEX(from_avatar_url, '/api/v1/files/', -1))
WHERE from_avatar_url LIKE '%/api/v1/files/%';

CREATE INDEX idx_applications_cv_url ON applications (cv_url);
CREATE INDEX idx_reviews_from_avatar_url ON reviews (from_avatar_url);
