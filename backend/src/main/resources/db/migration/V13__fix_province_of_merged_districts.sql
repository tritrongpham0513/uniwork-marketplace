-- ---------------------------------------------------------------------
-- V13 — SỬA TỈNH CỦA QUẬN CŨ KHI TỈNH CŨ ĐÃ SÁP NHẬP (Bình Dương)
--
-- Bối cảnh
--   V12 gán `districts.province_code` theo slug tỉnh cũ (V3 seed): `bd` → `75`
--   (Thành phố Đồng Nai). Nhưng Bình Dương đã SÁP NHẬP từ 01/07/2025:
--     - Thành phố Thủ Dầu Một → TP. Hồ Chí Minh (79)
--     - Thị xã Dĩ An           → TP. Hồ Chí Minh (79)
--     - phần còn lại             → Thành phố Đồng Nai (75)
--   ⇒ 2 quận này có `province_code` (75) khác tỉnh chứa xã tương ứng (79),
--     kéo theo job seed có `province_id` sai.
--
-- Thay đổi
--   1. `districts.province_code` — gán lại theo tỉnh chứa xã tương ứng.
--   2. `job_posts.province_id`   — đồng bộ theo tỉnh của `ward_id`.
--   3. `job_posts.ward_name`     — đồng bộ lại tên xã (phòng khi lệch).
--
-- Idempotent: chạy lại nhiều lần vẫn cho kết quả giống nhau.
-- ---------------------------------------------------------------------

-- 1. `districts.province_code` theo tỉnh chứa xã (bảng map quận cũ → xã mới).
UPDATE districts d
JOIN legacy_district_ward_map m ON m.legacy_code = d.code
JOIN wards w                    ON w.id = m.ward_id
JOIN provinces wp                ON wp.id = w.province_id
SET d.province_code = wp.code
WHERE d.province_code IS NULL OR d.province_code <> wp.code;

-- 2 & 3. `job_posts`: tỉnh + tên xã luôn khớp với xã/phường đã gán.
UPDATE job_posts j
JOIN wards w     ON w.id = j.ward_id
JOIN provinces p ON p.id = w.province_id
SET j.province_id = p.id,
    j.ward_name   = w.name
WHERE j.province_id <> p.id
   OR j.ward_name IS NULL
   OR j.ward_name <> w.name;
