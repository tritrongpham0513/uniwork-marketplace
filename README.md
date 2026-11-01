# UniWork Marketplace 🎓

> **Hệ thống kết nối việc làm bán thời gian và cơ hội thực tập dành cho sinh viên đại học.**  
> Dự án Chuyên đề tốt nghiệp / Khóa luận tốt nghiệp ngành Công nghệ Thông tin.

---

## 📌 Giới thiệu dự án

**UniWork Marketplace** là nền tảng số giải quyết bài toán tìm kiếm việc làm bán thời gian (part-time) uy tín, an toàn và linh hoạt cho sinh viên, đồng thời hỗ trợ các doanh nghiệp, nhà tuyển dụng cá nhân tiếp cận nguồn nhân lực trẻ năng động, chất lượng.

### Điểm nổi bật:
* 🔐 **Bảo mật & Xác thực hai lớp**: Đăng ký qua Email xác minh mã OTP/Link bảo mật (Gmail SMTP), Đăng nhập Google OAuth 2.0 (Google Identity Services).
* 🛡️ **Phân quyền người dùng chặt chẽ (RBAC)**: Sinh viên (`STUDENT`), Nhà tuyển dụng (`EMPLOYER`), Quản trị viên (`ADMIN`).
* ⚡ **Kiến trúc Monorepo hiện đại**: Tích hợp toàn diện Backend (Spring Boot 3 RESTful API) và Frontend (SPA Client) trong cùng một kho lưu trữ dễ quản lý và triển khai.
* 🗄️ **Quản lý dữ liệu chuẩn hóa**: MySQL 8.x với Flyway Database Migration tự động hóa toàn bộ vòng đời schema.

---

## 🏗️ Cấu trúc dự án (Monorepo)

```text
uniwork-marketplace/
├── backend/                # Mã nguồn Backend (Spring Boot 3, Java 17, Maven)
├── frontend/               # Mã nguồn Frontend (React / Vite / Tailwind CSS)
├── docs/                   # Tài liệu thiết kế hệ thống, Swagger UI, Postman Collections
├── context/                # Nhật ký phân tích nghiệp vụ, biên bản các buổi họp & SRS
├── tools/                  # Các kịch bản tự động hóa hỗ trợ phát triển
├── schema_parttime_marketplace_mysql.sql # Bản thiết kế CSDL gốc
└── README.md               # Tài liệu tổng quan dự án
```

---

## 🛠️ Công nghệ cốt lõi

* **Backend**: Java 17, Spring Boot 3.3.x, Spring Data JPA / Hibernate, Spring Security 6, JWT, JavaMailSender, Flyway Migration.
* **Database**: MySQL 8.0+.
* **Documentation**: OpenAPI 3.0 / Swagger UI, Postman Collection.
* **Bảo mật**: Mã hóa BCrypt, One-Time Token SHA-256, Google ID Token Verifier.

---

## 📄 Bản quyền & Tác giả

* **Tác giả**: Phạm Trí Trọng
* **Năm thực hiện**: 2026
