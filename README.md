# UniWork Marketplace 🎓

> **Nền tảng kết nối việc làm bán thời gian và cơ hội thực tập cho sinh viên đại học.**  
> Kiến trúc Monorepo (Spring Boot 3 RESTful Backend & Single Page Application Frontend).

---

## 📌 1. Tổng quan hệ thống

**UniWork Marketplace** giải quyết bài toán kết nối việc làm bán thời gian (part-time), việc làm thời vụ và thực tập an toàn, minh bạch cho sinh viên:
* 👨‍🎓 **Sinh viên (STUDENT)**: Tìm kiếm việc làm theo ngành nghề, khu vực, mức lương; nộp hồ sơ trực tuyến, đánh giá nhà tuyển dụng.
* 🏢 **Nhà tuyển dụng (EMPLOYER)**: Đăng tin tuyển dụng part-time, quản lý hồ sơ ứng viên, duyệt/từ chối ứng tuyển.
* 🛡️ **Quản trị viên (ADMIN)**: Kiểm duyệt tin đăng, quản lý danh mục nghề nghiệp, giám sát hoạt động hệ thống.

---

## 🏗️ 2. Cấu trúc thư mục Monorepo

```text
uniwork-marketplace/
├── backend/                # Mã nguồn Backend API (Java 17, Spring Boot 3.3.5, Maven)
├── frontend/               # Mã nguồn Giao diện người dùng (React / Vite / Tailwind CSS)
├── docs/                   # Tài liệu kỹ thuật, Swagger UI offline, Postman Collections
│   ├── api/
│   │   ├── openapi.json        # Đặc tả chuẩn OpenAPI 3.0 (dùng cho Postman / sinh Type)
│   │   └── swagger-ui.html     # Giao diện Swagger xem trực tiếp không cần bật Backend
│   └── postman/
│       └── UniWork_Auth_API_v1.postman_collection.json # Bộ test Postman
├── context/                # Hồ sơ phân tích nghiệp vụ, tài liệu SRS v1.1
├── schema_parttime_marketplace_mysql.sql # Bản thiết kế CSDL MySQL gốc
└── README.md               # Tài liệu trung tâm của dự án
```

---

## 💻 3. Hướng dẫn dành cho Frontend Developer (FE)

Tất cả thông tin cần thiết để đội ngũ Frontend tích hợp API vào giao diện:

### 3.1. Địa chỉ máy chủ API (Base URL)
* **Local Backend API**: `http://localhost:8080`
* **Tiền tố API v1**: `/api/v1`
* **CORS hỗ trợ sẵn**: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:5500`

### 3.2. Tài liệu API & Tích hợp công cụ
1. **Xem trực quan nhanh (Offline Swagger UI):**  
   Mở file [`docs/api/swagger-ui.html`](file:///d:/chuyen-de-tot-nghiep-02/docs/api/swagger-ui.html) bằng trình duyệt để xem toàn bộ danh sách endpoint, request body và response format mà **không cần chạy server**.
2. **Xem trực tiếp khi Backend đang chạy:**  
   Truy cập [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).
3. **Sinh tự động kiểu dữ liệu TypeScript (Tự động hóa):**  
   Sử dụng file [`docs/api/openapi.json`](file:///d:/chuyen-de-tot-nghiep-02/docs/api/openapi.json) với công cụ `openapi-typescript` hoặc `orval` để tự động sinh toàn bộ TypeScript Interfaces và Axios Hooks:
   ```bash
   npx openapi-typescript docs/api/openapi.json -o src/types/api.ts
   ```
4. **Bộ Test Postman:**  
   Import file [`docs/postman/UniWork_Auth_API_v1.postman_collection.json`](file:///d:/chuyen-de-tot-nghiep-02/docs/postman/UniWork_Auth_API_v1.postman_collection.json) vào Postman để gọi thử các API.

---

### 3.3. Quy chuẩn cấu trúc phản hồi (Standard Response Envelope)

Tất cả các API của Backend đều trả về theo định dạng JSON thống nhất:

#### Phản hồi thành công (HTTP 200 / 201):
```json
{
  "success": true,
  "message": "Thông điệp phản hồi nghiệp vụ",
  "data": {
    "id": 1,
    "email": "student@uniwork.vn"
  }
}
```

#### Phản hồi phân trang (Pagination):
```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "items": [ ... ],
    "currentPage": 0,
    "pageSize": 10,
    "totalItems": 45,
    "totalPages": 5,
    "first": true,
    "last": false
  }
}
```

#### Phản hồi lỗi (HTTP 400 / 401 / 403 / 404 / 500):
```json
{
  "success": false,
  "message": "Thông báo lỗi chi tiết cho người dùng",
  "code": "VALIDATION_FAILED",
  "errors": [
    "Mật khẩu phải từ 8 ký tự trở lên",
    "Email không hợp lệ"
  ]
}
```

---

### 3.4. Cơ chế xác thực & Phân quyền (Authentication & Authorization)

* **JWT Header:** Sau khi đăng nhập thành công (`/api/v1/auth/login` hoặc `/api/v1/auth/google`), FE lưu `accessToken` và đính kèm vào tất cả các request có bảo mật:
  ```http
  Authorization: Bearer <accessToken>
  ```
* **Đăng ký tài khoản (`POST /api/v1/auth/register`):**
  * Nhận `email`, `password`, `confirmPassword`, `fullName`, `role` (`STUDENT` hoặc `EMPLOYER`).
  * Hệ thống tự động gửi email xác thực kèm link 6 chữ số qua Gmail SMTP.
* **Đăng nhập Google (`POST /api/v1/auth/google`):**
  * FE dùng SDK Google Identity Services (`@react-oauth/google` hoặc thẻ script `https://accounts.google.com/gsi/client`) lấy `credential` (ID Token).
  * Gửi lên Backend: `{ "idToken": "..." }`.
  * Nếu là tài khoản mới (`data.needsRole = true`), FE hiển thị popup hỏi người dùng muốn chọn vai trò `STUDENT` hay `EMPLOYER`, sau đó gửi lại kèm trường `{ "role": "STUDENT" }`.

---

## 🚀 4. Khởi chạy nhanh Backend (Local Development)

### Yêu cầu môi trường:
* JDK 17+
* MySQL 8.x (Port `3306`)

### Các bước khởi động:
1. Đảm bảo MySQL đang chạy với database `parttime_marketplace`.
2. Khởi chạy server Backend (Maven Wrapper đi kèm):
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
3. Kiểm tra server: Truy cập [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).
