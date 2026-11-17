-- ---------------------------------------------------------------------
-- V3 — DỮ LIỆU DEMO (sinh tự động từ app/src/mocks/*)
--
-- File này được sinh bởi `app/scripts/generate-seed-sql.ts`.
-- KHÔNG sửa tay — hãy chạy lại `pnpm seed:sql` trong thư mục app/.
--
-- users.password_hash = 'SEED_PENDING' — DemoAccountInitializer sẽ băm
-- BCrypt theo vai trò (STUDENT->Student@123, EMPLOYER->Employer@123,
-- ADMIN->Admin@123) sau khi ứng dụng khởi động.
--
-- Cột `slug` giữ đúng string id của mock (job-001, app-001, emp-...)
-- để frontend so khớp id không cần chuyển đổi.
-- ---------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES
INSERT INTO roles (id, code, name, description) VALUES (1, 'STUDENT', 'Sinh viên', 'Sinh viên tìm việc part-time'),
       (2, 'EMPLOYER', 'Nhà tuyển dụng', 'Doanh nghiệp hoặc cá nhân đăng tin'),
       (3, 'ADMIN', 'Quản trị viên', 'Quản lý hệ thống VieJob');

-- 2. TỈNH / THÀNH PHỐ (code = public id, ví dụ 'hcm')
INSERT INTO provinces (id, code, name) VALUES
       (1, 'hcm', 'TP. Hồ Chí Minh'),
       (2, 'hn', 'Hà Nội'),
       (3, 'dn', 'Đà Nẵng'),
       (4, 'ct', 'Cần Thơ'),
       (5, 'bd', 'Bình Dương'),
       (6, 'dak', 'Đắk Lắk');

-- 3. QUẬN / HUYỆN (code = public id, ví dụ 'q1')
INSERT INTO districts (id, province_id, code, name) VALUES
       (1, 1, 'q1', 'Quận 1'),
       (2, 1, 'q3', 'Quận 3'),
       (3, 1, 'q4', 'Quận 4'),
       (4, 1, 'q5', 'Quận 5'),
       (5, 1, 'q6', 'Quận 6'),
       (6, 1, 'q7', 'Quận 7'),
       (7, 1, 'q8', 'Quận 8'),
       (8, 1, 'q10', 'Quận 10'),
       (9, 1, 'q11', 'Quận 11'),
       (10, 1, 'q12', 'Quận 12'),
       (11, 1, 'btanh', 'Quận Bình Thạnh'),
       (12, 1, 'td', 'Thành phố Thủ Đức'),
       (13, 1, 'pn', 'Quận Phú Nhuận'),
       (14, 1, 'gv', 'Quận Gò Vấp'),
       (15, 1, 'tb', 'Quận Tân Bình'),
       (16, 1, 'bt', 'Quận Bình Tân'),
       (17, 1, 'tp', 'Quận Tân Phú'),
       (18, 2, 'cg', 'Quận Cầu Giấy'),
       (19, 2, 'tx', 'Quận Thanh Xuân'),
       (20, 2, 'dd', 'Quận Đống Đa'),
       (21, 2, 'hbt', 'Quận Hai Bà Trưng'),
       (22, 2, 'hd', 'Quận Hà Đông'),
       (23, 2, 'bd', 'Quận Ba Đình'),
       (24, 2, 'hk', 'Quận Hoàn Kiếm'),
       (25, 2, 'ntl', 'Quận Nam Từ Liêm'),
       (26, 2, 'btl', 'Quận Bắc Từ Liêm'),
       (27, 2, 'lb', 'Quận Long Biên'),
       (28, 2, 'hm', 'Quận Hoàng Mai'),
       (29, 2, 'th', 'Quận Tây Hồ'),
       (30, 3, 'dn-hai', 'Quận Hải Châu'),
       (31, 3, 'dn-thanh', 'Quận Thanh Khê'),
       (32, 3, 'dn-son', 'Quận Sơn Trà'),
       (33, 4, 'ct-ninh', 'Quận Ninh Kiều'),
       (34, 4, 'ct-binh', 'Quận Bình Thủy'),
       (35, 5, 'bd-thuan', 'Thành phố Thủ Dầu Một'),
       (36, 5, 'bd-di', 'Thị xã Dĩ An'),
       (37, 6, 'dak-bmt', 'Phường Buôn Ma Thuột');

-- 4. NHÓM VIỆC (code = public id, ví dụ 'cat-fnb')
INSERT INTO job_categories (id, code, parent_id, name, slug, description, icon, sort_order, is_active) VALUES
       (1, 'cat-fnb', NULL, 'F&B, Barista & Phục vụ', 'f-and-b', 'Phục vụ, barista, chạy bàn, tiếp thực tại quán cà phê, nhà hàng', 'UtensilsCrossed', 1, 1),
       (2, 'cat-bep', NULL, 'Bếp & Nấu ăn', 'bep', 'Bếp chính, bếp nóng, bếp lạnh, thợ làm bánh', 'ChefHat', 2, 1),
       (3, 'cat-ban-tang', NULL, 'Bán hàng & Thu ngân', 'ban-hang', 'Bán hàng, tư vấn bán hàng, thu ngân, lễ tân', 'ShoppingBag', 3, 1),
       (4, 'cat-giao-hang', NULL, 'Giao hàng & Vận chuyển', 'giao-hang', 'Giao hàng nội bộ, shipper, thủ kho, vệ sinh', 'Truck', 4, 1),
       (5, 'cat-marketing', NULL, 'Marketing & Truyền thông', 'marketing', 'Content, marketing, quản trị mạng xã hội, thiết kế', 'Megaphone', 5, 1),
       (6, 'cat-van-phong', NULL, 'Văn phòng & Hành chính', 'van-phong', 'Hành chính văn phòng, tổng đài, kế toán', 'Briefcase', 6, 1),
       (7, 'cat-day-hoc', NULL, 'Dạy kèm & Tư vấn', 'day-hoc', 'Gia sư, trợ giảng, dạy kèm ngoại ngữ', 'GraduationCap', 7, 1),
       (8, 'cat-cong-nghe', NULL, 'Công nghệ & Kiểm thử', 'cong-nghe', 'Lập trình, kiểm thử phần mềm, hỗ trợ kỹ thuật', 'Code2', 8, 1);

-- 5. VỊ TRÍ CÔNG VIỆC (code = public id, ví dụ 'pos-phuc-vu')
INSERT INTO job_positions (id, code, category_id, name, slug, sort_order, is_active) VALUES
       (1, 'pos-phuc-vu', 1, 'Phục vụ', 'phuc-vu', 1, 1),
       (2, 'pos-chay-ban', 1, 'Chạy bàn / Tiếp thực', 'chay-ban', 2, 1),
       (3, 'pos-don-khach', 1, 'Đón khách (Host)', 'don-khach', 3, 1),
       (4, 'pos-bar', 1, 'Pha chế (Bar)', 'bar', 4, 1),
       (5, 'pos-phu-bar', 1, 'Phụ bar', 'phu-bar', 5, 1),
       (6, 'pos-cafe', 1, 'Pha chế (Café)', 'cafe', 6, 1),
       (7, 'pos-tra-sua', 1, 'Pha chế (Trà sữa, sinh tố)', 'tra-sua', 7, 1),
       (8, 'pos-bep-chinh', 2, 'Bếp chính', 'bep-chinh', 8, 1),
       (9, 'pos-giam-sat-bep', 2, 'Giám sát bếp', 'giam-sat-bep', 9, 1),
       (10, 'pos-bep-nong', 2, 'Bếp nóng', 'bep-nong', 10, 1),
       (11, 'pos-phu-bep-nong', 2, 'Phụ bếp nóng', 'phu-bep-nong', 11, 1),
       (12, 'pos-bep-lanh', 2, 'Bếp lạnh', 'bep-lanh', 12, 1),
       (13, 'pos-phu-bep-lanh', 2, 'Phụ bếp lạnh', 'phu-bep-lanh', 13, 1),
       (14, 'pos-bep-phu', 2, 'Bếp phụ', 'bep-phu', 14, 1),
       (15, 'pos-nhan-vien-bep', 2, 'Nhân viên Bếp', 'nhan-vien-bep', 15, 1),
       (16, 'pos-phu-bep-tap-vu', 2, 'Phụ bếp / Tạp vụ bếp', 'phu-bep-tap-vu', 16, 1),
       (17, 'pos-tho-lam-banh', 2, 'Thợ làm bánh', 'tho-lam-banh', 17, 1),
       (18, 'pos-rua-chen-bat', 2, 'Rửa chén bát', 'rua-chen-bat', 18, 1),
       (19, 'pos-ban-hang', 3, 'Bán hàng', 'ban-hang', 19, 1),
       (20, 'pos-tu-van-ban-hang', 3, 'Tư vấn bán hàng', 'tu-van-ban-hang', 20, 1),
       (21, 'pos-telesales', 3, 'Telesales', 'telesales', 21, 1),
       (22, 'pos-cham-soc-khach', 3, 'Chăm sóc khách hàng', 'cham-soc-khach', 22, 1),
       (23, 'pos-thu-ngan', 3, 'Thu ngân', 'thu-ngan', 23, 1),
       (24, 'pos-le-tan', 3, 'Lễ tân / Order', 'le-tan', 24, 1),
       (25, 'pos-giao-hang-noi-bo', 4, 'Giao hàng nội bộ', 'giao-hang-noi-bo', 25, 1),
       (26, 'pos-giao-hang', 4, 'Giao hàng', 'giao-hang', 26, 1),
       (27, 'pos-kho', 4, 'Thủ kho', 'kho', 27, 1),
       (28, 'pos-bao-ve', 4, 'Bảo vệ', 'bao-ve', 28, 1),
       (29, 'pos-trong-xe', 4, 'Trông xe', 'trong-xe', 29, 1),
       (30, 'pos-tap-vu-ve-sinh', 4, 'Tạp vụ vệ sinh', 'tap-vu-ve-sinh', 30, 1),
       (31, 'pos-marketing', 5, 'Marketing', 'marketing', 31, 1),
       (32, 'pos-truyen-thong-design', 5, 'Truyền thông / Design', 'truyen-thong-design', 32, 1),
       (33, 'pos-noi-dung', 5, 'Sáng tạo nội dung', 'noi-dung', 33, 1),
       (34, 'pos-hanh-chinh-van-phong', 6, 'Hành chính văn phòng', 'hanh-chinh-van-phong', 34, 1),
       (35, 'pos-tong-dai', 6, 'Tổng đài', 'tong-dai', 35, 1),
       (36, 'pos-ke-toan', 6, 'Kế toán', 'ke-toan', 36, 1),
       (37, 'pos-gia-su', 7, 'Gia sư', 'gia-su', 37, 1),
       (38, 'pos-tro-giang', 7, 'Trợ giảng', 'tro-giang', 38, 1),
       (39, 'pos-day-ngoai-ngu', 7, 'Dạy ngoại ngữ', 'day-ngoai-ngu', 39, 1),
       (40, 'pos-kiem-thu', 8, 'Kiểm thử phần mềm', 'kiem-thu', 40, 1),
       (41, 'pos-lap-trinh', 8, 'Lập trình viên', 'lap-trinh', 41, 1),
       (42, 'pos-ho-tro-ky-thuat', 8, 'Hỗ trợ kỹ thuật', 'ho-tro-ky-thuat', 42, 1);

-- 6. KỸ NĂNG (slug = public id, ví dụ 'sk-excel')
INSERT INTO skills (id, name, slug, is_active) VALUES
       (1, 'Pha chế cà phê', 'sk-barista', 1),
       (2, 'Phục vụ', 'sk-service', 1),
       (3, 'Nấu ăn', 'sk-cooking', 1),
       (4, 'Thu ngân', 'sk-cashier', 1),
       (5, 'Giao hàng', 'sk-driver', 1),
       (6, 'Sáng tạo nội dung', 'sk-content', 1),
       (7, 'Excel', 'sk-excel', 1),
       (8, 'Kèm cặp', 'sk-teaching', 1),
       (9, 'Kiểm thử phần mềm', 'sk-manual-test', 1),
       (10, 'Bán hàng', 'sk-pos', 1),
       (11, 'Quản lý kho', 'sk-stock', 1),
       (12, 'Phiên dịch', 'sk-translate', 1),
       (13, 'Thiết kế', 'sk-design', 1),
       (14, 'SEO', 'sk-seo', 1),
       (15, 'React', 'sk-react', 1),
       (16, 'An ninh mạng', 'sk-security', 1);

-- 7. NGƯỜI DÙNG (mật khẩu sẽ được băm sau khi app khởi động)
INSERT INTO users (id, email, password_hash, role_id, status, email_verified_at, auth_provider, failed_login_count, last_login_at, created_at, updated_at) VALUES
       (1, 'student@viejob.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-07-18 18:34:59', 'LOCAL', 0, '2026-11-14 18:34:59', '2026-07-18 18:34:59', '2026-07-18 18:34:59'),
       (2, 'employer@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-04-29 18:34:59', 'LOCAL', 0, '2026-11-13 18:34:59', '2026-04-29 18:34:59', '2026-04-29 18:34:59'),
       (3, 'admin@viejob.vn', 'SEED_PENDING', 3, 'ACTIVE', '2025-10-11 18:34:59', 'LOCAL', 0, '2026-11-15 18:34:59', '2025-10-11 18:34:59', '2025-10-11 18:34:59'),
       (4, 'hoa.nguyen@sv.edu.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-08-27 18:34:59', 'LOCAL', 0, '2026-11-11 18:34:59', '2026-08-27 18:34:59', '2026-08-27 18:34:59'),
       (5, 'binh.pham@sv.edu.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-09-11 18:34:59', 'LOCAL', 0, '2026-11-08 18:34:59', '2026-09-11 18:34:59', '2026-09-11 18:34:59'),
       (6, 'linh.pham@sv.edu.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-10-01 18:34:59', 'LOCAL', 0, '2026-11-12 18:34:59', '2026-10-01 18:34:59', '2026-10-01 18:34:59'),
       (7, 'son.tran@sv.edu.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-10-16 18:34:59', 'LOCAL', 0, '2026-11-06 18:34:59', '2026-10-16 18:34:59', '2026-10-16 18:34:59'),
       (8, 'mai.le@sv.edu.vn', 'SEED_PENDING', 1, 'ACTIVE', '2026-10-21 18:34:59', 'LOCAL', 0, '2026-11-09 18:34:59', '2026-10-21 18:34:59', '2026-10-21 18:34:59'),
       (9, 'quang.co@sv.edu.vn', 'SEED_PENDING', 1, 'PENDING_VERIFY', NULL, 'LOCAL', 0, NULL, '2026-11-12 18:34:59', '2026-11-12 18:34:59'),
       (10, 'tu.an@fnb.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-06-18 18:34:59', 'LOCAL', 0, '2026-11-10 18:34:59', '2026-06-18 18:34:59', '2026-06-18 18:34:59'),
       (11, 'hai.nv@retail.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-08-17 18:34:59', 'LOCAL', 0, '2026-11-04 18:34:59', '2026-08-17 18:34:59', '2026-08-17 18:34:59'),
       (12, 'spam.user@mail.com', 'SEED_PENDING', 2, 'LOCKED', NULL, 'LOCAL', 0, '2026-11-07 18:34:59', '2026-11-05 18:34:59', '2026-11-05 18:34:59'),
       (13, 'employer13@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-03 18:34:59', 'LOCAL', 0, NULL, '2026-07-03 18:34:59', '2026-07-03 18:34:59'),
       (14, 'employer14@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-08 18:34:59', 'LOCAL', 0, NULL, '2026-07-08 18:34:59', '2026-07-08 18:34:59'),
       (15, 'employer15@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-13 18:34:59', 'LOCAL', 0, NULL, '2026-07-13 18:34:59', '2026-07-13 18:34:59'),
       (16, 'employer16@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-18 18:34:59', 'LOCAL', 0, NULL, '2026-07-18 18:34:59', '2026-07-18 18:34:59'),
       (17, 'employer17@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-23 18:34:59', 'LOCAL', 0, NULL, '2026-07-23 18:34:59', '2026-07-23 18:34:59'),
       (18, 'employer18@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-07-28 18:34:59', 'LOCAL', 0, NULL, '2026-07-28 18:34:59', '2026-07-28 18:34:59'),
       (19, 'employer19@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-08-02 18:34:59', 'LOCAL', 0, NULL, '2026-08-02 18:34:59', '2026-08-02 18:34:59'),
       (20, 'employer20@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-08-07 18:34:59', 'LOCAL', 0, NULL, '2026-08-07 18:34:59', '2026-08-07 18:34:59'),
       (21, 'employer21@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-08-12 18:34:59', 'LOCAL', 0, NULL, '2026-08-12 18:34:59', '2026-08-12 18:34:59'),
       (22, 'employer22@viejob.vn', 'SEED_PENDING', 2, 'ACTIVE', '2026-08-17 18:34:59', 'LOCAL', 0, NULL, '2026-08-17 18:34:59', '2026-08-17 18:34:59');

-- 8. HỒ SƠ SINH VIÊN
INSERT INTO student_profiles (user_id, slug, full_name, phone, date_of_birth, gender, student_code, university, major, year_of_study, province_id, address, bio, avatar_url, cv_url, skills, avg_rating, rating_count, created_at, updated_at) VALUES
       (1, 'stu-001', 'Nguyễn Thanh Hà', '0901 234 567', '2003-05-12', 'FEMALE', 'SE2001', 'Đại học Bách Khoa TP.HCM', 'Quản trị Kinh doanh', 3, 1, 'Khu đô thị Đại học Quốc Gia, Thủ Đức, TP.HCM', 'Sinh viên năm 3 ngành Quản trị Kinh doanh, có 1 năm kinh nghiệm phục vụ quán cà phê và muốn tìm việc làm thêm phù hợp lịch học.', NULL, 'https://viejob.vn/cv/nguyen-thanh-ha.pdf', '["sk-service","sk-barista","sk-excel"]', 4.8, 5, '2026-07-18 18:34:59', '2026-07-18 18:34:59'),
       (4, 'stu-002', 'Nguyễn Thị Hoa', '0934 567 890', '2002-11-03', 'FEMALE', 'SE2002', 'Đại học Kinh tế TP.HCM', 'Marketing', 4, 1, 'Quận Bình Thạnh, TP.HCM', 'Yêu thích content và social media, từng làm freelancer cho nhiều thương hiệu nhỏ.', NULL, NULL, '["sk-content","sk-excel"]', 4.5, 2, '2026-08-27 18:34:59', '2026-08-27 18:34:59'),
       (5, 'stu-003', 'Phạm Đức Bình', '0945 678 901', '2003-09-18', 'MALE', 'SE2101', 'Đại học FPT TP.HCM', 'Kỹ thuật Phần mềm', 3, 1, 'Thủ Đức, TP.HCM', 'Sinh viên CNTT, biết React và TypeScript, muốn thực tập frontend.', NULL, 'https://viejob.vn/cv/pham-duc-binh.pdf', '["sk-manual-test","sk-excel"]', 5, 1, '2026-09-11 18:34:59', '2026-09-11 18:34:59'),
       (6, 'stu-004', 'Phạm Ngọc Linh', '0956 789 012', '2004-02-25', 'FEMALE', 'SE2205', 'Đại học Sư phạm Kỹ thuật Hà Nội', 'Sư phạm Toán', 2, 2, 'Cầu Giấy, Hà Nội', 'Sinh viên Sư phạm Toán, có kinh nghiệm gia sư cấp THPT.', NULL, NULL, '["sk-teaching"]', 4.7, 3, '2026-10-01 18:34:59', '2026-10-01 18:34:59'),
       (7, 'stu-005', 'Trần Đức Sơn', '0967 890 123', '2002-07-07', 'MALE', 'SE1908', 'Đại học Bách Khoa TP.HCM', 'Cơ khí', 4, 1, 'Gò Vấp, TP.HCM', 'Có thể lái xe máy, từng giao hàng cho quán cà phê trong khuôn viên trường.', NULL, NULL, '["sk-driver"]', 4.2, 2, '2026-10-16 18:34:59', '2026-10-16 18:34:59'),
       (8, 'stu-006', 'Lê Ngọc Mai', '0978 901 234', '2003-12-01', 'FEMALE', 'SE2009', 'Đại học Ngoại thương TP.HCM', 'Quản trị Kinh doanh', 3, 1, 'Quận 1, TP.HCM', 'Muốn làm thử ở cửa hàng để rèn kinh nghiệm bán hàng và dịch vụ khách hàng.', NULL, NULL, '["sk-service","sk-cashier"]', 4.4, 1, '2026-10-21 18:34:59', '2026-10-21 18:34:59');

-- 9. KINH NGHIỆM CỦA SINH VIÊN
INSERT INTO student_experiences (student_id, company, position, start_date, end_date, description, sort_order) VALUES
       (1, 'Tiệm Chè Táo Tào', 'Nhân viên phục vụ', '2025-06-01', '2025-09-30', 'Phục vụ khách, pha chè theo công thức, vệ sinh khu vực làm việc.', 1);

-- 10. MỤC TIÊU VIỆC LÀM CỦA SINH VIÊN
INSERT INTO student_job_preferences (student_id, category_ids, employment_types, province_ids, salary_min, salary_max) VALUES
       (1, '["cat-fnb","cat-ban-tang"]', '["PART_TIME","FLEXIBLE"]', '["hcm"]', 25000, 45000),
       (4, '["cat-marketing"]', '["PART_TIME","FLEXIBLE"]', '["hcm","hn"]', 30000, 60000),
       (5, '["cat-cong-nghe"]', '["PART_TIME","FLEXIBLE"]', '["hcm"]', 40000, 90000),
       (6, '["cat-day-hoc"]', '["FLEXIBLE","CASUAL"]', '["hn"]', 60000, 150000),
       (7, '["cat-giao-hang"]', '["PART_TIME","CASUAL"]', '["hcm"]', 20000, 35000),
       (8, '["cat-ban-tang","cat-fnb"]', '["PART_TIME"]', '["hcm"]', 25000, 40000);

-- 11. HỒ SƠ NHÀ TUYỂN DỤNG
INSERT INTO employer_profiles (user_id, slug, employer_type, display_name, contact_name, contact_phone, tax_code, description, logo_url, logo_variant, website, province_id, address, is_verified, avg_rating, rating_count, created_at, updated_at) VALUES
       (2, 'emp-viejob-demo', 'COMPANY', 'Công ty Cổ phần VieJob Demo', 'Trần Minh Khoa', '0912 345 678', '0319635156', 'Chuỗi cà phê và nhà hàng với hệ thống 8 chi nhánh tại TP.HCM. Chúng tôi thường xuyên tuyển sinh viên làm thêm theo ca linh hoạt, đào tạo bài bản và trả lương đúng hẹn.', NULL, 'primary', 'https://viejob-demo.vn', 1, '89 Phan Đình Phùng, Phú Nhuận, TP.HCM', 1, 4.6, 12, '2026-04-29 18:34:59', '2026-04-29 18:34:59'),
       (10, 'emp-kim-phat', 'COMPANY', 'Kim Phát Jobs', 'Kim Phát Jobs', '0900 000 000', '0310000000', 'Kim Phát Jobs đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'primary', NULL, 1, 'Địa chỉ trụ sở', 1, 3.9, 3, '2026-06-18 18:34:59', '2026-06-18 18:34:59'),
       (11, 'emp-tao-tao', 'COMPANY', 'Tiệm Chè Táo Tào', 'Tiệm Chè Táo Tào', '0900 000 001', '0310000001', 'Tiệm Chè Táo Tào đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'accent', NULL, 2, 'Địa chỉ trụ sở', 1, 4, 4, '2026-06-23 18:34:59', '2026-06-23 18:34:59'),
       (12, 'emp-banh-chao', 'COMPANY', 'Bánh Mì Chảo Nóng 6H', 'Bánh Mì Chảo Nóng 6H', '0900 000 002', '0310000002', 'Bánh Mì Chảo Nóng 6H đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'secondary', NULL, 1, 'Địa chỉ trụ sở', 0, 4.1, 5, '2026-06-28 18:34:59', '2026-06-28 18:34:59'),
       (13, 'emp-fozy', 'INDIVIDUAL', 'Trà Sữa Fozu', 'Trà Sữa Fozu', '0900 000 003', NULL, 'Trà Sữa Fozu đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'muted', NULL, 2, 'Địa chỉ trụ sở', 1, 4.1, 6, '2026-07-03 18:34:59', '2026-07-03 18:34:59'),
       (14, 'emp-breakfast', 'COMPANY', 'Hệ thống Ăn sáng 1 phút 30 giây', 'Hệ thống Ăn sáng 1 phút 30 giây', '0900 000 004', '0310000004', 'Hệ thống Ăn sáng 1 phút 30 giây đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'primary', NULL, 1, 'Địa chỉ trụ sở', 0, 4.2, 7, '2026-07-08 18:34:59', '2026-07-08 18:34:59'),
       (15, 'emp-in-hospitality', 'COMPANY', 'Công ty CP IN Hospitality', 'Công ty CP IN Hospitality', '0900 000 005', '0310000005', 'Công ty CP IN Hospitality đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'secondary', NULL, 2, 'Địa chỉ trụ sở', 1, 4.3, 8, '2026-07-13 18:34:59', '2026-07-13 18:34:59'),
       (16, 'emp-koi-the', 'COMPANY', 'Koi Thé', 'Koi Thé', '0900 000 006', '0310000006', 'Koi Thé đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'accent', NULL, 1, 'Địa chỉ trụ sở', 1, 4.4, 9, '2026-07-18 18:34:59', '2026-07-18 18:34:59'),
       (17, 'emp-john-coffee', 'INDIVIDUAL', 'John Coffee and Bakey', 'John Coffee and Bakey', '0900 000 007', NULL, 'John Coffee and Bakey đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'muted', NULL, 2, 'Địa chỉ trụ sở', 0, 4.5, 10, '2026-07-23 18:34:59', '2026-07-23 18:34:59'),
       (18, 'emp-kalbi', 'COMPANY', 'Kalbi Master', 'Kalbi Master', '0900 000 008', '0310000008', 'Kalbi Master đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'primary', NULL, 1, 'Địa chỉ trụ sở', 1, 4.5, 11, '2026-07-28 18:34:59', '2026-07-28 18:34:59'),
       (19, 'emp-runam', 'COMPANY', 'RuNam Cafe', 'RuNam Cafe', '0900 000 009', '0310000009', 'RuNam Cafe đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'secondary', NULL, 2, 'Địa chỉ trụ sở', 0, 4.6, 12, '2026-08-02 18:34:59', '2026-08-02 18:34:59'),
       (20, 'emp-tam-hao', 'COMPANY', 'Hồng Trà Sữa Tam Hảo', 'Hồng Trà Sữa Tam Hảo', '0900 000 0010', '0310000010', 'Hồng Trà Sữa Tam Hảo đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'accent', NULL, 1, 'Địa chỉ trụ sở', 0, 4.7, 13, '2026-08-07 18:34:59', '2026-08-07 18:34:59'),
       (21, 'emp-d1-concepts', 'INDIVIDUAL', 'D1 Concepts', 'D1 Concepts', '0900 000 0011', NULL, 'D1 Concepts đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'muted', NULL, 2, 'Địa chỉ trụ sở', 1, 4.8, 14, '2026-08-12 18:34:59', '2026-08-12 18:34:59'),
       (22, 'emp-yakimono', 'COMPANY', 'Yakimono', 'Yakimono', '0900 000 0012', '0310000012', 'Yakimono đang cần đội ngũ nhân sự part-time chất lượng, phù hợp lịch học của sinh viên.', NULL, 'muted', NULL, 1, 'Địa chỉ trụ sở', 1, 3.9, 15, '2026-08-17 18:34:59', '2026-08-17 18:34:59');

-- 12. TIN TUYỂN DỤNG
INSERT INTO job_posts (id, slug, employer_id, category_id, position_id, title, description, requirements, benefits, work_mode, employment_type, province_id, district_id, address_detail, branch_name, salary_type, salary_min, salary_max, salary_currency, positions_count, positions_filled, start_date, end_date, application_deadline, status, reviewed_by, reviewed_at, reject_reason, view_count, is_urgent, applicant_count, published_at, closed_at, created_at, updated_at, deleted_at) VALUES
       (1, 'job-001', 10, 1, NULL, '500K/8H PART TIME PV TIỆC', 'Tuyển nhân viên phục vụ tiệc đại tiệc ngày 21/11 tại Vũng Tàu. Ca 8 tiếng, xuất phát 05h00 từ Quận 1, về 15h00. Xe đưa đón theo lịch trình, hỗ trợ xăng xe đến điểm tập hợp.', '["Phục vụ tiệc","Ngoại hình gọn gàng","Sẵn sàng làm ca sáng"]', '["Bao ăn","Cấp đồng phục","Xe đưa đón","Hỗ trợ xăng xe"]', 'ONSITE', 'PART_TIME', 1, 1, '585 Đường Âu Cơ, Phường 14, Tân Bình', NULL, 'HOURLY', 62000, 62000, 'VND', 50, 0, NULL, NULL, '2026-11-22 18:34:59', 'OPEN', NULL, NULL, NULL, 448, 1, 34, '2026-11-15 15:34:59', NULL, '2026-11-15 15:34:59', '2026-11-15 15:34:59', NULL),
       (2, 'job-002', 10, 1, 1, '62K/H PART TIME PHỤC VỤ TIỆC TẠI VŨNG TÀU', 'Tuyển phục vụ part-time làm việc tiệc tại Vũng Tàu, ca 8 tiếng. Lương 500k/ca, tương đương 62.500đ/giờ. Tiền tip giữ 100%.', '["Có kinh nghiệm phục vụ","Nhanh nhẹn"]', '["Bao ăn","Giữ 100% tiền tip","Cấp đồng phục"]', 'ONSITE', 'PART_TIME', 1, 1, '585 Đường Âu Cơ, Phường 14, Tân Bình', NULL, 'HOURLY', 62000, 62000, 'VND', 30, 12, NULL, NULL, '2026-11-20 18:34:59', 'OPEN', NULL, NULL, NULL, 292, 0, 21, '2026-11-15 12:34:59', NULL, '2026-11-15 12:34:59', '2026-11-15 12:34:59', NULL),
       (3, 'job-003', 11, 1, NULL, 'Tuyển Nhân Viên Cửa Hàng — Tiệm Chè Táo Tào', 'Tiệm chè Táo Tào cần nhân viên bán hàng part-time cuối tuần, phục vụ khách và pha chè theo công thức. Có thể làm 2–4 ca/tuần.', '["Thân thiện, cười tươi","Đam mê pha chè"]', '["Bao ăn","Đào tạo pha chè","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 1, 1, '12 Hàm Nghi, Bến Nghé, Quận 1', NULL, 'HOURLY', 25000, 26000, 'VND', 8, 3, NULL, NULL, '2026-11-29 18:34:59', 'OPEN', NULL, NULL, NULL, 184, 0, 12, '2026-11-15 08:34:59', NULL, '2026-11-15 08:34:59', '2026-11-15 08:34:59', NULL),
       (4, 'job-004', 12, 1, 1, 'Tuyển phục vụ Bánh Mì Chảo', 'Quán bánh mì chảo tuyển phục vụ full-time, làm việc cả ngày. Có bữa ăn sáng miễn phí cho nhân viên.', '["Không yêu cầu kinh nghiệm","Sức khỏe tốt"]', '["Bao ăn","Cấp đồng phục","Lương ổn định hàng tháng"]', 'ONSITE', 'FULL_TIME', 1, 1, 'Quận Gò Vấp, TP. Hồ Chí Minh', NULL, 'MONTHLY', 6000000, 7000000, 'VND', 5, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 256, 0, 18, '2026-11-14 22:34:59', NULL, '2026-11-14 22:34:59', '2026-11-14 22:34:59', NULL),
       (5, 'job-005', 13, 1, 7, 'Tuyển pha chế trà sữa', 'Trà sữa Fozu tuyển barista part-time ca tối. Được đào tạo pha chế từ đầu nếu chưa có kinh nghiệm.', '["Từ 18 tuổi","Sẵn sàng làm ca tối"]', '["Đào tạo","Cấp đồng phục","Hoàn tiền đồ uống"]', 'ONSITE', 'PART_TIME', 1, 1, '256 Điện Biên Phủ, Bình Thạnh', NULL, 'HOURLY', 22000, 27000, 'VND', 6, 1, NULL, NULL, '2026-11-25 18:34:59', 'OPEN', NULL, NULL, NULL, 364, 1, 27, '2026-11-14 16:34:59', NULL, '2026-11-14 16:34:59', '2026-11-14 16:34:59', NULL),
       (6, 'job-006', 14, 3, 19, 'Nhân viên bán hàng ăn sáng hệ thống 1 phút 30 giây', 'Hệ thống ăn sáng 1 phút 30 giây cần nhân viên bán hàng làm ca sáng, ca trưa và ca tối theo thời gian linh hoạt.', '["Nhanh nhẹn tay","Chịu được ca sáng sớm"]', '["Bao ăn","Ca linh hoạt","Thưởng tháng"]', 'ONSITE', 'FLEXIBLE', 1, 2, 'Các chi nhánh quận 3, TP. Hồ Chí Minh', NULL, 'MONTHLY', 1500000, 4500000, 'VND', 15, 9, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 532, 0, 41, '2026-11-14 10:34:59', NULL, '2026-11-14 10:34:59', '2026-11-14 10:34:59', NULL),
       (7, 'job-007', 15, 1, 1, 'Phục Vụ nhà hàng Fine-Dining GEM Center', 'Nhà hàng fine-dining GEM Center tuyển phục vụ ca chiều cố định, thu nhập 8,9 – 10,3 triệu/tháng. Yêu cầu giao tiếp tốt.', '["Giao tiếp tốt","Có kinh nghiệm 1 năm trở lên"]', '["Bao ăn","Đào tạo nghiệp vụ","Lương ổn định"]', 'ONSITE', 'FULL_TIME', 1, 6, 'GEM Center, Quận 7, TP. Hồ Chí Minh', NULL, 'MONTHLY', 8900000, 10300000, 'VND', 4, 1, NULL, NULL, '2026-11-27 18:34:59', 'OPEN', NULL, NULL, NULL, 148, 0, 9, '2026-11-14 02:34:59', NULL, '2026-11-14 02:34:59', '2026-11-14 02:34:59', NULL),
       (8, 'job-008', 16, 1, 7, 'Trà sữa Koi Thé tuyển dụng', 'Koi Thé tuyển nhân viên pha chế và phục vụ, làm việc tại chuỗi. Đào tạo miễn phí, phát triển lên vị trí quản lý.', '["Có tinh thần cầu tiến","Sẵn sàng làm ca xoay"]', '["Đào tạo","Lộ trình thăng tiến","Bao ăn"]', 'ONSITE', 'FULL_TIME', 1, 1, 'Khu Thảo Điền, Quận 2, TP. Hồ Chí Minh', NULL, 'MONTHLY', 5000000, 7000000, 'VND', 12, 4, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 316, 0, 23, '2026-11-13 18:34:59', NULL, '2026-11-13 18:34:59', '2026-11-13 18:34:59', NULL),
       (9, 'job-009', 17, 1, 6, 'Tuyển nhân viên quán cafe Full và Part', 'John Coffee and Bakey tuyển cả nhân viên full-time và part-time. Cơ hội được đào tạo barista chuyên nghiệp.', '["Có kinh nghiệm pha chế là một plus"]', '["Đào tạo barista","Cấp đồng phục","Bao ăn"]', 'ONSITE', 'PART_TIME', 1, 1, '89 Phan Đình Phùng, Phú Nhuận', NULL, 'MONTHLY', 6000000, 8000000, 'VND', 10, 5, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 232, 0, 16, '2026-11-13 12:34:59', NULL, '2026-11-13 12:34:59', '2026-11-13 12:34:59', NULL),
       (10, 'job-010', 18, 1, 1, 'TUYỂN DỤNG PHỤC VỤ CHUỖI NHÀ HÀNG HÀN QUỐC KALBI MASTER', 'Kalbi Master tuyển dụng phục vụ chuỗi nhiều cơ sở. Làm việc theo ca xoay, hỗ trợ đi lại giữa các chi nhánh.', '["Có phương tiện đi lại","Làm việc được cuối tuần"]', '["Bao ăn","Cấp đồng phục","Thưởng KPI"]', 'ONSITE', 'FULL_TIME', 1, 1, 'Chuỗi Kalbi Master, Quận 1, TP. Hồ Chí Minh', NULL, 'MONTHLY', 8000000, 9500000, 'VND', 20, 11, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 388, 0, 29, '2026-11-13 06:34:59', NULL, '2026-11-13 06:34:59', '2026-11-13 06:34:59', NULL),
       (11, 'job-011', 19, 1, 1, 'TUYỂN PHỤC VỤ VÀ PHA CHẾ RUNAM PHÚ MỸ HƯNG', 'RuNam Cafe tuyển phục vụ và pha chế tại Phú Mỹ Hưng, làm việc ca sáng và ca chiều.', '["Nhanh nhẹn","Sẵn sàng làm ca sáng"]', '["Bao ăn","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 1, 6, 'Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh', NULL, 'MONTHLY', 7000000, 10000000, 'VND', 7, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 208, 0, 14, '2026-11-13 00:34:59', NULL, '2026-11-13 00:34:59', '2026-11-13 00:34:59', NULL),
       (12, 'job-012', 19, 1, 1, 'TUYỂN PHỤC VỤ VÀ PHA CHẾ RUNAM TRÀNG TIỀN PLAZA', 'RuNam Cafe chi nhánh Tràng Tiền Plaza tuyển nhân viên casual làm cuối tuần, phù hợp sinh viên.', '["Không yêu cầu kinh nghiệm"]', '["Bao ăn","Cấp đồng phục"]', 'ONSITE', 'FLEXIBLE', 1, 1, 'Tràng Tiền Plaza, Quận 1, TP. Hồ Chí Minh', NULL, 'MONTHLY', 7000000, 10000000, 'VND', 4, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 136, 0, 8, '2026-11-12 18:34:59', NULL, '2026-11-12 18:34:59', '2026-11-12 18:34:59', NULL),
       (13, 'job-013', 20, 1, NULL, '[TAM HẢO] Tuyển Nhân Viên Part - Time Quận 1', 'Hồng Trà Sữa Tam Hảo tuyển nhân viên part-time ca tối tại Quận 1. Mức lương 27 – 39k/giờ.', '["Nhanh nhẹn","Có thể làm 4 ca/tuần"]', '["Bao ăn","Đào tạo","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 1, 1, 'Hồng Trà Sữa Tam Hảo, Quận 1, TP. Hồ Chí Minh', NULL, 'HOURLY', 27000, 39000, 'VND', 6, 2, NULL, NULL, '2026-11-23 18:34:59', 'OPEN', NULL, NULL, NULL, 268, 0, 19, '2026-11-12 10:34:59', NULL, '2026-11-12 10:34:59', '2026-11-12 10:34:59', NULL),
       (14, 'job-014', 21, 1, 1, '[DÌ MAI LANDMARK 81] NHÂN VIÊN PHỤC VỤ PART TIME', 'D1 Concepts tuyển nhân viên phục vụ part-time tại Landmark 81, làm việc theo ca linh hoạt.', '["Ngoại hình, thân thiện"]', '["Bao ăn","Đào tạo","Cấp đồng phục"]', 'ONSITE', 'PART_TIME', 1, 1, 'Landmark 81, Bình Thạnh, TP. Hồ Chí Minh', NULL, 'HOURLY', 28000, 34000, 'VND', 9, 6, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 172, 0, 11, '2026-11-12 02:34:59', NULL, '2026-11-12 02:34:59', '2026-11-12 02:34:59', NULL),
       (15, 'job-015', 10, 2, 16, 'Nhân viên bếp phụ — Khu căn hộ Thủ Đức', 'Tuyển phụ bếp làm bếp phụ tại khu căn hộ Thủ Đức, làm việc ca sáng hoặc ca tối. Có thể ăn cơm tại chỗ.', '["Sức khỏe tốt","Chịu được nóng"]', '["Bao ăn","Cấp đồng phục","Lương ổn định"]', 'ONSITE', 'PART_TIME', 1, 1, 'Khu căn hộ Thủ Đức, TP. Hồ Chí Minh', NULL, 'HOURLY', 24000, 28000, 'VND', 6, 3, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 340, 0, 25, '2026-11-11 18:34:59', NULL, '2026-11-11 18:34:59', '2026-11-11 18:34:59', NULL),
       (16, 'job-016', 11, 2, 17, 'Tuyển thợ làm bánh part-time', 'Tiệm chè Táo Tào tuyển thợ làm bánh part-time khép kín, làm bánh trang trí và bánh ngọt theo thời gian vụ.', '["Có kinh nghiệm làm bánh","Tỉ mẩn"]', '["Đào tạo","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 1, 1, 'Tiệm Chè Táo Tào, Quận 1, TP. Hồ Chí Minh', NULL, 'HOURLY', 26000, 32000, 'VND', 3, 0, NULL, NULL, '2026-11-21 18:34:59', 'OPEN', NULL, NULL, NULL, 112, 1, 6, '2026-11-11 10:34:59', NULL, '2026-11-11 10:34:59', '2026-11-11 10:34:59', NULL),
       (17, 'job-017', 15, 2, 8, 'Tuyển bếp chính nhà hàng Việt', 'Nhà hàng IN Hospitality tuyển bếp chính, kinh nghiệm món Việt và món Á. Lương thỏa thuận theo kinh nghiệm.', '["Trên 2 năm kinh nghiệm","Chịu được áp lực cao điểm"]', '["Bao ăn","Lương ổn định","Môi trường làm việc chuyên nghiệp"]', 'ONSITE', 'FULL_TIME', 1, 6, 'GEM Center, Quận 7, TP. Hồ Chí Minh', NULL, 'NEGOTIABLE', 0, NULL, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 124, 0, 7, '2026-11-11 02:34:59', NULL, '2026-11-11 02:34:59', '2026-11-11 02:34:59', NULL),
       (18, 'job-018', 17, 3, 23, 'Thu ngân part-time chuỗi cà phê', 'Tuyển thu ngân part-time ca sáng và ca chiều, quen dùng phần mềm POS. Ưu tiên sinh viên khả năng làm việc ổn định.', '["Nhanh nhẹn tay","Cẩn thận với tiền mặt"]', '["Ca linh hoạt","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, 1, 'John Coffee and Bakey, Phú Nhuận', NULL, 'HOURLY', 26000, 30000, 'VND', 5, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 196, 0, 13, '2026-11-10 18:34:59', NULL, '2026-11-10 18:34:59', '2026-11-10 18:34:59', NULL),
       (19, 'job-019', 14, 3, 19, 'Nhân viên bán lẻ quần áo cuối tuần', 'Tuyển nhân viên bán lẻ part-time cuối tuần tại cửa hàng quần áo, tư vấn và sắp xếp sản phẩm.', '["Giao tiếp tốt","Thích làm việc cuối tuần"]', '["Ca linh hoạt","Thưởng doanh số"]', 'ONSITE', 'FLEXIBLE', 1, 4, 'Quận 5, TP. Hồ Chí Minh', NULL, 'DAILY', 180000, 220000, 'VND', 8, 4, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 160, 0, 10, '2026-11-10 08:34:59', NULL, '2026-11-10 08:34:59', '2026-11-10 08:34:59', NULL),
       (20, 'job-020', 10, 4, 26, 'Giao hàng part-time khu vực Thủ Đức', 'Tuyển tài xế giao hàng part-time, xe máy, ưu tiên sinh viên có xe. Công việc linh hoạt theo khung giờ bạn chọn.', '["Có xe máy","Có CCCD gắn chip"]', '["Ca linh hoạt","Thưởng giao nhiều","Hỗ trợ xăng"]', 'ONSITE', 'PART_TIME', 1, 1, 'Khu vực Thủ Đức, TP. Hồ Chí Minh', NULL, 'HOURLY', 25000, 32000, 'VND', 20, 7, NULL, NULL, '2026-11-30 18:34:59', 'OPEN', NULL, NULL, NULL, 436, 0, 33, '2026-11-09 22:34:59', NULL, '2026-11-09 22:34:59', '2026-11-09 22:34:59', NULL),
       (21, 'job-021', 21, 4, 26, 'Giao hàng thuê xe — Khu vực trung tâm', 'Tuyển giao hàng thuê xe máy, làm theo ca 4 tiếng. Không yêu cầu kinh nghiệm, hướng dẫn cảnh giác giao hàng.', '["Có xe máy","Làm việc được 2 ca/tuần"]', '["Ca linh hoạt","Hỗ trợ xăng","Không yêu cầu kinh nghiệm"]', 'ONSITE', 'FLEXIBLE', 1, 1, 'Quận 1, TP. Hồ Chí Minh', NULL, 'HOURLY', 23000, 27000, 'VND', 30, 18, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 580, 0, 45, '2026-11-09 12:34:59', NULL, '2026-11-09 12:34:59', '2026-11-09 12:34:59', NULL),
       (22, 'job-022', 20, 5, 33, 'Chuyên viên content marketing part-time', 'Tuyển content marketing part-time viết bài mạng xã hội và chuẩn bị nội dung chiến dịch. Ưu tiên sinh viên khối kinh tế/marketing.', '["Viết tốt","Biết Canva hoặc Photoshop cơ bản"]', '["Làm việc linh hoạt","Cơ hội làm dự án thực tập"]', 'HYBRID', 'PART_TIME', 2, 18, 'Dịch Vọng, Cầu Giấy, Hà Nội', NULL, 'MONTHLY', 2500000, 4000000, 'VND', 4, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 304, 0, 22, '2026-11-09 02:34:59', NULL, '2026-11-09 02:34:59', '2026-11-09 02:34:59', NULL),
       (23, 'job-023', 19, 5, 19, 'Nhân viên livestream bán hàng', 'Tuyển nhân viên livestream bán hàng part-time, ca tối. Ưu tiên bạn tự tin trước camera.', '["Tự tin giao tiếp","Có kinh nghiệm livestream là một plus"]', '["Đào tạo","Hoàn tiền sản phẩm"]', 'ONSITE', 'PART_TIME', 1, 6, 'Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh', NULL, 'HOURLY', 25000, 30000, 'VND', 3, 0, NULL, NULL, '2026-11-19 18:34:59', 'OPEN', NULL, NULL, NULL, 148, 1, 9, '2026-11-08 16:34:59', NULL, '2026-11-08 16:34:59', '2026-11-08 16:34:59', NULL),
       (24, 'job-024', 16, 5, 31, 'Thực tập sinh Marketing — Đà Nẵng', 'Cơ hội thực tập sinh Marketing tại văn phòng Đà Nẵng, hỗ trợ chiến dịch và xây dựng nội dung.', '["Sinh viên năm 3 trở lên","Thích nghiên cứu thị trường"]', '["Đào tạo","Công trình 1 năm","Môi trường làm việc sáng tạo"]', 'ONSITE', 'FULL_TIME', 3, 30, 'Quận Hải Châu, Đà Nẵng', NULL, 'MONTHLY', 3000000, 4000000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 412, 0, 31, '2026-11-08 06:34:59', NULL, '2026-11-08 06:34:59', '2026-11-08 06:34:59', NULL),
       (25, 'job-025', 15, 6, 34, 'Nhân viên văn phòng part-time — Quận 1', 'Tuyển nhân viên hỗ trợ văn phòng part-time, nhập liệu, sắp xếp hồ sơ và hỗ trợ lịch họp.', '["Thành thạo Excel","Tiếng Anh giao tiếp cơ bản"]', '["Môi trường văn phòng","Ca linh hoạt","Cơ hội thực tập dài hạn"]', 'HYBRID', 'PART_TIME', 1, 1, 'GEM Center, Quận 7, TP. Hồ Chí Minh', NULL, 'MONTHLY', 2500000, 3500000, 'VND', 2, 0, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 220, 0, 15, '2026-11-07 20:34:59', NULL, '2026-11-07 20:34:59', '2026-11-07 20:34:59', NULL),
       (26, 'job-026', 17, 6, 30, 'Trợ lý đến hàng quán cà phê', 'Tuyển nhân viên trợ lý buổi sáng: rửa dụng cụ, sắp xếp kho, hỗ trợ pha chế sơ bộ.', '["Cẩn thận","Không yêu cầu kinh nghiệm"]', '["Bao ăn","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, 1, 'John Coffee and Bakey, Phú Nhuận', NULL, 'HOURLY', 22000, 24000, 'VND', 4, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 184, 0, 12, '2026-11-07 10:34:59', NULL, '2026-11-07 10:34:59', '2026-11-07 10:34:59', NULL),
       (27, 'job-027', 16, 7, 37, 'Gia sư Toán cấp THPT — Hà Nội', 'Tuyển gia sư Toán lớp 10–12 dạy online hoặc tại nhà, 2 buổi/tuần, 90 phút/buổi.', '["Điểm Toán từ 8 trở lên","Kiên nhẫn, truyền đạt tốt"]', '["Ca linh hoạt","Thu nhập cao","Hỗ trợ tài liệu"]', 'HYBRID', 'FLEXIBLE', 2, 18, 'Dịch Vọng, Cầu Giấy, Hà Nội', NULL, 'HOURLY', 120000, 180000, 'VND', 5, 2, NULL, NULL, '2026-12-05 18:34:59', 'OPEN', NULL, NULL, NULL, 244, 0, 17, '2026-11-07 00:34:59', NULL, '2026-11-07 00:34:59', '2026-11-07 00:34:59', NULL),
       (28, 'job-028', 11, 7, 39, 'Trợ giảng Tiếng Anh cho sinh viên', 'Trung tâm tuyển trợ giảng tiếng Anh giao tiếp cho sinh viên, làm việc tối và cuối tuần.', '["IELTS 6.0 trở lên","Nói rõ ràng"]', '["Đào tạo","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 1, 2, 'Quận 3, TP. Hồ Chí Minh', NULL, 'HOURLY', 80000, 120000, 'VND', 3, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 136, 0, 8, '2026-11-06 14:34:59', NULL, '2026-11-06 14:34:59', '2026-11-06 14:34:59', NULL),
       (29, 'job-029', 21, 8, 40, 'Kiểm thử phần mềm thực tập — remote', 'Tuyển kiểm thử thực tập làm remote, ghi nhận lỗi và viết test case. Phù hợp sinh viên CNTT.', '["Kiến thức cơ bản về test","Cẩn thận, chi tiết"]', '["Làm việc remote","Công trình thực tập","Mentor hướng dẫn"]', 'REMOTE', 'PART_TIME', 2, 18, 'Làm việc từ xa', NULL, 'MONTHLY', 3000000, 4500000, 'VND', 3, 0, NULL, NULL, '2026-12-10 18:34:59', 'OPEN', NULL, NULL, NULL, 268, 0, 19, '2026-11-06 04:34:59', NULL, '2026-11-06 04:34:59', '2026-11-06 04:34:59', NULL),
       (30, 'job-030', 21, 8, 41, 'Lập trình viên React thực tập', 'Tuyển lập trình viên React thực tập làm sản phẩm thật, mentor review code hằng tuần.', '["Nắm vững React và TypeScript","Có portfolio hoặc project cá nhân"]', '["Công trình thực tập","Mentor 1-1","Làm việc hybrid"]', 'HYBRID', 'FULL_TIME', 1, 6, 'Landmark 81, Bình Thạnh, TP. Hồ Chí Minh', NULL, 'MONTHLY', 5000000, 7000000, 'VND', 2, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 208, 0, 14, '2026-11-05 18:34:59', NULL, '2026-11-05 18:34:59', '2026-11-05 18:34:59', NULL),
       (31, 'job-031', 14, 3, 23, 'Thu ngân ca đêm — Cần Thơ', 'Cửa hàng tuyển thu ngân ca đêm, làm 22h–06h, thưởng theo ca.', '["Cẩn thận xử lý tiền mặt"]', '["Thưởng ca","Ca linh hoạt"]', 'ONSITE', 'FLEXIBLE', 4, 33, 'Quận Ninh Kiều, Cần Thơ', NULL, 'HOURLY', 24000, 28000, 'VND', 2, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 112, 0, 6, '2026-11-05 08:34:59', NULL, '2026-11-05 08:34:59', '2026-11-05 08:34:59', NULL),
       (32, 'job-032', 19, 1, 1, 'Phục vụ quán cà phê — Bình Dương', 'Tuyển phục vụ quán cà phê tại Bình Dương, làm ca sáng và ca chiều, gần khu công nghiệp.', '["Không yêu cầu kinh nghiệm"]', '["Bao ăn","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 5, 35, 'Thủ Dầu Một, Bình Dương', NULL, 'HOURLY', 21000, 24000, 'VND', 6, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 172, 0, 11, '2026-11-04 22:34:59', NULL, '2026-11-04 22:34:59', '2026-11-04 22:34:59', NULL),
       (33, 'job-033', 16, 2, 10, 'Bếp nóng part-time nhà hàng Đà Nẵng', 'Nhà hàng tuyển bếp nóng part-time, làm ca tối cuối tuần. Hỗ trợ ăn ca.', '["Có kinh nghiệm bếp nóng"]', '["Bao ăn","Cấp đồng phục"]', 'ONSITE', 'PART_TIME', 3, 30, 'Ngũ Hành Sơn, Đà Nẵng', NULL, 'HOURLY', 25000, 30000, 'VND', 3, 0, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 100, 0, 5, '2026-11-04 12:34:59', NULL, '2026-11-04 12:34:59', '2026-11-04 12:34:59', NULL),
       (34, 'job-034', 10, 4, 26, 'Giao hàng xe máy — Đắk Lắk', 'Tuyển giao hàng xe máy khu vực Đắk Lắk, ca buổi sáng và chiều tối.', '["Có xe máy","Có CCCD gắn chip"]', '["Hỗ trợ xăng","Ca linh hoạt"]', 'ONSITE', 'PART_TIME', 6, 37, 'Buôn Ma Thuột, Đắk Lắk', NULL, 'DAILY', 170000, 210000, 'VND', 4, 1, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 148, 0, 9, '2026-11-04 02:34:59', NULL, '2026-11-04 02:34:59', '2026-11-04 02:34:59', NULL),
       (35, 'job-035', 11, 5, 31, 'Nhân viên marketing thực tập — remote', 'Thực tập marketing làm remote 20 giờ/tuần, hỗ trợ email marketing và SEO cơ bản.', '["Tiếng Anh đọc tốt","Chịu được deadline"]', '["Làm việc remote","Công trình thực tập","Mentor hướng dẫn"]', 'REMOTE', 'PART_TIME', 1, 1, 'Làm việc từ xa', NULL, 'MONTHLY', 2000000, 3000000, 'VND', 2, 0, NULL, NULL, '2026-12-03 18:34:59', 'OPEN', NULL, NULL, NULL, 328, 0, 24, '2026-11-03 16:34:59', NULL, '2026-11-03 16:34:59', '2026-11-03 16:34:59', NULL),
       (36, 'job-036', 20, 3, 19, 'Bán hàng trực tuyến — CSKH Facebook', 'Tuyển nhân viên chốt đơn hàng online qua Fanpage, trả lời tin nhắn và tư vấn sản phẩm.', '["Dùng thành thạo Facebook","Văn bản tốt"]', '["Làm việc tại nhà","Ca linh hoạt","Thưởng đơn hàng"]', 'REMOTE', 'FLEXIBLE', 1, 2, 'Làm việc từ xa', NULL, 'MONTHLY', 2500000, 4500000, 'VND', 6, 3, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 364, 0, 27, '2026-11-03 06:34:59', NULL, '2026-11-03 06:34:59', '2026-11-03 06:34:59', NULL),
       (37, 'job-037', 15, 6, 30, 'Trợ lý sự kiện — setup tiệc cưới', 'Tuyển trợ lý sự kiện setup bàn ghế, trang trí và phục vụ tại tiệc cưới cuối tuần.', '["Khỏe, thích vận động","Làm việc được cuối tuần"]', '["Thưởng theo sự kiện","Cơ hội nhận thêm sự kiện"]', 'ONSITE', 'FLEXIBLE', 1, 1, 'Bình Thạnh, TP. Hồ Chí Minh', NULL, 'DAILY', 200000, 260000, 'VND', 10, 4, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 196, 0, 13, '2026-11-02 20:34:59', NULL, '2026-11-02 20:34:59', '2026-11-02 20:34:59', NULL),
       (38, 'job-038', 16, 8, 41, 'Kỹ sư phần mềm thực tập — Hà Nội', 'Tuyển kỹ sư phần mềm thực tập hỗ trợ phát triển tính năng, làm việc hybrid 3 ngày/tuần.', '["Biết Git","Có kinh nghiệm project trường"]', '["Công trình thực tập","Mentor hướng dẫn","Cơ hội full-time"]', 'HYBRID', 'FULL_TIME', 2, 18, 'Bách Khoa, Đống Đa, Hà Nội', NULL, 'MONTHLY', 6000000, 8000000, 'VND', 2, 0, NULL, NULL, '2026-12-15 18:34:59', 'OPEN', NULL, NULL, NULL, 232, 0, 16, '2026-11-02 10:34:59', NULL, '2026-11-02 10:34:59', '2026-11-02 10:34:59', NULL),
       (39, 'job-039', 21, 7, 39, 'Phiên dịch viên event — Đà Nẵng', 'Cần phiên dịch viên Anh–Việt cho sự kiện ngày 1 ngày, làm việc theo ca.', '["Tiếng Anh tốt","Nói trước đám đông"]', '["Công trình theo sự kiện","Đào tạo"]', 'ONSITE', 'FLEXIBLE', 3, 30, 'Sơn Trà, Đà Nẵng', NULL, 'DAILY', 500000, 700000, 'VND', 1, 0, NULL, NULL, '2026-11-20 18:34:59', 'OPEN', NULL, NULL, NULL, 88, 0, 4, '2026-11-02 00:34:59', NULL, '2026-11-02 00:34:59', '2026-11-02 00:34:59', NULL),
       (40, 'job-040', 14, 6, 28, 'Nhân viên bảo vệ ca đêm — Cần Thơ', 'Tuyển nhân viên bảo vệ ca đêm tại kho hàng, làm 22h–06h, hỗ trợ cơm đêm.', '["Có sức khỏe","Cẩn thận, không sơ suất"]', '["Bao ăn","Thưởng ca đêm"]', 'ONSITE', 'FLEXIBLE', 4, 33, 'Cái Răng, Cần Thơ', NULL, 'DAILY', 220000, 260000, 'VND', 3, 2, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 124, 0, 7, '2026-11-01 14:34:59', NULL, '2026-11-01 14:34:59', '2026-11-01 14:34:59', NULL),
       (41, 'job-demo-001', 2, 1, 1, 'Nhân viên phục vụ part-time — Quận 1', 'Công ty Cổ phần VieJob Demo cần nhân viên phục vụ làm thêm cuối tuần tại cửa hàng. Công việc đơn giản, được đào tạo bài bản, phù hợp sinh viên làm thêm.', '["Không yêu cầu kinh nghiệm","Ngoại hình gọn gàng","Cởi mở trong giao tiếp"]', '["Bao ăn","Cấp đồng phục","Ca linh hoạt","Đào tạo"]', 'ONSITE', 'PART_TIME', 1, 1, '123 Nguyễn Huệ, Bến Nghé, Quận 1', 'Chi nhánh trung tâm', 'HOURLY', 28000, 35000, 'VND', 5, 2, NULL, NULL, '2026-11-25 18:34:59', 'OPEN', NULL, NULL, NULL, 184, 1, 12, '2026-11-14 22:34:59', NULL, '2026-11-14 22:34:59', '2026-11-14 22:34:59', NULL),
       (42, 'job-demo-002', 2, 3, 24, 'Nhân viên lễ tân — Hà Nội', 'Tuyển nhân viên lễ tân part-time tại văn phòng công ty. Giao tiếp tiếng Anh tốt là một lợi thế.', '["Tiếng Anh giao tiếp tốt","Cẩn thận, thân thiện"]', '["Bàn làm việc riêng","Cà phê miễn phí","Đào tạo nghiệp vụ"]', 'ONSITE', 'PART_TIME', 2, 18, '28 Mai Dương, Cầu Giấy, Hà Nội', NULL, 'HOURLY', 25000, 30000, 'VND', 2, 0, NULL, NULL, '2026-11-29 18:34:59', 'OPEN', NULL, NULL, NULL, 96, 0, 6, '2026-11-13 14:34:59', NULL, '2026-11-13 14:34:59', '2026-11-13 14:34:59', NULL),
       (43, 'job-demo-003', 2, 5, 31, 'Thực tập sinh Marketing — Remote', 'Cơ hội thực tập sinh bộ phận marketing làm việc remote, hỗ trợ chạy chiến dịch mạng xã hội và sản xuất nội dung.', '["Đang là sinh viên","Biết Canva/Photoshop cơ bản","Viết content tốt"]', '["Làm remote","Có mentor hướng dẫn","Thương hiệu trong CV"]', 'REMOTE', 'PART_TIME', 1, 1, 'Văn phòng điện tử, Bình Thạnh, TP.HCM', NULL, 'MONTHLY', 4000000, 6000000, 'VND', 3, 1, NULL, NULL, '2026-12-05 18:34:59', 'OPEN', NULL, NULL, NULL, 342, 0, 28, '2026-11-11 18:34:59', NULL, '2026-11-11 18:34:59', '2026-11-11 18:34:59', NULL),
       (44, 'job-demo-004', 2, 7, 37, 'Gia sư Toán cấp THPT — Đang chờ duyệt', 'Cần gia sư Toán cho học sinh lớp 10-12, dạy tại nhà hoặc online. Ưu tiên sinh viên Sư phạm Toán.', '["Sinh viên Sư phạm Toán hoặc khá môn Toán","Kiên nhẫn, truyền đạt tốt"]', '["Ca linh hoạt","Học bổng theo buổi"]', 'HYBRID', 'FLEXIBLE', 2, 18, 'Chung cư Vũ Vi, Đống Đa, Hà Nội', NULL, 'HOURLY', 80000, 120000, 'VND', 4, 0, NULL, NULL, '2026-12-10 18:34:59', 'PENDING_REVIEW', NULL, NULL, NULL, 12, 0, 0, '2026-11-15 13:34:59', NULL, '2026-11-15 13:34:59', '2026-11-15 13:34:59', NULL),
       (45, 'job-demo-005', 2, 3, 23, 'Nhân viên thu ngân ca đêm — Đã đóng', 'Tuyển nhân viên thu ngân ca đêm cho cửa hàng tiện lợi. Đã đủ người, tin tuyển dụng đã đóng.', '["Cẩn thận xử lý tiền mặt","Làm ca đêm sức khỏe tốt"]', '["Phụ cấp ca đêm","Cơm đêm"]', 'ONSITE', 'PART_TIME', 1, 1, '585 Đường Âu Cơ, Tân Bình, TP.HCM', NULL, 'HOURLY', 32000, 38000, 'VND', 2, 2, NULL, NULL, NULL, 'CLOSED', NULL, NULL, NULL, 210, 0, 19, '2026-11-06 14:34:59', '2026-11-06 14:34:59', '2026-11-06 14:34:59', '2026-11-06 14:34:59', NULL);

-- 13. CA LÀM VIỆC
INSERT INTO job_post_schedules (job_post_id, day_of_week, start_time, end_time) VALUES
       (1, 7, '05:00', '15:00'),
       (2, 6, '17:00', '01:00'),
       (3, 6, '08:00', '14:00'),
       (3, 7, '08:00', '14:00'),
       (4, 2, '06:00', '14:00'),
       (4, 3, '06:00', '14:00'),
       (5, 5, '17:00', '23:00'),
       (5, 6, '17:00', '23:00'),
       (6, 1, '06:00', '11:00'),
       (6, 5, '16:00', '21:00'),
       (7, 4, '14:00', '22:00'),
       (7, 5, '14:00', '22:00'),
       (8, 3, '08:00', '16:00'),
       (8, 4, '08:00', '16:00'),
       (9, 6, '07:00', '15:00'),
       (9, 7, '07:00', '15:00'),
       (10, 4, '15:00', '23:00'),
       (10, 7, '15:00', '23:00'),
       (11, 2, '07:00', '13:00'),
       (11, 6, '13:00', '19:00'),
       (12, 6, '10:00', '18:00'),
       (13, 5, '17:00', '23:00'),
       (13, 6, '17:00', '23:00'),
       (14, 3, '16:00', '22:00'),
       (15, 2, '06:00', '12:00'),
       (15, 6, '17:00', '23:00'),
       (16, 4, '08:00', '14:00'),
       (16, 5, '08:00', '14:00'),
       (17, 2, '10:00', '18:00'),
       (17, 3, '10:00', '18:00'),
       (18, 2, '07:00', '13:00'),
       (18, 4, '13:00', '19:00'),
       (19, 6, '09:00', '18:00'),
       (19, 7, '09:00', '18:00'),
       (20, 3, '16:00', '21:00'),
       (20, 6, '10:00', '16:00'),
       (21, 2, '18:00', '22:00'),
       (21, 5, '18:00', '22:00'),
       (22, 2, '09:00', '12:00'),
       (22, 6, '09:00', '12:00'),
       (23, 6, '19:00', '23:00'),
       (24, 1, '09:00', '18:00'),
       (25, 3, '13:00', '18:00'),
       (25, 5, '13:00', '18:00'),
       (26, 2, '06:30', '11:30'),
       (26, 3, '06:30', '11:30'),
       (27, 7, '09:00', '12:00'),
       (28, 4, '18:00', '21:00'),
       (28, 6, '14:00', '17:00'),
       (29, 1, '09:00', '17:00'),
       (29, 3, '09:00', '17:00'),
       (30, 1, '09:00', '18:00'),
       (30, 5, '09:00', '18:00'),
       (31, 7, '22:00', '06:00'),
       (32, 2, '06:30', '12:30'),
       (33, 5, '17:00', '23:00'),
       (33, 7, '17:00', '23:00'),
       (34, 1, '07:00', '12:00'),
       (34, 5, '16:00', '21:00'),
       (35, 6, '09:00', '14:00'),
       (36, 4, '20:00', '23:00'),
       (36, 7, '09:00', '12:00'),
       (37, 6, '16:00', '23:00'),
       (38, 2, '09:00', '18:00'),
       (38, 3, '09:00', '18:00'),
       (39, 6, '08:00', '18:00'),
       (40, 1, '22:00', '06:00'),
       (41, 6, '17:00', '23:00'),
       (41, 7, '10:00', '18:00'),
       (42, 1, '09:00', '13:00'),
       (42, 3, '13:00', '18:00'),
       (43, 2, '19:00', '22:00'),
       (43, 4, '19:00', '22:00'),
       (44, 6, '14:00', '17:00'),
       (45, 6, '22:00', '06:00');

-- 14. KỸ NĂNG CỦA TIN TUYỂN DỤNG
INSERT INTO job_post_skills (job_post_id, skill_id) VALUES
       (1, 2),
       (2, 2),
       (3, 1),
       (3, 2),
       (4, 2),
       (5, 1),
       (6, 4),
       (6, 2),
       (7, 2),
       (8, 1),
       (8, 2),
       (9, 1),
       (10, 2),
       (11, 2),
       (11, 1),
       (12, 2),
       (13, 1),
       (13, 2),
       (14, 2),
       (15, 3),
       (16, 3),
       (17, 3),
       (18, 4),
       (19, 4),
       (20, 5),
       (21, 5),
       (22, 6),
       (23, 6),
       (24, 6),
       (24, 7),
       (25, 7),
       (26, 2),
       (27, 8),
       (28, 8),
       (29, 9),
       (30, 9),
       (31, 4),
       (32, 2),
       (33, 3),
       (34, 5),
       (35, 6),
       (35, 7),
       (36, 4),
       (37, 2),
       (38, 9),
       (39, 8),
       (40, 2),
       (41, 2),
       (41, 1),
       (42, 4),
       (43, 6),
       (43, 7),
       (44, 8),
       (45, 4);

-- 15. ĐƠN ỨNG TUYỂN
INSERT INTO applications (id, slug, job_post_id, student_id, cover_letter, expected_salary, status, employer_note, reject_reason, experience, available_from, cv_url, cv_file_name, applied_at, reviewed_at, decided_at, updated_at) VALUES
       (1, 'app-001', 1, 1, 'Em chào anh/chị, em đang là sinh viên năm 3 và muốn làm thêm để rèn kinh nghiệm phục vụ. Em có 1 năm làm phục vụ tại quán cà phê nên quen với việc đón khách và pha chế cơ bản. Em sẵn sàng làm ca sáng như tin đăng.', 62000, 'ACCEPTED', 'Đã liên hệ xác nhận lịch ca sáng.', NULL, '', NULL, 'https://viejob.vn/cv/nguyen-thanh-ha.pdf', 'CV_NguyenThanhHa.pdf', '2026-11-12 18:34:59', '2026-11-15 12:34:59', '2026-11-15 12:34:59', '2026-11-15 12:34:59'),
       (2, 'app-002', 41, 1, 'Em xin ứng tuyển vị trí phục vụ part-time cuối tuần. Em có kinh nghiệm phục vụ tại Táo Tào và luôn cười tươi, thân thiện với khách.', 32000, 'SHORTLISTED', 'Hồ sơ tốt, mời phỏng vấn nhanh.', NULL, '', NULL, 'https://viejob.vn/cv/nguyen-thanh-ha.pdf', 'CV_NguyenThanhHa.pdf', '2026-11-14 22:34:59', '2026-11-15 14:34:59', '2026-11-15 14:34:59', '2026-11-15 14:34:59'),
       (3, 'app-003', 43, 1, 'Em muốn thử sức ở mảng marketing để mở rộng kiến thức ngoài chuyên ngành.', 5000000, 'PENDING', NULL, NULL, '', NULL, 'https://viejob.vn/cv/nguyen-thanh-ha.pdf', 'CV_NguyenThanhHa.pdf', '2026-11-15 10:34:59', '2026-11-15 10:34:59', '2026-11-15 10:34:59', '2026-11-15 10:34:59'),
       (4, 'app-004', 43, 4, 'Em là sinh viên Marketing năm 4, đã quen với Canva, CapCut và viết content bán hàng. Em muốn được làm việc thật để hoàn thiện portfolio.', 5000000, 'VIEWED', NULL, NULL, '', NULL, NULL, NULL, '2026-11-14 12:34:59', '2026-11-15 08:34:59', '2026-11-15 08:34:59', '2026-11-15 08:34:59'),
       (5, 'app-005', 43, 5, 'Em thấy vị trí này phù hợp với kỹ năng của em. Em có thể hỗ trợ phần landing page và tracking.', 4500000, 'ACCEPTED', 'Đã nhận, bắt đầu từ tuần sau.', NULL, '', NULL, 'https://viejob.vn/cv/pham-duc-binh.pdf', 'CV_PhamDucBinh.pdf', '2026-11-12 18:34:59', '2026-11-15 13:34:59', '2026-11-15 13:34:59', '2026-11-15 13:34:59'),
       (6, 'app-006', 42, 6, 'Em là sinh viên năm 2, muốn làm thêm lễ tân để cải thiện giao tiếp.', 27000, 'REJECTED', 'Vị trí đã tuyển đủ, cảm ơn bạn đã ứng tuyển.', NULL, '', NULL, NULL, NULL, '2026-11-10 18:34:59', '2026-11-13 18:34:59', '2026-11-13 18:34:59', '2026-11-13 18:34:59'),
       (7, 'app-007', 45, 8, 'Em muốn làm ca đêm để kiếm thêm thu nhập.', 35000, 'COMPLETED', 'Đã làm xong 2 ca, trả lương đúng hẹn.', NULL, '', NULL, NULL, NULL, '2026-11-02 18:34:59', '2026-11-10 18:34:59', '2026-11-10 18:34:59', '2026-11-10 18:34:59');

-- 16. LỊCH SỬ TRẠNG THÁI ĐƠN ỨNG TUYỂN
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, changed_at) VALUES
       (1, NULL, 'PENDING', 1, NULL, '2026-11-12 18:34:59'),
       (1, 'PENDING', 'VIEWED', 10, NULL, '2026-11-13 18:34:59'),
       (1, 'VIEWED', 'SHORTLISTED', 10, 'Hồ sơ phù hợp yêu cầu', '2026-11-14 12:34:59'),
       (1, 'SHORTLISTED', 'ACCEPTED', 10, 'Đã nhận vào làm ca sáng 21/11', '2026-11-15 12:34:59'),
       (2, NULL, 'PENDING', 1, NULL, '2026-11-14 22:34:59'),
       (2, 'PENDING', 'VIEWED', 2, NULL, '2026-11-15 06:34:59'),
       (2, 'VIEWED', 'SHORTLISTED', 2, 'Mời phỏng vấn nhanh', '2026-11-15 14:34:59'),
       (3, NULL, 'PENDING', 1, NULL, '2026-11-15 10:34:59'),
       (4, NULL, 'PENDING', 4, NULL, '2026-11-14 12:34:59'),
       (4, 'PENDING', 'VIEWED', 2, NULL, '2026-11-15 08:34:59'),
       (5, NULL, 'PENDING', 5, NULL, '2026-11-12 20:34:59'),
       (5, 'PENDING', 'VIEWED', 2, NULL, '2026-11-13 16:34:59'),
       (5, 'VIEWED', 'SHORTLISTED', 2, 'Kỹ năng phù hợp', '2026-11-14 16:34:59'),
       (5, 'SHORTLISTED', 'ACCEPTED', 2, 'Đã nhận', '2026-11-15 13:34:59'),
       (6, NULL, 'PENDING', 6, NULL, '2026-11-10 18:34:59'),
       (6, 'PENDING', 'VIEWED', 2, NULL, '2026-11-11 14:34:59'),
       (6, 'VIEWED', 'REJECTED', 2, 'Đã tuyển đủ', '2026-11-13 06:34:59'),
       (7, NULL, 'PENDING', 8, NULL, '2026-11-03 06:34:59'),
       (7, 'PENDING', 'VIEWED', 2, NULL, '2026-11-04 02:34:59'),
       (7, 'VIEWED', 'ACCEPTED', 2, 'Đã nhận', '2026-11-04 22:34:59'),
       (7, 'ACCEPTED', 'COMPLETED', 2, 'Hoàn thành công việc', '2026-11-10 18:34:59');

-- 17. ĐÁNH GIÁ 2 CHIỀU
INSERT INTO reviews (id, slug, application_id, job_id, reviewer_id, reviewee_id, reviewer_role, target_type, from_name, from_avatar_url, target_name, rating, comment, reply, is_hidden, created_at) VALUES
       (1, 'rev-001', 1, 1, 1, 2, 'STUDENT', 'EMPLOYER', 'Nguyễn Thanh Hà', NULL, 'VieJob Demo Company', 5, 'Công ty rất chuẩn bị, bao cơm đầy đủ và trả lương đúng hẹn. Xe đưa đón cũng đúng giờ. Sẽ giới thiệu cho bạn bè.', 'Cảm ơn Hà đã đồng hành cùng chúng tôi!', 0, '2026-11-13 18:34:59'),
       (2, 'rev-002', 5, 43, 2, 5, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Phạm Đức Bình', 5, 'Bình làm việc rất chuyên nghiệp, tự tra cứu và chủ động hỏi khi chưa rõ. Rất hài lòng.', NULL, 0, '2026-11-11 18:34:59'),
       (3, 'rev-003', 7, 45, 8, 2, 'STUDENT', 'EMPLOYER', 'Lê Ngọc Mai', NULL, 'VieJob Demo Company', 4, 'Môi trường làm việc thân thiện, hướng dẫn rõ ràng. Điểm trừ là ca đêm hơi mệt.', NULL, 0, '2026-11-11 18:34:59'),
       (4, 'rev-004', 6, 42, 2, 6, 'EMPLOYER', 'STUDENT', 'Trần Minh Khoa', NULL, 'Phạm Ngọc Linh', 4, 'Ứng viên nhanh nhẹn, đúng giờ. Mong được hợp tác thêm lâu dài.', NULL, 0, '2026-11-13 18:34:59'),
       (5, 'rev-005', NULL, NULL, 4, 2, 'STUDENT', 'EMPLOYER', 'Nguyễn Thị Hoa', NULL, 'VieJob Demo Company', 1, 'Quảng cáo sai mức lương, rất thất vọng. Tệp nhất mà tôi từng ứng tuyển!', NULL, 1, '2026-11-14 18:34:59');

-- 18. THÔNG BÁO
INSERT INTO notifications (id, slug, user_id, type, title, body, content, ref_type, ref_id, is_read, read_at, link, created_at) VALUES
       (1, 'ntf-001', 1, 'APPLICATION_STATUS', 'Hồ sơ của bạn đã được nhận', 'Nhà tuyển dụng VieJob Demo Company đã nhận hồ sơ ứng tuyển cho vị trí Nhân viên phục vụ part-time.', NULL, NULL, NULL, 0, NULL, '/student/applications/app-002', '2026-11-15 14:34:59'),
       (2, 'ntf-002', 1, 'APPLICATION', 'Có tin tuyển dụng mới phù hợp', 'Nhân viên lễ tân — Hà Nội phù hợp với mục tiêu việc làm của bạn.', NULL, NULL, NULL, 0, NULL, '/jobs/job-demo-002', '2026-11-14 16:34:59'),
       (3, 'ntf-003', 1, 'REVIEW', 'Hãy đánh giá trải nghiệm làm việc', 'Bạn đã hoàn thành công việc. Đánh giá giúp nhà tuyển dụng cải thiện trải nghiệm tuyển dụng.', NULL, NULL, NULL, 1, '2026-11-10 18:34:59', '/student/applications', '2026-11-10 18:34:59'),
       (4, 'ntf-004', 1, 'SYSTEM', 'Hoàn thiện hồ sơ để tăng cơ hội ứng tuyển', 'Hồ sơ của bạn đang thiếu ảnh đại diện và CV. Hoàn thiện hồ sơ giúp bạn nổi bật hơn.', NULL, NULL, NULL, 0, NULL, '/student/profile', '2026-11-12 18:34:59'),
       (5, 'ntf-005', 2, 'APPLICATION', '3 hồ sơ mới chờ bạn xem xét', 'Có 3 ứng viên mới ứng tuyển vào vị trí Thực tập sinh Marketing — Remote.', NULL, NULL, NULL, 0, NULL, '/employer/applications', '2026-11-15 10:34:59'),
       (6, 'ntf-006', 2, 'JOB', 'Tin tuyển dụng đã được duyệt', 'Tin "Gia sư Toán cấp THPT — Đang chờ duyệt" đã được quản trị viên duyệt.', NULL, NULL, NULL, 1, '2026-11-14 18:34:59', '/employer/jobs', '2026-11-14 18:34:59');

-- 19. TIN ĐÃ LƯU
INSERT INTO saved_jobs (id, slug, student_id, job_post_id, created_at) VALUES
       (1, 'saved-001', 1, 3, '2026-11-15 18:34:59'),
       (2, 'saved-002', 1, 43, '2026-11-15 18:34:59');

-- 20. XẾP HẠNG LƯƠNG THEO NGÀNH × TỈNH
INSERT INTO salary_benchmarks (category_id, province_id, avg_hourly, min_hourly, max_hourly, sample_size, updated_at) VALUES
       (1, 1, 29000, 22000, 62000, 412, '2026-11-01 00:00:00'),
       (2, 1, 31000, 24000, 58000, 187, '2026-11-01 00:00:00'),
       (3, 1, 27000, 20000, 45000, 268, '2026-11-01 00:00:00'),
       (4, 1, 26000, 21000, 40000, 203, '2026-11-01 00:00:00'),
       (5, 1, 38000, 25000, 80000, 96, '2026-11-01 00:00:00'),
       (6, 1, 32000, 24000, 60000, 88, '2026-11-01 00:00:00'),
       (7, 1, 55000, 35000, 120000, 64, '2026-11-01 00:00:00'),
       (8, 1, 65000, 40000, 150000, 71, '2026-11-01 00:00:00'),
       (1, 2, 28000, 21000, 55000, 356, '2026-11-01 00:00:00'),
       (2, 2, 30000, 23000, 52000, 152, '2026-11-01 00:00:00'),
       (3, 2, 26000, 20000, 43000, 221, '2026-11-01 00:00:00'),
       (4, 2, 25000, 20000, 38000, 178, '2026-11-01 00:00:00'),
       (5, 2, 36000, 24000, 75000, 104, '2026-11-01 00:00:00'),
       (6, 2, 30000, 23000, 55000, 92, '2026-11-01 00:00:00'),
       (7, 2, 52000, 33000, 110000, 71, '2026-11-01 00:00:00'),
       (8, 2, 62000, 38000, 140000, 83, '2026-11-01 00:00:00'),
       (1, 3, 27000, 20000, 48000, 74, '2026-11-01 00:00:00'),
       (3, 3, 25000, 19000, 40000, 51, '2026-11-01 00:00:00'),
       (1, 4, 24000, 18000, 40000, 42, '2026-11-01 00:00:00'),
       (8, 5, 48000, 30000, 100000, 66, '2026-11-01 00:00:00'),
       (7, 6, 38000, 25000, 70000, 23, '2026-11-01 00:00:00');

SET FOREIGN_KEY_CHECKS = 1;
