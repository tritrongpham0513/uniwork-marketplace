# Nội dung từng slide — đọc để hiểu

Tài liệu này là nội dung của bộ slide **13 slide** (`UniWork-Demo-TienDo-ngan-gon.pptx`),
viết thành câu hoàn chỉnh để người đọc nắm được toàn bộ dự án mà không cần xem file trình chiếu.

---

## Slide 1 — Bìa

Báo cáo tiến độ đồ án **UniWork Marketplace** — nền tảng kết nối việc làm part-time và
thực tập cho sinh viên. Mã nguồn nằm ở kho GitHub `tritrongpham0513/uniwork-marketplace`,
làm trên hai nhánh: `feature/auth-email-google` cho backend và `frontend-auth` cho giao diện.
Báo cáo ngày 02/11/2026, phần tên nhóm và học phần để trống điền sau.

---

## Slide 2 — Nội dung báo cáo

Bài trình bày chia làm năm phần, khoảng 15 phút.

1. Bài toán và phạm vi.
2. Kiến trúc đã hiện thực ở cả backend và frontend.
3. Hồ sơ và các file thiết kế đã chuẩn bị — cái nào có, cái nào thiếu.
4. Đã làm, đang làm, chưa làm — kèm minh chứng cho từng dòng.
5. Kế hoạch bốn tuần, rủi ro và kết luận.

---

## Slide 3 — Bài toán & 3 vai trò

Hệ thống phục vụ ba nhóm người dùng.

**Sinh viên** cần tìm việc part-time phù hợp, nộp hồ sơ và đánh giá nhà tuyển dụng.
Vấn đề hiện nay là tin tuyển dụng trôi nổi trên mạng xã hội, không ai kiểm chứng nên rất dễ bị lừa.

**Nhà tuyển dụng** cần đăng tin, quản lý và duyệt ứng viên, nhưng không có hồ sơ xác thực
nên khó tiếp cận đúng đối tượng.

**Quản trị viên** cần kiểm duyệt tin và quản lý danh mục, nhưng không có công cụ cũng không
có nhật ký hoạt động.

Giải pháp của nhóm là một nền tảng duy nhất: tài khoản phải xác thực email thật, phân quyền
rõ ràng theo ba vai trò, dữ liệu quan hệ chặt chẽ để mọi tin đăng đều gắn với một nhà tuyển
dụng có thật.

Cần nói rõ: báo cáo lần này **chỉ làm module xác thực (auth)** — tức phần nền móng cho mọi
module sau, chưa làm phần đăng tin và ứng tuyển.

---

## Slide 4 — Phạm vi 3 nhánh

Dự án chia làm ba nhánh, mỗi nhánh một khối việc.

**`main`** là bản ổn định để người khác clone về chạy. Nhánh này đã gộp toàn bộ backend qua
Pull Request số 1, đồng thời gỡ file thiết kế CSDL gốc ra khỏi kho và thêm vào `.gitignore`
vì coi đó là tài liệu nội bộ. Nhánh có **61 tệp** và hai commit riêng (một commit merge, một
commit dọn dẹp); có backend nhưng không có frontend.

**`feature/auth-email-google`** là nhánh phát triển backend, gồm **5 commit**, **62 tệp**,
trong đó **48 tệp Java** và **26 unit test**. Đây là nơi chứa toàn bộ phần xác thực: CSDL
23 bảng, entity, JWT, gửi mail, đăng nhập Google, và cả file thiết kế CSDL gốc. Nhánh này
đã đẩy lên và đã gộp vào `main`.

**`frontend-auth`** là nhánh phát triển giao diện, tách từ `main`, chỉ có **1 commit** nhưng
thêm **41 tệp mới với 6.269 dòng**, nâng tổng lên **102 tệp**. Nhánh có khung trang đăng nhập
và đăng ký chạy được, nhưng chưa nối vào API thật.

Phần **đã xong**: đăng ký, xác thực email qua Gmail, đăng nhập email/mật khẩu, đăng nhập
Google, cấp JWT và phân quyền ba vai trò, CSDL 23 bảng có migration tự động, 26 unit test.

Phần **chưa làm**: đăng tin tuyển dụng, ứng tuyển, đánh giá, thông báo, kiểm duyệt của Admin,
refresh token, và việc nối API thật vào giao diện.

---

## Slide 5 — Kiến trúc backend

Backend viết bằng **Spring Boot 3.3.5, Java 17, MySQL 8**, chia làm sáu tầng rõ ràng.

- **Tầng HTTP:** `AuthController` mở bảy endpoint dưới `/api/v1/auth/**`.
- **Tầng bảo mật:** `JwtAuthenticationFilter` chặn mọi request để đọc token, `SecurityConfig`
  khai báo CORS, tắt CSRF và chạy stateless — server không giữ session.
- **Tầng nghiệp vụ:** `AuthServiceImpl` xử lý sáu việc: đăng ký, xác thực email, gửi lại mail,
  đăng nhập, đăng nhập Google và lấy thông tin cá nhân.
- **Tầng hỗ trợ:** `JwtService` sinh và kiểm tra token, `GoogleTokenVerifierService` xác minh
  ID token của Google, `MailService` gửi mail bất đồng bộ (`@Async`) để không làm chậm request,
  BCrypt cost 10 để băm mật khẩu.
- **Tầng dữ liệu:** 10 repository của Spring Data JPA cộng thêm `JobPostSpecification`
  để lọc tin tuyển dụng.
- **Tầng lưu trữ:** MySQL 8, toàn bộ schema do Flyway quản lý, Hibernate chỉ ở chế độ
  `validate` chứ không tự sửa bảng.

Luồng chạy của một request: đi qua filter JWT, vào controller, xuống service, qua repository,
tới MySQL, rồi trả về theo một khuôn `ApiResponse` chung cho cả hệ thống.

---

## Slide 6 — Kiến trúc frontend

Frontend dùng **React 19, Vite 8, Tailwind CSS 4 và shadcn/ui**, tổ chức theo từng thành phần.

- **Định tuyến:** `app/router.tsx` và `config/paths.ts`, hiện khai báo hai đường `/login`
  và `/register`.
- **Trang:** chỉ là vỏ, ghép form vào bên trong.
- **Form:** dùng `react-hook-form` kết hợp `zod` để validate ngay trên trình duyệt.
- **Quy tắc validate:** nằm trong `auth.schema.ts` — email phải hợp lệ, mật khẩu từ 8 ký tự
  trở lên và phải có chữ hoa, chữ thường, số, ký tự đặc biệt.
- **Gọi API:** `lib/axios.ts` và thư mục `services`, dùng axios kèm react-query.
- **Giao diện:** bộ component shadcn/ui (button, input, card, field…) theo phong cách giao diện tối.

Điểm phải nói thật rõ: form hiện **mới validate rồi in kết quả ra console, chưa gọi API thật**;
trong `auth.services.ts` cũng mới có hàm `login`. Chưa có trang sau đăng nhập, chưa lưu token,
chưa chặn route. Vì vậy đây là **khung giao diện**, không phải giao diện đã chạy dữ liệu thật.

---

## Slide 7 — Hồ sơ đã chuẩn bị

Đã chuẩn bị được tám nhóm tệp.

1. **Mã nguồn backend:** 48 tệp Java trong `backend/src/main/java/com/uniwork/` — một lớp khởi
   động, sáu lớp cấu hình, một controller, năm DTO request, năm DTO response, mười entity,
   mười repository, hai service kèm hai lớp triển khai.
2. **Cấu hình:** `application.yml` và `.env.example` khai báo cổng 8080, kết nối MySQL, Flyway,
   JWT hạn 24 giờ, Gmail SMTP, CORS và tài khoản Admin khởi tạo.
3. **Cơ sở dữ liệu:** `V1__init_schema.sql` tạo 23 bảng kèm khóa ngoại, index và dữ liệu danh mục.
4. **Kiểm thử:** 26 test dùng Mockito.
5. **Tài liệu:** `README.md` hướng dẫn tích hợp frontend, chuẩn phản hồi và cách khởi chạy.
6. **Giao diện:** 26 tệp TS/TSX ở nhánh `frontend-auth`.
7. **Công cụ test tay:** trang `test-google-login.html` để thử đăng nhập Google.
8. **Tài liệu API tĩnh:** **chưa có** — README nhắc tới `docs/api/openapi.json` và thư mục
   `docs/postman/` nhưng trong kho không có hai thứ này.

---

## Slide 8 — File thiết kế

- **Thiết kế CSDL gốc:** `schema_parttime_marketplace_mysql.sql`, khoảng 28 KB, mô tả 23 bảng,
  quan hệ, index và kiểu dữ liệu MySQL 8; chỉ còn ở nhánh `feature/auth-email-google` vì trên
  `main` đã gỡ ra.
- **Bản thi hành:** `V1__init_schema.sql` — dựng lại đúng thiết kế trên bằng SQL có đánh version
  để Flyway chạy tự động khi khởi động.
- **Mô hình miền:** 10 entity ánh xạ bảng sang đối tượng Java.
- **Đặc tả API:** không viết tay mà để springdoc sinh tự động từ code, truy cập ở `/v3/api-docs`
  và `/swagger-ui.html`, gồm bảy endpoint cùng kiểu request/response và mã lỗi.
- **Quy ước phản hồi:** mục 3.3 của README — một khuôn chung cho success, phân trang và lỗi.
- **Thiết kế giao diện:** trong `pages` và `components/ui` — bố cục hai cột, giao diện tối.
- **Cấu hình môi trường:** `.env.example` với chín nhóm biến.

Ba thứ **còn thiếu** cần bổ sung trước khi bảo vệ: sơ đồ ERD dạng ảnh, tài liệu SRS và bộ Postman.

---

## Slide 9 — Cơ sở dữ liệu 23 bảng

Cơ sở dữ liệu gồm **23 bảng**, chia thành bốn nhóm cho dễ nhớ.

- **Nhóm danh mục — 5 bảng:** `roles`, `provinces`, `districts`, `job_categories`, `skills`;
  dữ liệu ít thay đổi, được seed sẵn trong migration.
- **Nhóm tài khoản — 7 bảng:** `users`, `user_tokens`, `refresh_tokens`, `student_profiles`,
  `employer_profiles`, `student_skills`, `student_resumes`.
- **Nhóm tin tuyển dụng — 4 bảng:** `job_posts`, `job_post_skills`, `job_post_schedules`,
  `saved_jobs`.
- **Nhóm tương tác — 7 bảng:** `applications`, `application_status_history`, `work_assignments`,
  `reviews`, `notifications`, `reports`, `audit_logs`.

Ba điểm đáng nói:

1. Bảng `users` lưu `password_hash`, `auth_provider` (LOCAL hoặc GOOGLE), `google_sub` và
   `status` với ba trạng thái PENDING_VERIFY, ACTIVE, LOCKED.
2. `user_tokens` **chỉ lưu mã SHA-256 của token chứ không lưu token gốc**, kèm hạn dùng và
   trạng thái đã dùng hay chưa — nếu database bị lộ thì kẻ tấn công cũng không dùng lại được token.
3. Toàn bộ schema do migration tạo, Hibernate không tự sửa bảng, nhờ vậy mọi máy đều có cấu
   trúc giống nhau.

---

## Slide 10 — Đã làm · đang làm · chưa làm

**Đã xong:**

- Thiết kế CSDL 23 bảng kèm Flyway, entity và repository.
- Đăng ký tài khoản và xác thực email qua Gmail.
- Đăng nhập email/mật khẩu, cấp JWT và phân quyền ba vai trò.
- Đăng nhập Google OAuth2.
- 26 unit test.

Mỗi dòng đều có ảnh minh chứng tương ứng: ảnh 12–13 cho CSDL, ảnh 03–06 cho đăng ký,
ảnh 07–10 cho đăng nhập, ảnh 14 cho Google, ảnh 11 cho test.

**Đang làm:** giao diện đăng nhập và đăng ký đã dựng xong khung (ảnh 01 và 02 là ảnh chụp thật),
nhưng **chưa nối API** — bấm nút mới chỉ validate rồi in ra console, nên phần này ước khoảng 40%.

**Chưa làm:** đăng tin tuyển dụng, ứng tuyển, đánh giá, thông báo, kiểm duyệt của Admin,
refresh token, Docker và CI. Những phần này chưa có ảnh vì chưa có gì để chụp.

---

## Slide 11 — Kế hoạch 4 tuần

Kế hoạch đặt theo nguyên tắc mỗi tuần phải ra một kết quả kiểm chứng được, không chỉ là
“đã viết code”.

- **Tuần 1:** nối API đăng nhập và đăng ký vào form, lưu token, chặn route — kết quả là đăng ký
  ngay trên giao diện rồi nhận được mail.
- **Tuần 2:** làm trang danh sách việc làm và API tin tuyển dụng có phân trang, lọc — kết quả là
  mở trang chủ thấy dữ liệu thật lấy từ CSDL.
- **Tuần 3:** làm ứng tuyển, lịch sử trạng thái và thông báo — kết quả là sinh viên nộp được hồ sơ
  và nhà tuyển dụng duyệt được.
- **Tuần 4:** refresh token, tài liệu API tĩnh, Docker Compose và CI — kết quả là clone kho về
  chạy một lệnh là hệ thống lên.

Trước mắt, ba việc gấp: chạy `mvnw test` trên máy có JDK 17 và chụp màn hình kết quả (ảnh 11);
bổ sung `openapi.json` và bộ Postman như README đã hứa; viết lại README cho đúng thực tế nhánh
đang báo cáo.

---

## Slide 12 — Rủi ro & cách xử lý

- **Gmail SMTP bị chặn hoặc app password hết hạn** → không đăng ký được lúc demo.
  Cách xử lý: tách `MailService` ra, thêm profile dev ghi mail ra log, chuẩn bị sẵn một tài khoản
  đã kích hoạt để đăng nhập.
- **Form chưa nối API** → thầy bấm nút sẽ không thấy gì xảy ra. Cách xử lý: demo bằng Swagger
  trước, giao diện chỉ dùng để giới thiệu bố cục.
- **Máy chưa có MySQL hoặc JDK 17** → không chạy được backend. Cách xử lý: chụp ảnh trước ở nhà
  và quay một video dự phòng khoảng một phút.
- **README mô tả frontend và tài liệu API nhưng thực tế chưa có** → người chấm đọc sẽ thấy lệch.
  Cách xử lý: sửa README theo đúng nhánh đang báo cáo và ghi rõ phần còn thiếu thay vì nói đã xong.

---

## Slide 13 — Kết luận

Kết quả chính của giai đoạn này: **đã có một backend xác thực chạy thật**, không phải bản mô phỏng.
Cụ thể là đăng ký tài khoản, xác thực email qua Gmail, đăng nhập bằng email/mật khẩu, đăng nhập
bằng Google, cấp JWT và phân quyền ba vai trò, CSDL 23 bảng có migration tự động, và 26 unit test.

Phần **đang làm** là giao diện đăng nhập/đăng ký — khung đã chạy nhưng chưa nối API — cùng tài
liệu API tĩnh và bộ Postman. Phần **tiếp theo** là nối API vào giao diện, rồi làm module tin
tuyển dụng, ứng tuyển, thông báo, refresh token và Docker.

Điểm cần nhấn mạnh khi trình bày: nhóm xác định rõ đâu là phần đã kiểm chứng được và đâu là phần
còn là khung, để kế hoạch bốn tuần tiếp theo có cơ sở và đo được tiến độ.
