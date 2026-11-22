-- ---------------------------------------------------------------------
-- V12 — DANH MỤC HÀNH CHÍNH VIỆT NAM ĐẦY ĐỦ (34 TỈNH + 3.321 XÃ/PHƯỜNG)
--
-- Bối cảnh
--   Dữ liệu cũ trong V3 chỉ có 6 tỉnh / 37 quận, code thủ công ("q1", "btanh").
--   Từ 01/07/2025 Việt Nam bỏ cấp huyện (Quyết định 19/2025/QĐ-TTg) và sắp xếp
--   còn 34 tỉnh/thành phố → 3.321 xã/phường/đặc khu (cấu trúc 2 cấp).
--
-- Nguồn
--   Tỉnh + xã/phường : thanglequoc/vietnamese-provinces-database (MIT, 1.8k★)
--     https://github.com/thanglequoc/vietnamese-provinces-database
--     json/simplified_json_generated_data_vn_units.json
--     bản v5.2.0 theo 388/NQ-UBTVQH16 — hiệu lực 20/09/2026.
--   Bảng map quận cũ → xã mới : HuyChuong/vietnam-administrative-units (CC-BY-4.0)
--     https://github.com/HuyChuong/vietnam-administrative-units
--     data/xa-cu-moi.json
--   Dữ liệu gốc từ API Cục Thống kê (danhmuchanhchinh.nso.gov.vn/DMDVHC.asmx).
--   Mã số: tỉnh 2 chữ số (01, 04, 08 …), xã 5 chữ số (00001 … 99999).
--
-- Thay đổi
--   1. Bảng `provinces` MỞ RỘNG: +full_name, +name_en, +full_name_en,
--      +division_type, +ward_count, +legacy_code.
--      Code chuyển sang mã chính thức 2 chữ số (thay slug "hcm"/"hn"/…).
--      Slug cũ được giữ ở `legacy_code` để map ngược.
--   2. Bảng mới `wards` — 3.321 xã/phường/đặc khu (thay cho cấp huyện).
--   3. Bảng mới `legacy_district_ward_map` — map quận/huyện CŨ → xã/phường MỚI
--      (37 quận seed trong V3 → xã tương ứng).
--   4. `job_posts` thêm `ward_id` + `ward_name`, backfill từ bảng map.
--   5. `student_job_preferences.province_ids` (JSON) chuẩn hoá sang mã mới.
--
-- Tương thích
--   - `GET /api/v1/public/districts` vẫn trả dữ liệu quận CŨ (chưa break frontend).
--     Endpoint `/public/wards` sẽ bổ sung ở bước backend refactor sau.
--   - `provinces.id` (nội bộ) KHÔNG đổi → `student_profiles.province_id`,
--     `employer_profiles.province_id`, `salary_benchmarks.province_id`,
--     `job_posts.province_id` không cần backfill.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. MỞ RỘNG BẢNG `provinces`
-- ---------------------------------------------------------------------

ALTER TABLE provinces
    ADD COLUMN full_name     VARCHAR(100) NULL COMMENT 'Tên đầy đủ (VD: Thành phố Hà Nội)',
    ADD COLUMN name_en       VARCHAR(100) NULL COMMENT 'Tên tiếng Anh',
    ADD COLUMN full_name_en  VARCHAR(120) NULL COMMENT 'Tên đầy đủ tiếng Anh',
    ADD COLUMN division_type VARCHAR(40)  NULL COMMENT 'Tỉnh | Thành phố trực thuộc Trung ương',
    ADD COLUMN ward_count    SMALLINT     NOT NULL DEFAULT 0 COMMENT 'Số đơn vị cấp xã',
    ADD COLUMN legacy_code   VARCHAR(40)  NULL COMMENT 'Slug code cũ (VD: hcm) để map ngược';

-- Bảng tạm giữ dữ liệu cũ trước khi thay code.
CREATE TABLE _v12_province_backup LIKE provinces;

INSERT INTO _v12_province_backup (id, code, name)
SELECT id, code, name FROM provinces;

-- Tạm tắt kiểm tra FK để đổi `code` của 6 tỉnh cũ trong lúc yên.
SET FOREIGN_KEY_CHECKS = 0;

-- Đổi code của 6 tỉnh cũ sang mã chính thức, giữ slug cũ ở `legacy_code`.
UPDATE provinces SET code = '79', name = 'Thành phố Hồ Chí Minh', legacy_code = 'hcm' WHERE code = 'hcm';
UPDATE provinces SET code = '01', name = 'Thành phố Hà Nội',     legacy_code = 'hn'  WHERE code = 'hn';
UPDATE provinces SET code = '48', name = 'Thành phố Đà Nẵng',     legacy_code = 'dn'  WHERE code = 'dn';
UPDATE provinces SET code = '92', name = 'Thành phố Cần Thơ',     legacy_code = 'ct'  WHERE code = 'ct';
UPDATE provinces SET code = '75', name = 'Thành phố Đồng Nai',    legacy_code = 'bd'  WHERE code = 'bd';
UPDATE provinces SET code = '66', name = 'Tỉnh Đắk Lắk',         legacy_code = 'dak' WHERE code = 'dak';

SET FOREIGN_KEY_CHECKS = 1;

-- `districts` (bảng quận/huyện CŨ) giữ nguyên để không break frontend hiện tại,
-- bổ sung cột trỏ tới mã tỉnh mới để map được sang cấp xã.
ALTER TABLE districts
    ADD COLUMN province_code VARCHAR(2) NULL COMMENT 'Mã tỉnh mới (2 chữ số)';

-- Nạp đủ 34 tỉnh. `id` tự tăng — 6 tỉnh cũ đã chiếm id 1..6 nên id mới bắt đầu từ 7.
INSERT INTO provinces (code, name, full_name, name_en, full_name_en, division_type, ward_count, legacy_code) VALUES
       ('04', 'Tỉnh Cao Bằng', 'Cao Bằng', 'Cao Bang', 'Cao Bang Province', 'Tỉnh', 56, NULL),
       ('08', 'Tỉnh Tuyên Quang', 'Tuyên Quang', 'Tuyen Quang', 'Tuyen Quang Province', 'Tỉnh', 124, NULL),
       ('11', 'Tỉnh Điện Biên', 'Điện Biên', 'Dien Bien', 'Dien Bien Province', 'Tỉnh', 45, NULL),
       ('12', 'Tỉnh Lai Châu', 'Lai Châu', 'Lai Chau', 'Lai Chau Province', 'Tỉnh', 38, NULL),
       ('14', 'Tỉnh Sơn La', 'Sơn La', 'Son La', 'Son La Province', 'Tỉnh', 75, NULL),
       ('15', 'Tỉnh Lào Cai', 'Lào Cai', 'Lao Cai', 'Lao Cai Province', 'Tỉnh', 99, NULL),
       ('19', 'Tỉnh Thái Nguyên', 'Thái Nguyên', 'Thai Nguyen', 'Thai Nguyen Province', 'Tỉnh', 92, NULL),
       ('20', 'Tỉnh Lạng Sơn', 'Lạng Sơn', 'Lang Son', 'Lang Son Province', 'Tỉnh', 65, NULL),
       ('22', 'Thành phố Quảng Ninh', 'Quảng Ninh', 'Quang Ninh', 'Quang Ninh City', 'Thành phố trực thuộc Trung ương', 54, NULL),
       ('24', 'Thành phố Bắc Ninh', 'Bắc Ninh', 'Bac Ninh', 'Bac Ninh City', 'Thành phố trực thuộc Trung ương', 99, NULL),
       ('25', 'Tỉnh Phú Thọ', 'Phú Thọ', 'Phu Tho', 'Phu Tho Province', 'Tỉnh', 148, NULL),
       ('31', 'Thành phố Hải Phòng', 'Hải Phòng', 'Haiphong', 'Haiphong City', 'Thành phố trực thuộc Trung ương', 114, NULL),
       ('33', 'Tỉnh Hưng Yên', 'Hưng Yên', 'Hung Yen', 'Hung Yen Province', 'Tỉnh', 104, NULL),
       ('37', 'Tỉnh Ninh Bình', 'Ninh Bình', 'Ninh Binh', 'Ninh Binh Province', 'Tỉnh', 129, NULL),
       ('38', 'Tỉnh Thanh Hoá', 'Thanh Hoá', 'Thanh Hoa', 'Thanh Hoa Province', 'Tỉnh', 166, NULL),
       ('40', 'Tỉnh Nghệ An', 'Nghệ An', 'Nghe An', 'Nghe An Province', 'Tỉnh', 130, NULL),
       ('42', 'Tỉnh Hà Tĩnh', 'Hà Tĩnh', 'Ha Tinh', 'Ha Tinh Province', 'Tỉnh', 69, NULL),
       ('44', 'Tỉnh Quảng Trị', 'Quảng Trị', 'Quang Tri', 'Quang Tri Province', 'Tỉnh', 78, NULL),
       ('46', 'Thành phố Huế', 'Huế', 'Hue', 'Hue City', 'Thành phố trực thuộc Trung ương', 40, NULL),
       ('51', 'Tỉnh Quảng Ngãi', 'Quảng Ngãi', 'Quang Ngai', 'Quang Ngai Province', 'Tỉnh', 96, NULL),
       ('52', 'Tỉnh Gia Lai', 'Gia Lai', 'Gia Lai', 'Gia Lai Province', 'Tỉnh', 135, NULL),
       ('56', 'Tỉnh Khánh Hoà', 'Khánh Hoà', 'Khanh Hoa', 'Khanh Hoa Province', 'Tỉnh', 65, NULL),
       ('68', 'Tỉnh Lâm Đồng', 'Lâm Đồng', 'Lam Dong', 'Lam Dong Province', 'Tỉnh', 124, NULL),
       ('80', 'Tỉnh Tây Ninh', 'Tây Ninh', 'Tay Ninh', 'Tay Ninh Province', 'Tỉnh', 96, NULL),
       ('82', 'Tỉnh Đồng Tháp', 'Đồng Tháp', 'Dong Thap', 'Dong Thap Province', 'Tỉnh', 102, NULL),
       ('86', 'Tỉnh Vĩnh Long', 'Vĩnh Long', 'Vinh Long', 'Vinh Long Province', 'Tỉnh', 124, NULL),
       ('91', 'Tỉnh An Giang', 'An Giang', 'An Giang', 'An Giang Province', 'Tỉnh', 102, NULL),
       ('96', 'Tỉnh Cà Mau', 'Cà Mau', 'Ca Mau', 'Ca Mau Province', 'Tỉnh', 64, NULL);
-- Bổ sung metadata cho 6 tỉnh đã có sẵn từ V3 (đổi code ở trên).
UPDATE provinces SET name = 'Hà Nội', full_name = 'Thành phố Hà Nội', name_en = 'Hanoi', full_name_en = 'Hanoi City', division_type = 'Thành phố trực thuộc Trung ương', ward_count = 126 WHERE code = '01';
UPDATE provinces SET name = 'Đà Nẵng', full_name = 'Thành phố Đà Nẵng', name_en = 'Da Nang', full_name_en = 'Da Nang City', division_type = 'Thành phố trực thuộc Trung ương', ward_count = 94 WHERE code = '48';
UPDATE provinces SET name = 'Đắk Lắk', full_name = 'Tỉnh Đắk Lắk', name_en = 'Dak Lak', full_name_en = 'Dak Lak Province', division_type = 'Tỉnh', ward_count = 102 WHERE code = '66';
UPDATE provinces SET name = 'Đồng Nai', full_name = 'Thành phố Đồng Nai', name_en = 'Dong Nai', full_name_en = 'Dong Nai City', division_type = 'Thành phố trực thuộc Trung ương', ward_count = 95 WHERE code = '75';
UPDATE provinces SET name = 'Hồ Chí Minh', full_name = 'Thành phố Hồ Chí Minh', name_en = 'Ho Chi Minh', full_name_en = 'Ho Chi Minh City', division_type = 'Thành phố trực thuộc Trung ương', ward_count = 168 WHERE code = '79';
UPDATE provinces SET name = 'Cần Thơ', full_name = 'Thành phố Cần Thơ', name_en = 'Can Tho', full_name_en = 'Can Tho City', division_type = 'Thành phố trực thuộc Trung ương', ward_count = 103 WHERE code = '92';

-- Chuẩn hoá `districts` cũ → gắn mã tỉnh mới theo slug cũ.
UPDATE districts d
JOIN _v12_province_backup b ON b.id = d.province_id
JOIN provinces p             ON p.legacy_code = b.code
SET d.province_code = p.code;

-- Dọn bảng tạm.
DROP TABLE _v12_province_backup;

-- ---------------------------------------------------------------------
-- 2. BẢNG `wards` — 3.321 XÃ / PHƯỜNG / ĐẶC KHU
-- ---------------------------------------------------------------------

CREATE TABLE wards (
    id           INT          NOT NULL AUTO_INCREMENT,
    province_id  SMALLINT     NOT NULL,
    code         VARCHAR(10)  NOT NULL COMMENT 'Mã đơn vị hành chính chính thức (5 chữ số)',
    name         VARCHAR(100) NOT NULL COMMENT 'Tên đầy đủ (VD: Phường Ba Đình)',
    short_name   VARCHAR(100) NOT NULL COMMENT 'Tên ngắn (VD: Ba Đình)',
    name_en      VARCHAR(120) NULL     COMMENT 'Tên tiếng Anh',
    postal_code  VARCHAR(20)  NULL     COMMENT 'Mã bưu chính',
    slug         VARCHAR(120) NULL     COMMENT 'Slug không dấu',
    PRIMARY KEY (id),
    UNIQUE KEY uq_wards_code (code),
    -- KHÔNG unique (province_id, name): MySQL dùng collation không phân biệt
    -- dấu/hoa-thường (utf8mb4_unicode_ci) nên "Xã Văn Lang" (Thái Nguyên, 02143)
    -- và "Xã Văn Lăng" (Lạng Sơn, 06154) bị coi là trùng. Mã đơn vị hành chính
    -- (`code`) mới là định danh duy nhất theo Quyết định 19/2025/QĐ-TTg.
    KEY idx_wards_province_name (province_id, name),
    KEY idx_wards_province (province_id),
    KEY idx_wards_name (name),
    KEY idx_wards_slug (slug),
    CONSTRAINT fk_wards_province FOREIGN KEY (province_id) REFERENCES provinces (id)
) ENGINE=InnoDB;

INSERT INTO wards (province_id, code, name, short_name, name_en, postal_code, slug)
SELECT p.id, w.code, w.name, w.short_name, w.name_en, w.postal_code, w.slug
FROM (
       SELECT '01' AS province_code, '00004' AS code, 'Phường Ba Đình' AS name, 'Ba Đình' AS short_name, 'Ba Dinh' AS name_en, '11120' AS postal_code, 'ba_dinh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00008' AS code, 'Phường Ngọc Hà' AS name, 'Ngọc Hà' AS short_name, 'Ngoc Ha' AS name_en, '11119' AS postal_code, 'ngoc_ha' AS slug
UNION ALL
       SELECT '01' AS province_code, '00025' AS code, 'Phường Giảng Võ' AS name, 'Giảng Võ' AS short_name, 'Giang Vo' AS name_en, '11110' AS postal_code, 'giang_vo' AS slug
UNION ALL
       SELECT '01' AS province_code, '00070' AS code, 'Phường Hoàn Kiếm' AS name, 'Hoàn Kiếm' AS short_name, 'Hoan Kiem' AS name_en, '11024' AS postal_code, 'hoan_kiem' AS slug
UNION ALL
       SELECT '01' AS province_code, '00082' AS code, 'Phường Cửa Nam' AS name, 'Cửa Nam' AS short_name, 'Cua Nam' AS name_en, '11018' AS postal_code, 'cua_nam' AS slug
UNION ALL
       SELECT '01' AS province_code, '00091' AS code, 'Phường Phú Thượng' AS name, 'Phú Thượng' AS short_name, 'Phu Thuong' AS name_en, '11210' AS postal_code, 'phu_thuong' AS slug
UNION ALL
       SELECT '01' AS province_code, '00097' AS code, 'Phường Hồng Hà' AS name, 'Hồng Hà' AS short_name, 'Hong Ha' AS name_en, '11025' AS postal_code, 'hong_ha' AS slug
UNION ALL
       SELECT '01' AS province_code, '00103' AS code, 'Phường Tây Hồ' AS name, 'Tây Hồ' AS short_name, 'Tay Ho' AS name_en, '11214' AS postal_code, 'tay_ho' AS slug
UNION ALL
       SELECT '01' AS province_code, '00118' AS code, 'Phường Bồ Đề' AS name, 'Bồ Đề' AS short_name, 'Bo De' AS name_en, '11813' AS postal_code, 'bo_de' AS slug
UNION ALL
       SELECT '01' AS province_code, '00127' AS code, 'Phường Việt Hưng' AS name, 'Việt Hưng' AS short_name, 'Viet Hung' AS name_en, '11806' AS postal_code, 'viet_hung' AS slug
UNION ALL
       SELECT '01' AS province_code, '00136' AS code, 'Phường Phúc Lợi' AS name, 'Phúc Lợi' AS short_name, 'Phuc Loi' AS name_en, '11817' AS postal_code, 'phuc_loi' AS slug
UNION ALL
       SELECT '01' AS province_code, '00145' AS code, 'Phường Long Biên' AS name, 'Long Biên' AS short_name, 'Long Bien' AS name_en, '11814' AS postal_code, 'long_bien' AS slug
UNION ALL
       SELECT '01' AS province_code, '00160' AS code, 'Phường Nghĩa Đô' AS name, 'Nghĩa Đô' AS short_name, 'Nghia Do' AS name_en, '11307' AS postal_code, 'nghia_do' AS slug
UNION ALL
       SELECT '01' AS province_code, '00166' AS code, 'Phường Cầu Giấy' AS name, 'Cầu Giấy' AS short_name, 'Cau Giay' AS name_en, '11314' AS postal_code, 'cau_giay' AS slug
UNION ALL
       SELECT '01' AS province_code, '00175' AS code, 'Phường Yên Hoà' AS name, 'Yên Hoà' AS short_name, 'Yen Hoa' AS name_en, '11312' AS postal_code, 'yen_hoa' AS slug
UNION ALL
       SELECT '01' AS province_code, '00190' AS code, 'Phường Ô Chợ Dừa' AS name, 'Ô Chợ Dừa' AS short_name, 'O Cho Dua' AS name_en, '11511' AS postal_code, 'o_cho_dua' AS slug
UNION ALL
       SELECT '01' AS province_code, '00199' AS code, 'Phường Láng' AS name, 'Láng' AS short_name, 'Lang' AS name_en, '11528' AS postal_code, 'lang' AS slug
UNION ALL
       SELECT '01' AS province_code, '00226' AS code, 'Phường Văn Miếu - Quốc Tử Giám' AS name, 'Văn Miếu - Quốc Tử Giám' AS short_name, 'Van Mieu - Quoc Tu Giam' AS name_en, '11508' AS postal_code, 'van_mieu_quoc_tu_giam' AS slug
UNION ALL
       SELECT '01' AS province_code, '00229' AS code, 'Phường Kim Liên' AS name, 'Kim Liên' AS short_name, 'Kim Lien' AS name_en, '11520' AS postal_code, 'kim_lien' AS slug
UNION ALL
       SELECT '01' AS province_code, '00235' AS code, 'Phường Đống Đa' AS name, 'Đống Đa' AS short_name, 'Dong Da' AS name_en, '11527' AS postal_code, 'dong_da' AS slug
UNION ALL
       SELECT '01' AS province_code, '00256' AS code, 'Phường Hai Bà Trưng' AS name, 'Hai Bà Trưng' AS short_name, 'Hai Ba Trung' AS name_en, '11626' AS postal_code, 'hai_ba_trung' AS slug
UNION ALL
       SELECT '01' AS province_code, '00283' AS code, 'Phường Vĩnh Tuy' AS name, 'Vĩnh Tuy' AS short_name, 'Vinh Tuy' AS name_en, '11622' AS postal_code, 'vinh_tuy' AS slug
UNION ALL
       SELECT '01' AS province_code, '00292' AS code, 'Phường Bạch Mai' AS name, 'Bạch Mai' AS short_name, 'Bach Mai' AS name_en, '11618' AS postal_code, 'bach_mai' AS slug
UNION ALL
       SELECT '01' AS province_code, '00301' AS code, 'Phường Vĩnh Hưng' AS name, 'Vĩnh Hưng' AS short_name, 'Vinh Hung' AS name_en, '11712' AS postal_code, 'vinh_hung' AS slug
UNION ALL
       SELECT '01' AS province_code, '00316' AS code, 'Phường Định Công' AS name, 'Định Công' AS short_name, 'Dinh Cong' AS name_en, '11717' AS postal_code, 'dinh_cong' AS slug
UNION ALL
       SELECT '01' AS province_code, '00322' AS code, 'Phường Tương Mai' AS name, 'Tương Mai' AS short_name, 'Tuong Mai' AS name_en, '11715' AS postal_code, 'tuong_mai' AS slug
UNION ALL
       SELECT '01' AS province_code, '00328' AS code, 'Phường Lĩnh Nam' AS name, 'Lĩnh Nam' AS short_name, 'Linh Nam' AS name_en, '11709' AS postal_code, 'linh_nam' AS slug
UNION ALL
       SELECT '01' AS province_code, '00331' AS code, 'Phường Hoàng Mai' AS name, 'Hoàng Mai' AS short_name, 'Hoang Mai' AS name_en, '11720' AS postal_code, 'hoang_mai' AS slug
UNION ALL
       SELECT '01' AS province_code, '00337' AS code, 'Phường Hoàng Liệt' AS name, 'Hoàng Liệt' AS short_name, 'Hoang Liet' AS name_en, '11719' AS postal_code, 'hoang_liet' AS slug
UNION ALL
       SELECT '01' AS province_code, '00340' AS code, 'Phường Yên Sở' AS name, 'Yên Sở' AS short_name, 'Yen So' AS name_en, '11707' AS postal_code, 'yen_so' AS slug
UNION ALL
       SELECT '01' AS province_code, '00352' AS code, 'Phường Phương Liệt' AS name, 'Phương Liệt' AS short_name, 'Phuong Liet' AS name_en, '11412' AS postal_code, 'phuong_liet' AS slug
UNION ALL
       SELECT '01' AS province_code, '00364' AS code, 'Phường Khương Đình' AS name, 'Khương Đình' AS short_name, 'Khuong Dinh' AS name_en, '11410' AS postal_code, 'khuong_dinh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00367' AS code, 'Phường Thanh Xuân' AS name, 'Thanh Xuân' AS short_name, 'Thanh Xuan' AS name_en, '11417' AS postal_code, 'thanh_xuan' AS slug
UNION ALL
       SELECT '01' AS province_code, '00376' AS code, 'Xã Sóc Sơn' AS name, 'Sóc Sơn' AS short_name, 'Soc Son' AS name_en, '12206' AS postal_code, 'soc_son' AS slug
UNION ALL
       SELECT '01' AS province_code, '00382' AS code, 'Xã Kim Anh' AS name, 'Kim Anh' AS short_name, 'Kim Anh' AS name_en, '12234' AS postal_code, 'kim_anh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00385' AS code, 'Xã Trung Giã' AS name, 'Trung Giã' AS short_name, 'Trung Gia' AS name_en, '12210' AS postal_code, 'trung_gia' AS slug
UNION ALL
       SELECT '01' AS province_code, '00430' AS code, 'Xã Đa Phúc' AS name, 'Đa Phúc' AS short_name, 'Da Phuc' AS name_en, '12232' AS postal_code, 'da_phuc' AS slug
UNION ALL
       SELECT '01' AS province_code, '00433' AS code, 'Xã Nội Bài' AS name, 'Nội Bài' AS short_name, 'Noi Bai' AS name_en, '12233' AS postal_code, 'noi_bai' AS slug
UNION ALL
       SELECT '01' AS province_code, '00454' AS code, 'Xã Đông Anh' AS name, 'Đông Anh' AS short_name, 'Dong Anh' AS name_en, '12306' AS postal_code, 'dong_anh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00466' AS code, 'Xã Phúc Thịnh' AS name, 'Phúc Thịnh' AS short_name, 'Phuc Thinh' AS name_en, '12331' AS postal_code, 'phuc_thinh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00475' AS code, 'Xã Thư Lâm' AS name, 'Thư Lâm' AS short_name, 'Thu Lam' AS name_en, '12330' AS postal_code, 'thu_lam' AS slug
UNION ALL
       SELECT '01' AS province_code, '00493' AS code, 'Xã Thiên Lộc' AS name, 'Thiên Lộc' AS short_name, 'Thien Loc' AS name_en, '12332' AS postal_code, 'thien_loc' AS slug
UNION ALL
       SELECT '01' AS province_code, '00508' AS code, 'Xã Vĩnh Thanh' AS name, 'Vĩnh Thanh' AS short_name, 'Vinh Thanh' AS name_en, '12333' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00541' AS code, 'Xã Phù Đổng' AS name, 'Phù Đổng' AS short_name, 'Phu Dong' AS name_en, '12413' AS postal_code, 'phu_dong' AS slug
UNION ALL
       SELECT '01' AS province_code, '00562' AS code, 'Xã Thuận An' AS name, 'Thuận An' AS short_name, 'Thuan An' AS name_en, '12429' AS postal_code, 'thuan_an' AS slug
UNION ALL
       SELECT '01' AS province_code, '00565' AS code, 'Xã Gia Lâm' AS name, 'Gia Lâm' AS short_name, 'Gia Lam' AS name_en, '12428' AS postal_code, 'gia_lam' AS slug
UNION ALL
       SELECT '01' AS province_code, '00577' AS code, 'Xã Bát Tràng' AS name, 'Bát Tràng' AS short_name, 'Bat Trang' AS name_en, '12423' AS postal_code, 'bat_trang' AS slug
UNION ALL
       SELECT '01' AS province_code, '00592' AS code, 'Phường Từ Liêm' AS name, 'Từ Liêm' AS short_name, 'Tu Liem' AS name_en, '12016' AS postal_code, 'tu_liem' AS slug
UNION ALL
       SELECT '01' AS province_code, '00598' AS code, 'Phường Thượng Cát' AS name, 'Thượng Cát' AS short_name, 'Thuong Cat' AS name_en, '11912' AS postal_code, 'thuong_cat' AS slug
UNION ALL
       SELECT '01' AS province_code, '00602' AS code, 'Phường Đông Ngạc' AS name, 'Đông Ngạc' AS short_name, 'Dong Ngac' AS name_en, '11909' AS postal_code, 'dong_ngac' AS slug
UNION ALL
       SELECT '01' AS province_code, '00611' AS code, 'Phường Xuân Đỉnh' AS name, 'Xuân Đỉnh' AS short_name, 'Xuan Dinh' AS name_en, '11908' AS postal_code, 'xuan_dinh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00613' AS code, 'Phường Tây Tựu' AS name, 'Tây Tựu' AS short_name, 'Tay Tuu' AS name_en, '11914' AS postal_code, 'tay_tuu' AS slug
UNION ALL
       SELECT '01' AS province_code, '00619' AS code, 'Phường Phú Diễn' AS name, 'Phú Diễn' AS short_name, 'Phu Dien' AS name_en, '11916' AS postal_code, 'phu_dien' AS slug
UNION ALL
       SELECT '01' AS province_code, '00622' AS code, 'Phường Xuân Phương' AS name, 'Xuân Phương' AS short_name, 'Xuan Phuong' AS name_en, '12008' AS postal_code, 'xuan_phuong' AS slug
UNION ALL
       SELECT '01' AS province_code, '00634' AS code, 'Phường Tây Mỗ' AS name, 'Tây Mỗ' AS short_name, 'Tay Mo' AS name_en, '12009' AS postal_code, 'tay_mo' AS slug
UNION ALL
       SELECT '01' AS province_code, '00637' AS code, 'Phường Đại Mỗ' AS name, 'Đại Mỗ' AS short_name, 'Dai Mo' AS name_en, '12010' AS postal_code, 'dai_mo' AS slug
UNION ALL
       SELECT '01' AS province_code, '00640' AS code, 'Xã Thanh Trì' AS name, 'Thanh Trì' AS short_name, 'Thanh Tri' AS name_en, '12522' AS postal_code, 'thanh_tri' AS slug
UNION ALL
       SELECT '01' AS province_code, '00643' AS code, 'Phường Thanh Liệt' AS name, 'Thanh Liệt' AS short_name, 'Thanh Liet' AS name_en, '12510' AS postal_code, 'thanh_liet' AS slug
UNION ALL
       SELECT '01' AS province_code, '00664' AS code, 'Xã Đại Thanh' AS name, 'Đại Thanh' AS short_name, 'Dai Thanh' AS name_en, '12523' AS postal_code, 'dai_thanh' AS slug
UNION ALL
       SELECT '01' AS province_code, '00679' AS code, 'Xã Ngọc Hồi' AS name, 'Ngọc Hồi' AS short_name, 'Ngoc Hoi' AS name_en, '12516' AS postal_code, 'ngoc_hoi' AS slug
UNION ALL
       SELECT '01' AS province_code, '00685' AS code, 'Xã Nam Phù' AS name, 'Nam Phù' AS short_name, 'Nam Phu' AS name_en, '12524' AS postal_code, 'nam_phu' AS slug
UNION ALL
       SELECT '01' AS province_code, '04930' AS code, 'Xã Yên Xuân' AS name, 'Yên Xuân' AS short_name, 'Yen Xuan' AS name_en, '13132' AS postal_code, 'yen_xuan' AS slug
UNION ALL
       SELECT '01' AS province_code, '08974' AS code, 'Xã Quang Minh' AS name, 'Quang Minh' AS short_name, 'Quang Minh' AS name_en, '12907' AS postal_code, 'quang_minh' AS slug
UNION ALL
       SELECT '01' AS province_code, '08980' AS code, 'Xã Yên Lãng' AS name, 'Yên Lãng' AS short_name, 'Yen Lang' AS name_en, '12924' AS postal_code, 'yen_lang' AS slug
UNION ALL
       SELECT '01' AS province_code, '08995' AS code, 'Xã Tiến Thắng' AS name, 'Tiến Thắng' AS short_name, 'Tien Thang' AS name_en, '12912' AS postal_code, 'tien_thang' AS slug
UNION ALL
       SELECT '01' AS province_code, '09022' AS code, 'Xã Mê Linh' AS name, 'Mê Linh' AS short_name, 'Me Linh' AS name_en, '12923' AS postal_code, 'me_linh' AS slug
UNION ALL
       SELECT '01' AS province_code, '09552' AS code, 'Phường Kiến Hưng' AS name, 'Kiến Hưng' AS short_name, 'Kien Hung' AS name_en, '12121' AS postal_code, 'kien_hung' AS slug
UNION ALL
       SELECT '01' AS province_code, '09556' AS code, 'Phường Hà Đông' AS name, 'Hà Đông' AS short_name, 'Ha Dong' AS name_en, '12123' AS postal_code, 'ha_dong' AS slug
UNION ALL
       SELECT '01' AS province_code, '09562' AS code, 'Phường Yên Nghĩa' AS name, 'Yên Nghĩa' AS short_name, 'Yen Nghia' AS name_en, '12116' AS postal_code, 'yen_nghia' AS slug
UNION ALL
       SELECT '01' AS province_code, '09568' AS code, 'Phường Phú Lương' AS name, 'Phú Lương' AS short_name, 'Phu Luong' AS name_en, '12120' AS postal_code, 'phu_luong' AS slug
UNION ALL
       SELECT '01' AS province_code, '09574' AS code, 'Phường Sơn Tây' AS name, 'Sơn Tây' AS short_name, 'Son Tay' AS name_en, '12721' AS postal_code, 'son_tay' AS slug
UNION ALL
       SELECT '01' AS province_code, '09604' AS code, 'Phường Tùng Thiện' AS name, 'Tùng Thiện' AS short_name, 'Tung Thien' AS name_en, '12722' AS postal_code, 'tung_thien' AS slug
UNION ALL
       SELECT '01' AS province_code, '09616' AS code, 'Xã Đoài Phương' AS name, 'Đoài Phương' AS short_name, 'Doai Phuong' AS name_en, '12723' AS postal_code, 'doai_phuong' AS slug
UNION ALL
       SELECT '01' AS province_code, '09619' AS code, 'Xã Quảng Oai' AS name, 'Quảng Oai' AS short_name, 'Quang Oai' AS name_en, '12637' AS postal_code, 'quang_oai' AS slug
UNION ALL
       SELECT '01' AS province_code, '09634' AS code, 'Xã Cổ Đô' AS name, 'Cổ Đô' AS short_name, 'Co Do' AS name_en, '12614' AS postal_code, 'co_do' AS slug
UNION ALL
       SELECT '01' AS province_code, '09661' AS code, 'Xã Minh Châu' AS name, 'Minh Châu' AS short_name, 'Minh Chau' AS name_en, '12608' AS postal_code, 'minh_chau' AS slug
UNION ALL
       SELECT '01' AS province_code, '09664' AS code, 'Xã Vật Lại' AS name, 'Vật Lại' AS short_name, 'Vat Lai' AS name_en, '12620' AS postal_code, 'vat_lai' AS slug
UNION ALL
       SELECT '01' AS province_code, '09676' AS code, 'Xã Bất Bạt' AS name, 'Bất Bạt' AS short_name, 'Bat Bat' AS name_en, '12638' AS postal_code, 'bat_bat' AS slug
UNION ALL
       SELECT '01' AS province_code, '09694' AS code, 'Xã Suối Hai' AS name, 'Suối Hai' AS short_name, 'Suoi Hai' AS name_en, '12639' AS postal_code, 'suoi_hai' AS slug
UNION ALL
       SELECT '01' AS province_code, '09700' AS code, 'Xã Ba Vì' AS name, 'Ba Vì' AS short_name, 'Ba Vi' AS name_en, '12629' AS postal_code, 'ba_vi' AS slug
UNION ALL
       SELECT '01' AS province_code, '09706' AS code, 'Xã Yên Bài' AS name, 'Yên Bài' AS short_name, 'Yen Bai' AS name_en, '12630' AS postal_code, 'yen_bai' AS slug
UNION ALL
       SELECT '01' AS province_code, '09715' AS code, 'Xã Phúc Thọ' AS name, 'Phúc Thọ' AS short_name, 'Phuc Tho' AS name_en, '12806' AS postal_code, 'phuc_tho' AS slug
UNION ALL
       SELECT '01' AS province_code, '09739' AS code, 'Xã Phúc Lộc' AS name, 'Phúc Lộc' AS short_name, 'Phuc Loc' AS name_en, '12829' AS postal_code, 'phuc_loc' AS slug
UNION ALL
       SELECT '01' AS province_code, '09772' AS code, 'Xã Hát Môn' AS name, 'Hát Môn' AS short_name, 'Hat Mon' AS name_en, '12810' AS postal_code, 'hat_mon' AS slug
UNION ALL
       SELECT '01' AS province_code, '09784' AS code, 'Xã Đan Phượng' AS name, 'Đan Phượng' AS short_name, 'Dan Phuong' AS name_en, '13007' AS postal_code, 'dan_phuong' AS slug
UNION ALL
       SELECT '01' AS province_code, '09787' AS code, 'Xã Liên Minh' AS name, 'Liên Minh' AS short_name, 'Lien Minh' AS name_en, '13023' AS postal_code, 'lien_minh' AS slug
UNION ALL
       SELECT '01' AS province_code, '09817' AS code, 'Xã Ô Diên' AS name, 'Ô Diên' AS short_name, 'O Dien' AS name_en, '13022' AS postal_code, 'o_dien' AS slug
UNION ALL
       SELECT '01' AS province_code, '09832' AS code, 'Xã Hoài Đức' AS name, 'Hoài Đức' AS short_name, 'Hoai Duc' AS name_en, '13226' AS postal_code, 'hoai_duc' AS slug
UNION ALL
       SELECT '01' AS province_code, '09856' AS code, 'Xã Dương Hoà' AS name, 'Dương Hoà' AS short_name, 'Duong Hoa' AS name_en, '13227' AS postal_code, 'duong_hoa' AS slug
UNION ALL
       SELECT '01' AS province_code, '09871' AS code, 'Xã Sơn Đồng' AS name, 'Sơn Đồng' AS short_name, 'Son Dong' AS name_en, '13224' AS postal_code, 'son_dong' AS slug
UNION ALL
       SELECT '01' AS province_code, '09877' AS code, 'Xã An Khánh' AS name, 'An Khánh' AS short_name, 'An Khanh' AS name_en, '13219' AS postal_code, 'an_khanh' AS slug
UNION ALL
       SELECT '01' AS province_code, '09886' AS code, 'Phường Dương Nội' AS name, 'Dương Nội' AS short_name, 'Duong Noi' AS name_en, '12114' AS postal_code, 'duong_noi' AS slug
UNION ALL
       SELECT '01' AS province_code, '09895' AS code, 'Xã Quốc Oai' AS name, 'Quốc Oai' AS short_name, 'Quoc Oai' AS name_en, '13306' AS postal_code, 'quoc_oai' AS slug
UNION ALL
       SELECT '01' AS province_code, '09910' AS code, 'Xã Kiều Phú' AS name, 'Kiều Phú' AS short_name, 'Kieu Phu' AS name_en, '13327' AS postal_code, 'kieu_phu' AS slug
UNION ALL
       SELECT '01' AS province_code, '09931' AS code, 'Xã Hưng Đạo' AS name, 'Hưng Đạo' AS short_name, 'Hung Dao' AS name_en, '13325' AS postal_code, 'hung_dao' AS slug
UNION ALL
       SELECT '01' AS province_code, '09952' AS code, 'Xã Phú Cát' AS name, 'Phú Cát' AS short_name, 'Phu Cat' AS name_en, '13314' AS postal_code, 'phu_cat' AS slug
UNION ALL
       SELECT '01' AS province_code, '09955' AS code, 'Xã Thạch Thất' AS name, 'Thạch Thất' AS short_name, 'Thach That' AS name_en, '13129' AS postal_code, 'thach_that' AS slug
UNION ALL
       SELECT '01' AS province_code, '09982' AS code, 'Xã Hạ Bằng' AS name, 'Hạ Bằng' AS short_name, 'Ha Bang' AS name_en, '13117' AS postal_code, 'ha_bang' AS slug
UNION ALL
       SELECT '01' AS province_code, '09988' AS code, 'Xã Hoà Lạc' AS name, 'Hoà Lạc' AS short_name, 'Hoa Lac' AS name_en, '13131' AS postal_code, 'hoa_lac' AS slug
UNION ALL
       SELECT '01' AS province_code, '10003' AS code, 'Xã Tây Phương' AS name, 'Tây Phương' AS short_name, 'Tay Phuong' AS name_en, '13130' AS postal_code, 'tay_phuong' AS slug
UNION ALL
       SELECT '01' AS province_code, '10015' AS code, 'Phường Chương Mỹ' AS name, 'Chương Mỹ' AS short_name, 'Chuong My' AS name_en, '13438' AS postal_code, 'chuong_my' AS slug
UNION ALL
       SELECT '01' AS province_code, '10030' AS code, 'Xã Phú Nghĩa' AS name, 'Phú Nghĩa' AS short_name, 'Phu Nghia' AS name_en, '13411' AS postal_code, 'phu_nghia' AS slug
UNION ALL
       SELECT '01' AS province_code, '10045' AS code, 'Xã Xuân Mai' AS name, 'Xuân Mai' AS short_name, 'Xuan Mai' AS name_en, '13417' AS postal_code, 'xuan_mai' AS slug
UNION ALL
       SELECT '01' AS province_code, '10072' AS code, 'Xã Quảng Bị' AS name, 'Quảng Bị' AS short_name, 'Quang Bi' AS name_en, '13432' AS postal_code, 'quang_bi' AS slug
UNION ALL
       SELECT '01' AS province_code, '10081' AS code, 'Xã Trần Phú' AS name, 'Trần Phú' AS short_name, 'Tran Phu' AS name_en, '13423' AS postal_code, 'tran_phu' AS slug
UNION ALL
       SELECT '01' AS province_code, '10096' AS code, 'Xã Hoà Phú' AS name, 'Hoà Phú' AS short_name, 'Hoa Phu' AS name_en, '13427' AS postal_code, 'hoa_phu' AS slug
UNION ALL
       SELECT '01' AS province_code, '10114' AS code, 'Xã Thanh Oai' AS name, 'Thanh Oai' AS short_name, 'Thanh Oai' AS name_en, '13527' AS postal_code, 'thanh_oai' AS slug
UNION ALL
       SELECT '01' AS province_code, '10126' AS code, 'Xã Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '13512' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '01' AS province_code, '10144' AS code, 'Xã Tam Hưng' AS name, 'Tam Hưng' AS short_name, 'Tam Hung' AS name_en, '13510' AS postal_code, 'tam_hung' AS slug
UNION ALL
       SELECT '01' AS province_code, '10180' AS code, 'Xã Dân Hoà' AS name, 'Dân Hoà' AS short_name, 'Dan Hoa' AS name_en, '13521' AS postal_code, 'dan_hoa' AS slug
UNION ALL
       SELECT '01' AS province_code, '10183' AS code, 'Xã Thường Tín' AS name, 'Thường Tín' AS short_name, 'Thuong Tin' AS name_en, '13606' AS postal_code, 'thuong_tin' AS slug
UNION ALL
       SELECT '01' AS province_code, '10210' AS code, 'Xã Hồng Vân' AS name, 'Hồng Vân' AS short_name, 'Hong Van' AS name_en, '13611' AS postal_code, 'hong_van' AS slug
UNION ALL
       SELECT '01' AS province_code, '10231' AS code, 'Xã Thượng Phúc' AS name, 'Thượng Phúc' AS short_name, 'Thuong Phuc' AS name_en, '13635' AS postal_code, 'thuong_phuc' AS slug
UNION ALL
       SELECT '01' AS province_code, '10237' AS code, 'Xã Chương Dương' AS name, 'Chương Dương' AS short_name, 'Chuong Duong' AS name_en, '13632' AS postal_code, 'chuong_duong' AS slug
UNION ALL
       SELECT '01' AS province_code, '10273' AS code, 'Xã Phú Xuyên' AS name, 'Phú Xuyên' AS short_name, 'Phu Xuyen' AS name_en, '13906' AS postal_code, 'phu_xuyen' AS slug
UNION ALL
       SELECT '01' AS province_code, '10279' AS code, 'Xã Phượng Dực' AS name, 'Phượng Dực' AS short_name, 'Phuong Duc' AS name_en, '13921' AS postal_code, 'phuong_duc' AS slug
UNION ALL
       SELECT '01' AS province_code, '10330' AS code, 'Xã Chuyên Mỹ' AS name, 'Chuyên Mỹ' AS short_name, 'Chuyen My' AS name_en, '13926' AS postal_code, 'chuyen_my' AS slug
UNION ALL
       SELECT '01' AS province_code, '10342' AS code, 'Xã Đại Xuyên' AS name, 'Đại Xuyên' AS short_name, 'Dai Xuyen' AS name_en, '13930' AS postal_code, 'dai_xuyen' AS slug
UNION ALL
       SELECT '01' AS province_code, '10354' AS code, 'Xã Vân Đình' AS name, 'Vân Đình' AS short_name, 'Van Dinh' AS name_en, '13806' AS postal_code, 'van_dinh' AS slug
UNION ALL
       SELECT '01' AS province_code, '10369' AS code, 'Xã Ứng Thiên' AS name, 'Ứng Thiên' AS short_name, 'Ung Thien' AS name_en, '13835' AS postal_code, 'ung_thien' AS slug
UNION ALL
       SELECT '01' AS province_code, '10402' AS code, 'Xã Ứng Hoà' AS name, 'Ứng Hoà' AS short_name, 'Ung Hoa' AS name_en, '13837' AS postal_code, 'ung_hoa' AS slug
UNION ALL
       SELECT '01' AS province_code, '10417' AS code, 'Xã Hoà Xá' AS name, 'Hoà Xá' AS short_name, 'Hoa Xa' AS name_en, '13836' AS postal_code, 'hoa_xa' AS slug
UNION ALL
       SELECT '01' AS province_code, '10441' AS code, 'Xã Mỹ Đức' AS name, 'Mỹ Đức' AS short_name, 'My Duc' AS name_en, '13728' AS postal_code, 'my_duc' AS slug
UNION ALL
       SELECT '01' AS province_code, '10459' AS code, 'Xã Phúc Sơn' AS name, 'Phúc Sơn' AS short_name, 'Phuc Son' AS name_en, '13729' AS postal_code, 'phuc_son' AS slug
UNION ALL
       SELECT '01' AS province_code, '10465' AS code, 'Xã Hồng Sơn' AS name, 'Hồng Sơn' AS short_name, 'Hong Son' AS name_en, '13718' AS postal_code, 'hong_son' AS slug
UNION ALL
       SELECT '01' AS province_code, '10489' AS code, 'Xã Hương Sơn' AS name, 'Hương Sơn' AS short_name, 'Huong Son' AS name_en, '13723' AS postal_code, 'huong_son' AS slug
UNION ALL
       SELECT '04' AS province_code, '01273' AS code, 'Phường Thục Phán' AS name, 'Thục Phán' AS short_name, 'Thuc Phan' AS name_en, '21117' AS postal_code, 'thuc_phan' AS slug
UNION ALL
       SELECT '04' AS province_code, '01279' AS code, 'Phường Nùng Trí Cao' AS name, 'Nùng Trí Cao' AS short_name, 'Nung Tri Cao' AS name_en, '21118' AS postal_code, 'nung_tri_cao' AS slug
UNION ALL
       SELECT '04' AS province_code, '01288' AS code, 'Phường Tân Giang' AS name, 'Tân Giang' AS short_name, 'Tan Giang' AS name_en, '21112' AS postal_code, 'tan_giang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01290' AS code, 'Xã Bảo Lâm' AS name, 'Bảo Lâm' AS short_name, 'Bao Lam' AS name_en, '21420' AS postal_code, 'bao_lam' AS slug
UNION ALL
       SELECT '04' AS province_code, '01294' AS code, 'Xã Lý Bôn' AS name, 'Lý Bôn' AS short_name, 'Ly Bon' AS name_en, '21410' AS postal_code, 'ly_bon' AS slug
UNION ALL
       SELECT '04' AS province_code, '01297' AS code, 'Xã Nam Quang' AS name, 'Nam Quang' AS short_name, 'Nam Quang' AS name_en, '21414' AS postal_code, 'nam_quang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01304' AS code, 'Xã Quảng Lâm' AS name, 'Quảng Lâm' AS short_name, 'Quang Lam' AS name_en, '21416' AS postal_code, 'quang_lam' AS slug
UNION ALL
       SELECT '04' AS province_code, '01318' AS code, 'Xã Yên Thổ' AS name, 'Yên Thổ' AS short_name, 'Yen Tho' AS name_en, '21418' AS postal_code, 'yen_tho' AS slug
UNION ALL
       SELECT '04' AS province_code, '01321' AS code, 'Xã Bảo Lạc' AS name, 'Bảo Lạc' AS short_name, 'Bao Lac' AS name_en, '21356' AS postal_code, 'bao_lac' AS slug
UNION ALL
       SELECT '04' AS province_code, '01324' AS code, 'Xã Cốc Pàng' AS name, 'Cốc Pàng' AS short_name, 'Coc Pang' AS name_en, '21359' AS postal_code, 'coc_pang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01327' AS code, 'Xã Cô Ba' AS name, 'Cô Ba' AS short_name, 'Co Ba' AS name_en, '21357' AS postal_code, 'co_ba' AS slug
UNION ALL
       SELECT '04' AS province_code, '01336' AS code, 'Xã Khánh Xuân' AS name, 'Khánh Xuân' AS short_name, 'Khanh Xuan' AS name_en, '21372' AS postal_code, 'khanh_xuan' AS slug
UNION ALL
       SELECT '04' AS province_code, '01339' AS code, 'Xã Xuân Trường' AS name, 'Xuân Trường' AS short_name, 'Xuan Truong' AS name_en, '21370' AS postal_code, 'xuan_truong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01351' AS code, 'Xã Hưng Đạo' AS name, 'Hưng Đạo' AS short_name, 'Hung Dao' AS name_en, '21363' AS postal_code, 'hung_dao' AS slug
UNION ALL
       SELECT '04' AS province_code, '01354' AS code, 'Xã Huy Giáp' AS name, 'Huy Giáp' AS short_name, 'Huy Giap' AS name_en, '21368' AS postal_code, 'huy_giap' AS slug
UNION ALL
       SELECT '04' AS province_code, '01360' AS code, 'Xã Sơn Lộ' AS name, 'Sơn Lộ' AS short_name, 'Son Lo' AS name_en, '21365' AS postal_code, 'son_lo' AS slug
UNION ALL
       SELECT '04' AS province_code, '01363' AS code, 'Xã Thông Nông' AS name, 'Thông Nông' AS short_name, 'Thong Nong' AS name_en, '21225' AS postal_code, 'thong_nong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01366' AS code, 'Xã Cần Yên' AS name, 'Cần Yên' AS short_name, 'Can Yen' AS name_en, '21229' AS postal_code, 'can_yen' AS slug
UNION ALL
       SELECT '04' AS province_code, '01387' AS code, 'Xã Thanh Long' AS name, 'Thanh Long' AS short_name, 'Thanh Long' AS name_en, '21233' AS postal_code, 'thanh_long' AS slug
UNION ALL
       SELECT '04' AS province_code, '01392' AS code, 'Xã Trường Hà' AS name, 'Trường Hà' AS short_name, 'Truong Ha' AS name_en, '21214' AS postal_code, 'truong_ha' AS slug
UNION ALL
       SELECT '04' AS province_code, '01393' AS code, 'Xã Lũng Nặm' AS name, 'Lũng Nặm' AS short_name, 'Lung Nam' AS name_en, '21212' AS postal_code, 'lung_nam' AS slug
UNION ALL
       SELECT '04' AS province_code, '01414' AS code, 'Xã Tổng Cọt' AS name, 'Tổng Cọt' AS short_name, 'Tong Cot' AS name_en, '21224' AS postal_code, 'tong_cot' AS slug
UNION ALL
       SELECT '04' AS province_code, '01438' AS code, 'Xã Hà Quảng' AS name, 'Hà Quảng' AS short_name, 'Ha Quang' AS name_en, '21226' AS postal_code, 'ha_quang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01447' AS code, 'Xã Trà Lĩnh' AS name, 'Trà Lĩnh' AS short_name, 'Tra Linh' AS name_en, '21826' AS postal_code, 'tra_linh' AS slug
UNION ALL
       SELECT '04' AS province_code, '01456' AS code, 'Xã Quang Hán' AS name, 'Quang Hán' AS short_name, 'Quang Han' AS name_en, '21830' AS postal_code, 'quang_han' AS slug
UNION ALL
       SELECT '04' AS province_code, '01465' AS code, 'Xã Quang Trung' AS name, 'Quang Trung' AS short_name, 'Quang Trung' AS name_en, '21828' AS postal_code, 'quang_trung' AS slug
UNION ALL
       SELECT '04' AS province_code, '01477' AS code, 'Xã Trùng Khánh' AS name, 'Trùng Khánh' AS short_name, 'Trung Khanh' AS name_en, '21806' AS postal_code, 'trung_khanh' AS slug
UNION ALL
       SELECT '04' AS province_code, '01489' AS code, 'Xã Đình Phong' AS name, 'Đình Phong' AS short_name, 'Dinh Phong' AS name_en, '21808' AS postal_code, 'dinh_phong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01501' AS code, 'Xã Đàm Thuỷ' AS name, 'Đàm Thuỷ' AS short_name, 'Dam Thuy' AS name_en, '21825' AS postal_code, 'dam_thuy' AS slug
UNION ALL
       SELECT '04' AS province_code, '01525' AS code, 'Xã Đoài Dương' AS name, 'Đoài Dương' AS short_name, 'Doai Duong' AS name_en, '21818' AS postal_code, 'doai_duong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01537' AS code, 'Xã Lý Quốc' AS name, 'Lý Quốc' AS short_name, 'Ly Quoc' AS name_en, '21709' AS postal_code, 'ly_quoc' AS slug
UNION ALL
       SELECT '04' AS province_code, '01552' AS code, 'Xã Quang Long' AS name, 'Quang Long' AS short_name, 'Quang Long' AS name_en, '21707' AS postal_code, 'quang_long' AS slug
UNION ALL
       SELECT '04' AS province_code, '01558' AS code, 'Xã Hạ Lang' AS name, 'Hạ Lang' AS short_name, 'Ha Lang' AS name_en, '21720' AS postal_code, 'ha_lang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01561' AS code, 'Xã Vinh Quý' AS name, 'Vinh Quý' AS short_name, 'Vinh Quy' AS name_en, '21715' AS postal_code, 'vinh_quy' AS slug
UNION ALL
       SELECT '04' AS province_code, '01576' AS code, 'Xã Quảng Uyên' AS name, 'Quảng Uyên' AS short_name, 'Quang Uyen' AS name_en, '21906' AS postal_code, 'quang_uyen' AS slug
UNION ALL
       SELECT '04' AS province_code, '01594' AS code, 'Xã Độc Lập' AS name, 'Độc Lập' AS short_name, 'Doc Lap' AS name_en, '21907' AS postal_code, 'doc_lap' AS slug
UNION ALL
       SELECT '04' AS province_code, '01618' AS code, 'Xã Hạnh Phúc' AS name, 'Hạnh Phúc' AS short_name, 'Hanh Phuc' AS name_en, '21918' AS postal_code, 'hanh_phuc' AS slug
UNION ALL
       SELECT '04' AS province_code, '01636' AS code, 'Xã Bế Văn Đàn' AS name, 'Bế Văn Đàn' AS short_name, 'Be Van Dan' AS name_en, '21926' AS postal_code, 'be_van_dan' AS slug
UNION ALL
       SELECT '04' AS province_code, '01648' AS code, 'Xã Phục Hoà' AS name, 'Phục Hoà' AS short_name, 'Phuc Hoa' AS name_en, '21665' AS postal_code, 'phuc_hoa' AS slug
UNION ALL
       SELECT '04' AS province_code, '01654' AS code, 'Xã Hoà An' AS name, 'Hoà An' AS short_name, 'Hoa An' AS name_en, '21177' AS postal_code, 'hoa_an' AS slug
UNION ALL
       SELECT '04' AS province_code, '01660' AS code, 'Xã Nam Tuấn' AS name, 'Nam Tuấn' AS short_name, 'Nam Tuan' AS name_en, '21157' AS postal_code, 'nam_tuan' AS slug
UNION ALL
       SELECT '04' AS province_code, '01699' AS code, 'Xã Nguyễn Huệ' AS name, 'Nguyễn Huệ' AS short_name, 'Nguyen Hue' AS name_en, '21172' AS postal_code, 'nguyen_hue' AS slug
UNION ALL
       SELECT '04' AS province_code, '01708' AS code, 'Xã Bạch Đằng' AS name, 'Bạch Đằng' AS short_name, 'Bach Dang' AS name_en, '21166' AS postal_code, 'bach_dang' AS slug
UNION ALL
       SELECT '04' AS province_code, '01726' AS code, 'Xã Nguyên Bình' AS name, 'Nguyên Bình' AS short_name, 'Nguyen Binh' AS name_en, '21506' AS postal_code, 'nguyen_binh' AS slug
UNION ALL
       SELECT '04' AS province_code, '01729' AS code, 'Xã Tĩnh Túc' AS name, 'Tĩnh Túc' AS short_name, 'Tinh Tuc' AS name_en, '21514' AS postal_code, 'tinh_tuc' AS slug
UNION ALL
       SELECT '04' AS province_code, '01738' AS code, 'Xã Ca Thành' AS name, 'Ca Thành' AS short_name, 'Ca Thanh' AS name_en, '21512' AS postal_code, 'ca_thanh' AS slug
UNION ALL
       SELECT '04' AS province_code, '01747' AS code, 'Xã Minh Tâm' AS name, 'Minh Tâm' AS short_name, 'Minh Tam' AS name_en, '21524' AS postal_code, 'minh_tam' AS slug
UNION ALL
       SELECT '04' AS province_code, '01768' AS code, 'Xã Phan Thanh' AS name, 'Phan Thanh' AS short_name, 'Phan Thanh' AS name_en, '21516' AS postal_code, 'phan_thanh' AS slug
UNION ALL
       SELECT '04' AS province_code, '01774' AS code, 'Xã Tam Kim' AS name, 'Tam Kim' AS short_name, 'Tam Kim' AS name_en, '21520' AS postal_code, 'tam_kim' AS slug
UNION ALL
       SELECT '04' AS province_code, '01777' AS code, 'Xã Thành Công' AS name, 'Thành Công' AS short_name, 'Thanh Cong' AS name_en, '21517' AS postal_code, 'thanh_cong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01786' AS code, 'Xã Đông Khê' AS name, 'Đông Khê' AS short_name, 'Dong Khe' AS name_en, '21606' AS postal_code, 'dong_khe' AS slug
UNION ALL
       SELECT '04' AS province_code, '01789' AS code, 'Xã Canh Tân' AS name, 'Canh Tân' AS short_name, 'Canh Tan' AS name_en, '21614' AS postal_code, 'canh_tan' AS slug
UNION ALL
       SELECT '04' AS province_code, '01792' AS code, 'Xã Kim Đồng' AS name, 'Kim Đồng' AS short_name, 'Kim Dong' AS name_en, '21613' AS postal_code, 'kim_dong' AS slug
UNION ALL
       SELECT '04' AS province_code, '01795' AS code, 'Xã Minh Khai' AS name, 'Minh Khai' AS short_name, 'Minh Khai' AS name_en, '21615' AS postal_code, 'minh_khai' AS slug
UNION ALL
       SELECT '04' AS province_code, '01807' AS code, 'Xã Thạch An' AS name, 'Thạch An' AS short_name, 'Thach An' AS name_en, '21622' AS postal_code, 'thach_an' AS slug
UNION ALL
       SELECT '04' AS province_code, '01822' AS code, 'Xã Đức Long' AS name, 'Đức Long' AS short_name, 'Duc Long' AS name_en, '21608' AS postal_code, 'duc_long' AS slug
UNION ALL
       SELECT '08' AS province_code, '00691' AS code, 'Phường Hà Giang 2' AS name, 'Hà Giang 2' AS short_name, 'Ha Giang 2' AS name_en, '20115' AS postal_code, 'ha_giang_2' AS slug
UNION ALL
       SELECT '08' AS province_code, '00694' AS code, 'Phường Hà Giang 1' AS name, 'Hà Giang 1' AS short_name, 'Ha Giang 1' AS name_en, '20114' AS postal_code, 'ha_giang_1' AS slug
UNION ALL
       SELECT '08' AS province_code, '00700' AS code, 'Xã Ngọc Đường' AS name, 'Ngọc Đường' AS short_name, 'Ngoc Duong' AS name_en, '20108' AS postal_code, 'ngoc_duong' AS slug
UNION ALL
       SELECT '08' AS province_code, '00706' AS code, 'Xã Phú Linh' AS name, 'Phú Linh' AS short_name, 'Phu Linh' AS name_en, '20221' AS postal_code, 'phu_linh' AS slug
UNION ALL
       SELECT '08' AS province_code, '00715' AS code, 'Xã Lũng Cú' AS name, 'Lũng Cú' AS short_name, 'Lung Cu' AS name_en, '20508' AS postal_code, 'lung_cu' AS slug
UNION ALL
       SELECT '08' AS province_code, '00721' AS code, 'Xã Đồng Văn' AS name, 'Đồng Văn' AS short_name, 'Dong Van' AS name_en, '20506' AS postal_code, 'dong_van' AS slug
UNION ALL
       SELECT '08' AS province_code, '00733' AS code, 'Xã Sà Phìn' AS name, 'Sà Phìn' AS short_name, 'Sa Phin' AS name_en, '20510' AS postal_code, 'sa_phin' AS slug
UNION ALL
       SELECT '08' AS province_code, '00745' AS code, 'Xã Phố Bảng' AS name, 'Phố Bảng' AS short_name, 'Pho Bang' AS name_en, '20512' AS postal_code, 'pho_bang' AS slug
UNION ALL
       SELECT '08' AS province_code, '00763' AS code, 'Xã Lũng Phìn' AS name, 'Lũng Phìn' AS short_name, 'Lung Phin' AS name_en, '20518' AS postal_code, 'lung_phin' AS slug
UNION ALL
       SELECT '08' AS province_code, '00769' AS code, 'Xã Mèo Vạc' AS name, 'Mèo Vạc' AS short_name, 'Meo Vac' AS name_en, '20406' AS postal_code, 'meo_vac' AS slug
UNION ALL
       SELECT '08' AS province_code, '00778' AS code, 'Xã Sơn Vĩ' AS name, 'Sơn Vĩ' AS short_name, 'Son Vi' AS name_en, '20423' AS postal_code, 'son_vi' AS slug
UNION ALL
       SELECT '08' AS province_code, '00787' AS code, 'Xã Sủng Máng' AS name, 'Sủng Máng' AS short_name, 'Sung Mang' AS name_en, '20413' AS postal_code, 'sung_mang' AS slug
UNION ALL
       SELECT '08' AS province_code, '00802' AS code, 'Xã Khâu Vai' AS name, 'Khâu Vai' AS short_name, 'Khau Vai' AS name_en, '20418' AS postal_code, 'khau_vai' AS slug
UNION ALL
       SELECT '08' AS province_code, '00808' AS code, 'Xã Tát Ngà' AS name, 'Tát Ngà' AS short_name, 'Tat Nga' AS name_en, '20419' AS postal_code, 'tat_nga' AS slug
UNION ALL
       SELECT '08' AS province_code, '00817' AS code, 'Xã Niêm Sơn' AS name, 'Niêm Sơn' AS short_name, 'Niem Son' AS name_en, '20416' AS postal_code, 'niem_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '00820' AS code, 'Xã Yên Minh' AS name, 'Yên Minh' AS short_name, 'Yen Minh' AS name_en, '20306' AS postal_code, 'yen_minh' AS slug
UNION ALL
       SELECT '08' AS province_code, '00829' AS code, 'Xã Thắng Mố' AS name, 'Thắng Mố' AS short_name, 'Thang Mo' AS name_en, '20310' AS postal_code, 'thang_mo' AS slug
UNION ALL
       SELECT '08' AS province_code, '00832' AS code, 'Xã Bạch Đích' AS name, 'Bạch Đích' AS short_name, 'Bach Dich' AS name_en, '20312' AS postal_code, 'bach_dich' AS slug
UNION ALL
       SELECT '08' AS province_code, '00847' AS code, 'Xã Mậu Duệ' AS name, 'Mậu Duệ' AS short_name, 'Mau Due' AS name_en, '20323' AS postal_code, 'mau_due' AS slug
UNION ALL
       SELECT '08' AS province_code, '00859' AS code, 'Xã Ngọc Long' AS name, 'Ngọc Long' AS short_name, 'Ngoc Long' AS name_en, '20320' AS postal_code, 'ngoc_long' AS slug
UNION ALL
       SELECT '08' AS province_code, '00865' AS code, 'Xã Đường Thượng' AS name, 'Đường Thượng' AS short_name, 'Duong Thuong' AS name_en, '20317' AS postal_code, 'duong_thuong' AS slug
UNION ALL
       SELECT '08' AS province_code, '00871' AS code, 'Xã Du Già' AS name, 'Du Già' AS short_name, 'Du Gia' AS name_en, '20318' AS postal_code, 'du_gia' AS slug
UNION ALL
       SELECT '08' AS province_code, '00874' AS code, 'Xã Quản Bạ' AS name, 'Quản Bạ' AS short_name, 'Quan Ba' AS name_en, '20365' AS postal_code, 'quan_ba' AS slug
UNION ALL
       SELECT '08' AS province_code, '00883' AS code, 'Xã Cán Tỷ' AS name, 'Cán Tỷ' AS short_name, 'Can Ty' AS name_en, '20357' AS postal_code, 'can_ty' AS slug
UNION ALL
       SELECT '08' AS province_code, '00889' AS code, 'Xã Nghĩa Thuận' AS name, 'Nghĩa Thuận' AS short_name, 'Nghia Thuan' AS name_en, '20359' AS postal_code, 'nghia_thuan' AS slug
UNION ALL
       SELECT '08' AS province_code, '00892' AS code, 'Xã Tùng Vài' AS name, 'Tùng Vài' AS short_name, 'Tung Vai' AS name_en, '20361' AS postal_code, 'tung_vai' AS slug
UNION ALL
       SELECT '08' AS province_code, '00901' AS code, 'Xã Lùng Tám' AS name, 'Lùng Tám' AS short_name, 'Lung Tam' AS name_en, '20368' AS postal_code, 'lung_tam' AS slug
UNION ALL
       SELECT '08' AS province_code, '00913' AS code, 'Xã Vị Xuyên' AS name, 'Vị Xuyên' AS short_name, 'Vi Xuyen' AS name_en, '20206' AS postal_code, 'vi_xuyen' AS slug
UNION ALL
       SELECT '08' AS province_code, '00919' AS code, 'Xã Minh Tân' AS name, 'Minh Tân' AS short_name, 'Minh Tan' AS name_en, '20214' AS postal_code, 'minh_tan' AS slug
UNION ALL
       SELECT '08' AS province_code, '00922' AS code, 'Xã Thuận Hoà' AS name, 'Thuận Hoà' AS short_name, 'Thuan Hoa' AS name_en, '20213' AS postal_code, 'thuan_hoa' AS slug
UNION ALL
       SELECT '08' AS province_code, '00925' AS code, 'Xã Tùng Bá' AS name, 'Tùng Bá' AS short_name, 'Tung Ba' AS name_en, '20212' AS postal_code, 'tung_ba' AS slug
UNION ALL
       SELECT '08' AS province_code, '00928' AS code, 'Xã Thanh Thuỷ' AS name, 'Thanh Thuỷ' AS short_name, 'Thanh Thuy' AS name_en, '20215' AS postal_code, 'thanh_thuy' AS slug
UNION ALL
       SELECT '08' AS province_code, '00937' AS code, 'Xã Lao Chải' AS name, 'Lao Chải' AS short_name, 'Lao Chai' AS name_en, '20218' AS postal_code, 'lao_chai' AS slug
UNION ALL
       SELECT '08' AS province_code, '00952' AS code, 'Xã Cao Bồ' AS name, 'Cao Bồ' AS short_name, 'Cao Bo' AS name_en, '20223' AS postal_code, 'cao_bo' AS slug
UNION ALL
       SELECT '08' AS province_code, '00958' AS code, 'Xã Thượng Sơn' AS name, 'Thượng Sơn' AS short_name, 'Thuong Son' AS name_en, '20224' AS postal_code, 'thuong_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '00967' AS code, 'Xã Việt Lâm' AS name, 'Việt Lâm' AS short_name, 'Viet Lam' AS name_en, '20226' AS postal_code, 'viet_lam' AS slug
UNION ALL
       SELECT '08' AS province_code, '00970' AS code, 'Xã Linh Hồ' AS name, 'Linh Hồ' AS short_name, 'Linh Ho' AS name_en, '20209' AS postal_code, 'linh_ho' AS slug
UNION ALL
       SELECT '08' AS province_code, '00976' AS code, 'Xã Bạch Ngọc' AS name, 'Bạch Ngọc' AS short_name, 'Bach Ngoc' AS name_en, '20229' AS postal_code, 'bach_ngoc' AS slug
UNION ALL
       SELECT '08' AS province_code, '00982' AS code, 'Xã Minh Sơn' AS name, 'Minh Sơn' AS short_name, 'Minh Son' AS name_en, '20909' AS postal_code, 'minh_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '00985' AS code, 'Xã Giáp Trung' AS name, 'Giáp Trung' AS short_name, 'Giap Trung' AS name_en, '20908' AS postal_code, 'giap_trung' AS slug
UNION ALL
       SELECT '08' AS province_code, '00991' AS code, 'Xã Bắc Mê' AS name, 'Bắc Mê' AS short_name, 'Bac Me' AS name_en, '20919' AS postal_code, 'bac_me' AS slug
UNION ALL
       SELECT '08' AS province_code, '00994' AS code, 'Xã Minh Ngọc' AS name, 'Minh Ngọc' AS short_name, 'Minh Ngoc' AS name_en, '20911' AS postal_code, 'minh_ngoc' AS slug
UNION ALL
       SELECT '08' AS province_code, '01006' AS code, 'Xã Yên Cường' AS name, 'Yên Cường' AS short_name, 'Yen Cuong' AS name_en, '20915' AS postal_code, 'yen_cuong' AS slug
UNION ALL
       SELECT '08' AS province_code, '01012' AS code, 'Xã Đường Hồng' AS name, 'Đường Hồng' AS short_name, 'Duong Hong' AS name_en, '20916' AS postal_code, 'duong_hong' AS slug
UNION ALL
       SELECT '08' AS province_code, '01021' AS code, 'Xã Hoàng Su Phì' AS name, 'Hoàng Su Phì' AS short_name, 'Hoang Su Phi' AS name_en, '20631' AS postal_code, 'hoang_su_phi' AS slug
UNION ALL
       SELECT '08' AS province_code, '01024' AS code, 'Xã Bản Máy' AS name, 'Bản Máy' AS short_name, 'Ban May' AS name_en, '20613' AS postal_code, 'ban_may' AS slug
UNION ALL
       SELECT '08' AS province_code, '01033' AS code, 'Xã Thàng Tín' AS name, 'Thàng Tín' AS short_name, 'Thang Tin' AS name_en, '20612' AS postal_code, 'thang_tin' AS slug
UNION ALL
       SELECT '08' AS province_code, '01051' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '20607' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '08' AS province_code, '01057' AS code, 'Xã Pờ Ly Ngài' AS name, 'Pờ Ly Ngài' AS short_name, 'Po Ly Ngai' AS name_en, '20618' AS postal_code, 'po_ly_ngai' AS slug
UNION ALL
       SELECT '08' AS province_code, '01075' AS code, 'Xã Nậm Dịch' AS name, 'Nậm Dịch' AS short_name, 'Nam Dich' AS name_en, '20627' AS postal_code, 'nam_dich' AS slug
UNION ALL
       SELECT '08' AS province_code, '01084' AS code, 'Xã Hồ Thầu' AS name, 'Hồ Thầu' AS short_name, 'Ho Thau' AS name_en, '20621' AS postal_code, 'ho_thau' AS slug
UNION ALL
       SELECT '08' AS province_code, '01090' AS code, 'Xã Thông Nguyên' AS name, 'Thông Nguyên' AS short_name, 'Thong Nguyen' AS name_en, '20623' AS postal_code, 'thong_nguyen' AS slug
UNION ALL
       SELECT '08' AS province_code, '01096' AS code, 'Xã Pà Vầy Sủ' AS name, 'Pà Vầy Sủ' AS short_name, 'Pa Vay Su' AS name_en, '20712' AS postal_code, 'pa_vay_su' AS slug
UNION ALL
       SELECT '08' AS province_code, '01108' AS code, 'Xã Xín Mần' AS name, 'Xín Mần' AS short_name, 'Xin Man' AS name_en, '20710' AS postal_code, 'xin_man' AS slug
UNION ALL
       SELECT '08' AS province_code, '01117' AS code, 'Xã Trung Thịnh' AS name, 'Trung Thịnh' AS short_name, 'Trung Thinh' AS name_en, '20724' AS postal_code, 'trung_thinh' AS slug
UNION ALL
       SELECT '08' AS province_code, '01141' AS code, 'Xã Nấm Dẩn' AS name, 'Nấm Dẩn' AS short_name, 'Nam Dan' AS name_en, '20715' AS postal_code, 'nam_dan' AS slug
UNION ALL
       SELECT '08' AS province_code, '01144' AS code, 'Xã Quảng Nguyên' AS name, 'Quảng Nguyên' AS short_name, 'Quang Nguyen' AS name_en, '20718' AS postal_code, 'quang_nguyen' AS slug
UNION ALL
       SELECT '08' AS province_code, '01147' AS code, 'Xã Khuôn Lùng' AS name, 'Khuôn Lùng' AS short_name, 'Khuon Lung' AS name_en, '20717' AS postal_code, 'khuon_lung' AS slug
UNION ALL
       SELECT '08' AS province_code, '01153' AS code, 'Xã Bắc Quang' AS name, 'Bắc Quang' AS short_name, 'Bac Quang' AS name_en, '20829' AS postal_code, 'bac_quang' AS slug
UNION ALL
       SELECT '08' AS province_code, '01156' AS code, 'Xã Vĩnh Tuy' AS name, 'Vĩnh Tuy' AS short_name, 'Vinh Tuy' AS name_en, '20819' AS postal_code, 'vinh_tuy' AS slug
UNION ALL
       SELECT '08' AS province_code, '01165' AS code, 'Xã Đồng Tâm' AS name, 'Đồng Tâm' AS short_name, 'Dong Tam' AS name_en, '20808' AS postal_code, 'dong_tam' AS slug
UNION ALL
       SELECT '08' AS province_code, '01171' AS code, 'Xã Tân Quang' AS name, 'Tân Quang' AS short_name, 'Tan Quang' AS name_en, '20812' AS postal_code, 'tan_quang' AS slug
UNION ALL
       SELECT '08' AS province_code, '01180' AS code, 'Xã Bằng Hành' AS name, 'Bằng Hành' AS short_name, 'Bang Hanh' AS name_en, '20828' AS postal_code, 'bang_hanh' AS slug
UNION ALL
       SELECT '08' AS province_code, '01192' AS code, 'Xã Liên Hiệp' AS name, 'Liên Hiệp' AS short_name, 'Lien Hiep' AS name_en, '20824' AS postal_code, 'lien_hiep' AS slug
UNION ALL
       SELECT '08' AS province_code, '01201' AS code, 'Xã Hùng An' AS name, 'Hùng An' AS short_name, 'Hung An' AS name_en, '20820' AS postal_code, 'hung_an' AS slug
UNION ALL
       SELECT '08' AS province_code, '01216' AS code, 'Xã Đồng Yên' AS name, 'Đồng Yên' AS short_name, 'Dong Yen' AS name_en, '20816' AS postal_code, 'dong_yen' AS slug
UNION ALL
       SELECT '08' AS province_code, '01225' AS code, 'Xã Tiên Nguyên' AS name, 'Tiên Nguyên' AS short_name, 'Tien Nguyen' AS name_en, '20760' AS postal_code, 'tien_nguyen' AS slug
UNION ALL
       SELECT '08' AS province_code, '01234' AS code, 'Xã Yên Thành' AS name, 'Yên Thành' AS short_name, 'Yen Thanh' AS name_en, '20762' AS postal_code, 'yen_thanh' AS slug
UNION ALL
       SELECT '08' AS province_code, '01237' AS code, 'Xã Quang Bình' AS name, 'Quang Bình' AS short_name, 'Quang Binh' AS name_en, '20771' AS postal_code, 'quang_binh' AS slug
UNION ALL
       SELECT '08' AS province_code, '01243' AS code, 'Xã Tân Trịnh' AS name, 'Tân Trịnh' AS short_name, 'Tan Trinh' AS name_en, '20758' AS postal_code, 'tan_trinh' AS slug
UNION ALL
       SELECT '08' AS province_code, '01246' AS code, 'Xã Bằng Lang' AS name, 'Bằng Lang' AS short_name, 'Bang Lang' AS name_en, '20764' AS postal_code, 'bang_lang' AS slug
UNION ALL
       SELECT '08' AS province_code, '01255' AS code, 'Xã Xuân Giang' AS name, 'Xuân Giang' AS short_name, 'Xuan Giang' AS name_en, '20766' AS postal_code, 'xuan_giang' AS slug
UNION ALL
       SELECT '08' AS province_code, '01261' AS code, 'Xã Tiên Yên' AS name, 'Tiên Yên' AS short_name, 'Tien Yen' AS name_en, '20767' AS postal_code, 'tien_yen' AS slug
UNION ALL
       SELECT '08' AS province_code, '02212' AS code, 'Phường Nông Tiến' AS name, 'Nông Tiến' AS short_name, 'Nong Tien' AS name_en, '22107' AS postal_code, 'nong_tien' AS slug
UNION ALL
       SELECT '08' AS province_code, '02215' AS code, 'Phường Minh Xuân' AS name, 'Minh Xuân' AS short_name, 'Minh Xuan' AS name_en, '22110' AS postal_code, 'minh_xuan' AS slug
UNION ALL
       SELECT '08' AS province_code, '02221' AS code, 'Xã Nà Hang' AS name, 'Nà Hang' AS short_name, 'Na Hang' AS name_en, '22418' AS postal_code, 'na_hang' AS slug
UNION ALL
       SELECT '08' AS province_code, '02239' AS code, 'Xã Thượng Nông' AS name, 'Thượng Nông' AS short_name, 'Thuong Nong' AS name_en, '22411' AS postal_code, 'thuong_nong' AS slug
UNION ALL
       SELECT '08' AS province_code, '02245' AS code, 'Xã Côn Lôn' AS name, 'Côn Lôn' AS short_name, 'Con Lon' AS name_en, '22414' AS postal_code, 'con_lon' AS slug
UNION ALL
       SELECT '08' AS province_code, '02248' AS code, 'Xã Yên Hoa' AS name, 'Yên Hoa' AS short_name, 'Yen Hoa' AS name_en, '22410' AS postal_code, 'yen_hoa' AS slug
UNION ALL
       SELECT '08' AS province_code, '02260' AS code, 'Xã Hồng Thái' AS name, 'Hồng Thái' AS short_name, 'Hong Thai' AS name_en, '22409' AS postal_code, 'hong_thai' AS slug
UNION ALL
       SELECT '08' AS province_code, '02266' AS code, 'Xã Lâm Bình' AS name, 'Lâm Bình' AS short_name, 'Lam Binh' AS name_en, '22514' AS postal_code, 'lam_binh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02269' AS code, 'Xã Thượng Lâm' AS name, 'Thượng Lâm' AS short_name, 'Thuong Lam' AS name_en, '22507' AS postal_code, 'thuong_lam' AS slug
UNION ALL
       SELECT '08' AS province_code, '02287' AS code, 'Xã Chiêm Hoá' AS name, 'Chiêm Hoá' AS short_name, 'Chiem Hoa' AS name_en, '22332' AS postal_code, 'chiem_hoa' AS slug
UNION ALL
       SELECT '08' AS province_code, '02296' AS code, 'Xã Bình An' AS name, 'Bình An' AS short_name, 'Binh An' AS name_en, '22511' AS postal_code, 'binh_an' AS slug
UNION ALL
       SELECT '08' AS province_code, '02302' AS code, 'Xã Minh Quang' AS name, 'Minh Quang' AS short_name, 'Minh Quang' AS name_en, '22515' AS postal_code, 'minh_quang' AS slug
UNION ALL
       SELECT '08' AS province_code, '02305' AS code, 'Xã Trung Hà' AS name, 'Trung Hà' AS short_name, 'Trung Ha' AS name_en, '22314' AS postal_code, 'trung_ha' AS slug
UNION ALL
       SELECT '08' AS province_code, '02308' AS code, 'Xã Tân Mỹ' AS name, 'Tân Mỹ' AS short_name, 'Tan My' AS name_en, '22316' AS postal_code, 'tan_my' AS slug
UNION ALL
       SELECT '08' AS province_code, '02317' AS code, 'Xã Yên Lập' AS name, 'Yên Lập' AS short_name, 'Yen Lap' AS name_en, '22310' AS postal_code, 'yen_lap' AS slug
UNION ALL
       SELECT '08' AS province_code, '02320' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '22317' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '08' AS province_code, '02332' AS code, 'Xã Kiên Đài' AS name, 'Kiên Đài' AS short_name, 'Kien Dai' AS name_en, '22331' AS postal_code, 'kien_dai' AS slug
UNION ALL
       SELECT '08' AS province_code, '02350' AS code, 'Xã Kim Bình' AS name, 'Kim Bình' AS short_name, 'Kim Binh' AS name_en, '22328' AS postal_code, 'kim_binh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02353' AS code, 'Xã Hoà An' AS name, 'Hoà An' AS short_name, 'Hoa An' AS name_en, '22323' AS postal_code, 'hoa_an' AS slug
UNION ALL
       SELECT '08' AS province_code, '02359' AS code, 'Xã Tri Phú' AS name, 'Tri Phú' AS short_name, 'Tri Phu' AS name_en, '22329' AS postal_code, 'tri_phu' AS slug
UNION ALL
       SELECT '08' AS province_code, '02365' AS code, 'Xã Yên Nguyên' AS name, 'Yên Nguyên' AS short_name, 'Yen Nguyen' AS name_en, '22322' AS postal_code, 'yen_nguyen' AS slug
UNION ALL
       SELECT '08' AS province_code, '02374' AS code, 'Xã Hàm Yên' AS name, 'Hàm Yên' AS short_name, 'Ham Yen' AS name_en, '22624' AS postal_code, 'ham_yen' AS slug
UNION ALL
       SELECT '08' AS province_code, '02380' AS code, 'Xã Bạch Xa' AS name, 'Bạch Xa' AS short_name, 'Bach Xa' AS name_en, '22613' AS postal_code, 'bach_xa' AS slug
UNION ALL
       SELECT '08' AS province_code, '02392' AS code, 'Xã Phù Lưu' AS name, 'Phù Lưu' AS short_name, 'Phu Luu' AS name_en, '22609' AS postal_code, 'phu_luu' AS slug
UNION ALL
       SELECT '08' AS province_code, '02398' AS code, 'Xã Yên Phú' AS name, 'Yên Phú' AS short_name, 'Yen Phu' AS name_en, '22615' AS postal_code, 'yen_phu' AS slug
UNION ALL
       SELECT '08' AS province_code, '02404' AS code, 'Xã Bình Xa' AS name, 'Bình Xa' AS short_name, 'Binh Xa' AS name_en, '22623' AS postal_code, 'binh_xa' AS slug
UNION ALL
       SELECT '08' AS province_code, '02407' AS code, 'Xã Thái Sơn' AS name, 'Thái Sơn' AS short_name, 'Thai Son' AS name_en, '22622' AS postal_code, 'thai_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '02419' AS code, 'Xã Thái Hoà' AS name, 'Thái Hoà' AS short_name, 'Thai Hoa' AS name_en, '22621' AS postal_code, 'thai_hoa' AS slug
UNION ALL
       SELECT '08' AS province_code, '02425' AS code, 'Xã Hùng Đức' AS name, 'Hùng Đức' AS short_name, 'Hung Duc' AS name_en, '22619' AS postal_code, 'hung_duc' AS slug
UNION ALL
       SELECT '08' AS province_code, '02434' AS code, 'Xã Lực Hành' AS name, 'Lực Hành' AS short_name, 'Luc Hanh' AS name_en, '22213' AS postal_code, 'luc_hanh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02437' AS code, 'Xã Kiến Thiết' AS name, 'Kiến Thiết' AS short_name, 'Kien Thiet' AS name_en, '22209' AS postal_code, 'kien_thiet' AS slug
UNION ALL
       SELECT '08' AS province_code, '02449' AS code, 'Xã Xuân Vân' AS name, 'Xuân Vân' AS short_name, 'Xuan Van' AS name_en, '22211' AS postal_code, 'xuan_van' AS slug
UNION ALL
       SELECT '08' AS province_code, '02455' AS code, 'Xã Hùng Lợi' AS name, 'Hùng Lợi' AS short_name, 'Hung Loi' AS name_en, '22235' AS postal_code, 'hung_loi' AS slug
UNION ALL
       SELECT '08' AS province_code, '02458' AS code, 'Xã Trung Sơn' AS name, 'Trung Sơn' AS short_name, 'Trung Son' AS name_en, '22234' AS postal_code, 'trung_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '02470' AS code, 'Xã Tân Long' AS name, 'Tân Long' AS short_name, 'Tan Long' AS name_en, '22207' AS postal_code, 'tan_long' AS slug
UNION ALL
       SELECT '08' AS province_code, '02473' AS code, 'Xã Yên Sơn' AS name, 'Yên Sơn' AS short_name, 'Yen Son' AS name_en, '22206' AS postal_code, 'yen_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '02494' AS code, 'Xã Thái Bình' AS name, 'Thái Bình' AS short_name, 'Thai Binh' AS name_en, '22229' AS postal_code, 'thai_binh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02509' AS code, 'Phường Mỹ Lâm' AS name, 'Mỹ Lâm' AS short_name, 'My Lam' AS name_en, '22119' AS postal_code, 'my_lam' AS slug
UNION ALL
       SELECT '08' AS province_code, '02512' AS code, 'Phường An Tường' AS name, 'An Tường' AS short_name, 'An Tuong' AS name_en, '22106' AS postal_code, 'an_tuong' AS slug
UNION ALL
       SELECT '08' AS province_code, '02524' AS code, 'Phường Bình Thuận' AS name, 'Bình Thuận' AS short_name, 'Binh Thuan' AS name_en, '22120' AS postal_code, 'binh_thuan' AS slug
UNION ALL
       SELECT '08' AS province_code, '02530' AS code, 'Xã Nhữ Khê' AS name, 'Nhữ Khê' AS short_name, 'Nhu Khe' AS name_en, '22222' AS postal_code, 'nhu_khe' AS slug
UNION ALL
       SELECT '08' AS province_code, '02536' AS code, 'Xã Sơn Dương' AS name, 'Sơn Dương' AS short_name, 'Son Duong' AS name_en, '22706' AS postal_code, 'son_duong' AS slug
UNION ALL
       SELECT '08' AS province_code, '02545' AS code, 'Xã Tân Trào' AS name, 'Tân Trào' AS short_name, 'Tan Trao' AS name_en, '22709' AS postal_code, 'tan_trao' AS slug
UNION ALL
       SELECT '08' AS province_code, '02548' AS code, 'Xã Bình Ca' AS name, 'Bình Ca' AS short_name, 'Binh Ca' AS name_en, '22739' AS postal_code, 'binh_ca' AS slug
UNION ALL
       SELECT '08' AS province_code, '02554' AS code, 'Xã Minh Thanh' AS name, 'Minh Thanh' AS short_name, 'Minh Thanh' AS name_en, '22711' AS postal_code, 'minh_thanh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02572' AS code, 'Xã Đông Thọ' AS name, 'Đông Thọ' AS short_name, 'Dong Tho' AS name_en, '22717' AS postal_code, 'dong_tho' AS slug
UNION ALL
       SELECT '08' AS province_code, '02578' AS code, 'Xã Tân Thanh' AS name, 'Tân Thanh' AS short_name, 'Tan Thanh' AS name_en, '22729' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '08' AS province_code, '02608' AS code, 'Xã Hồng Sơn' AS name, 'Hồng Sơn' AS short_name, 'Hong Son' AS name_en, '22719' AS postal_code, 'hong_son' AS slug
UNION ALL
       SELECT '08' AS province_code, '02611' AS code, 'Xã Phú Lương' AS name, 'Phú Lương' AS short_name, 'Phu Luong' AS name_en, '22731' AS postal_code, 'phu_luong' AS slug
UNION ALL
       SELECT '08' AS province_code, '02620' AS code, 'Xã Sơn Thuỷ' AS name, 'Sơn Thuỷ' AS short_name, 'Son Thuy' AS name_en, '22740' AS postal_code, 'son_thuy' AS slug
UNION ALL
       SELECT '08' AS province_code, '02623' AS code, 'Xã Trường Sinh' AS name, 'Trường Sinh' AS short_name, 'Truong Sinh' AS name_en, '22721' AS postal_code, 'truong_sinh' AS slug
UNION ALL
       SELECT '11' AS province_code, '03127' AS code, 'Phường Điện Biên Phủ' AS name, 'Điện Biên Phủ' AS short_name, 'Dien Bien Phu' AS name_en, '32120' AS postal_code, 'dien_bien_phu' AS slug
UNION ALL
       SELECT '11' AS province_code, '03151' AS code, 'Phường Mường Lay' AS name, 'Mường Lay' AS short_name, 'Muong Lay' AS name_en, '32709' AS postal_code, 'muong_lay' AS slug
UNION ALL
       SELECT '11' AS province_code, '03158' AS code, 'Xã Sín Thầu' AS name, 'Sín Thầu' AS short_name, 'Sin Thau' AS name_en, '32911' AS postal_code, 'sin_thau' AS slug
UNION ALL
       SELECT '11' AS province_code, '03160' AS code, 'Xã Mường Nhé' AS name, 'Mường Nhé' AS short_name, 'Muong Nhe' AS name_en, '32906' AS postal_code, 'muong_nhe' AS slug
UNION ALL
       SELECT '11' AS province_code, '03162' AS code, 'Xã Nậm Kè' AS name, 'Nậm Kè' AS short_name, 'Nam Ke' AS name_en, '32912' AS postal_code, 'nam_ke' AS slug
UNION ALL
       SELECT '11' AS province_code, '03163' AS code, 'Xã Mường Toong' AS name, 'Mường Toong' AS short_name, 'Muong Toong' AS name_en, '32916' AS postal_code, 'muong_toong' AS slug
UNION ALL
       SELECT '11' AS province_code, '03164' AS code, 'Xã Quảng Lâm' AS name, 'Quảng Lâm' AS short_name, 'Quang Lam' AS name_en, '32913' AS postal_code, 'quang_lam' AS slug
UNION ALL
       SELECT '11' AS province_code, '03166' AS code, 'Xã Mường Chà' AS name, 'Mường Chà' AS short_name, 'Muong Cha' AS name_en, '32821' AS postal_code, 'muong_cha' AS slug
UNION ALL
       SELECT '11' AS province_code, '03169' AS code, 'Xã Nà Hỳ' AS name, 'Nà Hỳ' AS short_name, 'Na Hy' AS name_en, '32806' AS postal_code, 'na_hy' AS slug
UNION ALL
       SELECT '11' AS province_code, '03172' AS code, 'Xã Na Sang' AS name, 'Na Sang' AS short_name, 'Na Sang' AS name_en, '32766' AS postal_code, 'na_sang' AS slug
UNION ALL
       SELECT '11' AS province_code, '03175' AS code, 'Xã Chà Tở' AS name, 'Chà Tở' AS short_name, 'Cha To' AS name_en, '32810' AS postal_code, 'cha_to' AS slug
UNION ALL
       SELECT '11' AS province_code, '03176' AS code, 'Xã Nà Bủng' AS name, 'Nà Bủng' AS short_name, 'Na Bung' AS name_en, '32819' AS postal_code, 'na_bung' AS slug
UNION ALL
       SELECT '11' AS province_code, '03181' AS code, 'Xã Mường Tùng' AS name, 'Mường Tùng' AS short_name, 'Muong Tung' AS name_en, '32763' AS postal_code, 'muong_tung' AS slug
UNION ALL
       SELECT '11' AS province_code, '03193' AS code, 'Xã Pa Ham' AS name, 'Pa Ham' AS short_name, 'Pa Ham' AS name_en, '32759' AS postal_code, 'pa_ham' AS slug
UNION ALL
       SELECT '11' AS province_code, '03194' AS code, 'Xã Nậm Nèn' AS name, 'Nậm Nèn' AS short_name, 'Nam Nen' AS name_en, '32758' AS postal_code, 'nam_nen' AS slug
UNION ALL
       SELECT '11' AS province_code, '03199' AS code, 'Xã Si Pa Phìn' AS name, 'Si Pa Phìn' AS short_name, 'Si Pa Phin' AS name_en, '32807' AS postal_code, 'si_pa_phin' AS slug
UNION ALL
       SELECT '11' AS province_code, '03202' AS code, 'Xã Mường Pồn' AS name, 'Mường Pồn' AS short_name, 'Muong Pon' AS name_en, '32214' AS postal_code, 'muong_pon' AS slug
UNION ALL
       SELECT '11' AS province_code, '03203' AS code, 'Xã Na Son' AS name, 'Na Son' AS short_name, 'Na Son' AS name_en, '32310' AS postal_code, 'na_son' AS slug
UNION ALL
       SELECT '11' AS province_code, '03208' AS code, 'Xã Xa Dung' AS name, 'Xa Dung' AS short_name, 'Xa Dung' AS name_en, '32309' AS postal_code, 'xa_dung' AS slug
UNION ALL
       SELECT '11' AS province_code, '03214' AS code, 'Xã Mường Luân' AS name, 'Mường Luân' AS short_name, 'Muong Luan' AS name_en, '32319' AS postal_code, 'muong_luan' AS slug
UNION ALL
       SELECT '11' AS province_code, '03217' AS code, 'Xã Tủa Chùa' AS name, 'Tủa Chùa' AS short_name, 'Tua Chua' AS name_en, '32606' AS postal_code, 'tua_chua' AS slug
UNION ALL
       SELECT '11' AS province_code, '03220' AS code, 'Xã Tủa Thàng' AS name, 'Tủa Thàng' AS short_name, 'Tua Thang' AS name_en, '32610' AS postal_code, 'tua_thang' AS slug
UNION ALL
       SELECT '11' AS province_code, '03226' AS code, 'Xã Sín Chải' AS name, 'Sín Chải' AS short_name, 'Sin Chai' AS name_en, '32612' AS postal_code, 'sin_chai' AS slug
UNION ALL
       SELECT '11' AS province_code, '03241' AS code, 'Xã Sính Phình' AS name, 'Sính Phình' AS short_name, 'Sinh Phinh' AS name_en, '32617' AS postal_code, 'sinh_phinh' AS slug
UNION ALL
       SELECT '11' AS province_code, '03244' AS code, 'Xã Sáng Nhè' AS name, 'Sáng Nhè' AS short_name, 'Sang Nhe' AS name_en, '32618' AS postal_code, 'sang_nhe' AS slug
UNION ALL
       SELECT '11' AS province_code, '03253' AS code, 'Xã Tuần Giáo' AS name, 'Tuần Giáo' AS short_name, 'Tuan Giao' AS name_en, '32506' AS postal_code, 'tuan_giao' AS slug
UNION ALL
       SELECT '11' AS province_code, '03256' AS code, 'Xã Mường Ảng' AS name, 'Mường Ảng' AS short_name, 'Muong Ang' AS name_en, '32406' AS postal_code, 'muong_ang' AS slug
UNION ALL
       SELECT '11' AS province_code, '03260' AS code, 'Xã Pú Nhung' AS name, 'Pú Nhung' AS short_name, 'Pu Nhung' AS name_en, '32513' AS postal_code, 'pu_nhung' AS slug
UNION ALL
       SELECT '11' AS province_code, '03268' AS code, 'Xã Mường Mùn' AS name, 'Mường Mùn' AS short_name, 'Muong Mun' AS name_en, '32516' AS postal_code, 'muong_mun' AS slug
UNION ALL
       SELECT '11' AS province_code, '03283' AS code, 'Xã Chiềng Sinh' AS name, 'Chiềng Sinh' AS short_name, 'Chieng Sinh' AS name_en, '32521' AS postal_code, 'chieng_sinh' AS slug
UNION ALL
       SELECT '11' AS province_code, '03295' AS code, 'Xã Quài Tở' AS name, 'Quài Tở' AS short_name, 'Quai To' AS name_en, '32524' AS postal_code, 'quai_to' AS slug
UNION ALL
       SELECT '11' AS province_code, '03301' AS code, 'Xã Búng Lao' AS name, 'Búng Lao' AS short_name, 'Bung Lao' AS name_en, '32415' AS postal_code, 'bung_lao' AS slug
UNION ALL
       SELECT '11' AS province_code, '03313' AS code, 'Xã Mường Lạn' AS name, 'Mường Lạn' AS short_name, 'Muong Lan' AS name_en, '32413' AS postal_code, 'muong_lan' AS slug
UNION ALL
       SELECT '11' AS province_code, '03316' AS code, 'Xã Nà Tấu' AS name, 'Nà Tấu' AS short_name, 'Na Tau' AS name_en, '32118' AS postal_code, 'na_tau' AS slug
UNION ALL
       SELECT '11' AS province_code, '03325' AS code, 'Xã Mường Phăng' AS name, 'Mường Phăng' AS short_name, 'Muong Phang' AS name_en, '32116' AS postal_code, 'muong_phang' AS slug
UNION ALL
       SELECT '11' AS province_code, '03328' AS code, 'Xã Thanh Nưa' AS name, 'Thanh Nưa' AS short_name, 'Thanh Nua' AS name_en, '32216' AS postal_code, 'thanh_nua' AS slug
UNION ALL
       SELECT '11' AS province_code, '03334' AS code, 'Phường Mường Thanh' AS name, 'Mường Thanh' AS short_name, 'Muong Thanh' AS name_en, '32119' AS postal_code, 'muong_thanh' AS slug
UNION ALL
       SELECT '11' AS province_code, '03349' AS code, 'Xã Thanh Yên' AS name, 'Thanh Yên' AS short_name, 'Thanh Yen' AS name_en, '32220' AS postal_code, 'thanh_yen' AS slug
UNION ALL
       SELECT '11' AS province_code, '03352' AS code, 'Xã Thanh An' AS name, 'Thanh An' AS short_name, 'Thanh An' AS name_en, '32208' AS postal_code, 'thanh_an' AS slug
UNION ALL
       SELECT '11' AS province_code, '03356' AS code, 'Xã Sam Mứn' AS name, 'Sam Mứn' AS short_name, 'Sam Mun' AS name_en, '32231' AS postal_code, 'sam_mun' AS slug
UNION ALL
       SELECT '11' AS province_code, '03358' AS code, 'Xã Núa Ngam' AS name, 'Núa Ngam' AS short_name, 'Nua Ngam' AS name_en, '32226' AS postal_code, 'nua_ngam' AS slug
UNION ALL
       SELECT '11' AS province_code, '03368' AS code, 'Xã Mường Nhà' AS name, 'Mường Nhà' AS short_name, 'Muong Nha' AS name_en, '32228' AS postal_code, 'muong_nha' AS slug
UNION ALL
       SELECT '11' AS province_code, '03370' AS code, 'Xã Pu Nhi' AS name, 'Pu Nhi' AS short_name, 'Pu Nhi' AS name_en, '32311' AS postal_code, 'pu_nhi' AS slug
UNION ALL
       SELECT '11' AS province_code, '03382' AS code, 'Xã Phình Giàng' AS name, 'Phình Giàng' AS short_name, 'Phinh Giang' AS name_en, '32314' AS postal_code, 'phinh_giang' AS slug
UNION ALL
       SELECT '11' AS province_code, '03385' AS code, 'Xã Tìa Dình' AS name, 'Tìa Dình' AS short_name, 'Tia Dinh' AS name_en, '32316' AS postal_code, 'tia_dinh' AS slug
UNION ALL
       SELECT '12' AS province_code, '03388' AS code, 'Phường Đoàn Kết' AS name, 'Đoàn Kết' AS short_name, 'Doan Ket' AS name_en, '30109' AS postal_code, 'doan_ket' AS slug
UNION ALL
       SELECT '12' AS province_code, '03390' AS code, 'Xã Bình Lư' AS name, 'Bình Lư' AS short_name, 'Binh Lu' AS name_en, '30207' AS postal_code, 'binh_lu' AS slug
UNION ALL
       SELECT '12' AS province_code, '03394' AS code, 'Xã Sin Suối Hồ' AS name, 'Sin Suối Hồ' AS short_name, 'Sin Suoi Ho' AS name_en, '30323' AS postal_code, 'sin_suoi_ho' AS slug
UNION ALL
       SELECT '12' AS province_code, '03405' AS code, 'Xã Tả Lèng' AS name, 'Tả Lèng' AS short_name, 'Ta Leng' AS name_en, '30211' AS postal_code, 'ta_leng' AS slug
UNION ALL
       SELECT '12' AS province_code, '03408' AS code, 'Phường Tân Phong' AS name, 'Tân Phong' AS short_name, 'Tan Phong' AS name_en, '30110' AS postal_code, 'tan_phong' AS slug
UNION ALL
       SELECT '12' AS province_code, '03424' AS code, 'Xã Bản Bo' AS name, 'Bản Bo' AS short_name, 'Ban Bo' AS name_en, '30219' AS postal_code, 'ban_bo' AS slug
UNION ALL
       SELECT '12' AS province_code, '03430' AS code, 'Xã Khun Há' AS name, 'Khun Há' AS short_name, 'Khun Ha' AS name_en, '30217' AS postal_code, 'khun_ha' AS slug
UNION ALL
       SELECT '12' AS province_code, '03433' AS code, 'Xã Bum Tở' AS name, 'Bum Tở' AS short_name, 'Bum To' AS name_en, '30416' AS postal_code, 'bum_to' AS slug
UNION ALL
       SELECT '12' AS province_code, '03434' AS code, 'Xã Nậm Hàng' AS name, 'Nậm Hàng' AS short_name, 'Nam Hang' AS name_en, '30507' AS postal_code, 'nam_hang' AS slug
UNION ALL
       SELECT '12' AS province_code, '03439' AS code, 'Xã Thu Lũm' AS name, 'Thu Lũm' AS short_name, 'Thu Lum' AS name_en, '30411' AS postal_code, 'thu_lum' AS slug
UNION ALL
       SELECT '12' AS province_code, '03442' AS code, 'Xã Pa Ủ' AS name, 'Pa Ủ' AS short_name, 'Pa U' AS name_en, '30409' AS postal_code, 'pa_u' AS slug
UNION ALL
       SELECT '12' AS province_code, '03445' AS code, 'Xã Mường Tè' AS name, 'Mường Tè' AS short_name, 'Muong Te' AS name_en, '30414' AS postal_code, 'muong_te' AS slug
UNION ALL
       SELECT '12' AS province_code, '03451' AS code, 'Xã Mù Cả' AS name, 'Mù Cả' AS short_name, 'Mu Ca' AS name_en, '30413' AS postal_code, 'mu_ca' AS slug
UNION ALL
       SELECT '12' AS province_code, '03460' AS code, 'Xã Hua Bum' AS name, 'Hua Bum' AS short_name, 'Hua Bum' AS name_en, '30512' AS postal_code, 'hua_bum' AS slug
UNION ALL
       SELECT '12' AS province_code, '03463' AS code, 'Xã Tà Tổng' AS name, 'Tà Tổng' AS short_name, 'Ta Tong' AS name_en, '30417' AS postal_code, 'ta_tong' AS slug
UNION ALL
       SELECT '12' AS province_code, '03466' AS code, 'Xã Bum Nưa' AS name, 'Bum Nưa' AS short_name, 'Bum Nua' AS name_en, '30407' AS postal_code, 'bum_nua' AS slug
UNION ALL
       SELECT '12' AS province_code, '03472' AS code, 'Xã Mường Mô' AS name, 'Mường Mô' AS short_name, 'Muong Mo' AS name_en, '30513' AS postal_code, 'muong_mo' AS slug
UNION ALL
       SELECT '12' AS province_code, '03478' AS code, 'Xã Sìn Hồ' AS name, 'Sìn Hồ' AS short_name, 'Sin Ho' AS name_en, '30606' AS postal_code, 'sin_ho' AS slug
UNION ALL
       SELECT '12' AS province_code, '03487' AS code, 'Xã Lê Lợi' AS name, 'Lê Lợi' AS short_name, 'Le Loi' AS name_en, '30516' AS postal_code, 'le_loi' AS slug
UNION ALL
       SELECT '12' AS province_code, '03503' AS code, 'Xã Pa Tần' AS name, 'Pa Tần' AS short_name, 'Pa Tan' AS name_en, '30610' AS postal_code, 'pa_tan' AS slug
UNION ALL
       SELECT '12' AS province_code, '03508' AS code, 'Xã Hồng Thu' AS name, 'Hồng Thu' AS short_name, 'Hong Thu' AS name_en, '30611' AS postal_code, 'hong_thu' AS slug
UNION ALL
       SELECT '12' AS province_code, '03517' AS code, 'Xã Nậm Tăm' AS name, 'Nậm Tăm' AS short_name, 'Nam Tam' AS name_en, '30626' AS postal_code, 'nam_tam' AS slug
UNION ALL
       SELECT '12' AS province_code, '03529' AS code, 'Xã Tủa Sín Chải' AS name, 'Tủa Sín Chải' AS short_name, 'Tua Sin Chai' AS name_en, '30617' AS postal_code, 'tua_sin_chai' AS slug
UNION ALL
       SELECT '12' AS province_code, '03532' AS code, 'Xã Pu Sam Cáp' AS name, 'Pu Sam Cáp' AS short_name, 'Pu Sam Cap' AS name_en, '30624' AS postal_code, 'pu_sam_cap' AS slug
UNION ALL
       SELECT '12' AS province_code, '03538' AS code, 'Xã Nậm Mạ' AS name, 'Nậm Mạ' AS short_name, 'Nam Ma' AS name_en, '30618' AS postal_code, 'nam_ma' AS slug
UNION ALL
       SELECT '12' AS province_code, '03544' AS code, 'Xã Nậm Cuổi' AS name, 'Nậm Cuổi' AS short_name, 'Nam Cuoi' AS name_en, '30622' AS postal_code, 'nam_cuoi' AS slug
UNION ALL
       SELECT '12' AS province_code, '03549' AS code, 'Xã Phong Thổ' AS name, 'Phong Thổ' AS short_name, 'Phong Tho' AS name_en, '30306' AS postal_code, 'phong_tho' AS slug
UNION ALL
       SELECT '12' AS province_code, '03562' AS code, 'Xã Sì Lở Lầu' AS name, 'Sì Lở Lầu' AS short_name, 'Si Lo Lau' AS name_en, '30313' AS postal_code, 'si_lo_lau' AS slug
UNION ALL
       SELECT '12' AS province_code, '03571' AS code, 'Xã Dào San' AS name, 'Dào San' AS short_name, 'Dao San' AS name_en, '30309' AS postal_code, 'dao_san' AS slug
UNION ALL
       SELECT '12' AS province_code, '03583' AS code, 'Xã Khổng Lào' AS name, 'Khổng Lào' AS short_name, 'Khong Lao' AS name_en, '30307' AS postal_code, 'khong_lao' AS slug
UNION ALL
       SELECT '12' AS province_code, '03595' AS code, 'Xã Than Uyên' AS name, 'Than Uyên' AS short_name, 'Than Uyen' AS name_en, '30806' AS postal_code, 'than_uyen' AS slug
UNION ALL
       SELECT '12' AS province_code, '03598' AS code, 'Xã Tân Uyên' AS name, 'Tân Uyên' AS short_name, 'Tan Uyen' AS name_en, '30706' AS postal_code, 'tan_uyen' AS slug
UNION ALL
       SELECT '12' AS province_code, '03601' AS code, 'Xã Mường Khoa' AS name, 'Mường Khoa' AS short_name, 'Muong Khoa' AS name_en, '30708' AS postal_code, 'muong_khoa' AS slug
UNION ALL
       SELECT '12' AS province_code, '03613' AS code, 'Xã Nậm Sỏ' AS name, 'Nậm Sỏ' AS short_name, 'Nam So' AS name_en, '30711' AS postal_code, 'nam_so' AS slug
UNION ALL
       SELECT '12' AS province_code, '03616' AS code, 'Xã Pắc Ta' AS name, 'Pắc Ta' AS short_name, 'Pac Ta' AS name_en, '30713' AS postal_code, 'pac_ta' AS slug
UNION ALL
       SELECT '12' AS province_code, '03618' AS code, 'Xã Mường Than' AS name, 'Mường Than' AS short_name, 'Muong Than' AS name_en, '30818' AS postal_code, 'muong_than' AS slug
UNION ALL
       SELECT '12' AS province_code, '03637' AS code, 'Xã Mường Kim' AS name, 'Mường Kim' AS short_name, 'Muong Kim' AS name_en, '30816' AS postal_code, 'muong_kim' AS slug
UNION ALL
       SELECT '12' AS province_code, '03640' AS code, 'Xã Khoen On' AS name, 'Khoen On' AS short_name, 'Khoen On' AS name_en, '30814' AS postal_code, 'khoen_on' AS slug
UNION ALL
       SELECT '14' AS province_code, '03646' AS code, 'Phường Tô Hiệu' AS name, 'Tô Hiệu' AS short_name, 'To Hieu' AS name_en, '34112' AS postal_code, 'to_hieu' AS slug
UNION ALL
       SELECT '14' AS province_code, '03664' AS code, 'Phường Chiềng An' AS name, 'Chiềng An' AS short_name, 'Chieng An' AS name_en, '34107' AS postal_code, 'chieng_an' AS slug
UNION ALL
       SELECT '14' AS province_code, '03670' AS code, 'Phường Chiềng Cơi' AS name, 'Chiềng Cơi' AS short_name, 'Chieng Coi' AS name_en, '34111' AS postal_code, 'chieng_coi' AS slug
UNION ALL
       SELECT '14' AS province_code, '03679' AS code, 'Phường Chiềng Sinh' AS name, 'Chiềng Sinh' AS short_name, 'Chieng Sinh' AS name_en, '34116' AS postal_code, 'chieng_sinh' AS slug
UNION ALL
       SELECT '14' AS province_code, '03688' AS code, 'Xã Mường Chiên' AS name, 'Mường Chiên' AS short_name, 'Muong Chien' AS name_en, '34256' AS postal_code, 'muong_chien' AS slug
UNION ALL
       SELECT '14' AS province_code, '03694' AS code, 'Xã Mường Giôn' AS name, 'Mường Giôn' AS short_name, 'Muong Gion' AS name_en, '34266' AS postal_code, 'muong_gion' AS slug
UNION ALL
       SELECT '14' AS province_code, '03703' AS code, 'Xã Quỳnh Nhai' AS name, 'Quỳnh Nhai' AS short_name, 'Quynh Nhai' AS name_en, '34267' AS postal_code, 'quynh_nhai' AS slug
UNION ALL
       SELECT '14' AS province_code, '03712' AS code, 'Xã Mường Sại' AS name, 'Mường Sại' AS short_name, 'Muong Sai' AS name_en, '34264' AS postal_code, 'muong_sai' AS slug
UNION ALL
       SELECT '14' AS province_code, '03721' AS code, 'Xã Thuận Châu' AS name, 'Thuận Châu' AS short_name, 'Thuan Chau' AS name_en, '34306' AS postal_code, 'thuan_chau' AS slug
UNION ALL
       SELECT '14' AS province_code, '03724' AS code, 'Xã Bình Thuận' AS name, 'Bình Thuận' AS short_name, 'Binh Thuan' AS name_en, '34335' AS postal_code, 'binh_thuan' AS slug
UNION ALL
       SELECT '14' AS province_code, '03727' AS code, 'Xã Mường É' AS name, 'Mường É' AS short_name, 'Muong E' AS name_en, '34318' AS postal_code, 'muong_e' AS slug
UNION ALL
       SELECT '14' AS province_code, '03754' AS code, 'Xã Chiềng La' AS name, 'Chiềng La' AS short_name, 'Chieng La' AS name_en, '34307' AS postal_code, 'chieng_la' AS slug
UNION ALL
       SELECT '14' AS province_code, '03757' AS code, 'Xã Mường Khiêng' AS name, 'Mường Khiêng' AS short_name, 'Muong Khieng' AS name_en, '34311' AS postal_code, 'muong_khieng' AS slug
UNION ALL
       SELECT '14' AS province_code, '03760' AS code, 'Xã Mường Bám' AS name, 'Mường Bám' AS short_name, 'Muong Bam' AS name_en, '34324' AS postal_code, 'muong_bam' AS slug
UNION ALL
       SELECT '14' AS province_code, '03763' AS code, 'Xã Long Hẹ' AS name, 'Long Hẹ' AS short_name, 'Long He' AS name_en, '34322' AS postal_code, 'long_he' AS slug
UNION ALL
       SELECT '14' AS province_code, '03781' AS code, 'Xã Co Mạ' AS name, 'Co Mạ' AS short_name, 'Co Ma' AS name_en, '34325' AS postal_code, 'co_ma' AS slug
UNION ALL
       SELECT '14' AS province_code, '03784' AS code, 'Xã Nậm Lầu' AS name, 'Nậm Lầu' AS short_name, 'Nam Lau' AS name_en, '34332' AS postal_code, 'nam_lau' AS slug
UNION ALL
       SELECT '14' AS province_code, '03799' AS code, 'Xã Muổi Nọi' AS name, 'Muổi Nọi' AS short_name, 'Muoi Noi' AS name_en, '34334' AS postal_code, 'muoi_noi' AS slug
UNION ALL
       SELECT '14' AS province_code, '03808' AS code, 'Xã Mường La' AS name, 'Mường La' AS short_name, 'Muong La' AS name_en, '34222' AS postal_code, 'muong_la' AS slug
UNION ALL
       SELECT '14' AS province_code, '03814' AS code, 'Xã Chiềng Lao' AS name, 'Chiềng Lao' AS short_name, 'Chieng Lao' AS name_en, '34210' AS postal_code, 'chieng_lao' AS slug
UNION ALL
       SELECT '14' AS province_code, '03820' AS code, 'Xã Ngọc Chiến' AS name, 'Ngọc Chiến' AS short_name, 'Ngoc Chien' AS name_en, '34208' AS postal_code, 'ngoc_chien' AS slug
UNION ALL
       SELECT '14' AS province_code, '03847' AS code, 'Xã Mường Bú' AS name, 'Mường Bú' AS short_name, 'Muong Bu' AS name_en, '34216' AS postal_code, 'muong_bu' AS slug
UNION ALL
       SELECT '14' AS province_code, '03850' AS code, 'Xã Chiềng Hoa' AS name, 'Chiềng Hoa' AS short_name, 'Chieng Hoa' AS name_en, '34218' AS postal_code, 'chieng_hoa' AS slug
UNION ALL
       SELECT '14' AS province_code, '03856' AS code, 'Xã Bắc Yên' AS name, 'Bắc Yên' AS short_name, 'Bac Yen' AS name_en, '34606' AS postal_code, 'bac_yen' AS slug
UNION ALL
       SELECT '14' AS province_code, '03862' AS code, 'Xã Xím Vàng' AS name, 'Xím Vàng' AS short_name, 'Xim Vang' AS name_en, '34609' AS postal_code, 'xim_vang' AS slug
UNION ALL
       SELECT '14' AS province_code, '03868' AS code, 'Xã Tà Xùa' AS name, 'Tà Xùa' AS short_name, 'Ta Xua' AS name_en, '34607' AS postal_code, 'ta_xua' AS slug
UNION ALL
       SELECT '14' AS province_code, '03871' AS code, 'Xã Pắc Ngà' AS name, 'Pắc Ngà' AS short_name, 'Pac Nga' AS name_en, '34611' AS postal_code, 'pac_nga' AS slug
UNION ALL
       SELECT '14' AS province_code, '03880' AS code, 'Xã Tạ Khoa' AS name, 'Tạ Khoa' AS short_name, 'Ta Khoa' AS name_en, '34616' AS postal_code, 'ta_khoa' AS slug
UNION ALL
       SELECT '14' AS province_code, '03892' AS code, 'Xã Chiềng Sại' AS name, 'Chiềng Sại' AS short_name, 'Chieng Sai' AS name_en, '34618' AS postal_code, 'chieng_sai' AS slug
UNION ALL
       SELECT '14' AS province_code, '03901' AS code, 'Xã Suối Tọ' AS name, 'Suối Tọ' AS short_name, 'Suoi To' AS name_en, '34910' AS postal_code, 'suoi_to' AS slug
UNION ALL
       SELECT '14' AS province_code, '03907' AS code, 'Xã Mường Cơi' AS name, 'Mường Cơi' AS short_name, 'Muong Coi' AS name_en, '34908' AS postal_code, 'muong_coi' AS slug
UNION ALL
       SELECT '14' AS province_code, '03910' AS code, 'Xã Phù Yên' AS name, 'Phù Yên' AS short_name, 'Phu Yen' AS name_en, '34933' AS postal_code, 'phu_yen' AS slug
UNION ALL
       SELECT '14' AS province_code, '03922' AS code, 'Xã Gia Phù' AS name, 'Gia Phù' AS short_name, 'Gia Phu' AS name_en, '34916' AS postal_code, 'gia_phu' AS slug
UNION ALL
       SELECT '14' AS province_code, '03943' AS code, 'Xã Mường Bang' AS name, 'Mường Bang' AS short_name, 'Muong Bang' AS name_en, '34932' AS postal_code, 'muong_bang' AS slug
UNION ALL
       SELECT '14' AS province_code, '03958' AS code, 'Xã Tường Hạ' AS name, 'Tường Hạ' AS short_name, 'Tuong Ha' AS name_en, '34923' AS postal_code, 'tuong_ha' AS slug
UNION ALL
       SELECT '14' AS province_code, '03961' AS code, 'Xã Kim Bon' AS name, 'Kim Bon' AS short_name, 'Kim Bon' AS name_en, '34921' AS postal_code, 'kim_bon' AS slug
UNION ALL
       SELECT '14' AS province_code, '03970' AS code, 'Xã Tân Phong' AS name, 'Tân Phong' AS short_name, 'Tan Phong' AS name_en, '34930' AS postal_code, 'tan_phong' AS slug
UNION ALL
       SELECT '14' AS province_code, '03979' AS code, 'Phường Mộc Sơn' AS name, 'Mộc Sơn' AS short_name, 'Moc Son' AS name_en, '34721' AS postal_code, 'moc_son' AS slug
UNION ALL
       SELECT '14' AS province_code, '03980' AS code, 'Phường Mộc Châu' AS name, 'Mộc Châu' AS short_name, 'Moc Chau' AS name_en, '34725' AS postal_code, 'moc_chau' AS slug
UNION ALL
       SELECT '14' AS province_code, '03982' AS code, 'Phường Thảo Nguyên' AS name, 'Thảo Nguyên' AS short_name, 'Thao Nguyen' AS name_en, '34722' AS postal_code, 'thao_nguyen' AS slug
UNION ALL
       SELECT '14' AS province_code, '03985' AS code, 'Xã Chiềng Sơn' AS name, 'Chiềng Sơn' AS short_name, 'Chieng Son' AS name_en, '34718' AS postal_code, 'chieng_son' AS slug
UNION ALL
       SELECT '14' AS province_code, '03997' AS code, 'Xã Tân Yên' AS name, 'Tân Yên' AS short_name, 'Tan Yen' AS name_en, '34711' AS postal_code, 'tan_yen' AS slug
UNION ALL
       SELECT '14' AS province_code, '04000' AS code, 'Xã Đoàn Kết' AS name, 'Đoàn Kết' AS short_name, 'Doan Ket' AS name_en, '34709' AS postal_code, 'doan_ket' AS slug
UNION ALL
       SELECT '14' AS province_code, '04006' AS code, 'Xã Song Khủa' AS name, 'Song Khủa' AS short_name, 'Song Khua' AS name_en, '34812' AS postal_code, 'song_khua' AS slug
UNION ALL
       SELECT '14' AS province_code, '04018' AS code, 'Xã Tô Múa' AS name, 'Tô Múa' AS short_name, 'To Mua' AS name_en, '34815' AS postal_code, 'to_mua' AS slug
UNION ALL
       SELECT '14' AS province_code, '04033' AS code, 'Phường Vân Sơn' AS name, 'Vân Sơn' AS short_name, 'Van Son' AS name_en, '34724' AS postal_code, 'van_son' AS slug
UNION ALL
       SELECT '14' AS province_code, '04045' AS code, 'Xã Lóng Sập' AS name, 'Lóng Sập' AS short_name, 'Long Sap' AS name_en, '34717' AS postal_code, 'long_sap' AS slug
UNION ALL
       SELECT '14' AS province_code, '04048' AS code, 'Xã Vân Hồ' AS name, 'Vân Hồ' AS short_name, 'Van Ho' AS name_en, '34806' AS postal_code, 'van_ho' AS slug
UNION ALL
       SELECT '14' AS province_code, '04057' AS code, 'Xã Xuân Nha' AS name, 'Xuân Nha' AS short_name, 'Xuan Nha' AS name_en, '34818' AS postal_code, 'xuan_nha' AS slug
UNION ALL
       SELECT '14' AS province_code, '04075' AS code, 'Xã Yên Châu' AS name, 'Yên Châu' AS short_name, 'Yen Chau' AS name_en, '34656' AS postal_code, 'yen_chau' AS slug
UNION ALL
       SELECT '14' AS province_code, '04078' AS code, 'Xã Chiềng Hặc' AS name, 'Chiềng Hặc' AS short_name, 'Chieng Hac' AS name_en, '34666' AS postal_code, 'chieng_hac' AS slug
UNION ALL
       SELECT '14' AS province_code, '04087' AS code, 'Xã Yên Sơn' AS name, 'Yên Sơn' AS short_name, 'Yen Son' AS name_en, '34662' AS postal_code, 'yen_son' AS slug
UNION ALL
       SELECT '14' AS province_code, '04096' AS code, 'Xã Lóng Phiêng' AS name, 'Lóng Phiêng' AS short_name, 'Long Phieng' AS name_en, '34667' AS postal_code, 'long_phieng' AS slug
UNION ALL
       SELECT '14' AS province_code, '04099' AS code, 'Xã Phiêng Khoài' AS name, 'Phiêng Khoài' AS short_name, 'Phieng Khoai' AS name_en, '34664' AS postal_code, 'phieng_khoai' AS slug
UNION ALL
       SELECT '14' AS province_code, '04105' AS code, 'Xã Mai Sơn' AS name, 'Mai Sơn' AS short_name, 'Mai Son' AS name_en, '34528' AS postal_code, 'mai_son' AS slug
UNION ALL
       SELECT '14' AS province_code, '04108' AS code, 'Xã Chiềng Sung' AS name, 'Chiềng Sung' AS short_name, 'Chieng Sung' AS name_en, '34510' AS postal_code, 'chieng_sung' AS slug
UNION ALL
       SELECT '14' AS province_code, '04117' AS code, 'Xã Mường Chanh' AS name, 'Mường Chanh' AS short_name, 'Muong Chanh' AS name_en, '34516' AS postal_code, 'muong_chanh' AS slug
UNION ALL
       SELECT '14' AS province_code, '04123' AS code, 'Xã Chiềng Mung' AS name, 'Chiềng Mung' AS short_name, 'Chieng Mung' AS name_en, '34513' AS postal_code, 'chieng_mung' AS slug
UNION ALL
       SELECT '14' AS province_code, '04132' AS code, 'Xã Chiềng Mai' AS name, 'Chiềng Mai' AS short_name, 'Chieng Mai' AS name_en, '34520' AS postal_code, 'chieng_mai' AS slug
UNION ALL
       SELECT '14' AS province_code, '04136' AS code, 'Xã Tà Hộc' AS name, 'Tà Hộc' AS short_name, 'Ta Hoc' AS name_en, '34508' AS postal_code, 'ta_hoc' AS slug
UNION ALL
       SELECT '14' AS province_code, '04144' AS code, 'Xã Phiêng Cằm' AS name, 'Phiêng Cằm' AS short_name, 'Phieng Cam' AS name_en, '34518' AS postal_code, 'phieng_cam' AS slug
UNION ALL
       SELECT '14' AS province_code, '04159' AS code, 'Xã Phiêng Pằn' AS name, 'Phiêng Pằn' AS short_name, 'Phieng Pan' AS name_en, '34524' AS postal_code, 'phieng_pan' AS slug
UNION ALL
       SELECT '14' AS province_code, '04168' AS code, 'Xã Sông Mã' AS name, 'Sông Mã' AS short_name, 'Song Ma' AS name_en, '34406' AS postal_code, 'song_ma' AS slug
UNION ALL
       SELECT '14' AS province_code, '04171' AS code, 'Xã Bó Sinh' AS name, 'Bó Sinh' AS short_name, 'Bo Sinh' AS name_en, '34412' AS postal_code, 'bo_sinh' AS slug
UNION ALL
       SELECT '14' AS province_code, '04183' AS code, 'Xã Mường Lầm' AS name, 'Mường Lầm' AS short_name, 'Muong Lam' AS name_en, '34411' AS postal_code, 'muong_lam' AS slug
UNION ALL
       SELECT '14' AS province_code, '04186' AS code, 'Xã Nậm Ty' AS name, 'Nậm Ty' AS short_name, 'Nam Ty' AS name_en, '34409' AS postal_code, 'nam_ty' AS slug
UNION ALL
       SELECT '14' AS province_code, '04195' AS code, 'Xã Chiềng Sơ' AS name, 'Chiềng Sơ' AS short_name, 'Chieng So' AS name_en, '34417' AS postal_code, 'chieng_so' AS slug
UNION ALL
       SELECT '14' AS province_code, '04204' AS code, 'Xã Chiềng Khoong' AS name, 'Chiềng Khoong' AS short_name, 'Chieng Khoong' AS name_en, '34407' AS postal_code, 'chieng_khoong' AS slug
UNION ALL
       SELECT '14' AS province_code, '04210' AS code, 'Xã Huổi Một' AS name, 'Huổi Một' AS short_name, 'Huoi Mot' AS name_en, '34419' AS postal_code, 'huoi_mot' AS slug
UNION ALL
       SELECT '14' AS province_code, '04219' AS code, 'Xã Mường Hung' AS name, 'Mường Hung' AS short_name, 'Muong Hung' AS name_en, '34421' AS postal_code, 'muong_hung' AS slug
UNION ALL
       SELECT '14' AS province_code, '04222' AS code, 'Xã Chiềng Khương' AS name, 'Chiềng Khương' AS short_name, 'Chieng Khuong' AS name_en, '34422' AS postal_code, 'chieng_khuong' AS slug
UNION ALL
       SELECT '14' AS province_code, '04228' AS code, 'Xã Púng Bánh' AS name, 'Púng Bánh' AS short_name, 'Pung Banh' AS name_en, '34458' AS postal_code, 'pung_banh' AS slug
UNION ALL
       SELECT '14' AS province_code, '04231' AS code, 'Xã Sốp Cộp' AS name, 'Sốp Cộp' AS short_name, 'Sop Cop' AS name_en, '34456' AS postal_code, 'sop_cop' AS slug
UNION ALL
       SELECT '14' AS province_code, '04240' AS code, 'Xã Mường Lèo' AS name, 'Mường Lèo' AS short_name, 'Muong Leo' AS name_en, '34460' AS postal_code, 'muong_leo' AS slug
UNION ALL
       SELECT '14' AS province_code, '04246' AS code, 'Xã Mường Lạn' AS name, 'Mường Lạn' AS short_name, 'Muong Lan' AS name_en, '34463' AS postal_code, 'muong_lan' AS slug
UNION ALL
       SELECT '15' AS province_code, '02647' AS code, 'Phường Lào Cai' AS name, 'Lào Cai' AS short_name, 'Lao Cai' AS name_en, '31109' AS postal_code, 'lao_cai' AS slug
UNION ALL
       SELECT '15' AS province_code, '02671' AS code, 'Phường Cam Đường' AS name, 'Cam Đường' AS short_name, 'Cam Duong' AS name_en, '31116' AS postal_code, 'cam_duong' AS slug
UNION ALL
       SELECT '15' AS province_code, '02680' AS code, 'Xã Hợp Thành' AS name, 'Hợp Thành' AS short_name, 'Hop Thanh' AS name_en, '31115' AS postal_code, 'hop_thanh' AS slug
UNION ALL
       SELECT '15' AS province_code, '02683' AS code, 'Xã Bát Xát' AS name, 'Bát Xát' AS short_name, 'Bat Xat' AS name_en, '31606' AS postal_code, 'bat_xat' AS slug
UNION ALL
       SELECT '15' AS province_code, '02686' AS code, 'Xã A Mú Sung' AS name, 'A Mú Sung' AS short_name, 'A Mu Sung' AS name_en, '31612' AS postal_code, 'a_mu_sung' AS slug
UNION ALL
       SELECT '15' AS province_code, '02695' AS code, 'Xã Trịnh Tường' AS name, 'Trịnh Tường' AS short_name, 'Trinh Tuong' AS name_en, '31610' AS postal_code, 'trinh_tuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '02701' AS code, 'Xã Y Tý' AS name, 'Y Tý' AS short_name, 'Y Ty' AS name_en, '31615' AS postal_code, 'y_ty' AS slug
UNION ALL
       SELECT '15' AS province_code, '02707' AS code, 'Xã Dền Sáng' AS name, 'Dền Sáng' AS short_name, 'Den Sang' AS name_en, '31616' AS postal_code, 'den_sang' AS slug
UNION ALL
       SELECT '15' AS province_code, '02725' AS code, 'Xã Bản Xèo' AS name, 'Bản Xèo' AS short_name, 'Ban Xeo' AS name_en, '31622' AS postal_code, 'ban_xeo' AS slug
UNION ALL
       SELECT '15' AS province_code, '02728' AS code, 'Xã Mường Hum' AS name, 'Mường Hum' AS short_name, 'Muong Hum' AS name_en, '31619' AS postal_code, 'muong_hum' AS slug
UNION ALL
       SELECT '15' AS province_code, '02746' AS code, 'Xã Cốc San' AS name, 'Cốc San' AS short_name, 'Coc San' AS name_en, '31123' AS postal_code, 'coc_san' AS slug
UNION ALL
       SELECT '15' AS province_code, '02752' AS code, 'Xã Pha Long' AS name, 'Pha Long' AS short_name, 'Pha Long' AS name_en, '31509' AS postal_code, 'pha_long' AS slug
UNION ALL
       SELECT '15' AS province_code, '02761' AS code, 'Xã Mường Khương' AS name, 'Mường Khương' AS short_name, 'Muong Khuong' AS name_en, '31506' AS postal_code, 'muong_khuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '02782' AS code, 'Xã Cao Sơn' AS name, 'Cao Sơn' AS short_name, 'Cao Son' AS name_en, '31517' AS postal_code, 'cao_son' AS slug
UNION ALL
       SELECT '15' AS province_code, '02788' AS code, 'Xã Bản Lầu' AS name, 'Bản Lầu' AS short_name, 'Ban Lau' AS name_en, '31513' AS postal_code, 'ban_lau' AS slug
UNION ALL
       SELECT '15' AS province_code, '02809' AS code, 'Xã Si Ma Cai' AS name, 'Si Ma Cai' AS short_name, 'Si Ma Cai' AS name_en, '31406' AS postal_code, 'si_ma_cai' AS slug
UNION ALL
       SELECT '15' AS province_code, '02824' AS code, 'Xã Sín Chéng' AS name, 'Sín Chéng' AS short_name, 'Sin Cheng' AS name_en, '31410' AS postal_code, 'sin_cheng' AS slug
UNION ALL
       SELECT '15' AS province_code, '02839' AS code, 'Xã Bắc Hà' AS name, 'Bắc Hà' AS short_name, 'Bac Ha' AS name_en, '31306' AS postal_code, 'bac_ha' AS slug
UNION ALL
       SELECT '15' AS province_code, '02842' AS code, 'Xã Tả Củ Tỷ' AS name, 'Tả Củ Tỷ' AS short_name, 'Ta Cu Ty' AS name_en, '31309' AS postal_code, 'ta_cu_ty' AS slug
UNION ALL
       SELECT '15' AS province_code, '02848' AS code, 'Xã Lùng Phình' AS name, 'Lùng Phình' AS short_name, 'Lung Phinh' AS name_en, '31312' AS postal_code, 'lung_phinh' AS slug
UNION ALL
       SELECT '15' AS province_code, '02869' AS code, 'Xã Bản Liền' AS name, 'Bản Liền' AS short_name, 'Ban Lien' AS name_en, '31326' AS postal_code, 'ban_lien' AS slug
UNION ALL
       SELECT '15' AS province_code, '02890' AS code, 'Xã Bảo Nhai' AS name, 'Bảo Nhai' AS short_name, 'Bao Nhai' AS name_en, '31321' AS postal_code, 'bao_nhai' AS slug
UNION ALL
       SELECT '15' AS province_code, '02896' AS code, 'Xã Cốc Lầu' AS name, 'Cốc Lầu' AS short_name, 'Coc Lau' AS name_en, '31322' AS postal_code, 'coc_lau' AS slug
UNION ALL
       SELECT '15' AS province_code, '02902' AS code, 'Xã Phong Hải' AS name, 'Phong Hải' AS short_name, 'Phong Hai' AS name_en, '31222' AS postal_code, 'phong_hai' AS slug
UNION ALL
       SELECT '15' AS province_code, '02905' AS code, 'Xã Bảo Thắng' AS name, 'Bảo Thắng' AS short_name, 'Bao Thang' AS name_en, '31221' AS postal_code, 'bao_thang' AS slug
UNION ALL
       SELECT '15' AS province_code, '02908' AS code, 'Xã Tằng Loỏng' AS name, 'Tằng Loỏng' AS short_name, 'Tang Loong' AS name_en, '31216' AS postal_code, 'tang_loong' AS slug
UNION ALL
       SELECT '15' AS province_code, '02923' AS code, 'Xã Gia Phú' AS name, 'Gia Phú' AS short_name, 'Gia Phu' AS name_en, '31213' AS postal_code, 'gia_phu' AS slug
UNION ALL
       SELECT '15' AS province_code, '02926' AS code, 'Xã Xuân Quang' AS name, 'Xuân Quang' AS short_name, 'Xuan Quang' AS name_en, '31207' AS postal_code, 'xuan_quang' AS slug
UNION ALL
       SELECT '15' AS province_code, '02947' AS code, 'Xã Bảo Yên' AS name, 'Bảo Yên' AS short_name, 'Bao Yen' AS name_en, '31924' AS postal_code, 'bao_yen' AS slug
UNION ALL
       SELECT '15' AS province_code, '02953' AS code, 'Xã Nghĩa Đô' AS name, 'Nghĩa Đô' AS short_name, 'Nghia Do' AS name_en, '31910' AS postal_code, 'nghia_do' AS slug
UNION ALL
       SELECT '15' AS province_code, '02962' AS code, 'Xã Xuân Hoà' AS name, 'Xuân Hoà' AS short_name, 'Xuan Hoa' AS name_en, '31908' AS postal_code, 'xuan_hoa' AS slug
UNION ALL
       SELECT '15' AS province_code, '02968' AS code, 'Xã Thượng Hà' AS name, 'Thượng Hà' AS short_name, 'Thuong Ha' AS name_en, '31913' AS postal_code, 'thuong_ha' AS slug
UNION ALL
       SELECT '15' AS province_code, '02989' AS code, 'Xã Bảo Hà' AS name, 'Bảo Hà' AS short_name, 'Bao Ha' AS name_en, '31918' AS postal_code, 'bao_ha' AS slug
UNION ALL
       SELECT '15' AS province_code, '02998' AS code, 'Xã Phúc Khánh' AS name, 'Phúc Khánh' AS short_name, 'Phuc Khanh' AS name_en, '31921' AS postal_code, 'phuc_khanh' AS slug
UNION ALL
       SELECT '15' AS province_code, '03004' AS code, 'Xã Ngũ Chỉ Sơn' AS name, 'Ngũ Chỉ Sơn' AS short_name, 'Ngu Chi Son' AS name_en, '31710' AS postal_code, 'ngu_chi_son' AS slug
UNION ALL
       SELECT '15' AS province_code, '03006' AS code, 'Phường Sa Pa' AS name, 'Sa Pa' AS short_name, 'Sa Pa' AS name_en, '31706' AS postal_code, 'sa_pa' AS slug
UNION ALL
       SELECT '15' AS province_code, '03013' AS code, 'Xã Tả Phìn' AS name, 'Tả Phìn' AS short_name, 'Ta Phin' AS name_en, '31709' AS postal_code, 'ta_phin' AS slug
UNION ALL
       SELECT '15' AS province_code, '03037' AS code, 'Xã Tả Van' AS name, 'Tả Van' AS short_name, 'Ta Van' AS name_en, '31714' AS postal_code, 'ta_van' AS slug
UNION ALL
       SELECT '15' AS province_code, '03043' AS code, 'Xã Mường Bo' AS name, 'Mường Bo' AS short_name, 'Muong Bo' AS name_en, '31718' AS postal_code, 'muong_bo' AS slug
UNION ALL
       SELECT '15' AS province_code, '03046' AS code, 'Xã Bản Hồ' AS name, 'Bản Hồ' AS short_name, 'Ban Ho' AS name_en, '31715' AS postal_code, 'ban_ho' AS slug
UNION ALL
       SELECT '15' AS province_code, '03061' AS code, 'Xã Võ Lao' AS name, 'Võ Lao' AS short_name, 'Vo Lao' AS name_en, '31810' AS postal_code, 'vo_lao' AS slug
UNION ALL
       SELECT '15' AS province_code, '03076' AS code, 'Xã Nậm Chày' AS name, 'Nậm Chày' AS short_name, 'Nam Chay' AS name_en, '31815' AS postal_code, 'nam_chay' AS slug
UNION ALL
       SELECT '15' AS province_code, '03082' AS code, 'Xã Văn Bàn' AS name, 'Văn Bàn' AS short_name, 'Van Ban' AS name_en, '31829' AS postal_code, 'van_ban' AS slug
UNION ALL
       SELECT '15' AS province_code, '03085' AS code, 'Xã Nậm Xé' AS name, 'Nậm Xé' AS short_name, 'Nam Xe' AS name_en, '31816' AS postal_code, 'nam_xe' AS slug
UNION ALL
       SELECT '15' AS province_code, '03091' AS code, 'Xã Chiềng Ken' AS name, 'Chiềng Ken' AS short_name, 'Chieng Ken' AS name_en, '31827' AS postal_code, 'chieng_ken' AS slug
UNION ALL
       SELECT '15' AS province_code, '03103' AS code, 'Xã Khánh Yên' AS name, 'Khánh Yên' AS short_name, 'Khanh Yen' AS name_en, '31830' AS postal_code, 'khanh_yen' AS slug
UNION ALL
       SELECT '15' AS province_code, '03106' AS code, 'Xã Dương Quỳ' AS name, 'Dương Quỳ' AS short_name, 'Duong Quy' AS name_en, '31820' AS postal_code, 'duong_quy' AS slug
UNION ALL
       SELECT '15' AS province_code, '03121' AS code, 'Xã Minh Lương' AS name, 'Minh Lương' AS short_name, 'Minh Luong' AS name_en, '31817' AS postal_code, 'minh_luong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04252' AS code, 'Phường Yên Bái' AS name, 'Yên Bái' AS short_name, 'Yen Bai' AS name_en, '33123' AS postal_code, 'yen_bai' AS slug
UNION ALL
       SELECT '15' AS province_code, '04273' AS code, 'Phường Nam Cường' AS name, 'Nam Cường' AS short_name, 'Nam Cuong' AS name_en, '33110' AS postal_code, 'nam_cuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04279' AS code, 'Phường Văn Phú' AS name, 'Văn Phú' AS short_name, 'Van Phu' AS name_en, '33118' AS postal_code, 'van_phu' AS slug
UNION ALL
       SELECT '15' AS province_code, '04288' AS code, 'Phường Nghĩa Lộ' AS name, 'Nghĩa Lộ' AS short_name, 'Nghia Lo' AS name_en, '33713' AS postal_code, 'nghia_lo' AS slug
UNION ALL
       SELECT '15' AS province_code, '04303' AS code, 'Xã Lục Yên' AS name, 'Lục Yên' AS short_name, 'Luc Yen' AS name_en, '33330' AS postal_code, 'luc_yen' AS slug
UNION ALL
       SELECT '15' AS province_code, '04309' AS code, 'Xã Lâm Thượng' AS name, 'Lâm Thượng' AS short_name, 'Lam Thuong' AS name_en, '33312' AS postal_code, 'lam_thuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04336' AS code, 'Xã Tân Lĩnh' AS name, 'Tân Lĩnh' AS short_name, 'Tan Linh' AS name_en, '33316' AS postal_code, 'tan_linh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04342' AS code, 'Xã Khánh Hoà' AS name, 'Khánh Hoà' AS short_name, 'Khanh Hoa' AS name_en, '33319' AS postal_code, 'khanh_hoa' AS slug
UNION ALL
       SELECT '15' AS province_code, '04345' AS code, 'Xã Mường Lai' AS name, 'Mường Lai' AS short_name, 'Muong Lai' AS name_en, '33308' AS postal_code, 'muong_lai' AS slug
UNION ALL
       SELECT '15' AS province_code, '04363' AS code, 'Xã Phúc Lợi' AS name, 'Phúc Lợi' AS short_name, 'Phuc Loi' AS name_en, '33323' AS postal_code, 'phuc_loi' AS slug
UNION ALL
       SELECT '15' AS province_code, '04375' AS code, 'Xã Mậu A' AS name, 'Mậu A' AS short_name, 'Mau A' AS name_en, '33406' AS postal_code, 'mau_a' AS slug
UNION ALL
       SELECT '15' AS province_code, '04381' AS code, 'Xã Lâm Giang' AS name, 'Lâm Giang' AS short_name, 'Lam Giang' AS name_en, '33411' AS postal_code, 'lam_giang' AS slug
UNION ALL
       SELECT '15' AS province_code, '04387' AS code, 'Xã Châu Quế' AS name, 'Châu Quế' AS short_name, 'Chau Que' AS name_en, '33433' AS postal_code, 'chau_que' AS slug
UNION ALL
       SELECT '15' AS province_code, '04399' AS code, 'Xã Đông Cuông' AS name, 'Đông Cuông' AS short_name, 'Dong Cuong' AS name_en, '33416' AS postal_code, 'dong_cuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04402' AS code, 'Xã Phong Dụ Hạ' AS name, 'Phong Dụ Hạ' AS short_name, 'Phong Du Ha' AS name_en, '33417' AS postal_code, 'phong_du_ha' AS slug
UNION ALL
       SELECT '15' AS province_code, '04423' AS code, 'Xã Phong Dụ Thượng' AS name, 'Phong Dụ Thượng' AS short_name, 'Phong Du Thuong' AS name_en, '33418' AS postal_code, 'phong_du_thuong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04429' AS code, 'Xã Tân Hợp' AS name, 'Tân Hợp' AS short_name, 'Tan Hop' AS name_en, '33420' AS postal_code, 'tan_hop' AS slug
UNION ALL
       SELECT '15' AS province_code, '04441' AS code, 'Xã Xuân Ái' AS name, 'Xuân Ái' AS short_name, 'Xuan Ai' AS name_en, '33428' AS postal_code, 'xuan_ai' AS slug
UNION ALL
       SELECT '15' AS province_code, '04450' AS code, 'Xã Mỏ Vàng' AS name, 'Mỏ Vàng' AS short_name, 'Mo Vang' AS name_en, '33425' AS postal_code, 'mo_vang' AS slug
UNION ALL
       SELECT '15' AS province_code, '04456' AS code, 'Xã Mù Cang Chải' AS name, 'Mù Cang Chải' AS short_name, 'Mu Cang Chai' AS name_en, '33506' AS postal_code, 'mu_cang_chai' AS slug
UNION ALL
       SELECT '15' AS province_code, '04462' AS code, 'Xã Nậm Có' AS name, 'Nậm Có' AS short_name, 'Nam Co' AS name_en, '33519' AS postal_code, 'nam_co' AS slug
UNION ALL
       SELECT '15' AS province_code, '04465' AS code, 'Xã Khao Mang' AS name, 'Khao Mang' AS short_name, 'Khao Mang' AS name_en, '33508' AS postal_code, 'khao_mang' AS slug
UNION ALL
       SELECT '15' AS province_code, '04474' AS code, 'Xã Lao Chải' AS name, 'Lao Chải' AS short_name, 'Lao Chai' AS name_en, '33510' AS postal_code, 'lao_chai' AS slug
UNION ALL
       SELECT '15' AS province_code, '04489' AS code, 'Xã Chế Tạo' AS name, 'Chế Tạo' AS short_name, 'Che Tao' AS name_en, '33512' AS postal_code, 'che_tao' AS slug
UNION ALL
       SELECT '15' AS province_code, '04492' AS code, 'Xã Púng Luông' AS name, 'Púng Luông' AS short_name, 'Pung Luong' AS name_en, '33514' AS postal_code, 'pung_luong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04498' AS code, 'Xã Trấn Yên' AS name, 'Trấn Yên' AS short_name, 'Tran Yen' AS name_en, '33928' AS postal_code, 'tran_yen' AS slug
UNION ALL
       SELECT '15' AS province_code, '04531' AS code, 'Xã Quy Mông' AS name, 'Quy Mông' AS short_name, 'Quy Mong' AS name_en, '33913' AS postal_code, 'quy_mong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04537' AS code, 'Xã Lương Thịnh' AS name, 'Lương Thịnh' AS short_name, 'Luong Thinh' AS name_en, '33923' AS postal_code, 'luong_thinh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04543' AS code, 'Phường Âu Lâu' AS name, 'Âu Lâu' AS short_name, 'Au Lau' AS name_en, '33112' AS postal_code, 'au_lau' AS slug
UNION ALL
       SELECT '15' AS province_code, '04564' AS code, 'Xã Việt Hồng' AS name, 'Việt Hồng' AS short_name, 'Viet Hong' AS name_en, '33918' AS postal_code, 'viet_hong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04576' AS code, 'Xã Hưng Khánh' AS name, 'Hưng Khánh' AS short_name, 'Hung Khanh' AS name_en, '33916' AS postal_code, 'hung_khanh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04585' AS code, 'Xã Hạnh Phúc' AS name, 'Hạnh Phúc' AS short_name, 'Hanh Phuc' AS name_en, '33618' AS postal_code, 'hanh_phuc' AS slug
UNION ALL
       SELECT '15' AS province_code, '04603' AS code, 'Xã Tà Xi Láng' AS name, 'Tà Xi Láng' AS short_name, 'Ta Xi Lang' AS name_en, '33615' AS postal_code, 'ta_xi_lang' AS slug
UNION ALL
       SELECT '15' AS province_code, '04606' AS code, 'Xã Trạm Tấu' AS name, 'Trạm Tấu' AS short_name, 'Tram Tau' AS name_en, '33609' AS postal_code, 'tram_tau' AS slug
UNION ALL
       SELECT '15' AS province_code, '04609' AS code, 'Xã Phình Hồ' AS name, 'Phình Hồ' AS short_name, 'Phinh Ho' AS name_en, '33616' AS postal_code, 'phinh_ho' AS slug
UNION ALL
       SELECT '15' AS province_code, '04630' AS code, 'Xã Tú Lệ' AS name, 'Tú Lệ' AS short_name, 'Tu Le' AS name_en, '33814' AS postal_code, 'tu_le' AS slug
UNION ALL
       SELECT '15' AS province_code, '04636' AS code, 'Xã Gia Hội' AS name, 'Gia Hội' AS short_name, 'Gia Hoi' AS name_en, '33812' AS postal_code, 'gia_hoi' AS slug
UNION ALL
       SELECT '15' AS province_code, '04651' AS code, 'Xã Sơn Lương' AS name, 'Sơn Lương' AS short_name, 'Son Luong' AS name_en, '33816' AS postal_code, 'son_luong' AS slug
UNION ALL
       SELECT '15' AS province_code, '04660' AS code, 'Xã Liên Sơn' AS name, 'Liên Sơn' AS short_name, 'Lien Son' AS name_en, '33837' AS postal_code, 'lien_son' AS slug
UNION ALL
       SELECT '15' AS province_code, '04663' AS code, 'Phường Trung Tâm' AS name, 'Trung Tâm' AS short_name, 'Trung Tam' AS name_en, '33706' AS postal_code, 'trung_tam' AS slug
UNION ALL
       SELECT '15' AS province_code, '04672' AS code, 'Xã Văn Chấn' AS name, 'Văn Chấn' AS short_name, 'Van Chan' AS name_en, '33838' AS postal_code, 'van_chan' AS slug
UNION ALL
       SELECT '15' AS province_code, '04681' AS code, 'Phường Cầu Thia' AS name, 'Cầu Thia' AS short_name, 'Cau Thia' AS name_en, '33712' AS postal_code, 'cau_thia' AS slug
UNION ALL
       SELECT '15' AS province_code, '04693' AS code, 'Xã Cát Thịnh' AS name, 'Cát Thịnh' AS short_name, 'Cat Thinh' AS name_en, '33828' AS postal_code, 'cat_thinh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04699' AS code, 'Xã Chấn Thịnh' AS name, 'Chấn Thịnh' AS short_name, 'Chan Thinh' AS name_en, '33833' AS postal_code, 'chan_thinh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04705' AS code, 'Xã Thượng Bằng La' AS name, 'Thượng Bằng La' AS short_name, 'Thuong Bang La' AS name_en, '33829' AS postal_code, 'thuong_bang_la' AS slug
UNION ALL
       SELECT '15' AS province_code, '04711' AS code, 'Xã Nghĩa Tâm' AS name, 'Nghĩa Tâm' AS short_name, 'Nghia Tam' AS name_en, '33831' AS postal_code, 'nghia_tam' AS slug
UNION ALL
       SELECT '15' AS province_code, '04714' AS code, 'Xã Yên Bình' AS name, 'Yên Bình' AS short_name, 'Yen Binh' AS name_en, '33206' AS postal_code, 'yen_binh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04717' AS code, 'Xã Thác Bà' AS name, 'Thác Bà' AS short_name, 'Thac Ba' AS name_en, '33231' AS postal_code, 'thac_ba' AS slug
UNION ALL
       SELECT '15' AS province_code, '04726' AS code, 'Xã Cảm Nhân' AS name, 'Cảm Nhân' AS short_name, 'Cam Nhan' AS name_en, '33215' AS postal_code, 'cam_nhan' AS slug
UNION ALL
       SELECT '15' AS province_code, '04744' AS code, 'Xã Yên Thành' AS name, 'Yên Thành' AS short_name, 'Yen Thanh' AS name_en, '33212' AS postal_code, 'yen_thanh' AS slug
UNION ALL
       SELECT '15' AS province_code, '04750' AS code, 'Xã Bảo Ái' AS name, 'Bảo Ái' AS short_name, 'Bao Ai' AS name_en, '33221' AS postal_code, 'bao_ai' AS slug
UNION ALL
       SELECT '19' AS province_code, '01840' AS code, 'Phường Đức Xuân' AS name, 'Đức Xuân' AS short_name, 'Duc Xuan' AS name_en, '23107' AS postal_code, 'duc_xuan' AS slug
UNION ALL
       SELECT '19' AS province_code, '01843' AS code, 'Phường Bắc Kạn' AS name, 'Bắc Kạn' AS short_name, 'Bac Kan' AS name_en, '23114' AS postal_code, 'bac_kan' AS slug
UNION ALL
       SELECT '19' AS province_code, '01849' AS code, 'Xã Phong Quang' AS name, 'Phong Quang' AS short_name, 'Phong Quang' AS name_en, '23225' AS postal_code, 'phong_quang' AS slug
UNION ALL
       SELECT '19' AS province_code, '01864' AS code, 'Xã Bằng Thành' AS name, 'Bằng Thành' AS short_name, 'Bang Thanh' AS name_en, '23407' AS postal_code, 'bang_thanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '01879' AS code, 'Xã Cao Minh' AS name, 'Cao Minh' AS short_name, 'Cao Minh' AS name_en, '23416' AS postal_code, 'cao_minh' AS slug
UNION ALL
       SELECT '19' AS province_code, '01882' AS code, 'Xã Nghiên Loan' AS name, 'Nghiên Loan' AS short_name, 'Nghien Loan' AS name_en, '23413' AS postal_code, 'nghien_loan' AS slug
UNION ALL
       SELECT '19' AS province_code, '01894' AS code, 'Xã Phúc Lộc' AS name, 'Phúc Lộc' AS short_name, 'Phuc Loc' AS name_en, '23508' AS postal_code, 'phuc_loc' AS slug
UNION ALL
       SELECT '19' AS province_code, '01906' AS code, 'Xã Ba Bể' AS name, 'Ba Bể' AS short_name, 'Ba Be' AS name_en, '23522' AS postal_code, 'ba_be' AS slug
UNION ALL
       SELECT '19' AS province_code, '01912' AS code, 'Xã Chợ Rã' AS name, 'Chợ Rã' AS short_name, 'Cho Ra' AS name_en, '23506' AS postal_code, 'cho_ra' AS slug
UNION ALL
       SELECT '19' AS province_code, '01921' AS code, 'Xã Thượng Minh' AS name, 'Thượng Minh' AS short_name, 'Thuong Minh' AS name_en, '23523' AS postal_code, 'thuong_minh' AS slug
UNION ALL
       SELECT '19' AS province_code, '01933' AS code, 'Xã Đồng Phúc' AS name, 'Đồng Phúc' AS short_name, 'Dong Phuc' AS name_en, '23521' AS postal_code, 'dong_phuc' AS slug
UNION ALL
       SELECT '19' AS province_code, '01936' AS code, 'Xã Nà Phặc' AS name, 'Nà Phặc' AS short_name, 'Na Phac' AS name_en, '23312' AS postal_code, 'na_phac' AS slug
UNION ALL
       SELECT '19' AS province_code, '01942' AS code, 'Xã Bằng Vân' AS name, 'Bằng Vân' AS short_name, 'Bang Van' AS name_en, '23308' AS postal_code, 'bang_van' AS slug
UNION ALL
       SELECT '19' AS province_code, '01954' AS code, 'Xã Ngân Sơn' AS name, 'Ngân Sơn' AS short_name, 'Ngan Son' AS name_en, '23317' AS postal_code, 'ngan_son' AS slug
UNION ALL
       SELECT '19' AS province_code, '01957' AS code, 'Xã Thượng Quan' AS name, 'Thượng Quan' AS short_name, 'Thuong Quan' AS name_en, '23316' AS postal_code, 'thuong_quan' AS slug
UNION ALL
       SELECT '19' AS province_code, '01960' AS code, 'Xã Hiệp Lực' AS name, 'Hiệp Lực' AS short_name, 'Hiep Luc' AS name_en, '23313' AS postal_code, 'hiep_luc' AS slug
UNION ALL
       SELECT '19' AS province_code, '01969' AS code, 'Xã Phủ Thông' AS name, 'Phủ Thông' AS short_name, 'Phu Thong' AS name_en, '23206' AS postal_code, 'phu_thong' AS slug
UNION ALL
       SELECT '19' AS province_code, '01981' AS code, 'Xã Vĩnh Thông' AS name, 'Vĩnh Thông' AS short_name, 'Vinh Thong' AS name_en, '23223' AS postal_code, 'vinh_thong' AS slug
UNION ALL
       SELECT '19' AS province_code, '02008' AS code, 'Xã Cẩm Giàng' AS name, 'Cẩm Giàng' AS short_name, 'Cam Giang' AS name_en, '23217' AS postal_code, 'cam_giang' AS slug
UNION ALL
       SELECT '19' AS province_code, '02014' AS code, 'Xã Bạch Thông' AS name, 'Bạch Thông' AS short_name, 'Bach Thong' AS name_en, '23224' AS postal_code, 'bach_thong' AS slug
UNION ALL
       SELECT '19' AS province_code, '02020' AS code, 'Xã Chợ Đồn' AS name, 'Chợ Đồn' AS short_name, 'Cho Don' AS name_en, '23628' AS postal_code, 'cho_don' AS slug
UNION ALL
       SELECT '19' AS province_code, '02026' AS code, 'Xã Nam Cường' AS name, 'Nam Cường' AS short_name, 'Nam Cuong' AS name_en, '23612' AS postal_code, 'nam_cuong' AS slug
UNION ALL
       SELECT '19' AS province_code, '02038' AS code, 'Xã Quảng Bạch' AS name, 'Quảng Bạch' AS short_name, 'Quang Bach' AS name_en, '23615' AS postal_code, 'quang_bach' AS slug
UNION ALL
       SELECT '19' AS province_code, '02044' AS code, 'Xã Yên Thịnh' AS name, 'Yên Thịnh' AS short_name, 'Yen Thinh' AS name_en, '23618' AS postal_code, 'yen_thinh' AS slug
UNION ALL
       SELECT '19' AS province_code, '02071' AS code, 'Xã Nghĩa Tá' AS name, 'Nghĩa Tá' AS short_name, 'Nghia Ta' AS name_en, '23620' AS postal_code, 'nghia_ta' AS slug
UNION ALL
       SELECT '19' AS province_code, '02083' AS code, 'Xã Yên Phong' AS name, 'Yên Phong' AS short_name, 'Yen Phong' AS name_en, '23622' AS postal_code, 'yen_phong' AS slug
UNION ALL
       SELECT '19' AS province_code, '02086' AS code, 'Xã Chợ Mới' AS name, 'Chợ Mới' AS short_name, 'Cho Moi' AS name_en, '23723' AS postal_code, 'cho_moi' AS slug
UNION ALL
       SELECT '19' AS province_code, '02101' AS code, 'Xã Thanh Mai' AS name, 'Thanh Mai' AS short_name, 'Thanh Mai' AS name_en, '23714' AS postal_code, 'thanh_mai' AS slug
UNION ALL
       SELECT '19' AS province_code, '02104' AS code, 'Xã Tân Kỳ' AS name, 'Tân Kỳ' AS short_name, 'Tan Ky' AS name_en, '23722' AS postal_code, 'tan_ky' AS slug
UNION ALL
       SELECT '19' AS province_code, '02107' AS code, 'Xã Thanh Thịnh' AS name, 'Thanh Thịnh' AS short_name, 'Thanh Thinh' AS name_en, '23716' AS postal_code, 'thanh_thinh' AS slug
UNION ALL
       SELECT '19' AS province_code, '02116' AS code, 'Xã Yên Bình' AS name, 'Yên Bình' AS short_name, 'Yen Binh' AS name_en, '23724' AS postal_code, 'yen_binh' AS slug
UNION ALL
       SELECT '19' AS province_code, '02143' AS code, 'Xã Văn Lang' AS name, 'Văn Lang' AS short_name, 'Van Lang' AS name_en, '23811' AS postal_code, 'van_lang' AS slug
UNION ALL
       SELECT '19' AS province_code, '02152' AS code, 'Xã Cường Lợi' AS name, 'Cường Lợi' AS short_name, 'Cuong Loi' AS name_en, '23808' AS postal_code, 'cuong_loi' AS slug
UNION ALL
       SELECT '19' AS province_code, '02155' AS code, 'Xã Na Rì' AS name, 'Na Rì' AS short_name, 'Na Ri' AS name_en, '23828' AS postal_code, 'na_ri' AS slug
UNION ALL
       SELECT '19' AS province_code, '02176' AS code, 'Xã Trần Phú' AS name, 'Trần Phú' AS short_name, 'Tran Phu' AS name_en, '23821' AS postal_code, 'tran_phu' AS slug
UNION ALL
       SELECT '19' AS province_code, '02185' AS code, 'Xã Côn Minh' AS name, 'Côn Minh' AS short_name, 'Con Minh' AS name_en, '23815' AS postal_code, 'con_minh' AS slug
UNION ALL
       SELECT '19' AS province_code, '02191' AS code, 'Xã Xuân Dương' AS name, 'Xuân Dương' AS short_name, 'Xuan Duong' AS name_en, '23819' AS postal_code, 'xuan_duong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05443' AS code, 'Phường Phan Đình Phùng' AS name, 'Phan Đình Phùng' AS short_name, 'Phan Dinh Phung' AS name_en, '24124' AS postal_code, 'phan_dinh_phung' AS slug
UNION ALL
       SELECT '19' AS province_code, '05455' AS code, 'Phường Quyết Thắng' AS name, 'Quyết Thắng' AS short_name, 'Quyet Thang' AS name_en, '24119' AS postal_code, 'quyet_thang' AS slug
UNION ALL
       SELECT '19' AS province_code, '05467' AS code, 'Phường Gia Sàng' AS name, 'Gia Sàng' AS short_name, 'Gia Sang' AS name_en, '24127' AS postal_code, 'gia_sang' AS slug
UNION ALL
       SELECT '19' AS province_code, '05482' AS code, 'Phường Quan Triều' AS name, 'Quan Triều' AS short_name, 'Quan Trieu' AS name_en, '24114' AS postal_code, 'quan_trieu' AS slug
UNION ALL
       SELECT '19' AS province_code, '05488' AS code, 'Xã Đại Phúc' AS name, 'Đại Phúc' AS short_name, 'Dai Phuc' AS name_en, '24138' AS postal_code, 'dai_phuc' AS slug
UNION ALL
       SELECT '19' AS province_code, '05500' AS code, 'Phường Tích Lương' AS name, 'Tích Lương' AS short_name, 'Tich Luong' AS name_en, '24131' AS postal_code, 'tich_luong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05503' AS code, 'Xã Tân Cương' AS name, 'Tân Cương' AS short_name, 'Tan Cuong' AS name_en, '24129' AS postal_code, 'tan_cuong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05518' AS code, 'Phường Sông Công' AS name, 'Sông Công' AS short_name, 'Song Cong' AS name_en, '24817' AS postal_code, 'song_cong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05528' AS code, 'Phường Bách Quang' AS name, 'Bách Quang' AS short_name, 'Bach Quang' AS name_en, '24806' AS postal_code, 'bach_quang' AS slug
UNION ALL
       SELECT '19' AS province_code, '05533' AS code, 'Phường Bá Xuyên' AS name, 'Bá Xuyên' AS short_name, 'Ba Xuyen' AS name_en, '24807' AS postal_code, 'ba_xuyen' AS slug
UNION ALL
       SELECT '19' AS province_code, '05542' AS code, 'Xã Lam Vỹ' AS name, 'Lam Vỹ' AS short_name, 'Lam Vy' AS name_en, '24509' AS postal_code, 'lam_vy' AS slug
UNION ALL
       SELECT '19' AS province_code, '05551' AS code, 'Xã Kim Phượng' AS name, 'Kim Phượng' AS short_name, 'Kim Phuong' AS name_en, '24512' AS postal_code, 'kim_phuong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05563' AS code, 'Xã Phượng Tiến' AS name, 'Phượng Tiến' AS short_name, 'Phuong Tien' AS name_en, '24529' AS postal_code, 'phuong_tien' AS slug
UNION ALL
       SELECT '19' AS province_code, '05569' AS code, 'Xã Định Hoá' AS name, 'Định Hoá' AS short_name, 'Dinh Hoa' AS name_en, '24530' AS postal_code, 'dinh_hoa' AS slug
UNION ALL
       SELECT '19' AS province_code, '05581' AS code, 'Xã Trung Hội' AS name, 'Trung Hội' AS short_name, 'Trung Hoi' AS name_en, '24528' AS postal_code, 'trung_hoi' AS slug
UNION ALL
       SELECT '19' AS province_code, '05587' AS code, 'Xã Bình Yên' AS name, 'Bình Yên' AS short_name, 'Binh Yen' AS name_en, '24524' AS postal_code, 'binh_yen' AS slug
UNION ALL
       SELECT '19' AS province_code, '05602' AS code, 'Xã Phú Đình' AS name, 'Phú Đình' AS short_name, 'Phu Dinh' AS name_en, '24521' AS postal_code, 'phu_dinh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05605' AS code, 'Xã Bình Thành' AS name, 'Bình Thành' AS short_name, 'Binh Thanh' AS name_en, '24522' AS postal_code, 'binh_thanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05611' AS code, 'Xã Phú Lương' AS name, 'Phú Lương' AS short_name, 'Phu Luong' AS name_en, '24421' AS postal_code, 'phu_luong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05620' AS code, 'Xã Yên Trạch' AS name, 'Yên Trạch' AS short_name, 'Yen Trach' AS name_en, '24410' AS postal_code, 'yen_trach' AS slug
UNION ALL
       SELECT '19' AS province_code, '05632' AS code, 'Xã Hợp Thành' AS name, 'Hợp Thành' AS short_name, 'Hop Thanh' AS name_en, '24413' AS postal_code, 'hop_thanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05641' AS code, 'Xã Vô Tranh' AS name, 'Vô Tranh' AS short_name, 'Vo Tranh' AS name_en, '24418' AS postal_code, 'vo_tranh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05662' AS code, 'Xã Trại Cau' AS name, 'Trại Cau' AS short_name, 'Trai Cau' AS name_en, '24216' AS postal_code, 'trai_cau' AS slug
UNION ALL
       SELECT '19' AS province_code, '05665' AS code, 'Xã Văn Lăng' AS name, 'Văn Lăng' AS short_name, 'Van Lang' AS name_en, '24211' AS postal_code, 'van_lang' AS slug
UNION ALL
       SELECT '19' AS province_code, '05674' AS code, 'Xã Quang Sơn' AS name, 'Quang Sơn' AS short_name, 'Quang Son' AS name_en, '24209' AS postal_code, 'quang_son' AS slug
UNION ALL
       SELECT '19' AS province_code, '05680' AS code, 'Xã Văn Hán' AS name, 'Văn Hán' AS short_name, 'Van Han' AS name_en, '24220' AS postal_code, 'van_han' AS slug
UNION ALL
       SELECT '19' AS province_code, '05692' AS code, 'Xã Đồng Hỷ' AS name, 'Đồng Hỷ' AS short_name, 'Dong Hy' AS name_en, '24221' AS postal_code, 'dong_hy' AS slug
UNION ALL
       SELECT '19' AS province_code, '05707' AS code, 'Xã Nam Hoà' AS name, 'Nam Hoà' AS short_name, 'Nam Hoa' AS name_en, '24215' AS postal_code, 'nam_hoa' AS slug
UNION ALL
       SELECT '19' AS province_code, '05710' AS code, 'Phường Linh Sơn' AS name, 'Linh Sơn' AS short_name, 'Linh Son' AS name_en, '24107' AS postal_code, 'linh_son' AS slug
UNION ALL
       SELECT '19' AS province_code, '05716' AS code, 'Xã Võ Nhai' AS name, 'Võ Nhai' AS short_name, 'Vo Nhai' AS name_en, '24321' AS postal_code, 'vo_nhai' AS slug
UNION ALL
       SELECT '19' AS province_code, '05719' AS code, 'Xã Sảng Mộc' AS name, 'Sảng Mộc' AS short_name, 'Sang Moc' AS name_en, '24309' AS postal_code, 'sang_moc' AS slug
UNION ALL
       SELECT '19' AS province_code, '05722' AS code, 'Xã Nghinh Tường' AS name, 'Nghinh Tường' AS short_name, 'Nghinh Tuong' AS name_en, '24308' AS postal_code, 'nghinh_tuong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05725' AS code, 'Xã Thần Sa' AS name, 'Thần Sa' AS short_name, 'Than Sa' AS name_en, '24322' AS postal_code, 'than_sa' AS slug
UNION ALL
       SELECT '19' AS province_code, '05740' AS code, 'Xã La Hiên' AS name, 'La Hiên' AS short_name, 'La Hien' AS name_en, '24314' AS postal_code, 'la_hien' AS slug
UNION ALL
       SELECT '19' AS province_code, '05746' AS code, 'Xã Tràng Xá' AS name, 'Tràng Xá' AS short_name, 'Trang Xa' AS name_en, '24317' AS postal_code, 'trang_xa' AS slug
UNION ALL
       SELECT '19' AS province_code, '05755' AS code, 'Xã Dân Tiến' AS name, 'Dân Tiến' AS short_name, 'Dan Tien' AS name_en, '24318' AS postal_code, 'dan_tien' AS slug
UNION ALL
       SELECT '19' AS province_code, '05773' AS code, 'Xã Phú Xuyên' AS name, 'Phú Xuyên' AS short_name, 'Phu Xuyen' AS name_en, '24615' AS postal_code, 'phu_xuyen' AS slug
UNION ALL
       SELECT '19' AS province_code, '05776' AS code, 'Xã Đức Lương' AS name, 'Đức Lương' AS short_name, 'Duc Luong' AS name_en, '24609' AS postal_code, 'duc_luong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05788' AS code, 'Xã Phú Lạc' AS name, 'Phú Lạc' AS short_name, 'Phu Lac' AS name_en, '24608' AS postal_code, 'phu_lac' AS slug
UNION ALL
       SELECT '19' AS province_code, '05800' AS code, 'Xã Phú Thịnh' AS name, 'Phú Thịnh' AS short_name, 'Phu Thinh' AS name_en, '24616' AS postal_code, 'phu_thinh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05809' AS code, 'Xã An Khánh' AS name, 'An Khánh' AS short_name, 'An Khanh' AS name_en, '24635' AS postal_code, 'an_khanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05818' AS code, 'Xã La Bằng' AS name, 'La Bằng' AS short_name, 'La Bang' AS name_en, '24618' AS postal_code, 'la_bang' AS slug
UNION ALL
       SELECT '19' AS province_code, '05830' AS code, 'Xã Đại Từ' AS name, 'Đại Từ' AS short_name, 'Dai Tu' AS name_en, '24636' AS postal_code, 'dai_tu' AS slug
UNION ALL
       SELECT '19' AS province_code, '05845' AS code, 'Xã Vạn Phú' AS name, 'Vạn Phú' AS short_name, 'Van Phu' AS name_en, '24624' AS postal_code, 'van_phu' AS slug
UNION ALL
       SELECT '19' AS province_code, '05851' AS code, 'Xã Quân Chu' AS name, 'Quân Chu' AS short_name, 'Quan Chu' AS name_en, '24627' AS postal_code, 'quan_chu' AS slug
UNION ALL
       SELECT '19' AS province_code, '05857' AS code, 'Phường Phúc Thuận' AS name, 'Phúc Thuận' AS short_name, 'Phuc Thuan' AS name_en, '24715' AS postal_code, 'phuc_thuan' AS slug
UNION ALL
       SELECT '19' AS province_code, '05860' AS code, 'Phường Phổ Yên' AS name, 'Phổ Yên' AS short_name, 'Pho Yen' AS name_en, '24724' AS postal_code, 'pho_yen' AS slug
UNION ALL
       SELECT '19' AS province_code, '05881' AS code, 'Xã Thành Công' AS name, 'Thành Công' AS short_name, 'Thanh Cong' AS name_en, '24712' AS postal_code, 'thanh_cong' AS slug
UNION ALL
       SELECT '19' AS province_code, '05890' AS code, 'Phường Vạn Xuân' AS name, 'Vạn Xuân' AS short_name, 'Van Xuan' AS name_en, '24725' AS postal_code, 'van_xuan' AS slug
UNION ALL
       SELECT '19' AS province_code, '05899' AS code, 'Phường Trung Thành' AS name, 'Trung Thành' AS short_name, 'Trung Thanh' AS name_en, '24717' AS postal_code, 'trung_thanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05908' AS code, 'Xã Phú Bình' AS name, 'Phú Bình' AS short_name, 'Phu Binh' AS name_en, '24926' AS postal_code, 'phu_binh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05917' AS code, 'Xã Tân Khánh' AS name, 'Tân Khánh' AS short_name, 'Tan Khanh' AS name_en, '24910' AS postal_code, 'tan_khanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05923' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '24908' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '19' AS province_code, '05941' AS code, 'Xã Điềm Thuỵ' AS name, 'Điềm Thuỵ' AS short_name, 'Diem Thuy' AS name_en, '24916' AS postal_code, 'diem_thuy' AS slug
UNION ALL
       SELECT '19' AS province_code, '05953' AS code, 'Xã Kha Sơn' AS name, 'Kha Sơn' AS short_name, 'Kha Son' AS name_en, '24921' AS postal_code, 'kha_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '05977' AS code, 'Phường Đông Kinh' AS name, 'Đông Kinh' AS short_name, 'Dong Kinh' AS name_en, '25107' AS postal_code, 'dong_kinh' AS slug
UNION ALL
       SELECT '20' AS province_code, '05983' AS code, 'Phường Lương Văn Tri' AS name, 'Lương Văn Tri' AS short_name, 'Luong Van Tri' AS name_en, '25114' AS postal_code, 'luong_van_tri' AS slug
UNION ALL
       SELECT '20' AS province_code, '05986' AS code, 'Phường Tam Thanh' AS name, 'Tam Thanh' AS short_name, 'Tam Thanh' AS name_en, '25110' AS postal_code, 'tam_thanh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06001' AS code, 'Xã Đoàn Kết' AS name, 'Đoàn Kết' AS short_name, 'Doan Ket' AS name_en, '25314' AS postal_code, 'doan_ket' AS slug
UNION ALL
       SELECT '20' AS province_code, '06004' AS code, 'Xã Quốc Khánh' AS name, 'Quốc Khánh' AS short_name, 'Quoc Khanh' AS name_en, '25309' AS postal_code, 'quoc_khanh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06019' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '25317' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '20' AS province_code, '06037' AS code, 'Xã Kháng Chiến' AS name, 'Kháng Chiến' AS short_name, 'Khang Chien' AS name_en, '25323' AS postal_code, 'khang_chien' AS slug
UNION ALL
       SELECT '20' AS province_code, '06040' AS code, 'Xã Thất Khê' AS name, 'Thất Khê' AS short_name, 'That Khe' AS name_en, '25306' AS postal_code, 'that_khe' AS slug
UNION ALL
       SELECT '20' AS province_code, '06046' AS code, 'Xã Tràng Định' AS name, 'Tràng Định' AS short_name, 'Trang Dinh' AS name_en, '25329' AS postal_code, 'trang_dinh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06058' AS code, 'Xã Quốc Việt' AS name, 'Quốc Việt' AS short_name, 'Quoc Viet' AS name_en, '25325' AS postal_code, 'quoc_viet' AS slug
UNION ALL
       SELECT '20' AS province_code, '06073' AS code, 'Xã Hoa Thám' AS name, 'Hoa Thám' AS short_name, 'Hoa Tham' AS name_en, '25410' AS postal_code, 'hoa_tham' AS slug
UNION ALL
       SELECT '20' AS province_code, '06076' AS code, 'Xã Quý Hoà' AS name, 'Quý Hoà' AS short_name, 'Quy Hoa' AS name_en, '25413' AS postal_code, 'quy_hoa' AS slug
UNION ALL
       SELECT '20' AS province_code, '06079' AS code, 'Xã Hồng Phong' AS name, 'Hồng Phong' AS short_name, 'Hong Phong' AS name_en, '25409' AS postal_code, 'hong_phong' AS slug
UNION ALL
       SELECT '20' AS province_code, '06085' AS code, 'Xã Thiện Hoà' AS name, 'Thiện Hoà' AS short_name, 'Thien Hoa' AS name_en, '25417' AS postal_code, 'thien_hoa' AS slug
UNION ALL
       SELECT '20' AS province_code, '06091' AS code, 'Xã Thiện Thuật' AS name, 'Thiện Thuật' AS short_name, 'Thien Thuat' AS name_en, '25416' AS postal_code, 'thien_thuat' AS slug
UNION ALL
       SELECT '20' AS province_code, '06103' AS code, 'Xã Thiện Long' AS name, 'Thiện Long' AS short_name, 'Thien Long' AS name_en, '25418' AS postal_code, 'thien_long' AS slug
UNION ALL
       SELECT '20' AS province_code, '06112' AS code, 'Xã Bình Gia' AS name, 'Bình Gia' AS short_name, 'Binh Gia' AS name_en, '25406' AS postal_code, 'binh_gia' AS slug
UNION ALL
       SELECT '20' AS province_code, '06115' AS code, 'Xã Tân Văn' AS name, 'Tân Văn' AS short_name, 'Tan Van' AS name_en, '25423' AS postal_code, 'tan_van' AS slug
UNION ALL
       SELECT '20' AS province_code, '06124' AS code, 'Xã Na Sầm' AS name, 'Na Sầm' AS short_name, 'Na Sam' AS name_en, '25206' AS postal_code, 'na_sam' AS slug
UNION ALL
       SELECT '20' AS province_code, '06148' AS code, 'Xã Thuỵ Hùng' AS name, 'Thuỵ Hùng' AS short_name, 'Thuy Hung' AS name_en, '25209' AS postal_code, 'thuy_hung' AS slug
UNION ALL
       SELECT '20' AS province_code, '06151' AS code, 'Xã Hội Hoan' AS name, 'Hội Hoan' AS short_name, 'Hoi Hoan' AS name_en, '25214' AS postal_code, 'hoi_hoan' AS slug
UNION ALL
       SELECT '20' AS province_code, '06154' AS code, 'Xã Văn Lãng' AS name, 'Văn Lãng' AS short_name, 'Van Lang' AS name_en, '25226' AS postal_code, 'van_lang' AS slug
UNION ALL
       SELECT '20' AS province_code, '06172' AS code, 'Xã Hoàng Văn Thụ' AS name, 'Hoàng Văn Thụ' AS short_name, 'Hoang Van Thu' AS name_en, '25223' AS postal_code, 'hoang_van_thu' AS slug
UNION ALL
       SELECT '20' AS province_code, '06184' AS code, 'Xã Đồng Đăng' AS name, 'Đồng Đăng' AS short_name, 'Dong Dang' AS name_en, '25164' AS postal_code, 'dong_dang' AS slug
UNION ALL
       SELECT '20' AS province_code, '06187' AS code, 'Phường Kỳ Lừa' AS name, 'Kỳ Lừa' AS short_name, 'Ky Lua' AS name_en, '25115' AS postal_code, 'ky_lua' AS slug
UNION ALL
       SELECT '20' AS province_code, '06196' AS code, 'Xã Ba Sơn' AS name, 'Ba Sơn' AS short_name, 'Ba Son' AS name_en, '25181' AS postal_code, 'ba_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06211' AS code, 'Xã Cao Lộc' AS name, 'Cao Lộc' AS short_name, 'Cao Loc' AS name_en, '25179' AS postal_code, 'cao_loc' AS slug
UNION ALL
       SELECT '20' AS province_code, '06220' AS code, 'Xã Công Sơn' AS name, 'Công Sơn' AS short_name, 'Cong Son' AS name_en, '25176' AS postal_code, 'cong_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06253' AS code, 'Xã Văn Quan' AS name, 'Văn Quan' AS short_name, 'Van Quan' AS name_en, '25506' AS postal_code, 'van_quan' AS slug
UNION ALL
       SELECT '20' AS province_code, '06280' AS code, 'Xã Điềm He' AS name, 'Điềm He' AS short_name, 'Diem He' AS name_en, '25508' AS postal_code, 'diem_he' AS slug
UNION ALL
       SELECT '20' AS province_code, '06286' AS code, 'Xã Khánh Khê' AS name, 'Khánh Khê' AS short_name, 'Khanh Khe' AS name_en, '25526' AS postal_code, 'khanh_khe' AS slug
UNION ALL
       SELECT '20' AS province_code, '06298' AS code, 'Xã Yên Phúc' AS name, 'Yên Phúc' AS short_name, 'Yen Phuc' AS name_en, '25518' AS postal_code, 'yen_phuc' AS slug
UNION ALL
       SELECT '20' AS province_code, '06313' AS code, 'Xã Tri Lễ' AS name, 'Tri Lễ' AS short_name, 'Tri Le' AS name_en, '25516' AS postal_code, 'tri_le' AS slug
UNION ALL
       SELECT '20' AS province_code, '06316' AS code, 'Xã Tân Đoàn' AS name, 'Tân Đoàn' AS short_name, 'Tan Doan' AS name_en, '25523' AS postal_code, 'tan_doan' AS slug
UNION ALL
       SELECT '20' AS province_code, '06325' AS code, 'xã Bắc Sơn' AS name, 'Bắc Sơn' AS short_name, 'Bac Son' AS name_en, '25456' AS postal_code, 'bac_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06337' AS code, 'Xã Tân Tri' AS name, 'Tân Tri' AS short_name, 'Tan Tri' AS name_en, '25463' AS postal_code, 'tan_tri' AS slug
UNION ALL
       SELECT '20' AS province_code, '06349' AS code, 'Xã Hưng Vũ' AS name, 'Hưng Vũ' AS short_name, 'Hung Vu' AS name_en, '25474' AS postal_code, 'hung_vu' AS slug
UNION ALL
       SELECT '20' AS province_code, '06364' AS code, 'Xã Vũ Lễ' AS name, 'Vũ Lễ' AS short_name, 'Vu Le' AS name_en, '25465' AS postal_code, 'vu_le' AS slug
UNION ALL
       SELECT '20' AS province_code, '06367' AS code, 'Xã Vũ Lăng' AS name, 'Vũ Lăng' AS short_name, 'Vu Lang' AS name_en, '25470' AS postal_code, 'vu_lang' AS slug
UNION ALL
       SELECT '20' AS province_code, '06376' AS code, 'Xã Nhất Hoà' AS name, 'Nhất Hoà' AS short_name, 'Nhat Hoa' AS name_en, '25468' AS postal_code, 'nhat_hoa' AS slug
UNION ALL
       SELECT '20' AS province_code, '06385' AS code, 'Xã Hữu Lũng' AS name, 'Hữu Lũng' AS short_name, 'Huu Lung' AS name_en, '25606' AS postal_code, 'huu_lung' AS slug
UNION ALL
       SELECT '20' AS province_code, '06391' AS code, 'Xã Yên Bình' AS name, 'Yên Bình' AS short_name, 'Yen Binh' AS name_en, '25613' AS postal_code, 'yen_binh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06400' AS code, 'Xã Hữu Liên' AS name, 'Hữu Liên' AS short_name, 'Huu Lien' AS name_en, '25610' AS postal_code, 'huu_lien' AS slug
UNION ALL
       SELECT '20' AS province_code, '06415' AS code, 'Xã Vân Nham' AS name, 'Vân Nham' AS short_name, 'Van Nham' AS name_en, '25619' AS postal_code, 'van_nham' AS slug
UNION ALL
       SELECT '20' AS province_code, '06427' AS code, 'Xã Cai Kinh' AS name, 'Cai Kinh' AS short_name, 'Cai Kinh' AS name_en, '25608' AS postal_code, 'cai_kinh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06436' AS code, 'Xã Thiện Tân' AS name, 'Thiện Tân' AS short_name, 'Thien Tan' AS name_en, '25615' AS postal_code, 'thien_tan' AS slug
UNION ALL
       SELECT '20' AS province_code, '06445' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '25629' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06457' AS code, 'Xã Tuấn Sơn' AS name, 'Tuấn Sơn' AS short_name, 'Tuan Son' AS name_en, '25632' AS postal_code, 'tuan_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06463' AS code, 'Xã Chi Lăng' AS name, 'Chi Lăng' AS short_name, 'Chi Lang' AS name_en, '25715' AS postal_code, 'chi_lang' AS slug
UNION ALL
       SELECT '20' AS province_code, '06475' AS code, 'Xã Bằng Mạc' AS name, 'Bằng Mạc' AS short_name, 'Bang Mac' AS name_en, '25711' AS postal_code, 'bang_mac' AS slug
UNION ALL
       SELECT '20' AS province_code, '06481' AS code, 'Xã Chiến Thắng' AS name, 'Chiến Thắng' AS short_name, 'Chien Thang' AS name_en, '25725' AS postal_code, 'chien_thang' AS slug
UNION ALL
       SELECT '20' AS province_code, '06496' AS code, 'Xã Nhân Lý' AS name, 'Nhân Lý' AS short_name, 'Nhan Ly' AS name_en, '25719' AS postal_code, 'nhan_ly' AS slug
UNION ALL
       SELECT '20' AS province_code, '06505' AS code, 'Xã Vạn Linh' AS name, 'Vạn Linh' AS short_name, 'Van Linh' AS name_en, '25712' AS postal_code, 'van_linh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06517' AS code, 'Xã Quan Sơn' AS name, 'Quan Sơn' AS short_name, 'Quan Son' AS name_en, '25718' AS postal_code, 'quan_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06526' AS code, 'Xã Na Dương' AS name, 'Na Dương' AS short_name, 'Na Duong' AS name_en, '25827' AS postal_code, 'na_duong' AS slug
UNION ALL
       SELECT '20' AS province_code, '06529' AS code, 'Xã Lộc Bình' AS name, 'Lộc Bình' AS short_name, 'Loc Binh' AS name_en, '25806' AS postal_code, 'loc_binh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06541' AS code, 'Xã Mẫu Sơn' AS name, 'Mẫu Sơn' AS short_name, 'Mau Son' AS name_en, '25809' AS postal_code, 'mau_son' AS slug
UNION ALL
       SELECT '20' AS province_code, '06565' AS code, 'Xã Khuất Xá' AS name, 'Khuất Xá' AS short_name, 'Khuat Xa' AS name_en, '25831' AS postal_code, 'khuat_xa' AS slug
UNION ALL
       SELECT '20' AS province_code, '06577' AS code, 'Xã Thống Nhất' AS name, 'Thống Nhất' AS short_name, 'Thong Nhat' AS name_en, '25815' AS postal_code, 'thong_nhat' AS slug
UNION ALL
       SELECT '20' AS province_code, '06601' AS code, 'Xã Lợi Bác' AS name, 'Lợi Bác' AS short_name, 'Loi Bac' AS name_en, '25828' AS postal_code, 'loi_bac' AS slug
UNION ALL
       SELECT '20' AS province_code, '06607' AS code, 'Xã Xuân Dương' AS name, 'Xuân Dương' AS short_name, 'Xuan Duong' AS name_en, '25821' AS postal_code, 'xuan_duong' AS slug
UNION ALL
       SELECT '20' AS province_code, '06613' AS code, 'Xã Đình Lập' AS name, 'Đình Lập' AS short_name, 'Dinh Lap' AS name_en, '25910' AS postal_code, 'dinh_lap' AS slug
UNION ALL
       SELECT '20' AS province_code, '06616' AS code, 'Xã Thái Bình' AS name, 'Thái Bình' AS short_name, 'Thai Binh' AS name_en, '25911' AS postal_code, 'thai_binh' AS slug
UNION ALL
       SELECT '20' AS province_code, '06625' AS code, 'Xã Kiên Mộc' AS name, 'Kiên Mộc' AS short_name, 'Kien Moc' AS name_en, '25907' AS postal_code, 'kien_moc' AS slug
UNION ALL
       SELECT '20' AS province_code, '06637' AS code, 'Xã Châu Sơn' AS name, 'Châu Sơn' AS short_name, 'Chau Son' AS name_en, '25917' AS postal_code, 'chau_son' AS slug
UNION ALL
       SELECT '22' AS province_code, '06652' AS code, 'Phường Hà Tu' AS name, 'Hà Tu' AS short_name, 'Ha Tu' AS name_en, '01114' AS postal_code, 'ha_tu' AS slug
UNION ALL
       SELECT '22' AS province_code, '06658' AS code, 'Phường Cao Xanh' AS name, 'Cao Xanh' AS short_name, 'Cao Xanh' AS name_en, '01117' AS postal_code, 'cao_xanh' AS slug
UNION ALL
       SELECT '22' AS province_code, '06661' AS code, 'Phường Việt Hưng' AS name, 'Việt Hưng' AS short_name, 'Viet Hung' AS name_en, '01123' AS postal_code, 'viet_hung' AS slug
UNION ALL
       SELECT '22' AS province_code, '06673' AS code, 'Phường Bãi Cháy' AS name, 'Bãi Cháy' AS short_name, 'Bai Chay' AS name_en, '01119' AS postal_code, 'bai_chay' AS slug
UNION ALL
       SELECT '22' AS province_code, '06676' AS code, 'Phường Hà Lầm' AS name, 'Hà Lầm' AS short_name, 'Ha Lam' AS name_en, '01111' AS postal_code, 'ha_lam' AS slug
UNION ALL
       SELECT '22' AS province_code, '06685' AS code, 'Phường Hồng Gai' AS name, 'Hồng Gai' AS short_name, 'Hong Gai' AS name_en, '01106' AS postal_code, 'hong_gai' AS slug
UNION ALL
       SELECT '22' AS province_code, '06688' AS code, 'Phường Hạ Long' AS name, 'Hạ Long' AS short_name, 'Ha Long' AS name_en, '01139' AS postal_code, 'ha_long' AS slug
UNION ALL
       SELECT '22' AS province_code, '06706' AS code, 'Phường Tuần Châu' AS name, 'Tuần Châu' AS short_name, 'Tuan Chau' AS name_en, '01125' AS postal_code, 'tuan_chau' AS slug
UNION ALL
       SELECT '22' AS province_code, '06709' AS code, 'Phường Móng Cái 2' AS name, 'Móng Cái 2' AS short_name, 'Mong Cai 2' AS name_en, '01525' AS postal_code, 'mong_cai_2' AS slug
UNION ALL
       SELECT '22' AS province_code, '06712' AS code, 'Phường Móng Cái 1' AS name, 'Móng Cái 1' AS short_name, 'Mong Cai 1' AS name_en, '01524' AS postal_code, 'mong_cai_1' AS slug
UNION ALL
       SELECT '22' AS province_code, '06724' AS code, 'Xã Hải Sơn' AS name, 'Hải Sơn' AS short_name, 'Hai Son' AS name_en, '01513' AS postal_code, 'hai_son' AS slug
UNION ALL
       SELECT '22' AS province_code, '06733' AS code, 'Xã Hải Ninh' AS name, 'Hải Ninh' AS short_name, 'Hai Ninh' AS name_en, '01523' AS postal_code, 'hai_ninh' AS slug
UNION ALL
       SELECT '22' AS province_code, '06736' AS code, 'Phường Móng Cái 3' AS name, 'Móng Cái 3' AS short_name, 'Mong Cai 3' AS name_en, '01526' AS postal_code, 'mong_cai_3' AS slug
UNION ALL
       SELECT '22' AS province_code, '06757' AS code, 'Xã Vĩnh Thực' AS name, 'Vĩnh Thực' AS short_name, 'Vinh Thuc' AS name_en, '01519' AS postal_code, 'vinh_thuc' AS slug
UNION ALL
       SELECT '22' AS province_code, '06760' AS code, 'Phường Mông Dương' AS name, 'Mông Dương' AS short_name, 'Mong Duong' AS name_en, '01217' AS postal_code, 'mong_duong' AS slug
UNION ALL
       SELECT '22' AS province_code, '06778' AS code, 'Phường Quang Hanh' AS name, 'Quang Hanh' AS short_name, 'Quang Hanh' AS name_en, '01219' AS postal_code, 'quang_hanh' AS slug
UNION ALL
       SELECT '22' AS province_code, '06781' AS code, 'Phường Cửa Ông' AS name, 'Cửa Ông' AS short_name, 'Cua Ong' AS name_en, '01214' AS postal_code, 'cua_ong' AS slug
UNION ALL
       SELECT '22' AS province_code, '06793' AS code, 'Phường Cẩm Phả' AS name, 'Cẩm Phả' AS short_name, 'Cam Pha' AS name_en, '01222' AS postal_code, 'cam_pha' AS slug
UNION ALL
       SELECT '22' AS province_code, '06799' AS code, 'Xã Hải Hoà' AS name, 'Hải Hoà' AS short_name, 'Hai Hoa' AS name_en, '01215' AS postal_code, 'hai_hoa' AS slug
UNION ALL
       SELECT '22' AS province_code, '06811' AS code, 'Phường Uông Bí' AS name, 'Uông Bí' AS short_name, 'Uong Bi' AS name_en, '02318' AS postal_code, 'uong_bi' AS slug
UNION ALL
       SELECT '22' AS province_code, '06820' AS code, 'Phường Vàng Danh' AS name, 'Vàng Danh' AS short_name, 'Vang Danh' AS name_en, '02309' AS postal_code, 'vang_danh' AS slug
UNION ALL
       SELECT '22' AS province_code, '06832' AS code, 'Phường Yên Tử' AS name, 'Yên Tử' AS short_name, 'Yen Tu' AS name_en, '02317' AS postal_code, 'yen_tu' AS slug
UNION ALL
       SELECT '22' AS province_code, '06838' AS code, 'Xã Bình Liêu' AS name, 'Bình Liêu' AS short_name, 'Binh Lieu' AS name_en, '01706' AS postal_code, 'binh_lieu' AS slug
UNION ALL
       SELECT '22' AS province_code, '06841' AS code, 'Xã Hoành Mô' AS name, 'Hoành Mô' AS short_name, 'Hoanh Mo' AS name_en, '01709' AS postal_code, 'hoanh_mo' AS slug
UNION ALL
       SELECT '22' AS province_code, '06856' AS code, 'Xã Lục Hồn' AS name, 'Lục Hồn' AS short_name, 'Luc Hon' AS name_en, '01711' AS postal_code, 'luc_hon' AS slug
UNION ALL
       SELECT '22' AS province_code, '06862' AS code, 'Xã Tiên Yên' AS name, 'Tiên Yên' AS short_name, 'Tien Yen' AS name_en, '01906' AS postal_code, 'tien_yen' AS slug
UNION ALL
       SELECT '22' AS province_code, '06874' AS code, 'Xã Điền Xá' AS name, 'Điền Xá' AS short_name, 'Dien Xa' AS name_en, '01914' AS postal_code, 'dien_xa' AS slug
UNION ALL
       SELECT '22' AS province_code, '06877' AS code, 'Xã Đông Ngũ' AS name, 'Đông Ngũ' AS short_name, 'Dong Ngu' AS name_en, '01909' AS postal_code, 'dong_ngu' AS slug
UNION ALL
       SELECT '22' AS province_code, '06886' AS code, 'Xã Hải Lạng' AS name, 'Hải Lạng' AS short_name, 'Hai Lang' AS name_en, '01916' AS postal_code, 'hai_lang' AS slug
UNION ALL
       SELECT '22' AS province_code, '06895' AS code, 'Xã Đầm Hà' AS name, 'Đầm Hà' AS short_name, 'Dam Ha' AS name_en, '01815' AS postal_code, 'dam_ha' AS slug
UNION ALL
       SELECT '22' AS province_code, '06913' AS code, 'Xã Quảng Tân' AS name, 'Quảng Tân' AS short_name, 'Quang Tan' AS name_en, '01807' AS postal_code, 'quang_tan' AS slug
UNION ALL
       SELECT '22' AS province_code, '06922' AS code, 'Xã Quảng Hà' AS name, 'Quảng Hà' AS short_name, 'Quang Ha' AS name_en, '01606' AS postal_code, 'quang_ha' AS slug
UNION ALL
       SELECT '22' AS province_code, '06931' AS code, 'Xã Quảng Đức' AS name, 'Quảng Đức' AS short_name, 'Quang Duc' AS name_en, '01610' AS postal_code, 'quang_duc' AS slug
UNION ALL
       SELECT '22' AS province_code, '06946' AS code, 'Xã Đường Hoa' AS name, 'Đường Hoa' AS short_name, 'Duong Hoa' AS name_en, '01612' AS postal_code, 'duong_hoa' AS slug
UNION ALL
       SELECT '22' AS province_code, '06967' AS code, 'Xã Cái Chiên' AS name, 'Cái Chiên' AS short_name, 'Cai Chien' AS name_en, '01621' AS postal_code, 'cai_chien' AS slug
UNION ALL
       SELECT '22' AS province_code, '06970' AS code, 'Xã Ba Chẽ' AS name, 'Ba Chẽ' AS short_name, 'Ba Che' AS name_en, '02006' AS postal_code, 'ba_che' AS slug
UNION ALL
       SELECT '22' AS province_code, '06979' AS code, 'Xã Kỳ Thượng' AS name, 'Kỳ Thượng' AS short_name, 'Ky Thuong' AS name_en, '01133' AS postal_code, 'ky_thuong' AS slug
UNION ALL
       SELECT '22' AS province_code, '06985' AS code, 'Xã Lương Minh' AS name, 'Lương Minh' AS short_name, 'Luong Minh' AS name_en, '02010' AS postal_code, 'luong_minh' AS slug
UNION ALL
       SELECT '22' AS province_code, '06994' AS code, 'Đặc khu Vân Đồn' AS name, 'Vân Đồn' AS short_name, 'Van Don' AS name_en, '01318' AS postal_code, 'van_don' AS slug
UNION ALL
       SELECT '22' AS province_code, '07030' AS code, 'Phường Hoành Bồ' AS name, 'Hoành Bồ' AS short_name, 'Hoanh Bo' AS name_en, '01126' AS postal_code, 'hoanh_bo' AS slug
UNION ALL
       SELECT '22' AS province_code, '07054' AS code, 'Xã Quảng La' AS name, 'Quảng La' AS short_name, 'Quang La' AS name_en, '01137' AS postal_code, 'quang_la' AS slug
UNION ALL
       SELECT '22' AS province_code, '07060' AS code, 'Xã Thống Nhất' AS name, 'Thống Nhất' AS short_name, 'Thong Nhat' AS name_en, '01130' AS postal_code, 'thong_nhat' AS slug
UNION ALL
       SELECT '22' AS province_code, '07069' AS code, 'Phường Mạo Khê' AS name, 'Mạo Khê' AS short_name, 'Mao Khe' AS name_en, '02411' AS postal_code, 'mao_khe' AS slug
UNION ALL
       SELECT '22' AS province_code, '07081' AS code, 'Phường Bình Khê' AS name, 'Bình Khê' AS short_name, 'Binh Khe' AS name_en, '02418' AS postal_code, 'binh_khe' AS slug
UNION ALL
       SELECT '22' AS province_code, '07090' AS code, 'Phường An Sinh' AS name, 'An Sinh' AS short_name, 'An Sinh' AS name_en, '02419' AS postal_code, 'an_sinh' AS slug
UNION ALL
       SELECT '22' AS province_code, '07093' AS code, 'Phường Đông Triều' AS name, 'Đông Triều' AS short_name, 'Dong Trieu' AS name_en, '02427' AS postal_code, 'dong_trieu' AS slug
UNION ALL
       SELECT '22' AS province_code, '07114' AS code, 'Phường Hoàng Quế' AS name, 'Hoàng Quế' AS short_name, 'Hoang Que' AS name_en, '02414' AS postal_code, 'hoang_que' AS slug
UNION ALL
       SELECT '22' AS province_code, '07132' AS code, 'Phường Quảng Yên' AS name, 'Quảng Yên' AS short_name, 'Quang Yen' AS name_en, '02206' AS postal_code, 'quang_yen' AS slug
UNION ALL
       SELECT '22' AS province_code, '07135' AS code, 'Phường Đông Mai' AS name, 'Đông Mai' AS short_name, 'Dong Mai' AS name_en, '02212' AS postal_code, 'dong_mai' AS slug
UNION ALL
       SELECT '22' AS province_code, '07147' AS code, 'Phường Hiệp Hoà' AS name, 'Hiệp Hoà' AS short_name, 'Hiep Hoa' AS name_en, '02215' AS postal_code, 'hiep_hoa' AS slug
UNION ALL
       SELECT '22' AS province_code, '07168' AS code, 'Phường Hà An' AS name, 'Hà An' AS short_name, 'Ha An' AS name_en, '02207' AS postal_code, 'ha_an' AS slug
UNION ALL
       SELECT '22' AS province_code, '07180' AS code, 'Phường Liên Hoà' AS name, 'Liên Hoà' AS short_name, 'Lien Hoa' AS name_en, '02222' AS postal_code, 'lien_hoa' AS slug
UNION ALL
       SELECT '22' AS province_code, '07183' AS code, 'Phường Phong Cốc' AS name, 'Phong Cốc' AS short_name, 'Phong Coc' AS name_en, '02219' AS postal_code, 'phong_coc' AS slug
UNION ALL
       SELECT '22' AS province_code, '07192' AS code, 'Đặc khu Cô Tô' AS name, 'Cô Tô' AS short_name, 'Co To' AS name_en, '01409' AS postal_code, 'co_to' AS slug
UNION ALL
       SELECT '24' AS province_code, '07210' AS code, 'Phường Bắc Giang' AS name, 'Bắc Giang' AS short_name, 'Bac Giang' AS name_en, '26122' AS postal_code, 'bac_giang' AS slug
UNION ALL
       SELECT '24' AS province_code, '07228' AS code, 'Phường Đa Mai' AS name, 'Đa Mai' AS short_name, 'Da Mai' AS name_en, '26113' AS postal_code, 'da_mai' AS slug
UNION ALL
       SELECT '24' AS province_code, '07246' AS code, 'Xã Xuân Lương' AS name, 'Xuân Lương' AS short_name, 'Xuan Luong' AS name_en, '26713' AS postal_code, 'xuan_luong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07264' AS code, 'Xã Tam Tiến' AS name, 'Tam Tiến' AS short_name, 'Tam Tien' AS name_en, '26714' AS postal_code, 'tam_tien' AS slug
UNION ALL
       SELECT '24' AS province_code, '07282' AS code, 'Xã Đồng Kỳ' AS name, 'Đồng Kỳ' AS short_name, 'Dong Ky' AS name_en, '26724' AS postal_code, 'dong_ky' AS slug
UNION ALL
       SELECT '24' AS province_code, '07288' AS code, 'Xã Yên Thế' AS name, 'Yên Thế' AS short_name, 'Yen The' AS name_en, '26727' AS postal_code, 'yen_the' AS slug
UNION ALL
       SELECT '24' AS province_code, '07294' AS code, 'Phường Bố Hạ' AS name, 'Bố Hạ' AS short_name, 'Bo Ha' AS name_en, '26723' AS postal_code, 'bo_ha' AS slug
UNION ALL
       SELECT '24' AS province_code, '07306' AS code, 'Xã Nhã Nam' AS name, 'Nhã Nam' AS short_name, 'Nha Nam' AS name_en, '26811' AS postal_code, 'nha_nam' AS slug
UNION ALL
       SELECT '24' AS province_code, '07330' AS code, 'Xã Phúc Hoà' AS name, 'Phúc Hoà' AS short_name, 'Phuc Hoa' AS name_en, '26809' AS postal_code, 'phuc_hoa' AS slug
UNION ALL
       SELECT '24' AS province_code, '07333' AS code, 'Xã Quang Trung' AS name, 'Quang Trung' AS short_name, 'Quang Trung' AS name_en, '26813' AS postal_code, 'quang_trung' AS slug
UNION ALL
       SELECT '24' AS province_code, '07339' AS code, 'Xã Tân Yên' AS name, 'Tân Yên' AS short_name, 'Tan Yen' AS name_en, '26830' AS postal_code, 'tan_yen' AS slug
UNION ALL
       SELECT '24' AS province_code, '07351' AS code, 'Xã Ngọc Thiện' AS name, 'Ngọc Thiện' AS short_name, 'Ngoc Thien' AS name_en, '26825' AS postal_code, 'ngoc_thien' AS slug
UNION ALL
       SELECT '24' AS province_code, '07375' AS code, 'Phường Lạng Giang' AS name, 'Lạng Giang' AS short_name, 'Lang Giang' AS name_en, '26629' AS postal_code, 'lang_giang' AS slug
UNION ALL
       SELECT '24' AS province_code, '07381' AS code, 'Xã Tiên Lục' AS name, 'Tiên Lục' AS short_name, 'Tien Luc' AS name_en, '26618' AS postal_code, 'tien_luc' AS slug
UNION ALL
       SELECT '24' AS province_code, '07399' AS code, 'Phường Kép' AS name, 'Kép' AS short_name, 'Kep' AS name_en, '26610' AS postal_code, 'kep' AS slug
UNION ALL
       SELECT '24' AS province_code, '07420' AS code, 'Xã Mỹ Thái' AS name, 'Mỹ Thái' AS short_name, 'My Thai' AS name_en, '26622' AS postal_code, 'my_thai' AS slug
UNION ALL
       SELECT '24' AS province_code, '07432' AS code, 'Xã Tân Dĩnh' AS name, 'Tân Dĩnh' AS short_name, 'Tan Dinh' AS name_en, '26626' AS postal_code, 'tan_dinh' AS slug
UNION ALL
       SELECT '24' AS province_code, '07444' AS code, 'Phường Lục Nam' AS name, 'Lục Nam' AS short_name, 'Luc Nam' AS name_en, '26333' AS postal_code, 'luc_nam' AS slug
UNION ALL
       SELECT '24' AS province_code, '07450' AS code, 'Xã Đông Phú' AS name, 'Đông Phú' AS short_name, 'Dong Phu' AS name_en, '26310' AS postal_code, 'dong_phu' AS slug
UNION ALL
       SELECT '24' AS province_code, '07462' AS code, 'Xã Bảo Đài' AS name, 'Bảo Đài' AS short_name, 'Bao Dai' AS name_en, '26313' AS postal_code, 'bao_dai' AS slug
UNION ALL
       SELECT '24' AS province_code, '07486' AS code, 'Xã Nghĩa Phương' AS name, 'Nghĩa Phương' AS short_name, 'Nghia Phuong' AS name_en, '26327' AS postal_code, 'nghia_phuong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07489' AS code, 'Xã Trường Sơn' AS name, 'Trường Sơn' AS short_name, 'Truong Son' AS name_en, '26330' AS postal_code, 'truong_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07492' AS code, 'Xã Lục Sơn' AS name, 'Lục Sơn' AS short_name, 'Luc Son' AS name_en, '26332' AS postal_code, 'luc_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07498' AS code, 'Xã Bắc Lũng' AS name, 'Bắc Lũng' AS short_name, 'Bac Lung' AS name_en, '26322' AS postal_code, 'bac_lung' AS slug
UNION ALL
       SELECT '24' AS province_code, '07519' AS code, 'Xã Cẩm Lý' AS name, 'Cẩm Lý' AS short_name, 'Cam Ly' AS name_en, '26321' AS postal_code, 'cam_ly' AS slug
UNION ALL
       SELECT '24' AS province_code, '07525' AS code, 'Phường Chũ' AS name, 'Chũ' AS short_name, 'Chu' AS name_en, '26506' AS postal_code, 'chu' AS slug
UNION ALL
       SELECT '24' AS province_code, '07531' AS code, 'Xã Tân Sơn' AS name, 'Tân Sơn' AS short_name, 'Tan Son' AS name_en, '26517' AS postal_code, 'tan_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07534' AS code, 'Xã Sa Lý' AS name, 'Sa Lý' AS short_name, 'Sa Ly' AS name_en, '26514' AS postal_code, 'sa_ly' AS slug
UNION ALL
       SELECT '24' AS province_code, '07537' AS code, 'Xã Biên Sơn' AS name, 'Biên Sơn' AS short_name, 'Bien Son' AS name_en, '26521' AS postal_code, 'bien_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07543' AS code, 'Xã Sơn Hải' AS name, 'Sơn Hải' AS short_name, 'Son Hai' AS name_en, '26519' AS postal_code, 'son_hai' AS slug
UNION ALL
       SELECT '24' AS province_code, '07552' AS code, 'Xã Kiên Lao' AS name, 'Kiên Lao' AS short_name, 'Kien Lao' AS name_en, '26526' AS postal_code, 'kien_lao' AS slug
UNION ALL
       SELECT '24' AS province_code, '07573' AS code, 'Xã Biển Động' AS name, 'Biển Động' AS short_name, 'Bien Dong' AS name_en, '26512' AS postal_code, 'bien_dong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07582' AS code, 'Xã Lục Ngạn' AS name, 'Lục Ngạn' AS short_name, 'Luc Ngan' AS name_en, '26536' AS postal_code, 'luc_ngan' AS slug
UNION ALL
       SELECT '24' AS province_code, '07594' AS code, 'Xã Đèo Gia' AS name, 'Đèo Gia' AS short_name, 'Deo Gia' AS name_en, '26534' AS postal_code, 'deo_gia' AS slug
UNION ALL
       SELECT '24' AS province_code, '07603' AS code, 'Xã Nam Dương' AS name, 'Nam Dương' AS short_name, 'Nam Duong' AS name_en, '26529' AS postal_code, 'nam_duong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07612' AS code, 'Phường Phượng Sơn' AS name, 'Phượng Sơn' AS short_name, 'Phuong Son' AS name_en, '26531' AS postal_code, 'phuong_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07615' AS code, 'Xã Sơn Động' AS name, 'Sơn Động' AS short_name, 'Son Dong' AS name_en, '26429' AS postal_code, 'son_dong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07616' AS code, 'Xã Tây Yên Tử' AS name, 'Tây Yên Tử' AS short_name, 'Tay Yen Tu' AS name_en, '26427' AS postal_code, 'tay_yen_tu' AS slug
UNION ALL
       SELECT '24' AS province_code, '07621' AS code, 'Xã Vân Sơn' AS name, 'Vân Sơn' AS short_name, 'Van Son' AS name_en, '26410' AS postal_code, 'van_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07627' AS code, 'Xã Đại Sơn' AS name, 'Đại Sơn' AS short_name, 'Dai Son' AS name_en, '26414' AS postal_code, 'dai_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '07642' AS code, 'Xã Yên Định' AS name, 'Yên Định' AS short_name, 'Yen Dinh' AS name_en, '26418' AS postal_code, 'yen_dinh' AS slug
UNION ALL
       SELECT '24' AS province_code, '07654' AS code, 'Xã An Lạc' AS name, 'An Lạc' AS short_name, 'An Lac' AS name_en, '26421' AS postal_code, 'an_lac' AS slug
UNION ALL
       SELECT '24' AS province_code, '07663' AS code, 'Xã Tuấn Đạo' AS name, 'Tuấn Đạo' AS short_name, 'Tuan Dao' AS name_en, '26425' AS postal_code, 'tuan_dao' AS slug
UNION ALL
       SELECT '24' AS province_code, '07672' AS code, 'Xã Dương Hưu' AS name, 'Dương Hưu' AS short_name, 'Duong Huu' AS name_en, '26422' AS postal_code, 'duong_huu' AS slug
UNION ALL
       SELECT '24' AS province_code, '07681' AS code, 'Phường Yên Dũng' AS name, 'Yên Dũng' AS short_name, 'Yen Dung' AS name_en, '26227' AS postal_code, 'yen_dung' AS slug
UNION ALL
       SELECT '24' AS province_code, '07682' AS code, 'Phường Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '26215' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '24' AS province_code, '07696' AS code, 'Phường Tiền Phong' AS name, 'Tiền Phong' AS short_name, 'Tien Phong' AS name_en, '26219' AS postal_code, 'tien_phong' AS slug
UNION ALL
       SELECT '24' AS province_code, '07699' AS code, 'Phường Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '26117' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '24' AS province_code, '07735' AS code, 'Xã Đồng Việt' AS name, 'Đồng Việt' AS short_name, 'Dong Viet' AS name_en, '26226' AS postal_code, 'dong_viet' AS slug
UNION ALL
       SELECT '24' AS province_code, '07738' AS code, 'Phường Cảnh Thuỵ' AS name, 'Cảnh Thuỵ' AS short_name, 'Canh Thuy' AS name_en, '26207' AS postal_code, 'canh_thuy' AS slug
UNION ALL
       SELECT '24' AS province_code, '07774' AS code, 'Phường Tự Lạn' AS name, 'Tự Lạn' AS short_name, 'Tu Lan' AS name_en, '26162' AS postal_code, 'tu_lan' AS slug
UNION ALL
       SELECT '24' AS province_code, '07777' AS code, 'Phường Việt Yên' AS name, 'Việt Yên' AS short_name, 'Viet Yen' AS name_en, '26175' AS postal_code, 'viet_yen' AS slug
UNION ALL
       SELECT '24' AS province_code, '07795' AS code, 'Phường Nếnh' AS name, 'Nếnh' AS short_name, 'Nenh' AS name_en, '26169' AS postal_code, 'nenh' AS slug
UNION ALL
       SELECT '24' AS province_code, '07798' AS code, 'Phường Vân Hà' AS name, 'Vân Hà' AS short_name, 'Van Ha' AS name_en, '26166' AS postal_code, 'van_ha' AS slug
UNION ALL
       SELECT '24' AS province_code, '07822' AS code, 'Xã Hoàng Vân' AS name, 'Hoàng Vân' AS short_name, 'Hoang Van' AS name_en, '26912' AS postal_code, 'hoang_van' AS slug
UNION ALL
       SELECT '24' AS province_code, '07840' AS code, 'Phường Hiệp Hoà' AS name, 'Hiệp Hoà' AS short_name, 'Hiep Hoa' AS name_en, '26932' AS postal_code, 'hiep_hoa' AS slug
UNION ALL
       SELECT '24' AS province_code, '07864' AS code, 'Xã Hợp Thịnh' AS name, 'Hợp Thịnh' AS short_name, 'Hop Thinh' AS name_en, '26920' AS postal_code, 'hop_thinh' AS slug
UNION ALL
       SELECT '24' AS province_code, '07870' AS code, 'Xã Xuân Cẩm' AS name, 'Xuân Cẩm' AS short_name, 'Xuan Cam' AS name_en, '26924' AS postal_code, 'xuan_cam' AS slug
UNION ALL
       SELECT '24' AS province_code, '09169' AS code, 'Phường Vũ Ninh' AS name, 'Vũ Ninh' AS short_name, 'Vu Ninh' AS name_en, '16111' AS postal_code, 'vu_ninh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09187' AS code, 'Phường Kinh Bắc' AS name, 'Kinh Bắc' AS short_name, 'Kinh Bac' AS name_en, '16114' AS postal_code, 'kinh_bac' AS slug
UNION ALL
       SELECT '24' AS province_code, '09190' AS code, 'Phường Võ Cường' AS name, 'Võ Cường' AS short_name, 'Vo Cuong' AS name_en, '16118' AS postal_code, 'vo_cuong' AS slug
UNION ALL
       SELECT '24' AS province_code, '09193' AS code, 'Phường Yên Phong' AS name, 'Yên Phong' AS short_name, 'Yen Phong' AS name_en, '16220' AS postal_code, 'yen_phong' AS slug
UNION ALL
       SELECT '24' AS province_code, '09202' AS code, 'Xã Tam Giang' AS name, 'Tam Giang' AS short_name, 'Tam Giang' AS name_en, '16215' AS postal_code, 'tam_giang' AS slug
UNION ALL
       SELECT '24' AS province_code, '09205' AS code, 'Xã Yên Trung' AS name, 'Yên Trung' AS short_name, 'Yen Trung' AS name_en, '16213' AS postal_code, 'yen_trung' AS slug
UNION ALL
       SELECT '24' AS province_code, '09208' AS code, 'Xã Tam Đa' AS name, 'Tam Đa' AS short_name, 'Tam Da' AS name_en, '16211' AS postal_code, 'tam_da' AS slug
UNION ALL
       SELECT '24' AS province_code, '09238' AS code, 'Xã Văn Môn' AS name, 'Văn Môn' AS short_name, 'Van Mon' AS name_en, '16218' AS postal_code, 'van_mon' AS slug
UNION ALL
       SELECT '24' AS province_code, '09247' AS code, 'Phường Quế Võ' AS name, 'Quế Võ' AS short_name, 'Que Vo' AS name_en, '16827' AS postal_code, 'que_vo' AS slug
UNION ALL
       SELECT '24' AS province_code, '09253' AS code, 'Phường Nhân Hoà' AS name, 'Nhân Hoà' AS short_name, 'Nhan Hoa' AS name_en, '16811' AS postal_code, 'nhan_hoa' AS slug
UNION ALL
       SELECT '24' AS province_code, '09265' AS code, 'Phường Phương Liễu' AS name, 'Phương Liễu' AS short_name, 'Phuong Lieu' AS name_en, '16814' AS postal_code, 'phuong_lieu' AS slug
UNION ALL
       SELECT '24' AS province_code, '09286' AS code, 'Phường Nam Sơn' AS name, 'Nam Sơn' AS short_name, 'Nam Son' AS name_en, '16121' AS postal_code, 'nam_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '09292' AS code, 'Phường Phù Lãng' AS name, 'Phù Lãng' AS short_name, 'Phu Lang' AS name_en, '16826' AS postal_code, 'phu_lang' AS slug
UNION ALL
       SELECT '24' AS province_code, '09295' AS code, 'Phường Bồng Lai' AS name, 'Bồng Lai' AS short_name, 'Bong Lai' AS name_en, '16820' AS postal_code, 'bong_lai' AS slug
UNION ALL
       SELECT '24' AS province_code, '09301' AS code, 'Phường Đào Viên' AS name, 'Đào Viên' AS short_name, 'Dao Vien' AS name_en, '16822' AS postal_code, 'dao_vien' AS slug
UNION ALL
       SELECT '24' AS province_code, '09313' AS code, 'Phường Chi Lăng' AS name, 'Chi Lăng' AS short_name, 'Chi Lang' AS name_en, '16819' AS postal_code, 'chi_lang' AS slug
UNION ALL
       SELECT '24' AS province_code, '09319' AS code, 'Phường Tiên Du' AS name, 'Tiên Du' AS short_name, 'Tien Du' AS name_en, '16420' AS postal_code, 'tien_du' AS slug
UNION ALL
       SELECT '24' AS province_code, '09325' AS code, 'Phường Hạp Lĩnh' AS name, 'Hạp Lĩnh' AS short_name, 'Hap Linh' AS name_en, '16120' AS postal_code, 'hap_linh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09334' AS code, 'Xã Liên Bão' AS name, 'Liên Bão' AS short_name, 'Lien Bao' AS name_en, '16419' AS postal_code, 'lien_bao' AS slug
UNION ALL
       SELECT '24' AS province_code, '09340' AS code, 'Xã Đại Đồng' AS name, 'Đại Đồng' AS short_name, 'Dai Dong' AS name_en, '16410' AS postal_code, 'dai_dong' AS slug
UNION ALL
       SELECT '24' AS province_code, '09343' AS code, 'Xã Tân Chi' AS name, 'Tân Chi' AS short_name, 'Tan Chi' AS name_en, '16416' AS postal_code, 'tan_chi' AS slug
UNION ALL
       SELECT '24' AS province_code, '09349' AS code, 'Xã Phật Tích' AS name, 'Phật Tích' AS short_name, 'Phat Tich' AS name_en, '16413' AS postal_code, 'phat_tich' AS slug
UNION ALL
       SELECT '24' AS province_code, '09367' AS code, 'Phường Từ Sơn' AS name, 'Từ Sơn' AS short_name, 'Tu Son' AS name_en, '16318' AS postal_code, 'tu_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '09370' AS code, 'Phường Tam Sơn' AS name, 'Tam Sơn' AS short_name, 'Tam Son' AS name_en, '16309' AS postal_code, 'tam_son' AS slug
UNION ALL
       SELECT '24' AS province_code, '09379' AS code, 'Phường Phù Khê' AS name, 'Phù Khê' AS short_name, 'Phu Khe' AS name_en, '16312' AS postal_code, 'phu_khe' AS slug
UNION ALL
       SELECT '24' AS province_code, '09385' AS code, 'Phường Đồng Nguyên' AS name, 'Đồng Nguyên' AS short_name, 'Dong Nguyen' AS name_en, '16307' AS postal_code, 'dong_nguyen' AS slug
UNION ALL
       SELECT '24' AS province_code, '09400' AS code, 'Phường Thuận Thành' AS name, 'Thuận Thành' AS short_name, 'Thuan Thanh' AS name_en, '16524' AS postal_code, 'thuan_thanh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09409' AS code, 'Phường Mão Điền' AS name, 'Mão Điền' AS short_name, 'Mao Dien' AS name_en, '16522' AS postal_code, 'mao_dien' AS slug
UNION ALL
       SELECT '24' AS province_code, '09427' AS code, 'Phường Trí Quả' AS name, 'Trí Quả' AS short_name, 'Tri Qua' AS name_en, '16510' AS postal_code, 'tri_qua' AS slug
UNION ALL
       SELECT '24' AS province_code, '09430' AS code, 'Phường Trạm Lộ' AS name, 'Trạm Lộ' AS short_name, 'Tram Lo' AS name_en, '16520' AS postal_code, 'tram_lo' AS slug
UNION ALL
       SELECT '24' AS province_code, '09433' AS code, 'Phường Song Liễu' AS name, 'Song Liễu' AS short_name, 'Song Lieu' AS name_en, '16514' AS postal_code, 'song_lieu' AS slug
UNION ALL
       SELECT '24' AS province_code, '09445' AS code, 'Phường Ninh Xá' AS name, 'Ninh Xá' AS short_name, 'Ninh Xa' AS name_en, '16518' AS postal_code, 'ninh_xa' AS slug
UNION ALL
       SELECT '24' AS province_code, '09454' AS code, 'Phường Gia Bình' AS name, 'Gia Bình' AS short_name, 'Gia Binh' AS name_en, '16706' AS postal_code, 'gia_binh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09466' AS code, 'Xã Cao Đức' AS name, 'Cao Đức' AS short_name, 'Cao Duc' AS name_en, '16710' AS postal_code, 'cao_duc' AS slug
UNION ALL
       SELECT '24' AS province_code, '09469' AS code, 'Xã Đại Lai' AS name, 'Đại Lai' AS short_name, 'Dai Lai' AS name_en, '16713' AS postal_code, 'dai_lai' AS slug
UNION ALL
       SELECT '24' AS province_code, '09475' AS code, 'Phường Nhân Thắng' AS name, 'Nhân Thắng' AS short_name, 'Nhan Thang' AS name_en, '16708' AS postal_code, 'nhan_thang' AS slug
UNION ALL
       SELECT '24' AS province_code, '09487' AS code, 'Xã Đông Cứu' AS name, 'Đông Cứu' AS short_name, 'Dong Cuu' AS name_en, '16717' AS postal_code, 'dong_cuu' AS slug
UNION ALL
       SELECT '24' AS province_code, '09496' AS code, 'Phường Lương Tài' AS name, 'Lương Tài' AS short_name, 'Luong Tai' AS name_en, '16620' AS postal_code, 'luong_tai' AS slug
UNION ALL
       SELECT '24' AS province_code, '09499' AS code, 'Xã Trung Kênh' AS name, 'Trung Kênh' AS short_name, 'Trung Kenh' AS name_en, '16611' AS postal_code, 'trung_kenh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09523' AS code, 'Xã Trung Chính' AS name, 'Trung Chính' AS short_name, 'Trung Chinh' AS name_en, '16607' AS postal_code, 'trung_chinh' AS slug
UNION ALL
       SELECT '24' AS province_code, '09529' AS code, 'Xã Lâm Thao' AS name, 'Lâm Thao' AS short_name, 'Lam Thao' AS name_en, '16618' AS postal_code, 'lam_thao' AS slug
UNION ALL
       SELECT '25' AS province_code, '04792' AS code, 'Phường Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '36111' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '04795' AS code, 'Phường Hoà Bình' AS name, 'Hoà Bình' AS short_name, 'Hoa Binh' AS name_en, '36122' AS postal_code, 'hoa_binh' AS slug
UNION ALL
       SELECT '25' AS province_code, '04828' AS code, 'Phường Thống Nhất' AS name, 'Thống Nhất' AS short_name, 'Thong Nhat' AS name_en, '36118' AS postal_code, 'thong_nhat' AS slug
UNION ALL
       SELECT '25' AS province_code, '04831' AS code, 'Xã Đà Bắc' AS name, 'Đà Bắc' AS short_name, 'Da Bac' AS name_en, '36306' AS postal_code, 'da_bac' AS slug
UNION ALL
       SELECT '25' AS province_code, '04846' AS code, 'Xã Đức Nhàn' AS name, 'Đức Nhàn' AS short_name, 'Duc Nhan' AS name_en, '36326' AS postal_code, 'duc_nhan' AS slug
UNION ALL
       SELECT '25' AS province_code, '04849' AS code, 'Xã Tân Pheo' AS name, 'Tân Pheo' AS short_name, 'Tan Pheo' AS name_en, '36310' AS postal_code, 'tan_pheo' AS slug
UNION ALL
       SELECT '25' AS province_code, '04873' AS code, 'Xã Quy Đức' AS name, 'Quy Đức' AS short_name, 'Quy Duc' AS name_en, '36327' AS postal_code, 'quy_duc' AS slug
UNION ALL
       SELECT '25' AS province_code, '04876' AS code, 'Xã Cao Sơn' AS name, 'Cao Sơn' AS short_name, 'Cao Son' AS name_en, '36322' AS postal_code, 'cao_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '04891' AS code, 'Xã Tiền Phong' AS name, 'Tiền Phong' AS short_name, 'Tien Phong' AS name_en, '36321' AS postal_code, 'tien_phong' AS slug
UNION ALL
       SELECT '25' AS province_code, '04894' AS code, 'Phường Kỳ Sơn' AS name, 'Kỳ Sơn' AS short_name, 'Ky Son' AS name_en, '36121' AS postal_code, 'ky_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '04897' AS code, 'Xã Thịnh Minh' AS name, 'Thịnh Minh' AS short_name, 'Thinh Minh' AS name_en, '36127' AS postal_code, 'thinh_minh' AS slug
UNION ALL
       SELECT '25' AS province_code, '04924' AS code, 'Xã Lương Sơn' AS name, 'Lương Sơn' AS short_name, 'Luong Son' AS name_en, '36256' AS postal_code, 'luong_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '04960' AS code, 'Xã Liên Sơn' AS name, 'Liên Sơn' AS short_name, 'Lien Son' AS name_en, '36275' AS postal_code, 'lien_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '04978' AS code, 'Xã Kim Bôi' AS name, 'Kim Bôi' AS short_name, 'Kim Boi' AS name_en, '36925' AS postal_code, 'kim_boi' AS slug
UNION ALL
       SELECT '25' AS province_code, '04990' AS code, 'Xã Nật Sơn' AS name, 'Nật Sơn' AS short_name, 'Nat Son' AS name_en, '36937' AS postal_code, 'nat_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '05014' AS code, 'Xã Mường Động' AS name, 'Mường Động' AS short_name, 'Muong Dong' AS name_en, '36934' AS postal_code, 'muong_dong' AS slug
UNION ALL
       SELECT '25' AS province_code, '05047' AS code, 'Xã Cao Dương' AS name, 'Cao Dương' AS short_name, 'Cao Duong' AS name_en, '36272' AS postal_code, 'cao_duong' AS slug
UNION ALL
       SELECT '25' AS province_code, '05068' AS code, 'Xã Hợp Kim' AS name, 'Hợp Kim' AS short_name, 'Hop Kim' AS name_en, '36936' AS postal_code, 'hop_kim' AS slug
UNION ALL
       SELECT '25' AS province_code, '05086' AS code, 'Xã Dũng Tiến' AS name, 'Dũng Tiến' AS short_name, 'Dung Tien' AS name_en, '36935' AS postal_code, 'dung_tien' AS slug
UNION ALL
       SELECT '25' AS province_code, '05089' AS code, 'Xã Cao Phong' AS name, 'Cao Phong' AS short_name, 'Cao Phong' AS name_en, '36506' AS postal_code, 'cao_phong' AS slug
UNION ALL
       SELECT '25' AS province_code, '05092' AS code, 'Xã Thung Nai' AS name, 'Thung Nai' AS short_name, 'Thung Nai' AS name_en, '36511' AS postal_code, 'thung_nai' AS slug
UNION ALL
       SELECT '25' AS province_code, '05116' AS code, 'Xã Mường Thàng' AS name, 'Mường Thàng' AS short_name, 'Muong Thang' AS name_en, '36519' AS postal_code, 'muong_thang' AS slug
UNION ALL
       SELECT '25' AS province_code, '05128' AS code, 'Xã Tân Lạc' AS name, 'Tân Lạc' AS short_name, 'Tan Lac' AS name_en, '36580' AS postal_code, 'tan_lac' AS slug
UNION ALL
       SELECT '25' AS province_code, '05134' AS code, 'Xã Mường Hoa' AS name, 'Mường Hoa' AS short_name, 'Muong Hoa' AS name_en, '36583' AS postal_code, 'muong_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '05152' AS code, 'Xã Vân Sơn' AS name, 'Vân Sơn' AS short_name, 'Van Son' AS name_en, '36568' AS postal_code, 'van_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '05158' AS code, 'Xã Mường Bi' AS name, 'Mường Bi' AS short_name, 'Muong Bi' AS name_en, '36581' AS postal_code, 'muong_bi' AS slug
UNION ALL
       SELECT '25' AS province_code, '05191' AS code, 'Xã Toàn Thắng' AS name, 'Toàn Thắng' AS short_name, 'Toan Thang' AS name_en, '36582' AS postal_code, 'toan_thang' AS slug
UNION ALL
       SELECT '25' AS province_code, '05200' AS code, 'Xã Mai Châu' AS name, 'Mai Châu' AS short_name, 'Mai Chau' AS name_en, '36406' AS postal_code, 'mai_chau' AS slug
UNION ALL
       SELECT '25' AS province_code, '05206' AS code, 'Xã Tân Mai' AS name, 'Tân Mai' AS short_name, 'Tan Mai' AS name_en, '36429' AS postal_code, 'tan_mai' AS slug
UNION ALL
       SELECT '25' AS province_code, '05212' AS code, 'Xã Pà Cò' AS name, 'Pà Cò' AS short_name, 'Pa Co' AS name_en, '36414' AS postal_code, 'pa_co' AS slug
UNION ALL
       SELECT '25' AS province_code, '05245' AS code, 'Xã Bao La' AS name, 'Bao La' AS short_name, 'Bao La' AS name_en, '36418' AS postal_code, 'bao_la' AS slug
UNION ALL
       SELECT '25' AS province_code, '05251' AS code, 'Xã Mai Hạ' AS name, 'Mai Hạ' AS short_name, 'Mai Ha' AS name_en, '36423' AS postal_code, 'mai_ha' AS slug
UNION ALL
       SELECT '25' AS province_code, '05266' AS code, 'Xã Lạc Sơn' AS name, 'Lạc Sơn' AS short_name, 'Lac Son' AS name_en, '36635' AS postal_code, 'lac_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '05287' AS code, 'Xã Mường Vang' AS name, 'Mường Vang' AS short_name, 'Muong Vang' AS name_en, '36636' AS postal_code, 'muong_vang' AS slug
UNION ALL
       SELECT '25' AS province_code, '05290' AS code, 'Xã Nhân Nghĩa' AS name, 'Nhân Nghĩa' AS short_name, 'Nhan Nghia' AS name_en, '36615' AS postal_code, 'nhan_nghia' AS slug
UNION ALL
       SELECT '25' AS province_code, '05293' AS code, 'Xã Thượng Cốc' AS name, 'Thượng Cốc' AS short_name, 'Thuong Coc' AS name_en, '36618' AS postal_code, 'thuong_coc' AS slug
UNION ALL
       SELECT '25' AS province_code, '05305' AS code, 'Xã Yên Phú' AS name, 'Yên Phú' AS short_name, 'Yen Phu' AS name_en, '36607' AS postal_code, 'yen_phu' AS slug
UNION ALL
       SELECT '25' AS province_code, '05323' AS code, 'Xã Quyết Thắng' AS name, 'Quyết Thắng' AS short_name, 'Quyet Thang' AS name_en, '36619' AS postal_code, 'quyet_thang' AS slug
UNION ALL
       SELECT '25' AS province_code, '05329' AS code, 'Xã Ngọc Sơn' AS name, 'Ngọc Sơn' AS short_name, 'Ngoc Son' AS name_en, '36624' AS postal_code, 'ngoc_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '05347' AS code, 'Xã Đại Đồng' AS name, 'Đại Đồng' AS short_name, 'Dai Dong' AS name_en, '36637' AS postal_code, 'dai_dong' AS slug
UNION ALL
       SELECT '25' AS province_code, '05353' AS code, 'Xã Yên Thuỷ' AS name, 'Yên Thuỷ' AS short_name, 'Yen Thuy' AS name_en, '36719' AS postal_code, 'yen_thuy' AS slug
UNION ALL
       SELECT '25' AS province_code, '05362' AS code, 'Xã Lạc Lương' AS name, 'Lạc Lương' AS short_name, 'Lac Luong' AS name_en, '36711' AS postal_code, 'lac_luong' AS slug
UNION ALL
       SELECT '25' AS province_code, '05386' AS code, 'Xã Yên Trị' AS name, 'Yên Trị' AS short_name, 'Yen Tri' AS name_en, '36716' AS postal_code, 'yen_tri' AS slug
UNION ALL
       SELECT '25' AS province_code, '05392' AS code, 'Xã Lạc Thuỷ' AS name, 'Lạc Thuỷ' AS short_name, 'Lac Thuy' AS name_en, '36821' AS postal_code, 'lac_thuy' AS slug
UNION ALL
       SELECT '25' AS province_code, '05395' AS code, 'Xã An Nghĩa' AS name, 'An Nghĩa' AS short_name, 'An Nghia' AS name_en, '36822' AS postal_code, 'an_nghia' AS slug
UNION ALL
       SELECT '25' AS province_code, '05425' AS code, 'Xã An Bình' AS name, 'An Bình' AS short_name, 'An Binh' AS name_en, '36818' AS postal_code, 'an_binh' AS slug
UNION ALL
       SELECT '25' AS province_code, '07894' AS code, 'Phường Nông Trang' AS name, 'Nông Trang' AS short_name, 'Nong Trang' AS name_en, '35120' AS postal_code, 'nong_trang' AS slug
UNION ALL
       SELECT '25' AS province_code, '07900' AS code, 'Phường Việt Trì' AS name, 'Việt Trì' AS short_name, 'Viet Tri' AS name_en, '35129' AS postal_code, 'viet_tri' AS slug
UNION ALL
       SELECT '25' AS province_code, '07909' AS code, 'Phường Thanh Miếu' AS name, 'Thanh Miếu' AS short_name, 'Thanh Mieu' AS name_en, '35107' AS postal_code, 'thanh_mieu' AS slug
UNION ALL
       SELECT '25' AS province_code, '07918' AS code, 'Phường Vân Phú' AS name, 'Vân Phú' AS short_name, 'Van Phu' AS name_en, '35118' AS postal_code, 'van_phu' AS slug
UNION ALL
       SELECT '25' AS province_code, '07942' AS code, 'Phường Phú Thọ' AS name, 'Phú Thọ' AS short_name, 'Phu Tho' AS name_en, '35916' AS postal_code, 'phu_tho' AS slug
UNION ALL
       SELECT '25' AS province_code, '07948' AS code, 'Phường Âu Cơ' AS name, 'Âu Cơ' AS short_name, 'Au Co' AS name_en, '35906' AS postal_code, 'au_co' AS slug
UNION ALL
       SELECT '25' AS province_code, '07954' AS code, 'Phường Phong Châu' AS name, 'Phong Châu' AS short_name, 'Phong Chau' AS name_en, '35907' AS postal_code, 'phong_chau' AS slug
UNION ALL
       SELECT '25' AS province_code, '07969' AS code, 'Xã Đoan Hùng' AS name, 'Đoan Hùng' AS short_name, 'Doan Hung' AS name_en, '35306' AS postal_code, 'doan_hung' AS slug
UNION ALL
       SELECT '25' AS province_code, '07996' AS code, 'Xã Bằng Luân' AS name, 'Bằng Luân' AS short_name, 'Bang Luan' AS name_en, '35313' AS postal_code, 'bang_luan' AS slug
UNION ALL
       SELECT '25' AS province_code, '07999' AS code, 'Xã Chí Đám' AS name, 'Chí Đám' AS short_name, 'Chi Dam' AS name_en, '35308' AS postal_code, 'chi_dam' AS slug
UNION ALL
       SELECT '25' AS province_code, '08023' AS code, 'Xã Tây Cốc' AS name, 'Tây Cốc' AS short_name, 'Tay Coc' AS name_en, '35319' AS postal_code, 'tay_coc' AS slug
UNION ALL
       SELECT '25' AS province_code, '08038' AS code, 'Xã Chân Mộng' AS name, 'Chân Mộng' AS short_name, 'Chan Mong' AS name_en, '35331' AS postal_code, 'chan_mong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08053' AS code, 'Xã Hạ Hoà' AS name, 'Hạ Hoà' AS short_name, 'Ha Hoa' AS name_en, '35406' AS postal_code, 'ha_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08071' AS code, 'Xã Đan Thượng' AS name, 'Đan Thượng' AS short_name, 'Dan Thuong' AS name_en, '35414' AS postal_code, 'dan_thuong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08110' AS code, 'Xã Hiền Lương' AS name, 'Hiền Lương' AS short_name, 'Hien Luong' AS name_en, '35420' AS postal_code, 'hien_luong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08113' AS code, 'Xã Yên Kỳ' AS name, 'Yên Kỳ' AS short_name, 'Yen Ky' AS name_en, '35436' AS postal_code, 'yen_ky' AS slug
UNION ALL
       SELECT '25' AS province_code, '08134' AS code, 'Xã Văn Lang' AS name, 'Văn Lang' AS short_name, 'Van Lang' AS name_en, '35426' AS postal_code, 'van_lang' AS slug
UNION ALL
       SELECT '25' AS province_code, '08143' AS code, 'Xã Vĩnh Chân' AS name, 'Vĩnh Chân' AS short_name, 'Vinh Chan' AS name_en, '35429' AS postal_code, 'vinh_chan' AS slug
UNION ALL
       SELECT '25' AS province_code, '08152' AS code, 'Xã Thanh Ba' AS name, 'Thanh Ba' AS short_name, 'Thanh Ba' AS name_en, '35706' AS postal_code, 'thanh_ba' AS slug
UNION ALL
       SELECT '25' AS province_code, '08173' AS code, 'Xã Quảng Yên' AS name, 'Quảng Yên' AS short_name, 'Quang Yen' AS name_en, '35707' AS postal_code, 'quang_yen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08203' AS code, 'Xã Hoàng Cương' AS name, 'Hoàng Cương' AS short_name, 'Hoang Cuong' AS name_en, '35720' AS postal_code, 'hoang_cuong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08209' AS code, 'Xã Đông Thành' AS name, 'Đông Thành' AS short_name, 'Dong Thanh' AS name_en, '35727' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '25' AS province_code, '08218' AS code, 'Xã Chí Tiên' AS name, 'Chí Tiên' AS short_name, 'Chi Tien' AS name_en, '35721' AS postal_code, 'chi_tien' AS slug
UNION ALL
       SELECT '25' AS province_code, '08227' AS code, 'Xã Liên Minh' AS name, 'Liên Minh' AS short_name, 'Lien Minh' AS name_en, '35733' AS postal_code, 'lien_minh' AS slug
UNION ALL
       SELECT '25' AS province_code, '08230' AS code, 'Xã Phù Ninh' AS name, 'Phù Ninh' AS short_name, 'Phu Ninh' AS name_en, '35220' AS postal_code, 'phu_ninh' AS slug
UNION ALL
       SELECT '25' AS province_code, '08236' AS code, 'Xã Phú Mỹ' AS name, 'Phú Mỹ' AS short_name, 'Phu My' AS name_en, '35214' AS postal_code, 'phu_my' AS slug
UNION ALL
       SELECT '25' AS province_code, '08245' AS code, 'Xã Trạm Thản' AS name, 'Trạm Thản' AS short_name, 'Tram Than' AS name_en, '35216' AS postal_code, 'tram_than' AS slug
UNION ALL
       SELECT '25' AS province_code, '08254' AS code, 'Xã Dân Chủ' AS name, 'Dân Chủ' AS short_name, 'Dan Chu' AS name_en, '35225' AS postal_code, 'dan_chu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08275' AS code, 'Xã Bình Phú' AS name, 'Bình Phú' AS short_name, 'Binh Phu' AS name_en, '35222' AS postal_code, 'binh_phu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08290' AS code, 'Xã Yên Lập' AS name, 'Yên Lập' AS short_name, 'Yen Lap' AS name_en, '35506' AS postal_code, 'yen_lap' AS slug
UNION ALL
       SELECT '25' AS province_code, '08296' AS code, 'Xã Sơn Lương' AS name, 'Sơn Lương' AS short_name, 'Son Luong' AS name_en, '35523' AS postal_code, 'son_luong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08305' AS code, 'Xã Xuân Viên' AS name, 'Xuân Viên' AS short_name, 'Xuan Vien' AS name_en, '35509' AS postal_code, 'xuan_vien' AS slug
UNION ALL
       SELECT '25' AS province_code, '08311' AS code, 'Xã Trung Sơn' AS name, 'Trung Sơn' AS short_name, 'Trung Son' AS name_en, '35514' AS postal_code, 'trung_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '08323' AS code, 'Xã Thượng Long' AS name, 'Thượng Long' AS short_name, 'Thuong Long' AS name_en, '35516' AS postal_code, 'thuong_long' AS slug
UNION ALL
       SELECT '25' AS province_code, '08338' AS code, 'Xã Minh Hoà' AS name, 'Minh Hoà' AS short_name, 'Minh Hoa' AS name_en, '35521' AS postal_code, 'minh_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08341' AS code, 'Xã Cẩm Khê' AS name, 'Cẩm Khê' AS short_name, 'Cam Khe' AS name_en, '35606' AS postal_code, 'cam_khe' AS slug
UNION ALL
       SELECT '25' AS province_code, '08344' AS code, 'Xã Tiên Lương' AS name, 'Tiên Lương' AS short_name, 'Tien Luong' AS name_en, '35614' AS postal_code, 'tien_luong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08377' AS code, 'Xã Vân Bán' AS name, 'Vân Bán' AS short_name, 'Van Ban' AS name_en, '35618' AS postal_code, 'van_ban' AS slug
UNION ALL
       SELECT '25' AS province_code, '08398' AS code, 'Xã Phú Khê' AS name, 'Phú Khê' AS short_name, 'Phu Khe' AS name_en, '35623' AS postal_code, 'phu_khe' AS slug
UNION ALL
       SELECT '25' AS province_code, '08416' AS code, 'Xã Hùng Việt' AS name, 'Hùng Việt' AS short_name, 'Hung Viet' AS name_en, '35632' AS postal_code, 'hung_viet' AS slug
UNION ALL
       SELECT '25' AS province_code, '08431' AS code, 'Xã Đồng Lương' AS name, 'Đồng Lương' AS short_name, 'Dong Luong' AS name_en, '35630' AS postal_code, 'dong_luong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08434' AS code, 'Xã Tam Nông' AS name, 'Tam Nông' AS short_name, 'Tam Nong' AS name_en, '35976' AS postal_code, 'tam_nong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08443' AS code, 'Xã Hiền Quan' AS name, 'Hiền Quan' AS short_name, 'Hien Quan' AS name_en, '35962' AS postal_code, 'hien_quan' AS slug
UNION ALL
       SELECT '25' AS province_code, '08467' AS code, 'Xã Vạn Xuân' AS name, 'Vạn Xuân' AS short_name, 'Van Xuan' AS name_en, '35958' AS postal_code, 'van_xuan' AS slug
UNION ALL
       SELECT '25' AS province_code, '08479' AS code, 'Xã Thọ Văn' AS name, 'Thọ Văn' AS short_name, 'Tho Van' AS name_en, '35971' AS postal_code, 'tho_van' AS slug
UNION ALL
       SELECT '25' AS province_code, '08494' AS code, 'Xã Lâm Thao' AS name, 'Lâm Thao' AS short_name, 'Lam Thao' AS name_en, '35256' AS postal_code, 'lam_thao' AS slug
UNION ALL
       SELECT '25' AS province_code, '08500' AS code, 'Xã Xuân Lũng' AS name, 'Xuân Lũng' AS short_name, 'Xuan Lung' AS name_en, '35260' AS postal_code, 'xuan_lung' AS slug
UNION ALL
       SELECT '25' AS province_code, '08515' AS code, 'Xã Hy Cương' AS name, 'Hy Cương' AS short_name, 'Hy Cuong' AS name_en, '35114' AS postal_code, 'hy_cuong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08521' AS code, 'Xã Phùng Nguyên' AS name, 'Phùng Nguyên' AS short_name, 'Phung Nguyen' AS name_en, '35262' AS postal_code, 'phung_nguyen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08527' AS code, 'Xã Bản Nguyên' AS name, 'Bản Nguyên' AS short_name, 'Ban Nguyen' AS name_en, '35266' AS postal_code, 'ban_nguyen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08542' AS code, 'Xã Thanh Sơn' AS name, 'Thanh Sơn' AS short_name, 'Thanh Son' AS name_en, '35806' AS postal_code, 'thanh_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '08545' AS code, 'Xã Thu Cúc' AS name, 'Thu Cúc' AS short_name, 'Thu Cuc' AS name_en, '35559' AS postal_code, 'thu_cuc' AS slug
UNION ALL
       SELECT '25' AS province_code, '08560' AS code, 'Xã Lai Đồng' AS name, 'Lai Đồng' AS short_name, 'Lai Dong' AS name_en, '35561' AS postal_code, 'lai_dong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08566' AS code, 'Xã Tân Sơn' AS name, 'Tân Sơn' AS short_name, 'Tan Son' AS name_en, '35573' AS postal_code, 'tan_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '08584' AS code, 'Xã Võ Miếu' AS name, 'Võ Miếu' AS short_name, 'Vo Mieu' AS name_en, '35810' AS postal_code, 'vo_mieu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08590' AS code, 'Xã Xuân Đài' AS name, 'Xuân Đài' AS short_name, 'Xuan Dai' AS name_en, '35564' AS postal_code, 'xuan_dai' AS slug
UNION ALL
       SELECT '25' AS province_code, '08593' AS code, 'Xã Minh Đài' AS name, 'Minh Đài' AS short_name, 'Minh Dai' AS name_en, '35571' AS postal_code, 'minh_dai' AS slug
UNION ALL
       SELECT '25' AS province_code, '08611' AS code, 'Xã Văn Miếu' AS name, 'Văn Miếu' AS short_name, 'Van Mieu' AS name_en, '35812' AS postal_code, 'van_mieu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08614' AS code, 'Xã Cự Đồng' AS name, 'Cự Đồng' AS short_name, 'Cu Dong' AS name_en, '35825' AS postal_code, 'cu_dong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08620' AS code, 'Xã Long Cốc' AS name, 'Long Cốc' AS short_name, 'Long Coc' AS name_en, '35569' AS postal_code, 'long_coc' AS slug
UNION ALL
       SELECT '25' AS province_code, '08632' AS code, 'Xã Hương Cần' AS name, 'Hương Cần' AS short_name, 'Huong Can' AS name_en, '35823' AS postal_code, 'huong_can' AS slug
UNION ALL
       SELECT '25' AS province_code, '08635' AS code, 'Xã Khả Cửu' AS name, 'Khả Cửu' AS short_name, 'Kha Cuu' AS name_en, '35814' AS postal_code, 'kha_cuu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08656' AS code, 'Xã Yên Sơn' AS name, 'Yên Sơn' AS short_name, 'Yen Son' AS name_en, '35819' AS postal_code, 'yen_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '08662' AS code, 'Xã Đào Xá' AS name, 'Đào Xá' AS short_name, 'Dao Xa' AS name_en, '35860' AS postal_code, 'dao_xa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08674' AS code, 'Xã Thanh Thuỷ' AS name, 'Thanh Thuỷ' AS short_name, 'Thanh Thuy' AS name_en, '35856' AS postal_code, 'thanh_thuy' AS slug
UNION ALL
       SELECT '25' AS province_code, '08686' AS code, 'Xã Tu Vũ' AS name, 'Tu Vũ' AS short_name, 'Tu Vu' AS name_en, '35867' AS postal_code, 'tu_vu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08707' AS code, 'Phường Vĩnh Yên' AS name, 'Vĩnh Yên' AS short_name, 'Vinh Yen' AS name_en, '15116' AS postal_code, 'vinh_yen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08716' AS code, 'Phường Vĩnh Phúc' AS name, 'Vĩnh Phúc' AS short_name, 'Vinh Phuc' AS name_en, '15115' AS postal_code, 'vinh_phuc' AS slug
UNION ALL
       SELECT '25' AS province_code, '08740' AS code, 'Phường Phúc Yên' AS name, 'Phúc Yên' AS short_name, 'Phuc Yen' AS name_en, '15916' AS postal_code, 'phuc_yen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08746' AS code, 'Phường Xuân Hoà' AS name, 'Xuân Hoà' AS short_name, 'Xuan Hoa' AS name_en, '15910' AS postal_code, 'xuan_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08761' AS code, 'Xã Lập Thạch' AS name, 'Lập Thạch' AS short_name, 'Lap Thach' AS name_en, '15406' AS postal_code, 'lap_thach' AS slug
UNION ALL
       SELECT '25' AS province_code, '08770' AS code, 'Xã Hợp Lý' AS name, 'Hợp Lý' AS short_name, 'Hop Ly' AS name_en, '15414' AS postal_code, 'hop_ly' AS slug
UNION ALL
       SELECT '25' AS province_code, '08773' AS code, 'Xã Yên Lãng' AS name, 'Yên Lãng' AS short_name, 'Yen Lang' AS name_en, '15524' AS postal_code, 'yen_lang' AS slug
UNION ALL
       SELECT '25' AS province_code, '08782' AS code, 'Xã Hải Lựu' AS name, 'Hải Lựu' AS short_name, 'Hai Luu' AS name_en, '15512' AS postal_code, 'hai_luu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08788' AS code, 'Xã Thái Hoà' AS name, 'Thái Hoà' AS short_name, 'Thai Hoa' AS name_en, '15412' AS postal_code, 'thai_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08812' AS code, 'Xã Liên Hoà' AS name, 'Liên Hoà' AS short_name, 'Lien Hoa' AS name_en, '15409' AS postal_code, 'lien_hoa' AS slug
UNION ALL
       SELECT '25' AS province_code, '08824' AS code, 'Xã Tam Sơn' AS name, 'Tam Sơn' AS short_name, 'Tam Son' AS name_en, '15506' AS postal_code, 'tam_son' AS slug
UNION ALL
       SELECT '25' AS province_code, '08842' AS code, 'Xã Tiên Lữ' AS name, 'Tiên Lữ' AS short_name, 'Tien Lu' AS name_en, '15424' AS postal_code, 'tien_lu' AS slug
UNION ALL
       SELECT '25' AS province_code, '08848' AS code, 'Xã Sông Lô' AS name, 'Sông Lô' AS short_name, 'Song Lo' AS name_en, '15523' AS postal_code, 'song_lo' AS slug
UNION ALL
       SELECT '25' AS province_code, '08866' AS code, 'Xã Sơn Đông' AS name, 'Sơn Đông' AS short_name, 'Son Dong' AS name_en, '15421' AS postal_code, 'son_dong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08869' AS code, 'Xã Tam Dương' AS name, 'Tam Dương' AS short_name, 'Tam Duong' AS name_en, '15219' AS postal_code, 'tam_duong' AS slug
UNION ALL
       SELECT '25' AS province_code, '08872' AS code, 'Xã Tam Dương Bắc' AS name, 'Tam Dương Bắc' AS short_name, 'Tam Duong Bac' AS name_en, '15221' AS postal_code, 'tam_duong_bac' AS slug
UNION ALL
       SELECT '25' AS province_code, '08896' AS code, 'Xã Hoàng An' AS name, 'Hoàng An' AS short_name, 'Hoang An' AS name_en, '15220' AS postal_code, 'hoang_an' AS slug
UNION ALL
       SELECT '25' AS province_code, '08905' AS code, 'Xã Hội Thịnh' AS name, 'Hội Thịnh' AS short_name, 'Hoi Thinh' AS name_en, '15214' AS postal_code, 'hoi_thinh' AS slug
UNION ALL
       SELECT '25' AS province_code, '08911' AS code, 'Xã Tam Đảo' AS name, 'Tam Đảo' AS short_name, 'Tam Dao' AS name_en, '15313' AS postal_code, 'tam_dao' AS slug
UNION ALL
       SELECT '25' AS province_code, '08914' AS code, 'Xã Đạo Trù' AS name, 'Đạo Trù' AS short_name, 'Dao Tru' AS name_en, '15309' AS postal_code, 'dao_tru' AS slug
UNION ALL
       SELECT '25' AS province_code, '08923' AS code, 'Xã Đại Đình' AS name, 'Đại Đình' AS short_name, 'Dai Dinh' AS name_en, '15308' AS postal_code, 'dai_dinh' AS slug
UNION ALL
       SELECT '25' AS province_code, '08935' AS code, 'Xã Bình Nguyên' AS name, 'Bình Nguyên' AS short_name, 'Binh Nguyen' AS name_en, '15820' AS postal_code, 'binh_nguyen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08944' AS code, 'Xã Bình Tuyền' AS name, 'Bình Tuyền' AS short_name, 'Binh Tuyen' AS name_en, '15822' AS postal_code, 'binh_tuyen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08950' AS code, 'Xã Bình Xuyên' AS name, 'Bình Xuyên' AS short_name, 'Binh Xuyen' AS name_en, '15819' AS postal_code, 'binh_xuyen' AS slug
UNION ALL
       SELECT '25' AS province_code, '08971' AS code, 'Xã Xuân Lãng' AS name, 'Xuân Lãng' AS short_name, 'Xuan Lang' AS name_en, '15821' AS postal_code, 'xuan_lang' AS slug
UNION ALL
       SELECT '25' AS province_code, '09025' AS code, 'Xã Yên Lạc' AS name, 'Yên Lạc' AS short_name, 'Yen Lac' AS name_en, '15706' AS postal_code, 'yen_lac' AS slug
UNION ALL
       SELECT '25' AS province_code, '09040' AS code, 'Xã Tề Lỗ' AS name, 'Tề Lỗ' AS short_name, 'Te Lo' AS name_en, '15711' AS postal_code, 'te_lo' AS slug
UNION ALL
       SELECT '25' AS province_code, '09043' AS code, 'Xã Tam Hồng' AS name, 'Tam Hồng' AS short_name, 'Tam Hong' AS name_en, '15712' AS postal_code, 'tam_hong' AS slug
UNION ALL
       SELECT '25' AS province_code, '09052' AS code, 'Xã Nguyệt Đức' AS name, 'Nguyệt Đức' AS short_name, 'Nguyet Duc' AS name_en, '15722' AS postal_code, 'nguyet_duc' AS slug
UNION ALL
       SELECT '25' AS province_code, '09064' AS code, 'Xã Liên Châu' AS name, 'Liên Châu' AS short_name, 'Lien Chau' AS name_en, '15715' AS postal_code, 'lien_chau' AS slug
UNION ALL
       SELECT '25' AS province_code, '09076' AS code, 'Xã Vĩnh Tường' AS name, 'Vĩnh Tường' AS short_name, 'Vinh Tuong' AS name_en, '15606' AS postal_code, 'vinh_tuong' AS slug
UNION ALL
       SELECT '25' AS province_code, '09079' AS code, 'Xã Vĩnh An' AS name, 'Vĩnh An' AS short_name, 'Vinh An' AS name_en, '15636' AS postal_code, 'vinh_an' AS slug
UNION ALL
       SELECT '25' AS province_code, '09100' AS code, 'Xã Vĩnh Hưng' AS name, 'Vĩnh Hưng' AS short_name, 'Vinh Hung' AS name_en, '15635' AS postal_code, 'vinh_hung' AS slug
UNION ALL
       SELECT '25' AS province_code, '09106' AS code, 'Xã Vĩnh Thành' AS name, 'Vĩnh Thành' AS short_name, 'Vinh Thanh' AS name_en, '15637' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '25' AS province_code, '09112' AS code, 'Xã Thổ Tang' AS name, 'Thổ Tang' AS short_name, 'Tho Tang' AS name_en, '15612' AS postal_code, 'tho_tang' AS slug
UNION ALL
       SELECT '25' AS province_code, '09154' AS code, 'Xã Vĩnh Phú' AS name, 'Vĩnh Phú' AS short_name, 'Vinh Phu' AS name_en, '15631' AS postal_code, 'vinh_phu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10507' AS code, 'Phường Thành Đông' AS name, 'Thành Đông' AS short_name, 'Thanh Dong' AS name_en, '03128' AS postal_code, 'thanh_dong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10525' AS code, 'Phường Hải Dương' AS name, 'Hải Dương' AS short_name, 'Hai Duong' AS name_en, '03127' AS postal_code, 'hai_duong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10532' AS code, 'Phường Lê Thanh Nghị' AS name, 'Lê Thanh Nghị' AS short_name, 'Le Thanh Nghi' AS name_en, '03112' AS postal_code, 'le_thanh_nghi' AS slug
UNION ALL
       SELECT '31' AS province_code, '10537' AS code, 'Phường Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '03120' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '31' AS province_code, '10543' AS code, 'Phường Việt Hoà' AS name, 'Việt Hoà' AS short_name, 'Viet Hoa' AS name_en, '03125' AS postal_code, 'viet_hoa' AS slug
UNION ALL
       SELECT '31' AS province_code, '10546' AS code, 'Phường Chí Linh' AS name, 'Chí Linh' AS short_name, 'Chi Linh' AS name_en, '03527' AS postal_code, 'chi_linh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10549' AS code, 'Phường Chu Văn An' AS name, 'Chu Văn An' AS short_name, 'Chu Van An' AS name_en, '03526' AS postal_code, 'chu_van_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '10552' AS code, 'Phường Nguyễn Trãi' AS name, 'Nguyễn Trãi' AS short_name, 'Nguyen Trai' AS name_en, '03529' AS postal_code, 'nguyen_trai' AS slug
UNION ALL
       SELECT '31' AS province_code, '10570' AS code, 'Phường Trần Hưng Đạo' AS name, 'Trần Hưng Đạo' AS short_name, 'Tran Hung Dao' AS name_en, '03528' AS postal_code, 'tran_hung_dao' AS slug
UNION ALL
       SELECT '31' AS province_code, '10573' AS code, 'Phường Trần Nhân Tông' AS name, 'Trần Nhân Tông' AS short_name, 'Tran Nhan Tong' AS name_en, '03530' AS postal_code, 'tran_nhan_tong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10603' AS code, 'Phường Lê Đại Hành' AS name, 'Lê Đại Hành' AS short_name, 'Le Dai Hanh' AS name_en, '03531' AS postal_code, 'le_dai_hanh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10606' AS code, 'Xã Nam Sách' AS name, 'Nam Sách' AS short_name, 'Nam Sach' AS name_en, '03556' AS postal_code, 'nam_sach' AS slug
UNION ALL
       SELECT '31' AS province_code, '10615' AS code, 'Xã Hợp Tiến' AS name, 'Hợp Tiến' AS short_name, 'Hop Tien' AS name_en, '03564' AS postal_code, 'hop_tien' AS slug
UNION ALL
       SELECT '31' AS province_code, '10633' AS code, 'Xã Trần Phú' AS name, 'Trần Phú' AS short_name, 'Tran Phu' AS name_en, '03566' AS postal_code, 'tran_phu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10642' AS code, 'Xã Thái Tân' AS name, 'Thái Tân' AS short_name, 'Thai Tan' AS name_en, '03570' AS postal_code, 'thai_tan' AS slug
UNION ALL
       SELECT '31' AS province_code, '10645' AS code, 'Xã An Phú' AS name, 'An Phú' AS short_name, 'An Phu' AS name_en, '03557' AS postal_code, 'an_phu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10660' AS code, 'Phường Ái Quốc' AS name, 'Ái Quốc' AS short_name, 'Ai Quoc' AS name_en, '03122' AS postal_code, 'ai_quoc' AS slug
UNION ALL
       SELECT '31' AS province_code, '10675' AS code, 'Phường Kinh Môn' AS name, 'Kinh Môn' AS short_name, 'Kinh Mon' AS name_en, '03431' AS postal_code, 'kinh_mon' AS slug
UNION ALL
       SELECT '31' AS province_code, '10678' AS code, 'Phường Bắc An Phụ' AS name, 'Bắc An Phụ' AS short_name, 'Bac An Phu' AS name_en, '03434' AS postal_code, 'bac_an_phu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10705' AS code, 'Xã Nam An Phụ' AS name, 'Nam An Phụ' AS short_name, 'Nam An Phu' AS name_en, '03437' AS postal_code, 'nam_an_phu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10714' AS code, 'Phường Nhị Chiểu' AS name, 'Nhị Chiểu' AS short_name, 'Nhi Chieu' AS name_en, '03436' AS postal_code, 'nhi_chieu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10726' AS code, 'Phường Phạm Sư Mạnh' AS name, 'Phạm Sư Mạnh' AS short_name, 'Pham Su Manh' AS name_en, '03435' AS postal_code, 'pham_su_manh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10729' AS code, 'Phường Trần Liễu' AS name, 'Trần Liễu' AS short_name, 'Tran Lieu' AS name_en, '03433' AS postal_code, 'tran_lieu' AS slug
UNION ALL
       SELECT '31' AS province_code, '10744' AS code, 'Phường Nguyễn Đại Năng' AS name, 'Nguyễn Đại Năng' AS short_name, 'Nguyen Dai Nang' AS name_en, '03432' AS postal_code, 'nguyen_dai_nang' AS slug
UNION ALL
       SELECT '31' AS province_code, '10750' AS code, 'Xã Phú Thái' AS name, 'Phú Thái' AS short_name, 'Phu Thai' AS name_en, '03306' AS postal_code, 'phu_thai' AS slug
UNION ALL
       SELECT '31' AS province_code, '10756' AS code, 'Xã Lai Khê' AS name, 'Lai Khê' AS short_name, 'Lai Khe' AS name_en, '03312' AS postal_code, 'lai_khe' AS slug
UNION ALL
       SELECT '31' AS province_code, '10792' AS code, 'Xã An Thành' AS name, 'An Thành' AS short_name, 'An Thanh' AS name_en, '03327' AS postal_code, 'an_thanh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10804' AS code, 'Xã Kim Thành' AS name, 'Kim Thành' AS short_name, 'Kim Thanh' AS name_en, '03328' AS postal_code, 'kim_thanh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10813' AS code, 'Xã Thanh Hà' AS name, 'Thanh Hà' AS short_name, 'Thanh Ha' AS name_en, '03206' AS postal_code, 'thanh_ha' AS slug
UNION ALL
       SELECT '31' AS province_code, '10816' AS code, 'Xã Hà Bắc' AS name, 'Hà Bắc' AS short_name, 'Ha Bac' AS name_en, '03232' AS postal_code, 'ha_bac' AS slug
UNION ALL
       SELECT '31' AS province_code, '10837' AS code, 'Phường Nam Đồng' AS name, 'Nam Đồng' AS short_name, 'Nam Dong' AS name_en, '03121' AS postal_code, 'nam_dong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10843' AS code, 'Xã Hà Nam' AS name, 'Hà Nam' AS short_name, 'Ha Nam' AS name_en, '03233' AS postal_code, 'ha_nam' AS slug
UNION ALL
       SELECT '31' AS province_code, '10846' AS code, 'Xã Hà Tây' AS name, 'Hà Tây' AS short_name, 'Ha Tay' AS name_en, '03231' AS postal_code, 'ha_tay' AS slug
UNION ALL
       SELECT '31' AS province_code, '10882' AS code, 'Xã Hà Đông' AS name, 'Hà Đông' AS short_name, 'Ha Dong' AS name_en, '03234' AS postal_code, 'ha_dong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10888' AS code, 'Xã Cẩm Giang' AS name, 'Cẩm Giang' AS short_name, 'Cam Giang' AS name_en, '03606' AS postal_code, 'cam_giang' AS slug
UNION ALL
       SELECT '31' AS province_code, '10891' AS code, 'Phường Tứ Minh' AS name, 'Tứ Minh' AS short_name, 'Tu Minh' AS name_en, '03126' AS postal_code, 'tu_minh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10903' AS code, 'Xã Cẩm Giàng' AS name, 'Cẩm Giàng' AS short_name, 'Cam Giang' AS name_en, '03626' AS postal_code, 'cam_giang' AS slug
UNION ALL
       SELECT '31' AS province_code, '10909' AS code, 'Xã Tuệ Tĩnh' AS name, 'Tuệ Tĩnh' AS short_name, 'Tue Tinh' AS name_en, '03627' AS postal_code, 'tue_tinh' AS slug
UNION ALL
       SELECT '31' AS province_code, '10930' AS code, 'Xã Mao Điền' AS name, 'Mao Điền' AS short_name, 'Mao Dien' AS name_en, '03625' AS postal_code, 'mao_dien' AS slug
UNION ALL
       SELECT '31' AS province_code, '10945' AS code, 'Xã Kẻ Sặt' AS name, 'Kẻ Sặt' AS short_name, 'Ke Sat' AS name_en, '03706' AS postal_code, 'ke_sat' AS slug
UNION ALL
       SELECT '31' AS province_code, '10966' AS code, 'Xã Bình Giang' AS name, 'Bình Giang' AS short_name, 'Binh Giang' AS name_en, '03724' AS postal_code, 'binh_giang' AS slug
UNION ALL
       SELECT '31' AS province_code, '10972' AS code, 'Xã Đường An' AS name, 'Đường An' AS short_name, 'Duong An' AS name_en, '03725' AS postal_code, 'duong_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '10993' AS code, 'Xã Thượng Hồng' AS name, 'Thượng Hồng' AS short_name, 'Thuong Hong' AS name_en, '03726' AS postal_code, 'thuong_hong' AS slug
UNION ALL
       SELECT '31' AS province_code, '10999' AS code, 'Xã Gia Lộc' AS name, 'Gia Lộc' AS short_name, 'Gia Loc' AS name_en, '03656' AS postal_code, 'gia_loc' AS slug
UNION ALL
       SELECT '31' AS province_code, '11002' AS code, 'Phường Thạch Khôi' AS name, 'Thạch Khôi' AS short_name, 'Thach Khoi' AS name_en, '03119' AS postal_code, 'thach_khoi' AS slug
UNION ALL
       SELECT '31' AS province_code, '11020' AS code, 'Xã Yết Kiêu' AS name, 'Yết Kiêu' AS short_name, 'Yet Kieu' AS name_en, '03665' AS postal_code, 'yet_kieu' AS slug
UNION ALL
       SELECT '31' AS province_code, '11050' AS code, 'Xã Gia Phúc' AS name, 'Gia Phúc' AS short_name, 'Gia Phuc' AS name_en, '03657' AS postal_code, 'gia_phuc' AS slug
UNION ALL
       SELECT '31' AS province_code, '11065' AS code, 'Xã Trường Tân' AS name, 'Trường Tân' AS short_name, 'Truong Tan' AS name_en, '03679' AS postal_code, 'truong_tan' AS slug
UNION ALL
       SELECT '31' AS province_code, '11074' AS code, 'Xã Tứ Kỳ' AS name, 'Tứ Kỳ' AS short_name, 'Tu Ky' AS name_en, '03906' AS postal_code, 'tu_ky' AS slug
UNION ALL
       SELECT '31' AS province_code, '11086' AS code, 'Xã Đại Sơn' AS name, 'Đại Sơn' AS short_name, 'Dai Son' AS name_en, '03912' AS postal_code, 'dai_son' AS slug
UNION ALL
       SELECT '31' AS province_code, '11113' AS code, 'Xã Tân Kỳ' AS name, 'Tân Kỳ' AS short_name, 'Tan Ky' AS name_en, '03916' AS postal_code, 'tan_ky' AS slug
UNION ALL
       SELECT '31' AS province_code, '11131' AS code, 'Xã Chí Minh' AS name, 'Chí Minh' AS short_name, 'Chi Minh' AS name_en, '03907' AS postal_code, 'chi_minh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11140' AS code, 'Xã Lạc Phượng' AS name, 'Lạc Phượng' AS short_name, 'Lac Phuong' AS name_en, '03924' AS postal_code, 'lac_phuong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11146' AS code, 'Xã Nguyên Giáp' AS name, 'Nguyên Giáp' AS short_name, 'Nguyen Giap' AS name_en, '03928' AS postal_code, 'nguyen_giap' AS slug
UNION ALL
       SELECT '31' AS province_code, '11164' AS code, 'Xã Vĩnh Lại' AS name, 'Vĩnh Lại' AS short_name, 'Vinh Lai' AS name_en, '03834' AS postal_code, 'vinh_lai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11167' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '03836' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '11203' AS code, 'Xã Ninh Giang' AS name, 'Ninh Giang' AS short_name, 'Ninh Giang' AS name_en, '03806' AS postal_code, 'ninh_giang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11218' AS code, 'Xã Hồng Châu' AS name, 'Hồng Châu' AS short_name, 'Hong Chau' AS name_en, '03837' AS postal_code, 'hong_chau' AS slug
UNION ALL
       SELECT '31' AS province_code, '11224' AS code, 'Xã Khúc Thừa Dụ' AS name, 'Khúc Thừa Dụ' AS short_name, 'Khuc Thua Du' AS name_en, '03835' AS postal_code, 'khuc_thua_du' AS slug
UNION ALL
       SELECT '31' AS province_code, '11239' AS code, 'Xã Thanh Miện' AS name, 'Thanh Miện' AS short_name, 'Thanh Mien' AS name_en, '03756' AS postal_code, 'thanh_mien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11242' AS code, 'Xã Nguyễn Lương Bằng' AS name, 'Nguyễn Lương Bằng' AS short_name, 'Nguyen Luong Bang' AS name_en, '03777' AS postal_code, 'nguyen_luong_bang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11254' AS code, 'Xã Bắc Thanh Miện' AS name, 'Bắc Thanh Miện' AS short_name, 'Bac Thanh Mien' AS name_en, '03775' AS postal_code, 'bac_thanh_mien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11257' AS code, 'Xã Hải Hưng' AS name, 'Hải Hưng' AS short_name, 'Hai Hung' AS name_en, '03776' AS postal_code, 'hai_hung' AS slug
UNION ALL
       SELECT '31' AS province_code, '11284' AS code, 'Xã Nam Thanh Miện' AS name, 'Nam Thanh Miện' AS short_name, 'Nam Thanh Mien' AS name_en, '03778' AS postal_code, 'nam_thanh_mien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11311' AS code, 'Phường Hồng Bàng' AS name, 'Hồng Bàng' AS short_name, 'Hong Bang' AS name_en, '04117' AS postal_code, 'hong_bang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11329' AS code, 'Phường Ngô Quyền' AS name, 'Ngô Quyền' AS short_name, 'Ngo Quyen' AS name_en, '04219' AS postal_code, 'ngo_quyen' AS slug
UNION ALL
       SELECT '31' AS province_code, '11359' AS code, 'Phường Gia Viên' AS name, 'Gia Viên' AS short_name, 'Gia Vien' AS name_en, '04213' AS postal_code, 'gia_vien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11383' AS code, 'Phường Lê Chân' AS name, 'Lê Chân' AS short_name, 'Le Chan' AS name_en, '04721' AS postal_code, 'le_chan' AS slug
UNION ALL
       SELECT '31' AS province_code, '11407' AS code, 'Phường An Biên' AS name, 'An Biên' AS short_name, 'An Bien' AS name_en, '04707' AS postal_code, 'an_bien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11411' AS code, 'Phường Đông Hải' AS name, 'Đông Hải' AS short_name, 'Dong Hai' AS name_en, '04815' AS postal_code, 'dong_hai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11413' AS code, 'Phường Hải An' AS name, 'Hải An' AS short_name, 'Hai An' AS name_en, '04814' AS postal_code, 'hai_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '11443' AS code, 'Phường Kiến An' AS name, 'Kiến An' AS short_name, 'Kien An' AS name_en, '04616' AS postal_code, 'kien_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '11446' AS code, 'Phường Phù Liễn' AS name, 'Phù Liễn' AS short_name, 'Phu Lien' AS name_en, '04617' AS postal_code, 'phu_lien' AS slug
UNION ALL
       SELECT '31' AS province_code, '11455' AS code, 'Phường Đồ Sơn' AS name, 'Đồ Sơn' AS short_name, 'Do Son' AS name_en, '05014' AS postal_code, 'do_son' AS slug
UNION ALL
       SELECT '31' AS province_code, '11473' AS code, 'Phường Bạch Đằng' AS name, 'Bạch Đằng' AS short_name, 'Bach Dang' AS name_en, '04318' AS postal_code, 'bach_dang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11488' AS code, 'Phường Lưu Kiếm' AS name, 'Lưu Kiếm' AS short_name, 'Luu Kiem' AS name_en, '04330' AS postal_code, 'luu_kiem' AS slug
UNION ALL
       SELECT '31' AS province_code, '11503' AS code, 'Xã Việt Khê' AS name, 'Việt Khê' AS short_name, 'Viet Khe' AS name_en, '04343' AS postal_code, 'viet_khe' AS slug
UNION ALL
       SELECT '31' AS province_code, '11506' AS code, 'Phường Lê Ích Mộc' AS name, 'Lê Ích Mộc' AS short_name, 'Le Ich Moc' AS name_en, '04346' AS postal_code, 'le_ich_moc' AS slug
UNION ALL
       SELECT '31' AS province_code, '11533' AS code, 'Phường Hoà Bình' AS name, 'Hoà Bình' AS short_name, 'Hoa Binh' AS name_en, '04308' AS postal_code, 'hoa_binh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11542' AS code, 'Phường Nam Triệu' AS name, 'Nam Triệu' AS short_name, 'Nam Trieu' AS name_en, '04345' AS postal_code, 'nam_trieu' AS slug
UNION ALL
       SELECT '31' AS province_code, '11557' AS code, 'Phường Thiên Hương' AS name, 'Thiên Hương' AS short_name, 'Thien Huong' AS name_en, '04338' AS postal_code, 'thien_huong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11560' AS code, 'Phường Thuỷ Nguyên' AS name, 'Thuỷ Nguyên' AS short_name, 'Thuy Nguyen' AS name_en, '04344' AS postal_code, 'thuy_nguyen' AS slug
UNION ALL
       SELECT '31' AS province_code, '11581' AS code, 'Phường An Dương' AS name, 'An Dương' AS short_name, 'An Duong' AS name_en, '04422' AS postal_code, 'an_duong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11593' AS code, 'Phường An Phong' AS name, 'An Phong' AS short_name, 'An Phong' AS name_en, '04424' AS postal_code, 'an_phong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11602' AS code, 'Phường Hồng An' AS name, 'Hồng An' AS short_name, 'Hong An' AS name_en, '04118' AS postal_code, 'hong_an' AS slug
UNION ALL
       SELECT '31' AS province_code, '11617' AS code, 'Phường An Hải' AS name, 'An Hải' AS short_name, 'An Hai' AS name_en, '04423' AS postal_code, 'an_hai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11629' AS code, 'Xã An Lão' AS name, 'An Lão' AS short_name, 'An Lao' AS name_en, '04506' AS postal_code, 'an_lao' AS slug
UNION ALL
       SELECT '31' AS province_code, '11635' AS code, 'Xã An Trường' AS name, 'An Trường' AS short_name, 'An Truong' AS name_en, '04526' AS postal_code, 'an_truong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11647' AS code, 'Xã An Quang' AS name, 'An Quang' AS short_name, 'An Quang' AS name_en, '04525' AS postal_code, 'an_quang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11668' AS code, 'Xã An Khánh' AS name, 'An Khánh' AS short_name, 'An Khanh' AS name_en, '04524' AS postal_code, 'an_khanh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11674' AS code, 'Xã An Hưng' AS name, 'An Hưng' AS short_name, 'An Hung' AS name_en, '04523' AS postal_code, 'an_hung' AS slug
UNION ALL
       SELECT '31' AS province_code, '11680' AS code, 'Xã Kiến Thuỵ' AS name, 'Kiến Thuỵ' AS short_name, 'Kien Thuy' AS name_en, '05124' AS postal_code, 'kien_thuy' AS slug
UNION ALL
       SELECT '31' AS province_code, '11689' AS code, 'Phường Hưng Đạo' AS name, 'Hưng Đạo' AS short_name, 'Hung Dao' AS name_en, '04907' AS postal_code, 'hung_dao' AS slug
UNION ALL
       SELECT '31' AS province_code, '11692' AS code, 'Phường Dương Kinh' AS name, 'Dương Kinh' AS short_name, 'Duong Kinh' AS name_en, '04912' AS postal_code, 'duong_kinh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11713' AS code, 'Xã Nghi Dương' AS name, 'Nghi Dương' AS short_name, 'Nghi Duong' AS name_en, '05127' AS postal_code, 'nghi_duong' AS slug
UNION ALL
       SELECT '31' AS province_code, '11725' AS code, 'Xã Kiến Minh' AS name, 'Kiến Minh' AS short_name, 'Kien Minh' AS name_en, '05125' AS postal_code, 'kien_minh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11728' AS code, 'Xã Kiến Hưng' AS name, 'Kiến Hưng' AS short_name, 'Kien Hung' AS name_en, '05115' AS postal_code, 'kien_hung' AS slug
UNION ALL
       SELECT '31' AS province_code, '11737' AS code, 'Phường Nam Đồ Sơn' AS name, 'Nam Đồ Sơn' AS short_name, 'Nam Do Son' AS name_en, '05013' AS postal_code, 'nam_do_son' AS slug
UNION ALL
       SELECT '31' AS province_code, '11749' AS code, 'Xã Kiến Hải' AS name, 'Kiến Hải' AS short_name, 'Kien Hai' AS name_en, '05126' AS postal_code, 'kien_hai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11755' AS code, 'Xã Tiên Lãng' AS name, 'Tiên Lãng' AS short_name, 'Tien Lang' AS name_en, '05206' AS postal_code, 'tien_lang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11761' AS code, 'Xã Quyết Thắng' AS name, 'Quyết Thắng' AS short_name, 'Quyet Thang' AS name_en, '05229' AS postal_code, 'quyet_thang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11779' AS code, 'Xã Tân Minh' AS name, 'Tân Minh' AS short_name, 'Tan Minh' AS name_en, '05217' AS postal_code, 'tan_minh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11791' AS code, 'Xã Tiên Minh' AS name, 'Tiên Minh' AS short_name, 'Tien Minh' AS name_en, '05218' AS postal_code, 'tien_minh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11806' AS code, 'Xã Chấn Hưng' AS name, 'Chấn Hưng' AS short_name, 'Chan Hung' AS name_en, '05230' AS postal_code, 'chan_hung' AS slug
UNION ALL
       SELECT '31' AS province_code, '11809' AS code, 'Xã Hùng Thắng' AS name, 'Hùng Thắng' AS short_name, 'Hung Thang' AS name_en, '05224' AS postal_code, 'hung_thang' AS slug
UNION ALL
       SELECT '31' AS province_code, '11824' AS code, 'Xã Vĩnh Bảo' AS name, 'Vĩnh Bảo' AS short_name, 'Vinh Bao' AS name_en, '05306' AS postal_code, 'vinh_bao' AS slug
UNION ALL
       SELECT '31' AS province_code, '11836' AS code, 'Xã Vĩnh Thịnh' AS name, 'Vĩnh Thịnh' AS short_name, 'Vinh Thinh' AS name_en, '05338' AS postal_code, 'vinh_thinh' AS slug
UNION ALL
       SELECT '31' AS province_code, '11842' AS code, 'Xã Vĩnh Thuận' AS name, 'Vĩnh Thuận' AS short_name, 'Vinh Thuan' AS name_en, '05339' AS postal_code, 'vinh_thuan' AS slug
UNION ALL
       SELECT '31' AS province_code, '11848' AS code, 'Xã Vĩnh Hoà' AS name, 'Vĩnh Hoà' AS short_name, 'Vinh Hoa' AS name_en, '05314' AS postal_code, 'vinh_hoa' AS slug
UNION ALL
       SELECT '31' AS province_code, '11875' AS code, 'Xã Vĩnh Hải' AS name, 'Vĩnh Hải' AS short_name, 'Vinh Hai' AS name_en, '05319' AS postal_code, 'vinh_hai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11887' AS code, 'Xã Vĩnh Am' AS name, 'Vĩnh Am' AS short_name, 'Vinh Am' AS name_en, '05337' AS postal_code, 'vinh_am' AS slug
UNION ALL
       SELECT '31' AS province_code, '11911' AS code, 'Xã Nguyễn Bỉnh Khiêm' AS name, 'Nguyễn Bỉnh Khiêm' AS short_name, 'Nguyen Binh Khiem' AS name_en, '05336' AS postal_code, 'nguyen_binh_khiem' AS slug
UNION ALL
       SELECT '31' AS province_code, '11914' AS code, 'Đặc khu Cát Hải' AS name, 'Cát Hải' AS short_name, 'Cat Hai' AS name_en, '05418' AS postal_code, 'cat_hai' AS slug
UNION ALL
       SELECT '31' AS province_code, '11948' AS code, 'Đặc khu Bạch Long Vĩ' AS name, 'Bạch Long Vĩ' AS short_name, 'Bach Long Vi' AS name_en, '05506' AS postal_code, 'bach_long_vi' AS slug
UNION ALL
       SELECT '33' AS province_code, '11953' AS code, 'Phường Phố Hiến' AS name, 'Phố Hiến' AS short_name, 'Pho Hien' AS name_en, '17123' AS postal_code, 'pho_hien' AS slug
UNION ALL
       SELECT '33' AS province_code, '11977' AS code, 'Xã Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '17121' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '11980' AS code, 'Phường Hồng Châu' AS name, 'Hồng Châu' AS short_name, 'Hong Chau' AS name_en, '17110' AS postal_code, 'hong_chau' AS slug
UNION ALL
       SELECT '33' AS province_code, '11983' AS code, 'Phường Sơn Nam' AS name, 'Sơn Nam' AS short_name, 'Son Nam' AS name_en, '17124' AS postal_code, 'son_nam' AS slug
UNION ALL
       SELECT '33' AS province_code, '11992' AS code, 'Xã Lạc Đạo' AS name, 'Lạc Đạo' AS short_name, 'Lac Dao' AS name_en, '17607' AS postal_code, 'lac_dao' AS slug
UNION ALL
       SELECT '33' AS province_code, '11995' AS code, 'Xã Đại Đồng' AS name, 'Đại Đồng' AS short_name, 'Dai Dong' AS name_en, '17609' AS postal_code, 'dai_dong' AS slug
UNION ALL
       SELECT '33' AS province_code, '12004' AS code, 'Xã Như Quỳnh' AS name, 'Như Quỳnh' AS short_name, 'Nhu Quynh' AS name_en, '17606' AS postal_code, 'nhu_quynh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12019' AS code, 'Xã Văn Giang' AS name, 'Văn Giang' AS short_name, 'Van Giang' AS name_en, '17656' AS postal_code, 'van_giang' AS slug
UNION ALL
       SELECT '33' AS province_code, '12025' AS code, 'Xã Phụng Công' AS name, 'Phụng Công' AS short_name, 'Phung Cong' AS name_en, '17659' AS postal_code, 'phung_cong' AS slug
UNION ALL
       SELECT '33' AS province_code, '12031' AS code, 'Xã Nghĩa Trụ' AS name, 'Nghĩa Trụ' AS short_name, 'Nghia Tru' AS name_en, '17660' AS postal_code, 'nghia_tru' AS slug
UNION ALL
       SELECT '33' AS province_code, '12049' AS code, 'Xã Mễ Sở' AS name, 'Mễ Sở' AS short_name, 'Me So' AS name_en, '17666' AS postal_code, 'me_so' AS slug
UNION ALL
       SELECT '33' AS province_code, '12064' AS code, 'Xã Nguyễn Văn Linh' AS name, 'Nguyễn Văn Linh' AS short_name, 'Nguyen Van Linh' AS name_en, '17707' AS postal_code, 'nguyen_van_linh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12070' AS code, 'Xã Hoàn Long' AS name, 'Hoàn Long' AS short_name, 'Hoan Long' AS name_en, '17712' AS postal_code, 'hoan_long' AS slug
UNION ALL
       SELECT '33' AS province_code, '12073' AS code, 'Xã Yên Mỹ' AS name, 'Yên Mỹ' AS short_name, 'Yen My' AS name_en, '17706' AS postal_code, 'yen_my' AS slug
UNION ALL
       SELECT '33' AS province_code, '12091' AS code, 'Xã Việt Yên' AS name, 'Việt Yên' AS short_name, 'Viet Yen' AS name_en, '17716' AS postal_code, 'viet_yen' AS slug
UNION ALL
       SELECT '33' AS province_code, '12103' AS code, 'Phường Mỹ Hào' AS name, 'Mỹ Hào' AS short_name, 'My Hao' AS name_en, '17519' AS postal_code, 'my_hao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12127' AS code, 'Phường Thượng Hồng' AS name, 'Thượng Hồng' AS short_name, 'Thuong Hong' AS name_en, '17521' AS postal_code, 'thuong_hong' AS slug
UNION ALL
       SELECT '33' AS province_code, '12133' AS code, 'Phường Đường Hào' AS name, 'Đường Hào' AS short_name, 'Duong Hao' AS name_en, '17520' AS postal_code, 'duong_hao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12142' AS code, 'Xã Ân Thi' AS name, 'Ân Thi' AS short_name, 'An Thi' AS name_en, '17406' AS postal_code, 'an_thi' AS slug
UNION ALL
       SELECT '33' AS province_code, '12148' AS code, 'Xã Phạm Ngũ Lão' AS name, 'Phạm Ngũ Lão' AS short_name, 'Pham Ngu Lao' AS name_en, '17427' AS postal_code, 'pham_ngu_lao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12166' AS code, 'Xã Xuân Trúc' AS name, 'Xuân Trúc' AS short_name, 'Xuan Truc' AS name_en, '17414' AS postal_code, 'xuan_truc' AS slug
UNION ALL
       SELECT '33' AS province_code, '12184' AS code, 'Xã Nguyễn Trãi' AS name, 'Nguyễn Trãi' AS short_name, 'Nguyen Trai' AS name_en, '17420' AS postal_code, 'nguyen_trai' AS slug
UNION ALL
       SELECT '33' AS province_code, '12196' AS code, 'Xã Hồng Quang' AS name, 'Hồng Quang' AS short_name, 'Hong Quang' AS name_en, '17425' AS postal_code, 'hong_quang' AS slug
UNION ALL
       SELECT '33' AS province_code, '12205' AS code, 'Xã Khoái Châu' AS name, 'Khoái Châu' AS short_name, 'Khoai Chau' AS name_en, '17806' AS postal_code, 'khoai_chau' AS slug
UNION ALL
       SELECT '33' AS province_code, '12223' AS code, 'Xã Triệu Việt Vương' AS name, 'Triệu Việt Vương' AS short_name, 'Trieu Viet Vuong' AS name_en, '17831' AS postal_code, 'trieu_viet_vuong' AS slug
UNION ALL
       SELECT '33' AS province_code, '12238' AS code, 'Xã Việt Tiến' AS name, 'Việt Tiến' AS short_name, 'Viet Tien' AS name_en, '17832' AS postal_code, 'viet_tien' AS slug
UNION ALL
       SELECT '33' AS province_code, '12247' AS code, 'Xã Châu Ninh' AS name, 'Châu Ninh' AS short_name, 'Chau Ninh' AS name_en, '17833' AS postal_code, 'chau_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12271' AS code, 'Xã Chí Minh' AS name, 'Chí Minh' AS short_name, 'Chi Minh' AS name_en, '17826' AS postal_code, 'chi_minh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12280' AS code, 'Xã Lương Bằng' AS name, 'Lương Bằng' AS short_name, 'Luong Bang' AS name_en, '17906' AS postal_code, 'luong_bang' AS slug
UNION ALL
       SELECT '33' AS province_code, '12286' AS code, 'Xã Nghĩa Dân' AS name, 'Nghĩa Dân' AS short_name, 'Nghia Dan' AS name_en, '17907' AS postal_code, 'nghia_dan' AS slug
UNION ALL
       SELECT '33' AS province_code, '12313' AS code, 'Xã Đức Hợp' AS name, 'Đức Hợp' AS short_name, 'Duc Hop' AS name_en, '17918' AS postal_code, 'duc_hop' AS slug
UNION ALL
       SELECT '33' AS province_code, '12322' AS code, 'Xã Hiệp Cường' AS name, 'Hiệp Cường' AS short_name, 'Hiep Cuong' AS name_en, '17922' AS postal_code, 'hiep_cuong' AS slug
UNION ALL
       SELECT '33' AS province_code, '12337' AS code, 'Xã Hoàng Hoa Thám' AS name, 'Hoàng Hoa Thám' AS short_name, 'Hoang Hoa Tham' AS name_en, '17222' AS postal_code, 'hoang_hoa_tham' AS slug
UNION ALL
       SELECT '33' AS province_code, '12361' AS code, 'Xã Tiên Hoa' AS name, 'Tiên Hoa' AS short_name, 'Tien Hoa' AS name_en, '17223' AS postal_code, 'tien_hoa' AS slug
UNION ALL
       SELECT '33' AS province_code, '12364' AS code, 'Xã Tiên Lữ' AS name, 'Tiên Lữ' AS short_name, 'Tien Lu' AS name_en, '17221' AS postal_code, 'tien_lu' AS slug
UNION ALL
       SELECT '33' AS province_code, '12391' AS code, 'Xã Quang Hưng' AS name, 'Quang Hưng' AS short_name, 'Quang Hung' AS name_en, '17309' AS postal_code, 'quang_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12406' AS code, 'Xã Đoàn Đào' AS name, 'Đoàn Đào' AS short_name, 'Doan Dao' AS name_en, '17311' AS postal_code, 'doan_dao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12424' AS code, 'Xã Tiên Tiến' AS name, 'Tiên Tiến' AS short_name, 'Tien Tien' AS name_en, '17315' AS postal_code, 'tien_tien' AS slug
UNION ALL
       SELECT '33' AS province_code, '12427' AS code, 'Xã Tống Trân' AS name, 'Tống Trân' AS short_name, 'Tong Tran' AS name_en, '17319' AS postal_code, 'tong_tran' AS slug
UNION ALL
       SELECT '33' AS province_code, '12452' AS code, 'Phường Trần Hưng Đạo' AS name, 'Trần Hưng Đạo' AS short_name, 'Tran Hung Dao' AS name_en, '06106' AS postal_code, 'tran_hung_dao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12454' AS code, 'Phường Trần Lãm' AS name, 'Trần Lãm' AS short_name, 'Tran Lam' AS name_en, '06122' AS postal_code, 'tran_lam' AS slug
UNION ALL
       SELECT '33' AS province_code, '12466' AS code, 'Phường Vũ Phúc' AS name, 'Vũ Phúc' AS short_name, 'Vu Phuc' AS name_en, '06119' AS postal_code, 'vu_phuc' AS slug
UNION ALL
       SELECT '33' AS province_code, '12472' AS code, 'Xã Quỳnh Phụ' AS name, 'Quỳnh Phụ' AS short_name, 'Quynh Phu' AS name_en, '06644' AS postal_code, 'quynh_phu' AS slug
UNION ALL
       SELECT '33' AS province_code, '12499' AS code, 'Xã A Sào' AS name, 'A Sào' AS short_name, 'A Sao' AS name_en, '06675' AS postal_code, 'a_sao' AS slug
UNION ALL
       SELECT '33' AS province_code, '12511' AS code, 'Xã Minh Thọ' AS name, 'Minh Thọ' AS short_name, 'Minh Tho' AS name_en, '06645' AS postal_code, 'minh_tho' AS slug
UNION ALL
       SELECT '33' AS province_code, '12517' AS code, 'Xã Ngọc Lâm' AS name, 'Ngọc Lâm' AS short_name, 'Ngoc Lam' AS name_en, '06648' AS postal_code, 'ngoc_lam' AS slug
UNION ALL
       SELECT '33' AS province_code, '12523' AS code, 'Xã Phụ Dực' AS name, 'Phụ Dực' AS short_name, 'Phu Duc' AS name_en, '06676' AS postal_code, 'phu_duc' AS slug
UNION ALL
       SELECT '33' AS province_code, '12526' AS code, 'Xã Đồng Bằng' AS name, 'Đồng Bằng' AS short_name, 'Dong Bang' AS name_en, '06649' AS postal_code, 'dong_bang' AS slug
UNION ALL
       SELECT '33' AS province_code, '12532' AS code, 'Xã Nguyễn Du' AS name, 'Nguyễn Du' AS short_name, 'Nguyen Du' AS name_en, '06646' AS postal_code, 'nguyen_du' AS slug
UNION ALL
       SELECT '33' AS province_code, '12577' AS code, 'Xã Quỳnh An' AS name, 'Quỳnh An' AS short_name, 'Quynh An' AS name_en, '06647' AS postal_code, 'quynh_an' AS slug
UNION ALL
       SELECT '33' AS province_code, '12583' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '06677' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '33' AS province_code, '12586' AS code, 'Xã Hưng Hà' AS name, 'Hưng Hà' AS short_name, 'Hung Ha' AS name_en, '06706' AS postal_code, 'hung_ha' AS slug
UNION ALL
       SELECT '33' AS province_code, '12595' AS code, 'Xã Ngự Thiên' AS name, 'Ngự Thiên' AS short_name, 'Ngu Thien' AS name_en, '06745' AS postal_code, 'ngu_thien' AS slug
UNION ALL
       SELECT '33' AS province_code, '12613' AS code, 'Xã Long Hưng' AS name, 'Long Hưng' AS short_name, 'Long Hung' AS name_en, '06746' AS postal_code, 'long_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12619' AS code, 'Xã Diên Hà' AS name, 'Diên Hà' AS short_name, 'Dien Ha' AS name_en, '06744' AS postal_code, 'dien_ha' AS slug
UNION ALL
       SELECT '33' AS province_code, '12631' AS code, 'Xã Thần Khê' AS name, 'Thần Khê' AS short_name, 'Than Khe' AS name_en, '06743' AS postal_code, 'than_khe' AS slug
UNION ALL
       SELECT '33' AS province_code, '12634' AS code, 'Xã Tiên La' AS name, 'Tiên La' AS short_name, 'Tien La' AS name_en, '06741' AS postal_code, 'tien_la' AS slug
UNION ALL
       SELECT '33' AS province_code, '12676' AS code, 'Xã Lê Quý Đôn' AS name, 'Lê Quý Đôn' AS short_name, 'Le Quy Don' AS name_en, '06742' AS postal_code, 'le_quy_don' AS slug
UNION ALL
       SELECT '33' AS province_code, '12685' AS code, 'Xã Hồng Minh' AS name, 'Hồng Minh' AS short_name, 'Hong Minh' AS name_en, '06738' AS postal_code, 'hong_minh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12688' AS code, 'Xã Đông Hưng' AS name, 'Đông Hưng' AS short_name, 'Dong Hung' AS name_en, '06806' AS postal_code, 'dong_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12694' AS code, 'Xã Bắc Đông Hưng' AS name, 'Bắc Đông Hưng' AS short_name, 'Bac Dong Hung' AS name_en, '06850' AS postal_code, 'bac_dong_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12700' AS code, 'Xã Bắc Tiên Hưng' AS name, 'Bắc Tiên Hưng' AS short_name, 'Bac Tien Hung' AS name_en, '06854' AS postal_code, 'bac_tien_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12736' AS code, 'Xã Đông Tiên Hưng' AS name, 'Đông Tiên Hưng' AS short_name, 'Dong Tien Hung' AS name_en, '06853' AS postal_code, 'dong_tien_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12745' AS code, 'Xã Bắc Đông Quan' AS name, 'Bắc Đông Quan' AS short_name, 'Bac Dong Quan' AS name_en, '06856' AS postal_code, 'bac_dong_quan' AS slug
UNION ALL
       SELECT '33' AS province_code, '12754' AS code, 'Xã Tiên Hưng' AS name, 'Tiên Hưng' AS short_name, 'Tien Hung' AS name_en, '06852' AS postal_code, 'tien_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12763' AS code, 'Xã Nam Tiên Hưng' AS name, 'Nam Tiên Hưng' AS short_name, 'Nam Tien Hung' AS name_en, '06855' AS postal_code, 'nam_tien_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12775' AS code, 'Xã Nam Đông Hưng' AS name, 'Nam Đông Hưng' AS short_name, 'Nam Dong Hung' AS name_en, '06851' AS postal_code, 'nam_dong_hung' AS slug
UNION ALL
       SELECT '33' AS province_code, '12793' AS code, 'Xã Đông Quan' AS name, 'Đông Quan' AS short_name, 'Dong Quan' AS name_en, '06843' AS postal_code, 'dong_quan' AS slug
UNION ALL
       SELECT '33' AS province_code, '12817' AS code, 'Phường Trà Lý' AS name, 'Trà Lý' AS short_name, 'Tra Ly' AS name_en, '06126' AS postal_code, 'tra_ly' AS slug
UNION ALL
       SELECT '33' AS province_code, '12826' AS code, 'Xã Thái Thuỵ' AS name, 'Thái Thuỵ' AS short_name, 'Thai Thuy' AS name_en, '06454' AS postal_code, 'thai_thuy' AS slug
UNION ALL
       SELECT '33' AS province_code, '12850' AS code, 'Xã Tây Thuỵ Anh' AS name, 'Tây Thuỵ Anh' AS short_name, 'Tay Thuy Anh' AS name_en, '06458' AS postal_code, 'tay_thuy_anh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12859' AS code, 'Xã Bắc Thuỵ Anh' AS name, 'Bắc Thuỵ Anh' AS short_name, 'Bac Thuy Anh' AS name_en, '06457' AS postal_code, 'bac_thuy_anh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12862' AS code, 'Xã Đông Thuỵ Anh' AS name, 'Đông Thuỵ Anh' AS short_name, 'Dong Thuy Anh' AS name_en, '06456' AS postal_code, 'dong_thuy_anh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12865' AS code, 'Xã Thuỵ Anh' AS name, 'Thuỵ Anh' AS short_name, 'Thuy Anh' AS name_en, '06455' AS postal_code, 'thuy_anh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12904' AS code, 'Xã Nam Thuỵ Anh' AS name, 'Nam Thuỵ Anh' AS short_name, 'Nam Thuy Anh' AS name_en, '06459' AS postal_code, 'nam_thuy_anh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12916' AS code, 'Xã Bắc Thái Ninh' AS name, 'Bắc Thái Ninh' AS short_name, 'Bac Thai Ninh' AS name_en, '06462' AS postal_code, 'bac_thai_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12919' AS code, 'Xã Tây Thái Ninh' AS name, 'Tây Thái Ninh' AS short_name, 'Tay Thai Ninh' AS name_en, '06463' AS postal_code, 'tay_thai_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12922' AS code, 'Xã Thái Ninh' AS name, 'Thái Ninh' AS short_name, 'Thai Ninh' AS name_en, '06460' AS postal_code, 'thai_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12943' AS code, 'Xã Đông Thái Ninh' AS name, 'Đông Thái Ninh' AS short_name, 'Dong Thai Ninh' AS name_en, '06461' AS postal_code, 'dong_thai_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12961' AS code, 'Xã Nam Thái Ninh' AS name, 'Nam Thái Ninh' AS short_name, 'Nam Thai Ninh' AS name_en, '06464' AS postal_code, 'nam_thai_ninh' AS slug
UNION ALL
       SELECT '33' AS province_code, '12970' AS code, 'Xã Tiền Hải' AS name, 'Tiền Hải' AS short_name, 'Tien Hai' AS name_en, '06306' AS postal_code, 'tien_hai' AS slug
UNION ALL
       SELECT '33' AS province_code, '12988' AS code, 'Xã Đông Tiền Hải' AS name, 'Đông Tiền Hải' AS short_name, 'Dong Tien Hai' AS name_en, '06341' AS postal_code, 'dong_tien_hai' AS slug
UNION ALL
       SELECT '33' AS province_code, '13003' AS code, 'Xã Đồng Châu' AS name, 'Đồng Châu' AS short_name, 'Dong Chau' AS name_en, '06344' AS postal_code, 'dong_chau' AS slug
UNION ALL
       SELECT '33' AS province_code, '13021' AS code, 'Xã Ái Quốc' AS name, 'Ái Quốc' AS short_name, 'Ai Quoc' AS name_en, '06325' AS postal_code, 'ai_quoc' AS slug
UNION ALL
       SELECT '33' AS province_code, '13039' AS code, 'Xã Tây Tiền Hải' AS name, 'Tây Tiền Hải' AS short_name, 'Tay Tien Hai' AS name_en, '06342' AS postal_code, 'tay_tien_hai' AS slug
UNION ALL
       SELECT '33' AS province_code, '13057' AS code, 'Xã Nam Cường' AS name, 'Nam Cường' AS short_name, 'Nam Cuong' AS name_en, '06338' AS postal_code, 'nam_cuong' AS slug
UNION ALL
       SELECT '33' AS province_code, '13063' AS code, 'Xã Nam Tiền Hải' AS name, 'Nam Tiền Hải' AS short_name, 'Nam Tien Hai' AS name_en, '06343' AS postal_code, 'nam_tien_hai' AS slug
UNION ALL
       SELECT '33' AS province_code, '13066' AS code, 'Xã Hưng Phú' AS name, 'Hưng Phú' AS short_name, 'Hung Phu' AS name_en, '06345' AS postal_code, 'hung_phu' AS slug
UNION ALL
       SELECT '33' AS province_code, '13075' AS code, 'Xã Kiến Xương' AS name, 'Kiến Xương' AS short_name, 'Kien Xuong' AS name_en, '06206' AS postal_code, 'kien_xuong' AS slug
UNION ALL
       SELECT '33' AS province_code, '13093' AS code, 'Xã Trà Giang' AS name, 'Trà Giang' AS short_name, 'Tra Giang' AS name_en, '06216' AS postal_code, 'tra_giang' AS slug
UNION ALL
       SELECT '33' AS province_code, '13096' AS code, 'Xã Bình Nguyên' AS name, 'Bình Nguyên' AS short_name, 'Binh Nguyen' AS name_en, '06222' AS postal_code, 'binh_nguyen' AS slug
UNION ALL
       SELECT '33' AS province_code, '13120' AS code, 'Xã Lê Lợi' AS name, 'Lê Lợi' AS short_name, 'Le Loi' AS name_en, '06213' AS postal_code, 'le_loi' AS slug
UNION ALL
       SELECT '33' AS province_code, '13132' AS code, 'Xã Quang Lịch' AS name, 'Quang Lịch' AS short_name, 'Quang Lich' AS name_en, '06224' AS postal_code, 'quang_lich' AS slug
UNION ALL
       SELECT '33' AS province_code, '13141' AS code, 'Xã Vũ Quý' AS name, 'Vũ Quý' AS short_name, 'Vu Quy' AS name_en, '06227' AS postal_code, 'vu_quy' AS slug
UNION ALL
       SELECT '33' AS province_code, '13159' AS code, 'Xã Hồng Vũ' AS name, 'Hồng Vũ' AS short_name, 'Hong Vu' AS name_en, '06229' AS postal_code, 'hong_vu' AS slug
UNION ALL
       SELECT '33' AS province_code, '13183' AS code, 'Xã Bình Thanh' AS name, 'Bình Thanh' AS short_name, 'Binh Thanh' AS name_en, '06235' AS postal_code, 'binh_thanh' AS slug
UNION ALL
       SELECT '33' AS province_code, '13186' AS code, 'Xã Bình Định' AS name, 'Bình Định' AS short_name, 'Binh Dinh' AS name_en, '06237' AS postal_code, 'binh_dinh' AS slug
UNION ALL
       SELECT '33' AS province_code, '13192' AS code, 'Xã Vũ Thư' AS name, 'Vũ Thư' AS short_name, 'Vu Thu' AS name_en, '06906' AS postal_code, 'vu_thu' AS slug
UNION ALL
       SELECT '33' AS province_code, '13219' AS code, 'Xã Vạn Xuân' AS name, 'Vạn Xuân' AS short_name, 'Van Xuan' AS name_en, '06940' AS postal_code, 'van_xuan' AS slug
UNION ALL
       SELECT '33' AS province_code, '13222' AS code, 'Xã Thư Trì' AS name, 'Thư Trì' AS short_name, 'Thu Tri' AS name_en, '06936' AS postal_code, 'thu_tri' AS slug
UNION ALL
       SELECT '33' AS province_code, '13225' AS code, 'Phường Thái Bình' AS name, 'Thái Bình' AS short_name, 'Thai Binh' AS name_en, '06125' AS postal_code, 'thai_binh' AS slug
UNION ALL
       SELECT '33' AS province_code, '13246' AS code, 'Xã Tân Thuận' AS name, 'Tân Thuận' AS short_name, 'Tan Thuan' AS name_en, '06937' AS postal_code, 'tan_thuan' AS slug
UNION ALL
       SELECT '33' AS province_code, '13264' AS code, 'Xã Thư Vũ' AS name, 'Thư Vũ' AS short_name, 'Thu Vu' AS name_en, '06938' AS postal_code, 'thu_vu' AS slug
UNION ALL
       SELECT '33' AS province_code, '13279' AS code, 'Xã Vũ Tiên' AS name, 'Vũ Tiên' AS short_name, 'Vu Tien' AS name_en, '06939' AS postal_code, 'vu_tien' AS slug
UNION ALL
       SELECT '37' AS province_code, '13285' AS code, 'Phường Phủ Lý' AS name, 'Phủ Lý' AS short_name, 'Phu Ly' AS name_en, '18128' AS postal_code, 'phu_ly' AS slug
UNION ALL
       SELECT '37' AS province_code, '13291' AS code, 'Phường Phù Vân' AS name, 'Phù Vân' AS short_name, 'Phu Van' AS name_en, '18113' AS postal_code, 'phu_van' AS slug
UNION ALL
       SELECT '37' AS province_code, '13318' AS code, 'Phường Châu Sơn' AS name, 'Châu Sơn' AS short_name, 'Chau Son' AS name_en, '18115' AS postal_code, 'chau_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '13324' AS code, 'Phường Duy Tiên' AS name, 'Duy Tiên' AS short_name, 'Duy Tien' AS name_en, '18224' AS postal_code, 'duy_tien' AS slug
UNION ALL
       SELECT '37' AS province_code, '13330' AS code, 'Phường Duy Tân' AS name, 'Duy Tân' AS short_name, 'Duy Tan' AS name_en, '18225' AS postal_code, 'duy_tan' AS slug
UNION ALL
       SELECT '37' AS province_code, '13336' AS code, 'Phường Duy Hà' AS name, 'Duy Hà' AS short_name, 'Duy Ha' AS name_en, '18226' AS postal_code, 'duy_ha' AS slug
UNION ALL
       SELECT '37' AS province_code, '13348' AS code, 'Phường Đồng Văn' AS name, 'Đồng Văn' AS short_name, 'Dong Van' AS name_en, '18216' AS postal_code, 'dong_van' AS slug
UNION ALL
       SELECT '37' AS province_code, '13363' AS code, 'Phường Tiên Sơn' AS name, 'Tiên Sơn' AS short_name, 'Tien Son' AS name_en, '18219' AS postal_code, 'tien_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '13366' AS code, 'Phường Hà Nam' AS name, 'Hà Nam' AS short_name, 'Ha Nam' AS name_en, '18127' AS postal_code, 'ha_nam' AS slug
UNION ALL
       SELECT '37' AS province_code, '13384' AS code, 'Phường Kim Bảng' AS name, 'Kim Bảng' AS short_name, 'Kim Bang' AS name_en, '18327' AS postal_code, 'kim_bang' AS slug
UNION ALL
       SELECT '37' AS province_code, '13393' AS code, 'Phường Lê Hồ' AS name, 'Lê Hồ' AS short_name, 'Le Ho' AS name_en, '18313' AS postal_code, 'le_ho' AS slug
UNION ALL
       SELECT '37' AS province_code, '13396' AS code, 'Phường Nguyễn Úy' AS name, 'Nguyễn Úy' AS short_name, 'Nguyen Uy' AS name_en, '18314' AS postal_code, 'nguyen_uy' AS slug
UNION ALL
       SELECT '37' AS province_code, '13402' AS code, 'Phường Kim Thanh' AS name, 'Kim Thanh' AS short_name, 'Kim Thanh' AS name_en, '18326' AS postal_code, 'kim_thanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13420' AS code, 'Phường Tam Chúc' AS name, 'Tam Chúc' AS short_name, 'Tam Chuc' AS name_en, '18324' AS postal_code, 'tam_chuc' AS slug
UNION ALL
       SELECT '37' AS province_code, '13435' AS code, 'Phường Lý Thường Kiệt' AS name, 'Lý Thường Kiệt' AS short_name, 'Ly Thuong Kiet' AS name_en, '18325' AS postal_code, 'ly_thuong_kiet' AS slug
UNION ALL
       SELECT '37' AS province_code, '13444' AS code, 'Phường Liêm Tuyền' AS name, 'Liêm Tuyền' AS short_name, 'Liem Tuyen' AS name_en, '18129' AS postal_code, 'liem_tuyen' AS slug
UNION ALL
       SELECT '37' AS province_code, '13456' AS code, 'Xã Liêm Hà' AS name, 'Liêm Hà' AS short_name, 'Liem Ha' AS name_en, '18423' AS postal_code, 'liem_ha' AS slug
UNION ALL
       SELECT '37' AS province_code, '13474' AS code, 'Xã Tân Thanh' AS name, 'Tân Thanh' AS short_name, 'Tan Thanh' AS name_en, '18421' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13483' AS code, 'Xã Thanh Bình' AS name, 'Thanh Bình' AS short_name, 'Thanh Binh' AS name_en, '18424' AS postal_code, 'thanh_binh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13489' AS code, 'Xã Thanh Lâm' AS name, 'Thanh Lâm' AS short_name, 'Thanh Lam' AS name_en, '18425' AS postal_code, 'thanh_lam' AS slug
UNION ALL
       SELECT '37' AS province_code, '13495' AS code, 'Xã Thanh Liêm' AS name, 'Thanh Liêm' AS short_name, 'Thanh Liem' AS name_en, '18426' AS postal_code, 'thanh_liem' AS slug
UNION ALL
       SELECT '37' AS province_code, '13501' AS code, 'Xã Bình Mỹ' AS name, 'Bình Mỹ' AS short_name, 'Binh My' AS name_en, '18506' AS postal_code, 'binh_my' AS slug
UNION ALL
       SELECT '37' AS province_code, '13504' AS code, 'Xã Bình Lục' AS name, 'Bình Lục' AS short_name, 'Binh Luc' AS name_en, '18525' AS postal_code, 'binh_luc' AS slug
UNION ALL
       SELECT '37' AS province_code, '13531' AS code, 'Xã Bình Giang' AS name, 'Bình Giang' AS short_name, 'Binh Giang' AS name_en, '18526' AS postal_code, 'binh_giang' AS slug
UNION ALL
       SELECT '37' AS province_code, '13540' AS code, 'Xã Bình An' AS name, 'Bình An' AS short_name, 'Binh An' AS name_en, '18508' AS postal_code, 'binh_an' AS slug
UNION ALL
       SELECT '37' AS province_code, '13558' AS code, 'Xã Bình Sơn' AS name, 'Bình Sơn' AS short_name, 'Binh Son' AS name_en, '18527' AS postal_code, 'binh_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '13573' AS code, 'Xã Lý Nhân' AS name, 'Lý Nhân' AS short_name, 'Ly Nhan' AS name_en, '18629' AS postal_code, 'ly_nhan' AS slug
UNION ALL
       SELECT '37' AS province_code, '13579' AS code, 'Xã Bắc Lý' AS name, 'Bắc Lý' AS short_name, 'Bac Ly' AS name_en, '18609' AS postal_code, 'bac_ly' AS slug
UNION ALL
       SELECT '37' AS province_code, '13591' AS code, 'Xã Nam Xang' AS name, 'Nam Xang' AS short_name, 'Nam Xang' AS name_en, '18630' AS postal_code, 'nam_xang' AS slug
UNION ALL
       SELECT '37' AS province_code, '13594' AS code, 'Xã Trần Thương' AS name, 'Trần Thương' AS short_name, 'Tran Thuong' AS name_en, '18631' AS postal_code, 'tran_thuong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13597' AS code, 'Xã Vĩnh Trụ' AS name, 'Vĩnh Trụ' AS short_name, 'Vinh Tru' AS name_en, '18606' AS postal_code, 'vinh_tru' AS slug
UNION ALL
       SELECT '37' AS province_code, '13609' AS code, 'Xã Nhân Hà' AS name, 'Nhân Hà' AS short_name, 'Nhan Ha' AS name_en, '18632' AS postal_code, 'nhan_ha' AS slug
UNION ALL
       SELECT '37' AS province_code, '13627' AS code, 'Xã Nam Lý' AS name, 'Nam Lý' AS short_name, 'Nam Ly' AS name_en, '18633' AS postal_code, 'nam_ly' AS slug
UNION ALL
       SELECT '37' AS province_code, '13669' AS code, 'Phường Nam Định' AS name, 'Nam Định' AS short_name, 'Nam Dinh' AS name_en, '07131' AS postal_code, 'nam_dinh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13684' AS code, 'Phường Thiên Trường' AS name, 'Thiên Trường' AS short_name, 'Thien Truong' AS name_en, '07139' AS postal_code, 'thien_truong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13693' AS code, 'Phường Đông A' AS name, 'Đông A' AS short_name, 'Dong A' AS name_en, '07133' AS postal_code, 'dong_a' AS slug
UNION ALL
       SELECT '37' AS province_code, '13699' AS code, 'Phường Thành Nam' AS name, 'Thành Nam' AS short_name, 'Thanh Nam' AS name_en, '07135' AS postal_code, 'thanh_nam' AS slug
UNION ALL
       SELECT '37' AS province_code, '13708' AS code, 'Phường Mỹ Lộc' AS name, 'Mỹ Lộc' AS short_name, 'My Loc' AS name_en, '07137' AS postal_code, 'my_loc' AS slug
UNION ALL
       SELECT '37' AS province_code, '13741' AS code, 'Xã Vụ Bản' AS name, 'Vụ Bản' AS short_name, 'Vu Ban' AS name_en, '07274' AS postal_code, 'vu_ban' AS slug
UNION ALL
       SELECT '37' AS province_code, '13750' AS code, 'Xã Minh Tân' AS name, 'Minh Tân' AS short_name, 'Minh Tan' AS name_en, '07272' AS postal_code, 'minh_tan' AS slug
UNION ALL
       SELECT '37' AS province_code, '13753' AS code, 'Xã Hiển Khánh' AS name, 'Hiển Khánh' AS short_name, 'Hien Khanh' AS name_en, '07268' AS postal_code, 'hien_khanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13777' AS code, 'Phường Trường Thi' AS name, 'Trường Thi' AS short_name, 'Truong Thi' AS name_en, '07119' AS postal_code, 'truong_thi' AS slug
UNION ALL
       SELECT '37' AS province_code, '13786' AS code, 'Xã Liên Minh' AS name, 'Liên Minh' AS short_name, 'Lien Minh' AS name_en, '07258' AS postal_code, 'lien_minh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13795' AS code, 'Xã Ý Yên' AS name, 'Ý Yên' AS short_name, 'Y Yen' AS name_en, '07338' AS postal_code, 'y_yen' AS slug
UNION ALL
       SELECT '37' AS province_code, '13807' AS code, 'Xã Tân Minh' AS name, 'Tân Minh' AS short_name, 'Tan Minh' AS name_en, '07309' AS postal_code, 'tan_minh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13822' AS code, 'Xã Phong Doanh' AS name, 'Phong Doanh' AS short_name, 'Phong Doanh' AS name_en, '07341' AS postal_code, 'phong_doanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13834' AS code, 'Xã Vũ Dương' AS name, 'Vũ Dương' AS short_name, 'Vu Duong' AS name_en, '07340' AS postal_code, 'vu_duong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13864' AS code, 'Xã Vạn Thắng' AS name, 'Vạn Thắng' AS short_name, 'Van Thang' AS name_en, '07339' AS postal_code, 'van_thang' AS slug
UNION ALL
       SELECT '37' AS province_code, '13870' AS code, 'Xã Yên Cường' AS name, 'Yên Cường' AS short_name, 'Yen Cuong' AS name_en, '07331' AS postal_code, 'yen_cuong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13879' AS code, 'Xã Yên Đồng' AS name, 'Yên Đồng' AS short_name, 'Yen Dong' AS name_en, '07328' AS postal_code, 'yen_dong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13891' AS code, 'Xã Nghĩa Hưng' AS name, 'Nghĩa Hưng' AS short_name, 'Nghia Hung' AS name_en, '07431' AS postal_code, 'nghia_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '13894' AS code, 'Xã Rạng Đông' AS name, 'Rạng Đông' AS short_name, 'Rang Dong' AS name_en, '07421' AS postal_code, 'rang_dong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13900' AS code, 'Xã Đồng Thịnh' AS name, 'Đồng Thịnh' AS short_name, 'Dong Thinh' AS name_en, '07408' AS postal_code, 'dong_thinh' AS slug
UNION ALL
       SELECT '37' AS province_code, '13918' AS code, 'Xã Nghĩa Sơn' AS name, 'Nghĩa Sơn' AS short_name, 'Nghia Son' AS name_en, '07414' AS postal_code, 'nghia_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '13927' AS code, 'Xã Hồng Phong' AS name, 'Hồng Phong' AS short_name, 'Hong Phong' AS name_en, '07432' AS postal_code, 'hong_phong' AS slug
UNION ALL
       SELECT '37' AS province_code, '13939' AS code, 'Xã Quỹ Nhất' AS name, 'Quỹ Nhất' AS short_name, 'Quy Nhat' AS name_en, '07417' AS postal_code, 'quy_nhat' AS slug
UNION ALL
       SELECT '37' AS province_code, '13957' AS code, 'Xã Nghĩa Lâm' AS name, 'Nghĩa Lâm' AS short_name, 'Nghia Lam' AS name_en, '07423' AS postal_code, 'nghia_lam' AS slug
UNION ALL
       SELECT '37' AS province_code, '13966' AS code, 'Xã Nam Trực' AS name, 'Nam Trực' AS short_name, 'Nam Truc' AS name_en, '07526' AS postal_code, 'nam_truc' AS slug
UNION ALL
       SELECT '37' AS province_code, '13972' AS code, 'Phường Vị Khê' AS name, 'Vị Khê' AS short_name, 'Vi Khe' AS name_en, '07134' AS postal_code, 'vi_khe' AS slug
UNION ALL
       SELECT '37' AS province_code, '13984' AS code, 'Phường Hồng Quang' AS name, 'Hồng Quang' AS short_name, 'Hong Quang' AS name_en, '07515' AS postal_code, 'hong_quang' AS slug
UNION ALL
       SELECT '37' AS province_code, '13987' AS code, 'Xã Nam Hồng' AS name, 'Nam Hồng' AS short_name, 'Nam Hong' AS name_en, '07509' AS postal_code, 'nam_hong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14005' AS code, 'Xã Nam Ninh' AS name, 'Nam Ninh' AS short_name, 'Nam Ninh' AS name_en, '07529' AS postal_code, 'nam_ninh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14011' AS code, 'Xã Nam Minh' AS name, 'Nam Minh' AS short_name, 'Nam Minh' AS name_en, '07527' AS postal_code, 'nam_minh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14014' AS code, 'Xã Nam Đồng' AS name, 'Nam Đồng' AS short_name, 'Nam Dong' AS name_en, '07528' AS postal_code, 'nam_dong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14026' AS code, 'Xã Cổ Lễ' AS name, 'Cổ Lễ' AS short_name, 'Co Le' AS name_en, '07606' AS postal_code, 'co_le' AS slug
UNION ALL
       SELECT '37' AS province_code, '14038' AS code, 'Xã Ninh Giang' AS name, 'Ninh Giang' AS short_name, 'Ninh Giang' AS name_en, '07627' AS postal_code, 'ninh_giang' AS slug
UNION ALL
       SELECT '37' AS province_code, '14053' AS code, 'Xã Trực Ninh' AS name, 'Trực Ninh' AS short_name, 'Truc Ninh' AS name_en, '07628' AS postal_code, 'truc_ninh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14056' AS code, 'Xã Cát Thành' AS name, 'Cát Thành' AS short_name, 'Cat Thanh' AS name_en, '07622' AS postal_code, 'cat_thanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14062' AS code, 'Xã Quang Hưng' AS name, 'Quang Hưng' AS short_name, 'Quang Hung' AS name_en, '07629' AS postal_code, 'quang_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14071' AS code, 'Xã Minh Thái' AS name, 'Minh Thái' AS short_name, 'Minh Thai' AS name_en, '07630' AS postal_code, 'minh_thai' AS slug
UNION ALL
       SELECT '37' AS province_code, '14077' AS code, 'Xã Ninh Cường' AS name, 'Ninh Cường' AS short_name, 'Ninh Cuong' AS name_en, '07617' AS postal_code, 'ninh_cuong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14089' AS code, 'Xã Xuân Trường' AS name, 'Xuân Trường' AS short_name, 'Xuan Truong' AS name_en, '07706' AS postal_code, 'xuan_truong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14095' AS code, 'Xã Xuân Hồng' AS name, 'Xuân Hồng' AS short_name, 'Xuan Hong' AS name_en, '07721' AS postal_code, 'xuan_hong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14104' AS code, 'Xã Xuân Giang' AS name, 'Xuân Giang' AS short_name, 'Xuan Giang' AS name_en, '07716' AS postal_code, 'xuan_giang' AS slug
UNION ALL
       SELECT '37' AS province_code, '14122' AS code, 'Xã Xuân Hưng' AS name, 'Xuân Hưng' AS short_name, 'Xuan Hung' AS name_en, '07726' AS postal_code, 'xuan_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14161' AS code, 'Xã Giao Minh' AS name, 'Giao Minh' AS short_name, 'Giao Minh' AS name_en, '07828' AS postal_code, 'giao_minh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14167' AS code, 'Xã Giao Thuỷ' AS name, 'Giao Thuỷ' AS short_name, 'Giao Thuy' AS name_en, '07806' AS postal_code, 'giao_thuy' AS slug
UNION ALL
       SELECT '37' AS province_code, '14179' AS code, 'Xã Giao Hưng' AS name, 'Giao Hưng' AS short_name, 'Giao Hung' AS name_en, '07831' AS postal_code, 'giao_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14182' AS code, 'Xã Giao Hoà' AS name, 'Giao Hoà' AS short_name, 'Giao Hoa' AS name_en, '07829' AS postal_code, 'giao_hoa' AS slug
UNION ALL
       SELECT '37' AS province_code, '14194' AS code, 'Xã Giao Bình' AS name, 'Giao Bình' AS short_name, 'Giao Binh' AS name_en, '07832' AS postal_code, 'giao_binh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14203' AS code, 'Xã Giao Phúc' AS name, 'Giao Phúc' AS short_name, 'Giao Phuc' AS name_en, '07830' AS postal_code, 'giao_phuc' AS slug
UNION ALL
       SELECT '37' AS province_code, '14212' AS code, 'Xã Giao Ninh' AS name, 'Giao Ninh' AS short_name, 'Giao Ninh' AS name_en, '07833' AS postal_code, 'giao_ninh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14215' AS code, 'Xã Hải Hậu' AS name, 'Hải Hậu' AS short_name, 'Hai Hau' AS name_en, '07941' AS postal_code, 'hai_hau' AS slug
UNION ALL
       SELECT '37' AS province_code, '14218' AS code, 'Xã Hải Tiến' AS name, 'Hải Tiến' AS short_name, 'Hai Tien' AS name_en, '07942' AS postal_code, 'hai_tien' AS slug
UNION ALL
       SELECT '37' AS province_code, '14221' AS code, 'Xã Hải Thịnh' AS name, 'Hải Thịnh' AS short_name, 'Hai Thinh' AS name_en, '07943' AS postal_code, 'hai_thinh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14236' AS code, 'Xã Hải Anh' AS name, 'Hải Anh' AS short_name, 'Hai Anh' AS name_en, '07915' AS postal_code, 'hai_anh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14248' AS code, 'Xã Hải Hưng' AS name, 'Hải Hưng' AS short_name, 'Hai Hung' AS name_en, '07912' AS postal_code, 'hai_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14281' AS code, 'Xã Hải An' AS name, 'Hải An' AS short_name, 'Hai An' AS name_en, '07920' AS postal_code, 'hai_an' AS slug
UNION ALL
       SELECT '37' AS province_code, '14287' AS code, 'Xã Hải Quang' AS name, 'Hải Quang' AS short_name, 'Hai Quang' AS name_en, '07937' AS postal_code, 'hai_quang' AS slug
UNION ALL
       SELECT '37' AS province_code, '14308' AS code, 'Xã Hải Xuân' AS name, 'Hải Xuân' AS short_name, 'Hai Xuan' AS name_en, '07929' AS postal_code, 'hai_xuan' AS slug
UNION ALL
       SELECT '37' AS province_code, '14329' AS code, 'Phường Hoa Lư' AS name, 'Hoa Lư' AS short_name, 'Hoa Lu' AS name_en, '08120' AS postal_code, 'hoa_lu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14359' AS code, 'Phường Nam Hoa Lư' AS name, 'Nam Hoa Lư' AS short_name, 'Nam Hoa Lu' AS name_en, '08123' AS postal_code, 'nam_hoa_lu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14362' AS code, 'Phường Tam Điệp' AS name, 'Tam Điệp' AS short_name, 'Tam Diep' AS name_en, '08515' AS postal_code, 'tam_diep' AS slug
UNION ALL
       SELECT '37' AS province_code, '14365' AS code, 'Phường Trung Sơn' AS name, 'Trung Sơn' AS short_name, 'Trung Son' AS name_en, '08507' AS postal_code, 'trung_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '14371' AS code, 'Phường Yên Sơn' AS name, 'Yên Sơn' AS short_name, 'Yen Son' AS name_en, '08510' AS postal_code, 'yen_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '14389' AS code, 'Xã Gia Lâm' AS name, 'Gia Lâm' AS short_name, 'Gia Lam' AS name_en, '08412' AS postal_code, 'gia_lam' AS slug
UNION ALL
       SELECT '37' AS province_code, '14401' AS code, 'Xã Gia Tường' AS name, 'Gia Tường' AS short_name, 'Gia Tuong' AS name_en, '08410' AS postal_code, 'gia_tuong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14404' AS code, 'Xã Cúc Phương' AS name, 'Cúc Phương' AS short_name, 'Cuc Phuong' AS name_en, '08429' AS postal_code, 'cuc_phuong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14407' AS code, 'Xã Phú Sơn' AS name, 'Phú Sơn' AS short_name, 'Phu Son' AS name_en, '08416' AS postal_code, 'phu_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '14428' AS code, 'Xã Nho Quan' AS name, 'Nho Quan' AS short_name, 'Nho Quan' AS name_en, '08406' AS postal_code, 'nho_quan' AS slug
UNION ALL
       SELECT '37' AS province_code, '14434' AS code, 'Xã Thanh Sơn' AS name, 'Thanh Sơn' AS short_name, 'Thanh Son' AS name_en, '08421' AS postal_code, 'thanh_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '14452' AS code, 'Xã Quỳnh Lưu' AS name, 'Quỳnh Lưu' AS short_name, 'Quynh Luu' AS name_en, '08425' AS postal_code, 'quynh_luu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14458' AS code, 'Xã Phú Long' AS name, 'Phú Long' AS short_name, 'Phu Long' AS name_en, '08431' AS postal_code, 'phu_long' AS slug
UNION ALL
       SELECT '37' AS province_code, '14464' AS code, 'Xã Gia Viễn' AS name, 'Gia Viễn' AS short_name, 'Gia Vien' AS name_en, '08327' AS postal_code, 'gia_vien' AS slug
UNION ALL
       SELECT '37' AS province_code, '14482' AS code, 'Xã Gia Hưng' AS name, 'Gia Hưng' AS short_name, 'Gia Hung' AS name_en, '08312' AS postal_code, 'gia_hung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14488' AS code, 'Xã Gia Vân' AS name, 'Gia Vân' AS short_name, 'Gia Van' AS name_en, '08310' AS postal_code, 'gia_van' AS slug
UNION ALL
       SELECT '37' AS province_code, '14494' AS code, 'Xã Gia Trấn' AS name, 'Gia Trấn' AS short_name, 'Gia Tran' AS name_en, '08308' AS postal_code, 'gia_tran' AS slug
UNION ALL
       SELECT '37' AS province_code, '14500' AS code, 'Xã Đại Hoàng' AS name, 'Đại Hoàng' AS short_name, 'Dai Hoang' AS name_en, '08328' AS postal_code, 'dai_hoang' AS slug
UNION ALL
       SELECT '37' AS province_code, '14524' AS code, 'Xã Gia Phong' AS name, 'Gia Phong' AS short_name, 'Gia Phong' AS name_en, '08325' AS postal_code, 'gia_phong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14533' AS code, 'Phường Tây Hoa Lư' AS name, 'Tây Hoa Lư' AS short_name, 'Tay Hoa Lu' AS name_en, '08122' AS postal_code, 'tay_hoa_lu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14560' AS code, 'Xã Yên Khánh' AS name, 'Yên Khánh' AS short_name, 'Yen Khanh' AS name_en, '08825' AS postal_code, 'yen_khanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14563' AS code, 'Xã Khánh Thiện' AS name, 'Khánh Thiện' AS short_name, 'Khanh Thien' AS name_en, '08808' AS postal_code, 'khanh_thien' AS slug
UNION ALL
       SELECT '37' AS province_code, '14566' AS code, 'Phường Đông Hoa Lư' AS name, 'Đông Hoa Lư' AS short_name, 'Dong Hoa Lu' AS name_en, '08121' AS postal_code, 'dong_hoa_lu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14608' AS code, 'Xã Khánh Trung' AS name, 'Khánh Trung' AS short_name, 'Khanh Trung' AS name_en, '08818' AS postal_code, 'khanh_trung' AS slug
UNION ALL
       SELECT '37' AS province_code, '14611' AS code, 'Xã Khánh Nhạc' AS name, 'Khánh Nhạc' AS short_name, 'Khanh Nhac' AS name_en, '08821' AS postal_code, 'khanh_nhac' AS slug
UNION ALL
       SELECT '37' AS province_code, '14614' AS code, 'Xã Khánh Hội' AS name, 'Khánh Hội' AS short_name, 'Khanh Hoi' AS name_en, '08819' AS postal_code, 'khanh_hoi' AS slug
UNION ALL
       SELECT '37' AS province_code, '14620' AS code, 'Xã Phát Diệm' AS name, 'Phát Diệm' AS short_name, 'Phat Diem' AS name_en, '08706' AS postal_code, 'phat_diem' AS slug
UNION ALL
       SELECT '37' AS province_code, '14623' AS code, 'Xã Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '08732' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14638' AS code, 'Xã Kim Sơn' AS name, 'Kim Sơn' AS short_name, 'Kim Son' AS name_en, '08733' AS postal_code, 'kim_son' AS slug
UNION ALL
       SELECT '37' AS province_code, '14647' AS code, 'Xã Quang Thiện' AS name, 'Quang Thiện' AS short_name, 'Quang Thien' AS name_en, '08708' AS postal_code, 'quang_thien' AS slug
UNION ALL
       SELECT '37' AS province_code, '14653' AS code, 'Xã Chất Bình' AS name, 'Chất Bình' AS short_name, 'Chat Binh' AS name_en, '08713' AS postal_code, 'chat_binh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14674' AS code, 'Xã Lai Thành' AS name, 'Lai Thành' AS short_name, 'Lai Thanh' AS name_en, '08723' AS postal_code, 'lai_thanh' AS slug
UNION ALL
       SELECT '37' AS province_code, '14677' AS code, 'Xã Định Hoá' AS name, 'Định Hoá' AS short_name, 'Dinh Hoa' AS name_en, '08724' AS postal_code, 'dinh_hoa' AS slug
UNION ALL
       SELECT '37' AS province_code, '14698' AS code, 'Xã Kim Đông' AS name, 'Kim Đông' AS short_name, 'Kim Dong' AS name_en, '08731' AS postal_code, 'kim_dong' AS slug
UNION ALL
       SELECT '37' AS province_code, '14701' AS code, 'Xã Yên Mô' AS name, 'Yên Mô' AS short_name, 'Yen Mo' AS name_en, '08623' AS postal_code, 'yen_mo' AS slug
UNION ALL
       SELECT '37' AS province_code, '14725' AS code, 'Phường Yên Thắng' AS name, 'Yên Thắng' AS short_name, 'Yen Thang' AS name_en, '08124' AS postal_code, 'yen_thang' AS slug
UNION ALL
       SELECT '37' AS province_code, '14728' AS code, 'Xã Yên Từ' AS name, 'Yên Từ' AS short_name, 'Yen Tu' AS name_en, '08615' AS postal_code, 'yen_tu' AS slug
UNION ALL
       SELECT '37' AS province_code, '14743' AS code, 'Xã Yên Mạc' AS name, 'Yên Mạc' AS short_name, 'Yen Mac' AS name_en, '08619' AS postal_code, 'yen_mac' AS slug
UNION ALL
       SELECT '37' AS province_code, '14746' AS code, 'Xã Đồng Thái' AS name, 'Đồng Thái' AS short_name, 'Dong Thai' AS name_en, '08624' AS postal_code, 'dong_thai' AS slug
UNION ALL
       SELECT '38' AS province_code, '14758' AS code, 'Phường Hàm Rồng' AS name, 'Hàm Rồng' AS short_name, 'Ham Rong' AS name_en, '40106' AS postal_code, 'ham_rong' AS slug
UNION ALL
       SELECT '38' AS province_code, '14797' AS code, 'Phường Hạc Thành' AS name, 'Hạc Thành' AS short_name, 'Hac Thanh' AS name_en, '40143' AS postal_code, 'hac_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '14812' AS code, 'Phường Bỉm Sơn' AS name, 'Bỉm Sơn' AS short_name, 'Bim Son' AS name_en, '40714' AS postal_code, 'bim_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '14818' AS code, 'Phường Quang Trung' AS name, 'Quang Trung' AS short_name, 'Quang Trung' AS name_en, '40710' AS postal_code, 'quang_trung' AS slug
UNION ALL
       SELECT '38' AS province_code, '14845' AS code, 'Xã Mường Lát' AS name, 'Mường Lát' AS short_name, 'Muong Lat' AS name_en, '42106' AS postal_code, 'muong_lat' AS slug
UNION ALL
       SELECT '38' AS province_code, '14848' AS code, 'Xã Tam Chung' AS name, 'Tam Chung' AS short_name, 'Tam Chung' AS name_en, '42109' AS postal_code, 'tam_chung' AS slug
UNION ALL
       SELECT '38' AS province_code, '14854' AS code, 'Xã Mường Lý' AS name, 'Mường Lý' AS short_name, 'Muong Ly' AS name_en, '42108' AS postal_code, 'muong_ly' AS slug
UNION ALL
       SELECT '38' AS province_code, '14857' AS code, 'Xã Trung Lý' AS name, 'Trung Lý' AS short_name, 'Trung Ly' AS name_en, '42107' AS postal_code, 'trung_ly' AS slug
UNION ALL
       SELECT '38' AS province_code, '14860' AS code, 'Xã Quang Chiểu' AS name, 'Quang Chiểu' AS short_name, 'Quang Chieu' AS name_en, '42113' AS postal_code, 'quang_chieu' AS slug
UNION ALL
       SELECT '38' AS province_code, '14863' AS code, 'Xã Pù Nhi' AS name, 'Pù Nhi' AS short_name, 'Pu Nhi' AS name_en, '42112' AS postal_code, 'pu_nhi' AS slug
UNION ALL
       SELECT '38' AS province_code, '14864' AS code, 'Xã Nhi Sơn' AS name, 'Nhi Sơn' AS short_name, 'Nhi Son' AS name_en, '42111' AS postal_code, 'nhi_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '14866' AS code, 'Xã Mường Chanh' AS name, 'Mường Chanh' AS short_name, 'Muong Chanh' AS name_en, '42114' AS postal_code, 'muong_chanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '14869' AS code, 'Xã Hồi Xuân' AS name, 'Hồi Xuân' AS short_name, 'Hoi Xuan' AS name_en, '41906' AS postal_code, 'hoi_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '14872' AS code, 'Xã Trung Thành' AS name, 'Trung Thành' AS short_name, 'Trung Thanh' AS name_en, '41921' AS postal_code, 'trung_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '14875' AS code, 'Xã Trung Sơn' AS name, 'Trung Sơn' AS short_name, 'Trung Son' AS name_en, '41923' AS postal_code, 'trung_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '14878' AS code, 'Xã Phú Lệ' AS name, 'Phú Lệ' AS short_name, 'Phu Le' AS name_en, '41918' AS postal_code, 'phu_le' AS slug
UNION ALL
       SELECT '38' AS province_code, '14890' AS code, 'Xã Phú Xuân' AS name, 'Phú Xuân' AS short_name, 'Phu Xuan' AS name_en, '41917' AS postal_code, 'phu_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '14896' AS code, 'Xã Hiền Kiệt' AS name, 'Hiền Kiệt' AS short_name, 'Hien Kiet' AS name_en, '41913' AS postal_code, 'hien_kiet' AS slug
UNION ALL
       SELECT '38' AS province_code, '14902' AS code, 'Xã Nam Xuân' AS name, 'Nam Xuân' AS short_name, 'Nam Xuan' AS name_en, '41910' AS postal_code, 'nam_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '14908' AS code, 'Xã Thiên Phủ' AS name, 'Thiên Phủ' AS short_name, 'Thien Phu' AS name_en, '41912' AS postal_code, 'thien_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '14923' AS code, 'Xã Bá Thước' AS name, 'Bá Thước' AS short_name, 'Ba Thuoc' AS name_en, '41429' AS postal_code, 'ba_thuoc' AS slug
UNION ALL
       SELECT '38' AS province_code, '14932' AS code, 'Xã Điền Quang' AS name, 'Điền Quang' AS short_name, 'Dien Quang' AS name_en, '41424' AS postal_code, 'dien_quang' AS slug
UNION ALL
       SELECT '38' AS province_code, '14950' AS code, 'Xã Điền Lư' AS name, 'Điền Lư' AS short_name, 'Dien Lu' AS name_en, '41419' AS postal_code, 'dien_lu' AS slug
UNION ALL
       SELECT '38' AS province_code, '14953' AS code, 'Xã Quý Lương' AS name, 'Quý Lương' AS short_name, 'Quy Luong' AS name_en, '41430' AS postal_code, 'quy_luong' AS slug
UNION ALL
       SELECT '38' AS province_code, '14956' AS code, 'Xã Pù Luông' AS name, 'Pù Luông' AS short_name, 'Pu Luong' AS name_en, '41431' AS postal_code, 'pu_luong' AS slug
UNION ALL
       SELECT '38' AS province_code, '14959' AS code, 'Xã Cổ Lũng' AS name, 'Cổ Lũng' AS short_name, 'Co Lung' AS name_en, '41412' AS postal_code, 'co_lung' AS slug
UNION ALL
       SELECT '38' AS province_code, '14974' AS code, 'Xã Văn Nho' AS name, 'Văn Nho' AS short_name, 'Van Nho' AS name_en, '41428' AS postal_code, 'van_nho' AS slug
UNION ALL
       SELECT '38' AS province_code, '14980' AS code, 'Xã Thiết Ống' AS name, 'Thiết Ống' AS short_name, 'Thiet Ong' AS name_en, '41425' AS postal_code, 'thiet_ong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15001' AS code, 'Xã Trung Hạ' AS name, 'Trung Hạ' AS short_name, 'Trung Ha' AS name_en, '42009' AS postal_code, 'trung_ha' AS slug
UNION ALL
       SELECT '38' AS province_code, '15007' AS code, 'Xã Tam Thanh' AS name, 'Tam Thanh' AS short_name, 'Tam Thanh' AS name_en, '42014' AS postal_code, 'tam_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15010' AS code, 'Xã Sơn Thuỷ' AS name, 'Sơn Thuỷ' AS short_name, 'Son Thuy' AS name_en, '42018' AS postal_code, 'son_thuy' AS slug
UNION ALL
       SELECT '38' AS province_code, '15013' AS code, 'Xã Na Mèo' AS name, 'Na Mèo' AS short_name, 'Na Meo' AS name_en, '42017' AS postal_code, 'na_meo' AS slug
UNION ALL
       SELECT '38' AS province_code, '15016' AS code, 'Xã Quan Sơn' AS name, 'Quan Sơn' AS short_name, 'Quan Son' AS name_en, '42019' AS postal_code, 'quan_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15019' AS code, 'Xã Tam Lư' AS name, 'Tam Lư' AS short_name, 'Tam Lu' AS name_en, '42012' AS postal_code, 'tam_lu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15022' AS code, 'Xã Sơn Điện' AS name, 'Sơn Điện' AS short_name, 'Son Dien' AS name_en, '42015' AS postal_code, 'son_dien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15025' AS code, 'Xã Mường Mìn' AS name, 'Mường Mìn' AS short_name, 'Muong Min' AS name_en, '42016' AS postal_code, 'muong_min' AS slug
UNION ALL
       SELECT '38' AS province_code, '15031' AS code, 'Xã Yên Khương' AS name, 'Yên Khương' AS short_name, 'Yen Khuong' AS name_en, '41812' AS postal_code, 'yen_khuong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15034' AS code, 'Xã Yên Thắng' AS name, 'Yên Thắng' AS short_name, 'Yen Thang' AS name_en, '41813' AS postal_code, 'yen_thang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15043' AS code, 'Xã Giao An' AS name, 'Giao An' AS short_name, 'Giao An' AS name_en, '41815' AS postal_code, 'giao_an' AS slug
UNION ALL
       SELECT '38' AS province_code, '15049' AS code, 'Xã Văn Phú' AS name, 'Văn Phú' AS short_name, 'Van Phu' AS name_en, '41818' AS postal_code, 'van_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15055' AS code, 'Xã Linh Sơn' AS name, 'Linh Sơn' AS short_name, 'Linh Son' AS name_en, '41817' AS postal_code, 'linh_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15058' AS code, 'Xã Đồng Lương' AS name, 'Đồng Lương' AS short_name, 'Dong Luong' AS name_en, '41807' AS postal_code, 'dong_luong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15061' AS code, 'Xã Ngọc Lặc' AS name, 'Ngọc Lặc' AS short_name, 'Ngoc Lac' AS name_en, '41706' AS postal_code, 'ngoc_lac' AS slug
UNION ALL
       SELECT '38' AS province_code, '15085' AS code, 'Xã Thạch Lập' AS name, 'Thạch Lập' AS short_name, 'Thach Lap' AS name_en, '41716' AS postal_code, 'thach_lap' AS slug
UNION ALL
       SELECT '38' AS province_code, '15091' AS code, 'Xã Ngọc Liên' AS name, 'Ngọc Liên' AS short_name, 'Ngoc Lien' AS name_en, '41712' AS postal_code, 'ngoc_lien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15106' AS code, 'Xã Nguyệt Ấn' AS name, 'Nguyệt Ấn' AS short_name, 'Nguyet An' AS name_en, '41723' AS postal_code, 'nguyet_an' AS slug
UNION ALL
       SELECT '38' AS province_code, '15112' AS code, 'Xã Kiên Thọ' AS name, 'Kiên Thọ' AS short_name, 'Kien Tho' AS name_en, '41727' AS postal_code, 'kien_tho' AS slug
UNION ALL
       SELECT '38' AS province_code, '15124' AS code, 'Xã Minh Sơn' AS name, 'Minh Sơn' AS short_name, 'Minh Son' AS name_en, '41720' AS postal_code, 'minh_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15127' AS code, 'Xã Cẩm Thuỷ' AS name, 'Cẩm Thuỷ' AS short_name, 'Cam Thuy' AS name_en, '41326' AS postal_code, 'cam_thuy' AS slug
UNION ALL
       SELECT '38' AS province_code, '15142' AS code, 'Xã Cẩm Thạch' AS name, 'Cẩm Thạch' AS short_name, 'Cam Thach' AS name_en, '41314' AS postal_code, 'cam_thach' AS slug
UNION ALL
       SELECT '38' AS province_code, '15148' AS code, 'Xã Cẩm Tú' AS name, 'Cẩm Tú' AS short_name, 'Cam Tu' AS name_en, '41309' AS postal_code, 'cam_tu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15163' AS code, 'Xã Cẩm Vân' AS name, 'Cẩm Vân' AS short_name, 'Cam Van' AS name_en, '41325' AS postal_code, 'cam_van' AS slug
UNION ALL
       SELECT '38' AS province_code, '15178' AS code, 'Xã Cẩm Tân' AS name, 'Cẩm Tân' AS short_name, 'Cam Tan' AS name_en, '41323' AS postal_code, 'cam_tan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15187' AS code, 'Xã Kim Tân' AS name, 'Kim Tân' AS short_name, 'Kim Tan' AS name_en, '41206' AS postal_code, 'kim_tan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15190' AS code, 'Xã Vân Du' AS name, 'Vân Du' AS short_name, 'Van Du' AS name_en, '41207' AS postal_code, 'van_du' AS slug
UNION ALL
       SELECT '38' AS province_code, '15199' AS code, 'Xã Thạch Quảng' AS name, 'Thạch Quảng' AS short_name, 'Thach Quang' AS name_en, '41218' AS postal_code, 'thach_quang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15211' AS code, 'Xã Thạch Bình' AS name, 'Thạch Bình' AS short_name, 'Thach Binh' AS name_en, '41221' AS postal_code, 'thach_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15229' AS code, 'Xã Thành Vinh' AS name, 'Thành Vinh' AS short_name, 'Thanh Vinh' AS name_en, '41213' AS postal_code, 'thanh_vinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15250' AS code, 'Xã Ngọc Trạo' AS name, 'Ngọc Trạo' AS short_name, 'Ngoc Trao' AS name_en, '41233' AS postal_code, 'ngoc_trao' AS slug
UNION ALL
       SELECT '38' AS province_code, '15271' AS code, 'Xã Hà Trung' AS name, 'Hà Trung' AS short_name, 'Ha Trung' AS name_en, '40606' AS postal_code, 'ha_trung' AS slug
UNION ALL
       SELECT '38' AS province_code, '15274' AS code, 'Xã Hà Long' AS name, 'Hà Long' AS short_name, 'Ha Long' AS name_en, '40623' AS postal_code, 'ha_long' AS slug
UNION ALL
       SELECT '38' AS province_code, '15286' AS code, 'Xã Hoạt Giang' AS name, 'Hoạt Giang' AS short_name, 'Hoat Giang' AS name_en, '40610' AS postal_code, 'hoat_giang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15298' AS code, 'Xã Lĩnh Toại' AS name, 'Lĩnh Toại' AS short_name, 'Linh Toai' AS name_en, '40618' AS postal_code, 'linh_toai' AS slug
UNION ALL
       SELECT '38' AS province_code, '15316' AS code, 'Xã Tống Sơn' AS name, 'Tống Sơn' AS short_name, 'Tong Son' AS name_en, '40631' AS postal_code, 'tong_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15349' AS code, 'Xã Vĩnh Lộc' AS name, 'Vĩnh Lộc' AS short_name, 'Vinh Loc' AS name_en, '41106' AS postal_code, 'vinh_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '15361' AS code, 'Xã Tây Đô' AS name, 'Tây Đô' AS short_name, 'Tay Do' AS name_en, '41122' AS postal_code, 'tay_do' AS slug
UNION ALL
       SELECT '38' AS province_code, '15382' AS code, 'Xã Biện Thượng' AS name, 'Biện Thượng' AS short_name, 'Bien Thuong' AS name_en, '41123' AS postal_code, 'bien_thuong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15409' AS code, 'Xã Yên Phú' AS name, 'Yên Phú' AS short_name, 'Yen Phu' AS name_en, '41027' AS postal_code, 'yen_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15412' AS code, 'Xã Quý Lộc' AS name, 'Quý Lộc' AS short_name, 'Quy Loc' AS name_en, '41032' AS postal_code, 'quy_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '15421' AS code, 'Xã Yên Trường' AS name, 'Yên Trường' AS short_name, 'Yen Truong' AS name_en, '41025' AS postal_code, 'yen_truong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15442' AS code, 'Xã Yên Ninh' AS name, 'Yên Ninh' AS short_name, 'Yen Ninh' AS name_en, '41020' AS postal_code, 'yen_ninh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15448' AS code, 'Xã Định Hoà' AS name, 'Định Hoà' AS short_name, 'Dinh Hoa' AS name_en, '41015' AS postal_code, 'dinh_hoa' AS slug
UNION ALL
       SELECT '38' AS province_code, '15457' AS code, 'Xã Định Tân' AS name, 'Định Tân' AS short_name, 'Dinh Tan' AS name_en, '41009' AS postal_code, 'dinh_tan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15469' AS code, 'Xã Yên Định' AS name, 'Yên Định' AS short_name, 'Yen Dinh' AS name_en, '41035' AS postal_code, 'yen_dinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15499' AS code, 'Xã Thọ Xuân' AS name, 'Thọ Xuân' AS short_name, 'Tho Xuan' AS name_en, '41606' AS postal_code, 'tho_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15505' AS code, 'Xã Thọ Long' AS name, 'Thọ Long' AS short_name, 'Tho Long' AS name_en, '41647' AS postal_code, 'tho_long' AS slug
UNION ALL
       SELECT '38' AS province_code, '15520' AS code, 'Xã Xuân Hoà' AS name, 'Xuân Hoà' AS short_name, 'Xuan Hoa' AS name_en, '41613' AS postal_code, 'xuan_hoa' AS slug
UNION ALL
       SELECT '38' AS province_code, '15544' AS code, 'Xã Lam Sơn' AS name, 'Lam Sơn' AS short_name, 'Lam Son' AS name_en, '41628' AS postal_code, 'lam_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15553' AS code, 'Xã Sao Vàng' AS name, 'Sao Vàng' AS short_name, 'Sao Vang' AS name_en, '41629' AS postal_code, 'sao_vang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15568' AS code, 'Xã Thọ Lập' AS name, 'Thọ Lập' AS short_name, 'Tho Lap' AS name_en, '41621' AS postal_code, 'tho_lap' AS slug
UNION ALL
       SELECT '38' AS province_code, '15574' AS code, 'Xã Xuân Tín' AS name, 'Xuân Tín' AS short_name, 'Xuan Tin' AS name_en, '41620' AS postal_code, 'xuan_tin' AS slug
UNION ALL
       SELECT '38' AS province_code, '15592' AS code, 'Xã Xuân Lập' AS name, 'Xuân Lập' AS short_name, 'Xuan Lap' AS name_en, '41616' AS postal_code, 'xuan_lap' AS slug
UNION ALL
       SELECT '38' AS province_code, '15607' AS code, 'Xã Bát Mọt' AS name, 'Bát Mọt' AS short_name, 'Bat Mot' AS name_en, '42212' AS postal_code, 'bat_mot' AS slug
UNION ALL
       SELECT '38' AS province_code, '15610' AS code, 'Xã Yên Nhân' AS name, 'Yên Nhân' AS short_name, 'Yen Nhan' AS name_en, '42211' AS postal_code, 'yen_nhan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15622' AS code, 'Xã Vạn Xuân' AS name, 'Vạn Xuân' AS short_name, 'Van Xuan' AS name_en, '42213' AS postal_code, 'van_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15628' AS code, 'Xã Lương Sơn' AS name, 'Lương Sơn' AS short_name, 'Luong Son' AS name_en, '42210' AS postal_code, 'luong_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15634' AS code, 'Xã Luận Thành' AS name, 'Luận Thành' AS short_name, 'Luan Thanh' AS name_en, '42220' AS postal_code, 'luan_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15643' AS code, 'Xã Thắng Lộc' AS name, 'Thắng Lộc' AS short_name, 'Thang Loc' AS name_en, '42223' AS postal_code, 'thang_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '15646' AS code, 'Xã Thường Xuân' AS name, 'Thường Xuân' AS short_name, 'Thuong Xuan' AS name_en, '42206' AS postal_code, 'thuong_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15658' AS code, 'Xã Xuân Chinh' AS name, 'Xuân Chinh' AS short_name, 'Xuan Chinh' AS name_en, '42217' AS postal_code, 'xuan_chinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15661' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '42221' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15664' AS code, 'Xã Triệu Sơn' AS name, 'Triệu Sơn' AS short_name, 'Trieu Son' AS name_en, '41506' AS postal_code, 'trieu_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15667' AS code, 'Xã Thọ Bình' AS name, 'Thọ Bình' AS short_name, 'Tho Binh' AS name_en, '41524' AS postal_code, 'tho_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15682' AS code, 'Xã Hợp Tiến' AS name, 'Hợp Tiến' AS short_name, 'Hop Tien' AS name_en, '41526' AS postal_code, 'hop_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15715' AS code, 'Xã Tân Ninh' AS name, 'Tân Ninh' AS short_name, 'Tan Ninh' AS name_en, '41542' AS postal_code, 'tan_ninh' AS slug
UNION ALL
       SELECT '38' AS province_code, '15724' AS code, 'Xã Đồng Tiến' AS name, 'Đồng Tiến' AS short_name, 'Dong Tien' AS name_en, '41540' AS postal_code, 'dong_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15754' AS code, 'Xã Thọ Ngọc' AS name, 'Thọ Ngọc' AS short_name, 'Tho Ngoc' AS name_en, '41519' AS postal_code, 'tho_ngoc' AS slug
UNION ALL
       SELECT '38' AS province_code, '15763' AS code, 'Xã Thọ Phú' AS name, 'Thọ Phú' AS short_name, 'Tho Phu' AS name_en, '41513' AS postal_code, 'tho_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15766' AS code, 'Xã An Nông' AS name, 'An Nông' AS short_name, 'An Nong' AS name_en, '41532' AS postal_code, 'an_nong' AS slug
UNION ALL
       SELECT '38' AS province_code, '15772' AS code, 'Xã Thiệu Hoá' AS name, 'Thiệu Hoá' AS short_name, 'Thieu Hoa' AS name_en, '40934' AS postal_code, 'thieu_hoa' AS slug
UNION ALL
       SELECT '38' AS province_code, '15778' AS code, 'Xã Thiệu Tiến' AS name, 'Thiệu Tiến' AS short_name, 'Thieu Tien' AS name_en, '40921' AS postal_code, 'thieu_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15796' AS code, 'Xã Thiệu Quang' AS name, 'Thiệu Quang' AS short_name, 'Thieu Quang' AS name_en, '40911' AS postal_code, 'thieu_quang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15820' AS code, 'Xã Thiệu Toán' AS name, 'Thiệu Toán' AS short_name, 'Thieu Toan' AS name_en, '40922' AS postal_code, 'thieu_toan' AS slug
UNION ALL
       SELECT '38' AS province_code, '15835' AS code, 'Xã Thiệu Trung' AS name, 'Thiệu Trung' AS short_name, 'Thieu Trung' AS name_en, '40931' AS postal_code, 'thieu_trung' AS slug
UNION ALL
       SELECT '38' AS province_code, '15853' AS code, 'Phường Đông Tiến' AS name, 'Đông Tiến' AS short_name, 'Dong Tien' AS name_en, '40807' AS postal_code, 'dong_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15865' AS code, 'Xã Hoằng Hoá' AS name, 'Hoằng Hoá' AS short_name, 'Hoang Hoa' AS name_en, '40349' AS postal_code, 'hoang_hoa' AS slug
UNION ALL
       SELECT '38' AS province_code, '15880' AS code, 'Xã Hoằng Giang' AS name, 'Hoằng Giang' AS short_name, 'Hoang Giang' AS name_en, '40332' AS postal_code, 'hoang_giang' AS slug
UNION ALL
       SELECT '38' AS province_code, '15889' AS code, 'Xã Hoằng Phú' AS name, 'Hoằng Phú' AS short_name, 'Hoang Phu' AS name_en, '40331' AS postal_code, 'hoang_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '15910' AS code, 'Xã Hoằng Sơn' AS name, 'Hoằng Sơn' AS short_name, 'Hoang Son' AS name_en, '40323' AS postal_code, 'hoang_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '15925' AS code, 'Phường Nguyệt Viên' AS name, 'Nguyệt Viên' AS short_name, 'Nguyet Vien' AS name_en, '40145' AS postal_code, 'nguyet_vien' AS slug
UNION ALL
       SELECT '38' AS province_code, '15961' AS code, 'Xã Hoằng Lộc' AS name, 'Hoằng Lộc' AS short_name, 'Hoang Loc' AS name_en, '40340' AS postal_code, 'hoang_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '15976' AS code, 'Xã Hoằng Châu' AS name, 'Hoằng Châu' AS short_name, 'Hoang Chau' AS name_en, '40348' AS postal_code, 'hoang_chau' AS slug
UNION ALL
       SELECT '38' AS province_code, '15991' AS code, 'Xã Hoằng Tiến' AS name, 'Hoằng Tiến' AS short_name, 'Hoang Tien' AS name_en, '40312' AS postal_code, 'hoang_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '16000' AS code, 'Xã Hoằng Thanh' AS name, 'Hoằng Thanh' AS short_name, 'Hoang Thanh' AS name_en, '40311' AS postal_code, 'hoang_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16012' AS code, 'Xã Hậu Lộc' AS name, 'Hậu Lộc' AS short_name, 'Hau Loc' AS name_en, '40406' AS postal_code, 'hau_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '16021' AS code, 'Xã Triệu Lộc' AS name, 'Triệu Lộc' AS short_name, 'Trieu Loc' AS name_en, '40426' AS postal_code, 'trieu_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '16033' AS code, 'Xã Đông Thành' AS name, 'Đông Thành' AS short_name, 'Dong Thanh' AS name_en, '40433' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16072' AS code, 'Xã Hoa Lộc' AS name, 'Hoa Lộc' AS short_name, 'Hoa Loc' AS name_en, '40413' AS postal_code, 'hoa_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '16078' AS code, 'Xã Vạn Lộc' AS name, 'Vạn Lộc' AS short_name, 'Van Loc' AS name_en, '40434' AS postal_code, 'van_loc' AS slug
UNION ALL
       SELECT '38' AS province_code, '16093' AS code, 'Xã Nga Sơn' AS name, 'Nga Sơn' AS short_name, 'Nga Son' AS name_en, '40506' AS postal_code, 'nga_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16108' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '40534' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '38' AS province_code, '16114' AS code, 'Xã Nga Thắng' AS name, 'Nga Thắng' AS short_name, 'Nga Thang' AS name_en, '40522' AS postal_code, 'nga_thang' AS slug
UNION ALL
       SELECT '38' AS province_code, '16138' AS code, 'Xã Hồ Vương' AS name, 'Hồ Vương' AS short_name, 'Ho Vuong' AS name_en, '40533' AS postal_code, 'ho_vuong' AS slug
UNION ALL
       SELECT '38' AS province_code, '16144' AS code, 'Xã Nga An' AS name, 'Nga An' AS short_name, 'Nga An' AS name_en, '40511' AS postal_code, 'nga_an' AS slug
UNION ALL
       SELECT '38' AS province_code, '16171' AS code, 'Xã Ba Đình' AS name, 'Ba Đình' AS short_name, 'Ba Dinh' AS name_en, '40519' AS postal_code, 'ba_dinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16174' AS code, 'Xã Như Xuân' AS name, 'Như Xuân' AS short_name, 'Nhu Xuan' AS name_en, '42524' AS postal_code, 'nhu_xuan' AS slug
UNION ALL
       SELECT '38' AS province_code, '16177' AS code, 'Xã Xuân Bình' AS name, 'Xuân Bình' AS short_name, 'Xuan Binh' AS name_en, '42522' AS postal_code, 'xuan_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16186' AS code, 'Xã Hoá Quỳ' AS name, 'Hoá Quỳ' AS short_name, 'Hoa Quy' AS name_en, '42511' AS postal_code, 'hoa_quy' AS slug
UNION ALL
       SELECT '38' AS province_code, '16213' AS code, 'Xã Thanh Phong' AS name, 'Thanh Phong' AS short_name, 'Thanh Phong' AS name_en, '42516' AS postal_code, 'thanh_phong' AS slug
UNION ALL
       SELECT '38' AS province_code, '16222' AS code, 'Xã Thanh Quân' AS name, 'Thanh Quân' AS short_name, 'Thanh Quan' AS name_en, '42515' AS postal_code, 'thanh_quan' AS slug
UNION ALL
       SELECT '38' AS province_code, '16225' AS code, 'Xã Thượng Ninh' AS name, 'Thượng Ninh' AS short_name, 'Thuong Ninh' AS name_en, '42509' AS postal_code, 'thuong_ninh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16228' AS code, 'Xã Như Thanh' AS name, 'Như Thanh' AS short_name, 'Nhu Thanh' AS name_en, '42423' AS postal_code, 'nhu_thanh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16234' AS code, 'Xã Xuân Du' AS name, 'Xuân Du' AS short_name, 'Xuan Du' AS name_en, '42410' AS postal_code, 'xuan_du' AS slug
UNION ALL
       SELECT '38' AS province_code, '16249' AS code, 'Xã Mậu Lâm' AS name, 'Mậu Lâm' AS short_name, 'Mau Lam' AS name_en, '42408' AS postal_code, 'mau_lam' AS slug
UNION ALL
       SELECT '38' AS province_code, '16258' AS code, 'Xã Xuân Thái' AS name, 'Xuân Thái' AS short_name, 'Xuan Thai' AS name_en, '42416' AS postal_code, 'xuan_thai' AS slug
UNION ALL
       SELECT '38' AS province_code, '16264' AS code, 'Xã Yên Thọ' AS name, 'Yên Thọ' AS short_name, 'Yen Tho' AS name_en, '42418' AS postal_code, 'yen_tho' AS slug
UNION ALL
       SELECT '38' AS province_code, '16273' AS code, 'Xã Thanh Kỳ' AS name, 'Thanh Kỳ' AS short_name, 'Thanh Ky' AS name_en, '42422' AS postal_code, 'thanh_ky' AS slug
UNION ALL
       SELECT '38' AS province_code, '16279' AS code, 'Xã Nông Cống' AS name, 'Nông Cống' AS short_name, 'Nong Cong' AS name_en, '42306' AS postal_code, 'nong_cong' AS slug
UNION ALL
       SELECT '38' AS province_code, '16297' AS code, 'Xã Trung Chính' AS name, 'Trung Chính' AS short_name, 'Trung Chinh' AS name_en, '42324' AS postal_code, 'trung_chinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16309' AS code, 'Xã Thắng Lợi' AS name, 'Thắng Lợi' AS short_name, 'Thang Loi' AS name_en, '42338' AS postal_code, 'thang_loi' AS slug
UNION ALL
       SELECT '38' AS province_code, '16342' AS code, 'Xã Thăng Bình' AS name, 'Thăng Bình' AS short_name, 'Thang Binh' AS name_en, '42328' AS postal_code, 'thang_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16348' AS code, 'Xã Trường Văn' AS name, 'Trường Văn' AS short_name, 'Truong Van' AS name_en, '42339' AS postal_code, 'truong_van' AS slug
UNION ALL
       SELECT '38' AS province_code, '16363' AS code, 'Xã Tượng Lĩnh' AS name, 'Tượng Lĩnh' AS short_name, 'Tuong Linh' AS name_en, '42332' AS postal_code, 'tuong_linh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16369' AS code, 'Xã Công Chính' AS name, 'Công Chính' AS short_name, 'Cong Chinh' AS name_en, '42335' AS postal_code, 'cong_chinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16378' AS code, 'Phường Đông Sơn' AS name, 'Đông Sơn' AS short_name, 'Dong Son' AS name_en, '40144' AS postal_code, 'dong_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16417' AS code, 'Phường Đông Quang' AS name, 'Đông Quang' AS short_name, 'Dong Quang' AS name_en, '40819' AS postal_code, 'dong_quang' AS slug
UNION ALL
       SELECT '38' AS province_code, '16438' AS code, 'Xã Lưu Vệ' AS name, 'Lưu Vệ' AS short_name, 'Luu Ve' AS name_en, '42636' AS postal_code, 'luu_ve' AS slug
UNION ALL
       SELECT '38' AS province_code, '16480' AS code, 'Xã Quảng Yên' AS name, 'Quảng Yên' AS short_name, 'Quang Yen' AS name_en, '42614' AS postal_code, 'quang_yen' AS slug
UNION ALL
       SELECT '38' AS province_code, '16489' AS code, 'Xã Quảng Chính' AS name, 'Quảng Chính' AS short_name, 'Quang Chinh' AS name_en, '42633' AS postal_code, 'quang_chinh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16498' AS code, 'Xã Quảng Ngọc' AS name, 'Quảng Ngọc' AS short_name, 'Quang Ngoc' AS name_en, '42623' AS postal_code, 'quang_ngoc' AS slug
UNION ALL
       SELECT '38' AS province_code, '16516' AS code, 'Phường Nam Sầm Sơn' AS name, 'Nam Sầm Sơn' AS short_name, 'Nam Sam Son' AS name_en, '40218' AS postal_code, 'nam_sam_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16522' AS code, 'Phường Quảng Phú' AS name, 'Quảng Phú' AS short_name, 'Quang Phu' AS name_en, '40140' AS postal_code, 'quang_phu' AS slug
UNION ALL
       SELECT '38' AS province_code, '16531' AS code, 'Phường Sầm Sơn' AS name, 'Sầm Sơn' AS short_name, 'Sam Son' AS name_en, '40217' AS postal_code, 'sam_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16540' AS code, 'Xã Quảng Ninh' AS name, 'Quảng Ninh' AS short_name, 'Quang Ninh' AS name_en, '42617' AS postal_code, 'quang_ninh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16543' AS code, 'Xã Quảng Bình' AS name, 'Quảng Bình' AS short_name, 'Quang Binh' AS name_en, '42621' AS postal_code, 'quang_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16549' AS code, 'Xã Tiên Trang' AS name, 'Tiên Trang' AS short_name, 'Tien Trang' AS name_en, '42627' AS postal_code, 'tien_trang' AS slug
UNION ALL
       SELECT '38' AS province_code, '16561' AS code, 'Phường Tĩnh Gia' AS name, 'Tĩnh Gia' AS short_name, 'Tinh Gia' AS name_en, '42741' AS postal_code, 'tinh_gia' AS slug
UNION ALL
       SELECT '38' AS province_code, '16576' AS code, 'Phường Ngọc Sơn' AS name, 'Ngọc Sơn' AS short_name, 'Ngoc Son' AS name_en, '42740' AS postal_code, 'ngoc_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16591' AS code, 'Xã Các Sơn' AS name, 'Các Sơn' AS short_name, 'Cac Son' AS name_en, '42722' AS postal_code, 'cac_son' AS slug
UNION ALL
       SELECT '38' AS province_code, '16594' AS code, 'Phường Tân Dân' AS name, 'Tân Dân' AS short_name, 'Tan Dan' AS name_en, '42712' AS postal_code, 'tan_dan' AS slug
UNION ALL
       SELECT '38' AS province_code, '16597' AS code, 'Phường Hải Lĩnh' AS name, 'Hải Lĩnh' AS short_name, 'Hai Linh' AS name_en, '42711' AS postal_code, 'hai_linh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16609' AS code, 'Phường Đào Duy Từ' AS name, 'Đào Duy Từ' AS short_name, 'Dao Duy Tu' AS name_en, '42742' AS postal_code, 'dao_duy_tu' AS slug
UNION ALL
       SELECT '38' AS province_code, '16624' AS code, 'Phường Trúc Lâm' AS name, 'Trúc Lâm' AS short_name, 'Truc Lam' AS name_en, '42730' AS postal_code, 'truc_lam' AS slug
UNION ALL
       SELECT '38' AS province_code, '16636' AS code, 'Xã Trường Lâm' AS name, 'Trường Lâm' AS short_name, 'Truong Lam' AS name_en, '42736' AS postal_code, 'truong_lam' AS slug
UNION ALL
       SELECT '38' AS province_code, '16645' AS code, 'Phường Hải Bình' AS name, 'Hải Bình' AS short_name, 'Hai Binh' AS name_en, '42727' AS postal_code, 'hai_binh' AS slug
UNION ALL
       SELECT '38' AS province_code, '16654' AS code, 'Phường Nghi Sơn' AS name, 'Nghi Sơn' AS short_name, 'Nghi Son' AS name_en, '42739' AS postal_code, 'nghi_son' AS slug
UNION ALL
       SELECT '40' AS province_code, '16681' AS code, 'Phường Thành Vinh' AS name, 'Thành Vinh' AS short_name, 'Thanh Vinh' AS name_en, '43132' AS postal_code, 'thanh_vinh' AS slug
UNION ALL
       SELECT '40' AS province_code, '16690' AS code, 'Phường Trường Vinh' AS name, 'Trường Vinh' AS short_name, 'Truong Vinh' AS name_en, '43131' AS postal_code, 'truong_vinh' AS slug
UNION ALL
       SELECT '40' AS province_code, '16702' AS code, 'Phường Vinh Phú' AS name, 'Vinh Phú' AS short_name, 'Vinh Phu' AS name_en, '43134' AS postal_code, 'vinh_phu' AS slug
UNION ALL
       SELECT '40' AS province_code, '16708' AS code, 'Phường Vinh Lộc' AS name, 'Vinh Lộc' AS short_name, 'Vinh Loc' AS name_en, '43135' AS postal_code, 'vinh_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '16732' AS code, 'Phường Cửa Lò' AS name, 'Cửa Lò' AS short_name, 'Cua Lo' AS name_en, '43136' AS postal_code, 'cua_lo' AS slug
UNION ALL
       SELECT '40' AS province_code, '16738' AS code, 'Xã Quế Phong' AS name, 'Quế Phong' AS short_name, 'Que Phong' AS name_en, '44070' AS postal_code, 'que_phong' AS slug
UNION ALL
       SELECT '40' AS province_code, '16744' AS code, 'Xã Thông Thụ' AS name, 'Thông Thụ' AS short_name, 'Thong Thu' AS name_en, '44066' AS postal_code, 'thong_thu' AS slug
UNION ALL
       SELECT '40' AS province_code, '16750' AS code, 'Xã Tiền Phong' AS name, 'Tiền Phong' AS short_name, 'Tien Phong' AS name_en, '44064' AS postal_code, 'tien_phong' AS slug
UNION ALL
       SELECT '40' AS province_code, '16756' AS code, 'Xã Tri Lễ' AS name, 'Tri Lễ' AS short_name, 'Tri Le' AS name_en, '44069' AS postal_code, 'tri_le' AS slug
UNION ALL
       SELECT '40' AS province_code, '16774' AS code, 'Xã Mường Quàng' AS name, 'Mường Quàng' AS short_name, 'Muong Quang' AS name_en, '44071' AS postal_code, 'muong_quang' AS slug
UNION ALL
       SELECT '40' AS province_code, '16777' AS code, 'Xã Quỳ Châu' AS name, 'Quỳ Châu' AS short_name, 'Quy Chau' AS name_en, '44018' AS postal_code, 'quy_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '16792' AS code, 'Xã Châu Tiến' AS name, 'Châu Tiến' AS short_name, 'Chau Tien' AS name_en, '44013' AS postal_code, 'chau_tien' AS slug
UNION ALL
       SELECT '40' AS province_code, '16801' AS code, 'Xã Hùng Chân' AS name, 'Hùng Chân' AS short_name, 'Hung Chan' AS name_en, '44019' AS postal_code, 'hung_chan' AS slug
UNION ALL
       SELECT '40' AS province_code, '16804' AS code, 'Xã Châu Bình' AS name, 'Châu Bình' AS short_name, 'Chau Binh' AS name_en, '44007' AS postal_code, 'chau_binh' AS slug
UNION ALL
       SELECT '40' AS province_code, '16813' AS code, 'Xã Mường Xén' AS name, 'Mường Xén' AS short_name, 'Muong Xen' AS name_en, '44406' AS postal_code, 'muong_xen' AS slug
UNION ALL
       SELECT '40' AS province_code, '16816' AS code, 'Xã Mỹ Lý' AS name, 'Mỹ Lý' AS short_name, 'My Ly' AS name_en, '44419' AS postal_code, 'my_ly' AS slug
UNION ALL
       SELECT '40' AS province_code, '16819' AS code, 'Xã Bắc Lý' AS name, 'Bắc Lý' AS short_name, 'Bac Ly' AS name_en, '44418' AS postal_code, 'bac_ly' AS slug
UNION ALL
       SELECT '40' AS province_code, '16822' AS code, 'Xã Keng Đu' AS name, 'Keng Đu' AS short_name, 'Keng Du' AS name_en, '44417' AS postal_code, 'keng_du' AS slug
UNION ALL
       SELECT '40' AS province_code, '16828' AS code, 'Xã Huồi Tụ' AS name, 'Huồi Tụ' AS short_name, 'Huoi Tu' AS name_en, '44414' AS postal_code, 'huoi_tu' AS slug
UNION ALL
       SELECT '40' AS province_code, '16831' AS code, 'Xã Mường Lống' AS name, 'Mường Lống' AS short_name, 'Muong Long' AS name_en, '44411' AS postal_code, 'muong_long' AS slug
UNION ALL
       SELECT '40' AS province_code, '16834' AS code, 'Xã Na Loi' AS name, 'Na Loi' AS short_name, 'Na Loi' AS name_en, '44415' AS postal_code, 'na_loi' AS slug
UNION ALL
       SELECT '40' AS province_code, '16837' AS code, 'Xã Nậm Cắn' AS name, 'Nậm Cắn' AS short_name, 'Nam Can' AS name_en, '44413' AS postal_code, 'nam_can' AS slug
UNION ALL
       SELECT '40' AS province_code, '16849' AS code, 'Xã Hữu Kiệm' AS name, 'Hữu Kiệm' AS short_name, 'Huu Kiem' AS name_en, '44420' AS postal_code, 'huu_kiem' AS slug
UNION ALL
       SELECT '40' AS province_code, '16855' AS code, 'Xã Chiêu Lưu' AS name, 'Chiêu Lưu' AS short_name, 'Chieu Luu' AS name_en, '44407' AS postal_code, 'chieu_luu' AS slug
UNION ALL
       SELECT '40' AS province_code, '16858' AS code, 'Xã Mường Típ' AS name, 'Mường Típ' AS short_name, 'Muong Tip' AS name_en, '44423' AS postal_code, 'muong_tip' AS slug
UNION ALL
       SELECT '40' AS province_code, '16870' AS code, 'Xã Na Ngoi' AS name, 'Na Ngoi' AS short_name, 'Na Ngoi' AS name_en, '44425' AS postal_code, 'na_ngoi' AS slug
UNION ALL
       SELECT '40' AS province_code, '16876' AS code, 'Xã Tương Dương' AS name, 'Tương Dương' AS short_name, 'Tuong Duong' AS name_en, '44374' AS postal_code, 'tuong_duong' AS slug
UNION ALL
       SELECT '40' AS province_code, '16882' AS code, 'Xã Nhôn Mai' AS name, 'Nhôn Mai' AS short_name, 'Nhon Mai' AS name_en, '44367' AS postal_code, 'nhon_mai' AS slug
UNION ALL
       SELECT '40' AS province_code, '16885' AS code, 'Xã Hữu Khuông' AS name, 'Hữu Khuông' AS short_name, 'Huu Khuong' AS name_en, '44365' AS postal_code, 'huu_khuong' AS slug
UNION ALL
       SELECT '40' AS province_code, '16903' AS code, 'Xã Nga My' AS name, 'Nga My' AS short_name, 'Nga My' AS name_en, '44362' AS postal_code, 'nga_my' AS slug
UNION ALL
       SELECT '40' AS province_code, '16906' AS code, 'Xã Lượng Minh' AS name, 'Lượng Minh' AS short_name, 'Luong Minh' AS name_en, '44364' AS postal_code, 'luong_minh' AS slug
UNION ALL
       SELECT '40' AS province_code, '16909' AS code, 'Xã Yên Hoà' AS name, 'Yên Hoà' AS short_name, 'Yen Hoa' AS name_en, '44360' AS postal_code, 'yen_hoa' AS slug
UNION ALL
       SELECT '40' AS province_code, '16912' AS code, 'Xã Yên Na' AS name, 'Yên Na' AS short_name, 'Yen Na' AS name_en, '44359' AS postal_code, 'yen_na' AS slug
UNION ALL
       SELECT '40' AS province_code, '16933' AS code, 'Xã Tam Quang' AS name, 'Tam Quang' AS short_name, 'Tam Quang' AS name_en, '44370' AS postal_code, 'tam_quang' AS slug
UNION ALL
       SELECT '40' AS province_code, '16936' AS code, 'Xã Tam Thái' AS name, 'Tam Thái' AS short_name, 'Tam Thai' AS name_en, '44369' AS postal_code, 'tam_thai' AS slug
UNION ALL
       SELECT '40' AS province_code, '16939' AS code, 'Phường Thái Hoà' AS name, 'Thái Hoà' AS short_name, 'Thai Hoa' AS name_en, '44816' AS postal_code, 'thai_hoa' AS slug
UNION ALL
       SELECT '40' AS province_code, '16941' AS code, 'Xã Nghĩa Đàn' AS name, 'Nghĩa Đàn' AS short_name, 'Nghia Dan' AS name_en, '43706' AS postal_code, 'nghia_dan' AS slug
UNION ALL
       SELECT '40' AS province_code, '16951' AS code, 'Xã Nghĩa Lâm' AS name, 'Nghĩa Lâm' AS short_name, 'Nghia Lam' AS name_en, '43713' AS postal_code, 'nghia_lam' AS slug
UNION ALL
       SELECT '40' AS province_code, '16969' AS code, 'Xã Nghĩa Thọ' AS name, 'Nghĩa Thọ' AS short_name, 'Nghia Tho' AS name_en, '43708' AS postal_code, 'nghia_tho' AS slug
UNION ALL
       SELECT '40' AS province_code, '16972' AS code, 'Xã Nghĩa Hưng' AS name, 'Nghĩa Hưng' AS short_name, 'Nghia Hung' AS name_en, '43721' AS postal_code, 'nghia_hung' AS slug
UNION ALL
       SELECT '40' AS province_code, '16975' AS code, 'Xã Nghĩa Mai' AS name, 'Nghĩa Mai' AS short_name, 'Nghia Mai' AS name_en, '43718' AS postal_code, 'nghia_mai' AS slug
UNION ALL
       SELECT '40' AS province_code, '17011' AS code, 'Phường Tây Hiếu' AS name, 'Tây Hiếu' AS short_name, 'Tay Hieu' AS name_en, '44813' AS postal_code, 'tay_hieu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17017' AS code, 'Xã Đông Hiếu' AS name, 'Đông Hiếu' AS short_name, 'Dong Hieu' AS name_en, '44815' AS postal_code, 'dong_hieu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17029' AS code, 'Xã Nghĩa Lộc' AS name, 'Nghĩa Lộc' AS short_name, 'Nghia Loc' AS name_en, '43730' AS postal_code, 'nghia_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17032' AS code, 'Xã Nghĩa Khánh' AS name, 'Nghĩa Khánh' AS short_name, 'Nghia Khanh' AS name_en, '43728' AS postal_code, 'nghia_khanh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17035' AS code, 'Xã Quỳ Hợp' AS name, 'Quỳ Hợp' AS short_name, 'Quy Hop' AS name_en, '43906' AS postal_code, 'quy_hop' AS slug
UNION ALL
       SELECT '40' AS province_code, '17044' AS code, 'Xã Châu Hồng' AS name, 'Châu Hồng' AS short_name, 'Chau Hong' AS name_en, '43917' AS postal_code, 'chau_hong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17056' AS code, 'Xã Châu Lộc' AS name, 'Châu Lộc' AS short_name, 'Chau Loc' AS name_en, '43911' AS postal_code, 'chau_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17059' AS code, 'Xã Tam Hợp' AS name, 'Tam Hợp' AS short_name, 'Tam Hop' AS name_en, '43912' AS postal_code, 'tam_hop' AS slug
UNION ALL
       SELECT '40' AS province_code, '17071' AS code, 'Xã Minh Hợp' AS name, 'Minh Hợp' AS short_name, 'Minh Hop' AS name_en, '43907' AS postal_code, 'minh_hop' AS slug
UNION ALL
       SELECT '40' AS province_code, '17077' AS code, 'Xã Mường Ham' AS name, 'Mường Ham' AS short_name, 'Muong Ham' AS name_en, '43927' AS postal_code, 'muong_ham' AS slug
UNION ALL
       SELECT '40' AS province_code, '17089' AS code, 'Xã Mường Chọng' AS name, 'Mường Chọng' AS short_name, 'Muong Chong' AS name_en, '43928' AS postal_code, 'muong_chong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17110' AS code, 'Phường Hoàng Mai' AS name, 'Hoàng Mai' AS short_name, 'Hoang Mai' AS name_en, '44916' AS postal_code, 'hoang_mai' AS slug
UNION ALL
       SELECT '40' AS province_code, '17125' AS code, 'Phường Quỳnh Mai' AS name, 'Quỳnh Mai' AS short_name, 'Quynh Mai' AS name_en, '44918' AS postal_code, 'quynh_mai' AS slug
UNION ALL
       SELECT '40' AS province_code, '17128' AS code, 'Phường Tân Mai' AS name, 'Tân Mai' AS short_name, 'Tan Mai' AS name_en, '44917' AS postal_code, 'tan_mai' AS slug
UNION ALL
       SELECT '40' AS province_code, '17143' AS code, 'Xã Quỳnh Văn' AS name, 'Quỳnh Văn' AS short_name, 'Quynh Van' AS name_en, '43531' AS postal_code, 'quynh_van' AS slug
UNION ALL
       SELECT '40' AS province_code, '17149' AS code, 'Xã Quỳnh Tam' AS name, 'Quỳnh Tam' AS short_name, 'Quynh Tam' AS name_en, '43536' AS postal_code, 'quynh_tam' AS slug
UNION ALL
       SELECT '40' AS province_code, '17170' AS code, 'Xã Quỳnh Sơn' AS name, 'Quỳnh Sơn' AS short_name, 'Quynh Son' AS name_en, '43529' AS postal_code, 'quynh_son' AS slug
UNION ALL
       SELECT '40' AS province_code, '17176' AS code, 'Xã Quỳnh Anh' AS name, 'Quỳnh Anh' AS short_name, 'Quynh Anh' AS name_en, '43540' AS postal_code, 'quynh_anh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17179' AS code, 'Xã Quỳnh Lưu' AS name, 'Quỳnh Lưu' AS short_name, 'Quynh Luu' AS name_en, '43539' AS postal_code, 'quynh_luu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17212' AS code, 'Xã Quỳnh Phú' AS name, 'Quỳnh Phú' AS short_name, 'Quynh Phu' AS name_en, '43541' AS postal_code, 'quynh_phu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17224' AS code, 'Xã Quỳnh Thắng' AS name, 'Quỳnh Thắng' AS short_name, 'Quynh Thang' AS name_en, '43534' AS postal_code, 'quynh_thang' AS slug
UNION ALL
       SELECT '40' AS province_code, '17230' AS code, 'Xã Bình Chuẩn' AS name, 'Bình Chuẩn' AS short_name, 'Binh Chuan' AS name_en, '44318' AS postal_code, 'binh_chuan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17239' AS code, 'Xã Mậu Thạch' AS name, 'Mậu Thạch' AS short_name, 'Mau Thach' AS name_en, '44320' AS postal_code, 'mau_thach' AS slug
UNION ALL
       SELECT '40' AS province_code, '17242' AS code, 'Xã Cam Phục' AS name, 'Cam Phục' AS short_name, 'Cam Phuc' AS name_en, '44321' AS postal_code, 'cam_phuc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17248' AS code, 'Xã Châu Khê' AS name, 'Châu Khê' AS short_name, 'Chau Khe' AS name_en, '44310' AS postal_code, 'chau_khe' AS slug
UNION ALL
       SELECT '40' AS province_code, '17254' AS code, 'Xã Con Cuông' AS name, 'Con Cuông' AS short_name, 'Con Cuong' AS name_en, '44319' AS postal_code, 'con_cuong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17263' AS code, 'Xã Môn Sơn' AS name, 'Môn Sơn' AS short_name, 'Mon Son' AS name_en, '44312' AS postal_code, 'mon_son' AS slug
UNION ALL
       SELECT '40' AS province_code, '17266' AS code, 'Xã Tân Kỳ' AS name, 'Tân Kỳ' AS short_name, 'Tan Ky' AS name_en, '43806' AS postal_code, 'tan_ky' AS slug
UNION ALL
       SELECT '40' AS province_code, '17272' AS code, 'Xã Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '43811' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17278' AS code, 'Xã Giai Xuân' AS name, 'Giai Xuân' AS short_name, 'Giai Xuan' AS name_en, '43817' AS postal_code, 'giai_xuan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17284' AS code, 'Xã Nghĩa Đồng' AS name, 'Nghĩa Đồng' AS short_name, 'Nghia Dong' AS name_en, '43815' AS postal_code, 'nghia_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17287' AS code, 'Xã Tiên Đồng' AS name, 'Tiên Đồng' AS short_name, 'Tien Dong' AS name_en, '43828' AS postal_code, 'tien_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17305' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '43821' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '40' AS province_code, '17326' AS code, 'Xã Nghĩa Hành' AS name, 'Nghĩa Hành' AS short_name, 'Nghia Hanh' AS name_en, '43825' AS postal_code, 'nghia_hanh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17329' AS code, 'Xã Anh Sơn' AS name, 'Anh Sơn' AS short_name, 'Anh Son' AS name_en, '44227' AS postal_code, 'anh_son' AS slug
UNION ALL
       SELECT '40' AS province_code, '17335' AS code, 'Xã Thành Bình Thọ' AS name, 'Thành Bình Thọ' AS short_name, 'Thanh Binh Tho' AS name_en, '44232' AS postal_code, 'thanh_binh_tho' AS slug
UNION ALL
       SELECT '40' AS province_code, '17344' AS code, 'Xã Nhân Hoà' AS name, 'Nhân Hoà' AS short_name, 'Nhan Hoa' AS name_en, '44229' AS postal_code, 'nhan_hoa' AS slug
UNION ALL
       SELECT '40' AS province_code, '17357' AS code, 'Xã Vĩnh Tường' AS name, 'Vĩnh Tường' AS short_name, 'Vinh Tuong' AS name_en, '44231' AS postal_code, 'vinh_tuong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17365' AS code, 'Xã Anh Sơn Đông' AS name, 'Anh Sơn Đông' AS short_name, 'Anh Son Dong' AS name_en, '44230' AS postal_code, 'anh_son_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17380' AS code, 'Xã Yên Xuân' AS name, 'Yên Xuân' AS short_name, 'Yen Xuan' AS name_en, '44228' AS postal_code, 'yen_xuan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17395' AS code, 'Xã Hùng Châu' AS name, 'Hùng Châu' AS short_name, 'Hung Chau' AS name_en, '43476' AS postal_code, 'hung_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17416' AS code, 'Xã Đức Châu' AS name, 'Đức Châu' AS short_name, 'Duc Chau' AS name_en, '43446' AS postal_code, 'duc_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17419' AS code, 'Xã Hải Châu' AS name, 'Hải Châu' AS short_name, 'Hai Chau' AS name_en, '43448' AS postal_code, 'hai_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17443' AS code, 'Xã Quảng Châu' AS name, 'Quảng Châu' AS short_name, 'Quang Chau' AS name_en, '43447' AS postal_code, 'quang_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17464' AS code, 'Xã Diễn Châu' AS name, 'Diễn Châu' AS short_name, 'Dien Chau' AS name_en, '43445' AS postal_code, 'dien_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17476' AS code, 'Xã Minh Châu' AS name, 'Minh Châu' AS short_name, 'Minh Chau' AS name_en, '43411' AS postal_code, 'minh_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17479' AS code, 'Xã An Châu' AS name, 'An Châu' AS short_name, 'An Chau' AS name_en, '43475' AS postal_code, 'an_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17488' AS code, 'Xã Tân Châu' AS name, 'Tân Châu' AS short_name, 'Tan Chau' AS name_en, '43449' AS postal_code, 'tan_chau' AS slug
UNION ALL
       SELECT '40' AS province_code, '17506' AS code, 'Xã Yên Thành' AS name, 'Yên Thành' AS short_name, 'Yen Thanh' AS name_en, '43645' AS postal_code, 'yen_thanh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17515' AS code, 'Xã Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '43676' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17521' AS code, 'Xã Quang Đồng' AS name, 'Quang Đồng' AS short_name, 'Quang Dong' AS name_en, '43649' AS postal_code, 'quang_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17524' AS code, 'Xã Giai Lạc' AS name, 'Giai Lạc' AS short_name, 'Giai Lac' AS name_en, '43675' AS postal_code, 'giai_lac' AS slug
UNION ALL
       SELECT '40' AS province_code, '17530' AS code, 'Xã Đông Thành' AS name, 'Đông Thành' AS short_name, 'Dong Thanh' AS name_en, '43677' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17560' AS code, 'Xã Vân Du' AS name, 'Vân Du' AS short_name, 'Van Du' AS name_en, '43648' AS postal_code, 'van_du' AS slug
UNION ALL
       SELECT '40' AS province_code, '17569' AS code, 'Xã Quan Thành' AS name, 'Quan Thành' AS short_name, 'Quan Thanh' AS name_en, '43646' AS postal_code, 'quan_thanh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17605' AS code, 'Xã Hợp Minh' AS name, 'Hợp Minh' AS short_name, 'Hop Minh' AS name_en, '43647' AS postal_code, 'hop_minh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17611' AS code, 'Xã Vân Tụ' AS name, 'Vân Tụ' AS short_name, 'Van Tu' AS name_en, '43620' AS postal_code, 'van_tu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17623' AS code, 'Xã Bạch Ngọc' AS name, 'Bạch Ngọc' AS short_name, 'Bach Ngoc' AS name_en, '44129' AS postal_code, 'bach_ngoc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17641' AS code, 'Xã Lương Sơn' AS name, 'Lương Sơn' AS short_name, 'Luong Son' AS name_en, '44142' AS postal_code, 'luong_son' AS slug
UNION ALL
       SELECT '40' AS province_code, '17662' AS code, 'Xã Đô Lương' AS name, 'Đô Lương' AS short_name, 'Do Luong' AS name_en, '44106' AS postal_code, 'do_luong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17677' AS code, 'Xã Văn Hiến' AS name, 'Văn Hiến' AS short_name, 'Van Hien' AS name_en, '44139' AS postal_code, 'van_hien' AS slug
UNION ALL
       SELECT '40' AS province_code, '17689' AS code, 'Xã Thuần Trung' AS name, 'Thuần Trung' AS short_name, 'Thuan Trung' AS name_en, '44141' AS postal_code, 'thuan_trung' AS slug
UNION ALL
       SELECT '40' AS province_code, '17707' AS code, 'Xã Bạch Hà' AS name, 'Bạch Hà' AS short_name, 'Bach Ha' AS name_en, '44140' AS postal_code, 'bach_ha' AS slug
UNION ALL
       SELECT '40' AS province_code, '17713' AS code, 'Xã Đại Đồng' AS name, 'Đại Đồng' AS short_name, 'Dai Dong' AS name_en, '44710' AS postal_code, 'dai_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17722' AS code, 'Xã Hạnh Lâm' AS name, 'Hạnh Lâm' AS short_name, 'Hanh Lam' AS name_en, '44720' AS postal_code, 'hanh_lam' AS slug
UNION ALL
       SELECT '40' AS province_code, '17728' AS code, 'Xã Cát Ngạn' AS name, 'Cát Ngạn' AS short_name, 'Cat Ngan' AS name_en, '44747' AS postal_code, 'cat_ngan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17743' AS code, 'Xã Tam Đồng' AS name, 'Tam Đồng' AS short_name, 'Tam Dong' AS name_en, '44746' AS postal_code, 'tam_dong' AS slug
UNION ALL
       SELECT '40' AS province_code, '17759' AS code, 'Xã Sơn Lâm' AS name, 'Sơn Lâm' AS short_name, 'Son Lam' AS name_en, '44748' AS postal_code, 'son_lam' AS slug
UNION ALL
       SELECT '40' AS province_code, '17770' AS code, 'Xã Hoa Quân' AS name, 'Hoa Quân' AS short_name, 'Hoa Quan' AS name_en, '44749' AS postal_code, 'hoa_quan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17779' AS code, 'Xã Xuân Lâm' AS name, 'Xuân Lâm' AS short_name, 'Xuan Lam' AS name_en, '44776' AS postal_code, 'xuan_lam' AS slug
UNION ALL
       SELECT '40' AS province_code, '17791' AS code, 'Xã Kim Bảng' AS name, 'Kim Bảng' AS short_name, 'Kim Bang' AS name_en, '44733' AS postal_code, 'kim_bang' AS slug
UNION ALL
       SELECT '40' AS province_code, '17818' AS code, 'Xã Bích Hào' AS name, 'Bích Hào' AS short_name, 'Bich Hao' AS name_en, '44775' AS postal_code, 'bich_hao' AS slug
UNION ALL
       SELECT '40' AS province_code, '17827' AS code, 'Xã Nghi Lộc' AS name, 'Nghi Lộc' AS short_name, 'Nghi Loc' AS name_en, '43336' AS postal_code, 'nghi_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17833' AS code, 'Xã Hải Lộc' AS name, 'Hải Lộc' AS short_name, 'Hai Loc' AS name_en, '43341' AS postal_code, 'hai_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17842' AS code, 'Xã Thần Lĩnh' AS name, 'Thần Lĩnh' AS short_name, 'Than Linh' AS name_en, '43340' AS postal_code, 'than_linh' AS slug
UNION ALL
       SELECT '40' AS province_code, '17854' AS code, 'Xã Văn Kiều' AS name, 'Văn Kiều' AS short_name, 'Van Kieu' AS name_en, '43342' AS postal_code, 'van_kieu' AS slug
UNION ALL
       SELECT '40' AS province_code, '17857' AS code, 'Xã Phúc Lộc' AS name, 'Phúc Lộc' AS short_name, 'Phuc Loc' AS name_en, '43337' AS postal_code, 'phuc_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17866' AS code, 'Xã Trung Lộc' AS name, 'Trung Lộc' AS short_name, 'Trung Loc' AS name_en, '43339' AS postal_code, 'trung_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17878' AS code, 'Xã Đông Lộc' AS name, 'Đông Lộc' AS short_name, 'Dong Loc' AS name_en, '43338' AS postal_code, 'dong_loc' AS slug
UNION ALL
       SELECT '40' AS province_code, '17920' AS code, 'Phường Vinh Hưng' AS name, 'Vinh Hưng' AS short_name, 'Vinh Hung' AS name_en, '43133' AS postal_code, 'vinh_hung' AS slug
UNION ALL
       SELECT '40' AS province_code, '17935' AS code, 'Xã Nam Đàn' AS name, 'Nam Đàn' AS short_name, 'Nam Dan' AS name_en, '44631' AS postal_code, 'nam_dan' AS slug
UNION ALL
       SELECT '40' AS province_code, '17944' AS code, 'Xã Đại Huệ' AS name, 'Đại Huệ' AS short_name, 'Dai Hue' AS name_en, '44632' AS postal_code, 'dai_hue' AS slug
UNION ALL
       SELECT '40' AS province_code, '17950' AS code, 'Xã Vạn An' AS name, 'Vạn An' AS short_name, 'Van An' AS name_en, '44630' AS postal_code, 'van_an' AS slug
UNION ALL
       SELECT '40' AS province_code, '17971' AS code, 'Xã Kim Liên' AS name, 'Kim Liên' AS short_name, 'Kim Lien' AS name_en, '44617' AS postal_code, 'kim_lien' AS slug
UNION ALL
       SELECT '40' AS province_code, '17989' AS code, 'Xã Thiên Nhẫn' AS name, 'Thiên Nhẫn' AS short_name, 'Thien Nhan' AS name_en, '44633' AS postal_code, 'thien_nhan' AS slug
UNION ALL
       SELECT '40' AS province_code, '18001' AS code, 'Xã Hưng Nguyên' AS name, 'Hưng Nguyên' AS short_name, 'Hung Nguyen' AS name_en, '44506' AS postal_code, 'hung_nguyen' AS slug
UNION ALL
       SELECT '40' AS province_code, '18007' AS code, 'Xã Yên Trung' AS name, 'Yên Trung' AS short_name, 'Yen Trung' AS name_en, '44529' AS postal_code, 'yen_trung' AS slug
UNION ALL
       SELECT '40' AS province_code, '18028' AS code, 'Xã Hưng Nguyên Nam' AS name, 'Hưng Nguyên Nam' AS short_name, 'Hung Nguyen Nam' AS name_en, '44530' AS postal_code, 'hung_nguyen_nam' AS slug
UNION ALL
       SELECT '40' AS province_code, '18040' AS code, 'Xã Lam Thành' AS name, 'Lam Thành' AS short_name, 'Lam Thanh' AS name_en, '44531' AS postal_code, 'lam_thanh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18073' AS code, 'Phường Thành Sen' AS name, 'Thành Sen' AS short_name, 'Thanh Sen' AS name_en, '45122' AS postal_code, 'thanh_sen' AS slug
UNION ALL
       SELECT '42' AS province_code, '18100' AS code, 'Phường Trần Phú' AS name, 'Trần Phú' AS short_name, 'Tran Phu' AS name_en, '45123' AS postal_code, 'tran_phu' AS slug
UNION ALL
       SELECT '42' AS province_code, '18115' AS code, 'Phường Bắc Hồng Lĩnh' AS name, 'Bắc Hồng Lĩnh' AS short_name, 'Bac Hong Linh' AS name_en, '45612' AS postal_code, 'bac_hong_linh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18118' AS code, 'Phường Nam Hồng Lĩnh' AS name, 'Nam Hồng Lĩnh' AS short_name, 'Nam Hong Linh' AS name_en, '45613' AS postal_code, 'nam_hong_linh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18133' AS code, 'Xã Hương Sơn' AS name, 'Hương Sơn' AS short_name, 'Huong Son' AS name_en, '45838' AS postal_code, 'huong_son' AS slug
UNION ALL
       SELECT '42' AS province_code, '18160' AS code, 'Xã Sơn Hồng' AS name, 'Sơn Hồng' AS short_name, 'Son Hong' AS name_en, '45835' AS postal_code, 'son_hong' AS slug
UNION ALL
       SELECT '42' AS province_code, '18163' AS code, 'Xã Sơn Tiến' AS name, 'Sơn Tiến' AS short_name, 'Son Tien' AS name_en, '45820' AS postal_code, 'son_tien' AS slug
UNION ALL
       SELECT '42' AS province_code, '18172' AS code, 'Xã Sơn Tây' AS name, 'Sơn Tây' AS short_name, 'Son Tay' AS name_en, '45833' AS postal_code, 'son_tay' AS slug
UNION ALL
       SELECT '42' AS province_code, '18184' AS code, 'Xã Sơn Giang' AS name, 'Sơn Giang' AS short_name, 'Son Giang' AS name_en, '45822' AS postal_code, 'son_giang' AS slug
UNION ALL
       SELECT '42' AS province_code, '18196' AS code, 'Xã Sơn Kim 1' AS name, 'Sơn Kim 1' AS short_name, 'Son Kim 1' AS name_en, '45836' AS postal_code, 'son_kim_1' AS slug
UNION ALL
       SELECT '42' AS province_code, '18199' AS code, 'Xã Sơn Kim 2' AS name, 'Sơn Kim 2' AS short_name, 'Son Kim 2' AS name_en, '45837' AS postal_code, 'son_kim_2' AS slug
UNION ALL
       SELECT '42' AS province_code, '18202' AS code, 'Xã Tứ Mỹ' AS name, 'Tứ Mỹ' AS short_name, 'Tu My' AS name_en, '45839' AS postal_code, 'tu_my' AS slug
UNION ALL
       SELECT '42' AS province_code, '18223' AS code, 'Xã Kim Hoa' AS name, 'Kim Hoa' AS short_name, 'Kim Hoa' AS name_en, '45829' AS postal_code, 'kim_hoa' AS slug
UNION ALL
       SELECT '42' AS province_code, '18229' AS code, 'Xã Đức Thọ' AS name, 'Đức Thọ' AS short_name, 'Duc Tho' AS name_en, '45706' AS postal_code, 'duc_tho' AS slug
UNION ALL
       SELECT '42' AS province_code, '18244' AS code, 'Xã Đức Minh' AS name, 'Đức Minh' AS short_name, 'Duc Minh' AS name_en, '45736' AS postal_code, 'duc_minh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18262' AS code, 'Xã Đức Quang' AS name, 'Đức Quang' AS short_name, 'Duc Quang' AS name_en, '45734' AS postal_code, 'duc_quang' AS slug
UNION ALL
       SELECT '42' AS province_code, '18277' AS code, 'Xã Đức Thịnh' AS name, 'Đức Thịnh' AS short_name, 'Duc Thinh' AS name_en, '45735' AS postal_code, 'duc_thinh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18304' AS code, 'Xã Đức Đồng' AS name, 'Đức Đồng' AS short_name, 'Duc Dong' AS name_en, '45731' AS postal_code, 'duc_dong' AS slug
UNION ALL
       SELECT '42' AS province_code, '18313' AS code, 'Xã Vũ Quang' AS name, 'Vũ Quang' AS short_name, 'Vu Quang' AS name_en, '45906' AS postal_code, 'vu_quang' AS slug
UNION ALL
       SELECT '42' AS province_code, '18322' AS code, 'Xã Mai Hoa' AS name, 'Mai Hoa' AS short_name, 'Mai Hoa' AS name_en, '45918' AS postal_code, 'mai_hoa' AS slug
UNION ALL
       SELECT '42' AS province_code, '18328' AS code, 'Xã Thượng Đức' AS name, 'Thượng Đức' AS short_name, 'Thuong Duc' AS name_en, '45919' AS postal_code, 'thuong_duc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18352' AS code, 'Xã Nghi Xuân' AS name, 'Nghi Xuân' AS short_name, 'Nghi Xuan' AS name_en, '45525' AS postal_code, 'nghi_xuan' AS slug
UNION ALL
       SELECT '42' AS province_code, '18364' AS code, 'Xã Đan Hải' AS name, 'Đan Hải' AS short_name, 'Dan Hai' AS name_en, '45526' AS postal_code, 'dan_hai' AS slug
UNION ALL
       SELECT '42' AS province_code, '18373' AS code, 'Xã Tiên Điền' AS name, 'Tiên Điền' AS short_name, 'Tien Dien' AS name_en, '45506' AS postal_code, 'tien_dien' AS slug
UNION ALL
       SELECT '42' AS province_code, '18394' AS code, 'Xã Cổ Đạm' AS name, 'Cổ Đạm' AS short_name, 'Co Dam' AS name_en, '45519' AS postal_code, 'co_dam' AS slug
UNION ALL
       SELECT '42' AS province_code, '18406' AS code, 'Xã Can Lộc' AS name, 'Can Lộc' AS short_name, 'Can Loc' AS name_en, '45329' AS postal_code, 'can_loc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18409' AS code, 'Xã Hồng Lộc' AS name, 'Hồng Lộc' AS short_name, 'Hong Loc' AS name_en, '45410' AS postal_code, 'hong_loc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18418' AS code, 'Xã Tùng Lộc' AS name, 'Tùng Lộc' AS short_name, 'Tung Loc' AS name_en, '45310' AS postal_code, 'tung_loc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18436' AS code, 'Xã Trường Lưu' AS name, 'Trường Lưu' AS short_name, 'Truong Luu' AS name_en, '45330' AS postal_code, 'truong_luu' AS slug
UNION ALL
       SELECT '42' AS province_code, '18466' AS code, 'Xã Gia Hanh' AS name, 'Gia Hanh' AS short_name, 'Gia Hanh' AS name_en, '45321' AS postal_code, 'gia_hanh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18481' AS code, 'Xã Xuân Lộc' AS name, 'Xuân Lộc' AS short_name, 'Xuan Loc' AS name_en, '45324' AS postal_code, 'xuan_loc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18484' AS code, 'Xã Đồng Lộc' AS name, 'Đồng Lộc' AS short_name, 'Dong Loc' AS name_en, '45325' AS postal_code, 'dong_loc' AS slug
UNION ALL
       SELECT '42' AS province_code, '18496' AS code, 'Xã Hương Khê' AS name, 'Hương Khê' AS short_name, 'Huong Khe' AS name_en, '46006' AS postal_code, 'huong_khe' AS slug
UNION ALL
       SELECT '42' AS province_code, '18502' AS code, 'Xã Hà Linh' AS name, 'Hà Linh' AS short_name, 'Ha Linh' AS name_en, '46011' AS postal_code, 'ha_linh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18523' AS code, 'Xã Hương Bình' AS name, 'Hương Bình' AS short_name, 'Huong Binh' AS name_en, '46016' AS postal_code, 'huong_binh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18532' AS code, 'Xã Hương Phố' AS name, 'Hương Phố' AS short_name, 'Huong Pho' AS name_en, '46028' AS postal_code, 'huong_pho' AS slug
UNION ALL
       SELECT '42' AS province_code, '18544' AS code, 'Xã Hương Xuân' AS name, 'Hương Xuân' AS short_name, 'Huong Xuan' AS name_en, '46022' AS postal_code, 'huong_xuan' AS slug
UNION ALL
       SELECT '42' AS province_code, '18547' AS code, 'Xã Phúc Trạch' AS name, 'Phúc Trạch' AS short_name, 'Phuc Trach' AS name_en, '46026' AS postal_code, 'phuc_trach' AS slug
UNION ALL
       SELECT '42' AS province_code, '18550' AS code, 'Xã Hương Đô' AS name, 'Hương Đô' AS short_name, 'Huong Do' AS name_en, '46007' AS postal_code, 'huong_do' AS slug
UNION ALL
       SELECT '42' AS province_code, '18562' AS code, 'Xã Thạch Hà' AS name, 'Thạch Hà' AS short_name, 'Thach Ha' AS name_en, '45206' AS postal_code, 'thach_ha' AS slug
UNION ALL
       SELECT '42' AS province_code, '18568' AS code, 'Xã Lộc Hà' AS name, 'Lộc Hà' AS short_name, 'Loc Ha' AS name_en, '45413' AS postal_code, 'loc_ha' AS slug
UNION ALL
       SELECT '42' AS province_code, '18583' AS code, 'Xã Mai Phụ' AS name, 'Mai Phụ' AS short_name, 'Mai Phu' AS name_en, '45417' AS postal_code, 'mai_phu' AS slug
UNION ALL
       SELECT '42' AS province_code, '18586' AS code, 'Xã Đông Kinh' AS name, 'Đông Kinh' AS short_name, 'Dong Kinh' AS name_en, '45239' AS postal_code, 'dong_kinh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18601' AS code, 'Xã Việt Xuyên' AS name, 'Việt Xuyên' AS short_name, 'Viet Xuyen' AS name_en, '45238' AS postal_code, 'viet_xuyen' AS slug
UNION ALL
       SELECT '42' AS province_code, '18604' AS code, 'Xã Thạch Khê' AS name, 'Thạch Khê' AS short_name, 'Thach Khe' AS name_en, '45211' AS postal_code, 'thach_khe' AS slug
UNION ALL
       SELECT '42' AS province_code, '18619' AS code, 'Xã Đồng Tiến' AS name, 'Đồng Tiến' AS short_name, 'Dong Tien' AS name_en, '45125' AS postal_code, 'dong_tien' AS slug
UNION ALL
       SELECT '42' AS province_code, '18628' AS code, 'Xã Thạch Lạc' AS name, 'Thạch Lạc' AS short_name, 'Thach Lac' AS name_en, '45213' AS postal_code, 'thach_lac' AS slug
UNION ALL
       SELECT '42' AS province_code, '18634' AS code, 'Xã Toàn Lưu' AS name, 'Toàn Lưu' AS short_name, 'Toan Luu' AS name_en, '45237' AS postal_code, 'toan_luu' AS slug
UNION ALL
       SELECT '42' AS province_code, '18652' AS code, 'Phường Hà Huy Tập' AS name, 'Hà Huy Tập' AS short_name, 'Ha Huy Tap' AS name_en, '45124' AS postal_code, 'ha_huy_tap' AS slug
UNION ALL
       SELECT '42' AS province_code, '18667' AS code, 'Xã Thạch Xuân' AS name, 'Thạch Xuân' AS short_name, 'Thach Xuan' AS name_en, '45234' AS postal_code, 'thach_xuan' AS slug
UNION ALL
       SELECT '42' AS province_code, '18673' AS code, 'Xã Cẩm Xuyên' AS name, 'Cẩm Xuyên' AS short_name, 'Cam Xuyen' AS name_en, '46106' AS postal_code, 'cam_xuyen' AS slug
UNION ALL
       SELECT '42' AS province_code, '18676' AS code, 'Xã Thiên Cầm' AS name, 'Thiên Cầm' AS short_name, 'Thien Cam' AS name_en, '46109' AS postal_code, 'thien_cam' AS slug
UNION ALL
       SELECT '42' AS province_code, '18682' AS code, 'Xã Yên Hoà' AS name, 'Yên Hoà' AS short_name, 'Yen Hoa' AS name_en, '46112' AS postal_code, 'yen_hoa' AS slug
UNION ALL
       SELECT '42' AS province_code, '18685' AS code, 'Xã Cẩm Bình' AS name, 'Cẩm Bình' AS short_name, 'Cam Binh' AS name_en, '46117' AS postal_code, 'cam_binh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18736' AS code, 'Xã Cẩm Hưng' AS name, 'Cẩm Hưng' AS short_name, 'Cam Hung' AS name_en, '46124' AS postal_code, 'cam_hung' AS slug
UNION ALL
       SELECT '42' AS province_code, '18739' AS code, 'Xã Cẩm Duệ' AS name, 'Cẩm Duệ' AS short_name, 'Cam Due' AS name_en, '46120' AS postal_code, 'cam_due' AS slug
UNION ALL
       SELECT '42' AS province_code, '18742' AS code, 'Xã Cẩm Trung' AS name, 'Cẩm Trung' AS short_name, 'Cam Trung' AS name_en, '46131' AS postal_code, 'cam_trung' AS slug
UNION ALL
       SELECT '42' AS province_code, '18748' AS code, 'Xã Cẩm Lạc' AS name, 'Cẩm Lạc' AS short_name, 'Cam Lac' AS name_en, '46127' AS postal_code, 'cam_lac' AS slug
UNION ALL
       SELECT '42' AS province_code, '18754' AS code, 'Phường Sông Trí' AS name, 'Sông Trí' AS short_name, 'Song Tri' AS name_en, '46218' AS postal_code, 'song_tri' AS slug
UNION ALL
       SELECT '42' AS province_code, '18766' AS code, 'Xã Kỳ Xuân' AS name, 'Kỳ Xuân' AS short_name, 'Ky Xuan' AS name_en, '46308' AS postal_code, 'ky_xuan' AS slug
UNION ALL
       SELECT '42' AS province_code, '18775' AS code, 'Xã Kỳ Anh' AS name, 'Kỳ Anh' AS short_name, 'Ky Anh' AS name_en, '46327' AS postal_code, 'ky_anh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18781' AS code, 'Phường Hải Ninh' AS name, 'Hải Ninh' AS short_name, 'Hai Ninh' AS name_en, '46219' AS postal_code, 'hai_ninh' AS slug
UNION ALL
       SELECT '42' AS province_code, '18787' AS code, 'Xã Kỳ Văn' AS name, 'Kỳ Văn' AS short_name, 'Ky Van' AS name_en, '46315' AS postal_code, 'ky_van' AS slug
UNION ALL
       SELECT '42' AS province_code, '18790' AS code, 'Xã Kỳ Khang' AS name, 'Kỳ Khang' AS short_name, 'Ky Khang' AS name_en, '46313' AS postal_code, 'ky_khang' AS slug
UNION ALL
       SELECT '42' AS province_code, '18814' AS code, 'Xã Kỳ Hoa' AS name, 'Kỳ Hoa' AS short_name, 'Ky Hoa' AS name_en, '46217' AS postal_code, 'ky_hoa' AS slug
UNION ALL
       SELECT '42' AS province_code, '18823' AS code, 'Phường Vũng Áng' AS name, 'Vũng Áng' AS short_name, 'Vung Ang' AS name_en, '46221' AS postal_code, 'vung_ang' AS slug
UNION ALL
       SELECT '42' AS province_code, '18832' AS code, 'Phường Hoành Sơn' AS name, 'Hoành Sơn' AS short_name, 'Hoanh Son' AS name_en, '46220' AS postal_code, 'hoanh_son' AS slug
UNION ALL
       SELECT '42' AS province_code, '18838' AS code, 'Xã Kỳ Lạc' AS name, 'Kỳ Lạc' AS short_name, 'Ky Lac' AS name_en, '46326' AS postal_code, 'ky_lac' AS slug
UNION ALL
       SELECT '42' AS province_code, '18844' AS code, 'Xã Kỳ Thượng' AS name, 'Kỳ Thượng' AS short_name, 'Ky Thuong' AS name_en, '46323' AS postal_code, 'ky_thuong' AS slug
UNION ALL
       SELECT '44' AS province_code, '18859' AS code, 'Phường Đồng Thuận' AS name, 'Đồng Thuận' AS short_name, 'Dong Thuan' AS name_en, '47123' AS postal_code, 'dong_thuan' AS slug
UNION ALL
       SELECT '44' AS province_code, '18871' AS code, 'Phường Đồng Sơn' AS name, 'Đồng Sơn' AS short_name, 'Dong Son' AS name_en, '47110' AS postal_code, 'dong_son' AS slug
UNION ALL
       SELECT '44' AS province_code, '18880' AS code, 'Phường Đồng Hới' AS name, 'Đồng Hới' AS short_name, 'Dong Hoi' AS name_en, '47122' AS postal_code, 'dong_hoi' AS slug
UNION ALL
       SELECT '44' AS province_code, '18901' AS code, 'Xã Minh Hoá' AS name, 'Minh Hoá' AS short_name, 'Minh Hoa' AS name_en, '47622' AS postal_code, 'minh_hoa' AS slug
UNION ALL
       SELECT '44' AS province_code, '18904' AS code, 'Xã Dân Hoá' AS name, 'Dân Hoá' AS short_name, 'Dan Hoa' AS name_en, '47613' AS postal_code, 'dan_hoa' AS slug
UNION ALL
       SELECT '44' AS province_code, '18919' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '47610' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '44' AS province_code, '18922' AS code, 'Xã Kim Điền' AS name, 'Kim Điền' AS short_name, 'Kim Dien' AS name_en, '47623' AS postal_code, 'kim_dien' AS slug
UNION ALL
       SELECT '44' AS province_code, '18943' AS code, 'Xã Kim Phú' AS name, 'Kim Phú' AS short_name, 'Kim Phu' AS name_en, '47624' AS postal_code, 'kim_phu' AS slug
UNION ALL
       SELECT '44' AS province_code, '18949' AS code, 'Xã Đồng Lê' AS name, 'Đồng Lê' AS short_name, 'Dong Le' AS name_en, '47506' AS postal_code, 'dong_le' AS slug
UNION ALL
       SELECT '44' AS province_code, '18952' AS code, 'Xã Tuyên Sơn' AS name, 'Tuyên Sơn' AS short_name, 'Tuyen Son' AS name_en, '47526' AS postal_code, 'tuyen_son' AS slug
UNION ALL
       SELECT '44' AS province_code, '18958' AS code, 'Xã Tuyên Lâm' AS name, 'Tuyên Lâm' AS short_name, 'Tuyen Lam' AS name_en, '47527' AS postal_code, 'tuyen_lam' AS slug
UNION ALL
       SELECT '44' AS province_code, '18985' AS code, 'Xã Tuyên Phú' AS name, 'Tuyên Phú' AS short_name, 'Tuyen Phu' AS name_en, '47528' AS postal_code, 'tuyen_phu' AS slug
UNION ALL
       SELECT '44' AS province_code, '18991' AS code, 'Xã Tuyên Bình' AS name, 'Tuyên Bình' AS short_name, 'Tuyen Binh' AS name_en, '47529' AS postal_code, 'tuyen_binh' AS slug
UNION ALL
       SELECT '44' AS province_code, '18997' AS code, 'Xã Tuyên Hoá' AS name, 'Tuyên Hoá' AS short_name, 'Tuyen Hoa' AS name_en, '47530' AS postal_code, 'tuyen_hoa' AS slug
UNION ALL
       SELECT '44' AS province_code, '19009' AS code, 'Phường Ba Đồn' AS name, 'Ba Đồn' AS short_name, 'Ba Don' AS name_en, '47306' AS postal_code, 'ba_don' AS slug
UNION ALL
       SELECT '44' AS province_code, '19021' AS code, 'Xã Phú Trạch' AS name, 'Phú Trạch' AS short_name, 'Phu Trach' AS name_en, '47427' AS postal_code, 'phu_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19030' AS code, 'Xã Trung Thuần' AS name, 'Trung Thuần' AS short_name, 'Trung Thuan' AS name_en, '47425' AS postal_code, 'trung_thuan' AS slug
UNION ALL
       SELECT '44' AS province_code, '19033' AS code, 'Xã Hoà Trạch' AS name, 'Hoà Trạch' AS short_name, 'Hoa Trach' AS name_en, '47426' AS postal_code, 'hoa_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19051' AS code, 'Xã Tân Gianh' AS name, 'Tân Gianh' AS short_name, 'Tan Gianh' AS name_en, '47428' AS postal_code, 'tan_gianh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19057' AS code, 'Xã Quảng Trạch' AS name, 'Quảng Trạch' AS short_name, 'Quang Trach' AS name_en, '47424' AS postal_code, 'quang_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19066' AS code, 'Phường Bắc Gianh' AS name, 'Bắc Gianh' AS short_name, 'Bac Gianh' AS name_en, '47322' AS postal_code, 'bac_gianh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19075' AS code, 'Xã Nam Ba Đồn' AS name, 'Nam Ba Đồn' AS short_name, 'Nam Ba Don' AS name_en, '47323' AS postal_code, 'nam_ba_don' AS slug
UNION ALL
       SELECT '44' AS province_code, '19093' AS code, 'Xã Nam Gianh' AS name, 'Nam Gianh' AS short_name, 'Nam Gianh' AS name_en, '47324' AS postal_code, 'nam_gianh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19111' AS code, 'Xã Hoàn Lão' AS name, 'Hoàn Lão' AS short_name, 'Hoan Lao' AS name_en, '47206' AS postal_code, 'hoan_lao' AS slug
UNION ALL
       SELECT '44' AS province_code, '19126' AS code, 'Xã Bắc Trạch' AS name, 'Bắc Trạch' AS short_name, 'Bac Trach' AS name_en, '47212' AS postal_code, 'bac_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19138' AS code, 'Xã Phong Nha' AS name, 'Phong Nha' AS short_name, 'Phong Nha' AS name_en, '47232' AS postal_code, 'phong_nha' AS slug
UNION ALL
       SELECT '44' AS province_code, '19141' AS code, 'Xã Bố Trạch' AS name, 'Bố Trạch' AS short_name, 'Bo Trach' AS name_en, '47237' AS postal_code, 'bo_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19147' AS code, 'Xã Thượng Trạch' AS name, 'Thượng Trạch' AS short_name, 'Thuong Trach' AS name_en, '47230' AS postal_code, 'thuong_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19159' AS code, 'Xã Đông Trạch' AS name, 'Đông Trạch' AS short_name, 'Dong Trach' AS name_en, '47236' AS postal_code, 'dong_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19198' AS code, 'Xã Nam Trạch' AS name, 'Nam Trạch' AS short_name, 'Nam Trach' AS name_en, '47238' AS postal_code, 'nam_trach' AS slug
UNION ALL
       SELECT '44' AS province_code, '19204' AS code, 'Xã Trường Sơn' AS name, 'Trường Sơn' AS short_name, 'Truong Son' AS name_en, '47720' AS postal_code, 'truong_son' AS slug
UNION ALL
       SELECT '44' AS province_code, '19207' AS code, 'Xã Quảng Ninh' AS name, 'Quảng Ninh' AS short_name, 'Quang Ninh' AS name_en, '47721' AS postal_code, 'quang_ninh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19225' AS code, 'Xã Ninh Châu' AS name, 'Ninh Châu' AS short_name, 'Ninh Chau' AS name_en, '47722' AS postal_code, 'ninh_chau' AS slug
UNION ALL
       SELECT '44' AS province_code, '19237' AS code, 'Xã Trường Ninh' AS name, 'Trường Ninh' AS short_name, 'Truong Ninh' AS name_en, '47723' AS postal_code, 'truong_ninh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19246' AS code, 'Xã Lệ Ninh' AS name, 'Lệ Ninh' AS short_name, 'Le Ninh' AS name_en, '47839' AS postal_code, 'le_ninh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19249' AS code, 'Xã Lệ Thuỷ' AS name, 'Lệ Thuỷ' AS short_name, 'Le Thuy' AS name_en, '47834' AS postal_code, 'le_thuy' AS slug
UNION ALL
       SELECT '44' AS province_code, '19255' AS code, 'Xã Cam Hồng' AS name, 'Cam Hồng' AS short_name, 'Cam Hong' AS name_en, '47835' AS postal_code, 'cam_hong' AS slug
UNION ALL
       SELECT '44' AS province_code, '19288' AS code, 'Xã Sen Ngư' AS name, 'Sen Ngư' AS short_name, 'Sen Ngu' AS name_en, '47836' AS postal_code, 'sen_ngu' AS slug
UNION ALL
       SELECT '44' AS province_code, '19291' AS code, 'Xã Tân Mỹ' AS name, 'Tân Mỹ' AS short_name, 'Tan My' AS name_en, '47837' AS postal_code, 'tan_my' AS slug
UNION ALL
       SELECT '44' AS province_code, '19309' AS code, 'Xã Trường Phú' AS name, 'Trường Phú' AS short_name, 'Truong Phu' AS name_en, '47838' AS postal_code, 'truong_phu' AS slug
UNION ALL
       SELECT '44' AS province_code, '19318' AS code, 'Xã Kim Ngân' AS name, 'Kim Ngân' AS short_name, 'Kim Ngan' AS name_en, '47840' AS postal_code, 'kim_ngan' AS slug
UNION ALL
       SELECT '44' AS province_code, '19333' AS code, 'Phường Đông Hà' AS name, 'Đông Hà' AS short_name, 'Dong Ha' AS name_en, '48115' AS postal_code, 'dong_ha' AS slug
UNION ALL
       SELECT '44' AS province_code, '19351' AS code, 'Phường Nam Đông Hà' AS name, 'Nam Đông Hà' AS short_name, 'Nam Dong Ha' AS name_en, '48116' AS postal_code, 'nam_dong_ha' AS slug
UNION ALL
       SELECT '44' AS province_code, '19360' AS code, 'Phường Quảng Trị' AS name, 'Quảng Trị' AS short_name, 'Quang Tri' AS name_en, '48811' AS postal_code, 'quang_tri' AS slug
UNION ALL
       SELECT '44' AS province_code, '19363' AS code, 'Xã Vĩnh Linh' AS name, 'Vĩnh Linh' AS short_name, 'Vinh Linh' AS name_en, '48428' AS postal_code, 'vinh_linh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19366' AS code, 'Xã Bến Quan' AS name, 'Bến Quan' AS short_name, 'Ben Quan' AS name_en, '48423' AS postal_code, 'ben_quan' AS slug
UNION ALL
       SELECT '44' AS province_code, '19372' AS code, 'Xã Vĩnh Hoàng' AS name, 'Vĩnh Hoàng' AS short_name, 'Vinh Hoang' AS name_en, '48429' AS postal_code, 'vinh_hoang' AS slug
UNION ALL
       SELECT '44' AS province_code, '19405' AS code, 'Xã Vĩnh Thuỷ' AS name, 'Vĩnh Thuỷ' AS short_name, 'Vinh Thuy' AS name_en, '48424' AS postal_code, 'vinh_thuy' AS slug
UNION ALL
       SELECT '44' AS province_code, '19414' AS code, 'Xã Cửa Tùng' AS name, 'Cửa Tùng' AS short_name, 'Cua Tung' AS name_en, '48419' AS postal_code, 'cua_tung' AS slug
UNION ALL
       SELECT '44' AS province_code, '19429' AS code, 'Xã Khe Sanh' AS name, 'Khe Sanh' AS short_name, 'Khe Sanh' AS name_en, '48506' AS postal_code, 'khe_sanh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19432' AS code, 'Xã Lao Bảo' AS name, 'Lao Bảo' AS short_name, 'Lao Bao' AS name_en, '48515' AS postal_code, 'lao_bao' AS slug
UNION ALL
       SELECT '44' AS province_code, '19435' AS code, 'Xã Hướng Lập' AS name, 'Hướng Lập' AS short_name, 'Huong Lap' AS name_en, '48510' AS postal_code, 'huong_lap' AS slug
UNION ALL
       SELECT '44' AS province_code, '19441' AS code, 'Xã Hướng Phùng' AS name, 'Hướng Phùng' AS short_name, 'Huong Phung' AS name_en, '48512' AS postal_code, 'huong_phung' AS slug
UNION ALL
       SELECT '44' AS province_code, '19462' AS code, 'Xã Tân Lập' AS name, 'Tân Lập' AS short_name, 'Tan Lap' AS name_en, '48517' AS postal_code, 'tan_lap' AS slug
UNION ALL
       SELECT '44' AS province_code, '19483' AS code, 'Xã A Dơi' AS name, 'A Dơi' AS short_name, 'A Doi' AS name_en, '48526' AS postal_code, 'a_doi' AS slug
UNION ALL
       SELECT '44' AS province_code, '19489' AS code, 'Xã Lìa' AS name, 'Lìa' AS short_name, 'Lia' AS name_en, '48523' AS postal_code, 'lia' AS slug
UNION ALL
       SELECT '44' AS province_code, '19495' AS code, 'Xã Gio Linh' AS name, 'Gio Linh' AS short_name, 'Gio Linh' AS name_en, '48306' AS postal_code, 'gio_linh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19496' AS code, 'Xã Cửa Việt' AS name, 'Cửa Việt' AS short_name, 'Cua Viet' AS name_en, '48319' AS postal_code, 'cua_viet' AS slug
UNION ALL
       SELECT '44' AS province_code, '19501' AS code, 'Xã Bến Hải' AS name, 'Bến Hải' AS short_name, 'Ben Hai' AS name_en, '48328' AS postal_code, 'ben_hai' AS slug
UNION ALL
       SELECT '44' AS province_code, '19537' AS code, 'Xã Cồn Tiên' AS name, 'Cồn Tiên' AS short_name, 'Con Tien' AS name_en, '48327' AS postal_code, 'con_tien' AS slug
UNION ALL
       SELECT '44' AS province_code, '19555' AS code, 'Xã Hướng Hiệp' AS name, 'Hướng Hiệp' AS short_name, 'Huong Hiep' AS name_en, '48607' AS postal_code, 'huong_hiep' AS slug
UNION ALL
       SELECT '44' AS province_code, '19564' AS code, 'Xã Đakrông' AS name, 'Đakrông' AS short_name, 'Dakrong' AS name_en, '48608' AS postal_code, 'dakrong' AS slug
UNION ALL
       SELECT '44' AS province_code, '19567' AS code, 'Xã Ba Lòng' AS name, 'Ba Lòng' AS short_name, 'Ba Long' AS name_en, '48612' AS postal_code, 'ba_long' AS slug
UNION ALL
       SELECT '44' AS province_code, '19588' AS code, 'Xã Tà Rụt' AS name, 'Tà Rụt' AS short_name, 'Ta Rut' AS name_en, '48617' AS postal_code, 'ta_rut' AS slug
UNION ALL
       SELECT '44' AS province_code, '19594' AS code, 'Xã La Lay' AS name, 'La Lay' AS short_name, 'La Lay' AS name_en, '48620' AS postal_code, 'la_lay' AS slug
UNION ALL
       SELECT '44' AS province_code, '19597' AS code, 'Xã Cam Lộ' AS name, 'Cam Lộ' AS short_name, 'Cam Lo' AS name_en, '48206' AS postal_code, 'cam_lo' AS slug
UNION ALL
       SELECT '44' AS province_code, '19603' AS code, 'Xã Hiếu Giang' AS name, 'Hiếu Giang' AS short_name, 'Hieu Giang' AS name_en, '48215' AS postal_code, 'hieu_giang' AS slug
UNION ALL
       SELECT '44' AS province_code, '19624' AS code, 'Xã Triệu Phong' AS name, 'Triệu Phong' AS short_name, 'Trieu Phong' AS name_en, '48725' AS postal_code, 'trieu_phong' AS slug
UNION ALL
       SELECT '44' AS province_code, '19639' AS code, 'Xã Nam Cửa Việt' AS name, 'Nam Cửa Việt' AS short_name, 'Nam Cua Viet' AS name_en, '48728' AS postal_code, 'nam_cua_viet' AS slug
UNION ALL
       SELECT '44' AS province_code, '19645' AS code, 'Xã Triệu Bình' AS name, 'Triệu Bình' AS short_name, 'Trieu Binh' AS name_en, '48727' AS postal_code, 'trieu_binh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19654' AS code, 'Xã Triệu Cơ' AS name, 'Triệu Cơ' AS short_name, 'Trieu Co' AS name_en, '48711' AS postal_code, 'trieu_co' AS slug
UNION ALL
       SELECT '44' AS province_code, '19669' AS code, 'Xã Ái Tử' AS name, 'Ái Tử' AS short_name, 'Ai Tu' AS name_en, '48726' AS postal_code, 'ai_tu' AS slug
UNION ALL
       SELECT '44' AS province_code, '19681' AS code, 'Xã Diên Sanh' AS name, 'Diên Sanh' AS short_name, 'Dien Sanh' AS name_en, '48906' AS postal_code, 'dien_sanh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19699' AS code, 'Xã Vĩnh Định' AS name, 'Vĩnh Định' AS short_name, 'Vinh Dinh' AS name_en, '48929' AS postal_code, 'vinh_dinh' AS slug
UNION ALL
       SELECT '44' AS province_code, '19702' AS code, 'Xã Hải Lăng' AS name, 'Hải Lăng' AS short_name, 'Hai Lang' AS name_en, '48927' AS postal_code, 'hai_lang' AS slug
UNION ALL
       SELECT '44' AS province_code, '19735' AS code, 'Xã Nam Hải Lăng' AS name, 'Nam Hải Lăng' AS short_name, 'Nam Hai Lang' AS name_en, '48928' AS postal_code, 'nam_hai_lang' AS slug
UNION ALL
       SELECT '44' AS province_code, '19741' AS code, 'Xã Mỹ Thuỷ' AS name, 'Mỹ Thuỷ' AS short_name, 'My Thuy' AS name_en, '48926' AS postal_code, 'my_thuy' AS slug
UNION ALL
       SELECT '44' AS province_code, '19742' AS code, 'Đặc khu Cồn Cỏ' AS name, 'Cồn Cỏ' AS short_name, 'Con Co' AS name_en, '48956' AS postal_code, 'con_co' AS slug
UNION ALL
       SELECT '46' AS province_code, '19753' AS code, 'Phường Phú Xuân' AS name, 'Phú Xuân' AS short_name, 'Phu Xuan' AS name_en, '49133' AS postal_code, 'phu_xuan' AS slug
UNION ALL
       SELECT '46' AS province_code, '19774' AS code, 'Phường Kim Long' AS name, 'Kim Long' AS short_name, 'Kim Long' AS name_en, '49122' AS postal_code, 'kim_long' AS slug
UNION ALL
       SELECT '46' AS province_code, '19777' AS code, 'Phường Vỹ Dạ' AS name, 'Vỹ Dạ' AS short_name, 'Vy Da' AS name_en, '49107' AS postal_code, 'vy_da' AS slug
UNION ALL
       SELECT '46' AS province_code, '19789' AS code, 'Phường Thuận Hoá' AS name, 'Thuận Hoá' AS short_name, 'Thuan Hoa' AS name_en, '49135' AS postal_code, 'thuan_hoa' AS slug
UNION ALL
       SELECT '46' AS province_code, '19804' AS code, 'Phường Hương An' AS name, 'Hương An' AS short_name, 'Huong An' AS name_en, '49136' AS postal_code, 'huong_an' AS slug
UNION ALL
       SELECT '46' AS province_code, '19813' AS code, 'Phường Thuỷ Xuân' AS name, 'Thuỷ Xuân' AS short_name, 'Thuy Xuan' AS name_en, '49131' AS postal_code, 'thuy_xuan' AS slug
UNION ALL
       SELECT '46' AS province_code, '19815' AS code, 'Phường An Cựu' AS name, 'An Cựu' AS short_name, 'An Cuu' AS name_en, '49129' AS postal_code, 'an_cuu' AS slug
UNION ALL
       SELECT '46' AS province_code, '19819' AS code, 'Phường Phong Điền' AS name, 'Phong Điền' AS short_name, 'Phong Dien' AS name_en, '49322' AS postal_code, 'phong_dien' AS slug
UNION ALL
       SELECT '46' AS province_code, '19828' AS code, 'Phường Phong Phú' AS name, 'Phong Phú' AS short_name, 'Phong Phu' AS name_en, '49309' AS postal_code, 'phong_phu' AS slug
UNION ALL
       SELECT '46' AS province_code, '19831' AS code, 'Phường Phong Dinh' AS name, 'Phong Dinh' AS short_name, 'Phong Dinh' AS name_en, '49325' AS postal_code, 'phong_dinh' AS slug
UNION ALL
       SELECT '46' AS province_code, '19858' AS code, 'Phường Phong Thái' AS name, 'Phong Thái' AS short_name, 'Phong Thai' AS name_en, '49323' AS postal_code, 'phong_thai' AS slug
UNION ALL
       SELECT '46' AS province_code, '19867' AS code, 'Xã Quảng Điền' AS name, 'Quảng Điền' AS short_name, 'Quang Dien' AS name_en, '49217' AS postal_code, 'quang_dien' AS slug
UNION ALL
       SELECT '46' AS province_code, '19873' AS code, 'Phường Phong Quảng' AS name, 'Phong Quảng' AS short_name, 'Phong Quang' AS name_en, '49324' AS postal_code, 'phong_quang' AS slug
UNION ALL
       SELECT '46' AS province_code, '19885' AS code, 'Xã Đan Điền' AS name, 'Đan Điền' AS short_name, 'Dan Dien' AS name_en, '49218' AS postal_code, 'dan_dien' AS slug
UNION ALL
       SELECT '46' AS province_code, '19900' AS code, 'Phường Thuận An' AS name, 'Thuận An' AS short_name, 'Thuan An' AS name_en, '49141' AS postal_code, 'thuan_an' AS slug
UNION ALL
       SELECT '46' AS province_code, '19909' AS code, 'Phường Dương Nỗ' AS name, 'Dương Nỗ' AS short_name, 'Duong No' AS name_en, '49142' AS postal_code, 'duong_no' AS slug
UNION ALL
       SELECT '46' AS province_code, '19918' AS code, 'Xã Phú Hồ' AS name, 'Phú Hồ' AS short_name, 'Phu Ho' AS name_en, '49925' AS postal_code, 'phu_ho' AS slug
UNION ALL
       SELECT '46' AS province_code, '19930' AS code, 'Phường Mỹ Thượng' AS name, 'Mỹ Thượng' AS short_name, 'My Thuong' AS name_en, '49927' AS postal_code, 'my_thuong' AS slug
UNION ALL
       SELECT '46' AS province_code, '19942' AS code, 'Xã Phú Vang' AS name, 'Phú Vang' AS short_name, 'Phu Vang' AS name_en, '49929' AS postal_code, 'phu_vang' AS slug
UNION ALL
       SELECT '46' AS province_code, '19945' AS code, 'Xã Phú Vinh' AS name, 'Phú Vinh' AS short_name, 'Phu Vinh' AS name_en, '49928' AS postal_code, 'phu_vinh' AS slug
UNION ALL
       SELECT '46' AS province_code, '19960' AS code, 'Phường Phú Bài' AS name, 'Phú Bài' AS short_name, 'Phu Bai' AS name_en, '49612' AS postal_code, 'phu_bai' AS slug
UNION ALL
       SELECT '46' AS province_code, '19969' AS code, 'Phường Thanh Thuỷ' AS name, 'Thanh Thuỷ' AS short_name, 'Thanh Thuy' AS name_en, '49619' AS postal_code, 'thanh_thuy' AS slug
UNION ALL
       SELECT '46' AS province_code, '19975' AS code, 'Phường Hương Thuỷ' AS name, 'Hương Thuỷ' AS short_name, 'Huong Thuy' AS name_en, '49620' AS postal_code, 'huong_thuy' AS slug
UNION ALL
       SELECT '46' AS province_code, '19996' AS code, 'Phường Hương Trà' AS name, 'Hương Trà' AS short_name, 'Huong Tra' AS name_en, '49422' AS postal_code, 'huong_tra' AS slug
UNION ALL
       SELECT '46' AS province_code, '20014' AS code, 'Phường Hoá Châu' AS name, 'Hoá Châu' AS short_name, 'Hoa Chau' AS name_en, '49134' AS postal_code, 'hoa_chau' AS slug
UNION ALL
       SELECT '46' AS province_code, '20017' AS code, 'Phường Kim Trà' AS name, 'Kim Trà' AS short_name, 'Kim Tra' AS name_en, '49423' AS postal_code, 'kim_tra' AS slug
UNION ALL
       SELECT '46' AS province_code, '20035' AS code, 'Xã Bình Điền' AS name, 'Bình Điền' AS short_name, 'Binh Dien' AS name_en, '49424' AS postal_code, 'binh_dien' AS slug
UNION ALL
       SELECT '46' AS province_code, '20044' AS code, 'Xã A Lưới 2' AS name, 'A Lưới 2' AS short_name, 'A Luoi 2' AS name_en, '49528' AS postal_code, 'a_luoi_2' AS slug
UNION ALL
       SELECT '46' AS province_code, '20050' AS code, 'Xã A Lưới 5' AS name, 'A Lưới 5' AS short_name, 'A Luoi 5' AS name_en, '49531' AS postal_code, 'a_luoi_5' AS slug
UNION ALL
       SELECT '46' AS province_code, '20056' AS code, 'Xã A Lưới 1' AS name, 'A Lưới 1' AS short_name, 'A Luoi 1' AS name_en, '49527' AS postal_code, 'a_luoi_1' AS slug
UNION ALL
       SELECT '46' AS province_code, '20071' AS code, 'Xã A Lưới 3' AS name, 'A Lưới 3' AS short_name, 'A Luoi 3' AS name_en, '49529' AS postal_code, 'a_luoi_3' AS slug
UNION ALL
       SELECT '46' AS province_code, '20101' AS code, 'Xã A Lưới 4' AS name, 'A Lưới 4' AS short_name, 'A Luoi 4' AS name_en, '49530' AS postal_code, 'a_luoi_4' AS slug
UNION ALL
       SELECT '46' AS province_code, '20107' AS code, 'Xã Phú Lộc' AS name, 'Phú Lộc' AS short_name, 'Phu Loc' AS name_en, '49806' AS postal_code, 'phu_loc' AS slug
UNION ALL
       SELECT '46' AS province_code, '20122' AS code, 'Xã Vinh Lộc' AS name, 'Vinh Lộc' AS short_name, 'Vinh Loc' AS name_en, '49824' AS postal_code, 'vinh_loc' AS slug
UNION ALL
       SELECT '46' AS province_code, '20131' AS code, 'Xã Hưng Lộc' AS name, 'Hưng Lộc' AS short_name, 'Hung Loc' AS name_en, '49828' AS postal_code, 'hung_loc' AS slug
UNION ALL
       SELECT '46' AS province_code, '20137' AS code, 'Xã Chân Mây - Lăng Cô' AS name, 'Chân Mây - Lăng Cô' AS short_name, 'Chan May - Lang Co' AS name_en, '49825' AS postal_code, 'chan_may_lang_co' AS slug
UNION ALL
       SELECT '46' AS province_code, '20140' AS code, 'Xã Lộc An' AS name, 'Lộc An' AS short_name, 'Loc An' AS name_en, '49814' AS postal_code, 'loc_an' AS slug
UNION ALL
       SELECT '46' AS province_code, '20161' AS code, 'Xã Khe Tre' AS name, 'Khe Tre' AS short_name, 'Khe Tre' AS name_en, '49706' AS postal_code, 'khe_tre' AS slug
UNION ALL
       SELECT '46' AS province_code, '20179' AS code, 'Xã Nam Đông' AS name, 'Nam Đông' AS short_name, 'Nam Dong' AS name_en, '49827' AS postal_code, 'nam_dong' AS slug
UNION ALL
       SELECT '46' AS province_code, '20182' AS code, 'Xã Long Quảng' AS name, 'Long Quảng' AS short_name, 'Long Quang' AS name_en, '49826' AS postal_code, 'long_quang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20194' AS code, 'Phường Hải Vân' AS name, 'Hải Vân' AS short_name, 'Hai Van' AS name_en, '50611' AS postal_code, 'hai_van' AS slug
UNION ALL
       SELECT '48' AS province_code, '20197' AS code, 'Phường Liên Chiểu' AS name, 'Liên Chiểu' AS short_name, 'Lien Chieu' AS name_en, '50612' AS postal_code, 'lien_chieu' AS slug
UNION ALL
       SELECT '48' AS province_code, '20200' AS code, 'Phường Hoà Khánh' AS name, 'Hoà Khánh' AS short_name, 'Hoa Khanh' AS name_en, '50613' AS postal_code, 'hoa_khanh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20209' AS code, 'Phường Thanh Khê' AS name, 'Thanh Khê' AS short_name, 'Thanh Khe' AS name_en, '50316' AS postal_code, 'thanh_khe' AS slug
UNION ALL
       SELECT '48' AS province_code, '20242' AS code, 'Phường Hải Châu' AS name, 'Hải Châu' AS short_name, 'Hai Chau' AS name_en, '50206' AS postal_code, 'hai_chau' AS slug
UNION ALL
       SELECT '48' AS province_code, '20257' AS code, 'Phường Hoà Cường' AS name, 'Hoà Cường' AS short_name, 'Hoa Cuong' AS name_en, '50219' AS postal_code, 'hoa_cuong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20260' AS code, 'Phường Cẩm Lệ' AS name, 'Cẩm Lệ' AS short_name, 'Cam Le' AS name_en, '50712' AS postal_code, 'cam_le' AS slug
UNION ALL
       SELECT '48' AS province_code, '20263' AS code, 'Phường Sơn Trà' AS name, 'Sơn Trà' AS short_name, 'Son Tra' AS name_en, '50414' AS postal_code, 'son_tra' AS slug
UNION ALL
       SELECT '48' AS province_code, '20275' AS code, 'Phường An Hải' AS name, 'An Hải' AS short_name, 'An Hai' AS name_en, '50413' AS postal_code, 'an_hai' AS slug
UNION ALL
       SELECT '48' AS province_code, '20285' AS code, 'Phường Ngũ Hành Sơn' AS name, 'Ngũ Hành Sơn' AS short_name, 'Ngu Hanh Son' AS name_en, '50510' AS postal_code, 'ngu_hanh_son' AS slug
UNION ALL
       SELECT '48' AS province_code, '20305' AS code, 'Phường An Khê' AS name, 'An Khê' AS short_name, 'An Khe' AS name_en, '50309' AS postal_code, 'an_khe' AS slug
UNION ALL
       SELECT '48' AS province_code, '20308' AS code, 'Xã Bà Nà' AS name, 'Bà Nà' AS short_name, 'Ba Na' AS name_en, '50818' AS postal_code, 'ba_na' AS slug
UNION ALL
       SELECT '48' AS province_code, '20314' AS code, 'Phường Hoà Xuân' AS name, 'Hoà Xuân' AS short_name, 'Hoa Xuan' AS name_en, '50707' AS postal_code, 'hoa_xuan' AS slug
UNION ALL
       SELECT '48' AS province_code, '20320' AS code, 'Xã Hoà Vang' AS name, 'Hoà Vang' AS short_name, 'Hoa Vang' AS name_en, '50817' AS postal_code, 'hoa_vang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20332' AS code, 'Xã Hoà Tiến' AS name, 'Hoà Tiến' AS short_name, 'Hoa Tien' AS name_en, '50814' AS postal_code, 'hoa_tien' AS slug
UNION ALL
       SELECT '48' AS province_code, '20333' AS code, 'Đặc khu Hoàng Sa' AS name, 'Hoàng Sa' AS short_name, 'Paracel' AS name_en, '50906' AS postal_code, 'hoang_sa' AS slug
UNION ALL
       SELECT '48' AS province_code, '20335' AS code, 'Phường Bàn Thạch' AS name, 'Bàn Thạch' AS short_name, 'Ban Thach' AS name_en, '51121' AS postal_code, 'ban_thach' AS slug
UNION ALL
       SELECT '48' AS province_code, '20341' AS code, 'Phường Tam Kỳ' AS name, 'Tam Kỳ' AS short_name, 'Tam Ky' AS name_en, '51119' AS postal_code, 'tam_ky' AS slug
UNION ALL
       SELECT '48' AS province_code, '20350' AS code, 'Phường Hương Trà' AS name, 'Hương Trà' AS short_name, 'Huong Tra' AS name_en, '51122' AS postal_code, 'huong_tra' AS slug
UNION ALL
       SELECT '48' AS province_code, '20356' AS code, 'Phường Quảng Phú' AS name, 'Quảng Phú' AS short_name, 'Quang Phu' AS name_en, '51120' AS postal_code, 'quang_phu' AS slug
UNION ALL
       SELECT '48' AS province_code, '20364' AS code, 'Xã Chiên Đàn' AS name, 'Chiên Đàn' AS short_name, 'Chien Dan' AS name_en, '52718' AS postal_code, 'chien_dan' AS slug
UNION ALL
       SELECT '48' AS province_code, '20380' AS code, 'Xã Tây Hồ' AS name, 'Tây Hồ' AS short_name, 'Tay Ho' AS name_en, '52717' AS postal_code, 'tay_ho' AS slug
UNION ALL
       SELECT '48' AS province_code, '20392' AS code, 'Xã Phú Ninh' AS name, 'Phú Ninh' AS short_name, 'Phu Ninh' AS name_en, '52719' AS postal_code, 'phu_ninh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20401' AS code, 'Phường Hội An Tây' AS name, 'Hội An Tây' AS short_name, 'Hoi An Tay' AS name_en, '51321' AS postal_code, 'hoi_an_tay' AS slug
UNION ALL
       SELECT '48' AS province_code, '20410' AS code, 'Phường Hội An' AS name, 'Hội An' AS short_name, 'Hoi An' AS name_en, '51319' AS postal_code, 'hoi_an' AS slug
UNION ALL
       SELECT '48' AS province_code, '20413' AS code, 'Phường Hội An Đông' AS name, 'Hội An Đông' AS short_name, 'Hoi An Dong' AS name_en, '51320' AS postal_code, 'hoi_an_dong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20434' AS code, 'Xã Tân Hiệp' AS name, 'Tân Hiệp' AS short_name, 'Tan Hiep' AS name_en, '51318' AS postal_code, 'tan_hiep' AS slug
UNION ALL
       SELECT '48' AS province_code, '20443' AS code, 'Xã Hùng Sơn' AS name, 'Hùng Sơn' AS short_name, 'Hung Son' AS name_en, '51817' AS postal_code, 'hung_son' AS slug
UNION ALL
       SELECT '48' AS province_code, '20455' AS code, 'Xã Tây Giang' AS name, 'Tây Giang' AS short_name, 'Tay Giang' AS name_en, '51816' AS postal_code, 'tay_giang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20458' AS code, 'Xã Avương' AS name, 'Avương' AS short_name, 'Avuong' AS name_en, '51807' AS postal_code, 'avuong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20467' AS code, 'Xã Đông Giang' AS name, 'Đông Giang' AS short_name, 'Dong Giang' AS name_en, '51717' AS postal_code, 'dong_giang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20476' AS code, 'Xã Sông Kôn' AS name, 'Sông Kôn' AS short_name, 'Song Kon' AS name_en, '51708' AS postal_code, 'song_kon' AS slug
UNION ALL
       SELECT '48' AS province_code, '20485' AS code, 'Xã Sông Vàng' AS name, 'Sông Vàng' AS short_name, 'Song Vang' AS name_en, '51718' AS postal_code, 'song_vang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20494' AS code, 'Xã Bến Hiên' AS name, 'Bến Hiên' AS short_name, 'Ben Hien' AS name_en, '51719' AS postal_code, 'ben_hien' AS slug
UNION ALL
       SELECT '48' AS province_code, '20500' AS code, 'Xã Đại Lộc' AS name, 'Đại Lộc' AS short_name, 'Dai Loc' AS name_en, '51624' AS postal_code, 'dai_loc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20506' AS code, 'Xã Thượng Đức' AS name, 'Thượng Đức' AS short_name, 'Thuong Duc' AS name_en, '51626' AS postal_code, 'thuong_duc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20515' AS code, 'Xã Hà Nha' AS name, 'Hà Nha' AS short_name, 'Ha Nha' AS name_en, '51625' AS postal_code, 'ha_nha' AS slug
UNION ALL
       SELECT '48' AS province_code, '20539' AS code, 'Xã Vu Gia' AS name, 'Vu Gia' AS short_name, 'Vu Gia' AS name_en, '51627' AS postal_code, 'vu_gia' AS slug
UNION ALL
       SELECT '48' AS province_code, '20542' AS code, 'Xã Phú Thuận' AS name, 'Phú Thuận' AS short_name, 'Phu Thuan' AS name_en, '51628' AS postal_code, 'phu_thuan' AS slug
UNION ALL
       SELECT '48' AS province_code, '20551' AS code, 'Phường Điện Bàn' AS name, 'Điện Bàn' AS short_name, 'Dien Ban' AS name_en, '51426' AS postal_code, 'dien_ban' AS slug
UNION ALL
       SELECT '48' AS province_code, '20557' AS code, 'Phường Điện Bàn Bắc' AS name, 'Điện Bàn Bắc' AS short_name, 'Dien Ban Bac' AS name_en, '51429' AS postal_code, 'dien_ban_bac' AS slug
UNION ALL
       SELECT '48' AS province_code, '20569' AS code, 'Xã Điện Bàn Tây' AS name, 'Điện Bàn Tây' AS short_name, 'Dien Ban Tay' AS name_en, '51430' AS postal_code, 'dien_ban_tay' AS slug
UNION ALL
       SELECT '48' AS province_code, '20575' AS code, 'Phường An Thắng' AS name, 'An Thắng' AS short_name, 'An Thang' AS name_en, '51428' AS postal_code, 'an_thang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20579' AS code, 'Phường Điện Bàn Đông' AS name, 'Điện Bàn Đông' AS short_name, 'Dien Ban Dong' AS name_en, '51427' AS postal_code, 'dien_ban_dong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20587' AS code, 'Xã Gò Nổi' AS name, 'Gò Nổi' AS short_name, 'Go Noi' AS name_en, '51431' AS postal_code, 'go_noi' AS slug
UNION ALL
       SELECT '48' AS province_code, '20599' AS code, 'Xã Nam Phước' AS name, 'Nam Phước' AS short_name, 'Nam Phuoc' AS name_en, '51506' AS postal_code, 'nam_phuoc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20611' AS code, 'Xã Thu Bồn' AS name, 'Thu Bồn' AS short_name, 'Thu Bon' AS name_en, '51521' AS postal_code, 'thu_bon' AS slug
UNION ALL
       SELECT '48' AS province_code, '20623' AS code, 'Xã Duy Xuyên' AS name, 'Duy Xuyên' AS short_name, 'Duy Xuyen' AS name_en, '51520' AS postal_code, 'duy_xuyen' AS slug
UNION ALL
       SELECT '48' AS province_code, '20635' AS code, 'Xã Duy Nghĩa' AS name, 'Duy Nghĩa' AS short_name, 'Duy Nghia' AS name_en, '51510' AS postal_code, 'duy_nghia' AS slug
UNION ALL
       SELECT '48' AS province_code, '20641' AS code, 'Xã Quế Sơn' AS name, 'Quế Sơn' AS short_name, 'Que Son' AS name_en, '52121' AS postal_code, 'que_son' AS slug
UNION ALL
       SELECT '48' AS province_code, '20650' AS code, 'Xã Xuân Phú' AS name, 'Xuân Phú' AS short_name, 'Xuan Phu' AS name_en, '52120' AS postal_code, 'xuan_phu' AS slug
UNION ALL
       SELECT '48' AS province_code, '20656' AS code, 'Xã Nông Sơn' AS name, 'Nông Sơn' AS short_name, 'Nong Son' AS name_en, '52123' AS postal_code, 'nong_son' AS slug
UNION ALL
       SELECT '48' AS province_code, '20662' AS code, 'Xã Quế Sơn Trung' AS name, 'Quế Sơn Trung' AS short_name, 'Que Son Trung' AS name_en, '52122' AS postal_code, 'que_son_trung' AS slug
UNION ALL
       SELECT '48' AS province_code, '20669' AS code, 'Xã Quế Phước' AS name, 'Quế Phước' AS short_name, 'Que Phuoc' AS name_en, '52124' AS postal_code, 'que_phuoc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20695' AS code, 'Xã Thạnh Mỹ' AS name, 'Thạnh Mỹ' AS short_name, 'Thanh My' AS name_en, '51906' AS postal_code, 'thanh_my' AS slug
UNION ALL
       SELECT '48' AS province_code, '20698' AS code, 'Xã La Êê' AS name, 'La Êê' AS short_name, 'La Ee' AS name_en, '51909' AS postal_code, 'la_ee' AS slug
UNION ALL
       SELECT '48' AS province_code, '20704' AS code, 'Xã La Dêê' AS name, 'La Dêê' AS short_name, 'La Dee' AS name_en, '51911' AS postal_code, 'la_dee' AS slug
UNION ALL
       SELECT '48' AS province_code, '20707' AS code, 'Xã Nam Giang' AS name, 'Nam Giang' AS short_name, 'Nam Giang' AS name_en, '51919' AS postal_code, 'nam_giang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20710' AS code, 'Xã Bến Giằng' AS name, 'Bến Giằng' AS short_name, 'Ben Giang' AS name_en, '51918' AS postal_code, 'ben_giang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20716' AS code, 'Xã Đắc Pring' AS name, 'Đắc Pring' AS short_name, 'Dac Pring' AS name_en, '51915' AS postal_code, 'dac_pring' AS slug
UNION ALL
       SELECT '48' AS province_code, '20722' AS code, 'Xã Khâm Đức' AS name, 'Khâm Đức' AS short_name, 'Kham Duc' AS name_en, '52306' AS postal_code, 'kham_duc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20728' AS code, 'Xã Phước Hiệp' AS name, 'Phước Hiệp' AS short_name, 'Phuoc Hiep' AS name_en, '52317' AS postal_code, 'phuoc_hiep' AS slug
UNION ALL
       SELECT '48' AS province_code, '20734' AS code, 'Xã Phước Năng' AS name, 'Phước Năng' AS short_name, 'Phuoc Nang' AS name_en, '52309' AS postal_code, 'phuoc_nang' AS slug
UNION ALL
       SELECT '48' AS province_code, '20740' AS code, 'Xã Phước Chánh' AS name, 'Phước Chánh' AS short_name, 'Phuoc Chanh' AS name_en, '52311' AS postal_code, 'phuoc_chanh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20752' AS code, 'Xã Phước Thành' AS name, 'Phước Thành' AS short_name, 'Phuoc Thanh' AS name_en, '52314' AS postal_code, 'phuoc_thanh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20767' AS code, 'Xã Việt An' AS name, 'Việt An' AS short_name, 'Viet An' AS name_en, '52219' AS postal_code, 'viet_an' AS slug
UNION ALL
       SELECT '48' AS province_code, '20770' AS code, 'Xã Phước Trà' AS name, 'Phước Trà' AS short_name, 'Phuoc Tra' AS name_en, '52214' AS postal_code, 'phuoc_tra' AS slug
UNION ALL
       SELECT '48' AS province_code, '20779' AS code, 'Xã Hiệp Đức' AS name, 'Hiệp Đức' AS short_name, 'Hiep Duc' AS name_en, '52218' AS postal_code, 'hiep_duc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20791' AS code, 'Xã Thăng Bình' AS name, 'Thăng Bình' AS short_name, 'Thang Binh' AS name_en, '51228' AS postal_code, 'thang_binh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20794' AS code, 'Xã Thăng An' AS name, 'Thăng An' AS short_name, 'Thang An' AS name_en, '51229' AS postal_code, 'thang_an' AS slug
UNION ALL
       SELECT '48' AS province_code, '20818' AS code, 'Xã Đồng Dương' AS name, 'Đồng Dương' AS short_name, 'Dong Duong' AS name_en, '51233' AS postal_code, 'dong_duong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20827' AS code, 'Xã Thăng Phú' AS name, 'Thăng Phú' AS short_name, 'Thang Phu' AS name_en, '51232' AS postal_code, 'thang_phu' AS slug
UNION ALL
       SELECT '48' AS province_code, '20836' AS code, 'Xã Thăng Trường' AS name, 'Thăng Trường' AS short_name, 'Thang Truong' AS name_en, '51230' AS postal_code, 'thang_truong' AS slug
UNION ALL
       SELECT '48' AS province_code, '20848' AS code, 'Xã Thăng Điền' AS name, 'Thăng Điền' AS short_name, 'Thang Dien' AS name_en, '51231' AS postal_code, 'thang_dien' AS slug
UNION ALL
       SELECT '48' AS province_code, '20854' AS code, 'Xã Tiên Phước' AS name, 'Tiên Phước' AS short_name, 'Tien Phuoc' AS name_en, '52622' AS postal_code, 'tien_phuoc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20857' AS code, 'Xã Sơn Cẩm Hà' AS name, 'Sơn Cẩm Hà' AS short_name, 'Son Cam Ha' AS name_en, '52624' AS postal_code, 'son_cam_ha' AS slug
UNION ALL
       SELECT '48' AS province_code, '20875' AS code, 'Xã Lãnh Ngọc' AS name, 'Lãnh Ngọc' AS short_name, 'Lanh Ngoc' AS name_en, '52621' AS postal_code, 'lanh_ngoc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20878' AS code, 'Xã Thạnh Bình' AS name, 'Thạnh Bình' AS short_name, 'Thanh Binh' AS name_en, '52623' AS postal_code, 'thanh_binh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20900' AS code, 'Xã Trà My' AS name, 'Trà My' AS short_name, 'Tra My' AS name_en, '52506' AS postal_code, 'tra_my' AS slug
UNION ALL
       SELECT '48' AS province_code, '20908' AS code, 'Xã Trà Liên' AS name, 'Trà Liên' AS short_name, 'Tra Lien' AS name_en, '52519' AS postal_code, 'tra_lien' AS slug
UNION ALL
       SELECT '48' AS province_code, '20920' AS code, 'Xã Trà Đốc' AS name, 'Trà Đốc' AS short_name, 'Tra Doc' AS name_en, '52509' AS postal_code, 'tra_doc' AS slug
UNION ALL
       SELECT '48' AS province_code, '20923' AS code, 'Xã Trà Tân' AS name, 'Trà Tân' AS short_name, 'Tra Tan' AS name_en, '52511' AS postal_code, 'tra_tan' AS slug
UNION ALL
       SELECT '48' AS province_code, '20929' AS code, 'Xã Trà Giáp' AS name, 'Trà Giáp' AS short_name, 'Tra Giap' AS name_en, '52517' AS postal_code, 'tra_giap' AS slug
UNION ALL
       SELECT '48' AS province_code, '20938' AS code, 'Xã Trà Leng' AS name, 'Trà Leng' AS short_name, 'Tra Leng' AS name_en, '52409' AS postal_code, 'tra_leng' AS slug
UNION ALL
       SELECT '48' AS province_code, '20941' AS code, 'Xã Trà Tập' AS name, 'Trà Tập' AS short_name, 'Tra Tap' AS name_en, '52407' AS postal_code, 'tra_tap' AS slug
UNION ALL
       SELECT '48' AS province_code, '20944' AS code, 'Xã Nam Trà My' AS name, 'Nam Trà My' AS short_name, 'Nam Tra My' AS name_en, '52416' AS postal_code, 'nam_tra_my' AS slug
UNION ALL
       SELECT '48' AS province_code, '20950' AS code, 'Xã Trà Linh' AS name, 'Trà Linh' AS short_name, 'Tra Linh' AS name_en, '52410' AS postal_code, 'tra_linh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20959' AS code, 'Xã Trà Vân' AS name, 'Trà Vân' AS short_name, 'Tra Van' AS name_en, '52414' AS postal_code, 'tra_van' AS slug
UNION ALL
       SELECT '48' AS province_code, '20965' AS code, 'Xã Núi Thành' AS name, 'Núi Thành' AS short_name, 'Nui Thanh' AS name_en, '52806' AS postal_code, 'nui_thanh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20971' AS code, 'Xã Tam Xuân' AS name, 'Tam Xuân' AS short_name, 'Tam Xuan' AS name_en, '52826' AS postal_code, 'tam_xuan' AS slug
UNION ALL
       SELECT '48' AS province_code, '20977' AS code, 'Xã Đức Phú' AS name, 'Đức Phú' AS short_name, 'Duc Phu' AS name_en, '52825' AS postal_code, 'duc_phu' AS slug
UNION ALL
       SELECT '48' AS province_code, '20984' AS code, 'Xã Tam Anh' AS name, 'Tam Anh' AS short_name, 'Tam Anh' AS name_en, '52824' AS postal_code, 'tam_anh' AS slug
UNION ALL
       SELECT '48' AS province_code, '20992' AS code, 'Xã Tam Hải' AS name, 'Tam Hải' AS short_name, 'Tam Hai' AS name_en, '52809' AS postal_code, 'tam_hai' AS slug
UNION ALL
       SELECT '48' AS province_code, '21004' AS code, 'Xã Tam Mỹ' AS name, 'Tam Mỹ' AS short_name, 'Tam My' AS name_en, '52823' AS postal_code, 'tam_my' AS slug
UNION ALL
       SELECT '51' AS province_code, '21025' AS code, 'Phường Cẩm Thành' AS name, 'Cẩm Thành' AS short_name, 'Cam Thanh' AS name_en, '53129' AS postal_code, 'cam_thanh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21028' AS code, 'Phường Nghĩa Lộ' AS name, 'Nghĩa Lộ' AS short_name, 'Nghia Lo' AS name_en, '53114' AS postal_code, 'nghia_lo' AS slug
UNION ALL
       SELECT '51' AS province_code, '21034' AS code, 'Xã An Phú' AS name, 'An Phú' AS short_name, 'An Phu' AS name_en, '53122' AS postal_code, 'an_phu' AS slug
UNION ALL
       SELECT '51' AS province_code, '21040' AS code, 'Xã Bình Sơn' AS name, 'Bình Sơn' AS short_name, 'Binh Son' AS name_en, '53331' AS postal_code, 'binh_son' AS slug
UNION ALL
       SELECT '51' AS province_code, '21061' AS code, 'Xã Vạn Tường' AS name, 'Vạn Tường' AS short_name, 'Van Tuong' AS name_en, '53332' AS postal_code, 'van_tuong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21085' AS code, 'Xã Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '53322' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21100' AS code, 'Xã Bình Chương' AS name, 'Bình Chương' AS short_name, 'Binh Chuong' AS name_en, '53312' AS postal_code, 'binh_chuong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21109' AS code, 'Xã Đông Sơn' AS name, 'Đông Sơn' AS short_name, 'Dong Son' AS name_en, '53333' AS postal_code, 'dong_son' AS slug
UNION ALL
       SELECT '51' AS province_code, '21115' AS code, 'Xã Trà Bồng' AS name, 'Trà Bồng' AS short_name, 'Tra Bong' AS name_en, '53416' AS postal_code, 'tra_bong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21124' AS code, 'Xã Thanh Bồng' AS name, 'Thanh Bồng' AS short_name, 'Thanh Bong' AS name_en, '53420' AS postal_code, 'thanh_bong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21127' AS code, 'Xã Đông Trà Bồng' AS name, 'Đông Trà Bồng' AS short_name, 'Dong Tra Bong' AS name_en, '53417' AS postal_code, 'dong_tra_bong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21136' AS code, 'Xã Cà Đam' AS name, 'Cà Đam' AS short_name, 'Ca Dam' AS name_en, '53418' AS postal_code, 'ca_dam' AS slug
UNION ALL
       SELECT '51' AS province_code, '21154' AS code, 'Xã Tây Trà' AS name, 'Tây Trà' AS short_name, 'Tay Tra' AS name_en, '53419' AS postal_code, 'tay_tra' AS slug
UNION ALL
       SELECT '51' AS province_code, '21157' AS code, 'Xã Tây Trà Bồng' AS name, 'Tây Trà Bồng' AS short_name, 'Tay Tra Bong' AS name_en, '53421' AS postal_code, 'tay_tra_bong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21172' AS code, 'Phường Trương Quang Trọng' AS name, 'Trương Quang Trọng' AS short_name, 'Truong Quang Trong' AS name_en, '53111' AS postal_code, 'truong_quang_trong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21181' AS code, 'Xã Thọ Phong' AS name, 'Thọ Phong' AS short_name, 'Tho Phong' AS name_en, '53220' AS postal_code, 'tho_phong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21196' AS code, 'Xã Trường Giang' AS name, 'Trường Giang' AS short_name, 'Truong Giang' AS name_en, '53218' AS postal_code, 'truong_giang' AS slug
UNION ALL
       SELECT '51' AS province_code, '21205' AS code, 'Xã Ba Gia' AS name, 'Ba Gia' AS short_name, 'Ba Gia' AS name_en, '53219' AS postal_code, 'ba_gia' AS slug
UNION ALL
       SELECT '51' AS province_code, '21211' AS code, 'Xã Tịnh Khê' AS name, 'Tịnh Khê' AS short_name, 'Tinh Khe' AS name_en, '53125' AS postal_code, 'tinh_khe' AS slug
UNION ALL
       SELECT '51' AS province_code, '21220' AS code, 'Xã Sơn Tịnh' AS name, 'Sơn Tịnh' AS short_name, 'Son Tinh' AS name_en, '53217' AS postal_code, 'son_tinh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21235' AS code, 'Xã Tư Nghĩa' AS name, 'Tư Nghĩa' AS short_name, 'Tu Nghia' AS name_en, '53921' AS postal_code, 'tu_nghia' AS slug
UNION ALL
       SELECT '51' AS province_code, '21238' AS code, 'Xã Vệ Giang' AS name, 'Vệ Giang' AS short_name, 'Ve Giang' AS name_en, '53922' AS postal_code, 've_giang' AS slug
UNION ALL
       SELECT '51' AS province_code, '21244' AS code, 'Xã Trà Giang' AS name, 'Trà Giang' AS short_name, 'Tra Giang' AS name_en, '53924' AS postal_code, 'tra_giang' AS slug
UNION ALL
       SELECT '51' AS province_code, '21250' AS code, 'Xã Nghĩa Giang' AS name, 'Nghĩa Giang' AS short_name, 'Nghia Giang' AS name_en, '53923' AS postal_code, 'nghia_giang' AS slug
UNION ALL
       SELECT '51' AS province_code, '21289' AS code, 'Xã Sơn Hà' AS name, 'Sơn Hà' AS short_name, 'Son Ha' AS name_en, '53820' AS postal_code, 'son_ha' AS slug
UNION ALL
       SELECT '51' AS province_code, '21292' AS code, 'Xã Sơn Hạ' AS name, 'Sơn Hạ' AS short_name, 'Son Ha' AS name_en, '53815' AS postal_code, 'son_ha' AS slug
UNION ALL
       SELECT '51' AS province_code, '21307' AS code, 'Xã Sơn Linh' AS name, 'Sơn Linh' AS short_name, 'Son Linh' AS name_en, '53813' AS postal_code, 'son_linh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21319' AS code, 'Xã Sơn Thuỷ' AS name, 'Sơn Thuỷ' AS short_name, 'Son Thuy' AS name_en, '53817' AS postal_code, 'son_thuy' AS slug
UNION ALL
       SELECT '51' AS province_code, '21325' AS code, 'Xã Sơn Kỳ' AS name, 'Sơn Kỳ' AS short_name, 'Son Ky' AS name_en, '53818' AS postal_code, 'son_ky' AS slug
UNION ALL
       SELECT '51' AS province_code, '21334' AS code, 'Xã Sơn Tây Thượng' AS name, 'Sơn Tây Thượng' AS short_name, 'Son Tay Thuong' AS name_en, '53616' AS postal_code, 'son_tay_thuong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21340' AS code, 'Xã Sơn Tây' AS name, 'Sơn Tây' AS short_name, 'Son Tay' AS name_en, '53615' AS postal_code, 'son_tay' AS slug
UNION ALL
       SELECT '51' AS province_code, '21343' AS code, 'Xã Sơn Tây Hạ' AS name, 'Sơn Tây Hạ' AS short_name, 'Son Tay Ha' AS name_en, '53617' AS postal_code, 'son_tay_ha' AS slug
UNION ALL
       SELECT '51' AS province_code, '21349' AS code, 'Xã Sơn Mai' AS name, 'Sơn Mai' AS short_name, 'Son Mai' AS name_en, '53712' AS postal_code, 'son_mai' AS slug
UNION ALL
       SELECT '51' AS province_code, '21361' AS code, 'Xã Minh Long' AS name, 'Minh Long' AS short_name, 'Minh Long' AS name_en, '53711' AS postal_code, 'minh_long' AS slug
UNION ALL
       SELECT '51' AS province_code, '21364' AS code, 'Xã Nghĩa Hành' AS name, 'Nghĩa Hành' AS short_name, 'Nghia Hanh' AS name_en, '54018' AS postal_code, 'nghia_hanh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21370' AS code, 'Xã Phước Giang' AS name, 'Phước Giang' AS short_name, 'Phuoc Giang' AS name_en, '54021' AS postal_code, 'phuoc_giang' AS slug
UNION ALL
       SELECT '51' AS province_code, '21385' AS code, 'Xã Đình Cương' AS name, 'Đình Cương' AS short_name, 'Dinh Cuong' AS name_en, '54019' AS postal_code, 'dinh_cuong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21388' AS code, 'Xã Thiện Tín' AS name, 'Thiện Tín' AS short_name, 'Thien Tin' AS name_en, '54020' AS postal_code, 'thien_tin' AS slug
UNION ALL
       SELECT '51' AS province_code, '21400' AS code, 'Xã Mộ Đức' AS name, 'Mộ Đức' AS short_name, 'Mo Duc' AS name_en, '54119' AS postal_code, 'mo_duc' AS slug
UNION ALL
       SELECT '51' AS province_code, '21409' AS code, 'Xã Long Phụng' AS name, 'Long Phụng' AS short_name, 'Long Phung' AS name_en, '54120' AS postal_code, 'long_phung' AS slug
UNION ALL
       SELECT '51' AS province_code, '21421' AS code, 'Xã Mỏ Cày' AS name, 'Mỏ Cày' AS short_name, 'Mo Cay' AS name_en, '54121' AS postal_code, 'mo_cay' AS slug
UNION ALL
       SELECT '51' AS province_code, '21433' AS code, 'Xã Lân Phong' AS name, 'Lân Phong' AS short_name, 'Lan Phong' AS name_en, '54122' AS postal_code, 'lan_phong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21439' AS code, 'Phường Đức Phổ' AS name, 'Đức Phổ' AS short_name, 'Duc Pho' AS name_en, '54321' AS postal_code, 'duc_pho' AS slug
UNION ALL
       SELECT '51' AS province_code, '21451' AS code, 'Phường Trà Câu' AS name, 'Trà Câu' AS short_name, 'Tra Cau' AS name_en, '54322' AS postal_code, 'tra_cau' AS slug
UNION ALL
       SELECT '51' AS province_code, '21457' AS code, 'Xã Nguyễn Nghiêm' AS name, 'Nguyễn Nghiêm' AS short_name, 'Nguyen Nghiem' AS name_en, '54323' AS postal_code, 'nguyen_nghiem' AS slug
UNION ALL
       SELECT '51' AS province_code, '21472' AS code, 'Xã Khánh Cường' AS name, 'Khánh Cường' AS short_name, 'Khanh Cuong' AS name_en, '54324' AS postal_code, 'khanh_cuong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21478' AS code, 'Phường Sa Huỳnh' AS name, 'Sa Huỳnh' AS short_name, 'Sa Huynh' AS name_en, '54325' AS postal_code, 'sa_huynh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21484' AS code, 'Xã Ba Tơ' AS name, 'Ba Tơ' AS short_name, 'Ba To' AS name_en, '54206' AS postal_code, 'ba_to' AS slug
UNION ALL
       SELECT '51' AS province_code, '21490' AS code, 'Xã Ba Vinh' AS name, 'Ba Vinh' AS short_name, 'Ba Vinh' AS name_en, '54216' AS postal_code, 'ba_vinh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21496' AS code, 'Xã Ba Động' AS name, 'Ba Động' AS short_name, 'Ba Dong' AS name_en, '54214' AS postal_code, 'ba_dong' AS slug
UNION ALL
       SELECT '51' AS province_code, '21499' AS code, 'Xã Ba Dinh' AS name, 'Ba Dinh' AS short_name, 'Ba Dinh' AS name_en, '54209' AS postal_code, 'ba_dinh' AS slug
UNION ALL
       SELECT '51' AS province_code, '21520' AS code, 'Xã Đặng Thuỳ Trâm' AS name, 'Đặng Thuỳ Trâm' AS short_name, 'Dang Thuy Tram' AS name_en, '54226' AS postal_code, 'dang_thuy_tram' AS slug
UNION ALL
       SELECT '51' AS province_code, '21523' AS code, 'Xã Ba Tô' AS name, 'Ba Tô' AS short_name, 'Ba To' AS name_en, '54222' AS postal_code, 'ba_to' AS slug
UNION ALL
       SELECT '51' AS province_code, '21529' AS code, 'Xã Ba Vì' AS name, 'Ba Vì' AS short_name, 'Ba Vi' AS name_en, '54221' AS postal_code, 'ba_vi' AS slug
UNION ALL
       SELECT '51' AS province_code, '21538' AS code, 'Xã Ba Xa' AS name, 'Ba Xa' AS short_name, 'Ba Xa' AS name_en, '54223' AS postal_code, 'ba_xa' AS slug
UNION ALL
       SELECT '51' AS province_code, '21548' AS code, 'Đặc khu Lý Sơn' AS name, 'Lý Sơn' AS short_name, 'Ly Son' AS name_en, '54409' AS postal_code, 'ly_son' AS slug
UNION ALL
       SELECT '51' AS province_code, '23284' AS code, 'Phường Đăk Cấm' AS name, 'Đăk Cấm' AS short_name, 'Dak Cam' AS name_en, '60118' AS postal_code, 'dak_cam' AS slug
UNION ALL
       SELECT '51' AS province_code, '23293' AS code, 'Phường Kon Tum' AS name, 'Kon Tum' AS short_name, 'Kon Tum' AS name_en, '60127' AS postal_code, 'kon_tum' AS slug
UNION ALL
       SELECT '51' AS province_code, '23302' AS code, 'Phường Đăk Bla' AS name, 'Đăk Bla' AS short_name, 'Dak Bla' AS name_en, '60128' AS postal_code, 'dak_bla' AS slug
UNION ALL
       SELECT '51' AS province_code, '23317' AS code, 'Xã Ngọk Bay' AS name, 'Ngọk Bay' AS short_name, 'Ngok Bay' AS name_en, '60120' AS postal_code, 'ngok_bay' AS slug
UNION ALL
       SELECT '51' AS province_code, '23326' AS code, 'Xã Ia Chim' AS name, 'Ia Chim' AS short_name, 'Ia Chim' AS name_en, '60124' AS postal_code, 'ia_chim' AS slug
UNION ALL
       SELECT '51' AS province_code, '23332' AS code, 'Xã Đăk Rơ Wa' AS name, 'Đăk Rơ Wa' AS short_name, 'Dak Ro Wa' AS name_en, '60116' AS postal_code, 'dak_ro_wa' AS slug
UNION ALL
       SELECT '51' AS province_code, '23341' AS code, 'Xã Đăk Pék' AS name, 'Đăk Pék' AS short_name, 'Dak Pek' AS name_en, '60414' AS postal_code, 'dak_pek' AS slug
UNION ALL
       SELECT '51' AS province_code, '23344' AS code, 'Xã Đăk Plô' AS name, 'Đăk Plô' AS short_name, 'Dak Plo' AS name_en, '60412' AS postal_code, 'dak_plo' AS slug
UNION ALL
       SELECT '51' AS province_code, '23356' AS code, 'Xã Xốp' AS name, 'Xốp' AS short_name, 'Xop' AS name_en, '60407' AS postal_code, 'xop' AS slug
UNION ALL
       SELECT '51' AS province_code, '23365' AS code, 'Xã Ngọc Linh' AS name, 'Ngọc Linh' AS short_name, 'Ngoc Linh' AS name_en, '60408' AS postal_code, 'ngoc_linh' AS slug
UNION ALL
       SELECT '51' AS province_code, '23368' AS code, 'Xã Đăk Long' AS name, 'Đăk Long' AS short_name, 'Dak Long' AS name_en, '60417' AS postal_code, 'dak_long' AS slug
UNION ALL
       SELECT '51' AS province_code, '23374' AS code, 'Xã Đăk Môn' AS name, 'Đăk Môn' AS short_name, 'Dak Mon' AS name_en, '60416' AS postal_code, 'dak_mon' AS slug
UNION ALL
       SELECT '51' AS province_code, '23377' AS code, 'Xã Bờ Y' AS name, 'Bờ Y' AS short_name, 'Bo Y' AS name_en, '60514' AS postal_code, 'bo_y' AS slug
UNION ALL
       SELECT '51' AS province_code, '23383' AS code, 'Xã Dục Nông' AS name, 'Dục Nông' AS short_name, 'Duc Nong' AS name_en, '60515' AS postal_code, 'duc_nong' AS slug
UNION ALL
       SELECT '51' AS province_code, '23392' AS code, 'Xã Sa Loong' AS name, 'Sa Loong' AS short_name, 'Sa Loong' AS name_en, '60513' AS postal_code, 'sa_loong' AS slug
UNION ALL
       SELECT '51' AS province_code, '23401' AS code, 'Xã Đăk Tô' AS name, 'Đăk Tô' AS short_name, 'Dak To' AS name_en, '60656' AS postal_code, 'dak_to' AS slug
UNION ALL
       SELECT '51' AS province_code, '23416' AS code, 'Xã Đăk Sao' AS name, 'Đăk Sao' AS short_name, 'Dak Sao' AS name_en, '60313' AS postal_code, 'dak_sao' AS slug
UNION ALL
       SELECT '51' AS province_code, '23419' AS code, 'Xã Đăk Tờ Kan' AS name, 'Đăk Tờ Kan' AS short_name, 'Dak To Kan' AS name_en, '60316' AS postal_code, 'dak_to_kan' AS slug
UNION ALL
       SELECT '51' AS province_code, '23425' AS code, 'Xã Tu Mơ Rông' AS name, 'Tu Mơ Rông' AS short_name, 'Tu Mo Rong' AS name_en, '60307' AS postal_code, 'tu_mo_rong' AS slug
UNION ALL
       SELECT '51' AS province_code, '23428' AS code, 'Xã Ngọk Tụ' AS name, 'Ngọk Tụ' AS short_name, 'Ngok Tu' AS name_en, '60661' AS postal_code, 'ngok_tu' AS slug
UNION ALL
       SELECT '51' AS province_code, '23430' AS code, 'Xã Kon Đào' AS name, 'Kon Đào' AS short_name, 'Kon Dao' AS name_en, '60657' AS postal_code, 'kon_dao' AS slug
UNION ALL
       SELECT '51' AS province_code, '23446' AS code, 'Xã Măng Ri' AS name, 'Măng Ri' AS short_name, 'Mang Ri' AS name_en, '60311' AS postal_code, 'mang_ri' AS slug
UNION ALL
       SELECT '51' AS province_code, '23455' AS code, 'Xã Măng Bút' AS name, 'Măng Bút' AS short_name, 'Mang But' AS name_en, '60262' AS postal_code, 'mang_but' AS slug
UNION ALL
       SELECT '51' AS province_code, '23473' AS code, 'Xã Măng Đen' AS name, 'Măng Đen' AS short_name, 'Mang Den' AS name_en, '60256' AS postal_code, 'mang_den' AS slug
UNION ALL
       SELECT '51' AS province_code, '23476' AS code, 'Xã Kon Plông' AS name, 'Kon Plông' AS short_name, 'Kon Plong' AS name_en, '60265' AS postal_code, 'kon_plong' AS slug
UNION ALL
       SELECT '51' AS province_code, '23479' AS code, 'Xã Đăk Rve' AS name, 'Đăk Rve' AS short_name, 'Dak Rve' AS name_en, '60206' AS postal_code, 'dak_rve' AS slug
UNION ALL
       SELECT '51' AS province_code, '23485' AS code, 'Xã Đăk Kôi' AS name, 'Đăk Kôi' AS short_name, 'Dak Koi' AS name_en, '60207' AS postal_code, 'dak_koi' AS slug
UNION ALL
       SELECT '51' AS province_code, '23497' AS code, 'Xã Kon Braih' AS name, 'Kon Braih' AS short_name, 'Kon Braih' AS name_en, '60213' AS postal_code, 'kon_braih' AS slug
UNION ALL
       SELECT '51' AS province_code, '23500' AS code, 'Xã Đăk Hà' AS name, 'Đăk Hà' AS short_name, 'Dak Ha' AS name_en, '60606' AS postal_code, 'dak_ha' AS slug
UNION ALL
       SELECT '51' AS province_code, '23504' AS code, 'Xã Đăk Pxi' AS name, 'Đăk Pxi' AS short_name, 'Dak Pxi' AS name_en, '60608' AS postal_code, 'dak_pxi' AS slug
UNION ALL
       SELECT '51' AS province_code, '23510' AS code, 'Xã Đăk Ui' AS name, 'Đăk Ui' AS short_name, 'Dak Ui' AS name_en, '60609' AS postal_code, 'dak_ui' AS slug
UNION ALL
       SELECT '51' AS province_code, '23512' AS code, 'Xã Đăk Mar' AS name, 'Đăk Mar' AS short_name, 'Dak Mar' AS name_en, '60612' AS postal_code, 'dak_mar' AS slug
UNION ALL
       SELECT '51' AS province_code, '23515' AS code, 'Xã Ngọk Réo' AS name, 'Ngọk Réo' AS short_name, 'Ngok Reo' AS name_en, '60616' AS postal_code, 'ngok_reo' AS slug
UNION ALL
       SELECT '51' AS province_code, '23527' AS code, 'Xã Sa Thầy' AS name, 'Sa Thầy' AS short_name, 'Sa Thay' AS name_en, '60706' AS postal_code, 'sa_thay' AS slug
UNION ALL
       SELECT '51' AS province_code, '23530' AS code, 'Xã Rờ Kơi' AS name, 'Rờ Kơi' AS short_name, 'Ro Koi' AS name_en, '60710' AS postal_code, 'ro_koi' AS slug
UNION ALL
       SELECT '51' AS province_code, '23534' AS code, 'Xã Sa Bình' AS name, 'Sa Bình' AS short_name, 'Sa Binh' AS name_en, '60714' AS postal_code, 'sa_binh' AS slug
UNION ALL
       SELECT '51' AS province_code, '23535' AS code, 'Xã Ia Đal' AS name, 'Ia Đal' AS short_name, 'Ia Dal' AS name_en, '60808' AS postal_code, 'ia_dal' AS slug
UNION ALL
       SELECT '51' AS province_code, '23536' AS code, 'Xã Mô Rai' AS name, 'Mô Rai' AS short_name, 'Mo Rai' AS name_en, '60711' AS postal_code, 'mo_rai' AS slug
UNION ALL
       SELECT '51' AS province_code, '23538' AS code, 'Xã Ia Tơi' AS name, 'Ia Tơi' AS short_name, 'Ia Toi' AS name_en, '60806' AS postal_code, 'ia_toi' AS slug
UNION ALL
       SELECT '51' AS province_code, '23548' AS code, 'Xã Ya Ly' AS name, 'Ya Ly' AS short_name, 'Ya Ly' AS name_en, '60715' AS postal_code, 'ya_ly' AS slug
UNION ALL
       SELECT '52' AS province_code, '21553' AS code, 'Phường Quy Nhơn Bắc' AS name, 'Quy Nhơn Bắc' AS short_name, 'Quy Nhon Bac' AS name_en, '55129' AS postal_code, 'quy_nhon_bac' AS slug
UNION ALL
       SELECT '52' AS province_code, '21583' AS code, 'Phường Quy Nhơn' AS name, 'Quy Nhơn' AS short_name, 'Quy Nhon' AS name_en, '55127' AS postal_code, 'quy_nhon' AS slug
UNION ALL
       SELECT '52' AS province_code, '21589' AS code, 'Phường Quy Nhơn Tây' AS name, 'Quy Nhơn Tây' AS short_name, 'Quy Nhon Tay' AS name_en, '55130' AS postal_code, 'quy_nhon_tay' AS slug
UNION ALL
       SELECT '52' AS province_code, '21592' AS code, 'Phường Quy Nhơn Nam' AS name, 'Quy Nhơn Nam' AS short_name, 'Quy Nhon Nam' AS name_en, '55131' AS postal_code, 'quy_nhon_nam' AS slug
UNION ALL
       SELECT '52' AS province_code, '21601' AS code, 'Phường Quy Nhơn Đông' AS name, 'Quy Nhơn Đông' AS short_name, 'Quy Nhon Dong' AS name_en, '55128' AS postal_code, 'quy_nhon_dong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21607' AS code, 'Xã Nhơn Châu' AS name, 'Nhơn Châu' AS short_name, 'Nhon Chau' AS name_en, '55126' AS postal_code, 'nhon_chau' AS slug
UNION ALL
       SELECT '52' AS province_code, '21609' AS code, 'Xã An Lão' AS name, 'An Lão' AS short_name, 'An Lao' AS name_en, '55506' AS postal_code, 'an_lao' AS slug
UNION ALL
       SELECT '52' AS province_code, '21616' AS code, 'Xã An Vinh' AS name, 'An Vinh' AS short_name, 'An Vinh' AS name_en, '55510' AS postal_code, 'an_vinh' AS slug
UNION ALL
       SELECT '52' AS province_code, '21622' AS code, 'Xã An Toàn' AS name, 'An Toàn' AS short_name, 'An Toan' AS name_en, '55514' AS postal_code, 'an_toan' AS slug
UNION ALL
       SELECT '52' AS province_code, '21628' AS code, 'Xã An Hoà' AS name, 'An Hoà' AS short_name, 'An Hoa' AS name_en, '55513' AS postal_code, 'an_hoa' AS slug
UNION ALL
       SELECT '52' AS province_code, '21637' AS code, 'Phường Tam Quan' AS name, 'Tam Quan' AS short_name, 'Tam Quan' AS name_en, '55417' AS postal_code, 'tam_quan' AS slug
UNION ALL
       SELECT '52' AS province_code, '21640' AS code, 'Phường Bồng Sơn' AS name, 'Bồng Sơn' AS short_name, 'Bong Son' AS name_en, '55406' AS postal_code, 'bong_son' AS slug
UNION ALL
       SELECT '52' AS province_code, '21655' AS code, 'Phường Hoài Nhơn Bắc' AS name, 'Hoài Nhơn Bắc' AS short_name, 'Hoai Nhon Bac' AS name_en, '55425' AS postal_code, 'hoai_nhon_bac' AS slug
UNION ALL
       SELECT '52' AS province_code, '21661' AS code, 'Phường Hoài Nhơn Tây' AS name, 'Hoài Nhơn Tây' AS short_name, 'Hoai Nhon Tay' AS name_en, '55426' AS postal_code, 'hoai_nhon_tay' AS slug
UNION ALL
       SELECT '52' AS province_code, '21664' AS code, 'Phường Hoài Nhơn' AS name, 'Hoài Nhơn' AS short_name, 'Hoai Nhon' AS name_en, '55423' AS postal_code, 'hoai_nhon' AS slug
UNION ALL
       SELECT '52' AS province_code, '21670' AS code, 'Phường Hoài Nhơn Đông' AS name, 'Hoài Nhơn Đông' AS short_name, 'Hoai Nhon Dong' AS name_en, '55424' AS postal_code, 'hoai_nhon_dong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21673' AS code, 'Phường Hoài Nhơn Nam' AS name, 'Hoài Nhơn Nam' AS short_name, 'Hoai Nhon Nam' AS name_en, '55427' AS postal_code, 'hoai_nhon_nam' AS slug
UNION ALL
       SELECT '52' AS province_code, '21688' AS code, 'Xã Hoài Ân' AS name, 'Hoài Ân' AS short_name, 'Hoai An' AS name_en, '55621' AS postal_code, 'hoai_an' AS slug
UNION ALL
       SELECT '52' AS province_code, '21697' AS code, 'Xã Ân Hảo' AS name, 'Ân Hảo' AS short_name, 'An Hao' AS name_en, '55625' AS postal_code, 'an_hao' AS slug
UNION ALL
       SELECT '52' AS province_code, '21703' AS code, 'Xã Vạn Đức' AS name, 'Vạn Đức' AS short_name, 'Van Duc' AS name_en, '55624' AS postal_code, 'van_duc' AS slug
UNION ALL
       SELECT '52' AS province_code, '21715' AS code, 'Xã Ân Tường' AS name, 'Ân Tường' AS short_name, 'An Tuong' AS name_en, '55622' AS postal_code, 'an_tuong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21727' AS code, 'Xã Kim Sơn' AS name, 'Kim Sơn' AS short_name, 'Kim Son' AS name_en, '55623' AS postal_code, 'kim_son' AS slug
UNION ALL
       SELECT '52' AS province_code, '21730' AS code, 'Xã Phù Mỹ' AS name, 'Phù Mỹ' AS short_name, 'Phu My' AS name_en, '55356' AS postal_code, 'phu_my' AS slug
UNION ALL
       SELECT '52' AS province_code, '21733' AS code, 'Xã Bình Dương' AS name, 'Bình Dương' AS short_name, 'Binh Duong' AS name_en, '55372' AS postal_code, 'binh_duong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21739' AS code, 'Xã Phù Mỹ Bắc' AS name, 'Phù Mỹ Bắc' AS short_name, 'Phu My Bac' AS name_en, '55377' AS postal_code, 'phu_my_bac' AS slug
UNION ALL
       SELECT '52' AS province_code, '21751' AS code, 'Xã Phù Mỹ Đông' AS name, 'Phù Mỹ Đông' AS short_name, 'Phu My Dong' AS name_en, '55376' AS postal_code, 'phu_my_dong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21757' AS code, 'Xã Phù Mỹ Tây' AS name, 'Phù Mỹ Tây' AS short_name, 'Phu My Tay' AS name_en, '55378' AS postal_code, 'phu_my_tay' AS slug
UNION ALL
       SELECT '52' AS province_code, '21769' AS code, 'Xã An Lương' AS name, 'An Lương' AS short_name, 'An Luong' AS name_en, '55375' AS postal_code, 'an_luong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21775' AS code, 'Xã Phù Mỹ Nam' AS name, 'Phù Mỹ Nam' AS short_name, 'Phu My Nam' AS name_en, '55379' AS postal_code, 'phu_my_nam' AS slug
UNION ALL
       SELECT '52' AS province_code, '21786' AS code, 'Xã Vĩnh Thạnh' AS name, 'Vĩnh Thạnh' AS short_name, 'Vinh Thanh' AS name_en, '55706' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '52' AS province_code, '21787' AS code, 'Xã Vĩnh Sơn' AS name, 'Vĩnh Sơn' AS short_name, 'Vinh Son' AS name_en, '55714' AS postal_code, 'vinh_son' AS slug
UNION ALL
       SELECT '52' AS province_code, '21796' AS code, 'Xã Vĩnh Thịnh' AS name, 'Vĩnh Thịnh' AS short_name, 'Vinh Thinh' AS name_en, '55707' AS postal_code, 'vinh_thinh' AS slug
UNION ALL
       SELECT '52' AS province_code, '21805' AS code, 'Xã Vĩnh Quang' AS name, 'Vĩnh Quang' AS short_name, 'Vinh Quang' AS name_en, '55711' AS postal_code, 'vinh_quang' AS slug
UNION ALL
       SELECT '52' AS province_code, '21808' AS code, 'Xã Tây Sơn' AS name, 'Tây Sơn' AS short_name, 'Tay Son' AS name_en, '55821' AS postal_code, 'tay_son' AS slug
UNION ALL
       SELECT '52' AS province_code, '21817' AS code, 'Xã Bình Hiệp' AS name, 'Bình Hiệp' AS short_name, 'Binh Hiep' AS name_en, '55824' AS postal_code, 'binh_hiep' AS slug
UNION ALL
       SELECT '52' AS province_code, '21820' AS code, 'Xã Bình Khê' AS name, 'Bình Khê' AS short_name, 'Binh Khe' AS name_en, '55822' AS postal_code, 'binh_khe' AS slug
UNION ALL
       SELECT '52' AS province_code, '21829' AS code, 'Xã Bình An' AS name, 'Bình An' AS short_name, 'Binh An' AS name_en, '55825' AS postal_code, 'binh_an' AS slug
UNION ALL
       SELECT '52' AS province_code, '21835' AS code, 'Xã Bình Phú' AS name, 'Bình Phú' AS short_name, 'Binh Phu' AS name_en, '55823' AS postal_code, 'binh_phu' AS slug
UNION ALL
       SELECT '52' AS province_code, '21853' AS code, 'Xã Phù Cát' AS name, 'Phù Cát' AS short_name, 'Phu Cat' AS name_en, '55324' AS postal_code, 'phu_cat' AS slug
UNION ALL
       SELECT '52' AS province_code, '21859' AS code, 'Xã Đề Gi' AS name, 'Đề Gi' AS short_name, 'De Gi' AS name_en, '55327' AS postal_code, 'de_gi' AS slug
UNION ALL
       SELECT '52' AS province_code, '21868' AS code, 'Xã Hội Sơn' AS name, 'Hội Sơn' AS short_name, 'Hoi Son' AS name_en, '55329' AS postal_code, 'hoi_son' AS slug
UNION ALL
       SELECT '52' AS province_code, '21871' AS code, 'Xã Hoà Hội' AS name, 'Hoà Hội' AS short_name, 'Hoa Hoi' AS name_en, '55328' AS postal_code, 'hoa_hoi' AS slug
UNION ALL
       SELECT '52' AS province_code, '21880' AS code, 'Xã Cát Tiến' AS name, 'Cát Tiến' AS short_name, 'Cat Tien' AS name_en, '55319' AS postal_code, 'cat_tien' AS slug
UNION ALL
       SELECT '52' AS province_code, '21892' AS code, 'Xã Xuân An' AS name, 'Xuân An' AS short_name, 'Xuan An' AS name_en, '55325' AS postal_code, 'xuan_an' AS slug
UNION ALL
       SELECT '52' AS province_code, '21901' AS code, 'Xã Ngô Mây' AS name, 'Ngô Mây' AS short_name, 'Ngo May' AS name_en, '55326' AS postal_code, 'ngo_may' AS slug
UNION ALL
       SELECT '52' AS province_code, '21907' AS code, 'Phường Bình Định' AS name, 'Bình Định' AS short_name, 'Binh Dinh' AS name_en, '55256' AS postal_code, 'binh_dinh' AS slug
UNION ALL
       SELECT '52' AS province_code, '21910' AS code, 'Phường An Nhơn' AS name, 'An Nhơn' AS short_name, 'An Nhon' AS name_en, '55271' AS postal_code, 'an_nhon' AS slug
UNION ALL
       SELECT '52' AS province_code, '21925' AS code, 'Phường An Nhơn Bắc' AS name, 'An Nhơn Bắc' AS short_name, 'An Nhon Bac' AS name_en, '55273' AS postal_code, 'an_nhon_bac' AS slug
UNION ALL
       SELECT '52' AS province_code, '21934' AS code, 'Phường An Nhơn Đông' AS name, 'An Nhơn Đông' AS short_name, 'An Nhon Dong' AS name_en, '55272' AS postal_code, 'an_nhon_dong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21940' AS code, 'Xã An Nhơn Tây' AS name, 'An Nhơn Tây' AS short_name, 'An Nhon Tay' AS name_en, '55274' AS postal_code, 'an_nhon_tay' AS slug
UNION ALL
       SELECT '52' AS province_code, '21943' AS code, 'Phường An Nhơn Nam' AS name, 'An Nhơn Nam' AS short_name, 'An Nhon Nam' AS name_en, '55275' AS postal_code, 'an_nhon_nam' AS slug
UNION ALL
       SELECT '52' AS province_code, '21952' AS code, 'Xã Tuy Phước' AS name, 'Tuy Phước' AS short_name, 'Tuy Phuoc' AS name_en, '55206' AS postal_code, 'tuy_phuoc' AS slug
UNION ALL
       SELECT '52' AS province_code, '21964' AS code, 'Xã Tuy Phước Bắc' AS name, 'Tuy Phước Bắc' AS short_name, 'Tuy Phuoc Bac' AS name_en, '55220' AS postal_code, 'tuy_phuoc_bac' AS slug
UNION ALL
       SELECT '52' AS province_code, '21970' AS code, 'Xã Tuy Phước Đông' AS name, 'Tuy Phước Đông' AS short_name, 'Tuy Phuoc Dong' AS name_en, '55219' AS postal_code, 'tuy_phuoc_dong' AS slug
UNION ALL
       SELECT '52' AS province_code, '21985' AS code, 'Xã Tuy Phước Tây' AS name, 'Tuy Phước Tây' AS short_name, 'Tuy Phuoc Tay' AS name_en, '55221' AS postal_code, 'tuy_phuoc_tay' AS slug
UNION ALL
       SELECT '52' AS province_code, '21994' AS code, 'Xã Vân Canh' AS name, 'Vân Canh' AS short_name, 'Van Canh' AS name_en, '55906' AS postal_code, 'van_canh' AS slug
UNION ALL
       SELECT '52' AS province_code, '21997' AS code, 'Xã Canh Liên' AS name, 'Canh Liên' AS short_name, 'Canh Lien' AS name_en, '55912' AS postal_code, 'canh_lien' AS slug
UNION ALL
       SELECT '52' AS province_code, '22006' AS code, 'Xã Canh Vinh' AS name, 'Canh Vinh' AS short_name, 'Canh Vinh' AS name_en, '55911' AS postal_code, 'canh_vinh' AS slug
UNION ALL
       SELECT '52' AS province_code, '23563' AS code, 'Phường Diên Hồng' AS name, 'Diên Hồng' AS short_name, 'Dien Hong' AS name_en, '61112' AS postal_code, 'dien_hong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23575' AS code, 'Phường Pleiku' AS name, 'Pleiku' AS short_name, 'Pleiku' AS name_en, '61129' AS postal_code, 'pleiku' AS slug
UNION ALL
       SELECT '52' AS province_code, '23584' AS code, 'Phường Thống Nhất' AS name, 'Thống Nhất' AS short_name, 'Thong Nhat' AS name_en, '61110' AS postal_code, 'thong_nhat' AS slug
UNION ALL
       SELECT '52' AS province_code, '23586' AS code, 'Phường Hội Phú' AS name, 'Hội Phú' AS short_name, 'Hoi Phu' AS name_en, '61114' AS postal_code, 'hoi_phu' AS slug
UNION ALL
       SELECT '52' AS province_code, '23590' AS code, 'Xã Biển Hồ' AS name, 'Biển Hồ' AS short_name, 'Bien Ho' AS name_en, '61121' AS postal_code, 'bien_ho' AS slug
UNION ALL
       SELECT '52' AS province_code, '23602' AS code, 'Phường An Phú' AS name, 'An Phú' AS short_name, 'An Phu' AS name_en, '61118' AS postal_code, 'an_phu' AS slug
UNION ALL
       SELECT '52' AS province_code, '23611' AS code, 'Xã Gào' AS name, 'Gào' AS short_name, 'Gao' AS name_en, '61126' AS postal_code, 'gao' AS slug
UNION ALL
       SELECT '52' AS province_code, '23614' AS code, 'Phường An Bình' AS name, 'An Bình' AS short_name, 'An Binh' AS name_en, '62516' AS postal_code, 'an_binh' AS slug
UNION ALL
       SELECT '52' AS province_code, '23617' AS code, 'Phường An Khê' AS name, 'An Khê' AS short_name, 'An Khe' AS name_en, '62517' AS postal_code, 'an_khe' AS slug
UNION ALL
       SELECT '52' AS province_code, '23629' AS code, 'Xã Cửu An' AS name, 'Cửu An' AS short_name, 'Cuu An' AS name_en, '62511' AS postal_code, 'cuu_an' AS slug
UNION ALL
       SELECT '52' AS province_code, '23638' AS code, 'Xã Kbang' AS name, 'Kbang' AS short_name, 'Kbang' AS name_en, '62606' AS postal_code, 'kbang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23644' AS code, 'Xã Đak Rong' AS name, 'Đak Rong' AS short_name, 'Dak Rong' AS name_en, '62610' AS postal_code, 'dak_rong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23647' AS code, 'Xã Sơn Lang' AS name, 'Sơn Lang' AS short_name, 'Son Lang' AS name_en, '62609' AS postal_code, 'son_lang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23650' AS code, 'Xã Krong' AS name, 'Krong' AS short_name, 'Krong' AS name_en, '62612' AS postal_code, 'krong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23668' AS code, 'Xã Tơ Tung' AS name, 'Tơ Tung' AS short_name, 'To Tung' AS name_en, '62614' AS postal_code, 'to_tung' AS slug
UNION ALL
       SELECT '52' AS province_code, '23674' AS code, 'Xã Kông Bơ La' AS name, 'Kông Bơ La' AS short_name, 'Kong Bo La' AS name_en, '62617' AS postal_code, 'kong_bo_la' AS slug
UNION ALL
       SELECT '52' AS province_code, '23677' AS code, 'Xã Đak Đoa' AS name, 'Đak Đoa' AS short_name, 'Dak Doa' AS name_en, '61206' AS postal_code, 'dak_doa' AS slug
UNION ALL
       SELECT '52' AS province_code, '23683' AS code, 'Xã Đak Sơmei' AS name, 'Đak Sơmei' AS short_name, 'Dak Somei' AS name_en, '61212' AS postal_code, 'dak_somei' AS slug
UNION ALL
       SELECT '52' AS province_code, '23701' AS code, 'Xã Kon Gang' AS name, 'Kon Gang' AS short_name, 'Kon Gang' AS name_en, '61210' AS postal_code, 'kon_gang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23710' AS code, 'Xã Ia Băng' AS name, 'Ia Băng' AS short_name, 'Ia Bang' AS name_en, '61222' AS postal_code, 'ia_bang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23714' AS code, 'Xã KDang' AS name, 'KDang' AS short_name, 'KDang' AS name_en, '61208' AS postal_code, 'kdang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23722' AS code, 'Xã Chư Păh' AS name, 'Chư Păh' AS short_name, 'Chu Pah' AS name_en, '61321' AS postal_code, 'chu_pah' AS slug
UNION ALL
       SELECT '52' AS province_code, '23728' AS code, 'Xã Ia Khươl' AS name, 'Ia Khươl' AS short_name, 'Ia Khuol' AS name_en, '61312' AS postal_code, 'ia_khuol' AS slug
UNION ALL
       SELECT '52' AS province_code, '23734' AS code, 'Xã Ia Ly' AS name, 'Ia Ly' AS short_name, 'Ia Ly' AS name_en, '61315' AS postal_code, 'ia_ly' AS slug
UNION ALL
       SELECT '52' AS province_code, '23749' AS code, 'Xã Ia Phí' AS name, 'Ia Phí' AS short_name, 'Ia Phi' AS name_en, '61314' AS postal_code, 'ia_phi' AS slug
UNION ALL
       SELECT '52' AS province_code, '23764' AS code, 'Xã Ia Grai' AS name, 'Ia Grai' AS short_name, 'Ia Grai' AS name_en, '61419' AS postal_code, 'ia_grai' AS slug
UNION ALL
       SELECT '52' AS province_code, '23767' AS code, 'Xã Ia Hrung' AS name, 'Ia Hrung' AS short_name, 'Ia Hrung' AS name_en, '61407' AS postal_code, 'ia_hrung' AS slug
UNION ALL
       SELECT '52' AS province_code, '23776' AS code, 'Xã Ia Krái' AS name, 'Ia Krái' AS short_name, 'Ia Krai' AS name_en, '61414' AS postal_code, 'ia_krai' AS slug
UNION ALL
       SELECT '52' AS province_code, '23782' AS code, 'Xã Ia O' AS name, 'Ia O' AS short_name, 'Ia O' AS name_en, '61415' AS postal_code, 'ia_o' AS slug
UNION ALL
       SELECT '52' AS province_code, '23788' AS code, 'Xã Ia Chia' AS name, 'Ia Chia' AS short_name, 'Ia Chia' AS name_en, '61416' AS postal_code, 'ia_chia' AS slug
UNION ALL
       SELECT '52' AS province_code, '23794' AS code, 'Xã Mang Yang' AS name, 'Mang Yang' AS short_name, 'Mang Yang' AS name_en, '62718' AS postal_code, 'mang_yang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23798' AS code, 'Xã Ayun' AS name, 'Ayun' AS short_name, 'Ayun' AS name_en, '62711' AS postal_code, 'ayun' AS slug
UNION ALL
       SELECT '52' AS province_code, '23799' AS code, 'Xã Hra' AS name, 'Hra' AS short_name, 'Hra' AS name_en, '62709' AS postal_code, 'hra' AS slug
UNION ALL
       SELECT '52' AS province_code, '23812' AS code, 'Xã Lơ Pang' AS name, 'Lơ Pang' AS short_name, 'Lo Pang' AS name_en, '62713' AS postal_code, 'lo_pang' AS slug
UNION ALL
       SELECT '52' AS province_code, '23818' AS code, 'Xã Kon Chiêng' AS name, 'Kon Chiêng' AS short_name, 'Kon Chieng' AS name_en, '62717' AS postal_code, 'kon_chieng' AS slug
UNION ALL
       SELECT '52' AS province_code, '23824' AS code, 'Xã Kông Chro' AS name, 'Kông Chro' AS short_name, 'Kong Chro' AS name_en, '62306' AS postal_code, 'kong_chro' AS slug
UNION ALL
       SELECT '52' AS province_code, '23830' AS code, 'Xã Chư Krey' AS name, 'Chư Krey' AS short_name, 'Chu Krey' AS name_en, '62311' AS postal_code, 'chu_krey' AS slug
UNION ALL
       SELECT '52' AS province_code, '23833' AS code, 'Xã Ya Ma' AS name, 'Ya Ma' AS short_name, 'Ya Ma' AS name_en, '62307' AS postal_code, 'ya_ma' AS slug
UNION ALL
       SELECT '52' AS province_code, '23839' AS code, 'Xã SRó' AS name, 'SRó' AS short_name, 'SRo' AS name_en, '62317' AS postal_code, 'sro' AS slug
UNION ALL
       SELECT '52' AS province_code, '23842' AS code, 'Xã Đăk Song' AS name, 'Đăk Song' AS short_name, 'Dak Song' AS name_en, '62318' AS postal_code, 'dak_song' AS slug
UNION ALL
       SELECT '52' AS province_code, '23851' AS code, 'Xã Chơ Long' AS name, 'Chơ Long' AS short_name, 'Cho Long' AS name_en, '62314' AS postal_code, 'cho_long' AS slug
UNION ALL
       SELECT '52' AS province_code, '23857' AS code, 'Xã Đức Cơ' AS name, 'Đức Cơ' AS short_name, 'Duc Co' AS name_en, '61516' AS postal_code, 'duc_co' AS slug
UNION ALL
       SELECT '52' AS province_code, '23866' AS code, 'Xã Ia Krêl' AS name, 'Ia Krêl' AS short_name, 'Ia Krel' AS name_en, '61508' AS postal_code, 'ia_krel' AS slug
UNION ALL
       SELECT '52' AS province_code, '23869' AS code, 'Xã Ia Dơk' AS name, 'Ia Dơk' AS short_name, 'Ia Dok' AS name_en, '61507' AS postal_code, 'ia_dok' AS slug
UNION ALL
       SELECT '52' AS province_code, '23872' AS code, 'Xã Ia Dom' AS name, 'Ia Dom' AS short_name, 'Ia Dom' AS name_en, '61511' AS postal_code, 'ia_dom' AS slug
UNION ALL
       SELECT '52' AS province_code, '23881' AS code, 'Xã Ia Pnôn' AS name, 'Ia Pnôn' AS short_name, 'Ia Pnon' AS name_en, '61514' AS postal_code, 'ia_pnon' AS slug
UNION ALL
       SELECT '52' AS province_code, '23884' AS code, 'Xã Ia Nan' AS name, 'Ia Nan' AS short_name, 'Ia Nan' AS name_en, '61515' AS postal_code, 'ia_nan' AS slug
UNION ALL
       SELECT '52' AS province_code, '23887' AS code, 'Xã Chư Prông' AS name, 'Chư Prông' AS short_name, 'Chu Prong' AS name_en, '61606' AS postal_code, 'chu_prong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23896' AS code, 'Xã Bàu Cạn' AS name, 'Bàu Cạn' AS short_name, 'Bau Can' AS name_en, '61612' AS postal_code, 'bau_can' AS slug
UNION ALL
       SELECT '52' AS province_code, '23908' AS code, 'Xã Ia Tôr' AS name, 'Ia Tôr' AS short_name, 'Ia Tor' AS name_en, '61608' AS postal_code, 'ia_tor' AS slug
UNION ALL
       SELECT '52' AS province_code, '23911' AS code, 'Xã Ia Boòng' AS name, 'Ia Boòng' AS short_name, 'Ia Boong' AS name_en, '61617' AS postal_code, 'ia_boong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23917' AS code, 'Xã Ia Púch' AS name, 'Ia Púch' AS short_name, 'Ia Puch' AS name_en, '61623' AS postal_code, 'ia_puch' AS slug
UNION ALL
       SELECT '52' AS province_code, '23926' AS code, 'Xã Ia Pia' AS name, 'Ia Pia' AS short_name, 'Ia Pia' AS name_en, '61619' AS postal_code, 'ia_pia' AS slug
UNION ALL
       SELECT '52' AS province_code, '23935' AS code, 'Xã Ia Lâu' AS name, 'Ia Lâu' AS short_name, 'Ia Lau' AS name_en, '61621' AS postal_code, 'ia_lau' AS slug
UNION ALL
       SELECT '52' AS province_code, '23938' AS code, 'Xã Ia Mơ' AS name, 'Ia Mơ' AS short_name, 'Ia Mo' AS name_en, '61624' AS postal_code, 'ia_mo' AS slug
UNION ALL
       SELECT '52' AS province_code, '23941' AS code, 'Xã Chư Sê' AS name, 'Chư Sê' AS short_name, 'Chu Se' AS name_en, '61906' AS postal_code, 'chu_se' AS slug
UNION ALL
       SELECT '52' AS province_code, '23942' AS code, 'Xã Chư Pưh' AS name, 'Chư Pưh' AS short_name, 'Chu Puh' AS name_en, '61815' AS postal_code, 'chu_puh' AS slug
UNION ALL
       SELECT '52' AS province_code, '23947' AS code, 'Xã Bờ Ngoong' AS name, 'Bờ Ngoong' AS short_name, 'Bo Ngoong' AS name_en, '61909' AS postal_code, 'bo_ngoong' AS slug
UNION ALL
       SELECT '52' AS province_code, '23954' AS code, 'Xã Al Bá' AS name, 'Al Bá' AS short_name, 'Al Ba' AS name_en, '61908' AS postal_code, 'al_ba' AS slug
UNION ALL
       SELECT '52' AS province_code, '23971' AS code, 'Xã Ia Hrú' AS name, 'Ia Hrú' AS short_name, 'Ia Hru' AS name_en, '61808' AS postal_code, 'ia_hru' AS slug
UNION ALL
       SELECT '52' AS province_code, '23977' AS code, 'Xã Ia Ko' AS name, 'Ia Ko' AS short_name, 'Ia Ko' AS name_en, '61915' AS postal_code, 'ia_ko' AS slug
UNION ALL
       SELECT '52' AS province_code, '23986' AS code, 'Xã Ia Le' AS name, 'Ia Le' AS short_name, 'Ia Le' AS name_en, '61813' AS postal_code, 'ia_le' AS slug
UNION ALL
       SELECT '52' AS province_code, '23995' AS code, 'Xã Đak Pơ' AS name, 'Đak Pơ' AS short_name, 'Dak Po' AS name_en, '62406' AS postal_code, 'dak_po' AS slug
UNION ALL
       SELECT '52' AS province_code, '24007' AS code, 'Xã Ya Hội' AS name, 'Ya Hội' AS short_name, 'Ya Hoi' AS name_en, '62410' AS postal_code, 'ya_hoi' AS slug
UNION ALL
       SELECT '52' AS province_code, '24013' AS code, 'Xã Pờ Tó' AS name, 'Pờ Tó' AS short_name, 'Po To' AS name_en, '62208' AS postal_code, 'po_to' AS slug
UNION ALL
       SELECT '52' AS province_code, '24022' AS code, 'Xã Ia Pa' AS name, 'Ia Pa' AS short_name, 'Ia Pa' AS name_en, '62215' AS postal_code, 'ia_pa' AS slug
UNION ALL
       SELECT '52' AS province_code, '24028' AS code, 'Xã Ia Tul' AS name, 'Ia Tul' AS short_name, 'Ia Tul' AS name_en, '62212' AS postal_code, 'ia_tul' AS slug
UNION ALL
       SELECT '52' AS province_code, '24043' AS code, 'Xã Phú Thiện' AS name, 'Phú Thiện' AS short_name, 'Phu Thien' AS name_en, '61706' AS postal_code, 'phu_thien' AS slug
UNION ALL
       SELECT '52' AS province_code, '24044' AS code, 'Phường Ayun Pa' AS name, 'Ayun Pa' AS short_name, 'Ayun Pa' AS name_en, '62014' AS postal_code, 'ayun_pa' AS slug
UNION ALL
       SELECT '52' AS province_code, '24049' AS code, 'Xã Chư A Thai' AS name, 'Chư A Thai' AS short_name, 'Chu A Thai' AS name_en, '61707' AS postal_code, 'chu_a_thai' AS slug
UNION ALL
       SELECT '52' AS province_code, '24061' AS code, 'Xã Ia Hiao' AS name, 'Ia Hiao' AS short_name, 'Ia Hiao' AS name_en, '61715' AS postal_code, 'ia_hiao' AS slug
UNION ALL
       SELECT '52' AS province_code, '24065' AS code, 'Xã Ia Rbol' AS name, 'Ia Rbol' AS short_name, 'Ia Rbol' AS name_en, '62011' AS postal_code, 'ia_rbol' AS slug
UNION ALL
       SELECT '52' AS province_code, '24073' AS code, 'Xã Ia Sao' AS name, 'Ia Sao' AS short_name, 'Ia Sao' AS name_en, '62012' AS postal_code, 'ia_sao' AS slug
UNION ALL
       SELECT '52' AS province_code, '24076' AS code, 'Xã Phú Túc' AS name, 'Phú Túc' AS short_name, 'Phu Tuc' AS name_en, '62106' AS postal_code, 'phu_tuc' AS slug
UNION ALL
       SELECT '52' AS province_code, '24100' AS code, 'Xã Ia Dreh' AS name, 'Ia Dreh' AS short_name, 'Ia Dreh' AS name_en, '62118' AS postal_code, 'ia_dreh' AS slug
UNION ALL
       SELECT '52' AS province_code, '24109' AS code, 'Xã Uar' AS name, 'Uar' AS short_name, 'Uar' AS name_en, '62113' AS postal_code, 'uar' AS slug
UNION ALL
       SELECT '52' AS province_code, '24112' AS code, 'Xã Ia Rsai' AS name, 'Ia Rsai' AS short_name, 'Ia Rsai' AS name_en, '62111' AS postal_code, 'ia_rsai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22333' AS code, 'Phường Bắc Nha Trang' AS name, 'Bắc Nha Trang' AS short_name, 'Bac Nha Trang' AS name_en, '57134' AS postal_code, 'bac_nha_trang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22366' AS code, 'Phường Nha Trang' AS name, 'Nha Trang' AS short_name, 'Nha Trang' AS name_en, '57133' AS postal_code, 'nha_trang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22390' AS code, 'Phường Tây Nha Trang' AS name, 'Tây Nha Trang' AS short_name, 'Tay Nha Trang' AS name_en, '57135' AS postal_code, 'tay_nha_trang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22402' AS code, 'Phường Nam Nha Trang' AS name, 'Nam Nha Trang' AS short_name, 'Nam Nha Trang' AS name_en, '57136' AS postal_code, 'nam_nha_trang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22411' AS code, 'Phường Bắc Cam Ranh' AS name, 'Bắc Cam Ranh' AS short_name, 'Bac Cam Ranh' AS name_en, '57822' AS postal_code, 'bac_cam_ranh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22420' AS code, 'Phường Cam Ranh' AS name, 'Cam Ranh' AS short_name, 'Cam Ranh' AS name_en, '57821' AS postal_code, 'cam_ranh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22423' AS code, 'Phường Ba Ngòi' AS name, 'Ba Ngòi' AS short_name, 'Ba Ngoi' AS name_en, '57811' AS postal_code, 'ba_ngoi' AS slug
UNION ALL
       SELECT '56' AS province_code, '22432' AS code, 'Phường Cam Linh' AS name, 'Cam Linh' AS short_name, 'Cam Linh' AS name_en, '57809' AS postal_code, 'cam_linh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22435' AS code, 'Xã Cam Hiệp' AS name, 'Cam Hiệp' AS short_name, 'Cam Hiep' AS name_en, '57622' AS postal_code, 'cam_hiep' AS slug
UNION ALL
       SELECT '56' AS province_code, '22453' AS code, 'Xã Cam Lâm' AS name, 'Cam Lâm' AS short_name, 'Cam Lam' AS name_en, '57620' AS postal_code, 'cam_lam' AS slug
UNION ALL
       SELECT '56' AS province_code, '22465' AS code, 'Xã Cam An' AS name, 'Cam An' AS short_name, 'Cam An' AS name_en, '57623' AS postal_code, 'cam_an' AS slug
UNION ALL
       SELECT '56' AS province_code, '22480' AS code, 'Xã Nam Cam Ranh' AS name, 'Nam Cam Ranh' AS short_name, 'Nam Cam Ranh' AS name_en, '57823' AS postal_code, 'nam_cam_ranh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22489' AS code, 'Xã Vạn Ninh' AS name, 'Vạn Ninh' AS short_name, 'Van Ninh' AS name_en, '57219' AS postal_code, 'van_ninh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22498' AS code, 'Xã Tu Bông' AS name, 'Tu Bông' AS short_name, 'Tu Bong' AS name_en, '57220' AS postal_code, 'tu_bong' AS slug
UNION ALL
       SELECT '56' AS province_code, '22504' AS code, 'Xã Đại Lãnh' AS name, 'Đại Lãnh' AS short_name, 'Dai Lanh' AS name_en, '57216' AS postal_code, 'dai_lanh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22516' AS code, 'Xã Vạn Thắng' AS name, 'Vạn Thắng' AS short_name, 'Van Thang' AS name_en, '57212' AS postal_code, 'van_thang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22525' AS code, 'Xã Vạn Hưng' AS name, 'Vạn Hưng' AS short_name, 'Van Hung' AS name_en, '57207' AS postal_code, 'van_hung' AS slug
UNION ALL
       SELECT '56' AS province_code, '22528' AS code, 'Phường Ninh Hoà' AS name, 'Ninh Hoà' AS short_name, 'Ninh Hoa' AS name_en, '57333' AS postal_code, 'ninh_hoa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22546' AS code, 'Xã Bắc Ninh Hoà' AS name, 'Bắc Ninh Hoà' AS short_name, 'Bac Ninh Hoa' AS name_en, '57336' AS postal_code, 'bac_ninh_hoa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22552' AS code, 'Xã Tây Ninh Hoà' AS name, 'Tây Ninh Hoà' AS short_name, 'Tay Ninh Hoa' AS name_en, '57337' AS postal_code, 'tay_ninh_hoa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22558' AS code, 'Xã Hoà Trí' AS name, 'Hoà Trí' AS short_name, 'Hoa Tri' AS name_en, '57340' AS postal_code, 'hoa_tri' AS slug
UNION ALL
       SELECT '56' AS province_code, '22561' AS code, 'Phường Đông Ninh Hoà' AS name, 'Đông Ninh Hoà' AS short_name, 'Dong Ninh Hoa' AS name_en, '57335' AS postal_code, 'dong_ninh_hoa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22576' AS code, 'Xã Tân Định' AS name, 'Tân Định' AS short_name, 'Tan Dinh' AS name_en, '57339' AS postal_code, 'tan_dinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22591' AS code, 'Phường Hoà Thắng' AS name, 'Hoà Thắng' AS short_name, 'Hoa Thang' AS name_en, '57334' AS postal_code, 'hoa_thang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22597' AS code, 'Xã Nam Ninh Hoà' AS name, 'Nam Ninh Hoà' AS short_name, 'Nam Ninh Hoa' AS name_en, '57338' AS postal_code, 'nam_ninh_hoa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22609' AS code, 'Xã Khánh Vĩnh' AS name, 'Khánh Vĩnh' AS short_name, 'Khanh Vinh' AS name_en, '57406' AS postal_code, 'khanh_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22612' AS code, 'Xã Trung Khánh Vĩnh' AS name, 'Trung Khánh Vĩnh' AS short_name, 'Trung Khanh Vinh' AS name_en, '57421' AS postal_code, 'trung_khanh_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22615' AS code, 'Xã Bắc Khánh Vĩnh' AS name, 'Bắc Khánh Vĩnh' AS short_name, 'Bac Khanh Vinh' AS name_en, '57420' AS postal_code, 'bac_khanh_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22624' AS code, 'Xã Tây Khánh Vĩnh' AS name, 'Tây Khánh Vĩnh' AS short_name, 'Tay Khanh Vinh' AS name_en, '57422' AS postal_code, 'tay_khanh_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22648' AS code, 'Xã Nam Khánh Vĩnh' AS name, 'Nam Khánh Vĩnh' AS short_name, 'Nam Khanh Vinh' AS name_en, '57423' AS postal_code, 'nam_khanh_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22651' AS code, 'Xã Diên Khánh' AS name, 'Diên Khánh' AS short_name, 'Dien Khanh' AS name_en, '57506' AS postal_code, 'dien_khanh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22657' AS code, 'Xã Diên Điền' AS name, 'Diên Điền' AS short_name, 'Dien Dien' AS name_en, '57508' AS postal_code, 'dien_dien' AS slug
UNION ALL
       SELECT '56' AS province_code, '22660' AS code, 'Xã Diên Lâm' AS name, 'Diên Lâm' AS short_name, 'Dien Lam' AS name_en, '57510' AS postal_code, 'dien_lam' AS slug
UNION ALL
       SELECT '56' AS province_code, '22672' AS code, 'Xã Diên Thọ' AS name, 'Diên Thọ' AS short_name, 'Dien Tho' AS name_en, '57513' AS postal_code, 'dien_tho' AS slug
UNION ALL
       SELECT '56' AS province_code, '22678' AS code, 'Xã Diên Lạc' AS name, 'Diên Lạc' AS short_name, 'Dien Lac' AS name_en, '57519' AS postal_code, 'dien_lac' AS slug
UNION ALL
       SELECT '56' AS province_code, '22702' AS code, 'Xã Suối Hiệp' AS name, 'Suối Hiệp' AS short_name, 'Suoi Hiep' AS name_en, '57522' AS postal_code, 'suoi_hiep' AS slug
UNION ALL
       SELECT '56' AS province_code, '22708' AS code, 'Xã Suối Dầu' AS name, 'Suối Dầu' AS short_name, 'Suoi Dau' AS name_en, '57621' AS postal_code, 'suoi_dau' AS slug
UNION ALL
       SELECT '56' AS province_code, '22714' AS code, 'Xã Khánh Sơn' AS name, 'Khánh Sơn' AS short_name, 'Khanh Son' AS name_en, '57564' AS postal_code, 'khanh_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22720' AS code, 'Xã Tây Khánh Sơn' AS name, 'Tây Khánh Sơn' AS short_name, 'Tay Khanh Son' AS name_en, '57565' AS postal_code, 'tay_khanh_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22732' AS code, 'Xã Đông Khánh Sơn' AS name, 'Đông Khánh Sơn' AS short_name, 'Dong Khanh Son' AS name_en, '57566' AS postal_code, 'dong_khanh_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22736' AS code, 'Đặc khu Trường Sa' AS name, 'Trường Sa' AS short_name, 'Spratly' AS name_en, '57906' AS postal_code, 'truong_sa' AS slug
UNION ALL
       SELECT '56' AS province_code, '22738' AS code, 'Phường Đô Vinh' AS name, 'Đô Vinh' AS short_name, 'Do Vinh' AS name_en, '59121' AS postal_code, 'do_vinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22741' AS code, 'Phường Bảo An' AS name, 'Bảo An' AS short_name, 'Bao An' AS name_en, '59117' AS postal_code, 'bao_an' AS slug
UNION ALL
       SELECT '56' AS province_code, '22759' AS code, 'Phường Phan Rang' AS name, 'Phan Rang' AS short_name, 'Phan Rang' AS name_en, '59122' AS postal_code, 'phan_rang' AS slug
UNION ALL
       SELECT '56' AS province_code, '22780' AS code, 'Phường Đông Hải' AS name, 'Đông Hải' AS short_name, 'Dong Hai' AS name_en, '59119' AS postal_code, 'dong_hai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22786' AS code, 'Xã Bác Ái Tây' AS name, 'Bác Ái Tây' AS short_name, 'Bac Ai Tay' AS name_en, '59417' AS postal_code, 'bac_ai_tay' AS slug
UNION ALL
       SELECT '56' AS province_code, '22795' AS code, 'Xã Bác Ái' AS name, 'Bác Ái' AS short_name, 'Bac Ai' AS name_en, '59415' AS postal_code, 'bac_ai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22801' AS code, 'Xã Bác Ái Đông' AS name, 'Bác Ái Đông' AS short_name, 'Bac Ai Dong' AS name_en, '59416' AS postal_code, 'bac_ai_dong' AS slug
UNION ALL
       SELECT '56' AS province_code, '22810' AS code, 'Xã Ninh Sơn' AS name, 'Ninh Sơn' AS short_name, 'Ninh Son' AS name_en, '59514' AS postal_code, 'ninh_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22813' AS code, 'Xã Lâm Sơn' AS name, 'Lâm Sơn' AS short_name, 'Lam Son' AS name_en, '59508' AS postal_code, 'lam_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22822' AS code, 'Xã Mỹ Sơn' AS name, 'Mỹ Sơn' AS short_name, 'My Son' AS name_en, '59511' AS postal_code, 'my_son' AS slug
UNION ALL
       SELECT '56' AS province_code, '22828' AS code, 'Xã Anh Dũng' AS name, 'Anh Dũng' AS short_name, 'Anh Dung' AS name_en, '59515' AS postal_code, 'anh_dung' AS slug
UNION ALL
       SELECT '56' AS province_code, '22834' AS code, 'Phường Ninh Chử' AS name, 'Ninh Chử' AS short_name, 'Ninh Chu' AS name_en, '59123' AS postal_code, 'ninh_chu' AS slug
UNION ALL
       SELECT '56' AS province_code, '22840' AS code, 'Xã Công Hải' AS name, 'Công Hải' AS short_name, 'Cong Hai' AS name_en, '59307' AS postal_code, 'cong_hai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22846' AS code, 'Xã Vĩnh Hải' AS name, 'Vĩnh Hải' AS short_name, 'Vinh Hai' AS name_en, '59214' AS postal_code, 'vinh_hai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22849' AS code, 'Xã Thuận Bắc' AS name, 'Thuận Bắc' AS short_name, 'Thuan Bac' AS name_en, '59312' AS postal_code, 'thuan_bac' AS slug
UNION ALL
       SELECT '56' AS province_code, '22852' AS code, 'Xã Ninh Hải' AS name, 'Ninh Hải' AS short_name, 'Ninh Hai' AS name_en, '59215' AS postal_code, 'ninh_hai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22861' AS code, 'Xã Xuân Hải' AS name, 'Xuân Hải' AS short_name, 'Xuan Hai' AS name_en, '59210' AS postal_code, 'xuan_hai' AS slug
UNION ALL
       SELECT '56' AS province_code, '22870' AS code, 'Xã Ninh Phước' AS name, 'Ninh Phước' AS short_name, 'Ninh Phuoc' AS name_en, '59615' AS postal_code, 'ninh_phuoc' AS slug
UNION ALL
       SELECT '56' AS province_code, '22873' AS code, 'Xã Phước Hậu' AS name, 'Phước Hậu' AS short_name, 'Phuoc Hau' AS name_en, '59609' AS postal_code, 'phuoc_hau' AS slug
UNION ALL
       SELECT '56' AS province_code, '22888' AS code, 'Xã Phước Dinh' AS name, 'Phước Dinh' AS short_name, 'Phuoc Dinh' AS name_en, '59713' AS postal_code, 'phuoc_dinh' AS slug
UNION ALL
       SELECT '56' AS province_code, '22891' AS code, 'Xã Phước Hữu' AS name, 'Phước Hữu' AS short_name, 'Phuoc Huu' AS name_en, '59613' AS postal_code, 'phuoc_huu' AS slug
UNION ALL
       SELECT '56' AS province_code, '22897' AS code, 'Xã Thuận Nam' AS name, 'Thuận Nam' AS short_name, 'Thuan Nam' AS name_en, '59714' AS postal_code, 'thuan_nam' AS slug
UNION ALL
       SELECT '56' AS province_code, '22900' AS code, 'Xã Phước Hà' AS name, 'Phước Hà' AS short_name, 'Phuoc Ha' AS name_en, '59707' AS postal_code, 'phuoc_ha' AS slug
UNION ALL
       SELECT '56' AS province_code, '22909' AS code, 'Xã Cà Ná' AS name, 'Cà Ná' AS short_name, 'Ca Na' AS name_en, '59711' AS postal_code, 'ca_na' AS slug
UNION ALL
       SELECT '66' AS province_code, '22015' AS code, 'Phường Tuy Hoà' AS name, 'Tuy Hoà' AS short_name, 'Tuy Hoa' AS name_en, '56122' AS postal_code, 'tuy_hoa' AS slug
UNION ALL
       SELECT '66' AS province_code, '22045' AS code, 'Phường Bình Kiến' AS name, 'Bình Kiến' AS short_name, 'Binh Kien' AS name_en, '56119' AS postal_code, 'binh_kien' AS slug
UNION ALL
       SELECT '66' AS province_code, '22051' AS code, 'Phường Sông Cầu' AS name, 'Sông Cầu' AS short_name, 'Song Cau' AS name_en, '56320' AS postal_code, 'song_cau' AS slug
UNION ALL
       SELECT '66' AS province_code, '22057' AS code, 'Xã Xuân Lộc' AS name, 'Xuân Lộc' AS short_name, 'Xuan Loc' AS name_en, '56318' AS postal_code, 'xuan_loc' AS slug
UNION ALL
       SELECT '66' AS province_code, '22060' AS code, 'Xã Xuân Cảnh' AS name, 'Xuân Cảnh' AS short_name, 'Xuan Canh' AS name_en, '56315' AS postal_code, 'xuan_canh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22075' AS code, 'Xã Xuân Thọ' AS name, 'Xuân Thọ' AS short_name, 'Xuan Tho' AS name_en, '56321' AS postal_code, 'xuan_tho' AS slug
UNION ALL
       SELECT '66' AS province_code, '22076' AS code, 'Phường Xuân Đài' AS name, 'Xuân Đài' AS short_name, 'Xuan Dai' AS name_en, '56308' AS postal_code, 'xuan_dai' AS slug
UNION ALL
       SELECT '66' AS province_code, '22081' AS code, 'Xã Đồng Xuân' AS name, 'Đồng Xuân' AS short_name, 'Dong Xuan' AS name_en, '56417' AS postal_code, 'dong_xuan' AS slug
UNION ALL
       SELECT '66' AS province_code, '22090' AS code, 'Xã Xuân Lãnh' AS name, 'Xuân Lãnh' AS short_name, 'Xuan Lanh' AS name_en, '56415' AS postal_code, 'xuan_lanh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22096' AS code, 'Xã Phú Mỡ' AS name, 'Phú Mỡ' AS short_name, 'Phu Mo' AS name_en, '56416' AS postal_code, 'phu_mo' AS slug
UNION ALL
       SELECT '66' AS province_code, '22111' AS code, 'Xã Xuân Phước' AS name, 'Xuân Phước' AS short_name, 'Xuan Phuoc' AS name_en, '56410' AS postal_code, 'xuan_phuoc' AS slug
UNION ALL
       SELECT '66' AS province_code, '22114' AS code, 'Xã Tuy An Bắc' AS name, 'Tuy An Bắc' AS short_name, 'Tuy An Bac' AS name_en, '56222' AS postal_code, 'tuy_an_bac' AS slug
UNION ALL
       SELECT '66' AS province_code, '22120' AS code, 'Xã Tuy An Đông' AS name, 'Tuy An Đông' AS short_name, 'Tuy An Dong' AS name_en, '56223' AS postal_code, 'tuy_an_dong' AS slug
UNION ALL
       SELECT '66' AS province_code, '22132' AS code, 'Xã Tuy An Tây' AS name, 'Tuy An Tây' AS short_name, 'Tuy An Tay' AS name_en, '56226' AS postal_code, 'tuy_an_tay' AS slug
UNION ALL
       SELECT '66' AS province_code, '22147' AS code, 'Xã Ô Loan' AS name, 'Ô Loan' AS short_name, 'O Loan' AS name_en, '56224' AS postal_code, 'o_loan' AS slug
UNION ALL
       SELECT '66' AS province_code, '22153' AS code, 'Xã Tuy An Nam' AS name, 'Tuy An Nam' AS short_name, 'Tuy An Nam' AS name_en, '56225' AS postal_code, 'tuy_an_nam' AS slug
UNION ALL
       SELECT '66' AS province_code, '22165' AS code, 'Xã Sơn Hoà' AS name, 'Sơn Hoà' AS short_name, 'Son Hoa' AS name_en, '56520' AS postal_code, 'son_hoa' AS slug
UNION ALL
       SELECT '66' AS province_code, '22171' AS code, 'Xã Tây Sơn' AS name, 'Tây Sơn' AS short_name, 'Tay Son' AS name_en, '56522' AS postal_code, 'tay_son' AS slug
UNION ALL
       SELECT '66' AS province_code, '22177' AS code, 'Xã Vân Hoà' AS name, 'Vân Hoà' AS short_name, 'Van Hoa' AS name_en, '56521' AS postal_code, 'van_hoa' AS slug
UNION ALL
       SELECT '66' AS province_code, '22192' AS code, 'Xã Suối Trai' AS name, 'Suối Trai' AS short_name, 'Suoi Trai' AS name_en, '56518' AS postal_code, 'suoi_trai' AS slug
UNION ALL
       SELECT '66' AS province_code, '22207' AS code, 'Xã Sông Hinh' AS name, 'Sông Hinh' AS short_name, 'Song Hinh' AS name_en, '56611' AS postal_code, 'song_hinh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22222' AS code, 'Xã Đức Bình' AS name, 'Đức Bình' AS short_name, 'Duc Binh' AS name_en, '56618' AS postal_code, 'duc_binh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22225' AS code, 'Xã Ea Bá' AS name, 'Ea Bá' AS short_name, 'Ea Ba' AS name_en, '56615' AS postal_code, 'ea_ba' AS slug
UNION ALL
       SELECT '66' AS province_code, '22237' AS code, 'Xã Ea Ly' AS name, 'Ea Ly' AS short_name, 'Ea Ly' AS name_en, '56614' AS postal_code, 'ea_ly' AS slug
UNION ALL
       SELECT '66' AS province_code, '22240' AS code, 'Phường Phú Yên' AS name, 'Phú Yên' AS short_name, 'Phu Yen' AS name_en, '56123' AS postal_code, 'phu_yen' AS slug
UNION ALL
       SELECT '66' AS province_code, '22250' AS code, 'Xã Sơn Thành' AS name, 'Sơn Thành' AS short_name, 'Son Thanh' AS name_en, '56719' AS postal_code, 'son_thanh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22255' AS code, 'Xã Tây Hoà' AS name, 'Tây Hoà' AS short_name, 'Tay Hoa' AS name_en, '56717' AS postal_code, 'tay_hoa' AS slug
UNION ALL
       SELECT '66' AS province_code, '22258' AS code, 'Phường Đông Hoà' AS name, 'Đông Hoà' AS short_name, 'Dong Hoa' AS name_en, '56816' AS postal_code, 'dong_hoa' AS slug
UNION ALL
       SELECT '66' AS province_code, '22261' AS code, 'Phường Hoà Hiệp' AS name, 'Hoà Hiệp' AS short_name, 'Hoa Hiep' AS name_en, '56817' AS postal_code, 'hoa_hiep' AS slug
UNION ALL
       SELECT '66' AS province_code, '22276' AS code, 'Xã Hoà Thịnh' AS name, 'Hoà Thịnh' AS short_name, 'Hoa Thinh' AS name_en, '56710' AS postal_code, 'hoa_thinh' AS slug
UNION ALL
       SELECT '66' AS province_code, '22285' AS code, 'Xã Hoà Mỹ' AS name, 'Hoà Mỹ' AS short_name, 'Hoa My' AS name_en, '56718' AS postal_code, 'hoa_my' AS slug
UNION ALL
       SELECT '66' AS province_code, '22291' AS code, 'Xã Hoà Xuân' AS name, 'Hoà Xuân' AS short_name, 'Hoa Xuan' AS name_en, '56818' AS postal_code, 'hoa_xuan' AS slug
UNION ALL
       SELECT '66' AS province_code, '22303' AS code, 'Xã Phú Hoà 2' AS name, 'Phú Hoà 2' AS short_name, 'Phu Hoa 2' AS name_en, '56916' AS postal_code, 'phu_hoa_2' AS slug
UNION ALL
       SELECT '66' AS province_code, '22319' AS code, 'Xã Phú Hoà 1' AS name, 'Phú Hoà 1' AS short_name, 'Phu Hoa 1' AS name_en, '56915' AS postal_code, 'phu_hoa_1' AS slug
UNION ALL
       SELECT '66' AS province_code, '24121' AS code, 'Phường Tân Lập' AS name, 'Tân Lập' AS short_name, 'Tan Lap' AS name_en, '63108' AS postal_code, 'tan_lap' AS slug
UNION ALL
       SELECT '66' AS province_code, '24133' AS code, 'Phường Buôn Ma Thuột' AS name, 'Buôn Ma Thuột' AS short_name, 'Buon Ma Thuot' AS name_en, '63127' AS postal_code, 'buon_ma_thuot' AS slug
UNION ALL
       SELECT '66' AS province_code, '24154' AS code, 'Phường Thành Nhất' AS name, 'Thành Nhất' AS short_name, 'Thanh Nhat' AS name_en, '63116' AS postal_code, 'thanh_nhat' AS slug
UNION ALL
       SELECT '66' AS province_code, '24163' AS code, 'Phường Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '63109' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '66' AS province_code, '24169' AS code, 'Phường Ea Kao' AS name, 'Ea Kao' AS short_name, 'Ea Kao' AS name_en, '63123' AS postal_code, 'ea_kao' AS slug
UNION ALL
       SELECT '66' AS province_code, '24175' AS code, 'Xã Hoà Phú' AS name, 'Hoà Phú' AS short_name, 'Hoa Phu' AS name_en, '63121' AS postal_code, 'hoa_phu' AS slug
UNION ALL
       SELECT '66' AS province_code, '24181' AS code, 'Xã Ea Drăng' AS name, 'Ea Drăng' AS short_name, 'Ea Drang' AS name_en, '63606' AS postal_code, 'ea_drang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24184' AS code, 'Xã Ea H''Leo' AS name, 'Ea H''Leo' AS short_name, 'Ea H''Leo' AS name_en, '63614' AS postal_code, 'ea_hleo' AS slug
UNION ALL
       SELECT '66' AS province_code, '24187' AS code, 'Xã Ea Hiao' AS name, 'Ea Hiao' AS short_name, 'Ea Hiao' AS name_en, '63612' AS postal_code, 'ea_hiao' AS slug
UNION ALL
       SELECT '66' AS province_code, '24193' AS code, 'Xã Ea Wy' AS name, 'Ea Wy' AS short_name, 'Ea Wy' AS name_en, '63615' AS postal_code, 'ea_wy' AS slug
UNION ALL
       SELECT '66' AS province_code, '24208' AS code, 'Xã Ea Khăl' AS name, 'Ea Khăl' AS short_name, 'Ea Khal' AS name_en, '63609' AS postal_code, 'ea_khal' AS slug
UNION ALL
       SELECT '66' AS province_code, '24211' AS code, 'Xã Ea Súp' AS name, 'Ea Súp' AS short_name, 'Ea Sup' AS name_en, '63706' AS postal_code, 'ea_sup' AS slug
UNION ALL
       SELECT '66' AS province_code, '24214' AS code, 'Xã Ia Lốp' AS name, 'Ia Lốp' AS short_name, 'Ia Lop' AS name_en, '63711' AS postal_code, 'ia_lop' AS slug
UNION ALL
       SELECT '66' AS province_code, '24217' AS code, 'Xã Ea Rốk' AS name, 'Ea Rốk' AS short_name, 'Ea Rok' AS name_en, '63709' AS postal_code, 'ea_rok' AS slug
UNION ALL
       SELECT '66' AS province_code, '24221' AS code, 'Xã Ia Rvê' AS name, 'Ia Rvê' AS short_name, 'Ia Rve' AS name_en, '63713' AS postal_code, 'ia_rve' AS slug
UNION ALL
       SELECT '66' AS province_code, '24229' AS code, 'Xã Ea Bung' AS name, 'Ea Bung' AS short_name, 'Ea Bung' AS name_en, '63714' AS postal_code, 'ea_bung' AS slug
UNION ALL
       SELECT '66' AS province_code, '24235' AS code, 'Xã Buôn Đôn' AS name, 'Buôn Đôn' AS short_name, 'Buon Don' AS name_en, '63812' AS postal_code, 'buon_don' AS slug
UNION ALL
       SELECT '66' AS province_code, '24241' AS code, 'Xã Ea Wer' AS name, 'Ea Wer' AS short_name, 'Ea Wer' AS name_en, '63806' AS postal_code, 'ea_wer' AS slug
UNION ALL
       SELECT '66' AS province_code, '24250' AS code, 'Xã Ea Nuôl' AS name, 'Ea Nuôl' AS short_name, 'Ea Nuol' AS name_en, '63808' AS postal_code, 'ea_nuol' AS slug
UNION ALL
       SELECT '66' AS province_code, '24259' AS code, 'Xã Quảng Phú' AS name, 'Quảng Phú' AS short_name, 'Quang Phu' AS name_en, '63906' AS postal_code, 'quang_phu' AS slug
UNION ALL
       SELECT '66' AS province_code, '24265' AS code, 'Xã Ea Kiết' AS name, 'Ea Kiết' AS short_name, 'Ea Kiet' AS name_en, '63916' AS postal_code, 'ea_kiet' AS slug
UNION ALL
       SELECT '66' AS province_code, '24277' AS code, 'Xã Ea Tul' AS name, 'Ea Tul' AS short_name, 'Ea Tul' AS name_en, '63920' AS postal_code, 'ea_tul' AS slug
UNION ALL
       SELECT '66' AS province_code, '24280' AS code, 'Xã Cư M''gar' AS name, 'Cư M''gar' AS short_name, 'Cu M''gar' AS name_en, '63912' AS postal_code, 'cu_mgar' AS slug
UNION ALL
       SELECT '66' AS province_code, '24286' AS code, 'Xã Ea M''Droh' AS name, 'Ea M''Droh' AS short_name, 'Ea M''Droh' AS name_en, '63915' AS postal_code, 'ea_mdroh' AS slug
UNION ALL
       SELECT '66' AS province_code, '24301' AS code, 'Xã Cuôr Đăng' AS name, 'Cuôr Đăng' AS short_name, 'Cuor Dang' AS name_en, '63922' AS postal_code, 'cuor_dang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24305' AS code, 'Phường Buôn Hồ' AS name, 'Buôn Hồ' AS short_name, 'Buon Ho' AS name_en, '64018' AS postal_code, 'buon_ho' AS slug
UNION ALL
       SELECT '66' AS province_code, '24310' AS code, 'Xã Krông Búk' AS name, 'Krông Búk' AS short_name, 'Krong Buk' AS name_en, '63513' AS postal_code, 'krong_buk' AS slug
UNION ALL
       SELECT '66' AS province_code, '24313' AS code, 'Xã Cư Pơng' AS name, 'Cư Pơng' AS short_name, 'Cu Pong' AS name_en, '63509' AS postal_code, 'cu_pong' AS slug
UNION ALL
       SELECT '66' AS province_code, '24316' AS code, 'Xã Pơng Drang' AS name, 'Pơng Drang' AS short_name, 'Pong Drang' AS name_en, '63511' AS postal_code, 'pong_drang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24328' AS code, 'Xã Ea Drông' AS name, 'Ea Drông' AS short_name, 'Ea Drong' AS name_en, '64017' AS postal_code, 'ea_drong' AS slug
UNION ALL
       SELECT '66' AS province_code, '24340' AS code, 'Phường Cư Bao' AS name, 'Cư Bao' AS short_name, 'Cu Bao' AS name_en, '64014' AS postal_code, 'cu_bao' AS slug
UNION ALL
       SELECT '66' AS province_code, '24343' AS code, 'Xã Krông Năng' AS name, 'Krông Năng' AS short_name, 'Krong Nang' AS name_en, '63406' AS postal_code, 'krong_nang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24346' AS code, 'Xã Dliê Ya' AS name, 'Dliê Ya' AS short_name, 'Dlie Ya' AS name_en, '63415' AS postal_code, 'dlie_ya' AS slug
UNION ALL
       SELECT '66' AS province_code, '24352' AS code, 'Xã Tam Giang' AS name, 'Tam Giang' AS short_name, 'Tam Giang' AS name_en, '63410' AS postal_code, 'tam_giang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24364' AS code, 'Xã Phú Xuân' AS name, 'Phú Xuân' AS short_name, 'Phu Xuan' AS name_en, '63407' AS postal_code, 'phu_xuan' AS slug
UNION ALL
       SELECT '66' AS province_code, '24373' AS code, 'Xã Ea Kar' AS name, 'Ea Kar' AS short_name, 'Ea Kar' AS name_en, '63306' AS postal_code, 'ea_kar' AS slug
UNION ALL
       SELECT '66' AS province_code, '24376' AS code, 'Xã Ea Knốp' AS name, 'Ea Knốp' AS short_name, 'Ea Knop' AS name_en, '63313' AS postal_code, 'ea_knop' AS slug
UNION ALL
       SELECT '66' AS province_code, '24400' AS code, 'Xã Ea Păl' AS name, 'Ea Păl' AS short_name, 'Ea Pal' AS name_en, '63317' AS postal_code, 'ea_pal' AS slug
UNION ALL
       SELECT '66' AS province_code, '24403' AS code, 'Xã Ea Ô' AS name, 'Ea Ô' AS short_name, 'Ea O' AS name_en, '63316' AS postal_code, 'ea_o' AS slug
UNION ALL
       SELECT '66' AS province_code, '24406' AS code, 'Xã Cư Yang' AS name, 'Cư Yang' AS short_name, 'Cu Yang' AS name_en, '63319' AS postal_code, 'cu_yang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24412' AS code, 'Xã M''Drắk' AS name, 'M''Drắk' AS short_name, 'M''Drak' AS name_en, '64506' AS postal_code, 'mdrak' AS slug
UNION ALL
       SELECT '66' AS province_code, '24415' AS code, 'Xã Cư Prao' AS name, 'Cư Prao' AS short_name, 'Cu Prao' AS name_en, '64518' AS postal_code, 'cu_prao' AS slug
UNION ALL
       SELECT '66' AS province_code, '24433' AS code, 'Xã Ea Riêng' AS name, 'Ea Riêng' AS short_name, 'Ea Rieng' AS name_en, '64508' AS postal_code, 'ea_rieng' AS slug
UNION ALL
       SELECT '66' AS province_code, '24436' AS code, 'Xã Cư M''ta' AS name, 'Cư M''ta' AS short_name, 'Cu M''ta' AS name_en, '64507' AS postal_code, 'cu_mta' AS slug
UNION ALL
       SELECT '66' AS province_code, '24444' AS code, 'Xã Krông Á' AS name, 'Krông Á' AS short_name, 'Krong A' AS name_en, '64510' AS postal_code, 'krong_a' AS slug
UNION ALL
       SELECT '66' AS province_code, '24445' AS code, 'Xã Ea Trang' AS name, 'Ea Trang' AS short_name, 'Ea Trang' AS name_en, '64512' AS postal_code, 'ea_trang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24448' AS code, 'Xã Krông Bông' AS name, 'Krông Bông' AS short_name, 'Krong Bong' AS name_en, '64420' AS postal_code, 'krong_bong' AS slug
UNION ALL
       SELECT '66' AS province_code, '24454' AS code, 'Xã Dang Kang' AS name, 'Dang Kang' AS short_name, 'Dang Kang' AS name_en, '64413' AS postal_code, 'dang_kang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24472' AS code, 'Xã Hoà Sơn' AS name, 'Hoà Sơn' AS short_name, 'Hoa Son' AS name_en, '64408' AS postal_code, 'hoa_son' AS slug
UNION ALL
       SELECT '66' AS province_code, '24478' AS code, 'Xã Cư Pui' AS name, 'Cư Pui' AS short_name, 'Cu Pui' AS name_en, '64417' AS postal_code, 'cu_pui' AS slug
UNION ALL
       SELECT '66' AS province_code, '24484' AS code, 'Xã Yang Mao' AS name, 'Yang Mao' AS short_name, 'Yang Mao' AS name_en, '64419' AS postal_code, 'yang_mao' AS slug
UNION ALL
       SELECT '66' AS province_code, '24490' AS code, 'Xã Krông Pắc' AS name, 'Krông Pắc' AS short_name, 'Krong Pac' AS name_en, '63222' AS postal_code, 'krong_pac' AS slug
UNION ALL
       SELECT '66' AS province_code, '24496' AS code, 'Xã Ea Kly' AS name, 'Ea Kly' AS short_name, 'Ea Kly' AS name_en, '63210' AS postal_code, 'ea_kly' AS slug
UNION ALL
       SELECT '66' AS province_code, '24502' AS code, 'Xã Ea Phê' AS name, 'Ea Phê' AS short_name, 'Ea Phe' AS name_en, '63208' AS postal_code, 'ea_phe' AS slug
UNION ALL
       SELECT '66' AS province_code, '24505' AS code, 'Xã Ea Knuếc' AS name, 'Ea Knuếc' AS short_name, 'Ea Knuec' AS name_en, '63220' AS postal_code, 'ea_knuec' AS slug
UNION ALL
       SELECT '66' AS province_code, '24526' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '63216' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '66' AS province_code, '24529' AS code, 'Xã Vụ Bổn' AS name, 'Vụ Bổn' AS short_name, 'Vu Bon' AS name_en, '63212' AS postal_code, 'vu_bon' AS slug
UNION ALL
       SELECT '66' AS province_code, '24538' AS code, 'Xã Krông Ana' AS name, 'Krông Ana' AS short_name, 'Krong Ana' AS name_en, '64214' AS postal_code, 'krong_ana' AS slug
UNION ALL
       SELECT '66' AS province_code, '24540' AS code, 'Xã Ea Ning' AS name, 'Ea Ning' AS short_name, 'Ea Ning' AS name_en, '64112' AS postal_code, 'ea_ning' AS slug
UNION ALL
       SELECT '66' AS province_code, '24544' AS code, 'Xã Ea Ktur' AS name, 'Ea Ktur' AS short_name, 'Ea Ktur' AS name_en, '64113' AS postal_code, 'ea_ktur' AS slug
UNION ALL
       SELECT '66' AS province_code, '24559' AS code, 'Xã Ea Na' AS name, 'Ea Na' AS short_name, 'Ea Na' AS name_en, '64212' AS postal_code, 'ea_na' AS slug
UNION ALL
       SELECT '66' AS province_code, '24561' AS code, 'Xã Dray Bhăng' AS name, 'Dray Bhăng' AS short_name, 'Dray Bhang' AS name_en, '64106' AS postal_code, 'dray_bhang' AS slug
UNION ALL
       SELECT '66' AS province_code, '24568' AS code, 'Xã Dur Kmăl' AS name, 'Dur Kmăl' AS short_name, 'Dur Kmal' AS name_en, '64209' AS postal_code, 'dur_kmal' AS slug
UNION ALL
       SELECT '66' AS province_code, '24580' AS code, 'Xã Liên Sơn Lắk' AS name, 'Liên Sơn Lắk' AS short_name, 'Lien Son Lak' AS name_en, '64317' AS postal_code, 'lien_son_lak' AS slug
UNION ALL
       SELECT '66' AS province_code, '24595' AS code, 'Xã Đắk Liêng' AS name, 'Đắk Liêng' AS short_name, 'Dak Lieng' AS name_en, '64307' AS postal_code, 'dak_lieng' AS slug
UNION ALL
       SELECT '66' AS province_code, '24598' AS code, 'Xã Đắk Phơi' AS name, 'Đắk Phơi' AS short_name, 'Dak Phoi' AS name_en, '64313' AS postal_code, 'dak_phoi' AS slug
UNION ALL
       SELECT '66' AS province_code, '24604' AS code, 'Xã Krông Nô' AS name, 'Krông Nô' AS short_name, 'Krong No' AS name_en, '64314' AS postal_code, 'krong_no' AS slug
UNION ALL
       SELECT '66' AS province_code, '24607' AS code, 'Xã Nam Ka' AS name, 'Nam Ka' AS short_name, 'Nam Ka' AS name_en, '64311' AS postal_code, 'nam_ka' AS slug
UNION ALL
       SELECT '68' AS province_code, '22918' AS code, 'Phường Mũi Né' AS name, 'Mũi Né' AS short_name, 'Mui Ne' AS name_en, '77118' AS postal_code, 'mui_ne' AS slug
UNION ALL
       SELECT '68' AS province_code, '22924' AS code, 'Phường Phú Thuỷ' AS name, 'Phú Thuỷ' AS short_name, 'Phu Thuy' AS name_en, '77120' AS postal_code, 'phu_thuy' AS slug
UNION ALL
       SELECT '68' AS province_code, '22933' AS code, 'Phường Hàm Thắng' AS name, 'Hàm Thắng' AS short_name, 'Ham Thang' AS name_en, '77420' AS postal_code, 'ham_thang' AS slug
UNION ALL
       SELECT '68' AS province_code, '22945' AS code, 'Phường Phan Thiết' AS name, 'Phan Thiết' AS short_name, 'Phan Thiet' AS name_en, '77124' AS postal_code, 'phan_thiet' AS slug
UNION ALL
       SELECT '68' AS province_code, '22954' AS code, 'Phường Tiến Thành' AS name, 'Tiến Thành' AS short_name, 'Tien Thanh' AS name_en, '77123' AS postal_code, 'tien_thanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '22960' AS code, 'Phường Bình Thuận' AS name, 'Bình Thuận' AS short_name, 'Binh Thuan' AS name_en, '77125' AS postal_code, 'binh_thuan' AS slug
UNION ALL
       SELECT '68' AS province_code, '22963' AS code, 'Xã Tuyên Quang' AS name, 'Tuyên Quang' AS short_name, 'Tuyen Quang' AS name_en, '77425' AS postal_code, 'tuyen_quang' AS slug
UNION ALL
       SELECT '68' AS province_code, '22969' AS code, 'Xã Liên Hương' AS name, 'Liên Hương' AS short_name, 'Lien Huong' AS name_en, '77206' AS postal_code, 'lien_huong' AS slug
UNION ALL
       SELECT '68' AS province_code, '22972' AS code, 'Xã Phan Rí Cửa' AS name, 'Phan Rí Cửa' AS short_name, 'Phan Ri Cua' AS name_en, '77216' AS postal_code, 'phan_ri_cua' AS slug
UNION ALL
       SELECT '68' AS province_code, '22978' AS code, 'Xã Tuy Phong' AS name, 'Tuy Phong' AS short_name, 'Tuy Phong' AS name_en, '77218' AS postal_code, 'tuy_phong' AS slug
UNION ALL
       SELECT '68' AS province_code, '22981' AS code, 'Xã Vĩnh Hảo' AS name, 'Vĩnh Hảo' AS short_name, 'Vinh Hao' AS name_en, '77209' AS postal_code, 'vinh_hao' AS slug
UNION ALL
       SELECT '68' AS province_code, '23005' AS code, 'Xã Bắc Bình' AS name, 'Bắc Bình' AS short_name, 'Bac Binh' AS name_en, '77324' AS postal_code, 'bac_binh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23008' AS code, 'Xã Phan Sơn' AS name, 'Phan Sơn' AS short_name, 'Phan Son' AS name_en, '77312' AS postal_code, 'phan_son' AS slug
UNION ALL
       SELECT '68' AS province_code, '23020' AS code, 'Xã Hải Ninh' AS name, 'Hải Ninh' AS short_name, 'Hai Ninh' AS name_en, '77314' AS postal_code, 'hai_ninh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23023' AS code, 'Xã Sông Luỹ' AS name, 'Sông Luỹ' AS short_name, 'Song Luy' AS name_en, '77317' AS postal_code, 'song_luy' AS slug
UNION ALL
       SELECT '68' AS province_code, '23032' AS code, 'Xã Lương Sơn' AS name, 'Lương Sơn' AS short_name, 'Luong Son' AS name_en, '77320' AS postal_code, 'luong_son' AS slug
UNION ALL
       SELECT '68' AS province_code, '23041' AS code, 'Xã Hồng Thái' AS name, 'Hồng Thái' AS short_name, 'Hong Thai' AS name_en, '77321' AS postal_code, 'hong_thai' AS slug
UNION ALL
       SELECT '68' AS province_code, '23053' AS code, 'Xã Hoà Thắng' AS name, 'Hoà Thắng' AS short_name, 'Hoa Thang' AS name_en, '77322' AS postal_code, 'hoa_thang' AS slug
UNION ALL
       SELECT '68' AS province_code, '23059' AS code, 'Xã Hàm Thuận' AS name, 'Hàm Thuận' AS short_name, 'Ham Thuan' AS name_en, '77423' AS postal_code, 'ham_thuan' AS slug
UNION ALL
       SELECT '68' AS province_code, '23065' AS code, 'Xã La Dạ' AS name, 'La Dạ' AS short_name, 'La Da' AS name_en, '77413' AS postal_code, 'la_da' AS slug
UNION ALL
       SELECT '68' AS province_code, '23074' AS code, 'Xã Đông Giang' AS name, 'Đông Giang' AS short_name, 'Dong Giang' AS name_en, '77414' AS postal_code, 'dong_giang' AS slug
UNION ALL
       SELECT '68' AS province_code, '23086' AS code, 'Xã Hồng Sơn' AS name, 'Hồng Sơn' AS short_name, 'Hong Son' AS name_en, '77407' AS postal_code, 'hong_son' AS slug
UNION ALL
       SELECT '68' AS province_code, '23089' AS code, 'Xã Hàm Thuận Bắc' AS name, 'Hàm Thuận Bắc' AS short_name, 'Ham Thuan Bac' AS name_en, '77424' AS postal_code, 'ham_thuan_bac' AS slug
UNION ALL
       SELECT '68' AS province_code, '23095' AS code, 'Xã Hàm Liêm' AS name, 'Hàm Liêm' AS short_name, 'Ham Liem' AS name_en, '77417' AS postal_code, 'ham_liem' AS slug
UNION ALL
       SELECT '68' AS province_code, '23110' AS code, 'Xã Hàm Thuận Nam' AS name, 'Hàm Thuận Nam' AS short_name, 'Ham Thuan Nam' AS name_en, '77719' AS postal_code, 'ham_thuan_nam' AS slug
UNION ALL
       SELECT '68' AS province_code, '23122' AS code, 'Xã Hàm Thạnh' AS name, 'Hàm Thạnh' AS short_name, 'Ham Thanh' AS name_en, '77714' AS postal_code, 'ham_thanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23128' AS code, 'Xã Hàm Kiệm' AS name, 'Hàm Kiệm' AS short_name, 'Ham Kiem' AS name_en, '77711' AS postal_code, 'ham_kiem' AS slug
UNION ALL
       SELECT '68' AS province_code, '23134' AS code, 'Xã Tân Lập' AS name, 'Tân Lập' AS short_name, 'Tan Lap' AS name_en, '77715' AS postal_code, 'tan_lap' AS slug
UNION ALL
       SELECT '68' AS province_code, '23143' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '77718' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23149' AS code, 'Xã Tánh Linh' AS name, 'Tánh Linh' AS short_name, 'Tanh Linh' AS name_en, '77520' AS postal_code, 'tanh_linh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23152' AS code, 'Xã Bắc Ruộng' AS name, 'Bắc Ruộng' AS short_name, 'Bac Ruong' AS name_en, '77511' AS postal_code, 'bac_ruong' AS slug
UNION ALL
       SELECT '68' AS province_code, '23158' AS code, 'Xã Nghị Đức' AS name, 'Nghị Đức' AS short_name, 'Nghi Duc' AS name_en, '77513' AS postal_code, 'nghi_duc' AS slug
UNION ALL
       SELECT '68' AS province_code, '23173' AS code, 'Xã Đồng Kho' AS name, 'Đồng Kho' AS short_name, 'Dong Kho' AS name_en, '77508' AS postal_code, 'dong_kho' AS slug
UNION ALL
       SELECT '68' AS province_code, '23188' AS code, 'Xã Suối Kiết' AS name, 'Suối Kiết' AS short_name, 'Suoi Kiet' AS name_en, '77519' AS postal_code, 'suoi_kiet' AS slug
UNION ALL
       SELECT '68' AS province_code, '23191' AS code, 'Xã Đức Linh' AS name, 'Đức Linh' AS short_name, 'Duc Linh' AS name_en, '77569' AS postal_code, 'duc_linh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23194' AS code, 'Xã Hoài Đức' AS name, 'Hoài Đức' AS short_name, 'Hoai Duc' AS name_en, '77571' AS postal_code, 'hoai_duc' AS slug
UNION ALL
       SELECT '68' AS province_code, '23200' AS code, 'Xã Nam Thành' AS name, 'Nam Thành' AS short_name, 'Nam Thanh' AS name_en, '77570' AS postal_code, 'nam_thanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23227' AS code, 'Xã Trà Tân' AS name, 'Trà Tân' AS short_name, 'Tra Tan' AS name_en, '77567' AS postal_code, 'tra_tan' AS slug
UNION ALL
       SELECT '68' AS province_code, '23230' AS code, 'Xã Tân Minh' AS name, 'Tân Minh' AS short_name, 'Tan Minh' AS name_en, '77609' AS postal_code, 'tan_minh' AS slug
UNION ALL
       SELECT '68' AS province_code, '23231' AS code, 'Phường Phước Hội' AS name, 'Phước Hội' AS short_name, 'Phuoc Hoi' AS name_en, '77656' AS postal_code, 'phuoc_hoi' AS slug
UNION ALL
       SELECT '68' AS province_code, '23235' AS code, 'Phường La Gi' AS name, 'La Gi' AS short_name, 'La Gi' AS name_en, '77665' AS postal_code, 'la_gi' AS slug
UNION ALL
       SELECT '68' AS province_code, '23236' AS code, 'Xã Hàm Tân' AS name, 'Hàm Tân' AS short_name, 'Ham Tan' AS name_en, '77616' AS postal_code, 'ham_tan' AS slug
UNION ALL
       SELECT '68' AS province_code, '23246' AS code, 'Xã Tân Hải' AS name, 'Tân Hải' AS short_name, 'Tan Hai' AS name_en, '77660' AS postal_code, 'tan_hai' AS slug
UNION ALL
       SELECT '68' AS province_code, '23266' AS code, 'Xã Sơn Mỹ' AS name, 'Sơn Mỹ' AS short_name, 'Son My' AS name_en, '77613' AS postal_code, 'son_my' AS slug
UNION ALL
       SELECT '68' AS province_code, '23272' AS code, 'Đặc khu Phú Quý' AS name, 'Phú Quý' AS short_name, 'Phu Quy' AS name_en, '77809' AS postal_code, 'phu_quy' AS slug
UNION ALL
       SELECT '68' AS province_code, '24611' AS code, 'Phường Bắc Gia Nghĩa' AS name, 'Bắc Gia Nghĩa' AS short_name, 'Bac Gia Nghia' AS name_en, '65115' AS postal_code, 'bac_gia_nghia' AS slug
UNION ALL
       SELECT '68' AS province_code, '24615' AS code, 'Phường Nam Gia Nghĩa' AS name, 'Nam Gia Nghĩa' AS short_name, 'Nam Gia Nghia' AS name_en, '65116' AS postal_code, 'nam_gia_nghia' AS slug
UNION ALL
       SELECT '68' AS province_code, '24616' AS code, 'Xã Quảng Sơn' AS name, 'Quảng Sơn' AS short_name, 'Quang Son' AS name_en, '65211' AS postal_code, 'quang_son' AS slug
UNION ALL
       SELECT '68' AS province_code, '24617' AS code, 'Phường Đông Gia Nghĩa' AS name, 'Đông Gia Nghĩa' AS short_name, 'Dong Gia Nghia' AS name_en, '65114' AS postal_code, 'dong_gia_nghia' AS slug
UNION ALL
       SELECT '68' AS province_code, '24620' AS code, 'Xã Quảng Hoà' AS name, 'Quảng Hoà' AS short_name, 'Quang Hoa' AS name_en, '65212' AS postal_code, 'quang_hoa' AS slug
UNION ALL
       SELECT '68' AS province_code, '24631' AS code, 'Xã Quảng Khê' AS name, 'Quảng Khê' AS short_name, 'Quang Khe' AS name_en, '65206' AS postal_code, 'quang_khe' AS slug
UNION ALL
       SELECT '68' AS province_code, '24637' AS code, 'Xã Tà Đùng' AS name, 'Tà Đùng' AS short_name, 'Ta Dung' AS name_en, '65213' AS postal_code, 'ta_dung' AS slug
UNION ALL
       SELECT '68' AS province_code, '24640' AS code, 'Xã Cư Jút' AS name, 'Cư Jút' AS short_name, 'Cu Jut' AS name_en, '65414' AS postal_code, 'cu_jut' AS slug
UNION ALL
       SELECT '68' AS province_code, '24646' AS code, 'Xã Đắk Wil' AS name, 'Đắk Wil' AS short_name, 'Dak Wil' AS name_en, '65413' AS postal_code, 'dak_wil' AS slug
UNION ALL
       SELECT '68' AS province_code, '24649' AS code, 'Xã Nam Dong' AS name, 'Nam Dong' AS short_name, 'Nam Dong' AS name_en, '65410' AS postal_code, 'nam_dong' AS slug
UNION ALL
       SELECT '68' AS province_code, '24664' AS code, 'Xã Đức Lập' AS name, 'Đức Lập' AS short_name, 'Duc Lap' AS name_en, '65516' AS postal_code, 'duc_lap' AS slug
UNION ALL
       SELECT '68' AS province_code, '24670' AS code, 'Xã Đắk Mil' AS name, 'Đắk Mil' AS short_name, 'Dak Mil' AS name_en, '65517' AS postal_code, 'dak_mil' AS slug
UNION ALL
       SELECT '68' AS province_code, '24678' AS code, 'Xã Đắk Sắk' AS name, 'Đắk Sắk' AS short_name, 'Dak Sak' AS name_en, '65509' AS postal_code, 'dak_sak' AS slug
UNION ALL
       SELECT '68' AS province_code, '24682' AS code, 'Xã Thuận An' AS name, 'Thuận An' AS short_name, 'Thuan An' AS name_en, '65507' AS postal_code, 'thuan_an' AS slug
UNION ALL
       SELECT '68' AS province_code, '24688' AS code, 'Xã Krông Nô' AS name, 'Krông Nô' AS short_name, 'Krong No' AS name_en, '65318' AS postal_code, 'krong_no' AS slug
UNION ALL
       SELECT '68' AS province_code, '24697' AS code, 'Xã Nam Đà' AS name, 'Nam Đà' AS short_name, 'Nam Da' AS name_en, '65308' AS postal_code, 'nam_da' AS slug
UNION ALL
       SELECT '68' AS province_code, '24703' AS code, 'Xã Nâm Nung' AS name, 'Nâm Nung' AS short_name, 'Nam Nung' AS name_en, '65313' AS postal_code, 'nam_nung' AS slug
UNION ALL
       SELECT '68' AS province_code, '24712' AS code, 'Xã Quảng Phú' AS name, 'Quảng Phú' AS short_name, 'Quang Phu' AS name_en, '65317' AS postal_code, 'quang_phu' AS slug
UNION ALL
       SELECT '68' AS province_code, '24717' AS code, 'Xã Đức An' AS name, 'Đức An' AS short_name, 'Duc An' AS name_en, '65606' AS postal_code, 'duc_an' AS slug
UNION ALL
       SELECT '68' AS province_code, '24718' AS code, 'Xã Đắk Song' AS name, 'Đắk Song' AS short_name, 'Dak Song' AS name_en, '65615' AS postal_code, 'dak_song' AS slug
UNION ALL
       SELECT '68' AS province_code, '24722' AS code, 'Xã Thuận Hạnh' AS name, 'Thuận Hạnh' AS short_name, 'Thuan Hanh' AS name_en, '65610' AS postal_code, 'thuan_hanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '24730' AS code, 'Xã Trường Xuân' AS name, 'Trường Xuân' AS short_name, 'Truong Xuan' AS name_en, '65614' AS postal_code, 'truong_xuan' AS slug
UNION ALL
       SELECT '68' AS province_code, '24733' AS code, 'Xã Kiến Đức' AS name, 'Kiến Đức' AS short_name, 'Kien Duc' AS name_en, '65806' AS postal_code, 'kien_duc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24736' AS code, 'Xã Quảng Trực' AS name, 'Quảng Trực' AS short_name, 'Quang Truc' AS name_en, '65711' AS postal_code, 'quang_truc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24739' AS code, 'Xã Tuy Đức' AS name, 'Tuy Đức' AS short_name, 'Tuy Duc' AS name_en, '65712' AS postal_code, 'tuy_duc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24748' AS code, 'Xã Quảng Tân' AS name, 'Quảng Tân' AS short_name, 'Quang Tan' AS name_en, '65709' AS postal_code, 'quang_tan' AS slug
UNION ALL
       SELECT '68' AS province_code, '24751' AS code, 'Xã Nhân Cơ' AS name, 'Nhân Cơ' AS short_name, 'Nhan Co' AS name_en, '65810' AS postal_code, 'nhan_co' AS slug
UNION ALL
       SELECT '68' AS province_code, '24760' AS code, 'Xã Quảng Tín' AS name, 'Quảng Tín' AS short_name, 'Quang Tin' AS name_en, '65807' AS postal_code, 'quang_tin' AS slug
UNION ALL
       SELECT '68' AS province_code, '24778' AS code, 'Phường Lâm Viên - Đà Lạt' AS name, 'Lâm Viên - Đà Lạt' AS short_name, 'Lam Vien - Da Lat' AS name_en, '66124' AS postal_code, 'lam_vien_da_lat' AS slug
UNION ALL
       SELECT '68' AS province_code, '24781' AS code, 'Phường Xuân Hương - Đà Lạt' AS name, 'Xuân Hương - Đà Lạt' AS short_name, 'Xuan Huong - Da Lat' AS name_en, '66122' AS postal_code, 'xuan_huong_da_lat' AS slug
UNION ALL
       SELECT '68' AS province_code, '24787' AS code, 'Phường Cam Ly - Đà Lạt' AS name, 'Cam Ly - Đà Lạt' AS short_name, 'Cam Ly - Da Lat' AS name_en, '66123' AS postal_code, 'cam_ly_da_lat' AS slug
UNION ALL
       SELECT '68' AS province_code, '24805' AS code, 'Phường Xuân Trường - Đà Lạt' AS name, 'Xuân Trường - Đà Lạt' AS short_name, 'Xuan Truong - Da Lat' AS name_en, '66125' AS postal_code, 'xuan_truong_da_lat' AS slug
UNION ALL
       SELECT '68' AS province_code, '24820' AS code, 'Phường 2 Bảo Lộc' AS name, '2 Bảo Lộc' AS short_name, '2 Bao Loc' AS name_en, '66468' AS postal_code, '2_bao_loc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24823' AS code, 'Phường 1 Bảo Lộc' AS name, '1 Bảo Lộc' AS short_name, '1 Bao Loc' AS name_en, '66467' AS postal_code, '1_bao_loc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24829' AS code, 'Phường B''Lao' AS name, 'B''Lao' AS short_name, 'B''Lao' AS name_en, '66459' AS postal_code, 'blao' AS slug
UNION ALL
       SELECT '68' AS province_code, '24841' AS code, 'Phường 3 Bảo Lộc' AS name, '3 Bảo Lộc' AS short_name, '3 Bao Loc' AS name_en, '66469' AS postal_code, '3_bao_loc' AS slug
UNION ALL
       SELECT '68' AS province_code, '24846' AS code, 'Phường Lang Biang - Đà Lạt' AS name, 'Lang Biang - Đà Lạt' AS short_name, 'Lang Biang - Da Lat' AS name_en, '66126' AS postal_code, 'lang_biang_da_lat' AS slug
UNION ALL
       SELECT '68' AS province_code, '24848' AS code, 'Xã Lạc Dương' AS name, 'Lạc Dương' AS short_name, 'Lac Duong' AS name_en, '66917' AS postal_code, 'lac_duong' AS slug
UNION ALL
       SELECT '68' AS province_code, '24853' AS code, 'Xã Đam Rông 4' AS name, 'Đam Rông 4' AS short_name, 'Dam Rong 4' AS name_en, '66267' AS postal_code, 'dam_rong_4' AS slug
UNION ALL
       SELECT '68' AS province_code, '24868' AS code, 'Xã Nam Ban Lâm Hà' AS name, 'Nam Ban Lâm Hà' AS short_name, 'Nam Ban Lam Ha' AS name_en, '66313' AS postal_code, 'nam_ban_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24871' AS code, 'Xã Đinh Văn Lâm Hà' AS name, 'Đinh Văn Lâm Hà' AS short_name, 'Dinh Van Lam Ha' AS name_en, '66322' AS postal_code, 'dinh_van_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24875' AS code, 'Xã Đam Rông 3' AS name, 'Đam Rông 3' AS short_name, 'Dam Rong 3' AS name_en, '66266' AS postal_code, 'dam_rong_3' AS slug
UNION ALL
       SELECT '68' AS province_code, '24877' AS code, 'Xã Đam Rông 2' AS name, 'Đam Rông 2' AS short_name, 'Dam Rong 2' AS name_en, '66265' AS postal_code, 'dam_rong_2' AS slug
UNION ALL
       SELECT '68' AS province_code, '24883' AS code, 'Xã Nam Hà Lâm Hà' AS name, 'Nam Hà Lâm Hà' AS short_name, 'Nam Ha Lam Ha' AS name_en, '66307' AS postal_code, 'nam_ha_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24886' AS code, 'Xã Đam Rông 1' AS name, 'Đam Rông 1' AS short_name, 'Dam Rong 1' AS name_en, '66264' AS postal_code, 'dam_rong_1' AS slug
UNION ALL
       SELECT '68' AS province_code, '24895' AS code, 'Xã Phú Sơn Lâm Hà' AS name, 'Phú Sơn Lâm Hà' AS short_name, 'Phu Son Lam Ha' AS name_en, '66316' AS postal_code, 'phu_son_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24907' AS code, 'Xã Phúc Thọ Lâm Hà' AS name, 'Phúc Thọ Lâm Hà' AS short_name, 'Phuc Tho Lam Ha' AS name_en, '66317' AS postal_code, 'phuc_tho_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24916' AS code, 'Xã Tân Hà Lâm Hà' AS name, 'Tân Hà Lâm Hà' AS short_name, 'Tan Ha Lam Ha' AS name_en, '66311' AS postal_code, 'tan_ha_lam_ha' AS slug
UNION ALL
       SELECT '68' AS province_code, '24931' AS code, 'Xã Đơn Dương' AS name, 'Đơn Dương' AS short_name, 'Don Duong' AS name_en, '66916' AS postal_code, 'don_duong' AS slug
UNION ALL
       SELECT '68' AS province_code, '24934' AS code, 'Xã D''Ran' AS name, 'D''Ran' AS short_name, 'D''Ran' AS name_en, '66915' AS postal_code, 'dran' AS slug
UNION ALL
       SELECT '68' AS province_code, '24943' AS code, 'Xã Ka Đô' AS name, 'Ka Đô' AS short_name, 'Ka Do' AS name_en, '66913' AS postal_code, 'ka_do' AS slug
UNION ALL
       SELECT '68' AS province_code, '24955' AS code, 'Xã Quảng Lập' AS name, 'Quảng Lập' AS short_name, 'Quang Lap' AS name_en, '66907' AS postal_code, 'quang_lap' AS slug
UNION ALL
       SELECT '68' AS province_code, '24958' AS code, 'Xã Đức Trọng' AS name, 'Đức Trọng' AS short_name, 'Duc Trong' AS name_en, '66821' AS postal_code, 'duc_trong' AS slug
UNION ALL
       SELECT '68' AS province_code, '24967' AS code, 'Xã Hiệp Thạnh' AS name, 'Hiệp Thạnh' AS short_name, 'Hiep Thanh' AS name_en, '66807' AS postal_code, 'hiep_thanh' AS slug
UNION ALL
       SELECT '68' AS province_code, '24976' AS code, 'Xã Tân Hội' AS name, 'Tân Hội' AS short_name, 'Tan Hoi' AS name_en, '66810' AS postal_code, 'tan_hoi' AS slug
UNION ALL
       SELECT '68' AS province_code, '24985' AS code, 'Xã Ninh Gia' AS name, 'Ninh Gia' AS short_name, 'Ninh Gia' AS name_en, '66815' AS postal_code, 'ninh_gia' AS slug
UNION ALL
       SELECT '68' AS province_code, '24988' AS code, 'Xã Tà Năng' AS name, 'Tà Năng' AS short_name, 'Ta Nang' AS name_en, '66819' AS postal_code, 'ta_nang' AS slug
UNION ALL
       SELECT '68' AS province_code, '24991' AS code, 'Xã Tà Hine' AS name, 'Tà Hine' AS short_name, 'Ta Hine' AS name_en, '66816' AS postal_code, 'ta_hine' AS slug
UNION ALL
       SELECT '68' AS province_code, '25000' AS code, 'Xã Di Linh' AS name, 'Di Linh' AS short_name, 'Di Linh' AS name_en, '66706' AS postal_code, 'di_linh' AS slug
UNION ALL
       SELECT '68' AS province_code, '25007' AS code, 'Xã Đinh Trang Thượng' AS name, 'Đinh Trang Thượng' AS short_name, 'Dinh Trang Thuong' AS name_en, '66716' AS postal_code, 'dinh_trang_thuong' AS slug
UNION ALL
       SELECT '68' AS province_code, '25015' AS code, 'Xã Gia Hiệp' AS name, 'Gia Hiệp' AS short_name, 'Gia Hiep' AS name_en, '66713' AS postal_code, 'gia_hiep' AS slug
UNION ALL
       SELECT '68' AS province_code, '25018' AS code, 'Xã Bảo Thuận' AS name, 'Bảo Thuận' AS short_name, 'Bao Thuan' AS name_en, '66711' AS postal_code, 'bao_thuan' AS slug
UNION ALL
       SELECT '68' AS province_code, '25036' AS code, 'Xã Hoà Ninh' AS name, 'Hoà Ninh' AS short_name, 'Hoa Ninh' AS name_en, '66720' AS postal_code, 'hoa_ninh' AS slug
UNION ALL
       SELECT '68' AS province_code, '25042' AS code, 'Xã Hoà Bắc' AS name, 'Hoà Bắc' AS short_name, 'Hoa Bac' AS name_en, '66722' AS postal_code, 'hoa_bac' AS slug
UNION ALL
       SELECT '68' AS province_code, '25051' AS code, 'Xã Sơn Điền' AS name, 'Sơn Điền' AS short_name, 'Son Dien' AS name_en, '66723' AS postal_code, 'son_dien' AS slug
UNION ALL
       SELECT '68' AS province_code, '25054' AS code, 'Xã Bảo Lâm 1' AS name, 'Bảo Lâm 1' AS short_name, 'Bao Lam 1' AS name_en, '66420' AS postal_code, 'bao_lam_1' AS slug
UNION ALL
       SELECT '68' AS province_code, '25057' AS code, 'Xã Bảo Lâm 5' AS name, 'Bảo Lâm 5' AS short_name, 'Bao Lam 5' AS name_en, '66424' AS postal_code, 'bao_lam_5' AS slug
UNION ALL
       SELECT '68' AS province_code, '25063' AS code, 'Xã Bảo Lâm 4' AS name, 'Bảo Lâm 4' AS short_name, 'Bao Lam 4' AS name_en, '66423' AS postal_code, 'bao_lam_4' AS slug
UNION ALL
       SELECT '68' AS province_code, '25084' AS code, 'Xã Bảo Lâm 2' AS name, 'Bảo Lâm 2' AS short_name, 'Bao Lam 2' AS name_en, '66421' AS postal_code, 'bao_lam_2' AS slug
UNION ALL
       SELECT '68' AS province_code, '25093' AS code, 'Xã Bảo Lâm 3' AS name, 'Bảo Lâm 3' AS short_name, 'Bao Lam 3' AS name_en, '66422' AS postal_code, 'bao_lam_3' AS slug
UNION ALL
       SELECT '68' AS province_code, '25099' AS code, 'Xã Đạ Huoai' AS name, 'Đạ Huoai' AS short_name, 'Da Huoai' AS name_en, '66666' AS postal_code, 'da_huoai' AS slug
UNION ALL
       SELECT '68' AS province_code, '25105' AS code, 'Xã Đạ Huoai 2' AS name, 'Đạ Huoai 2' AS short_name, 'Da Huoai 2' AS name_en, '66667' AS postal_code, 'da_huoai_2' AS slug
UNION ALL
       SELECT '68' AS province_code, '25114' AS code, 'Xã Đạ Huoai 3' AS name, 'Đạ Huoai 3' AS short_name, 'Da Huoai 3' AS name_en, '66662' AS postal_code, 'da_huoai_3' AS slug
UNION ALL
       SELECT '68' AS province_code, '25126' AS code, 'Xã Đạ Tẻh' AS name, 'Đạ Tẻh' AS short_name, 'Da Teh' AS name_en, '66606' AS postal_code, 'da_teh' AS slug
UNION ALL
       SELECT '68' AS province_code, '25135' AS code, 'Xã Đạ Tẻh 3' AS name, 'Đạ Tẻh 3' AS short_name, 'Da Teh 3' AS name_en, '66618' AS postal_code, 'da_teh_3' AS slug
UNION ALL
       SELECT '68' AS province_code, '25138' AS code, 'Xã Đạ Tẻh 2' AS name, 'Đạ Tẻh 2' AS short_name, 'Da Teh 2' AS name_en, '66617' AS postal_code, 'da_teh_2' AS slug
UNION ALL
       SELECT '68' AS province_code, '25159' AS code, 'Xã Cát Tiên' AS name, 'Cát Tiên' AS short_name, 'Cat Tien' AS name_en, '66506' AS postal_code, 'cat_tien' AS slug
UNION ALL
       SELECT '68' AS province_code, '25162' AS code, 'Xã Cát Tiên 3' AS name, 'Cát Tiên 3' AS short_name, 'Cat Tien 3' AS name_en, '66518' AS postal_code, 'cat_tien_3' AS slug
UNION ALL
       SELECT '68' AS province_code, '25180' AS code, 'Xã Cát Tiên 2' AS name, 'Cát Tiên 2' AS short_name, 'Cat Tien 2' AS name_en, '66517' AS postal_code, 'cat_tien_2' AS slug
UNION ALL
       SELECT '75' AS province_code, '25195' AS code, 'Phường Bình Phước' AS name, 'Bình Phước' AS short_name, 'Binh Phuoc' AS name_en, '67114' AS postal_code, 'binh_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '25210' AS code, 'Phường Đồng Xoài' AS name, 'Đồng Xoài' AS short_name, 'Dong Xoai' AS name_en, '67115' AS postal_code, 'dong_xoai' AS slug
UNION ALL
       SELECT '75' AS province_code, '25217' AS code, 'Phường Phước Long' AS name, 'Phước Long' AS short_name, 'Phuoc Long' AS name_en, '67716' AS postal_code, 'phuoc_long' AS slug
UNION ALL
       SELECT '75' AS province_code, '25220' AS code, 'Phường Phước Bình' AS name, 'Phước Bình' AS short_name, 'Phuoc Binh' AS name_en, '67407' AS postal_code, 'phuoc_binh' AS slug
UNION ALL
       SELECT '75' AS province_code, '25222' AS code, 'Xã Bù Gia Mập' AS name, 'Bù Gia Mập' AS short_name, 'Bu Gia Map' AS name_en, '67513' AS postal_code, 'bu_gia_map' AS slug
UNION ALL
       SELECT '75' AS province_code, '25225' AS code, 'Xã Đăk Ơ' AS name, 'Đăk Ơ' AS short_name, 'Dak O' AS name_en, '67512' AS postal_code, 'dak_o' AS slug
UNION ALL
       SELECT '75' AS province_code, '25231' AS code, 'Xã Đa Kia' AS name, 'Đa Kia' AS short_name, 'Da Kia' AS name_en, '67509' AS postal_code, 'da_kia' AS slug
UNION ALL
       SELECT '75' AS province_code, '25246' AS code, 'Xã Bình Tân' AS name, 'Bình Tân' AS short_name, 'Binh Tan' AS name_en, '67714' AS postal_code, 'binh_tan' AS slug
UNION ALL
       SELECT '75' AS province_code, '25252' AS code, 'Xã Phú Riềng' AS name, 'Phú Riềng' AS short_name, 'Phu Rieng' AS name_en, '67706' AS postal_code, 'phu_rieng' AS slug
UNION ALL
       SELECT '75' AS province_code, '25255' AS code, 'Xã Long Hà' AS name, 'Long Hà' AS short_name, 'Long Ha' AS name_en, '67711' AS postal_code, 'long_ha' AS slug
UNION ALL
       SELECT '75' AS province_code, '25261' AS code, 'Xã Phú Trung' AS name, 'Phú Trung' AS short_name, 'Phu Trung' AS name_en, '67707' AS postal_code, 'phu_trung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25267' AS code, 'Xã Phú Nghĩa' AS name, 'Phú Nghĩa' AS short_name, 'Phu Nghia' AS name_en, '67506' AS postal_code, 'phu_nghia' AS slug
UNION ALL
       SELECT '75' AS province_code, '25270' AS code, 'Phường Lộc Ninh' AS name, 'Lộc Ninh' AS short_name, 'Loc Ninh' AS name_en, '67606' AS postal_code, 'loc_ninh' AS slug
UNION ALL
       SELECT '75' AS province_code, '25279' AS code, 'Xã Lộc Tấn' AS name, 'Lộc Tấn' AS short_name, 'Loc Tan' AS name_en, '67612' AS postal_code, 'loc_tan' AS slug
UNION ALL
       SELECT '75' AS province_code, '25280' AS code, 'Xã Lộc Thạnh' AS name, 'Lộc Thạnh' AS short_name, 'Loc Thanh' AS name_en, '67611' AS postal_code, 'loc_thanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '25292' AS code, 'Xã Lộc Quang' AS name, 'Lộc Quang' AS short_name, 'Loc Quang' AS name_en, '67620' AS postal_code, 'loc_quang' AS slug
UNION ALL
       SELECT '75' AS province_code, '25294' AS code, 'Xã Lộc Thành' AS name, 'Lộc Thành' AS short_name, 'Loc Thanh' AS name_en, '67614' AS postal_code, 'loc_thanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '25303' AS code, 'Xã Lộc Hưng' AS name, 'Lộc Hưng' AS short_name, 'Loc Hung' AS name_en, '67616' AS postal_code, 'loc_hung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25308' AS code, 'Xã Thiện Hưng' AS name, 'Thiện Hưng' AS short_name, 'Thien Hung' AS name_en, '67659' AS postal_code, 'thien_hung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25309' AS code, 'Xã Hưng Phước' AS name, 'Hưng Phước' AS short_name, 'Hung Phuoc' AS name_en, '67658' AS postal_code, 'hung_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '25318' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '67662' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '75' AS province_code, '25326' AS code, 'Phường Bình Long' AS name, 'Bình Long' AS short_name, 'Binh Long' AS name_en, '67862' AS postal_code, 'binh_long' AS slug
UNION ALL
       SELECT '75' AS province_code, '25333' AS code, 'Phường An Lộc' AS name, 'An Lộc' AS short_name, 'An Loc' AS name_en, '67863' AS postal_code, 'an_loc' AS slug
UNION ALL
       SELECT '75' AS province_code, '25345' AS code, 'Xã Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '67809' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25349' AS code, 'Xã Minh Đức' AS name, 'Minh Đức' AS short_name, 'Minh Duc' AS name_en, '67816' AS postal_code, 'minh_duc' AS slug
UNION ALL
       SELECT '75' AS province_code, '25351' AS code, 'Xã Tân Quan' AS name, 'Tân Quan' AS short_name, 'Tan Quan' AS name_en, '67807' AS postal_code, 'tan_quan' AS slug
UNION ALL
       SELECT '75' AS province_code, '25357' AS code, 'Phường Tân Khai' AS name, 'Tân Khai' AS short_name, 'Tan Khai' AS name_en, '67806' AS postal_code, 'tan_khai' AS slug
UNION ALL
       SELECT '75' AS province_code, '25363' AS code, 'Phường Đồng Phú' AS name, 'Đồng Phú' AS short_name, 'Dong Phu' AS name_en, '67217' AS postal_code, 'dong_phu' AS slug
UNION ALL
       SELECT '75' AS province_code, '25378' AS code, 'Xã Tân Lợi' AS name, 'Tân Lợi' AS short_name, 'Tan Loi' AS name_en, '67210' AS postal_code, 'tan_loi' AS slug
UNION ALL
       SELECT '75' AS province_code, '25387' AS code, 'Xã Thuận Lợi' AS name, 'Thuận Lợi' AS short_name, 'Thuan Loi' AS name_en, '67216' AS postal_code, 'thuan_loi' AS slug
UNION ALL
       SELECT '75' AS province_code, '25390' AS code, 'Xã Đồng Tâm' AS name, 'Đồng Tâm' AS short_name, 'Dong Tam' AS name_en, '67213' AS postal_code, 'dong_tam' AS slug
UNION ALL
       SELECT '75' AS province_code, '25396' AS code, 'Xã Bù Đăng' AS name, 'Bù Đăng' AS short_name, 'Bu Dang' AS name_en, '67322' AS postal_code, 'bu_dang' AS slug
UNION ALL
       SELECT '75' AS province_code, '25399' AS code, 'Xã Đak Nhau' AS name, 'Đak Nhau' AS short_name, 'Dak Nhau' AS name_en, '67310' AS postal_code, 'dak_nhau' AS slug
UNION ALL
       SELECT '75' AS province_code, '25402' AS code, 'Xã Thọ Sơn' AS name, 'Thọ Sơn' AS short_name, 'Tho Son' AS name_en, '67308' AS postal_code, 'tho_son' AS slug
UNION ALL
       SELECT '75' AS province_code, '25405' AS code, 'Xã Bom Bo' AS name, 'Bom Bo' AS short_name, 'Bom Bo' AS name_en, '67312' AS postal_code, 'bom_bo' AS slug
UNION ALL
       SELECT '75' AS province_code, '25417' AS code, 'Xã Nghĩa Trung' AS name, 'Nghĩa Trung' AS short_name, 'Nghia Trung' AS name_en, '67317' AS postal_code, 'nghia_trung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25420' AS code, 'Xã Phước Sơn' AS name, 'Phước Sơn' AS short_name, 'Phuoc Son' AS name_en, '67320' AS postal_code, 'phuoc_son' AS slug
UNION ALL
       SELECT '75' AS province_code, '25432' AS code, 'Phường Chơn Thành' AS name, 'Chơn Thành' AS short_name, 'Chon Thanh' AS name_en, '67915' AS postal_code, 'chon_thanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '25441' AS code, 'Phường Minh Hưng' AS name, 'Minh Hưng' AS short_name, 'Minh Hung' AS name_en, '67912' AS postal_code, 'minh_hung' AS slug
UNION ALL
       SELECT '75' AS province_code, '25450' AS code, 'Xã Nha Bích' AS name, 'Nha Bích' AS short_name, 'Nha Bich' AS name_en, '67908' AS postal_code, 'nha_bich' AS slug
UNION ALL
       SELECT '75' AS province_code, '25993' AS code, 'Phường Trảng Dài' AS name, 'Trảng Dài' AS short_name, 'Trang Dai' AS name_en, '76116' AS postal_code, 'trang_dai' AS slug
UNION ALL
       SELECT '75' AS province_code, '26005' AS code, 'Phường Hố Nai' AS name, 'Hố Nai' AS short_name, 'Ho Nai' AS name_en, '76138' AS postal_code, 'ho_nai' AS slug
UNION ALL
       SELECT '75' AS province_code, '26017' AS code, 'Phường Tam Hiệp' AS name, 'Tam Hiệp' AS short_name, 'Tam Hiep' AS name_en, '76109' AS postal_code, 'tam_hiep' AS slug
UNION ALL
       SELECT '75' AS province_code, '26020' AS code, 'Phường Long Bình' AS name, 'Long Bình' AS short_name, 'Long Binh' AS name_en, '76134' AS postal_code, 'long_binh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26041' AS code, 'Phường Trấn Biên' AS name, 'Trấn Biên' AS short_name, 'Tran Bien' AS name_en, '76137' AS postal_code, 'tran_bien' AS slug
UNION ALL
       SELECT '75' AS province_code, '26068' AS code, 'Phường Biên Hoà' AS name, 'Biên Hoà' AS short_name, 'Bien Hoa' AS name_en, '76136' AS postal_code, 'bien_hoa' AS slug
UNION ALL
       SELECT '75' AS province_code, '26080' AS code, 'Phường Long Khánh' AS name, 'Long Khánh' AS short_name, 'Long Khanh' AS name_en, '76471' AS postal_code, 'long_khanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26089' AS code, 'Phường Bình Lộc' AS name, 'Bình Lộc' AS short_name, 'Binh Loc' AS name_en, '76461' AS postal_code, 'binh_loc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26098' AS code, 'Phường Bảo Vinh' AS name, 'Bảo Vinh' AS short_name, 'Bao Vinh' AS name_en, '76459' AS postal_code, 'bao_vinh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26104' AS code, 'Phường Xuân Lập' AS name, 'Xuân Lập' AS short_name, 'Xuan Lap' AS name_en, '76468' AS postal_code, 'xuan_lap' AS slug
UNION ALL
       SELECT '75' AS province_code, '26113' AS code, 'Phường Hàng Gòn' AS name, 'Hàng Gòn' AS short_name, 'Hang Gon' AS name_en, '76470' AS postal_code, 'hang_gon' AS slug
UNION ALL
       SELECT '75' AS province_code, '26116' AS code, 'Phường Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '76806' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '75' AS province_code, '26119' AS code, 'Xã Đak Lua' AS name, 'Đak Lua' AS short_name, 'Dak Lua' AS name_en, '76814' AS postal_code, 'dak_lua' AS slug
UNION ALL
       SELECT '75' AS province_code, '26122' AS code, 'Xã Nam Cát Tiên' AS name, 'Nam Cát Tiên' AS short_name, 'Nam Cat Tien' AS name_en, '76813' AS postal_code, 'nam_cat_tien' AS slug
UNION ALL
       SELECT '75' AS province_code, '26134' AS code, 'Xã Tà Lài' AS name, 'Tà Lài' AS short_name, 'Ta Lai' AS name_en, '76817' AS postal_code, 'ta_lai' AS slug
UNION ALL
       SELECT '75' AS province_code, '26158' AS code, 'Xã Phú Lâm' AS name, 'Phú Lâm' AS short_name, 'Phu Lam' AS name_en, '76821' AS postal_code, 'phu_lam' AS slug
UNION ALL
       SELECT '75' AS province_code, '26170' AS code, 'Phường Trị An' AS name, 'Trị An' AS short_name, 'Tri An' AS name_en, '76910' AS postal_code, 'tri_an' AS slug
UNION ALL
       SELECT '75' AS province_code, '26173' AS code, 'Xã Phú Lý' AS name, 'Phú Lý' AS short_name, 'Phu Ly' AS name_en, '76908' AS postal_code, 'phu_ly' AS slug
UNION ALL
       SELECT '75' AS province_code, '26179' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '76911' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '75' AS province_code, '26188' AS code, 'Phường Tân Triều' AS name, 'Tân Triều' AS short_name, 'Tan Trieu' AS name_en, '76139' AS postal_code, 'tan_trieu' AS slug
UNION ALL
       SELECT '75' AS province_code, '26206' AS code, 'Xã Định Quán' AS name, 'Định Quán' AS short_name, 'Dinh Quan' AS name_en, '76706' AS postal_code, 'dinh_quan' AS slug
UNION ALL
       SELECT '75' AS province_code, '26209' AS code, 'Xã Thanh Sơn' AS name, 'Thanh Sơn' AS short_name, 'Thanh Son' AS name_en, '76711' AS postal_code, 'thanh_son' AS slug
UNION ALL
       SELECT '75' AS province_code, '26215' AS code, 'Xã Phú Vinh' AS name, 'Phú Vinh' AS short_name, 'Phu Vinh' AS name_en, '76709' AS postal_code, 'phu_vinh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26221' AS code, 'Xã Phú Hoà' AS name, 'Phú Hoà' AS short_name, 'Phu Hoa' AS name_en, '76707' AS postal_code, 'phu_hoa' AS slug
UNION ALL
       SELECT '75' AS province_code, '26227' AS code, 'Xã La Ngà' AS name, 'La Ngà' AS short_name, 'La Nga' AS name_en, '76714' AS postal_code, 'la_nga' AS slug
UNION ALL
       SELECT '75' AS province_code, '26248' AS code, 'Phường Trảng Bom' AS name, 'Trảng Bom' AS short_name, 'Trang Bom' AS name_en, '76306' AS postal_code, 'trang_bom' AS slug
UNION ALL
       SELECT '75' AS province_code, '26254' AS code, 'Xã Bàu Hàm' AS name, 'Bàu Hàm' AS short_name, 'Bau Ham' AS name_en, '76309' AS postal_code, 'bau_ham' AS slug
UNION ALL
       SELECT '75' AS province_code, '26278' AS code, 'Xã Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '76315' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26281' AS code, 'Xã Hưng Thịnh' AS name, 'Hưng Thịnh' AS short_name, 'Hung Thinh' AS name_en, '76322' AS postal_code, 'hung_thinh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26296' AS code, 'Xã An Viễn' AS name, 'An Viễn' AS short_name, 'An Vien' AS name_en, '76320' AS postal_code, 'an_vien' AS slug
UNION ALL
       SELECT '75' AS province_code, '26299' AS code, 'Xã Thống Nhất' AS name, 'Thống Nhất' AS short_name, 'Thong Nhat' AS name_en, '76323' AS postal_code, 'thong_nhat' AS slug
UNION ALL
       SELECT '75' AS province_code, '26311' AS code, 'Xã Gia Kiệm' AS name, 'Gia Kiệm' AS short_name, 'Gia Kiem' AS name_en, '76412' AS postal_code, 'gia_kiem' AS slug
UNION ALL
       SELECT '75' AS province_code, '26326' AS code, 'Phường Dầu Giây' AS name, 'Dầu Giây' AS short_name, 'Dau Giay' AS name_en, '76406' AS postal_code, 'dau_giay' AS slug
UNION ALL
       SELECT '75' AS province_code, '26332' AS code, 'Xã Xuân Quế' AS name, 'Xuân Quế' AS short_name, 'Xuan Que' AS name_en, '76507' AS postal_code, 'xuan_que' AS slug
UNION ALL
       SELECT '75' AS province_code, '26341' AS code, 'Xã Cẩm Mỹ' AS name, 'Cẩm Mỹ' AS short_name, 'Cam My' AS name_en, '76519' AS postal_code, 'cam_my' AS slug
UNION ALL
       SELECT '75' AS province_code, '26347' AS code, 'Xã Xuân Đường' AS name, 'Xuân Đường' AS short_name, 'Xuan Duong' AS name_en, '76516' AS postal_code, 'xuan_duong' AS slug
UNION ALL
       SELECT '75' AS province_code, '26359' AS code, 'Xã Xuân Đông' AS name, 'Xuân Đông' AS short_name, 'Xuan Dong' AS name_en, '76513' AS postal_code, 'xuan_dong' AS slug
UNION ALL
       SELECT '75' AS province_code, '26362' AS code, 'Xã Sông Ray' AS name, 'Sông Ray' AS short_name, 'Song Ray' AS name_en, '76509' AS postal_code, 'song_ray' AS slug
UNION ALL
       SELECT '75' AS province_code, '26368' AS code, 'Phường Long Thành' AS name, 'Long Thành' AS short_name, 'Long Thanh' AS name_en, '76206' AS postal_code, 'long_thanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26374' AS code, 'Phường Tam Phước' AS name, 'Tam Phước' AS short_name, 'Tam Phuoc' AS name_en, '76133' AS postal_code, 'tam_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26377' AS code, 'Phường Phước Tân' AS name, 'Phước Tân' AS short_name, 'Phuoc Tan' AS name_en, '76132' AS postal_code, 'phuoc_tan' AS slug
UNION ALL
       SELECT '75' AS province_code, '26380' AS code, 'Phường Long Hưng' AS name, 'Long Hưng' AS short_name, 'Long Hung' AS name_en, '76131' AS postal_code, 'long_hung' AS slug
UNION ALL
       SELECT '75' AS province_code, '26383' AS code, 'Xã An Phước' AS name, 'An Phước' AS short_name, 'An Phuoc' AS name_en, '76210' AS postal_code, 'an_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26389' AS code, 'Xã Bình An' AS name, 'Bình An' AS short_name, 'Binh An' AS name_en, '76208' AS postal_code, 'binh_an' AS slug
UNION ALL
       SELECT '75' AS province_code, '26413' AS code, 'Xã Long Phước' AS name, 'Long Phước' AS short_name, 'Long Phuoc' AS name_en, '76213' AS postal_code, 'long_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26422' AS code, 'Xã Phước Thái' AS name, 'Phước Thái' AS short_name, 'Phuoc Thai' AS name_en, '76214' AS postal_code, 'phuoc_thai' AS slug
UNION ALL
       SELECT '75' AS province_code, '26425' AS code, 'Phường Xuân Lộc' AS name, 'Xuân Lộc' AS short_name, 'Xuan Loc' AS name_en, '76621' AS postal_code, 'xuan_loc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26428' AS code, 'Xã Xuân Bắc' AS name, 'Xuân Bắc' AS short_name, 'Xuan Bac' AS name_en, '76610' AS postal_code, 'xuan_bac' AS slug
UNION ALL
       SELECT '75' AS province_code, '26434' AS code, 'Xã Xuân Thành' AS name, 'Xuân Thành' AS short_name, 'Xuan Thanh' AS name_en, '76608' AS postal_code, 'xuan_thanh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26446' AS code, 'Xã Xuân Hoà' AS name, 'Xuân Hoà' AS short_name, 'Xuan Hoa' AS name_en, '76619' AS postal_code, 'xuan_hoa' AS slug
UNION ALL
       SELECT '75' AS province_code, '26458' AS code, 'Xã Xuân Phú' AS name, 'Xuân Phú' AS short_name, 'Xuan Phu' AS name_en, '76615' AS postal_code, 'xuan_phu' AS slug
UNION ALL
       SELECT '75' AS province_code, '26461' AS code, 'Xã Xuân Định' AS name, 'Xuân Định' AS short_name, 'Xuan Dinh' AS name_en, '76614' AS postal_code, 'xuan_dinh' AS slug
UNION ALL
       SELECT '75' AS province_code, '26485' AS code, 'Phường Nhơn Trạch' AS name, 'Nhơn Trạch' AS short_name, 'Nhon Trach' AS name_en, '76268' AS postal_code, 'nhon_trach' AS slug
UNION ALL
       SELECT '75' AS province_code, '26491' AS code, 'Xã Đại Phước' AS name, 'Đại Phước' AS short_name, 'Dai Phuoc' AS name_en, '76259' AS postal_code, 'dai_phuoc' AS slug
UNION ALL
       SELECT '75' AS province_code, '26503' AS code, 'Xã Phước An' AS name, 'Phước An' AS short_name, 'Phuoc An' AS name_en, '76267' AS postal_code, 'phuoc_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '25747' AS code, 'Phường Thủ Dầu Một' AS name, 'Thủ Dầu Một' AS short_name, 'Thu Dau Mot' AS name_en, '75123' AS postal_code, 'thu_dau_mot' AS slug
UNION ALL
       SELECT '79' AS province_code, '25750' AS code, 'Phường Phú Lợi' AS name, 'Phú Lợi' AS short_name, 'Phu Loi' AS name_en, '75110' AS postal_code, 'phu_loi' AS slug
UNION ALL
       SELECT '79' AS province_code, '25760' AS code, 'Phường Bình Dương' AS name, 'Bình Dương' AS short_name, 'Binh Duong' AS name_en, '75121' AS postal_code, 'binh_duong' AS slug
UNION ALL
       SELECT '79' AS province_code, '25768' AS code, 'Phường Phú An' AS name, 'Phú An' AS short_name, 'Phu An' AS name_en, '75124' AS postal_code, 'phu_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '25771' AS code, 'Phường Chánh Hiệp' AS name, 'Chánh Hiệp' AS short_name, 'Chanh Hiep' AS name_en, '75122' AS postal_code, 'chanh_hiep' AS slug
UNION ALL
       SELECT '79' AS province_code, '25777' AS code, 'Xã Dầu Tiếng' AS name, 'Dầu Tiếng' AS short_name, 'Dau Tieng' AS name_en, '75806' AS postal_code, 'dau_tieng' AS slug
UNION ALL
       SELECT '79' AS province_code, '25780' AS code, 'Xã Minh Thạnh' AS name, 'Minh Thạnh' AS short_name, 'Minh Thanh' AS name_en, '75815' AS postal_code, 'minh_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '25792' AS code, 'Xã Long Hoà' AS name, 'Long Hoà' AS short_name, 'Long Hoa' AS name_en, '75812' AS postal_code, 'long_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '25807' AS code, 'Xã Thanh An' AS name, 'Thanh An' AS short_name, 'Thanh An' AS name_en, '75807' AS postal_code, 'thanh_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '25813' AS code, 'Phường Bến Cát' AS name, 'Bến Cát' AS short_name, 'Ben Cat' AS name_en, '75915' AS postal_code, 'ben_cat' AS slug
UNION ALL
       SELECT '79' AS province_code, '25819' AS code, 'Xã Trừ Văn Thố' AS name, 'Trừ Văn Thố' AS short_name, 'Tru Van Tho' AS name_en, '75707' AS postal_code, 'tru_van_tho' AS slug
UNION ALL
       SELECT '79' AS province_code, '25822' AS code, 'Xã Bàu Bàng' AS name, 'Bàu Bàng' AS short_name, 'Bau Bang' AS name_en, '75713' AS postal_code, 'bau_bang' AS slug
UNION ALL
       SELECT '79' AS province_code, '25837' AS code, 'Phường Chánh Phú Hoà' AS name, 'Chánh Phú Hoà' AS short_name, 'Chanh Phu Hoa' AS name_en, '75913' AS postal_code, 'chanh_phu_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '25840' AS code, 'Phường Long Nguyên' AS name, 'Long Nguyên' AS short_name, 'Long Nguyen' AS name_en, '75709' AS postal_code, 'long_nguyen' AS slug
UNION ALL
       SELECT '79' AS province_code, '25843' AS code, 'Phường Tây Nam' AS name, 'Tây Nam' AS short_name, 'Tay Nam' AS name_en, '75914' AS postal_code, 'tay_nam' AS slug
UNION ALL
       SELECT '79' AS province_code, '25846' AS code, 'Phường Thới Hoà' AS name, 'Thới Hoà' AS short_name, 'Thoi Hoa' AS name_en, '75911' AS postal_code, 'thoi_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '25849' AS code, 'Phường Hoà Lợi' AS name, 'Hoà Lợi' AS short_name, 'Hoa Loi' AS name_en, '75912' AS postal_code, 'hoa_loi' AS slug
UNION ALL
       SELECT '79' AS province_code, '25858' AS code, 'Xã Phú Giáo' AS name, 'Phú Giáo' AS short_name, 'Phu Giao' AS name_en, '75618' AS postal_code, 'phu_giao' AS slug
UNION ALL
       SELECT '79' AS province_code, '25864' AS code, 'Xã Phước Thành' AS name, 'Phước Thành' AS short_name, 'Phuoc Thanh' AS name_en, '75617' AS postal_code, 'phuoc_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '25867' AS code, 'Xã An Long' AS name, 'An Long' AS short_name, 'An Long' AS name_en, '75610' AS postal_code, 'an_long' AS slug
UNION ALL
       SELECT '79' AS province_code, '25882' AS code, 'Xã Phước Hoà' AS name, 'Phước Hoà' AS short_name, 'Phuoc Hoa' AS name_en, '75614' AS postal_code, 'phuoc_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '25888' AS code, 'Phường Tân Uyên' AS name, 'Tân Uyên' AS short_name, 'Tan Uyen' AS name_en, '75419' AS postal_code, 'tan_uyen' AS slug
UNION ALL
       SELECT '79' AS province_code, '25891' AS code, 'Phường Tân Khánh' AS name, 'Tân Khánh' AS short_name, 'Tan Khanh' AS name_en, '75420' AS postal_code, 'tan_khanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '25906' AS code, 'Xã Bắc Tân Uyên' AS name, 'Bắc Tân Uyên' AS short_name, 'Bac Tan Uyen' AS name_en, '75516' AS postal_code, 'bac_tan_uyen' AS slug
UNION ALL
       SELECT '79' AS province_code, '25909' AS code, 'Xã Thường Tân' AS name, 'Thường Tân' AS short_name, 'Thuong Tan' AS name_en, '75515' AS postal_code, 'thuong_tan' AS slug
UNION ALL
       SELECT '79' AS province_code, '25912' AS code, 'Phường Vĩnh Tân' AS name, 'Vĩnh Tân' AS short_name, 'Vinh Tan' AS name_en, '75409' AS postal_code, 'vinh_tan' AS slug
UNION ALL
       SELECT '79' AS province_code, '25915' AS code, 'Phường Bình Cơ' AS name, 'Bình Cơ' AS short_name, 'Binh Co' AS name_en, '75418' AS postal_code, 'binh_co' AS slug
UNION ALL
       SELECT '79' AS province_code, '25920' AS code, 'Phường Tân Hiệp' AS name, 'Tân Hiệp' AS short_name, 'Tan Hiep' AS name_en, '75408' AS postal_code, 'tan_hiep' AS slug
UNION ALL
       SELECT '79' AS province_code, '25942' AS code, 'Phường Dĩ An' AS name, 'Dĩ An' AS short_name, 'Di An' AS name_en, '75306' AS postal_code, 'di_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '25945' AS code, 'Phường Tân Đông Hiệp' AS name, 'Tân Đông Hiệp' AS short_name, 'Tan Dong Hiep' AS name_en, '75311' AS postal_code, 'tan_dong_hiep' AS slug
UNION ALL
       SELECT '79' AS province_code, '25951' AS code, 'Phường Đông Hoà' AS name, 'Đông Hoà' AS short_name, 'Dong Hoa' AS name_en, '75308' AS postal_code, 'dong_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '25966' AS code, 'Phường Lái Thiêu' AS name, 'Lái Thiêu' AS short_name, 'Lai Thieu' AS name_en, '75206' AS postal_code, 'lai_thieu' AS slug
UNION ALL
       SELECT '79' AS province_code, '25969' AS code, 'Phường Thuận Giao' AS name, 'Thuận Giao' AS short_name, 'Thuan Giao' AS name_en, '75211' AS postal_code, 'thuan_giao' AS slug
UNION ALL
       SELECT '79' AS province_code, '25975' AS code, 'Phường An Phú' AS name, 'An Phú' AS short_name, 'An Phu' AS name_en, '75209' AS postal_code, 'an_phu' AS slug
UNION ALL
       SELECT '79' AS province_code, '25978' AS code, 'Phường Thuận An' AS name, 'Thuận An' AS short_name, 'Thuan An' AS name_en, '75216' AS postal_code, 'thuan_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '25987' AS code, 'Phường Bình Hoà' AS name, 'Bình Hoà' AS short_name, 'Binh Hoa' AS name_en, '75208' AS postal_code, 'binh_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '26506' AS code, 'Phường Vũng Tàu' AS name, 'Vũng Tàu' AS short_name, 'Vung Tau' AS name_en, '78223' AS postal_code, 'vung_tau' AS slug
UNION ALL
       SELECT '79' AS province_code, '26526' AS code, 'Phường Tam Thắng' AS name, 'Tam Thắng' AS short_name, 'Tam Thang' AS name_en, '78224' AS postal_code, 'tam_thang' AS slug
UNION ALL
       SELECT '79' AS province_code, '26536' AS code, 'Phường Rạch Dừa' AS name, 'Rạch Dừa' AS short_name, 'Rach Dua' AS name_en, '78219' AS postal_code, 'rach_dua' AS slug
UNION ALL
       SELECT '79' AS province_code, '26542' AS code, 'Phường Phước Thắng' AS name, 'Phước Thắng' AS short_name, 'Phuoc Thang' AS name_en, '78225' AS postal_code, 'phuoc_thang' AS slug
UNION ALL
       SELECT '79' AS province_code, '26545' AS code, 'Xã Long Sơn' AS name, 'Long Sơn' AS short_name, 'Long Son' AS name_en, '78222' AS postal_code, 'long_son' AS slug
UNION ALL
       SELECT '79' AS province_code, '26560' AS code, 'Phường Bà Rịa' AS name, 'Bà Rịa' AS short_name, 'Ba Ria' AS name_en, '78117' AS postal_code, 'ba_ria' AS slug
UNION ALL
       SELECT '79' AS province_code, '26566' AS code, 'Phường Long Hương' AS name, 'Long Hương' AS short_name, 'Long Huong' AS name_en, '78116' AS postal_code, 'long_huong' AS slug
UNION ALL
       SELECT '79' AS province_code, '26572' AS code, 'Phường Tam Long' AS name, 'Tam Long' AS short_name, 'Tam Long' AS name_en, '78118' AS postal_code, 'tam_long' AS slug
UNION ALL
       SELECT '79' AS province_code, '26575' AS code, 'Xã Ngãi Giao' AS name, 'Ngãi Giao' AS short_name, 'Ngai Giao' AS name_en, '78606' AS postal_code, 'ngai_giao' AS slug
UNION ALL
       SELECT '79' AS province_code, '26584' AS code, 'Xã Xuân Sơn' AS name, 'Xuân Sơn' AS short_name, 'Xuan Son' AS name_en, '78619' AS postal_code, 'xuan_son' AS slug
UNION ALL
       SELECT '79' AS province_code, '26590' AS code, 'Xã Bình Giã' AS name, 'Bình Giã' AS short_name, 'Binh Gia' AS name_en, '78607' AS postal_code, 'binh_gia' AS slug
UNION ALL
       SELECT '79' AS province_code, '26596' AS code, 'Xã Châu Đức' AS name, 'Châu Đức' AS short_name, 'Chau Duc' AS name_en, '78622' AS postal_code, 'chau_duc' AS slug
UNION ALL
       SELECT '79' AS province_code, '26608' AS code, 'Xã Kim Long' AS name, 'Kim Long' AS short_name, 'Kim Long' AS name_en, '78611' AS postal_code, 'kim_long' AS slug
UNION ALL
       SELECT '79' AS province_code, '26617' AS code, 'Xã Nghĩa Thành' AS name, 'Nghĩa Thành' AS short_name, 'Nghia Thanh' AS name_en, '78617' AS postal_code, 'nghia_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26620' AS code, 'Xã Hồ Tràm' AS name, 'Hồ Tràm' AS short_name, 'Ho Tram' AS name_en, '78519' AS postal_code, 'ho_tram' AS slug
UNION ALL
       SELECT '79' AS province_code, '26632' AS code, 'Xã Xuyên Mộc' AS name, 'Xuyên Mộc' AS short_name, 'Xuyen Moc' AS name_en, '78518' AS postal_code, 'xuyen_moc' AS slug
UNION ALL
       SELECT '79' AS province_code, '26638' AS code, 'Xã Bàu Lâm' AS name, 'Bàu Lâm' AS short_name, 'Bau Lam' AS name_en, '78514' AS postal_code, 'bau_lam' AS slug
UNION ALL
       SELECT '79' AS province_code, '26641' AS code, 'Xã Hoà Hội' AS name, 'Hoà Hội' AS short_name, 'Hoa Hoi' AS name_en, '78511' AS postal_code, 'hoa_hoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '26647' AS code, 'Xã Hoà Hiệp' AS name, 'Hoà Hiệp' AS short_name, 'Hoa Hiep' AS name_en, '78512' AS postal_code, 'hoa_hiep' AS slug
UNION ALL
       SELECT '79' AS province_code, '26656' AS code, 'Xã Bình Châu' AS name, 'Bình Châu' AS short_name, 'Binh Chau' AS name_en, '78510' AS postal_code, 'binh_chau' AS slug
UNION ALL
       SELECT '79' AS province_code, '26659' AS code, 'Xã Long Điền' AS name, 'Long Điền' AS short_name, 'Long Dien' AS name_en, '78406' AS postal_code, 'long_dien' AS slug
UNION ALL
       SELECT '79' AS province_code, '26662' AS code, 'Xã Long Hải' AS name, 'Long Hải' AS short_name, 'Long Hai' AS name_en, '78412' AS postal_code, 'long_hai' AS slug
UNION ALL
       SELECT '79' AS province_code, '26680' AS code, 'Xã Đất Đỏ' AS name, 'Đất Đỏ' AS short_name, 'Dat Do' AS name_en, '78306' AS postal_code, 'dat_do' AS slug
UNION ALL
       SELECT '79' AS province_code, '26686' AS code, 'Xã Phước Hải' AS name, 'Phước Hải' AS short_name, 'Phuoc Hai' AS name_en, '78313' AS postal_code, 'phuoc_hai' AS slug
UNION ALL
       SELECT '79' AS province_code, '26704' AS code, 'Phường Phú Mỹ' AS name, 'Phú Mỹ' AS short_name, 'Phu My' AS name_en, '78706' AS postal_code, 'phu_my' AS slug
UNION ALL
       SELECT '79' AS province_code, '26710' AS code, 'Phường Tân Hải' AS name, 'Tân Hải' AS short_name, 'Tan Hai' AS name_en, '78714' AS postal_code, 'tan_hai' AS slug
UNION ALL
       SELECT '79' AS province_code, '26713' AS code, 'Phường Tân Phước' AS name, 'Tân Phước' AS short_name, 'Tan Phuoc' AS name_en, '78711' AS postal_code, 'tan_phuoc' AS slug
UNION ALL
       SELECT '79' AS province_code, '26725' AS code, 'Phường Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '78716' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26728' AS code, 'Xã Châu Pha' AS name, 'Châu Pha' AS short_name, 'Chau Pha' AS name_en, '78712' AS postal_code, 'chau_pha' AS slug
UNION ALL
       SELECT '79' AS province_code, '26732' AS code, 'Đặc khu Côn Đảo' AS name, 'Côn Đảo' AS short_name, 'Con Dao' AS name_en, '78807' AS postal_code, 'con_dao' AS slug
UNION ALL
       SELECT '79' AS province_code, '26737' AS code, 'Phường Tân Định' AS name, 'Tân Định' AS short_name, 'Tan Dinh' AS name_en, '71008' AS postal_code, 'tan_dinh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26740' AS code, 'Phường Sài Gòn' AS name, 'Sài Gòn' AS short_name, 'Sai Gon' AS name_en, '71016' AS postal_code, 'sai_gon' AS slug
UNION ALL
       SELECT '79' AS province_code, '26743' AS code, 'Phường Bến Thành' AS name, 'Bến Thành' AS short_name, 'Ben Thanh' AS name_en, '71009' AS postal_code, 'ben_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26758' AS code, 'Phường Cầu Ông Lãnh' AS name, 'Cầu Ông Lãnh' AS short_name, 'Cau Ong Lanh' AS name_en, '71011' AS postal_code, 'cau_ong_lanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26767' AS code, 'Phường An Phú Đông' AS name, 'An Phú Đông' AS short_name, 'An Phu Dong' AS name_en, '71516' AS postal_code, 'an_phu_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '26773' AS code, 'Phường Thới An' AS name, 'Thới An' AS short_name, 'Thoi An' AS name_en, '71513' AS postal_code, 'thoi_an' AS slug
UNION ALL
       SELECT '79' AS province_code, '26782' AS code, 'Phường Tân Thới Hiệp' AS name, 'Tân Thới Hiệp' AS short_name, 'Tan Thoi Hiep' AS name_en, '71511' AS postal_code, 'tan_thoi_hiep' AS slug
UNION ALL
       SELECT '79' AS province_code, '26785' AS code, 'Phường Trung Mỹ Tây' AS name, 'Trung Mỹ Tây' AS short_name, 'Trung My Tay' AS name_en, '71507' AS postal_code, 'trung_my_tay' AS slug
UNION ALL
       SELECT '79' AS province_code, '26791' AS code, 'Phường Đông Hưng Thuận' AS name, 'Đông Hưng Thuận' AS short_name, 'Dong Hung Thuan' AS name_en, '71508' AS postal_code, 'dong_hung_thuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '26800' AS code, 'Phường Linh Xuân' AS name, 'Linh Xuân' AS short_name, 'Linh Xuan' AS name_en, '71309' AS postal_code, 'linh_xuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '26803' AS code, 'Phường Tam Bình' AS name, 'Tam Bình' AS short_name, 'Tam Binh' AS name_en, '71312' AS postal_code, 'tam_binh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26809' AS code, 'Phường Hiệp Bình' AS name, 'Hiệp Bình' AS short_name, 'Hiep Binh' AS name_en, '71318' AS postal_code, 'hiep_binh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26824' AS code, 'Phường Thủ Đức' AS name, 'Thủ Đức' AS short_name, 'Thu Duc' AS name_en, '71319' AS postal_code, 'thu_duc' AS slug
UNION ALL
       SELECT '79' AS province_code, '26833' AS code, 'Phường Long Bình' AS name, 'Long Bình' AS short_name, 'Long Binh' AS name_en, '71217' AS postal_code, 'long_binh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26842' AS code, 'Phường Tăng Nhơn Phú' AS name, 'Tăng Nhơn Phú' AS short_name, 'Tang Nhon Phu' AS name_en, '71320' AS postal_code, 'tang_nhon_phu' AS slug
UNION ALL
       SELECT '79' AS province_code, '26848' AS code, 'Phường Phước Long' AS name, 'Phước Long' AS short_name, 'Phuoc Long' AS name_en, '71321' AS postal_code, 'phuoc_long' AS slug
UNION ALL
       SELECT '79' AS province_code, '26857' AS code, 'Phường Long Phước' AS name, 'Long Phước' AS short_name, 'Long Phuoc' AS name_en, '71214' AS postal_code, 'long_phuoc' AS slug
UNION ALL
       SELECT '79' AS province_code, '26860' AS code, 'Phường Long Trường' AS name, 'Long Trường' AS short_name, 'Long Truong' AS name_en, '71213' AS postal_code, 'long_truong' AS slug
UNION ALL
       SELECT '79' AS province_code, '26876' AS code, 'Phường An Nhơn' AS name, 'An Nhơn' AS short_name, 'An Nhon' AS name_en, '71424' AS postal_code, 'an_nhon' AS slug
UNION ALL
       SELECT '79' AS province_code, '26878' AS code, 'Phường An Hội Đông' AS name, 'An Hội Đông' AS short_name, 'An Hoi Dong' AS name_en, '71425' AS postal_code, 'an_hoi_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '26882' AS code, 'Phường An Hội Tây' AS name, 'An Hội Tây' AS short_name, 'An Hoi Tay' AS name_en, '71427' AS postal_code, 'an_hoi_tay' AS slug
UNION ALL
       SELECT '79' AS province_code, '26884' AS code, 'Phường Gò Vấp' AS name, 'Gò Vấp' AS short_name, 'Go Vap' AS name_en, '71422' AS postal_code, 'go_vap' AS slug
UNION ALL
       SELECT '79' AS province_code, '26890' AS code, 'Phường Hạnh Thông' AS name, 'Hạnh Thông' AS short_name, 'Hanh Thong' AS name_en, '71423' AS postal_code, 'hanh_thong' AS slug
UNION ALL
       SELECT '79' AS province_code, '26898' AS code, 'Phường Thông Tây Hội' AS name, 'Thông Tây Hội' AS short_name, 'Thong Tay Hoi' AS name_en, '71426' AS postal_code, 'thong_tay_hoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '26905' AS code, 'Phường Bình Lợi Trung' AS name, 'Bình Lợi Trung' AS short_name, 'Binh Loi Trung' AS name_en, '72329' AS postal_code, 'binh_loi_trung' AS slug
UNION ALL
       SELECT '79' AS province_code, '26911' AS code, 'Phường Bình Quới' AS name, 'Bình Quới' AS short_name, 'Binh Quoi' AS name_en, '72328' AS postal_code, 'binh_quoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '26929' AS code, 'Phường Bình Thạnh' AS name, 'Bình Thạnh' AS short_name, 'Binh Thanh' AS name_en, '72326' AS postal_code, 'binh_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26944' AS code, 'Phường Gia Định' AS name, 'Gia Định' AS short_name, 'Gia Dinh' AS name_en, '72330' AS postal_code, 'gia_dinh' AS slug
UNION ALL
       SELECT '79' AS province_code, '26956' AS code, 'Phường Thạnh Mỹ Tây' AS name, 'Thạnh Mỹ Tây' AS short_name, 'Thanh My Tay' AS name_en, '72331' AS postal_code, 'thanh_my_tay' AS slug
UNION ALL
       SELECT '79' AS province_code, '26968' AS code, 'Phường Tân Sơn Nhất' AS name, 'Tân Sơn Nhất' AS short_name, 'Tan Son Nhat' AS name_en, '72121' AS postal_code, 'tan_son_nhat' AS slug
UNION ALL
       SELECT '79' AS province_code, '26977' AS code, 'Phường Tân Sơn Hoà' AS name, 'Tân Sơn Hoà' AS short_name, 'Tan Son Hoa' AS name_en, '72122' AS postal_code, 'tan_son_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '26983' AS code, 'Phường Bảy Hiền' AS name, 'Bảy Hiền' AS short_name, 'Bay Hien' AS name_en, '72124' AS postal_code, 'bay_hien' AS slug
UNION ALL
       SELECT '79' AS province_code, '26995' AS code, 'Phường Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '72125' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '27004' AS code, 'Phường Tân Bình' AS name, 'Tân Bình' AS short_name, 'Tan Binh' AS name_en, '72123' AS postal_code, 'tan_binh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27007' AS code, 'Phường Tân Sơn' AS name, 'Tân Sơn' AS short_name, 'Tan Son' AS name_en, '72126' AS postal_code, 'tan_son' AS slug
UNION ALL
       SELECT '79' AS province_code, '27013' AS code, 'Phường Tây Thạnh' AS name, 'Tây Thạnh' AS short_name, 'Tay Thanh' AS name_en, '72009' AS postal_code, 'tay_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27019' AS code, 'Phường Tân Sơn Nhì' AS name, 'Tân Sơn Nhì' AS short_name, 'Tan Son Nhi' AS name_en, '72008' AS postal_code, 'tan_son_nhi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27022' AS code, 'Phường Phú Thọ Hoà' AS name, 'Phú Thọ Hoà' AS short_name, 'Phu Tho Hoa' AS name_en, '72012' AS postal_code, 'phu_tho_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '27028' AS code, 'Phường Phú Thạnh' AS name, 'Phú Thạnh' AS short_name, 'Phu Thanh' AS name_en, '72013' AS postal_code, 'phu_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27031' AS code, 'Phường Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '72017' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '79' AS province_code, '27043' AS code, 'Phường Đức Nhuận' AS name, 'Đức Nhuận' AS short_name, 'Duc Nhuan' AS name_en, '72223' AS postal_code, 'duc_nhuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27058' AS code, 'Phường Cầu Kiệu' AS name, 'Cầu Kiệu' AS short_name, 'Cau Kieu' AS name_en, '72222' AS postal_code, 'cau_kieu' AS slug
UNION ALL
       SELECT '79' AS province_code, '27073' AS code, 'Phường Phú Nhuận' AS name, 'Phú Nhuận' AS short_name, 'Phu Nhuan' AS name_en, '72221' AS postal_code, 'phu_nhuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27094' AS code, 'Phường An Khánh' AS name, 'An Khánh' AS short_name, 'An Khanh' AS name_en, '71108' AS postal_code, 'an_khanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27097' AS code, 'Phường Bình Trưng' AS name, 'Bình Trưng' AS short_name, 'Binh Trung' AS name_en, '71322' AS postal_code, 'binh_trung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27112' AS code, 'Phường Cát Lái' AS name, 'Cát Lái' AS short_name, 'Cat Lai' AS name_en, '71115' AS postal_code, 'cat_lai' AS slug
UNION ALL
       SELECT '79' AS province_code, '27139' AS code, 'Phường Xuân Hoà' AS name, 'Xuân Hoà' AS short_name, 'Xuan Hoa' AS name_en, '72421' AS postal_code, 'xuan_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '27142' AS code, 'Phường Nhiêu Lộc' AS name, 'Nhiêu Lộc' AS short_name, 'Nhieu Loc' AS name_en, '72422' AS postal_code, 'nhieu_loc' AS slug
UNION ALL
       SELECT '79' AS province_code, '27154' AS code, 'Phường Bàn Cờ' AS name, 'Bàn Cờ' AS short_name, 'Ban Co' AS name_en, '72420' AS postal_code, 'ban_co' AS slug
UNION ALL
       SELECT '79' AS province_code, '27163' AS code, 'Phường Hoà Hưng' AS name, 'Hoà Hưng' AS short_name, 'Hoa Hung' AS name_en, '72523' AS postal_code, 'hoa_hung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27169' AS code, 'Phường Diên Hồng' AS name, 'Diên Hồng' AS short_name, 'Dien Hong' AS name_en, '72521' AS postal_code, 'dien_hong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27190' AS code, 'Phường Vườn Lài' AS name, 'Vườn Lài' AS short_name, 'Vuon Lai' AS name_en, '72522' AS postal_code, 'vuon_lai' AS slug
UNION ALL
       SELECT '79' AS province_code, '27211' AS code, 'Phường Hoà Bình' AS name, 'Hoà Bình' AS short_name, 'Hoa Binh' AS name_en, '72623' AS postal_code, 'hoa_binh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27226' AS code, 'Phường Phú Thọ' AS name, 'Phú Thọ' AS short_name, 'Phu Tho' AS name_en, '72625' AS postal_code, 'phu_tho' AS slug
UNION ALL
       SELECT '79' AS province_code, '27232' AS code, 'Phường Bình Thới' AS name, 'Bình Thới' AS short_name, 'Binh Thoi' AS name_en, '72622' AS postal_code, 'binh_thoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27238' AS code, 'Phường Minh Phụng' AS name, 'Minh Phụng' AS short_name, 'Minh Phung' AS name_en, '72624' AS postal_code, 'minh_phung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27259' AS code, 'Phường Xóm Chiếu' AS name, 'Xóm Chiếu' AS short_name, 'Xom Chieu' AS name_en, '72823' AS postal_code, 'xom_chieu' AS slug
UNION ALL
       SELECT '79' AS province_code, '27265' AS code, 'Phường Khánh Hội' AS name, 'Khánh Hội' AS short_name, 'Khanh Hoi' AS name_en, '72822' AS postal_code, 'khanh_hoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27286' AS code, 'Phường Vĩnh Hội' AS name, 'Vĩnh Hội' AS short_name, 'Vinh Hoi' AS name_en, '72821' AS postal_code, 'vinh_hoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27301' AS code, 'Phường Chợ Quán' AS name, 'Chợ Quán' AS short_name, 'Cho Quan' AS name_en, '72722' AS postal_code, 'cho_quan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27316' AS code, 'Phường An Đông' AS name, 'An Đông' AS short_name, 'An Dong' AS name_en, '72721' AS postal_code, 'an_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27343' AS code, 'Phường Chợ Lớn' AS name, 'Chợ Lớn' AS short_name, 'Cho Lon' AS name_en, '72723' AS postal_code, 'cho_lon' AS slug
UNION ALL
       SELECT '79' AS province_code, '27349' AS code, 'Phường Phú Lâm' AS name, 'Phú Lâm' AS short_name, 'Phu Lam' AS name_en, '73123' AS postal_code, 'phu_lam' AS slug
UNION ALL
       SELECT '79' AS province_code, '27364' AS code, 'Phường Bình Phú' AS name, 'Bình Phú' AS short_name, 'Binh Phu' AS name_en, '73122' AS postal_code, 'binh_phu' AS slug
UNION ALL
       SELECT '79' AS province_code, '27367' AS code, 'Phường Bình Tây' AS name, 'Bình Tây' AS short_name, 'Binh Tay' AS name_en, '73121' AS postal_code, 'binh_tay' AS slug
UNION ALL
       SELECT '79' AS province_code, '27373' AS code, 'Phường Bình Tiên' AS name, 'Bình Tiên' AS short_name, 'Binh Tien' AS name_en, '73120' AS postal_code, 'binh_tien' AS slug
UNION ALL
       SELECT '79' AS province_code, '27418' AS code, 'Phường Chánh Hưng' AS name, 'Chánh Hưng' AS short_name, 'Chanh Hung' AS name_en, '73023' AS postal_code, 'chanh_hung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27424' AS code, 'Phường Bình Đông' AS name, 'Bình Đông' AS short_name, 'Binh Dong' AS name_en, '73024' AS postal_code, 'binh_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27427' AS code, 'Phường Phú Định' AS name, 'Phú Định' AS short_name, 'Phu Dinh' AS name_en, '73022' AS postal_code, 'phu_dinh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27439' AS code, 'Phường Bình Hưng Hoà' AS name, 'Bình Hưng Hoà' AS short_name, 'Binh Hung Hoa' AS name_en, '71913' AS postal_code, 'binh_hung_hoa' AS slug
UNION ALL
       SELECT '79' AS province_code, '27442' AS code, 'Phường Bình Tân' AS name, 'Bình Tân' AS short_name, 'Binh Tan' AS name_en, '71916' AS postal_code, 'binh_tan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27448' AS code, 'Phường Bình Trị Đông' AS name, 'Bình Trị Đông' AS short_name, 'Binh Tri Dong' AS name_en, '71910' AS postal_code, 'binh_tri_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27457' AS code, 'Phường Tân Tạo' AS name, 'Tân Tạo' AS short_name, 'Tan Tao' AS name_en, '71915' AS postal_code, 'tan_tao' AS slug
UNION ALL
       SELECT '79' AS province_code, '27460' AS code, 'Phường An Lạc' AS name, 'An Lạc' AS short_name, 'An Lac' AS name_en, '71906' AS postal_code, 'an_lac' AS slug
UNION ALL
       SELECT '79' AS province_code, '27475' AS code, 'Phường Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '72912' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27478' AS code, 'Phường Tân Thuận' AS name, 'Tân Thuận' AS short_name, 'Tan Thuan' AS name_en, '72917' AS postal_code, 'tan_thuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27484' AS code, 'Phường Phú Thuận' AS name, 'Phú Thuận' AS short_name, 'Phu Thuan' AS name_en, '72907' AS postal_code, 'phu_thuan' AS slug
UNION ALL
       SELECT '79' AS province_code, '27487' AS code, 'Phường Tân Mỹ' AS name, 'Tân Mỹ' AS short_name, 'Tan My' AS name_en, '72916' AS postal_code, 'tan_my' AS slug
UNION ALL
       SELECT '79' AS province_code, '27496' AS code, 'Xã Tân An Hội' AS name, 'Tân An Hội' AS short_name, 'Tan An Hoi' AS name_en, '71607' AS postal_code, 'tan_an_hoi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27508' AS code, 'Xã An Nhơn Tây' AS name, 'An Nhơn Tây' AS short_name, 'An Nhon Tay' AS name_en, '71619' AS postal_code, 'an_nhon_tay' AS slug
UNION ALL
       SELECT '79' AS province_code, '27511' AS code, 'Xã Nhuận Đức' AS name, 'Nhuận Đức' AS short_name, 'Nhuan Duc' AS name_en, '71618' AS postal_code, 'nhuan_duc' AS slug
UNION ALL
       SELECT '79' AS province_code, '27526' AS code, 'Xã Thái Mỹ' AS name, 'Thái Mỹ' AS short_name, 'Thai My' AS name_en, '71625' AS postal_code, 'thai_my' AS slug
UNION ALL
       SELECT '79' AS province_code, '27541' AS code, 'Xã Phú Hoà Đông' AS name, 'Phú Hoà Đông' AS short_name, 'Phu Hoa Dong' AS name_en, '71616' AS postal_code, 'phu_hoa_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27544' AS code, 'Xã Bình Mỹ' AS name, 'Bình Mỹ' AS short_name, 'Binh My' AS name_en, '71611' AS postal_code, 'binh_my' AS slug
UNION ALL
       SELECT '79' AS province_code, '27553' AS code, 'Xã Củ Chi' AS name, 'Củ Chi' AS short_name, 'Cu Chi' AS name_en, '71627' AS postal_code, 'cu_chi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27559' AS code, 'Xã Hóc Môn' AS name, 'Hóc Môn' AS short_name, 'Hoc Mon' AS name_en, '71706' AS postal_code, 'hoc_mon' AS slug
UNION ALL
       SELECT '79' AS province_code, '27568' AS code, 'Xã Đông Thạnh' AS name, 'Đông Thạnh' AS short_name, 'Dong Thanh' AS name_en, '71708' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27577' AS code, 'Xã Xuân Thới Sơn' AS name, 'Xuân Thới Sơn' AS short_name, 'Xuan Thoi Son' AS name_en, '71712' AS postal_code, 'xuan_thoi_son' AS slug
UNION ALL
       SELECT '79' AS province_code, '27592' AS code, 'Xã Bà Điểm' AS name, 'Bà Điểm' AS short_name, 'Ba Diem' AS name_en, '71714' AS postal_code, 'ba_diem' AS slug
UNION ALL
       SELECT '79' AS province_code, '27595' AS code, 'Xã Tân Nhựt' AS name, 'Tân Nhựt' AS short_name, 'Tan Nhut' AS name_en, '71816' AS postal_code, 'tan_nhut' AS slug
UNION ALL
       SELECT '79' AS province_code, '27601' AS code, 'Xã Vĩnh Lộc' AS name, 'Vĩnh Lộc' AS short_name, 'Vinh Loc' AS name_en, '71823' AS postal_code, 'vinh_loc' AS slug
UNION ALL
       SELECT '79' AS province_code, '27604' AS code, 'Xã Tân Vĩnh Lộc' AS name, 'Tân Vĩnh Lộc' AS short_name, 'Tan Vinh Loc' AS name_en, '71822' AS postal_code, 'tan_vinh_loc' AS slug
UNION ALL
       SELECT '79' AS province_code, '27610' AS code, 'Xã Bình Lợi' AS name, 'Bình Lợi' AS short_name, 'Binh Loi' AS name_en, '71818' AS postal_code, 'binh_loi' AS slug
UNION ALL
       SELECT '79' AS province_code, '27619' AS code, 'Xã Bình Hưng' AS name, 'Bình Hưng' AS short_name, 'Binh Hung' AS name_en, '71813' AS postal_code, 'binh_hung' AS slug
UNION ALL
       SELECT '79' AS province_code, '27628' AS code, 'Xã Hưng Long' AS name, 'Hưng Long' AS short_name, 'Hung Long' AS name_en, '71809' AS postal_code, 'hung_long' AS slug
UNION ALL
       SELECT '79' AS province_code, '27637' AS code, 'Xã Bình Chánh' AS name, 'Bình Chánh' AS short_name, 'Binh Chanh' AS name_en, '71814' AS postal_code, 'binh_chanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27655' AS code, 'Xã Nhà Bè' AS name, 'Nhà Bè' AS short_name, 'Nha Be' AS name_en, '73206' AS postal_code, 'nha_be' AS slug
UNION ALL
       SELECT '79' AS province_code, '27658' AS code, 'Xã Hiệp Phước' AS name, 'Hiệp Phước' AS short_name, 'Hiep Phuoc' AS name_en, '73212' AS postal_code, 'hiep_phuoc' AS slug
UNION ALL
       SELECT '79' AS province_code, '27664' AS code, 'Xã Cần Giờ' AS name, 'Cần Giờ' AS short_name, 'Can Gio' AS name_en, '72018' AS postal_code, 'can_gio' AS slug
UNION ALL
       SELECT '79' AS province_code, '27667' AS code, 'Xã Bình Khánh' AS name, 'Bình Khánh' AS short_name, 'Binh Khanh' AS name_en, '73310' AS postal_code, 'binh_khanh' AS slug
UNION ALL
       SELECT '79' AS province_code, '27673' AS code, 'Xã An Thới Đông' AS name, 'An Thới Đông' AS short_name, 'An Thoi Dong' AS name_en, '73311' AS postal_code, 'an_thoi_dong' AS slug
UNION ALL
       SELECT '79' AS province_code, '27676' AS code, 'Xã Thạnh An' AS name, 'Thạnh An' AS short_name, 'Thanh An' AS name_en, '73308' AS postal_code, 'thanh_an' AS slug
UNION ALL
       SELECT '80' AS province_code, '25459' AS code, 'Phường Tân Ninh' AS name, 'Tân Ninh' AS short_name, 'Tan Ninh' AS name_en, '80116' AS postal_code, 'tan_ninh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25480' AS code, 'Phường Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '80115' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25486' AS code, 'Xã Tân Biên' AS name, 'Tân Biên' AS short_name, 'Tan Bien' AS name_en, '80406' AS postal_code, 'tan_bien' AS slug
UNION ALL
       SELECT '80' AS province_code, '25489' AS code, 'Xã Tân Lập' AS name, 'Tân Lập' AS short_name, 'Tan Lap' AS name_en, '80409' AS postal_code, 'tan_lap' AS slug
UNION ALL
       SELECT '80' AS province_code, '25498' AS code, 'Xã Thạnh Bình' AS name, 'Thạnh Bình' AS short_name, 'Thanh Binh' AS name_en, '80407' AS postal_code, 'thanh_binh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25510' AS code, 'Xã Trà Vong' AS name, 'Trà Vong' AS short_name, 'Tra Vong' AS name_en, '80415' AS postal_code, 'tra_vong' AS slug
UNION ALL
       SELECT '80' AS province_code, '25516' AS code, 'Xã Tân Châu' AS name, 'Tân Châu' AS short_name, 'Tan Chau' AS name_en, '80306' AS postal_code, 'tan_chau' AS slug
UNION ALL
       SELECT '80' AS province_code, '25522' AS code, 'Xã Tân Đông' AS name, 'Tân Đông' AS short_name, 'Tan Dong' AS name_en, '80311' AS postal_code, 'tan_dong' AS slug
UNION ALL
       SELECT '80' AS province_code, '25525' AS code, 'Xã Tân Hội' AS name, 'Tân Hội' AS short_name, 'Tan Hoi' AS name_en, '80313' AS postal_code, 'tan_hoi' AS slug
UNION ALL
       SELECT '80' AS province_code, '25531' AS code, 'Xã Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '80309' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '25534' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '80308' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25549' AS code, 'Xã Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '80316' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '80' AS province_code, '25552' AS code, 'Xã Dương Minh Châu' AS name, 'Dương Minh Châu' AS short_name, 'Duong Minh Chau' AS name_en, '80206' AS postal_code, 'duong_minh_chau' AS slug
UNION ALL
       SELECT '80' AS province_code, '25567' AS code, 'Phường Ninh Thạnh' AS name, 'Ninh Thạnh' AS short_name, 'Ninh Thanh' AS name_en, '80111' AS postal_code, 'ninh_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25573' AS code, 'Xã Cầu Khởi' AS name, 'Cầu Khởi' AS short_name, 'Cau Khoi' AS name_en, '80210' AS postal_code, 'cau_khoi' AS slug
UNION ALL
       SELECT '80' AS province_code, '25579' AS code, 'Xã Lộc Ninh' AS name, 'Lộc Ninh' AS short_name, 'Loc Ninh' AS name_en, '80212' AS postal_code, 'loc_ninh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25585' AS code, 'Xã Châu Thành' AS name, 'Châu Thành' AS short_name, 'Chau Thanh' AS name_en, '80506' AS postal_code, 'chau_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25588' AS code, 'Xã Hảo Đước' AS name, 'Hảo Đước' AS short_name, 'Hao Duoc' AS name_en, '80509' AS postal_code, 'hao_duoc' AS slug
UNION ALL
       SELECT '80' AS province_code, '25591' AS code, 'Xã Phước Vinh' AS name, 'Phước Vinh' AS short_name, 'Phuoc Vinh' AS name_en, '80511' AS postal_code, 'phuoc_vinh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25606' AS code, 'Xã Hoà Hội' AS name, 'Hoà Hội' AS short_name, 'Hoa Hoi' AS name_en, '80514' AS postal_code, 'hoa_hoi' AS slug
UNION ALL
       SELECT '80' AS province_code, '25621' AS code, 'Xã Ninh Điền' AS name, 'Ninh Điền' AS short_name, 'Ninh Dien' AS name_en, '80517' AS postal_code, 'ninh_dien' AS slug
UNION ALL
       SELECT '80' AS province_code, '25630' AS code, 'Phường Long Hoa' AS name, 'Long Hoa' AS short_name, 'Long Hoa' AS name_en, '80606' AS postal_code, 'long_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '25633' AS code, 'Phường Thanh Điền' AS name, 'Thanh Điền' AS short_name, 'Thanh Dien' AS name_en, '80615' AS postal_code, 'thanh_dien' AS slug
UNION ALL
       SELECT '80' AS province_code, '25645' AS code, 'Phường Hoà Thành' AS name, 'Hoà Thành' AS short_name, 'Hoa Thanh' AS name_en, '80614' AS postal_code, 'hoa_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25654' AS code, 'Phường Gò Dầu' AS name, 'Gò Dầu' AS short_name, 'Go Dau' AS name_en, '80706' AS postal_code, 'go_dau' AS slug
UNION ALL
       SELECT '80' AS province_code, '25657' AS code, 'Xã Thạnh Đức' AS name, 'Thạnh Đức' AS short_name, 'Thanh Duc' AS name_en, '80712' AS postal_code, 'thanh_duc' AS slug
UNION ALL
       SELECT '80' AS province_code, '25663' AS code, 'Xã Phước Thạnh' AS name, 'Phước Thạnh' AS short_name, 'Phuoc Thanh' AS name_en, '80708' AS postal_code, 'phuoc_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '25666' AS code, 'Xã Truông Mít' AS name, 'Truông Mít' AS short_name, 'Truong Mit' AS name_en, '80211' AS postal_code, 'truong_mit' AS slug
UNION ALL
       SELECT '80' AS province_code, '25672' AS code, 'Phường Gia Lộc' AS name, 'Gia Lộc' AS short_name, 'Gia Loc' AS name_en, '80907' AS postal_code, 'gia_loc' AS slug
UNION ALL
       SELECT '80' AS province_code, '25681' AS code, 'Xã Bến Cầu' AS name, 'Bến Cầu' AS short_name, 'Ben Cau' AS name_en, '80806' AS postal_code, 'ben_cau' AS slug
UNION ALL
       SELECT '80' AS province_code, '25684' AS code, 'Xã Long Chữ' AS name, 'Long Chữ' AS short_name, 'Long Chu' AS name_en, '80808' AS postal_code, 'long_chu' AS slug
UNION ALL
       SELECT '80' AS province_code, '25702' AS code, 'Xã Long Thuận' AS name, 'Long Thuận' AS short_name, 'Long Thuan' AS name_en, '80812' AS postal_code, 'long_thuan' AS slug
UNION ALL
       SELECT '80' AS province_code, '25708' AS code, 'Phường Trảng Bàng' AS name, 'Trảng Bàng' AS short_name, 'Trang Bang' AS name_en, '80906' AS postal_code, 'trang_bang' AS slug
UNION ALL
       SELECT '80' AS province_code, '25711' AS code, 'Xã Hưng Thuận' AS name, 'Hưng Thuận' AS short_name, 'Hung Thuan' AS name_en, '80909' AS postal_code, 'hung_thuan' AS slug
UNION ALL
       SELECT '80' AS province_code, '25729' AS code, 'Xã Phước Chỉ' AS name, 'Phước Chỉ' AS short_name, 'Phuoc Chi' AS name_en, '80914' AS postal_code, 'phuoc_chi' AS slug
UNION ALL
       SELECT '80' AS province_code, '25732' AS code, 'Phường An Tịnh' AS name, 'An Tịnh' AS short_name, 'An Tinh' AS name_en, '80916' AS postal_code, 'an_tinh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27694' AS code, 'Phường Long An' AS name, 'Long An' AS short_name, 'Long An' AS name_en, '82120' AS postal_code, 'long_an' AS slug
UNION ALL
       SELECT '80' AS province_code, '27712' AS code, 'Phường Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '82121' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '80' AS province_code, '27715' AS code, 'Phường Khánh Hậu' AS name, 'Khánh Hậu' AS short_name, 'Khanh Hau' AS name_en, '82113' AS postal_code, 'khanh_hau' AS slug
UNION ALL
       SELECT '80' AS province_code, '27721' AS code, 'Xã Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '83306' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '80' AS province_code, '27727' AS code, 'Xã Hưng Điền' AS name, 'Hưng Điền' AS short_name, 'Hung Dien' AS name_en, '83311' AS postal_code, 'hung_dien' AS slug
UNION ALL
       SELECT '80' AS province_code, '27736' AS code, 'Xã Vĩnh Thạnh' AS name, 'Vĩnh Thạnh' AS short_name, 'Vinh Thanh' AS name_en, '83318' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27748' AS code, 'Xã Vĩnh Châu' AS name, 'Vĩnh Châu' AS short_name, 'Vinh Chau' AS name_en, '83319' AS postal_code, 'vinh_chau' AS slug
UNION ALL
       SELECT '80' AS province_code, '27757' AS code, 'Xã Vĩnh Hưng' AS name, 'Vĩnh Hưng' AS short_name, 'Vinh Hung' AS name_en, '83206' AS postal_code, 'vinh_hung' AS slug
UNION ALL
       SELECT '80' AS province_code, '27763' AS code, 'Xã Khánh Hưng' AS name, 'Khánh Hưng' AS short_name, 'Khanh Hung' AS name_en, '83210' AS postal_code, 'khanh_hung' AS slug
UNION ALL
       SELECT '80' AS province_code, '27775' AS code, 'Xã Tuyên Bình' AS name, 'Tuyên Bình' AS short_name, 'Tuyen Binh' AS name_en, '83215' AS postal_code, 'tuyen_binh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27787' AS code, 'Phường Kiến Tường' AS name, 'Kiến Tường' AS short_name, 'Kien Tuong' AS name_en, '83014' AS postal_code, 'kien_tuong' AS slug
UNION ALL
       SELECT '80' AS province_code, '27793' AS code, 'Xã Bình Hiệp' AS name, 'Bình Hiệp' AS short_name, 'Binh Hiep' AS name_en, '83009' AS postal_code, 'binh_hiep' AS slug
UNION ALL
       SELECT '80' AS province_code, '27811' AS code, 'Xã Bình Hoà' AS name, 'Bình Hoà' AS short_name, 'Binh Hoa' AS name_en, '83113' AS postal_code, 'binh_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '27817' AS code, 'Xã Tuyên Thạnh' AS name, 'Tuyên Thạnh' AS short_name, 'Tuyen Thanh' AS name_en, '83012' AS postal_code, 'tuyen_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27823' AS code, 'Xã Mộc Hoá' AS name, 'Mộc Hoá' AS short_name, 'Moc Hoa' AS name_en, '83114' AS postal_code, 'moc_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '27826' AS code, 'Xã Tân Thạnh' AS name, 'Tân Thạnh' AS short_name, 'Tan Thanh' AS name_en, '83406' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27838' AS code, 'Xã Nhơn Hoà Lập' AS name, 'Nhơn Hoà Lập' AS short_name, 'Nhon Hoa Lap' AS name_en, '83410' AS postal_code, 'nhon_hoa_lap' AS slug
UNION ALL
       SELECT '80' AS province_code, '27841' AS code, 'Xã Hậu Thạnh' AS name, 'Hậu Thạnh' AS short_name, 'Hau Thanh' AS name_en, '83419' AS postal_code, 'hau_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27856' AS code, 'Xã Nhơn Ninh' AS name, 'Nhơn Ninh' AS short_name, 'Nhon Ninh' AS name_en, '83416' AS postal_code, 'nhon_ninh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27865' AS code, 'Xã Thạnh Hoá' AS name, 'Thạnh Hoá' AS short_name, 'Thanh Hoa' AS name_en, '82906' AS postal_code, 'thanh_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '27868' AS code, 'Xã Bình Thành' AS name, 'Bình Thành' AS short_name, 'Binh Thanh' AS name_en, '82917' AS postal_code, 'binh_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27877' AS code, 'Xã Thạnh Phước' AS name, 'Thạnh Phước' AS short_name, 'Thanh Phuoc' AS name_en, '82911' AS postal_code, 'thanh_phuoc' AS slug
UNION ALL
       SELECT '80' AS province_code, '27889' AS code, 'Xã Tân Tây' AS name, 'Tân Tây' AS short_name, 'Tan Tay' AS name_en, '82915' AS postal_code, 'tan_tay' AS slug
UNION ALL
       SELECT '80' AS province_code, '27898' AS code, 'Xã Đông Thành' AS name, 'Đông Thành' AS short_name, 'Dong Thanh' AS name_en, '82806' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27907' AS code, 'Xã Mỹ Quý' AS name, 'Mỹ Quý' AS short_name, 'My Quy' AS name_en, '82817' AS postal_code, 'my_quy' AS slug
UNION ALL
       SELECT '80' AS province_code, '27925' AS code, 'Xã Đức Huệ' AS name, 'Đức Huệ' AS short_name, 'Duc Hue' AS name_en, '82818' AS postal_code, 'duc_hue' AS slug
UNION ALL
       SELECT '80' AS province_code, '27931' AS code, 'Xã Hậu Nghĩa' AS name, 'Hậu Nghĩa' AS short_name, 'Hau Nghia' AS name_en, '82706' AS postal_code, 'hau_nghia' AS slug
UNION ALL
       SELECT '80' AS province_code, '27937' AS code, 'Xã Đức Hoà' AS name, 'Đức Hoà' AS short_name, 'Duc Hoa' AS name_en, '82722' AS postal_code, 'duc_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '27943' AS code, 'Xã An Ninh' AS name, 'An Ninh' AS short_name, 'An Ninh' AS name_en, '82726' AS postal_code, 'an_ninh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27952' AS code, 'Xã Hiệp Hoà' AS name, 'Hiệp Hoà' AS short_name, 'Hiep Hoa' AS name_en, '82713' AS postal_code, 'hiep_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '27964' AS code, 'Xã Đức Lập' AS name, 'Đức Lập' AS short_name, 'Duc Lap' AS name_en, '82728' AS postal_code, 'duc_lap' AS slug
UNION ALL
       SELECT '80' AS province_code, '27976' AS code, 'Xã Mỹ Hạnh' AS name, 'Mỹ Hạnh' AS short_name, 'My Hanh' AS name_en, '82729' AS postal_code, 'my_hanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27979' AS code, 'Xã Hoà Khánh' AS name, 'Hoà Khánh' AS short_name, 'Hoa Khanh' AS name_en, '82727' AS postal_code, 'hoa_khanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '27991' AS code, 'Xã Bến Lức' AS name, 'Bến Lức' AS short_name, 'Ben Luc' AS name_en, '82606' AS postal_code, 'ben_luc' AS slug
UNION ALL
       SELECT '80' AS province_code, '27994' AS code, 'Xã Thạnh Lợi' AS name, 'Thạnh Lợi' AS short_name, 'Thanh Loi' AS name_en, '82612' AS postal_code, 'thanh_loi' AS slug
UNION ALL
       SELECT '80' AS province_code, '28003' AS code, 'Xã Lương Hoà' AS name, 'Lương Hoà' AS short_name, 'Luong Hoa' AS name_en, '82614' AS postal_code, 'luong_hoa' AS slug
UNION ALL
       SELECT '80' AS province_code, '28015' AS code, 'Xã Bình Đức' AS name, 'Bình Đức' AS short_name, 'Binh Duc' AS name_en, '82615' AS postal_code, 'binh_duc' AS slug
UNION ALL
       SELECT '80' AS province_code, '28018' AS code, 'Xã Mỹ Yên' AS name, 'Mỹ Yên' AS short_name, 'My Yen' AS name_en, '82607' AS postal_code, 'my_yen' AS slug
UNION ALL
       SELECT '80' AS province_code, '28036' AS code, 'Xã Thủ Thừa' AS name, 'Thủ Thừa' AS short_name, 'Thu Thua' AS name_en, '83506' AS postal_code, 'thu_thua' AS slug
UNION ALL
       SELECT '80' AS province_code, '28051' AS code, 'Xã Mỹ Thạnh' AS name, 'Mỹ Thạnh' AS short_name, 'My Thanh' AS name_en, '83513' AS postal_code, 'my_thanh' AS slug
UNION ALL
       SELECT '80' AS province_code, '28066' AS code, 'Xã Mỹ An' AS name, 'Mỹ An' AS short_name, 'My An' AS name_en, '83514' AS postal_code, 'my_an' AS slug
UNION ALL
       SELECT '80' AS province_code, '28072' AS code, 'Xã Tân Long' AS name, 'Tân Long' AS short_name, 'Tan Long' AS name_en, '83508' AS postal_code, 'tan_long' AS slug
UNION ALL
       SELECT '80' AS province_code, '28075' AS code, 'Xã Tân Trụ' AS name, 'Tân Trụ' AS short_name, 'Tan Tru' AS name_en, '82306' AS postal_code, 'tan_tru' AS slug
UNION ALL
       SELECT '80' AS province_code, '28087' AS code, 'Xã Nhựt Tảo' AS name, 'Nhựt Tảo' AS short_name, 'Nhut Tao' AS name_en, '82318' AS postal_code, 'nhut_tao' AS slug
UNION ALL
       SELECT '80' AS province_code, '28093' AS code, 'Xã Vàm Cỏ' AS name, 'Vàm Cỏ' AS short_name, 'Vam Co' AS name_en, '82317' AS postal_code, 'vam_co' AS slug
UNION ALL
       SELECT '80' AS province_code, '28108' AS code, 'Xã Cần Đước' AS name, 'Cần Đước' AS short_name, 'Can Duoc' AS name_en, '82406' AS postal_code, 'can_duoc' AS slug
UNION ALL
       SELECT '80' AS province_code, '28114' AS code, 'Xã Rạch Kiến' AS name, 'Rạch Kiến' AS short_name, 'Rach Kien' AS name_en, '82423' AS postal_code, 'rach_kien' AS slug
UNION ALL
       SELECT '80' AS province_code, '28126' AS code, 'Xã Long Cang' AS name, 'Long Cang' AS short_name, 'Long Cang' AS name_en, '82420' AS postal_code, 'long_cang' AS slug
UNION ALL
       SELECT '80' AS province_code, '28132' AS code, 'Xã Mỹ Lệ' AS name, 'Mỹ Lệ' AS short_name, 'My Le' AS name_en, '82408' AS postal_code, 'my_le' AS slug
UNION ALL
       SELECT '80' AS province_code, '28138' AS code, 'Xã Tân Lân' AS name, 'Tân Lân' AS short_name, 'Tan Lan' AS name_en, '82407' AS postal_code, 'tan_lan' AS slug
UNION ALL
       SELECT '80' AS province_code, '28144' AS code, 'Xã Long Hựu' AS name, 'Long Hựu' AS short_name, 'Long Huu' AS name_en, '82424' AS postal_code, 'long_huu' AS slug
UNION ALL
       SELECT '80' AS province_code, '28159' AS code, 'Xã Cần Giuộc' AS name, 'Cần Giuộc' AS short_name, 'Can Giuoc' AS name_en, '82506' AS postal_code, 'can_giuoc' AS slug
UNION ALL
       SELECT '80' AS province_code, '28165' AS code, 'Xã Phước Lý' AS name, 'Phước Lý' AS short_name, 'Phuoc Ly' AS name_en, '82511' AS postal_code, 'phuoc_ly' AS slug
UNION ALL
       SELECT '80' AS province_code, '28177' AS code, 'Xã Mỹ Lộc' AS name, 'Mỹ Lộc' AS short_name, 'My Loc' AS name_en, '82509' AS postal_code, 'my_loc' AS slug
UNION ALL
       SELECT '80' AS province_code, '28201' AS code, 'Xã Phước Vĩnh Tây' AS name, 'Phước Vĩnh Tây' AS short_name, 'Phuoc Vinh Tay' AS name_en, '82518' AS postal_code, 'phuoc_vinh_tay' AS slug
UNION ALL
       SELECT '80' AS province_code, '28207' AS code, 'Xã Tân Tập' AS name, 'Tân Tập' AS short_name, 'Tan Tap' AS name_en, '82522' AS postal_code, 'tan_tap' AS slug
UNION ALL
       SELECT '80' AS province_code, '28210' AS code, 'Xã Tầm Vu' AS name, 'Tầm Vu' AS short_name, 'Tam Vu' AS name_en, '82206' AS postal_code, 'tam_vu' AS slug
UNION ALL
       SELECT '80' AS province_code, '28222' AS code, 'Xã Vĩnh Công' AS name, 'Vĩnh Công' AS short_name, 'Vinh Cong' AS name_en, '82214' AS postal_code, 'vinh_cong' AS slug
UNION ALL
       SELECT '80' AS province_code, '28225' AS code, 'Xã Thuận Mỹ' AS name, 'Thuận Mỹ' AS short_name, 'Thuan My' AS name_en, '82210' AS postal_code, 'thuan_my' AS slug
UNION ALL
       SELECT '80' AS province_code, '28243' AS code, 'Xã An Lục Long' AS name, 'An Lục Long' AS short_name, 'An Luc Long' AS name_en, '82218' AS postal_code, 'an_luc_long' AS slug
UNION ALL
       SELECT '82' AS province_code, '28249' AS code, 'Phường Đạo Thạnh' AS name, 'Đạo Thạnh' AS short_name, 'Dao Thanh' AS name_en, '84113' AS postal_code, 'dao_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28261' AS code, 'Phường Mỹ Tho' AS name, 'Mỹ Tho' AS short_name, 'My Tho' AS name_en, '84123' AS postal_code, 'my_tho' AS slug
UNION ALL
       SELECT '82' AS province_code, '28270' AS code, 'Phường Thới Sơn' AS name, 'Thới Sơn' AS short_name, 'Thoi Son' AS name_en, '84122' AS postal_code, 'thoi_son' AS slug
UNION ALL
       SELECT '82' AS province_code, '28273' AS code, 'Phường Mỹ Phong' AS name, 'Mỹ Phong' AS short_name, 'My Phong' AS name_en, '84112' AS postal_code, 'my_phong' AS slug
UNION ALL
       SELECT '82' AS province_code, '28285' AS code, 'Phường Trung An' AS name, 'Trung An' AS short_name, 'Trung An' AS name_en, '84118' AS postal_code, 'trung_an' AS slug
UNION ALL
       SELECT '82' AS province_code, '28297' AS code, 'Phường Long Thuận' AS name, 'Long Thuận' AS short_name, 'Long Thuan' AS name_en, '84308' AS postal_code, 'long_thuan' AS slug
UNION ALL
       SELECT '82' AS province_code, '28306' AS code, 'Phường Gò Công' AS name, 'Gò Công' AS short_name, 'Go Cong' AS name_en, '84318' AS postal_code, 'go_cong' AS slug
UNION ALL
       SELECT '82' AS province_code, '28315' AS code, 'Phường Bình Xuân' AS name, 'Bình Xuân' AS short_name, 'Binh Xuan' AS name_en, '84312' AS postal_code, 'binh_xuan' AS slug
UNION ALL
       SELECT '82' AS province_code, '28321' AS code, 'Xã Tân Phước 1' AS name, 'Tân Phước 1' AS short_name, 'Tan Phuoc 1' AS name_en, '84719' AS postal_code, 'tan_phuoc_1' AS slug
UNION ALL
       SELECT '82' AS province_code, '28327' AS code, 'Xã Tân Phước 2' AS name, 'Tân Phước 2' AS short_name, 'Tan Phuoc 2' AS name_en, '84720' AS postal_code, 'tan_phuoc_2' AS slug
UNION ALL
       SELECT '82' AS province_code, '28336' AS code, 'Xã Hưng Thạnh' AS name, 'Hưng Thạnh' AS short_name, 'Hung Thanh' AS name_en, '84712' AS postal_code, 'hung_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28345' AS code, 'Xã Tân Phước 3' AS name, 'Tân Phước 3' AS short_name, 'Tan Phuoc 3' AS name_en, '84721' AS postal_code, 'tan_phuoc_3' AS slug
UNION ALL
       SELECT '82' AS province_code, '28360' AS code, 'Xã Cái Bè' AS name, 'Cái Bè' AS short_name, 'Cai Be' AS name_en, '84906' AS postal_code, 'cai_be' AS slug
UNION ALL
       SELECT '82' AS province_code, '28366' AS code, 'Xã Hậu Mỹ' AS name, 'Hậu Mỹ' AS short_name, 'Hau My' AS name_en, '84934' AS postal_code, 'hau_my' AS slug
UNION ALL
       SELECT '82' AS province_code, '28378' AS code, 'Xã Mỹ Thiện' AS name, 'Mỹ Thiện' AS short_name, 'My Thien' AS name_en, '84933' AS postal_code, 'my_thien' AS slug
UNION ALL
       SELECT '82' AS province_code, '28393' AS code, 'Xã Hội Cư' AS name, 'Hội Cư' AS short_name, 'Hoi Cu' AS name_en, '84935' AS postal_code, 'hoi_cu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28405' AS code, 'Xã Mỹ Đức Tây' AS name, 'Mỹ Đức Tây' AS short_name, 'My Duc Tay' AS name_en, '84921' AS postal_code, 'my_duc_tay' AS slug
UNION ALL
       SELECT '82' AS province_code, '28414' AS code, 'Xã Mỹ Lợi' AS name, 'Mỹ Lợi' AS short_name, 'My Loi' AS name_en, '84932' AS postal_code, 'my_loi' AS slug
UNION ALL
       SELECT '82' AS province_code, '28426' AS code, 'Xã Thanh Hưng' AS name, 'Thanh Hưng' AS short_name, 'Thanh Hung' AS name_en, '84931' AS postal_code, 'thanh_hung' AS slug
UNION ALL
       SELECT '82' AS province_code, '28429' AS code, 'Xã An Hữu' AS name, 'An Hữu' AS short_name, 'An Huu' AS name_en, '84927' AS postal_code, 'an_huu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28435' AS code, 'Phường Mỹ Phước Tây' AS name, 'Mỹ Phước Tây' AS short_name, 'My Phuoc Tay' AS name_en, '84864' AS postal_code, 'my_phuoc_tay' AS slug
UNION ALL
       SELECT '82' AS province_code, '28436' AS code, 'Phường Thanh Hoà' AS name, 'Thanh Hoà' AS short_name, 'Thanh Hoa' AS name_en, '84867' AS postal_code, 'thanh_hoa' AS slug
UNION ALL
       SELECT '82' AS province_code, '28439' AS code, 'Phường Cai Lậy' AS name, 'Cai Lậy' AS short_name, 'Cai Lay' AS name_en, '84872' AS postal_code, 'cai_lay' AS slug
UNION ALL
       SELECT '82' AS province_code, '28444' AS code, 'Xã Thạnh Phú' AS name, 'Thạnh Phú' AS short_name, 'Thanh Phu' AS name_en, '84823' AS postal_code, 'thanh_phu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28456' AS code, 'Xã Mỹ Thành' AS name, 'Mỹ Thành' AS short_name, 'My Thanh' AS name_en, '84822' AS postal_code, 'my_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28468' AS code, 'Xã Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '84861' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28471' AS code, 'Xã Bình Phú' AS name, 'Bình Phú' AS short_name, 'Binh Phu' AS name_en, '84806' AS postal_code, 'binh_phu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28477' AS code, 'Phường Nhị Quý' AS name, 'Nhị Quý' AS short_name, 'Nhi Quy' AS name_en, '84871' AS postal_code, 'nhi_quy' AS slug
UNION ALL
       SELECT '82' AS province_code, '28501' AS code, 'Xã Hiệp Đức' AS name, 'Hiệp Đức' AS short_name, 'Hiep Duc' AS name_en, '84816' AS postal_code, 'hiep_duc' AS slug
UNION ALL
       SELECT '82' AS province_code, '28504' AS code, 'Xã Long Tiên' AS name, 'Long Tiên' AS short_name, 'Long Tien' AS name_en, '84815' AS postal_code, 'long_tien' AS slug
UNION ALL
       SELECT '82' AS province_code, '28516' AS code, 'Xã Ngũ Hiệp' AS name, 'Ngũ Hiệp' AS short_name, 'Ngu Hiep' AS name_en, '84821' AS postal_code, 'ngu_hiep' AS slug
UNION ALL
       SELECT '82' AS province_code, '28519' AS code, 'Xã Châu Thành' AS name, 'Châu Thành' AS short_name, 'Chau Thanh' AS name_en, '84629' AS postal_code, 'chau_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28525' AS code, 'Xã Tân Hương' AS name, 'Tân Hương' AS short_name, 'Tan Huong' AS name_en, '84608' AS postal_code, 'tan_huong' AS slug
UNION ALL
       SELECT '82' AS province_code, '28537' AS code, 'Xã Long Hưng' AS name, 'Long Hưng' AS short_name, 'Long Hung' AS name_en, '84621' AS postal_code, 'long_hung' AS slug
UNION ALL
       SELECT '82' AS province_code, '28543' AS code, 'Xã Long Định' AS name, 'Long Định' AS short_name, 'Long Dinh' AS name_en, '84614' AS postal_code, 'long_dinh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28564' AS code, 'Xã Bình Trưng' AS name, 'Bình Trưng' AS short_name, 'Binh Trung' AS name_en, '84619' AS postal_code, 'binh_trung' AS slug
UNION ALL
       SELECT '82' AS province_code, '28576' AS code, 'Xã Vĩnh Kim' AS name, 'Vĩnh Kim' AS short_name, 'Vinh Kim' AS name_en, '84625' AS postal_code, 'vinh_kim' AS slug
UNION ALL
       SELECT '82' AS province_code, '28582' AS code, 'Xã Kim Sơn' AS name, 'Kim Sơn' AS short_name, 'Kim Son' AS name_en, '84627' AS postal_code, 'kim_son' AS slug
UNION ALL
       SELECT '82' AS province_code, '28594' AS code, 'Xã Chợ Gạo' AS name, 'Chợ Gạo' AS short_name, 'Cho Gao' AS name_en, '84506' AS postal_code, 'cho_gao' AS slug
UNION ALL
       SELECT '82' AS province_code, '28603' AS code, 'Xã Mỹ Tịnh An' AS name, 'Mỹ Tịnh An' AS short_name, 'My Tinh An' AS name_en, '84520' AS postal_code, 'my_tinh_an' AS slug
UNION ALL
       SELECT '82' AS province_code, '28615' AS code, 'Xã Lương Hoà Lạc' AS name, 'Lương Hoà Lạc' AS short_name, 'Luong Hoa Lac' AS name_en, '84523' AS postal_code, 'luong_hoa_lac' AS slug
UNION ALL
       SELECT '82' AS province_code, '28627' AS code, 'Xã Tân Thuận Bình' AS name, 'Tân Thuận Bình' AS short_name, 'Tan Thuan Binh' AS name_en, '84510' AS postal_code, 'tan_thuan_binh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28633' AS code, 'Xã An Thạnh Thuỷ' AS name, 'An Thạnh Thuỷ' AS short_name, 'An Thanh Thuy' AS name_en, '84514' AS postal_code, 'an_thanh_thuy' AS slug
UNION ALL
       SELECT '82' AS province_code, '28648' AS code, 'Xã Bình Ninh' AS name, 'Bình Ninh' AS short_name, 'Binh Ninh' AS name_en, '84515' AS postal_code, 'binh_ninh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28651' AS code, 'Xã Vĩnh Bình' AS name, 'Vĩnh Bình' AS short_name, 'Vinh Binh' AS name_en, '84406' AS postal_code, 'vinh_binh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28660' AS code, 'Xã Đồng Sơn' AS name, 'Đồng Sơn' AS short_name, 'Dong Son' AS name_en, '84411' AS postal_code, 'dong_son' AS slug
UNION ALL
       SELECT '82' AS province_code, '28663' AS code, 'Xã Phú Thành' AS name, 'Phú Thành' AS short_name, 'Phu Thanh' AS name_en, '84419' AS postal_code, 'phu_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28678' AS code, 'Xã Vĩnh Hựu' AS name, 'Vĩnh Hựu' AS short_name, 'Vinh Huu' AS name_en, '84415' AS postal_code, 'vinh_huu' AS slug
UNION ALL
       SELECT '82' AS province_code, '28687' AS code, 'Xã Long Bình' AS name, 'Long Bình' AS short_name, 'Long Binh' AS name_en, '84417' AS postal_code, 'long_binh' AS slug
UNION ALL
       SELECT '82' AS province_code, '28693' AS code, 'Xã Tân Thới' AS name, 'Tân Thới' AS short_name, 'Tan Thoi' AS name_en, '84210' AS postal_code, 'tan_thoi' AS slug
UNION ALL
       SELECT '82' AS province_code, '28696' AS code, 'Xã Tân Phú Đông' AS name, 'Tân Phú Đông' AS short_name, 'Tan Phu Dong' AS name_en, '84212' AS postal_code, 'tan_phu_dong' AS slug
UNION ALL
       SELECT '82' AS province_code, '28702' AS code, 'Xã Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '84356' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '82' AS province_code, '28720' AS code, 'Xã Gia Thuận' AS name, 'Gia Thuận' AS short_name, 'Gia Thuan' AS name_en, '84362' AS postal_code, 'gia_thuan' AS slug
UNION ALL
       SELECT '82' AS province_code, '28723' AS code, 'Xã Tân Đông' AS name, 'Tân Đông' AS short_name, 'Tan Dong' AS name_en, '84365' AS postal_code, 'tan_dong' AS slug
UNION ALL
       SELECT '82' AS province_code, '28729' AS code, 'Phường Sơn Qui' AS name, 'Sơn Qui' AS short_name, 'Son Qui' AS name_en, '84319' AS postal_code, 'son_qui' AS slug
UNION ALL
       SELECT '82' AS province_code, '28738' AS code, 'Xã Tân Điền' AS name, 'Tân Điền' AS short_name, 'Tan Dien' AS name_en, '84359' AS postal_code, 'tan_dien' AS slug
UNION ALL
       SELECT '82' AS province_code, '28747' AS code, 'Xã Gò Công Đông' AS name, 'Gò Công Đông' AS short_name, 'Go Cong Dong' AS name_en, '84369' AS postal_code, 'go_cong_dong' AS slug
UNION ALL
       SELECT '82' AS province_code, '29869' AS code, 'Phường Cao Lãnh' AS name, 'Cao Lãnh' AS short_name, 'Cao Lanh' AS name_en, '81121' AS postal_code, 'cao_lanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '29884' AS code, 'Phường Mỹ Ngãi' AS name, 'Mỹ Ngãi' AS short_name, 'My Ngai' AS name_en, '81110' AS postal_code, 'my_ngai' AS slug
UNION ALL
       SELECT '82' AS province_code, '29888' AS code, 'Phường Mỹ Trà' AS name, 'Mỹ Trà' AS short_name, 'My Tra' AS name_en, '81108' AS postal_code, 'my_tra' AS slug
UNION ALL
       SELECT '82' AS province_code, '29905' AS code, 'Phường Sa Đéc' AS name, 'Sa Đéc' AS short_name, 'Sa Dec' AS name_en, '81815' AS postal_code, 'sa_dec' AS slug
UNION ALL
       SELECT '82' AS province_code, '29926' AS code, 'Xã Tân Hồng' AS name, 'Tân Hồng' AS short_name, 'Tan Hong' AS name_en, '81415' AS postal_code, 'tan_hong' AS slug
UNION ALL
       SELECT '82' AS province_code, '29929' AS code, 'Xã Tân Hộ Cơ' AS name, 'Tân Hộ Cơ' AS short_name, 'Tan Ho Co' AS name_en, '81410' AS postal_code, 'tan_ho_co' AS slug
UNION ALL
       SELECT '82' AS province_code, '29938' AS code, 'Xã Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '81416' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '29944' AS code, 'Xã An Phước' AS name, 'An Phước' AS short_name, 'An Phuoc' AS name_en, '81413' AS postal_code, 'an_phuoc' AS slug
UNION ALL
       SELECT '82' AS province_code, '29954' AS code, 'Phường An Bình' AS name, 'An Bình' AS short_name, 'An Binh' AS name_en, '81513' AS postal_code, 'an_binh' AS slug
UNION ALL
       SELECT '82' AS province_code, '29955' AS code, 'Phường Hồng Ngự' AS name, 'Hồng Ngự' AS short_name, 'Hong Ngu' AS name_en, '81514' AS postal_code, 'hong_ngu' AS slug
UNION ALL
       SELECT '82' AS province_code, '29971' AS code, 'Xã Thường Phước' AS name, 'Thường Phước' AS short_name, 'Thuong Phuoc' AS name_en, '81567' AS postal_code, 'thuong_phuoc' AS slug
UNION ALL
       SELECT '82' AS province_code, '29978' AS code, 'Phường Thường Lạc' AS name, 'Thường Lạc' AS short_name, 'Thuong Lac' AS name_en, '81561' AS postal_code, 'thuong_lac' AS slug
UNION ALL
       SELECT '82' AS province_code, '29983' AS code, 'Xã Long Khánh' AS name, 'Long Khánh' AS short_name, 'Long Khanh' AS name_en, '81568' AS postal_code, 'long_khanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '29992' AS code, 'Xã Long Phú Thuận' AS name, 'Long Phú Thuận' AS short_name, 'Long Phu Thuan' AS name_en, '81569' AS postal_code, 'long_phu_thuan' AS slug
UNION ALL
       SELECT '82' AS province_code, '30001' AS code, 'Xã Tràm Chim' AS name, 'Tràm Chim' AS short_name, 'Tram Chim' AS name_en, '81306' AS postal_code, 'tram_chim' AS slug
UNION ALL
       SELECT '82' AS province_code, '30010' AS code, 'Xã Tam Nông' AS name, 'Tam Nông' AS short_name, 'Tam Nong' AS name_en, '81318' AS postal_code, 'tam_nong' AS slug
UNION ALL
       SELECT '82' AS province_code, '30019' AS code, 'Xã An Hoà' AS name, 'An Hoà' AS short_name, 'An Hoa' AS name_en, '81312' AS postal_code, 'an_hoa' AS slug
UNION ALL
       SELECT '82' AS province_code, '30025' AS code, 'Xã Phú Cường' AS name, 'Phú Cường' AS short_name, 'Phu Cuong' AS name_en, '81307' AS postal_code, 'phu_cuong' AS slug
UNION ALL
       SELECT '82' AS province_code, '30028' AS code, 'Xã An Long' AS name, 'An Long' AS short_name, 'An Long' AS name_en, '81313' AS postal_code, 'an_long' AS slug
UNION ALL
       SELECT '82' AS province_code, '30034' AS code, 'Xã Phú Thọ' AS name, 'Phú Thọ' AS short_name, 'Phu Tho' AS name_en, '81316' AS postal_code, 'phu_tho' AS slug
UNION ALL
       SELECT '82' AS province_code, '30037' AS code, 'Xã Tháp Mười' AS name, 'Tháp Mười' AS short_name, 'Thap Muoi' AS name_en, '81219' AS postal_code, 'thap_muoi' AS slug
UNION ALL
       SELECT '82' AS province_code, '30043' AS code, 'Xã Phương Thịnh' AS name, 'Phương Thịnh' AS short_name, 'Phuong Thinh' AS name_en, '81161' AS postal_code, 'phuong_thinh' AS slug
UNION ALL
       SELECT '82' AS province_code, '30046' AS code, 'Xã Trường Xuân' AS name, 'Trường Xuân' AS short_name, 'Truong Xuan' AS name_en, '81209' AS postal_code, 'truong_xuan' AS slug
UNION ALL
       SELECT '82' AS province_code, '30055' AS code, 'Xã Mỹ Quí' AS name, 'Mỹ Quí' AS short_name, 'My Qui' AS name_en, '81212' AS postal_code, 'my_qui' AS slug
UNION ALL
       SELECT '82' AS province_code, '30061' AS code, 'Xã Đốc Binh Kiều' AS name, 'Đốc Binh Kiều' AS short_name, 'Doc Binh Kieu' AS name_en, '81217' AS postal_code, 'doc_binh_kieu' AS slug
UNION ALL
       SELECT '82' AS province_code, '30073' AS code, 'Xã Thanh Mỹ' AS name, 'Thanh Mỹ' AS short_name, 'Thanh My' AS name_en, '81215' AS postal_code, 'thanh_my' AS slug
UNION ALL
       SELECT '82' AS province_code, '30076' AS code, 'Xã Mỹ Thọ' AS name, 'Mỹ Thọ' AS short_name, 'My Tho' AS name_en, '81157' AS postal_code, 'my_tho' AS slug
UNION ALL
       SELECT '82' AS province_code, '30085' AS code, 'Xã Ba Sao' AS name, 'Ba Sao' AS short_name, 'Ba Sao' AS name_en, '81160' AS postal_code, 'ba_sao' AS slug
UNION ALL
       SELECT '82' AS province_code, '30088' AS code, 'Xã Phong Mỹ' AS name, 'Phong Mỹ' AS short_name, 'Phong My' AS name_en, '81163' AS postal_code, 'phong_my' AS slug
UNION ALL
       SELECT '82' AS province_code, '30112' AS code, 'Xã Mỹ Hiệp' AS name, 'Mỹ Hiệp' AS short_name, 'My Hiep' AS name_en, '81172' AS postal_code, 'my_hiep' AS slug
UNION ALL
       SELECT '82' AS province_code, '30118' AS code, 'Xã Bình Hàng Trung' AS name, 'Bình Hàng Trung' AS short_name, 'Binh Hang Trung' AS name_en, '81169' AS postal_code, 'binh_hang_trung' AS slug
UNION ALL
       SELECT '82' AS province_code, '30130' AS code, 'Xã Thanh Bình' AS name, 'Thanh Bình' AS short_name, 'Thanh Binh' AS name_en, '81606' AS postal_code, 'thanh_binh' AS slug
UNION ALL
       SELECT '82' AS province_code, '30154' AS code, 'Xã Tân Long' AS name, 'Tân Long' AS short_name, 'Tan Long' AS name_en, '81616' AS postal_code, 'tan_long' AS slug
UNION ALL
       SELECT '82' AS province_code, '30157' AS code, 'Xã Tân Thạnh' AS name, 'Tân Thạnh' AS short_name, 'Tan Thanh' AS name_en, '81617' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '30163' AS code, 'Xã Bình Thành' AS name, 'Bình Thành' AS short_name, 'Binh Thanh' AS name_en, '81607' AS postal_code, 'binh_thanh' AS slug
UNION ALL
       SELECT '82' AS province_code, '30169' AS code, 'Xã Lấp Vò' AS name, 'Lấp Vò' AS short_name, 'Lap Vo' AS name_en, '81706' AS postal_code, 'lap_vo' AS slug
UNION ALL
       SELECT '82' AS province_code, '30178' AS code, 'Xã Mỹ An Hưng' AS name, 'Mỹ An Hưng' AS short_name, 'My An Hung' AS name_en, '81719' AS postal_code, 'my_an_hung' AS slug
UNION ALL
       SELECT '82' AS province_code, '30184' AS code, 'Xã Tân Khánh Trung' AS name, 'Tân Khánh Trung' AS short_name, 'Tan Khanh Trung' AS name_en, '81718' AS postal_code, 'tan_khanh_trung' AS slug
UNION ALL
       SELECT '82' AS province_code, '30208' AS code, 'Xã Hoà Long' AS name, 'Hoà Long' AS short_name, 'Hoa Long' AS name_en, '81763' AS postal_code, 'hoa_long' AS slug
UNION ALL
       SELECT '82' AS province_code, '30214' AS code, 'Xã Tân Dương' AS name, 'Tân Dương' AS short_name, 'Tan Duong' AS name_en, '81758' AS postal_code, 'tan_duong' AS slug
UNION ALL
       SELECT '82' AS province_code, '30226' AS code, 'Xã Lai Vung' AS name, 'Lai Vung' AS short_name, 'Lai Vung' AS name_en, '81768' AS postal_code, 'lai_vung' AS slug
UNION ALL
       SELECT '82' AS province_code, '30235' AS code, 'Xã Phong Hoà' AS name, 'Phong Hoà' AS short_name, 'Phong Hoa' AS name_en, '81767' AS postal_code, 'phong_hoa' AS slug
UNION ALL
       SELECT '82' AS province_code, '30244' AS code, 'Xã Phú Hựu' AS name, 'Phú Hựu' AS short_name, 'Phu Huu' AS name_en, '81914' AS postal_code, 'phu_huu' AS slug
UNION ALL
       SELECT '82' AS province_code, '30253' AS code, 'Xã Tân Nhuận Đông' AS name, 'Tân Nhuận Đông' AS short_name, 'Tan Nhuan Dong' AS name_en, '81909' AS postal_code, 'tan_nhuan_dong' AS slug
UNION ALL
       SELECT '82' AS province_code, '30259' AS code, 'Xã Tân Phú Trung' AS name, 'Tân Phú Trung' AS short_name, 'Tan Phu Trung' AS name_en, '81911' AS postal_code, 'tan_phu_trung' AS slug
UNION ALL
       SELECT '86' AS province_code, '28756' AS code, 'Phường Phú Khương' AS name, 'Phú Khương' AS short_name, 'Phu Khuong' AS name_en, '86111' AS postal_code, 'phu_khuong' AS slug
UNION ALL
       SELECT '86' AS province_code, '28777' AS code, 'Phường An Hội' AS name, 'An Hội' AS short_name, 'An Hoi' AS name_en, '86106' AS postal_code, 'an_hoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '28783' AS code, 'Phường Sơn Đông' AS name, 'Sơn Đông' AS short_name, 'Son Dong' AS name_en, '86113' AS postal_code, 'son_dong' AS slug
UNION ALL
       SELECT '86' AS province_code, '28789' AS code, 'Phường Bến Tre' AS name, 'Bến Tre' AS short_name, 'Ben Tre' AS name_en, '86123' AS postal_code, 'ben_tre' AS slug
UNION ALL
       SELECT '86' AS province_code, '28807' AS code, 'Xã Giao Long' AS name, 'Giao Long' AS short_name, 'Giao Long' AS name_en, '86213' AS postal_code, 'giao_long' AS slug
UNION ALL
       SELECT '86' AS province_code, '28810' AS code, 'Xã Phú Túc' AS name, 'Phú Túc' AS short_name, 'Phu Tuc' AS name_en, '86222' AS postal_code, 'phu_tuc' AS slug
UNION ALL
       SELECT '86' AS province_code, '28840' AS code, 'Xã Tân Phú' AS name, 'Tân Phú' AS short_name, 'Tan Phu' AS name_en, '86227' AS postal_code, 'tan_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '28858' AS code, 'Phường Phú Tân' AS name, 'Phú Tân' AS short_name, 'Phu Tan' AS name_en, '86112' AS postal_code, 'phu_tan' AS slug
UNION ALL
       SELECT '86' AS province_code, '28861' AS code, 'Xã Tiên Thuỷ' AS name, 'Tiên Thuỷ' AS short_name, 'Tien Thuy' AS name_en, '86225' AS postal_code, 'tien_thuy' AS slug
UNION ALL
       SELECT '86' AS province_code, '28870' AS code, 'Xã Chợ Lách' AS name, 'Chợ Lách' AS short_name, 'Cho Lach' AS name_en, '86306' AS postal_code, 'cho_lach' AS slug
UNION ALL
       SELECT '86' AS province_code, '28879' AS code, 'Xã Phú Phụng' AS name, 'Phú Phụng' AS short_name, 'Phu Phung' AS name_en, '86314' AS postal_code, 'phu_phung' AS slug
UNION ALL
       SELECT '86' AS province_code, '28894' AS code, 'Xã Vĩnh Thành' AS name, 'Vĩnh Thành' AS short_name, 'Vinh Thanh' AS name_en, '86311' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '28901' AS code, 'Xã Hưng Khánh Trung' AS name, 'Hưng Khánh Trung' AS short_name, 'Hung Khanh Trung' AS name_en, '86317' AS postal_code, 'hung_khanh_trung' AS slug
UNION ALL
       SELECT '86' AS province_code, '28903' AS code, 'Xã Mỏ Cày' AS name, 'Mỏ Cày' AS short_name, 'Mo Cay' AS name_en, '86506' AS postal_code, 'mo_cay' AS slug
UNION ALL
       SELECT '86' AS province_code, '28915' AS code, 'Xã Phước Mỹ Trung' AS name, 'Phước Mỹ Trung' AS short_name, 'Phuoc My Trung' AS name_en, '86406' AS postal_code, 'phuoc_my_trung' AS slug
UNION ALL
       SELECT '86' AS province_code, '28921' AS code, 'Xã Tân Thành Bình' AS name, 'Tân Thành Bình' AS short_name, 'Tan Thanh Binh' AS name_en, '86409' AS postal_code, 'tan_thanh_binh' AS slug
UNION ALL
       SELECT '86' AS province_code, '28945' AS code, 'Xã Đồng Khởi' AS name, 'Đồng Khởi' AS short_name, 'Dong Khoi' AS name_en, '86523' AS postal_code, 'dong_khoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '28948' AS code, 'Xã Nhuận Phú Tân' AS name, 'Nhuận Phú Tân' AS short_name, 'Nhuan Phu Tan' AS name_en, '86415' AS postal_code, 'nhuan_phu_tan' AS slug
UNION ALL
       SELECT '86' AS province_code, '28957' AS code, 'Xã An Định' AS name, 'An Định' AS short_name, 'An Dinh' AS name_en, '86514' AS postal_code, 'an_dinh' AS slug
UNION ALL
       SELECT '86' AS province_code, '28969' AS code, 'Xã Thành Thới' AS name, 'Thành Thới' AS short_name, 'Thanh Thoi' AS name_en, '86524' AS postal_code, 'thanh_thoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '28981' AS code, 'Xã Hương Mỹ' AS name, 'Hương Mỹ' AS short_name, 'Huong My' AS name_en, '86522' AS postal_code, 'huong_my' AS slug
UNION ALL
       SELECT '86' AS province_code, '28984' AS code, 'Xã Giồng Trôm' AS name, 'Giồng Trôm' AS short_name, 'Giong Trom' AS name_en, '86606' AS postal_code, 'giong_trom' AS slug
UNION ALL
       SELECT '86' AS province_code, '28987' AS code, 'Xã Lương Hoà' AS name, 'Lương Hoà' AS short_name, 'Luong Hoa' AS name_en, '86613' AS postal_code, 'luong_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '28993' AS code, 'Xã Lương Phú' AS name, 'Lương Phú' AS short_name, 'Luong Phu' AS name_en, '86615' AS postal_code, 'luong_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '28996' AS code, 'Xã Châu Hoà' AS name, 'Châu Hoà' AS short_name, 'Chau Hoa' AS name_en, '86609' AS postal_code, 'chau_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29020' AS code, 'Xã Phước Long' AS name, 'Phước Long' AS short_name, 'Phuoc Long' AS name_en, '86619' AS postal_code, 'phuoc_long' AS slug
UNION ALL
       SELECT '86' AS province_code, '29029' AS code, 'Xã Tân Hào' AS name, 'Tân Hào' AS short_name, 'Tan Hao' AS name_en, '86623' AS postal_code, 'tan_hao' AS slug
UNION ALL
       SELECT '86' AS province_code, '29044' AS code, 'Xã Hưng Nhượng' AS name, 'Hưng Nhượng' AS short_name, 'Hung Nhuong' AS name_en, '86626' AS postal_code, 'hung_nhuong' AS slug
UNION ALL
       SELECT '86' AS province_code, '29050' AS code, 'Xã Bình Đại' AS name, 'Bình Đại' AS short_name, 'Binh Dai' AS name_en, '86706' AS postal_code, 'binh_dai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29062' AS code, 'Xã Phú Thuận' AS name, 'Phú Thuận' AS short_name, 'Phu Thuan' AS name_en, '86718' AS postal_code, 'phu_thuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29077' AS code, 'Xã Lộc Thuận' AS name, 'Lộc Thuận' AS short_name, 'Loc Thuan' AS name_en, '86713' AS postal_code, 'loc_thuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29083' AS code, 'Xã Châu Hưng' AS name, 'Châu Hưng' AS short_name, 'Chau Hung' AS name_en, '86719' AS postal_code, 'chau_hung' AS slug
UNION ALL
       SELECT '86' AS province_code, '29089' AS code, 'Xã Thạnh Trị' AS name, 'Thạnh Trị' AS short_name, 'Thanh Tri' AS name_en, '86710' AS postal_code, 'thanh_tri' AS slug
UNION ALL
       SELECT '86' AS province_code, '29104' AS code, 'Xã Thạnh Phước' AS name, 'Thạnh Phước' AS short_name, 'Thanh Phuoc' AS name_en, '86723' AS postal_code, 'thanh_phuoc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29107' AS code, 'Xã Thới Thuận' AS name, 'Thới Thuận' AS short_name, 'Thoi Thuan' AS name_en, '86725' AS postal_code, 'thoi_thuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29110' AS code, 'Xã Ba Tri' AS name, 'Ba Tri' AS short_name, 'Ba Tri' AS name_en, '86806' AS postal_code, 'ba_tri' AS slug
UNION ALL
       SELECT '86' AS province_code, '29122' AS code, 'Xã Mỹ Chánh Hoà' AS name, 'Mỹ Chánh Hoà' AS short_name, 'My Chanh Hoa' AS name_en, '86830' AS postal_code, 'my_chanh_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29125' AS code, 'Xã Bảo Thạnh' AS name, 'Bảo Thạnh' AS short_name, 'Bao Thanh' AS name_en, '86809' AS postal_code, 'bao_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29137' AS code, 'Xã Tân Xuân' AS name, 'Tân Xuân' AS short_name, 'Tan Xuan' AS name_en, '86811' AS postal_code, 'tan_xuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29143' AS code, 'Xã An Ngãi Trung' AS name, 'An Ngãi Trung' AS short_name, 'An Ngai Trung' AS name_en, '86819' AS postal_code, 'an_ngai_trung' AS slug
UNION ALL
       SELECT '86' AS province_code, '29158' AS code, 'Xã An Hiệp' AS name, 'An Hiệp' AS short_name, 'An Hiep' AS name_en, '86823' AS postal_code, 'an_hiep' AS slug
UNION ALL
       SELECT '86' AS province_code, '29167' AS code, 'Xã Tân Thuỷ' AS name, 'Tân Thuỷ' AS short_name, 'Tan Thuy' AS name_en, '86828' AS postal_code, 'tan_thuy' AS slug
UNION ALL
       SELECT '86' AS province_code, '29182' AS code, 'Xã Thạnh Phú' AS name, 'Thạnh Phú' AS short_name, 'Thanh Phu' AS name_en, '86906' AS postal_code, 'thanh_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29191' AS code, 'Xã Quới Điền' AS name, 'Quới Điền' AS short_name, 'Quoi Dien' AS name_en, '86910' AS postal_code, 'quoi_dien' AS slug
UNION ALL
       SELECT '86' AS province_code, '29194' AS code, 'Xã Đại Điền' AS name, 'Đại Điền' AS short_name, 'Dai Dien' AS name_en, '86912' AS postal_code, 'dai_dien' AS slug
UNION ALL
       SELECT '86' AS province_code, '29221' AS code, 'Xã Thạnh Hải' AS name, 'Thạnh Hải' AS short_name, 'Thanh Hai' AS name_en, '86921' AS postal_code, 'thanh_hai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29224' AS code, 'Xã An Qui' AS name, 'An Qui' AS short_name, 'An Qui' AS name_en, '86923' AS postal_code, 'an_qui' AS slug
UNION ALL
       SELECT '86' AS province_code, '29227' AS code, 'Xã Thạnh Phong' AS name, 'Thạnh Phong' AS short_name, 'Thanh Phong' AS name_en, '86920' AS postal_code, 'thanh_phong' AS slug
UNION ALL
       SELECT '86' AS province_code, '29242' AS code, 'Phường Trà Vinh' AS name, 'Trà Vinh' AS short_name, 'Tra Vinh' AS name_en, '87116' AS postal_code, 'tra_vinh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29254' AS code, 'Phường Nguyệt Hoá' AS name, 'Nguyệt Hoá' AS short_name, 'Nguyet Hoa' AS name_en, '87117' AS postal_code, 'nguyet_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29263' AS code, 'Phường Long Đức' AS name, 'Long Đức' AS short_name, 'Long Duc' AS name_en, '87115' AS postal_code, 'long_duc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29266' AS code, 'Xã Càng Long' AS name, 'Càng Long' AS short_name, 'Cang Long' AS name_en, '87206' AS postal_code, 'cang_long' AS slug
UNION ALL
       SELECT '86' AS province_code, '29275' AS code, 'Xã An Trường' AS name, 'An Trường' AS short_name, 'An Truong' AS name_en, '87213' AS postal_code, 'an_truong' AS slug
UNION ALL
       SELECT '86' AS province_code, '29278' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '87215' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '86' AS province_code, '29287' AS code, 'Xã Bình Phú' AS name, 'Bình Phú' AS short_name, 'Binh Phu' AS name_en, '87219' AS postal_code, 'binh_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29302' AS code, 'Xã Nhị Long' AS name, 'Nhị Long' AS short_name, 'Nhi Long' AS name_en, '87207' AS postal_code, 'nhi_long' AS slug
UNION ALL
       SELECT '86' AS province_code, '29308' AS code, 'Xã Cầu Kè' AS name, 'Cầu Kè' AS short_name, 'Cau Ke' AS name_en, '87306' AS postal_code, 'cau_ke' AS slug
UNION ALL
       SELECT '86' AS province_code, '29317' AS code, 'Xã An Phú Tân' AS name, 'An Phú Tân' AS short_name, 'An Phu Tan' AS name_en, '87311' AS postal_code, 'an_phu_tan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29329' AS code, 'Xã Phong Thạnh' AS name, 'Phong Thạnh' AS short_name, 'Phong Thanh' AS name_en, '87314' AS postal_code, 'phong_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29335' AS code, 'Xã Tam Ngãi' AS name, 'Tam Ngãi' AS short_name, 'Tam Ngai' AS name_en, '87310' AS postal_code, 'tam_ngai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29341' AS code, 'Xã Tiểu Cần' AS name, 'Tiểu Cần' AS short_name, 'Tieu Can' AS name_en, '87406' AS postal_code, 'tieu_can' AS slug
UNION ALL
       SELECT '86' AS province_code, '29362' AS code, 'Xã Hùng Hoà' AS name, 'Hùng Hoà' AS short_name, 'Hung Hoa' AS name_en, '87414' AS postal_code, 'hung_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29365' AS code, 'Xã Tập Ngãi' AS name, 'Tập Ngãi' AS short_name, 'Tap Ngai' AS name_en, '87407' AS postal_code, 'tap_ngai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29371' AS code, 'Xã Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '87413' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29374' AS code, 'Xã Châu Thành' AS name, 'Châu Thành' AS short_name, 'Chau Thanh' AS name_en, '87906' AS postal_code, 'chau_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29386' AS code, 'Xã Song Lộc' AS name, 'Song Lộc' AS short_name, 'Song Loc' AS name_en, '87915' AS postal_code, 'song_loc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29398' AS code, 'Phường Hoà Thuận' AS name, 'Hoà Thuận' AS short_name, 'Hoa Thuan' AS name_en, '87118' AS postal_code, 'hoa_thuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29407' AS code, 'Xã Hưng Mỹ' AS name, 'Hưng Mỹ' AS short_name, 'Hung My' AS name_en, '87908' AS postal_code, 'hung_my' AS slug
UNION ALL
       SELECT '86' AS province_code, '29410' AS code, 'Xã Hoà Minh' AS name, 'Hoà Minh' AS short_name, 'Hoa Minh' AS name_en, '87918' AS postal_code, 'hoa_minh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29413' AS code, 'Xã Long Hoà' AS name, 'Long Hoà' AS short_name, 'Long Hoa' AS name_en, '87919' AS postal_code, 'long_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29416' AS code, 'Xã Cầu Ngang' AS name, 'Cầu Ngang' AS short_name, 'Cau Ngang' AS name_en, '87806' AS postal_code, 'cau_ngang' AS slug
UNION ALL
       SELECT '86' AS province_code, '29419' AS code, 'Xã Mỹ Long' AS name, 'Mỹ Long' AS short_name, 'My Long' AS name_en, '87807' AS postal_code, 'my_long' AS slug
UNION ALL
       SELECT '86' AS province_code, '29431' AS code, 'Xã Vinh Kim' AS name, 'Vinh Kim' AS short_name, 'Vinh Kim' AS name_en, '87809' AS postal_code, 'vinh_kim' AS slug
UNION ALL
       SELECT '86' AS province_code, '29446' AS code, 'Xã Nhị Trường' AS name, 'Nhị Trường' AS short_name, 'Nhi Truong' AS name_en, '87815' AS postal_code, 'nhi_truong' AS slug
UNION ALL
       SELECT '86' AS province_code, '29455' AS code, 'Xã Hiệp Mỹ' AS name, 'Hiệp Mỹ' AS short_name, 'Hiep My' AS name_en, '87821' AS postal_code, 'hiep_my' AS slug
UNION ALL
       SELECT '86' AS province_code, '29461' AS code, 'Xã Trà Cú' AS name, 'Trà Cú' AS short_name, 'Tra Cu' AS name_en, '87506' AS postal_code, 'tra_cu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29467' AS code, 'Xã Tập Sơn' AS name, 'Tập Sơn' AS short_name, 'Tap Son' AS name_en, '87511' AS postal_code, 'tap_son' AS slug
UNION ALL
       SELECT '86' AS province_code, '29476' AS code, 'Xã Lưu Nghiệp Anh' AS name, 'Lưu Nghiệp Anh' AS short_name, 'Luu Nghiep Anh' AS name_en, '87514' AS postal_code, 'luu_nghiep_anh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29489' AS code, 'Xã Hàm Giang' AS name, 'Hàm Giang' AS short_name, 'Ham Giang' AS name_en, '87521' AS postal_code, 'ham_giang' AS slug
UNION ALL
       SELECT '86' AS province_code, '29491' AS code, 'Xã Đại An' AS name, 'Đại An' AS short_name, 'Dai An' AS name_en, '87520' AS postal_code, 'dai_an' AS slug
UNION ALL
       SELECT '86' AS province_code, '29497' AS code, 'Xã Đôn Châu' AS name, 'Đôn Châu' AS short_name, 'Don Chau' AS name_en, '87708' AS postal_code, 'don_chau' AS slug
UNION ALL
       SELECT '86' AS province_code, '29506' AS code, 'Xã Long Hiệp' AS name, 'Long Hiệp' AS short_name, 'Long Hiep' AS name_en, '87508' AS postal_code, 'long_hiep' AS slug
UNION ALL
       SELECT '86' AS province_code, '29512' AS code, 'Phường Duyên Hải' AS name, 'Duyên Hải' AS short_name, 'Duyen Hai' AS name_en, '87613' AS postal_code, 'duyen_hai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29513' AS code, 'Xã Long Thành' AS name, 'Long Thành' AS short_name, 'Long Thanh' AS name_en, '87706' AS postal_code, 'long_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29516' AS code, 'Phường Trường Long Hoà' AS name, 'Trường Long Hoà' AS short_name, 'Truong Long Hoa' AS name_en, '87612' AS postal_code, 'truong_long_hoa' AS slug
UNION ALL
       SELECT '86' AS province_code, '29518' AS code, 'Xã Long Hữu' AS name, 'Long Hữu' AS short_name, 'Long Huu' AS name_en, '87609' AS postal_code, 'long_huu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29530' AS code, 'Xã Ngũ Lạc' AS name, 'Ngũ Lạc' AS short_name, 'Ngu Lac' AS name_en, '87710' AS postal_code, 'ngu_lac' AS slug
UNION ALL
       SELECT '86' AS province_code, '29533' AS code, 'Xã Long Vĩnh' AS name, 'Long Vĩnh' AS short_name, 'Long Vinh' AS name_en, '87711' AS postal_code, 'long_vinh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29536' AS code, 'Xã Đông Hải' AS name, 'Đông Hải' AS short_name, 'Dong Hai' AS name_en, '87712' AS postal_code, 'dong_hai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29551' AS code, 'Phường Long Châu' AS name, 'Long Châu' AS short_name, 'Long Chau' AS name_en, '85118' AS postal_code, 'long_chau' AS slug
UNION ALL
       SELECT '86' AS province_code, '29557' AS code, 'Phường Phước Hậu' AS name, 'Phước Hậu' AS short_name, 'Phuoc Hau' AS name_en, '85119' AS postal_code, 'phuoc_hau' AS slug
UNION ALL
       SELECT '86' AS province_code, '29566' AS code, 'Phường Tân Ngãi' AS name, 'Tân Ngãi' AS short_name, 'Tan Ngai' AS name_en, '85114' AS postal_code, 'tan_ngai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29584' AS code, 'Xã An Bình' AS name, 'An Bình' AS short_name, 'An Binh' AS name_en, '85211' AS postal_code, 'an_binh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29590' AS code, 'Phường Thanh Đức' AS name, 'Thanh Đức' AS short_name, 'Thanh Duc' AS name_en, '85117' AS postal_code, 'thanh_duc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29593' AS code, 'Phường Tân Hạnh' AS name, 'Tân Hạnh' AS short_name, 'Tan Hanh' AS name_en, '85120' AS postal_code, 'tan_hanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29602' AS code, 'Xã Long Hồ' AS name, 'Long Hồ' AS short_name, 'Long Ho' AS name_en, '85206' AS postal_code, 'long_ho' AS slug
UNION ALL
       SELECT '86' AS province_code, '29611' AS code, 'Xã Phú Quới' AS name, 'Phú Quới' AS short_name, 'Phu Quoi' AS name_en, '85216' AS postal_code, 'phu_quoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '29623' AS code, 'Xã Nhơn Phú' AS name, 'Nhơn Phú' AS short_name, 'Nhon Phu' AS name_en, '85813' AS postal_code, 'nhon_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29638' AS code, 'Xã Bình Phước' AS name, 'Bình Phước' AS short_name, 'Binh Phuoc' AS name_en, '85815' AS postal_code, 'binh_phuoc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29641' AS code, 'Xã Cái Nhum' AS name, 'Cái Nhum' AS short_name, 'Cai Nhum' AS name_en, '85806' AS postal_code, 'cai_nhum' AS slug
UNION ALL
       SELECT '86' AS province_code, '29653' AS code, 'Xã Tân Long Hội' AS name, 'Tân Long Hội' AS short_name, 'Tan Long Hoi' AS name_en, '85818' AS postal_code, 'tan_long_hoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '29659' AS code, 'Xã Trung Thành' AS name, 'Trung Thành' AS short_name, 'Trung Thanh' AS name_en, '85714' AS postal_code, 'trung_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29668' AS code, 'Xã Quới An' AS name, 'Quới An' AS short_name, 'Quoi An' AS name_en, '85708' AS postal_code, 'quoi_an' AS slug
UNION ALL
       SELECT '86' AS province_code, '29677' AS code, 'Xã Quới Thiện' AS name, 'Quới Thiện' AS short_name, 'Quoi Thien' AS name_en, '85722' AS postal_code, 'quoi_thien' AS slug
UNION ALL
       SELECT '86' AS province_code, '29683' AS code, 'Xã Trung Hiệp' AS name, 'Trung Hiệp' AS short_name, 'Trung Hiep' AS name_en, '85712' AS postal_code, 'trung_hiep' AS slug
UNION ALL
       SELECT '86' AS province_code, '29698' AS code, 'Xã Trung Ngãi' AS name, 'Trung Ngãi' AS short_name, 'Trung Ngai' AS name_en, '85719' AS postal_code, 'trung_ngai' AS slug
UNION ALL
       SELECT '86' AS province_code, '29701' AS code, 'Xã Hiếu Phụng' AS name, 'Hiếu Phụng' AS short_name, 'Hieu Phung' AS name_en, '85716' AS postal_code, 'hieu_phung' AS slug
UNION ALL
       SELECT '86' AS province_code, '29713' AS code, 'Xã Hiếu Thành' AS name, 'Hiếu Thành' AS short_name, 'Hieu Thanh' AS name_en, '85724' AS postal_code, 'hieu_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29719' AS code, 'Xã Tam Bình' AS name, 'Tam Bình' AS short_name, 'Tam Binh' AS name_en, '85306' AS postal_code, 'tam_binh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29728' AS code, 'Xã Cái Ngang' AS name, 'Cái Ngang' AS short_name, 'Cai Ngang' AS name_en, '85323' AS postal_code, 'cai_ngang' AS slug
UNION ALL
       SELECT '86' AS province_code, '29734' AS code, 'Xã Hoà Hiệp' AS name, 'Hoà Hiệp' AS short_name, 'Hoa Hiep' AS name_en, '85308' AS postal_code, 'hoa_hiep' AS slug
UNION ALL
       SELECT '86' AS province_code, '29740' AS code, 'Xã Song Phú' AS name, 'Song Phú' AS short_name, 'Song Phu' AS name_en, '85314' AS postal_code, 'song_phu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29767' AS code, 'Xã Ngãi Tứ' AS name, 'Ngãi Tứ' AS short_name, 'Ngai Tu' AS name_en, '85321' AS postal_code, 'ngai_tu' AS slug
UNION ALL
       SELECT '86' AS province_code, '29770' AS code, 'Phường Cái Vồn' AS name, 'Cái Vồn' AS short_name, 'Cai Von' AS name_en, '85506' AS postal_code, 'cai_von' AS slug
UNION ALL
       SELECT '86' AS province_code, '29771' AS code, 'Phường Bình Minh' AS name, 'Bình Minh' AS short_name, 'Binh Minh' AS name_en, '85514' AS postal_code, 'binh_minh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29785' AS code, 'Xã Tân Lược' AS name, 'Tân Lược' AS short_name, 'Tan Luoc' AS name_en, '85414' AS postal_code, 'tan_luoc' AS slug
UNION ALL
       SELECT '86' AS province_code, '29788' AS code, 'Xã Mỹ Thuận' AS name, 'Mỹ Thuận' AS short_name, 'My Thuan' AS name_en, '85408' AS postal_code, 'my_thuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29800' AS code, 'Xã Tân Quới' AS name, 'Tân Quới' AS short_name, 'Tan Quoi' AS name_en, '85406' AS postal_code, 'tan_quoi' AS slug
UNION ALL
       SELECT '86' AS province_code, '29812' AS code, 'Phường Đông Thành' AS name, 'Đông Thành' AS short_name, 'Dong Thanh' AS name_en, '85513' AS postal_code, 'dong_thanh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29821' AS code, 'Xã Trà Ôn' AS name, 'Trà Ôn' AS short_name, 'Tra On' AS name_en, '85606' AS postal_code, 'tra_on' AS slug
UNION ALL
       SELECT '86' AS province_code, '29830' AS code, 'Xã Hoà Bình' AS name, 'Hoà Bình' AS short_name, 'Hoa Binh' AS name_en, '85615' AS postal_code, 'hoa_binh' AS slug
UNION ALL
       SELECT '86' AS province_code, '29836' AS code, 'Xã Trà Côn' AS name, 'Trà Côn' AS short_name, 'Tra Con' AS name_en, '85611' AS postal_code, 'tra_con' AS slug
UNION ALL
       SELECT '86' AS province_code, '29845' AS code, 'Xã Vĩnh Xuân' AS name, 'Vĩnh Xuân' AS short_name, 'Vinh Xuan' AS name_en, '85609' AS postal_code, 'vinh_xuan' AS slug
UNION ALL
       SELECT '86' AS province_code, '29857' AS code, 'Xã Lục Sĩ Thành' AS name, 'Lục Sĩ Thành' AS short_name, 'Luc Si Thanh' AS name_en, '85618' AS postal_code, 'luc_si_thanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30292' AS code, 'Phường Bình Đức' AS name, 'Bình Đức' AS short_name, 'Binh Duc' AS name_en, '90112' AS postal_code, 'binh_duc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30301' AS code, 'Phường Mỹ Thới' AS name, 'Mỹ Thới' AS short_name, 'My Thoi' AS name_en, '90117' AS postal_code, 'my_thoi' AS slug
UNION ALL
       SELECT '91' AS province_code, '30307' AS code, 'Phường Long Xuyên' AS name, 'Long Xuyên' AS short_name, 'Long Xuyen' AS name_en, '90119' AS postal_code, 'long_xuyen' AS slug
UNION ALL
       SELECT '91' AS province_code, '30313' AS code, 'Xã Mỹ Hoà Hưng' AS name, 'Mỹ Hoà Hưng' AS short_name, 'My Hoa Hung' AS name_en, '90111' AS postal_code, 'my_hoa_hung' AS slug
UNION ALL
       SELECT '91' AS province_code, '30316' AS code, 'Phường Châu Đốc' AS name, 'Châu Đốc' AS short_name, 'Chau Doc' AS name_en, '90513' AS postal_code, 'chau_doc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30325' AS code, 'Phường Vĩnh Tế' AS name, 'Vĩnh Tế' AS short_name, 'Vinh Te' AS name_en, '90509' AS postal_code, 'vinh_te' AS slug
UNION ALL
       SELECT '91' AS province_code, '30337' AS code, 'Xã An Phú' AS name, 'An Phú' AS short_name, 'An Phu' AS name_en, '90456' AS postal_code, 'an_phu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30341' AS code, 'Xã Khánh Bình' AS name, 'Khánh Bình' AS short_name, 'Khanh Binh' AS name_en, '90461' AS postal_code, 'khanh_binh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30346' AS code, 'Xã Nhơn Hội' AS name, 'Nhơn Hội' AS short_name, 'Nhon Hoi' AS name_en, '90462' AS postal_code, 'nhon_hoi' AS slug
UNION ALL
       SELECT '91' AS province_code, '30352' AS code, 'Xã Phú Hữu' AS name, 'Phú Hữu' AS short_name, 'Phu Huu' AS name_en, '90458' AS postal_code, 'phu_huu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30367' AS code, 'Xã Vĩnh Hậu' AS name, 'Vĩnh Hậu' AS short_name, 'Vinh Hau' AS name_en, '90469' AS postal_code, 'vinh_hau' AS slug
UNION ALL
       SELECT '91' AS province_code, '30376' AS code, 'Phường Tân Châu' AS name, 'Tân Châu' AS short_name, 'Tan Chau' AS name_en, '90420' AS postal_code, 'tan_chau' AS slug
UNION ALL
       SELECT '91' AS province_code, '30377' AS code, 'Phường Long Phú' AS name, 'Long Phú' AS short_name, 'Long Phu' AS name_en, '90418' AS postal_code, 'long_phu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30385' AS code, 'Xã Vĩnh Xương' AS name, 'Vĩnh Xương' AS short_name, 'Vinh Xuong' AS name_en, '90410' AS postal_code, 'vinh_xuong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30388' AS code, 'Xã Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '90413' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '91' AS province_code, '30403' AS code, 'Xã Châu Phong' AS name, 'Châu Phong' AS short_name, 'Chau Phong' AS name_en, '90415' AS postal_code, 'chau_phong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30406' AS code, 'Xã Phú Tân' AS name, 'Phú Tân' AS short_name, 'Phu Tan' AS name_en, '90324' AS postal_code, 'phu_tan' AS slug
UNION ALL
       SELECT '91' AS province_code, '30409' AS code, 'Xã Chợ Vàm' AS name, 'Chợ Vàm' AS short_name, 'Cho Vam' AS name_en, '90310' AS postal_code, 'cho_vam' AS slug
UNION ALL
       SELECT '91' AS province_code, '30421' AS code, 'Xã Phú Lâm' AS name, 'Phú Lâm' AS short_name, 'Phu Lam' AS name_en, '90311' AS postal_code, 'phu_lam' AS slug
UNION ALL
       SELECT '91' AS province_code, '30430' AS code, 'Xã Hoà Lạc' AS name, 'Hoà Lạc' AS short_name, 'Hoa Lac' AS name_en, '90315' AS postal_code, 'hoa_lac' AS slug
UNION ALL
       SELECT '91' AS province_code, '30436' AS code, 'Xã Phú An' AS name, 'Phú An' AS short_name, 'Phu An' AS name_en, '90308' AS postal_code, 'phu_an' AS slug
UNION ALL
       SELECT '91' AS province_code, '30445' AS code, 'Xã Bình Thạnh Đông' AS name, 'Bình Thạnh Đông' AS short_name, 'Binh Thanh Dong' AS name_en, '90320' AS postal_code, 'binh_thanh_dong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30463' AS code, 'Xã Châu Phú' AS name, 'Châu Phú' AS short_name, 'Chau Phu' AS name_en, '90619' AS postal_code, 'chau_phu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30469' AS code, 'Xã Mỹ Đức' AS name, 'Mỹ Đức' AS short_name, 'My Duc' AS name_en, '90610' AS postal_code, 'my_duc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30478' AS code, 'Xã Vĩnh Thạnh Trung' AS name, 'Vĩnh Thạnh Trung' AS short_name, 'Vinh Thanh Trung' AS name_en, '90607' AS postal_code, 'vinh_thanh_trung' AS slug
UNION ALL
       SELECT '91' AS province_code, '30481' AS code, 'Xã Thạnh Mỹ Tây' AS name, 'Thạnh Mỹ Tây' AS short_name, 'Thanh My Tay' AS name_en, '90613' AS postal_code, 'thanh_my_tay' AS slug
UNION ALL
       SELECT '91' AS province_code, '30487' AS code, 'Xã Bình Mỹ' AS name, 'Bình Mỹ' AS short_name, 'Binh My' AS name_en, '90617' AS postal_code, 'binh_my' AS slug
UNION ALL
       SELECT '91' AS province_code, '30502' AS code, 'Phường Thới Sơn' AS name, 'Thới Sơn' AS short_name, 'Thoi Son' AS name_en, '90712' AS postal_code, 'thoi_son' AS slug
UNION ALL
       SELECT '91' AS province_code, '30505' AS code, 'Phường Chi Lăng' AS name, 'Chi Lăng' AS short_name, 'Chi Lang' AS name_en, '90715' AS postal_code, 'chi_lang' AS slug
UNION ALL
       SELECT '91' AS province_code, '30520' AS code, 'Phường Tịnh Biên' AS name, 'Tịnh Biên' AS short_name, 'Tinh Bien' AS name_en, '90706' AS postal_code, 'tinh_bien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30526' AS code, 'Xã An Cư' AS name, 'An Cư' AS short_name, 'An Cu' AS name_en, '90708' AS postal_code, 'an_cu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30538' AS code, 'Xã Núi Cấm' AS name, 'Núi Cấm' AS short_name, 'Nui Cam' AS name_en, '90720' AS postal_code, 'nui_cam' AS slug
UNION ALL
       SELECT '91' AS province_code, '30544' AS code, 'Xã Tri Tôn' AS name, 'Tri Tôn' AS short_name, 'Tri Ton' AS name_en, '90806' AS postal_code, 'tri_ton' AS slug
UNION ALL
       SELECT '91' AS province_code, '30547' AS code, 'Xã Ba Chúc' AS name, 'Ba Chúc' AS short_name, 'Ba Chuc' AS name_en, '90809' AS postal_code, 'ba_chuc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30568' AS code, 'Xã Vĩnh Gia' AS name, 'Vĩnh Gia' AS short_name, 'Vinh Gia' AS name_en, '90811' AS postal_code, 'vinh_gia' AS slug
UNION ALL
       SELECT '91' AS province_code, '30577' AS code, 'Xã Ô Lâm' AS name, 'Ô Lâm' AS short_name, 'O Lam' AS name_en, '90817' AS postal_code, 'o_lam' AS slug
UNION ALL
       SELECT '91' AS province_code, '30580' AS code, 'Xã Cô Tô' AS name, 'Cô Tô' AS short_name, 'Co To' AS name_en, '90818' AS postal_code, 'co_to' AS slug
UNION ALL
       SELECT '91' AS province_code, '30589' AS code, 'Xã An Châu' AS name, 'An Châu' AS short_name, 'An Chau' AS name_en, '90906' AS postal_code, 'an_chau' AS slug
UNION ALL
       SELECT '91' AS province_code, '30595' AS code, 'Xã Cần Đăng' AS name, 'Cần Đăng' AS short_name, 'Can Dang' AS name_en, '90910' AS postal_code, 'can_dang' AS slug
UNION ALL
       SELECT '91' AS province_code, '30604' AS code, 'Xã Vĩnh An' AS name, 'Vĩnh An' AS short_name, 'Vinh An' AS name_en, '90913' AS postal_code, 'vinh_an' AS slug
UNION ALL
       SELECT '91' AS province_code, '30607' AS code, 'Xã Bình Hoà' AS name, 'Bình Hoà' AS short_name, 'Binh Hoa' AS name_en, '90908' AS postal_code, 'binh_hoa' AS slug
UNION ALL
       SELECT '91' AS province_code, '30619' AS code, 'Xã Vĩnh Hanh' AS name, 'Vĩnh Hanh' AS short_name, 'Vinh Hanh' AS name_en, '90911' AS postal_code, 'vinh_hanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30628' AS code, 'Xã Chợ Mới' AS name, 'Chợ Mới' AS short_name, 'Cho Moi' AS name_en, '90206' AS postal_code, 'cho_moi' AS slug
UNION ALL
       SELECT '91' AS province_code, '30631' AS code, 'Xã Long Điền' AS name, 'Long Điền' AS short_name, 'Long Dien' AS name_en, '90225' AS postal_code, 'long_dien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30643' AS code, 'Xã Cù Lao Giêng' AS name, 'Cù Lao Giêng' AS short_name, 'Cu Lao Gieng' AS name_en, '90224' AS postal_code, 'cu_lao_gieng' AS slug
UNION ALL
       SELECT '91' AS province_code, '30658' AS code, 'Xã Nhơn Mỹ' AS name, 'Nhơn Mỹ' AS short_name, 'Nhon My' AS name_en, '90209' AS postal_code, 'nhon_my' AS slug
UNION ALL
       SELECT '91' AS province_code, '30664' AS code, 'Xã Long Kiến' AS name, 'Long Kiến' AS short_name, 'Long Kien' AS name_en, '90217' AS postal_code, 'long_kien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30673' AS code, 'Xã Hội An' AS name, 'Hội An' AS short_name, 'Hoi An' AS name_en, '90221' AS postal_code, 'hoi_an' AS slug
UNION ALL
       SELECT '91' AS province_code, '30682' AS code, 'Xã Thoại Sơn' AS name, 'Thoại Sơn' AS short_name, 'Thoai Son' AS name_en, '90973' AS postal_code, 'thoai_son' AS slug
UNION ALL
       SELECT '91' AS province_code, '30685' AS code, 'Xã Phú Hoà' AS name, 'Phú Hoà' AS short_name, 'Phu Hoa' AS name_en, '90961' AS postal_code, 'phu_hoa' AS slug
UNION ALL
       SELECT '91' AS province_code, '30688' AS code, 'Xã Óc Eo' AS name, 'Óc Eo' AS short_name, 'Oc Eo' AS name_en, '90969' AS postal_code, 'oc_eo' AS slug
UNION ALL
       SELECT '91' AS province_code, '30691' AS code, 'Xã Tây Phú' AS name, 'Tây Phú' AS short_name, 'Tay Phu' AS name_en, '90966' AS postal_code, 'tay_phu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30697' AS code, 'Xã Vĩnh Trạch' AS name, 'Vĩnh Trạch' AS short_name, 'Vinh Trach' AS name_en, '90962' AS postal_code, 'vinh_trach' AS slug
UNION ALL
       SELECT '91' AS province_code, '30709' AS code, 'Xã Định Mỹ' AS name, 'Định Mỹ' AS short_name, 'Dinh My' AS name_en, '90963' AS postal_code, 'dinh_my' AS slug
UNION ALL
       SELECT '91' AS province_code, '30742' AS code, 'Phường Rạch Giá' AS name, 'Rạch Giá' AS short_name, 'Rach Gia' AS name_en, '91118' AS postal_code, 'rach_gia' AS slug
UNION ALL
       SELECT '91' AS province_code, '30760' AS code, 'Phường Vĩnh Thông' AS name, 'Vĩnh Thông' AS short_name, 'Vinh Thong' AS name_en, '91110' AS postal_code, 'vinh_thong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30766' AS code, 'Phường Tô Châu' AS name, 'Tô Châu' AS short_name, 'To Chau' AS name_en, '91510' AS postal_code, 'to_chau' AS slug
UNION ALL
       SELECT '91' AS province_code, '30769' AS code, 'Phường Hà Tiên' AS name, 'Hà Tiên' AS short_name, 'Ha Tien' AS name_en, '91513' AS postal_code, 'ha_tien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30781' AS code, 'Xã Tiên Hải' AS name, 'Tiên Hải' AS short_name, 'Tien Hai' AS name_en, '91511' AS postal_code, 'tien_hai' AS slug
UNION ALL
       SELECT '91' AS province_code, '30787' AS code, 'Xã Kiên Lương' AS name, 'Kiên Lương' AS short_name, 'Kien Luong' AS name_en, '91606' AS postal_code, 'kien_luong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30790' AS code, 'Xã Hoà Điền' AS name, 'Hoà Điền' AS short_name, 'Hoa Dien' AS name_en, '91608' AS postal_code, 'hoa_dien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30793' AS code, 'Xã Vĩnh Điều' AS name, 'Vĩnh Điều' AS short_name, 'Vinh Dieu' AS name_en, '91408' AS postal_code, 'vinh_dieu' AS slug
UNION ALL
       SELECT '91' AS province_code, '30796' AS code, 'Xã Giang Thành' AS name, 'Giang Thành' AS short_name, 'Giang Thanh' AS name_en, '91411' AS postal_code, 'giang_thanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30811' AS code, 'Xã Sơn Hải' AS name, 'Sơn Hải' AS short_name, 'Son Hai' AS name_en, '91612' AS postal_code, 'son_hai' AS slug
UNION ALL
       SELECT '91' AS province_code, '30814' AS code, 'Xã Hòn Nghệ' AS name, 'Hòn Nghệ' AS short_name, 'Hon Nghe' AS name_en, '91613' AS postal_code, 'hon_nghe' AS slug
UNION ALL
       SELECT '91' AS province_code, '30817' AS code, 'Xã Hòn Đất' AS name, 'Hòn Đất' AS short_name, 'Hon Dat' AS name_en, '91306' AS postal_code, 'hon_dat' AS slug
UNION ALL
       SELECT '91' AS province_code, '30823' AS code, 'Xã Bình Sơn' AS name, 'Bình Sơn' AS short_name, 'Binh Son' AS name_en, '91309' AS postal_code, 'binh_son' AS slug
UNION ALL
       SELECT '91' AS province_code, '30826' AS code, 'Xã Bình Giang' AS name, 'Bình Giang' AS short_name, 'Binh Giang' AS name_en, '91310' AS postal_code, 'binh_giang' AS slug
UNION ALL
       SELECT '91' AS province_code, '30835' AS code, 'Xã Sơn Kiên' AS name, 'Sơn Kiên' AS short_name, 'Son Kien' AS name_en, '91313' AS postal_code, 'son_kien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30838' AS code, 'Xã Mỹ Thuận' AS name, 'Mỹ Thuận' AS short_name, 'My Thuan' AS name_en, '91319' AS postal_code, 'my_thuan' AS slug
UNION ALL
       SELECT '91' AS province_code, '30850' AS code, 'Xã Tân Hiệp' AS name, 'Tân Hiệp' AS short_name, 'Tan Hiep' AS name_en, '91206' AS postal_code, 'tan_hiep' AS slug
UNION ALL
       SELECT '91' AS province_code, '30856' AS code, 'Xã Tân Hội' AS name, 'Tân Hội' AS short_name, 'Tan Hoi' AS name_en, '91210' AS postal_code, 'tan_hoi' AS slug
UNION ALL
       SELECT '91' AS province_code, '30874' AS code, 'Xã Thạnh Đông' AS name, 'Thạnh Đông' AS short_name, 'Thanh Dong' AS name_en, '91217' AS postal_code, 'thanh_dong' AS slug
UNION ALL
       SELECT '91' AS province_code, '30880' AS code, 'Xã Châu Thành' AS name, 'Châu Thành' AS short_name, 'Chau Thanh' AS name_en, '91717' AS postal_code, 'chau_thanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30886' AS code, 'Xã Thạnh Lộc' AS name, 'Thạnh Lộc' AS short_name, 'Thanh Loc' AS name_en, '91711' AS postal_code, 'thanh_loc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30898' AS code, 'Xã Bình An' AS name, 'Bình An' AS short_name, 'Binh An' AS name_en, '91714' AS postal_code, 'binh_an' AS slug
UNION ALL
       SELECT '91' AS province_code, '30904' AS code, 'Xã Giồng Riềng' AS name, 'Giồng Riềng' AS short_name, 'Giong Rieng' AS name_en, '92306' AS postal_code, 'giong_rieng' AS slug
UNION ALL
       SELECT '91' AS province_code, '30910' AS code, 'Xã Thạnh Hưng' AS name, 'Thạnh Hưng' AS short_name, 'Thanh Hung' AS name_en, '92308' AS postal_code, 'thanh_hung' AS slug
UNION ALL
       SELECT '91' AS province_code, '30928' AS code, 'Xã Ngọc Chúc' AS name, 'Ngọc Chúc' AS short_name, 'Ngoc Chuc' AS name_en, '92317' AS postal_code, 'ngoc_chuc' AS slug
UNION ALL
       SELECT '91' AS province_code, '30934' AS code, 'Xã Hoà Hưng' AS name, 'Hoà Hưng' AS short_name, 'Hoa Hung' AS name_en, '92320' AS postal_code, 'hoa_hung' AS slug
UNION ALL
       SELECT '91' AS province_code, '30943' AS code, 'Xã Long Thạnh' AS name, 'Long Thạnh' AS short_name, 'Long Thanh' AS name_en, '92313' AS postal_code, 'long_thanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '30949' AS code, 'Xã Hoà Thuận' AS name, 'Hoà Thuận' AS short_name, 'Hoa Thuan' AS name_en, '92316' AS postal_code, 'hoa_thuan' AS slug
UNION ALL
       SELECT '91' AS province_code, '30952' AS code, 'Xã Gò Quao' AS name, 'Gò Quao' AS short_name, 'Go Quao' AS name_en, '92206' AS postal_code, 'go_quao' AS slug
UNION ALL
       SELECT '91' AS province_code, '30958' AS code, 'Xã Định Hoà' AS name, 'Định Hoà' AS short_name, 'Dinh Hoa' AS name_en, '92210' AS postal_code, 'dinh_hoa' AS slug
UNION ALL
       SELECT '91' AS province_code, '30970' AS code, 'Xã Vĩnh Hoà Hưng' AS name, 'Vĩnh Hoà Hưng' AS short_name, 'Vinh Hoa Hung' AS name_en, '92217' AS postal_code, 'vinh_hoa_hung' AS slug
UNION ALL
       SELECT '91' AS province_code, '30982' AS code, 'Xã Vĩnh Tuy' AS name, 'Vĩnh Tuy' AS short_name, 'Vinh Tuy' AS name_en, '92216' AS postal_code, 'vinh_tuy' AS slug
UNION ALL
       SELECT '91' AS province_code, '30985' AS code, 'Xã An Biên' AS name, 'An Biên' AS short_name, 'An Bien' AS name_en, '91815' AS postal_code, 'an_bien' AS slug
UNION ALL
       SELECT '91' AS province_code, '30988' AS code, 'Xã Tây Yên' AS name, 'Tây Yên' AS short_name, 'Tay Yen' AS name_en, '91809' AS postal_code, 'tay_yen' AS slug
UNION ALL
       SELECT '91' AS province_code, '31006' AS code, 'Xã Đông Thái' AS name, 'Đông Thái' AS short_name, 'Dong Thai' AS name_en, '91813' AS postal_code, 'dong_thai' AS slug
UNION ALL
       SELECT '91' AS province_code, '31012' AS code, 'Xã Vĩnh Hoà' AS name, 'Vĩnh Hoà' AS short_name, 'Vinh Hoa' AS name_en, '92008' AS postal_code, 'vinh_hoa' AS slug
UNION ALL
       SELECT '91' AS province_code, '31018' AS code, 'Xã An Minh' AS name, 'An Minh' AS short_name, 'An Minh' AS name_en, '91917' AS postal_code, 'an_minh' AS slug
UNION ALL
       SELECT '91' AS province_code, '31024' AS code, 'Xã Đông Hoà' AS name, 'Đông Hoà' AS short_name, 'Dong Hoa' AS name_en, '91908' AS postal_code, 'dong_hoa' AS slug
UNION ALL
       SELECT '91' AS province_code, '31027' AS code, 'Xã U Minh Thượng' AS name, 'U Minh Thượng' AS short_name, 'U Minh Thuong' AS name_en, '92012' AS postal_code, 'u_minh_thuong' AS slug
UNION ALL
       SELECT '91' AS province_code, '31031' AS code, 'Xã Tân Thạnh' AS name, 'Tân Thạnh' AS short_name, 'Tan Thanh' AS name_en, '91910' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '31036' AS code, 'Xã Đông Hưng' AS name, 'Đông Hưng' AS short_name, 'Dong Hung' AS name_en, '91918' AS postal_code, 'dong_hung' AS slug
UNION ALL
       SELECT '91' AS province_code, '31042' AS code, 'Xã Vân Khánh' AS name, 'Vân Khánh' AS short_name, 'Van Khanh' AS name_en, '91913' AS postal_code, 'van_khanh' AS slug
UNION ALL
       SELECT '91' AS province_code, '31051' AS code, 'Xã Vĩnh Phong' AS name, 'Vĩnh Phong' AS short_name, 'Vinh Phong' AS name_en, '92113' AS postal_code, 'vinh_phong' AS slug
UNION ALL
       SELECT '91' AS province_code, '31064' AS code, 'Xã Vĩnh Bình' AS name, 'Vĩnh Bình' AS short_name, 'Vinh Binh' AS name_en, '92114' AS postal_code, 'vinh_binh' AS slug
UNION ALL
       SELECT '91' AS province_code, '31069' AS code, 'Xã Vĩnh Thuận' AS name, 'Vĩnh Thuận' AS short_name, 'Vinh Thuan' AS name_en, '92112' AS postal_code, 'vinh_thuan' AS slug
UNION ALL
       SELECT '91' AS province_code, '31078' AS code, 'Đặc khu Phú Quốc' AS name, 'Phú Quốc' AS short_name, 'Phu Quoc' AS name_en, '92516' AS postal_code, 'phu_quoc' AS slug
UNION ALL
       SELECT '91' AS province_code, '31105' AS code, 'Đặc khu Thổ Châu' AS name, 'Thổ Châu' AS short_name, 'Tho Chau' AS name_en, '92515' AS postal_code, 'tho_chau' AS slug
UNION ALL
       SELECT '91' AS province_code, '31108' AS code, 'Đặc khu Kiên Hải' AS name, 'Kiên Hải' AS short_name, 'Kien Hai' AS name_en, '92410' AS postal_code, 'kien_hai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31120' AS code, 'Phường Cái Khế' AS name, 'Cái Khế' AS short_name, 'Cai Khe' AS name_en, '94107' AS postal_code, 'cai_khe' AS slug
UNION ALL
       SELECT '92' AS province_code, '31135' AS code, 'Phường Ninh Kiều' AS name, 'Ninh Kiều' AS short_name, 'Ninh Kieu' AS name_en, '94119' AS postal_code, 'ninh_kieu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31147' AS code, 'Phường Tân An' AS name, 'Tân An' AS short_name, 'Tan An' AS name_en, '94120' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '92' AS province_code, '31150' AS code, 'Phường An Bình' AS name, 'An Bình' AS short_name, 'An Binh' AS name_en, '94118' AS postal_code, 'an_binh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31153' AS code, 'Phường Ô Môn' AS name, 'Ô Môn' AS short_name, 'O Mon' AS name_en, '94313' AS postal_code, 'o_mon' AS slug
UNION ALL
       SELECT '92' AS province_code, '31157' AS code, 'Phường Thới Long' AS name, 'Thới Long' AS short_name, 'Thoi Long' AS name_en, '94310' AS postal_code, 'thoi_long' AS slug
UNION ALL
       SELECT '92' AS province_code, '31162' AS code, 'Phường Phước Thới' AS name, 'Phước Thới' AS short_name, 'Phuoc Thoi' AS name_en, '94308' AS postal_code, 'phuoc_thoi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31168' AS code, 'Phường Bình Thuỷ' AS name, 'Bình Thuỷ' AS short_name, 'Binh Thuy' AS name_en, '94206' AS postal_code, 'binh_thuy' AS slug
UNION ALL
       SELECT '92' AS province_code, '31174' AS code, 'Phường Thới An Đông' AS name, 'Thới An Đông' AS short_name, 'Thoi An Dong' AS name_en, '94210' AS postal_code, 'thoi_an_dong' AS slug
UNION ALL
       SELECT '92' AS province_code, '31183' AS code, 'Phường Long Tuyền' AS name, 'Long Tuyền' AS short_name, 'Long Tuyen' AS name_en, '94211' AS postal_code, 'long_tuyen' AS slug
UNION ALL
       SELECT '92' AS province_code, '31186' AS code, 'Phường Cái Răng' AS name, 'Cái Răng' AS short_name, 'Cai Rang' AS name_en, '94913' AS postal_code, 'cai_rang' AS slug
UNION ALL
       SELECT '92' AS province_code, '31201' AS code, 'Phường Hưng Phú' AS name, 'Hưng Phú' AS short_name, 'Hung Phu' AS name_en, '94912' AS postal_code, 'hung_phu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31207' AS code, 'Phường Thốt Nốt' AS name, 'Thốt Nốt' AS short_name, 'Thot Not' AS name_en, '94406' AS postal_code, 'thot_not' AS slug
UNION ALL
       SELECT '92' AS province_code, '31213' AS code, 'Phường Tân Lộc' AS name, 'Tân Lộc' AS short_name, 'Tan Loc' AS name_en, '94412' AS postal_code, 'tan_loc' AS slug
UNION ALL
       SELECT '92' AS province_code, '31217' AS code, 'Phường Trung Nhứt' AS name, 'Trung Nhứt' AS short_name, 'Trung Nhut' AS name_en, '94409' AS postal_code, 'trung_nhut' AS slug
UNION ALL
       SELECT '92' AS province_code, '31228' AS code, 'Phường Thuận Hưng' AS name, 'Thuận Hưng' AS short_name, 'Thuan Hung' AS name_en, '94413' AS postal_code, 'thuan_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31231' AS code, 'Xã Thạnh An' AS name, 'Thạnh An' AS short_name, 'Thanh An' AS name_en, '94512' AS postal_code, 'thanh_an' AS slug
UNION ALL
       SELECT '92' AS province_code, '31232' AS code, 'Xã Vĩnh Thạnh' AS name, 'Vĩnh Thạnh' AS short_name, 'Vinh Thanh' AS name_en, '94506' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31237' AS code, 'Xã Vĩnh Trinh' AS name, 'Vĩnh Trinh' AS short_name, 'Vinh Trinh' AS name_en, '94516' AS postal_code, 'vinh_trinh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31246' AS code, 'Xã Thạnh Quới' AS name, 'Thạnh Quới' AS short_name, 'Thanh Quoi' AS name_en, '94508' AS postal_code, 'thanh_quoi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31249' AS code, 'Xã Thạnh Phú' AS name, 'Thạnh Phú' AS short_name, 'Thanh Phu' AS name_en, '94611' AS postal_code, 'thanh_phu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31255' AS code, 'Xã Trung Hưng' AS name, 'Trung Hưng' AS short_name, 'Trung Hung' AS name_en, '94610' AS postal_code, 'trung_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31258' AS code, 'Xã Thới Lai' AS name, 'Thới Lai' AS short_name, 'Thoi Lai' AS name_en, '94706' AS postal_code, 'thoi_lai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31261' AS code, 'Xã Cờ Đỏ' AS name, 'Cờ Đỏ' AS short_name, 'Co Do' AS name_en, '94606' AS postal_code, 'co_do' AS slug
UNION ALL
       SELECT '92' AS province_code, '31264' AS code, 'Xã Thới Hưng' AS name, 'Thới Hưng' AS short_name, 'Thoi Hung' AS name_en, '94607' AS postal_code, 'thoi_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31273' AS code, 'Xã Đông Hiệp' AS name, 'Đông Hiệp' AS short_name, 'Dong Hiep' AS name_en, '94615' AS postal_code, 'dong_hiep' AS slug
UNION ALL
       SELECT '92' AS province_code, '31282' AS code, 'Xã Đông Thuận' AS name, 'Đông Thuận' AS short_name, 'Dong Thuan' AS name_en, '94712' AS postal_code, 'dong_thuan' AS slug
UNION ALL
       SELECT '92' AS province_code, '31288' AS code, 'Xã Trường Thành' AS name, 'Trường Thành' AS short_name, 'Truong Thanh' AS name_en, '94718' AS postal_code, 'truong_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31294' AS code, 'Xã Trường Xuân' AS name, 'Trường Xuân' AS short_name, 'Truong Xuan' AS name_en, '94716' AS postal_code, 'truong_xuan' AS slug
UNION ALL
       SELECT '92' AS province_code, '31299' AS code, 'Xã Phong Điền' AS name, 'Phong Điền' AS short_name, 'Phong Dien' AS name_en, '94806' AS postal_code, 'phong_dien' AS slug
UNION ALL
       SELECT '92' AS province_code, '31309' AS code, 'Xã Trường Long' AS name, 'Trường Long' AS short_name, 'Truong Long' AS name_en, '94810' AS postal_code, 'truong_long' AS slug
UNION ALL
       SELECT '92' AS province_code, '31315' AS code, 'Xã Nhơn Ái' AS name, 'Nhơn Ái' AS short_name, 'Nhon Ai' AS name_en, '94811' AS postal_code, 'nhon_ai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31321' AS code, 'Phường Vị Thanh' AS name, 'Vị Thanh' AS short_name, 'Vi Thanh' AS name_en, '95115' AS postal_code, 'vi_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31333' AS code, 'Phường Vị Tân' AS name, 'Vị Tân' AS short_name, 'Vi Tan' AS name_en, '95109' AS postal_code, 'vi_tan' AS slug
UNION ALL
       SELECT '92' AS province_code, '31338' AS code, 'Xã Hoả Lựu' AS name, 'Hoả Lựu' AS short_name, 'Hoa Luu' AS name_en, '95112' AS postal_code, 'hoa_luu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31340' AS code, 'Phường Ngã Bảy' AS name, 'Ngã Bảy' AS short_name, 'Nga Bay' AS name_en, '95606' AS postal_code, 'nga_bay' AS slug
UNION ALL
       SELECT '92' AS province_code, '31342' AS code, 'Xã Tân Hoà' AS name, 'Tân Hoà' AS short_name, 'Tan Hoa' AS name_en, '95811' AS postal_code, 'tan_hoa' AS slug
UNION ALL
       SELECT '92' AS province_code, '31348' AS code, 'Xã Trường Long Tây' AS name, 'Trường Long Tây' AS short_name, 'Truong Long Tay' AS name_en, '95810' AS postal_code, 'truong_long_tay' AS slug
UNION ALL
       SELECT '92' AS province_code, '31360' AS code, 'Xã Thạnh Xuân' AS name, 'Thạnh Xuân' AS short_name, 'Thanh Xuan' AS name_en, '95813' AS postal_code, 'thanh_xuan' AS slug
UNION ALL
       SELECT '92' AS province_code, '31366' AS code, 'Xã Châu Thành' AS name, 'Châu Thành' AS short_name, 'Chau Thanh' AS name_en, '95715' AS postal_code, 'chau_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31369' AS code, 'Xã Đông Phước' AS name, 'Đông Phước' AS short_name, 'Dong Phuoc' AS name_en, '95716' AS postal_code, 'dong_phuoc' AS slug
UNION ALL
       SELECT '92' AS province_code, '31378' AS code, 'Xã Phú Hữu' AS name, 'Phú Hữu' AS short_name, 'Phu Huu' AS name_en, '95707' AS postal_code, 'phu_huu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31393' AS code, 'Xã Hoà An' AS name, 'Hoà An' AS short_name, 'Hoa An' AS name_en, '95518' AS postal_code, 'hoa_an' AS slug
UNION ALL
       SELECT '92' AS province_code, '31396' AS code, 'Xã Hiệp Hưng' AS name, 'Hiệp Hưng' AS short_name, 'Hiep Hung' AS name_en, '95509' AS postal_code, 'hiep_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31399' AS code, 'Xã Tân Bình' AS name, 'Tân Bình' AS short_name, 'Tan Binh' AS name_en, '95516' AS postal_code, 'tan_binh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31408' AS code, 'Xã Thạnh Hoà' AS name, 'Thạnh Hoà' AS short_name, 'Thanh Hoa' AS name_en, '95514' AS postal_code, 'thanh_hoa' AS slug
UNION ALL
       SELECT '92' AS province_code, '31411' AS code, 'Phường Đại Thành' AS name, 'Đại Thành' AS short_name, 'Dai Thanh' AS name_en, '95607' AS postal_code, 'dai_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31420' AS code, 'Xã Phụng Hiệp' AS name, 'Phụng Hiệp' AS short_name, 'Phung Hiep' AS name_en, '95507' AS postal_code, 'phung_hiep' AS slug
UNION ALL
       SELECT '92' AS province_code, '31426' AS code, 'Xã Phương Bình' AS name, 'Phương Bình' AS short_name, 'Phuong Binh' AS name_en, '95519' AS postal_code, 'phuong_binh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31432' AS code, 'Xã Tân Phước Hưng' AS name, 'Tân Phước Hưng' AS short_name, 'Tan Phuoc Hung' AS name_en, '95511' AS postal_code, 'tan_phuoc_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31441' AS code, 'Xã Vị Thuỷ' AS name, 'Vị Thuỷ' AS short_name, 'Vi Thuy' AS name_en, '95216' AS postal_code, 'vi_thuy' AS slug
UNION ALL
       SELECT '92' AS province_code, '31453' AS code, 'Xã Vĩnh Thuận Đông' AS name, 'Vĩnh Thuận Đông' AS short_name, 'Vinh Thuan Dong' AS name_en, '95313' AS postal_code, 'vinh_thuan_dong' AS slug
UNION ALL
       SELECT '92' AS province_code, '31459' AS code, 'Xã Vĩnh Tường' AS name, 'Vĩnh Tường' AS short_name, 'Vinh Tuong' AS name_en, '95209' AS postal_code, 'vinh_tuong' AS slug
UNION ALL
       SELECT '92' AS province_code, '31465' AS code, 'Xã Vị Thanh 1' AS name, 'Vị Thanh 1' AS short_name, 'Vi Thanh 1' AS name_en, '95212' AS postal_code, 'vi_thanh_1' AS slug
UNION ALL
       SELECT '92' AS province_code, '31471' AS code, 'Phường Long Mỹ' AS name, 'Long Mỹ' AS short_name, 'Long My' AS name_en, '95415' AS postal_code, 'long_my' AS slug
UNION ALL
       SELECT '92' AS province_code, '31473' AS code, 'Phường Long Bình' AS name, 'Long Bình' AS short_name, 'Long Binh' AS name_en, '95411' AS postal_code, 'long_binh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31480' AS code, 'Phường Long Phú 1' AS name, 'Long Phú 1' AS short_name, 'Long Phu 1' AS name_en, '95409' AS postal_code, 'long_phu_1' AS slug
UNION ALL
       SELECT '92' AS province_code, '31489' AS code, 'Xã Vĩnh Viễn' AS name, 'Vĩnh Viễn' AS short_name, 'Vinh Vien' AS name_en, '95306' AS postal_code, 'vinh_vien' AS slug
UNION ALL
       SELECT '92' AS province_code, '31492' AS code, 'Xã Lương Tâm' AS name, 'Lương Tâm' AS short_name, 'Luong Tam' AS name_en, '95309' AS postal_code, 'luong_tam' AS slug
UNION ALL
       SELECT '92' AS province_code, '31495' AS code, 'Xã Xà Phiên' AS name, 'Xà Phiên' AS short_name, 'Xa Phien' AS name_en, '95310' AS postal_code, 'xa_phien' AS slug
UNION ALL
       SELECT '92' AS province_code, '31507' AS code, 'Phường Sóc Trăng' AS name, 'Sóc Trăng' AS short_name, 'Soc Trang' AS name_en, '96117' AS postal_code, 'soc_trang' AS slug
UNION ALL
       SELECT '92' AS province_code, '31510' AS code, 'Phường Phú Lợi' AS name, 'Phú Lợi' AS short_name, 'Phu Loi' AS name_en, '96116' AS postal_code, 'phu_loi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31528' AS code, 'Xã Kế Sách' AS name, 'Kế Sách' AS short_name, 'Ke Sach' AS name_en, '96306' AS postal_code, 'ke_sach' AS slug
UNION ALL
       SELECT '92' AS province_code, '31531' AS code, 'Xã An Lạc Thôn' AS name, 'An Lạc Thôn' AS short_name, 'An Lac Thon' AS name_en, '96313' AS postal_code, 'an_lac_thon' AS slug
UNION ALL
       SELECT '92' AS province_code, '31537' AS code, 'Xã Phong Nẫm' AS name, 'Phong Nẫm' AS short_name, 'Phong Nam' AS name_en, '96312' AS postal_code, 'phong_nam' AS slug
UNION ALL
       SELECT '92' AS province_code, '31540' AS code, 'Xã Thới An Hội' AS name, 'Thới An Hội' AS short_name, 'Thoi An Hoi' AS name_en, '96307' AS postal_code, 'thoi_an_hoi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31552' AS code, 'Xã Nhơn Mỹ' AS name, 'Nhơn Mỹ' AS short_name, 'Nhon My' AS name_en, '96310' AS postal_code, 'nhon_my' AS slug
UNION ALL
       SELECT '92' AS province_code, '31561' AS code, 'Xã Đại Hải' AS name, 'Đại Hải' AS short_name, 'Dai Hai' AS name_en, '96317' AS postal_code, 'dai_hai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31567' AS code, 'Xã Mỹ Tú' AS name, 'Mỹ Tú' AS short_name, 'My Tu' AS name_en, '96460' AS postal_code, 'my_tu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31569' AS code, 'Xã Phú Tâm' AS name, 'Phú Tâm' AS short_name, 'Phu Tam' AS name_en, '96407' AS postal_code, 'phu_tam' AS slug
UNION ALL
       SELECT '92' AS province_code, '31570' AS code, 'Xã Hồ Đắc Kiện' AS name, 'Hồ Đắc Kiện' AS short_name, 'Ho Dac Kien' AS name_en, '96408' AS postal_code, 'ho_dac_kien' AS slug
UNION ALL
       SELECT '92' AS province_code, '31579' AS code, 'Xã Long Hưng' AS name, 'Long Hưng' AS short_name, 'Long Hung' AS name_en, '96457' AS postal_code, 'long_hung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31582' AS code, 'Xã Thuận Hoà' AS name, 'Thuận Hoà' AS short_name, 'Thuan Hoa' AS name_en, '96409' AS postal_code, 'thuan_hoa' AS slug
UNION ALL
       SELECT '92' AS province_code, '31591' AS code, 'Xã Mỹ Hương' AS name, 'Mỹ Hương' AS short_name, 'My Huong' AS name_en, '96459' AS postal_code, 'my_huong' AS slug
UNION ALL
       SELECT '92' AS province_code, '31594' AS code, 'Xã An Ninh' AS name, 'An Ninh' AS short_name, 'An Ninh' AS name_en, '96411' AS postal_code, 'an_ninh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31603' AS code, 'Xã Mỹ Phước' AS name, 'Mỹ Phước' AS short_name, 'My Phuoc' AS name_en, '96461' AS postal_code, 'my_phuoc' AS slug
UNION ALL
       SELECT '92' AS province_code, '31615' AS code, 'Xã An Thạnh' AS name, 'An Thạnh' AS short_name, 'An Thanh' AS name_en, '96914' AS postal_code, 'an_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31633' AS code, 'Xã Cù Lao Dung' AS name, 'Cù Lao Dung' AS short_name, 'Cu Lao Dung' AS name_en, '96915' AS postal_code, 'cu_lao_dung' AS slug
UNION ALL
       SELECT '92' AS province_code, '31639' AS code, 'Xã Long Phú' AS name, 'Long Phú' AS short_name, 'Long Phu' AS name_en, '96216' AS postal_code, 'long_phu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31645' AS code, 'Xã Đại Ngãi' AS name, 'Đại Ngãi' AS short_name, 'Dai Ngai' AS name_en, '96209' AS postal_code, 'dai_ngai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31654' AS code, 'Xã Trường Khánh' AS name, 'Trường Khánh' AS short_name, 'Truong Khanh' AS name_en, '96211' AS postal_code, 'truong_khanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31666' AS code, 'Xã Tân Thạnh' AS name, 'Tân Thạnh' AS short_name, 'Tan Thanh' AS name_en, '96214' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '92' AS province_code, '31673' AS code, 'Xã Trần Đề' AS name, 'Trần Đề' AS short_name, 'Tran De' AS name_en, '96706' AS postal_code, 'tran_de' AS slug
UNION ALL
       SELECT '92' AS province_code, '31675' AS code, 'Xã Liêu Tú' AS name, 'Liêu Tú' AS short_name, 'Lieu Tu' AS name_en, '96711' AS postal_code, 'lieu_tu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31679' AS code, 'Xã Lịch Hội Thượng' AS name, 'Lịch Hội Thượng' AS short_name, 'Lich Hoi Thuong' AS name_en, '96709' AS postal_code, 'lich_hoi_thuong' AS slug
UNION ALL
       SELECT '92' AS province_code, '31684' AS code, 'Phường Mỹ Xuyên' AS name, 'Mỹ Xuyên' AS short_name, 'My Xuyen' AS name_en, '96118' AS postal_code, 'my_xuyen' AS slug
UNION ALL
       SELECT '92' AS province_code, '31687' AS code, 'Xã Tài Văn' AS name, 'Tài Văn' AS short_name, 'Tai Van' AS name_en, '96714' AS postal_code, 'tai_van' AS slug
UNION ALL
       SELECT '92' AS province_code, '31699' AS code, 'Xã Thạnh Thới An' AS name, 'Thạnh Thới An' AS short_name, 'Thanh Thoi An' AS name_en, '96715' AS postal_code, 'thanh_thoi_an' AS slug
UNION ALL
       SELECT '92' AS province_code, '31708' AS code, 'Xã Nhu Gia' AS name, 'Nhu Gia' AS short_name, 'Nhu Gia' AS name_en, '96619' AS postal_code, 'nhu_gia' AS slug
UNION ALL
       SELECT '92' AS province_code, '31717' AS code, 'Xã Hoà Tú' AS name, 'Hoà Tú' AS short_name, 'Hoa Tu' AS name_en, '96617' AS postal_code, 'hoa_tu' AS slug
UNION ALL
       SELECT '92' AS province_code, '31723' AS code, 'Xã Ngọc Tố' AS name, 'Ngọc Tố' AS short_name, 'Ngoc To' AS name_en, '96612' AS postal_code, 'ngoc_to' AS slug
UNION ALL
       SELECT '92' AS province_code, '31726' AS code, 'Xã Gia Hoà' AS name, 'Gia Hoà' AS short_name, 'Gia Hoa' AS name_en, '96618' AS postal_code, 'gia_hoa' AS slug
UNION ALL
       SELECT '92' AS province_code, '31732' AS code, 'Phường Ngã Năm' AS name, 'Ngã Năm' AS short_name, 'Nga Nam' AS name_en, '96514' AS postal_code, 'nga_nam' AS slug
UNION ALL
       SELECT '92' AS province_code, '31741' AS code, 'Xã Tân Long' AS name, 'Tân Long' AS short_name, 'Tan Long' AS name_en, '96513' AS postal_code, 'tan_long' AS slug
UNION ALL
       SELECT '92' AS province_code, '31753' AS code, 'Phường Mỹ Quới' AS name, 'Mỹ Quới' AS short_name, 'My Quoi' AS name_en, '96510' AS postal_code, 'my_quoi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31756' AS code, 'Xã Phú Lộc' AS name, 'Phú Lộc' AS short_name, 'Phu Loc' AS name_en, '96556' AS postal_code, 'phu_loc' AS slug
UNION ALL
       SELECT '92' AS province_code, '31759' AS code, 'Xã Lâm Tân' AS name, 'Lâm Tân' AS short_name, 'Lam Tan' AS name_en, '96560' AS postal_code, 'lam_tan' AS slug
UNION ALL
       SELECT '92' AS province_code, '31777' AS code, 'Xã Vĩnh Lợi' AS name, 'Vĩnh Lợi' AS short_name, 'Vinh Loi' AS name_en, '96564' AS postal_code, 'vinh_loi' AS slug
UNION ALL
       SELECT '92' AS province_code, '31783' AS code, 'Phường Vĩnh Châu' AS name, 'Vĩnh Châu' AS short_name, 'Vinh Chau' AS name_en, '96816' AS postal_code, 'vinh_chau' AS slug
UNION ALL
       SELECT '92' AS province_code, '31789' AS code, 'Phường Khánh Hoà' AS name, 'Khánh Hoà' AS short_name, 'Khanh Hoa' AS name_en, '96811' AS postal_code, 'khanh_hoa' AS slug
UNION ALL
       SELECT '92' AS province_code, '31795' AS code, 'Xã Vĩnh Hải' AS name, 'Vĩnh Hải' AS short_name, 'Vinh Hai' AS name_en, '96809' AS postal_code, 'vinh_hai' AS slug
UNION ALL
       SELECT '92' AS province_code, '31804' AS code, 'Phường Vĩnh Phước' AS name, 'Vĩnh Phước' AS short_name, 'Vinh Phuoc' AS name_en, '96813' AS postal_code, 'vinh_phuoc' AS slug
UNION ALL
       SELECT '92' AS province_code, '31810' AS code, 'Xã Lai Hoà' AS name, 'Lai Hoà' AS short_name, 'Lai Hoa' AS name_en, '96815' AS postal_code, 'lai_hoa' AS slug
UNION ALL
       SELECT '96' AS province_code, '31825' AS code, 'Phường Bạc Liêu' AS name, 'Bạc Liêu' AS short_name, 'Bac Lieu' AS name_en, '97116' AS postal_code, 'bac_lieu' AS slug
UNION ALL
       SELECT '96' AS province_code, '31834' AS code, 'Phường Vĩnh Trạch' AS name, 'Vĩnh Trạch' AS short_name, 'Vinh Trach' AS name_en, '97112' AS postal_code, 'vinh_trach' AS slug
UNION ALL
       SELECT '96' AS province_code, '31840' AS code, 'Phường Hiệp Thành' AS name, 'Hiệp Thành' AS short_name, 'Hiep Thanh' AS name_en, '97114' AS postal_code, 'hiep_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '31843' AS code, 'Xã Hồng Dân' AS name, 'Hồng Dân' AS short_name, 'Hong Dan' AS name_en, '97315' AS postal_code, 'hong_dan' AS slug
UNION ALL
       SELECT '96' AS province_code, '31849' AS code, 'Xã Ninh Quới' AS name, 'Ninh Quới' AS short_name, 'Ninh Quoi' AS name_en, '97313' AS postal_code, 'ninh_quoi' AS slug
UNION ALL
       SELECT '96' AS province_code, '31858' AS code, 'Xã Vĩnh Lộc' AS name, 'Vĩnh Lộc' AS short_name, 'Vinh Loc' AS name_en, '97307' AS postal_code, 'vinh_loc' AS slug
UNION ALL
       SELECT '96' AS province_code, '31864' AS code, 'Xã Ninh Thạnh Lợi' AS name, 'Ninh Thạnh Lợi' AS short_name, 'Ninh Thanh Loi' AS name_en, '97310' AS postal_code, 'ninh_thanh_loi' AS slug
UNION ALL
       SELECT '96' AS province_code, '31867' AS code, 'Xã Phước Long' AS name, 'Phước Long' AS short_name, 'Phuoc Long' AS name_en, '97406' AS postal_code, 'phuoc_long' AS slug
UNION ALL
       SELECT '96' AS province_code, '31876' AS code, 'Xã Vĩnh Phước' AS name, 'Vĩnh Phước' AS short_name, 'Vinh Phuoc' AS name_en, '97414' AS postal_code, 'vinh_phuoc' AS slug
UNION ALL
       SELECT '96' AS province_code, '31882' AS code, 'Xã Vĩnh Thanh' AS name, 'Vĩnh Thanh' AS short_name, 'Vinh Thanh' AS name_en, '97411' AS postal_code, 'vinh_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '31885' AS code, 'Xã Phong Hiệp' AS name, 'Phong Hiệp' AS short_name, 'Phong Hiep' AS name_en, '97415' AS postal_code, 'phong_hiep' AS slug
UNION ALL
       SELECT '96' AS province_code, '31891' AS code, 'Xã Hoà Bình' AS name, 'Hoà Bình' AS short_name, 'Hoa Binh' AS name_en, '97706' AS postal_code, 'hoa_binh' AS slug
UNION ALL
       SELECT '96' AS province_code, '31894' AS code, 'Xã Châu Thới' AS name, 'Châu Thới' AS short_name, 'Chau Thoi' AS name_en, '97206' AS postal_code, 'chau_thoi' AS slug
UNION ALL
       SELECT '96' AS province_code, '31900' AS code, 'Xã Vĩnh Lợi' AS name, 'Vĩnh Lợi' AS short_name, 'Vinh Loi' AS name_en, '97214' AS postal_code, 'vinh_loi' AS slug
UNION ALL
       SELECT '96' AS province_code, '31906' AS code, 'Xã Hưng Hội' AS name, 'Hưng Hội' AS short_name, 'Hung Hoi' AS name_en, '97209' AS postal_code, 'hung_hoi' AS slug
UNION ALL
       SELECT '96' AS province_code, '31918' AS code, 'Xã Vĩnh Mỹ' AS name, 'Vĩnh Mỹ' AS short_name, 'Vinh My' AS name_en, '97714' AS postal_code, 'vinh_my' AS slug
UNION ALL
       SELECT '96' AS province_code, '31927' AS code, 'Xã Vĩnh Hậu' AS name, 'Vĩnh Hậu' AS short_name, 'Vinh Hau' AS name_en, '97712' AS postal_code, 'vinh_hau' AS slug
UNION ALL
       SELECT '96' AS province_code, '31942' AS code, 'Phường Giá Rai' AS name, 'Giá Rai' AS short_name, 'Gia Rai' AS name_en, '97516' AS postal_code, 'gia_rai' AS slug
UNION ALL
       SELECT '96' AS province_code, '31951' AS code, 'Phường Láng Tròn' AS name, 'Láng Tròn' AS short_name, 'Lang Tron' AS name_en, '97508' AS postal_code, 'lang_tron' AS slug
UNION ALL
       SELECT '96' AS province_code, '31957' AS code, 'Xã Phong Thạnh' AS name, 'Phong Thạnh' AS short_name, 'Phong Thanh' AS name_en, '97517' AS postal_code, 'phong_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '31972' AS code, 'Xã Gành Hào' AS name, 'Gành Hào' AS short_name, 'Ganh Hao' AS name_en, '97606' AS postal_code, 'ganh_hao' AS slug
UNION ALL
       SELECT '96' AS province_code, '31975' AS code, 'Xã Đông Hải' AS name, 'Đông Hải' AS short_name, 'Dong Hai' AS name_en, '97617' AS postal_code, 'dong_hai' AS slug
UNION ALL
       SELECT '96' AS province_code, '31985' AS code, 'Xã Long Điền' AS name, 'Long Điền' AS short_name, 'Long Dien' AS name_en, '97611' AS postal_code, 'long_dien' AS slug
UNION ALL
       SELECT '96' AS province_code, '31988' AS code, 'Xã An Trạch' AS name, 'An Trạch' AS short_name, 'An Trach' AS name_en, '97613' AS postal_code, 'an_trach' AS slug
UNION ALL
       SELECT '96' AS province_code, '31993' AS code, 'Xã Định Thành' AS name, 'Định Thành' AS short_name, 'Dinh Thanh' AS name_en, '97614' AS postal_code, 'dinh_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32002' AS code, 'Phường An Xuyên' AS name, 'An Xuyên' AS short_name, 'An Xuyen' AS name_en, '98113' AS postal_code, 'an_xuyen' AS slug
UNION ALL
       SELECT '96' AS province_code, '32014' AS code, 'Phường Lý Văn Lâm' AS name, 'Lý Văn Lâm' AS short_name, 'Ly Van Lam' AS name_en, '98121' AS postal_code, 'ly_van_lam' AS slug
UNION ALL
       SELECT '96' AS province_code, '32025' AS code, 'Phường Tân Thành' AS name, 'Tân Thành' AS short_name, 'Tan Thanh' AS name_en, '98112' AS postal_code, 'tan_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32041' AS code, 'Phường Hoà Thành' AS name, 'Hoà Thành' AS short_name, 'Hoa Thanh' AS name_en, '98120' AS postal_code, 'hoa_thanh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32044' AS code, 'Xã Nguyễn Phích' AS name, 'Nguyễn Phích' AS short_name, 'Nguyen Phich' AS name_en, '98312' AS postal_code, 'nguyen_phich' AS slug
UNION ALL
       SELECT '96' AS province_code, '32047' AS code, 'Xã U Minh' AS name, 'U Minh' AS short_name, 'U Minh' AS name_en, '98314' AS postal_code, 'u_minh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32059' AS code, 'Xã Khánh An' AS name, 'Khánh An' AS short_name, 'Khanh An' AS name_en, '98313' AS postal_code, 'khanh_an' AS slug
UNION ALL
       SELECT '96' AS province_code, '32062' AS code, 'Xã Khánh Lâm' AS name, 'Khánh Lâm' AS short_name, 'Khanh Lam' AS name_en, '98311' AS postal_code, 'khanh_lam' AS slug
UNION ALL
       SELECT '96' AS province_code, '32065' AS code, 'Xã Thới Bình' AS name, 'Thới Bình' AS short_name, 'Thoi Binh' AS name_en, '98206' AS postal_code, 'thoi_binh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32069' AS code, 'Xã Biển Bạch' AS name, 'Biển Bạch' AS short_name, 'Bien Bach' AS name_en, '98211' AS postal_code, 'bien_bach' AS slug
UNION ALL
       SELECT '96' AS province_code, '32071' AS code, 'Xã Trí Phải' AS name, 'Trí Phải' AS short_name, 'Tri Phai' AS name_en, '98207' AS postal_code, 'tri_phai' AS slug
UNION ALL
       SELECT '96' AS province_code, '32083' AS code, 'Xã Tân Lộc' AS name, 'Tân Lộc' AS short_name, 'Tan Loc' AS name_en, '98216' AS postal_code, 'tan_loc' AS slug
UNION ALL
       SELECT '96' AS province_code, '32092' AS code, 'Xã Hồ Thị Kỷ' AS name, 'Hồ Thị Kỷ' AS short_name, 'Ho Thi Ky' AS name_en, '98217' AS postal_code, 'ho_thi_ky' AS slug
UNION ALL
       SELECT '96' AS province_code, '32095' AS code, 'Xã Trần Văn Thời' AS name, 'Trần Văn Thời' AS short_name, 'Tran Van Thoi' AS name_en, '98406' AS postal_code, 'tran_van_thoi' AS slug
UNION ALL
       SELECT '96' AS province_code, '32098' AS code, 'Xã Sông Đốc' AS name, 'Sông Đốc' AS short_name, 'Song Doc' AS name_en, '98417' AS postal_code, 'song_doc' AS slug
UNION ALL
       SELECT '96' AS province_code, '32104' AS code, 'Xã Đá Bạc' AS name, 'Đá Bạc' AS short_name, 'Da Bac' AS name_en, '98419' AS postal_code, 'da_bac' AS slug
UNION ALL
       SELECT '96' AS province_code, '32110' AS code, 'Xã Khánh Bình' AS name, 'Khánh Bình' AS short_name, 'Khanh Binh' AS name_en, '98413' AS postal_code, 'khanh_binh' AS slug
UNION ALL
       SELECT '96' AS province_code, '32119' AS code, 'Xã Khánh Hưng' AS name, 'Khánh Hưng' AS short_name, 'Khanh Hung' AS name_en, '98409' AS postal_code, 'khanh_hung' AS slug
UNION ALL
       SELECT '96' AS province_code, '32128' AS code, 'Xã Cái Nước' AS name, 'Cái Nước' AS short_name, 'Cai Nuoc' AS name_en, '98606' AS postal_code, 'cai_nuoc' AS slug
UNION ALL
       SELECT '96' AS province_code, '32134' AS code, 'Xã Lương Thế Trân' AS name, 'Lương Thế Trân' AS short_name, 'Luong The Tran' AS name_en, '98616' AS postal_code, 'luong_the_tran' AS slug
UNION ALL
       SELECT '96' AS province_code, '32137' AS code, 'Xã Tân Hưng' AS name, 'Tân Hưng' AS short_name, 'Tan Hung' AS name_en, '98611' AS postal_code, 'tan_hung' AS slug
UNION ALL
       SELECT '96' AS province_code, '32140' AS code, 'Xã Hưng Mỹ' AS name, 'Hưng Mỹ' AS short_name, 'Hung My' AS name_en, '98613' AS postal_code, 'hung_my' AS slug
UNION ALL
       SELECT '96' AS province_code, '32152' AS code, 'Xã Đầm Dơi' AS name, 'Đầm Dơi' AS short_name, 'Dam Doi' AS name_en, '98706' AS postal_code, 'dam_doi' AS slug
UNION ALL
       SELECT '96' AS province_code, '32155' AS code, 'Xã Tạ An Khương' AS name, 'Tạ An Khương' AS short_name, 'Ta An Khuong' AS name_en, '98708' AS postal_code, 'ta_an_khuong' AS slug
UNION ALL
       SELECT '96' AS province_code, '32161' AS code, 'Xã Trần Phán' AS name, 'Trần Phán' AS short_name, 'Tran Phan' AS name_en, '98710' AS postal_code, 'tran_phan' AS slug
UNION ALL
       SELECT '96' AS province_code, '32167' AS code, 'Xã Tân Thuận' AS name, 'Tân Thuận' AS short_name, 'Tan Thuan' AS name_en, '98721' AS postal_code, 'tan_thuan' AS slug
UNION ALL
       SELECT '96' AS province_code, '32182' AS code, 'Xã Quách Phẩm' AS name, 'Quách Phẩm' AS short_name, 'Quach Pham' AS name_en, '98716' AS postal_code, 'quach_pham' AS slug
UNION ALL
       SELECT '96' AS province_code, '32185' AS code, 'Xã Thanh Tùng' AS name, 'Thanh Tùng' AS short_name, 'Thanh Tung' AS name_en, '98717' AS postal_code, 'thanh_tung' AS slug
UNION ALL
       SELECT '96' AS province_code, '32188' AS code, 'Xã Tân Tiến' AS name, 'Tân Tiến' AS short_name, 'Tan Tien' AS name_en, '98720' AS postal_code, 'tan_tien' AS slug
UNION ALL
       SELECT '96' AS province_code, '32191' AS code, 'Xã Năm Căn' AS name, 'Năm Căn' AS short_name, 'Nam Can' AS name_en, '98806' AS postal_code, 'nam_can' AS slug
UNION ALL
       SELECT '96' AS province_code, '32201' AS code, 'Xã Đất Mới' AS name, 'Đất Mới' AS short_name, 'Dat Moi' AS name_en, '98810' AS postal_code, 'dat_moi' AS slug
UNION ALL
       SELECT '96' AS province_code, '32206' AS code, 'Xã Tam Giang' AS name, 'Tam Giang' AS short_name, 'Tam Giang' AS name_en, '98812' AS postal_code, 'tam_giang' AS slug
UNION ALL
       SELECT '96' AS province_code, '32212' AS code, 'Xã Cái Đôi Vàm' AS name, 'Cái Đôi Vàm' AS short_name, 'Cai Doi Vam' AS name_en, '98507' AS postal_code, 'cai_doi_vam' AS slug
UNION ALL
       SELECT '96' AS province_code, '32214' AS code, 'Xã Phú Mỹ' AS name, 'Phú Mỹ' AS short_name, 'Phu My' AS name_en, '98512' AS postal_code, 'phu_my' AS slug
UNION ALL
       SELECT '96' AS province_code, '32218' AS code, 'Xã Phú Tân' AS name, 'Phú Tân' AS short_name, 'Phu Tan' AS name_en, '98511' AS postal_code, 'phu_tan' AS slug
UNION ALL
       SELECT '96' AS province_code, '32227' AS code, 'Xã Nguyễn Việt Khái' AS name, 'Nguyễn Việt Khái' AS short_name, 'Nguyen Viet Khai' AS name_en, '98515' AS postal_code, 'nguyen_viet_khai' AS slug
UNION ALL
       SELECT '96' AS province_code, '32236' AS code, 'Xã Tân Ân' AS name, 'Tân Ân' AS short_name, 'Tan An' AS name_en, '98914' AS postal_code, 'tan_an' AS slug
UNION ALL
       SELECT '96' AS province_code, '32244' AS code, 'Xã Phan Ngọc Hiển' AS name, 'Phan Ngọc Hiển' AS short_name, 'Phan Ngoc Hien' AS name_en, '98913' AS postal_code, 'phan_ngoc_hien' AS slug
UNION ALL
       SELECT '96' AS province_code, '32248' AS code, 'Xã Đất Mũi' AS name, 'Đất Mũi' AS short_name, 'Dat Mui' AS name_en, '98912' AS postal_code, 'dat_mui' AS slug
) w
JOIN provinces p ON p.code = w.province_code
ORDER BY p.code, w.code;

-- ---------------------------------------------------------------------
-- 3. BẢNG MAP QUẬN/HUYỆN CŨ → XÃ/PHƯỜNG MỚI
--
-- 37 quận/huyện trong seed V3 đã bị sáp nhập (VD "Thành phố Thủ Đức" không
-- còn là đơn vị cấp huyện). Bảng này giữ đường dẫn để backfill job cũ sang
-- cấp xã mới và để người dùng vẫn tra được địa chỉ cũ.
-- ---------------------------------------------------------------------

CREATE TABLE legacy_district_ward_map (
    id           INT          NOT NULL AUTO_INCREMENT,
    legacy_code  VARCHAR(40)  NOT NULL COMMENT 'Code quận/huyện cũ (VD: td)',
    ward_id      INT          NOT NULL,
    legacy_name  VARCHAR(100) NOT NULL COMMENT 'Tên quận/huyện cũ',
    PRIMARY KEY (id),
    UNIQUE KEY uq_legacy_district_ward (legacy_code, ward_id),
    KEY idx_legacy_map_ward (ward_id),
    CONSTRAINT fk_legacy_map_ward FOREIGN KEY (ward_id) REFERENCES wards (id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO legacy_district_ward_map (legacy_code, ward_id, legacy_name)
SELECT m.legacy_code, w.id, m.legacy_name
FROM (
       SELECT 'q1' AS legacy_code, '26737' AS ward_code, 'Quận 1' AS legacy_name
UNION ALL
       SELECT 'q3' AS legacy_code, '27139' AS ward_code, 'Quận 3' AS legacy_name
UNION ALL
       SELECT 'q4' AS legacy_code, '27259' AS ward_code, 'Quận 4' AS legacy_name
UNION ALL
       SELECT 'q5' AS legacy_code, '27301' AS ward_code, 'Quận 5' AS legacy_name
UNION ALL
       SELECT 'q6' AS legacy_code, '27349' AS ward_code, 'Quận 6' AS legacy_name
UNION ALL
       SELECT 'q7' AS legacy_code, '27475' AS ward_code, 'Quận 7' AS legacy_name
UNION ALL
       SELECT 'q8' AS legacy_code, '27364' AS ward_code, 'Quận 8' AS legacy_name
UNION ALL
       SELECT 'q10' AS legacy_code, '27163' AS ward_code, 'Quận 10' AS legacy_name
UNION ALL
       SELECT 'q11' AS legacy_code, '27211' AS ward_code, 'Quận 11' AS legacy_name
UNION ALL
       SELECT 'q12' AS legacy_code, '26767' AS ward_code, 'Quận 12' AS legacy_name
UNION ALL
       SELECT 'btanh' AS legacy_code, '26929' AS ward_code, 'Quận Bình Thạnh' AS legacy_name
UNION ALL
       SELECT 'td' AS legacy_code, '26824' AS ward_code, 'Thành phố Thủ Đức' AS legacy_name
UNION ALL
       SELECT 'pn' AS legacy_code, '27073' AS ward_code, 'Quận Phú Nhuận' AS legacy_name
UNION ALL
       SELECT 'gv' AS legacy_code, '26884' AS ward_code, 'Quận Gò Vấp' AS legacy_name
UNION ALL
       SELECT 'tb' AS legacy_code, '27004' AS ward_code, 'Quận Tân Bình' AS legacy_name
UNION ALL
       SELECT 'bt' AS legacy_code, '27442' AS ward_code, 'Quận Bình Tân' AS legacy_name
UNION ALL
       SELECT 'tp' AS legacy_code, '27031' AS ward_code, 'Quận Tân Phú' AS legacy_name
UNION ALL
       SELECT 'cg' AS legacy_code, '00166' AS ward_code, 'Quận Cầu Giấy' AS legacy_name
UNION ALL
       SELECT 'tx' AS legacy_code, '00367' AS ward_code, 'Quận Thanh Xuân' AS legacy_name
UNION ALL
       SELECT 'dd' AS legacy_code, '00235' AS ward_code, 'Quận Đống Đa' AS legacy_name
UNION ALL
       SELECT 'hbt' AS legacy_code, '00256' AS ward_code, 'Quận Hai Bà Trưng' AS legacy_name
UNION ALL
       SELECT 'hd' AS legacy_code, '09556' AS ward_code, 'Quận Hà Đông' AS legacy_name
UNION ALL
       SELECT 'bd' AS legacy_code, '00004' AS ward_code, 'Quận Ba Đình' AS legacy_name
UNION ALL
       SELECT 'hk' AS legacy_code, '00070' AS ward_code, 'Quận Hoàn Kiếm' AS legacy_name
UNION ALL
       SELECT 'ntl' AS legacy_code, '00166' AS ward_code, 'Quận Nam Từ Liêm' AS legacy_name
UNION ALL
       SELECT 'btl' AS legacy_code, '00091' AS ward_code, 'Quận Bắc Từ Liêm' AS legacy_name
UNION ALL
       SELECT 'lb' AS legacy_code, '00145' AS ward_code, 'Quận Long Biên' AS legacy_name
UNION ALL
       SELECT 'hm' AS legacy_code, '00331' AS ward_code, 'Quận Hoàng Mai' AS legacy_name
UNION ALL
       SELECT 'th' AS legacy_code, '00103' AS ward_code, 'Quận Tây Hồ' AS legacy_name
UNION ALL
       SELECT 'dn-hai' AS legacy_code, '20242' AS ward_code, 'Quận Hải Châu' AS legacy_name
UNION ALL
       SELECT 'dn-thanh' AS legacy_code, '20209' AS ward_code, 'Quận Thanh Khê' AS legacy_name
UNION ALL
       SELECT 'dn-son' AS legacy_code, '20263' AS ward_code, 'Quận Sơn Trà' AS legacy_name
UNION ALL
       SELECT 'ct-ninh' AS legacy_code, '31135' AS ward_code, 'Quận Ninh Kiều' AS legacy_name
UNION ALL
       SELECT 'ct-binh' AS legacy_code, '31168' AS ward_code, 'Quận Bình Thuỷ' AS legacy_name
UNION ALL
       SELECT 'bd-thuan' AS legacy_code, '25747' AS ward_code, 'Thành phố Thủ Dầu Một' AS legacy_name
UNION ALL
       SELECT 'bd-di' AS legacy_code, '25942' AS ward_code, 'Thành phố Dĩ An' AS legacy_name
UNION ALL
       SELECT 'dak-bmt' AS legacy_code, '24133' AS ward_code, 'Thành phố Buôn Ma Thuột' AS legacy_name
) m
JOIN wards w ON w.code = m.ward_code;

-- ---------------------------------------------------------------------
-- 3b. SỬA TỈNH CỦA QUẬN CŨ KHI TỈNH CŨ ĐÃ SÁP NHẬP
-- ---------------------------------------------------------------------
-- Bình Dương (slug 'bd') không còn tồn tại sau 01/07/2025: Thủ Dầu Một & Dĩ An
-- sáp nhập vào TP. Hồ Chí Minh (79), phần còn lại về Đồng Nai (75).
-- Mã tỉnh gán theo slug cũ (75) sai với 2 quận này → gán lại theo tỉnh chứa
-- xã tương ứng để `districts.province_code` luôn khớp với `wards`.
UPDATE districts d
JOIN legacy_district_ward_map m ON m.legacy_code = d.code
JOIN wards w                    ON w.id = m.ward_id
JOIN provinces wp                ON wp.id = w.province_id
SET d.province_code = wp.code
WHERE d.province_code <> wp.code;

-- ---------------------------------------------------------------------
-- 4. `job_posts` — THÊM `ward_id` + BACKFILL TỪ QUẬN CŨ
-- ---------------------------------------------------------------------

ALTER TABLE job_posts
    ADD COLUMN ward_id   INT         NULL COMMENT 'Xã/phường (cấp 2, thay cho quận/huyện)',
    ADD COLUMN ward_name VARCHAR(100) NULL COMMENT 'Snapshot tên xã/phường lúc đăng tin';

ALTER TABLE job_posts
    ADD CONSTRAINT fk_job_posts_ward FOREIGN KEY (ward_id) REFERENCES wards (id);

-- Job seed cũ trỏ `district_id` (quận cũ) → tra bảng map → `ward_id` (xã mới).
-- Đồng thời đồng bộ `province_id` theo tỉnh chứa xã (Bình Dương đã sáp nhập nên
-- tỉnh theo quận cũ có thể sai).
UPDATE job_posts j
JOIN districts d                ON d.id = j.district_id
JOIN legacy_district_ward_map m ON m.legacy_code = d.code
JOIN wards w                    ON w.id = m.ward_id
SET j.ward_id = w.id,
    j.ward_name = w.name,
    j.province_id = w.province_id
WHERE j.ward_id IS NULL;

-- ---------------------------------------------------------------------
-- 5. CHUẨN HOÁ `student_job_preferences.province_ids`
--
-- Cột này là JSON chứa CODE tỉnh dạng chuỗi ("hcm", "hn" …). Sau khi đổi code
-- tỉnh sang mã 2 chữ số, cần map lại cho khớp (và bỏ trùng).
-- Dùng JSON_TABLE để rải mảng ra từng phần tử, map slug → mã mới, rồi gộp lại.
UPDATE student_job_preferences sp
JOIN (
    SELECT student_id,
           CAST(CONCAT('[', GROUP_CONCAT(DISTINCT JSON_QUOTE(new_code)), ']') AS JSON) AS province_ids
    FROM (
        SELECT sp2.student_id,
               COALESCE(p.code, jt.code) AS new_code
        FROM student_job_preferences sp2
        JOIN JSON_TABLE(sp2.province_ids, '$[*]' COLUMNS (code VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PATH '$')) jt
        LEFT JOIN provinces p ON p.legacy_code = jt.code
    ) mapped
    GROUP BY student_id
) agg ON agg.student_id = sp.student_id
SET sp.province_ids = agg.province_ids;

-- ---------------------------------------------------------------------
-- 6. INDEX TRA CỨU
-- ---------------------------------------------------------------------

CREATE INDEX idx_job_posts_ward ON job_posts (ward_id);
CREATE INDEX idx_job_posts_province_ward ON job_posts (province_id, ward_id);
