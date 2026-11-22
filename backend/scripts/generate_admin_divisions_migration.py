"""Sinh file Flyway V12 (danh mục hành chính Việt Nam đầy đủ) từ dataset mở.

Nguồn dữ liệu
-------------
- Tỉnh + xã/phường : thanglequoc/vietnamese-provinces-database (MIT)
  https://github.com/thanglequoc/vietnamese-provinces-database
  json/simplified_json_generated_data_vn_units.json (bản v5.2.0, hiệu lực 20/09/2026)
- Bảng map quận cũ → xã mới : HuyChuong/vietnam-administrative-units (CC-BY-4.0)
  https://github.com/HuyChuong/vietnam-administrative-units
  data/xa-cu-moi.json

Cách chạy
---------
    cd backend/scripts
    python3 generate_admin_divisions_migration.py

Script tải 2 file JSON về thư mục cache (backend/scripts/.cache-admin-data/),
build file SQL trong backend/src/main/resources/db/migration/ và in ra thống kê.
"""

import json
import os
import urllib.request

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache-admin-data")
MIGRATION_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "src",
    "main",
    "resources",
    "db",
    "migration",
)
OUTPUT_FILE = os.path.join(MIGRATION_DIR, "V12__full_vietnam_admin_divisions.sql")

SOURCES = {
    "provinces": (
        "https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/"
        "master/json/simplified_json_generated_data_vn_units.json"
    ),
    "oldnew": (
        "https://raw.githubusercontent.com/HuyChuong/vietnam-administrative-units/"
        "main/data/xa-cu-moi.json"
    ),
}

# 37 quận/huyện seed trong V3 -> (mã tỉnh mới, tỉnh cũ, tên quận/huyện cũ)
LEGACY_DISTRICTS = {
    1: ("79", "TP. Hồ Chí Minh", "Quận 1"),
    2: ("79", "TP. Hồ Chí Minh", "Quận 3"),
    3: ("79", "TP. Hồ Chí Minh", "Quận 4"),
    4: ("79", "TP. Hồ Chí Minh", "Quận 5"),
    5: ("79", "TP. Hồ Chí Minh", "Quận 6"),
    6: ("79", "TP. Hồ Chí Minh", "Quận 7"),
    7: ("79", "TP. Hồ Chí Minh", "Quận 8"),
    8: ("79", "TP. Hồ Chí Minh", "Quận 10"),
    9: ("79", "TP. Hồ Chí Minh", "Quận 11"),
    10: ("79", "TP. Hồ Chí Minh", "Quận 12"),
    11: ("79", "TP. Hồ Chí Minh", "Quận Bình Thạnh"),
    12: ("79", "TP. Hồ Chí Minh", "Thành phố Thủ Đức"),
    13: ("79", "TP. Hồ Chí Minh", "Quận Phú Nhuận"),
    14: ("79", "TP. Hồ Chí Minh", "Quận Gò Vấp"),
    15: ("79", "TP. Hồ Chí Minh", "Quận Tân Bình"),
    16: ("79", "TP. Hồ Chí Minh", "Quận Bình Tân"),
    17: ("79", "TP. Hồ Chí Minh", "Quận Tân Phú"),
    18: ("01", "Hà Nội", "Quận Cầu Giấy"),
    19: ("01", "Hà Nội", "Quận Thanh Xuân"),
    20: ("01", "Hà Nội", "Quận Đống Đa"),
    21: ("01", "Hà Nội", "Quận Hai Bà Trưng"),
    22: ("01", "Hà Nội", "Quận Hà Đông"),
    23: ("01", "Hà Nội", "Quận Ba Đình"),
    24: ("01", "Hà Nội", "Quận Hoàn Kiếm"),
    25: ("01", "Hà Nội", "Quận Nam Từ Liêm"),
    26: ("01", "Hà Nội", "Quận Bắc Từ Liêm"),
    27: ("01", "Hà Nội", "Quận Long Biên"),
    28: ("01", "Hà Nội", "Quận Hoàng Mai"),
    29: ("01", "Hà Nội", "Quận Tây Hồ"),
    30: ("48", "Đà Nẵng", "Quận Hải Châu"),
    31: ("48", "Đà Nẵng", "Quận Thanh Khê"),
    32: ("48", "Đà Nẵng", "Quận Sơn Trà"),
    33: ("92", "Cần Thơ", "Quận Ninh Kiều"),
    34: ("92", "Cần Thơ", "Quận Bình Thuỷ"),
    35: ("75", "Bình Dương", "Thành phố Thủ Dầu Một"),
    36: ("75", "Bình Dương", "Thành phố Dĩ An"),
    37: ("66", "Đắk Lắk", "Thành phố Buôn Ma Thuột"),
}

# Code slug của 37 quận/huyện trong V3 (khớp cột `districts.code`).
LEGACY_CODES = {
    1: "q1", 2: "q3", 3: "q4", 4: "q5", 5: "q6", 6: "q7", 7: "q8", 8: "q10",
    9: "q11", 10: "q12", 11: "btanh", 12: "td", 13: "pn", 14: "gv", 15: "tb",
    16: "bt", 17: "tp", 18: "cg", 19: "tx", 20: "dd", 21: "hbt", 22: "hd",
    23: "bd", 24: "hk", 25: "ntl", 26: "btl", 27: "lb", 28: "hm", 29: "th",
    30: "dn-hai", 31: "dn-thanh", 32: "dn-son", 33: "ct-ninh", 34: "ct-binh",
    35: "bd-thuan", 36: "bd-di", 37: "dak-bmt",
}

# Map thủ công cho các quận không khớp tên trong bảng `xa-cu-moi` (do dataset
# dùng tên hành chính cũ khác, ví dụ "Quận Bình Thuỷ" vs "Quận Bình Thủy").
LEGACY_OVERRIDES = {
    34: ["31168"],
    36: ["25942", "25945", "25951"],
    37: ["24121", "24133", "24154", "24163", "24169", "24175"],
}

# Quận cũ nào chỉ còn 1 xã sau sáp nhập -> dùng luôn xã đó làm xã "chính".
# Ngược lại: ưu tiên xã có tên trùng với tên quận (VD "Quận Bình Thạnh" →
# "Phường Bình Thạnh"), không có thì lấy mã nhỏ nhất trong tập ứng viên.
LEGACY_NAME_ALIASES = {
    34: "Bình Thuỷ",
}


def esc(value):
    """Escape chuỗi cho MySQL, None/rỗng -> NULL."""
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def fetch_json(key):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, key + ".json")
    if not os.path.exists(path):
        print("  downloading %s ..." % key)
        with urllib.request.urlopen(SOURCES[key], timeout=60) as resp:
            data = resp.read()
        with open(path, "wb") as fh:
            fh.write(data)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def strip_prefix(name):
    for prefix in ("Thành phố ", "Thị xã ", "Quận ", "Phường ", "Xã ", "Huyện "):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def values_block(rows):
    """Nối các dòng VALUES bằng dấu phẩy (bắt buộc cho MySQL)."""
    return ",\n".join(rows)


def build_legacy_map(oldnew_rows, ward_by_code):
    """Trả về {legacy_id: {ward_code, ...}} và {legacy_id: primary_ward_code}."""
    all_map = {}
    for row in oldnew_rows:
        for legacy_id, (_prov, prov_name, district_name) in LEGACY_DISTRICTS.items():
            if row["quan_huyen_cu"] == district_name and row["tinh_cu"] == prov_name:
                all_map.setdefault(legacy_id, set()).add(row["ma_xa_moi"])

    for legacy_id, codes in LEGACY_OVERRIDES.items():
        all_map[legacy_id] = set(codes)

    # Kiểm tra mọi mã đích đều tồn tại trong dataset tỉnh/xã.
    for legacy_id, codes in all_map.items():
        missing = [c for c in codes if c not in ward_by_code]
        if missing:
            raise SystemExit(
                "Mã xã không tồn tại trong dataset cho quận %s: %s" % (legacy_id, missing)
            )

    primary = {}
    for legacy_id, codes in all_map.items():
        district_name = LEGACY_DISTRICTS[legacy_id][2]
        target = LEGACY_NAME_ALIASES.get(legacy_id, strip_prefix(district_name))
        exact = [c for c in codes if ward_by_code[c][1] == target]
        primary[legacy_id] = sorted(exact or sorted(codes))[0]

    return all_map, primary


def build_sql(provinces, wards, primary):
    # 6 tỉnh cũ đã được UPDATE sang mã chính thức ở phần trên (giữ `legacy_code`),
    # nên phần INSERT chỉ nạp 28 tỉnh còn lại.
    legacy_codes = {LEGACY_DISTRICTS[i][0] for i in LEGACY_DISTRICTS}

    legacy_meta_rows = []
    prov_rows = []
    for province in provinces:
        full_name = province["FullName"]
        division_type = (
            "Thành phố trực thuộc Trung ương" if full_name.startswith("Thành phố") else "Tỉnh"
        )
        if province["Code"] in legacy_codes:
            # 6 tỉnh cũ đã UPDATE code ở trên → chỉ bổ sung metadata.
            legacy_meta_rows.append(
                "UPDATE provinces SET name = %s, full_name = %s, name_en = %s, "
                "full_name_en = %s, division_type = %s, ward_count = %d WHERE code = '%s';"
                % (
                    esc(province["Name"]),
                    esc(full_name),
                    esc(province["NameEn"]),
                    esc(province["FullNameEn"]),
                    esc(division_type),
                    len(province["Wards"]),
                    province["Code"],
                )
            )
            continue
        prov_rows.append(
            "       ('%s', %s, %s, %s, %s, %s, %d, NULL)"
            % (
                province["Code"],
                esc(full_name),
                esc(province["Name"]),
                esc(province["NameEn"]),
                esc(province["FullNameEn"]),
                esc(division_type),
                len(province["Wards"]),
            )
        )

    ward_rows = []
    for province in provinces:
        for ward in province["Wards"]:
            ward_rows.append(
                "       SELECT %s AS province_code, %s AS code, %s AS name, %s AS short_name, "
                "%s AS name_en, %s AS postal_code, %s AS slug"
                % (
                    esc(province["Code"]),
                    esc(ward["Code"]),
                    esc(ward["FullName"]),
                    esc(ward["Name"]),
                    esc(ward["NameEn"]),
                    esc(ward.get("PostalCode")),
                    esc(ward["CodeName"]),
                )
            )
    ward_rows = ["\nUNION ALL\n".join(ward_rows)]

    map_rows = []
    for legacy_id in sorted(LEGACY_CODES):
        map_rows.append(
            "       SELECT %s AS legacy_code, %s AS ward_code, %s AS legacy_name"
            % (
                esc(LEGACY_CODES[legacy_id]),
                esc(primary[legacy_id]),
                esc(LEGACY_DISTRICTS[legacy_id][2]),
            )
        )
    map_rows = ["\nUNION ALL\n".join(map_rows)]

    return (
        values_block(prov_rows).rstrip().rstrip(",") + ";",
        values_block(ward_rows),
        values_block(map_rows),
        "\n".join(legacy_meta_rows),
    )


HEADER = """-- ---------------------------------------------------------------------
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
"""

PROV_FOOTER = """
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
"""

WARD_FOOTER = """
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
"""

MAP_FOOTER = """
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
"""


def main():
    print("Đọc dataset...")
    provinces = fetch_json("provinces")
    oldnew = fetch_json("oldnew")

    ward_by_code = {}
    for province in provinces:
        for ward in province["Wards"]:
            ward_by_code[ward["Code"]] = (ward["FullName"], ward["Name"])

    print("  %d tỉnh, %d xã/phường" % (len(provinces), len(ward_by_code)))

    all_map, primary = build_legacy_map(oldnew["dong"], ward_by_code)
    print("  map %d quận cũ -> %d xã mới" % (len(all_map), len(primary)))

    prov_block, ward_block, map_block, legacy_meta = build_sql(provinces, provinces, primary)

    sql = (
        HEADER
        + prov_block
        + "\n-- Bổ sung metadata cho 6 tỉnh đã có sẵn từ V3 (đổi code ở trên).\n"
        + legacy_meta
        + "\n"
        + PROV_FOOTER
        + ward_block
        + WARD_FOOTER
        + map_block
        + MAP_FOOTER
    )

    os.makedirs(MIGRATION_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(sql)

    print("Đã ghi %s" % OUTPUT_FILE)
    print("  %d dòng SQL, %d ký tự" % (sql.count("\n"), len(sql)))
    for legacy_id in sorted(LEGACY_CODES):
        print(
            "  %-10s %-26s -> %s (%d xã)"
            % (
                LEGACY_CODES[legacy_id],
                LEGACY_DISTRICTS[legacy_id][2],
                primary[legacy_id],
                len(all_map[legacy_id]),
            )
        )


if __name__ == "__main__":
    main()
