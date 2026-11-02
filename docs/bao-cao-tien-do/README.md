# Bộ tài liệu báo cáo tiến độ — UniWork Marketplace

Thư mục này chứa bộ slide và tài liệu kèm theo cho buổi báo cáo tiến độ đồ án
**UniWork Marketplace** (nền tảng việc làm part-time và thực tập cho sinh viên).

Cập nhật lần cuối: **02/11/2026**

## Nội dung thư mục

| Tệp | Mô tả |
|---|---|
| `UniWork-Demo-TienDo-ngan-gon.pptx` | Bản ngắn gọn **13 slide** — dùng để trình chiếu chính |
| `UniWork-Demo-TienDo.pptx` | Bản đầy đủ **20 slide** — có thêm bảng tổng hợp ảnh, so sánh nhánh, phụ lục |
| `noi-dung-slide.md` | Nội dung từng slide viết thành câu, đọc là hiểu toàn bộ dự án |
| `danh-sach-anh-can-chup.md` | Danh sách 14 ảnh minh chứng: ảnh nào đã có, ảnh nào cần chụp, chụp ở đâu |
| `anh/` | Ảnh giao diện thật, chụp từ nhánh `frontend-auth` |
| `xem-truoc/` | Ảnh PNG xuất từ slide 4 và slide 5 để xem trước bố cục |

## Ảnh giao diện đã có

Hai ảnh trong `anh/` được chụp thật bằng Chrome headless (2880×1920), sau khi chạy
`pnpm install` và `vite` từ nhánh `frontend-auth` — không dùng ảnh minh hoạ lấy từ mạng.

| Tệp | Nội dung |
|---|---|
| `anh/IMG-01-giao-dien-dang-nhap.png` | Trang đăng nhập `/login` |
| `anh/IMG-02-giao-dien-dang-ky.png` | Trang đăng ký `/register` |

## Ảnh còn phải chụp

Mười hai ảnh còn lại (03–14) là ảnh chạy thật của backend: Swagger, kết quả gọi API,
mail kích hoạt, `mvnw test`, MySQL Workbench. Xem chi tiết trong
[`danh-sach-anh-can-chup.md`](danh-sach-anh-can-chup.md).

> Lưu ý: máy dùng để dựng bộ slide này chỉ có JDK 24 và chưa có MySQL, trong khi dự án
> cần JDK 17 — nên backend chưa chạy được tại máy đó. Vì vậy các ảnh 03–14 vẫn để khung
> “DÁN ẢNH” trong slide, **không dùng ảnh minh hoạ thay thế**.

## Trạng thái dự án tại thời điểm báo cáo

- **Đã xong:** đăng ký + xác thực email Gmail, đăng nhập email/mật khẩu, đăng nhập Google
  OAuth2, JWT + phân quyền 3 vai trò, CSDL 23 bảng có migration Flyway, 26 unit test.
- **Đang làm:** giao diện đăng nhập/đăng ký (khung đã chạy, **chưa nối API thật**),
  tài liệu API tĩnh, bộ Postman.
- **Chưa làm:** đăng tin tuyển dụng, ứng tuyển, đánh giá, thông báo, kiểm duyệt của Admin,
  refresh token, Docker, CI.

## Ba nhánh của kho

| Nhánh | Vai trò | Quy mô |
|---|---|---|
| `main` | Bản ổn định, đã gộp backend qua PR #1 | 61 tệp |
| `feature/auth-email-google` | Phát triển backend: CSDL, xác thực, JWT, mail, test | 62 tệp · 5 commit |
| `frontend-auth` | Phát triển giao diện React 19 + Vite + Tailwind + shadcn/ui | 102 tệp · +41 tệp mới |

## Cách dựng lại bộ slide

Bộ slide được sinh bằng `python-pptx` (Python 3.12), khổ 16:9, font Segoe UI,
màu chủ đạo navy `#1F4E79` và amber `#E8A33D`. Muốn chỉnh nội dung thì sửa file
`.pptx` trực tiếp bằng PowerPoint, hoặc liên hệ người dựng để chạy lại script sinh slide.
