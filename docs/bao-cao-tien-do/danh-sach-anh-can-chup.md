# Danh sách ảnh minh chứng cần chụp

Bộ slide có 14 khung ảnh minh chứng, đánh số theo thứ tự xuất hiện. Hai ảnh đầu đã có sẵn,
mười hai ảnh còn lại cần chụp khi chạy được backend trên máy có **JDK 17** và **MySQL 8**.

> Nguyên tắc: ảnh nào chưa chụp được thì ghi rõ “chưa chụp được”, **không dùng ảnh minh hoạ
> lấy từ mạng**.

## Đã có

| # | Ảnh | Tệp | Cách lấy |
|---|---|---|---|
| 01 | Giao diện đăng nhập | `anh/IMG-01-giao-dien-dang-nhap.png` | Chạy `pnpm dev` ở nhánh `frontend-auth`, mở `/login`, chụp 2880×1920 |
| 02 | Giao diện đăng ký | `anh/IMG-02-giao-dien-dang-ky.png` | Cùng cách trên, mở `/register` |

## Cần chụp

| # | Ảnh chụp gì | Lấy ở đâu | Dán vào slide |
|---|---|---|---|
| 03 | Swagger UI hiện 7 endpoint nhóm Auth | `http://localhost:8080/swagger-ui.html` | Bản ngắn: slide 10 · Bản đầy đủ: slide 12 |
| 04 | `POST /auth/register` trả về 201 Created | Swagger hoặc Postman | 10 / 12 |
| 05 | Email kích hoạt trong hộp thư Gmail | Hộp thư của tài khoản vừa đăng ký | 10 / 12 |
| 06 | Trang HTML “Xác thực email thành công” | Bấm link trong mail | 10 / 12 |
| 07 | `POST /auth/login` trả về 200 kèm `accessToken` | Swagger hoặc Postman, chụp cả response body | 10 / 13 |
| 08 | `GET /auth/me` với Bearer token | Swagger, bấm Authorize rồi gọi | 10 / 13 |
| 09 | Sai mật khẩu trả về 401 `INVALID_CREDENTIALS` | Swagger hoặc Postman | 10 / 13 |
| 10 | Tài khoản `PENDING_VERIFY` trả về 403 `EMAIL_NOT_VERIFIED` | Đăng nhập trước khi kích hoạt | 10 / 13 |
| 11 | `mvnw test` — 26 test, 0 failure | Terminal trong `backend/`, chụp dòng `BUILD SUCCESS` và `Tests run` | 10 / 14 |
| 12 | MySQL có 23 bảng trong schema `parttime_marketplace` | MySQL Workbench, mở rộng cây Tables | 10 / 14 |
| 13 | Bảng `flyway_schema_history` có bản ghi V1 | MySQL Workbench | 10 / 14 |
| 14 | Trang `test-google-login.html` | `http://localhost:8080/test-google-login.html` | 10 / 14 |

## Chuẩn bị trước khi chụp

1. Cài **JDK 17** (dự án chưa chạy được trên JDK 24).
2. Cài **MySQL 8**, tạo schema `parttime_marketplace`.
3. Tạo file `backend/.env` từ `backend/.env.example`, điền mật khẩu MySQL, thông tin Gmail
   (app password) và Google Client ID.
4. Chạy `./mvnw spring-boot:run` trong thư mục `backend/`, đợi Flyway chạy xong migration V1.
5. Mở Swagger để kiểm tra 7 endpoint đã lên.

## Mẹo chụp cho dễ đọc

- Chụp ở độ phân giải cao (Windows: `Win + Shift + S`, hoặc dùng Snipping Tool).
- Với Swagger/Postman, chụp **cả request và response**, không cắt mất dòng trạng thái.
- Với email, chụp cả dòng người gửi và nút kích hoạt để thấy rõ là mail thật.
- Đặt tên tệp theo số thứ tự, ví dụ `03-swagger.png`, `04-register-201.png`… để dễ dán vào slide.
