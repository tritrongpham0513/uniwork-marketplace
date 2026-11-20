# VieJob Marketplace 🎓

> **Nền tảng kết nối việc làm bán thời gian và cơ hội thực tập cho sinh viên đại học.**  
> Kiến trúc Monorepo (Spring Boot 3 RESTful Backend & Single Page Application Frontend).

---

## 📌 1. Tổng quan hệ thống

**VieJob Marketplace** giải quyết bài toán kết nối việc làm bán thời gian (part-time), việc làm thời vụ và thực tập an toàn, minh bạch cho sinh viên:
* 👨‍🎓 **Sinh viên (STUDENT)**: Tìm kiếm việc làm theo ngành nghề, khu vực, mức lương; nộp hồ sơ trực tuyến, đánh giá nhà tuyển dụng.
* 🏢 **Nhà tuyển dụng (EMPLOYER)**: Đăng tin tuyển dụng part-time, quản lý hồ sơ ứng viên, duyệt/từ chối ứng tuyển.
* 🛡️ **Quản trị viên (ADMIN)**: Kiểm duyệt tin đăng, quản lý danh mục nghề nghiệp, giám sát hoạt động hệ thống.

---

## 🏗️ 2. Cấu trúc thư mục Monorepo

```text
viejob-marketplace/
├── backend/                # Mã nguồn Backend API (Java 17, Spring Boot 3.3.5, Maven)
├── frontend/               # Mã nguồn Giao diện người dùng (React / Vite / Tailwind CSS)
├── docs/                   # Tài liệu kỹ thuật, Swagger UI offline, Postman Collections
│   ├── api/
│   │   ├── openapi.json        # Đặc tả chuẩn OpenAPI 3.0 (dùng cho Postman / sinh Type)
│   │   └── swagger-ui.html     # Giao diện Swagger xem trực tiếp không cần bật Backend
│   └── postman/
│       └── VieJob_Auth_API_v1.postman_collection.json # Bộ test Postman
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
   Import file [`docs/postman/VieJob_Auth_API_v1.postman_collection.json`](file:///d:/chuyen-de-tot-nghiep-02/docs/postman/VieJob_Auth_API_v1.postman_collection.json) vào Postman để gọi thử các API.

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
    "email": "student@viejob.vn"
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

## 🚀 4. Khởi chạy nhanh bằng Docker (khuyến nghị)

> **Không cần cài Java, Maven hay MySQL trên máy.** Toàn bộ stack chạy trong Docker Compose.

### Yêu cầu môi trường:
* Docker Desktop đã chạy
* Docker Compose v2 (`docker compose version`)

### Các bước khởi động:

```bash
# 1. Build & chạy cả 3 service: mysql + backend + frontend
docker compose up --build

# 2. Mở trình duyệt
#    - SPA (frontend qua nginx):  http://localhost:8000
#    - Swagger UI của API:       http://localhost:8080/swagger-ui.html
#    - MySQL:                    localhost:3306 (root/root, db=parttime_marketplace)
```

### Cấu trúc Compose

| Service | Cổng | Mô tả |
| --- | --- | --- |
| `mysql` | `3306` | MySQL 8.4, Flyway tự migrate + seed |
| `backend` | `8080` | Spring Boot 3.3.5 / Java 17 (JRE image) |
| `frontend` | `8000` | Nginx serve SPA + reverse proxy `/api` → `backend:8080` |

Frontend gọi **API thật** qua nginx reverse proxy (cùng origin → không lo CORS).
File upload (CV / ảnh / logo) lưu trên **Cloudflare R2** → không mất khi rebuild container.

### Tài khoản demo (seed sẵn trong DB)

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Sinh viên | `student@viejob.vn` | `Student@123` |
| Nhà tuyển dụng | `employer@viejob.vn` | `Employer@123` |
| Quản trị viên | `admin@viejob.vn` | `Admin@123` |

Dữ liệu seed nằm trong `backend/src/main/resources/db/migration/` (`V3__seed_demo_data.sql` + `V7` + `V9`):
22 users, 45 tin tuyển dụng, 9 đơn ứng tuyển có timeline, đánh giá 2 chiều, thông báo, tin đã lưu, master data.
Đây là **SQL tĩnh do backend sở hữu** — muốn đổi dữ liệu thì sửa trực tiếp file SQL và `./dev.sh reset`.

### Smoke test API

```bash
docker compose up -d --build
bash backend/scripts/smoke-api.sh http://localhost:8080/api/v1
```

Script là **idempotent** — tự chọn tin tuyển dụng chưa ứng tuyển nên chạy lại nhiều lần vẫn xanh.

### Smoke test trình duyệt (chạy app thật qua nginx)

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:browser
```

Dùng Chrome hệ thống (`channel: "chrome"`), tự fallback về Chromium của Playwright nếu không có.
Ảnh chụp màn hình lưu ở `app/.tmp-smoke-live/`.

### Realtime thông báo (WebSocket)

Bảng `notifications` trong DB vẫn là nguồn sự thật. WebSocket chỉ đẩy tín hiệu nhẹ
(`{ id, type, title, body, link, unreadCount }`) → client cập nhật badge, hiện toast, rồi
invalidate cache để refetch dữ liệu chuẩn từ REST.

Kết nối an toàn bằng **vé dùng một lần, hạn 60s**:

```
POST /api/v1/ws/ticket        (Bearer JWT)  → { ticket, expiresIn: 60 }
GET  /ws/notifications?ticket=…                → WebSocket (vé sai → HTTP 403)
```

JWT không bao giờ lọt vào query string / access log. Đã có proxy `/ws/` trong `app/nginx.conf`
(production) và `app/vite.config.ts` (dev).

7 sự kiện realtime: SV ứng tuyển → NTD; NTD đổi trạng thái → SV; SV rút đơn → NTD;
NTD đăng tin → tất cả Admin; Admin duyệt/từ chối tin → NTD; đánh giá mới → người bị đánh giá.

```bash
cd app
node scripts/verify-realtime-ws.mjs http://localhost:8081
SMOKE_BASE_URL=http://localhost:8000 SMOKE_API_URL=http://localhost:8080 \
  node scripts/smoke-realtime-browser.mjs
```

Chi tiết kiến trúc: `AGENTS.md` → mục "Realtime thông báo (WebSocket)".

### Dừng / reset

```bash
docker compose down            # dừng (giữ dữ liệu)
docker compose down -v         # dừng + xoá volume MySQL (seed lại từ đầu)
```

---

## 🔥 4b. Chế độ DEV trong Docker (hot-reload)

> Dành cho lập trình viên: sửa code trên máy là **nạp lại ngay**, không cần rebuild image.

### Khác biệt so với bản production ở mục 4

| | Production (`docker-compose.yml`) | Dev (`docker-compose.dev.yml`) |
| --- | --- | --- |
| Frontend | Nginx serve bundle `pnpm build` | **Vite dev server + HMR** |
| Backend | `java -jar app.jar` | **`mvn spring-boot:run` + devtools** (tự compile & restart) |
| Source | nằm trong image | **bind-mount từ host** (sửa là thấy ngay) |
| Frontend port | `8000` | `5173` |
| Backend port | `8080` | `8081` |
| MySQL port | `3306` | `3307` (volume riêng `mysql-dev-data`) |

Hai bản **chạy song song** được — không đụng nhau.

### Chạy

```bash
# Cách 1 — script tiện lợi
./dev.sh up-d          # build + chạy nền
./dev.sh logs          # theo dõi log
./dev.sh down          # dừng
./dev.sh reset         # xoá volume MySQL dev + build lại (reset DB từ đầu)

# Cách 2 — docker compose trực tiếp
docker compose -f docker-compose.dev.yml up --build
```

Mở trình duyệt:

- SPA (HMR): <http://localhost:5173>
- Swagger UI: <http://localhost:8081/swagger-ui.html>
- MySQL: `localhost:3307` (root/root, db `parttime_marketplace`)

### Cách hoạt động

- **Frontend**: Vite chạy trong container `node:22-alpine`, source `app/src` được bind-mount. Sửa file `.tsx`/`.ts` → HMR reload ngay. Request `/api/*` được **proxy** tới `http://backend:8080` (giống nginx ở bản production) nên không có lỗi CORS.
- **Backend**: `mvn spring-boot:run` + `spring-boot-devtools`. Một watcher (`backend/scripts/dev-watch.sh`) poll checksum source mỗi 3 giây → `mvn compile` → devtools phát hiện classpath đổi → **restart app tự động** (~5-8 giây).
  - Watcher dùng **polling** vì bind-mount từ host Windows qua Docker Desktop không phát sự kiện file (inotify) sang container.
  - Nếu code lỗi compile, app giữ nguyên bản cũ và log lỗi ra console — không làm sập container.

### Lưu ý khi làm việc trong chế độ dev

- **Thêm dependency mới** (`package.json`) → cần rebuild image:
  ```bash
  docker compose -f docker-compose.dev.yml build frontend
  ```
  Vì `node_modules` của host là bản Windows, không chạy được trong container Linux — nên compose mount **từng thư mục source** thay vì mount cả `app/`.
- **Sửa `pom.xml`** (thêm dependency Java) → rebuild image backend tương tự:
  ```bash
  docker compose -f docker-compose.dev.yml build backend
  ```
- **Reset DB dev**: `docker compose -f docker-compose.dev.yml down -v` (hoặc `./dev.sh reset`)

> ⚠️ **Flyway checksum mismatch**: nếu đã **sửa** file migration `V3__seed_demo_data.sql` hoặc
> `V4__file_uploads_and_job_notify.sql` sau khi chúng được apply, Flyway sẽ từ chối migrate và
> backend dev **crash loop** với log `Migration checksum mismatch for migration version N`.
> Cách xử lý: `./dev.sh reset` (xoá volume `mysql-dev-data` → migrate lại từ V1).
> Bản production dùng volume riêng (`mysql-data`) nên không bị ảnh hưởng.
> Lưu ý: seed V3/V7/V9 là **SQL tĩnh** (không sinh ra từ script) → checksum ổn định qua mọi lần rebuild.
- **Chạy verify/lint trên host** (nhanh hơn container): `cd app && pnpm lint && pnpm verify`

---

## ✅ 6. Trạng thái kiểm chứng

| Hạng mục | Lệnh | Kết quả |
| --- | --- | --- |
| Frontend lint | `cd app && pnpm lint` | 0 error, 0 warning |
| Frontend type-check + build | `cd app && pnpm build` | PASSED |
| Frontend verify (3 suite) | `cd app && pnpm verify` | toast + integration + e2e (API thật) — **PASSED** |
| Browser smoke (app thật + API thật) | `cd app && SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:browser` | **11/11 PASSED** — không còn lỗi console |
| Backend compile (Docker) | `docker run … mvn clean compile` | PASSED |
| Backend schema + seed (Docker) | `docker compose up --build` | Flyway V1→V4, Hibernate `ddl-auto: validate` OK |
| Backend smoke test (91 assertions) | `bash backend/scripts/smoke-api.sh http://localhost:8080/api/v1` | **PASS: 91 / FAIL: 0** (idempotent — chạy lại nhiều lần vẫn xanh) |

Smoke test phủ đủ vòng đời nghiệp vụ:

1. Đăng nhập 3 vai trò + sai mật khẩu (401) + thiếu token (401)
2. Danh sách/chi tiết/lọc tin tuyển dụng công khai
3. Master data (categories, positions, provinces, districts, skills, salary-benchmarks) + route không tồn tại trả 404 + HEAD trên endpoint công khai
4. Sinh viên ứng tuyển + chặn ứng tuyển trùng
5. NTD duyệt đơn (ACCEPTED → COMPLETED) kèm timeline
6. Đánh giá 2 chiều + chặn đánh giá trùng + cập nhật `ratingCount`
7. NTD đăng tin → tin `PENDING_REVIEW` bị ẩn khỏi API public → Admin duyệt → `OPEN`
8. Admin: dashboard, quản lý user, CRUD nhóm việc
9. Tin đã lưu (lưu / xem / bỏ lưu)
10. Thông báo (list, unread-count, read-all)
11. Hồ sơ sinh viên (đọc / cập nhật)
12. Refresh token rotation
13. Phân quyền (403 khi sai vai trò)
14. Upload file thật (CV) — upload / đọc lại / xoá / từ chối sai định dạng / 401 khi không token
15. Ghi chú nội bộ của NTD (ghi / đọc lại / 403 khi sinh viên ghi)
16. Bật/tắt thông báo tin tuyển dụng theo nhóm việc + tỉnh
17. Danh sách id tin đã lưu

### Upload file (CV / ảnh đại diện / logo)

File được lưu thật trên **Cloudflare R2** (S3-compatible) qua luồng presigned — browser `PUT` thẳng lên R2, backend không nhận nội dung file:

```
POST   /api/v1/files/presign?kind=CV|AVATAR|LOGO&contentType=  → 200 (uploadUrl + storageKey)
PUT    <uploadUrl>                                              → 200 (đẩy thẳng lên R2)
POST   /api/v1/files/confirm                                    → 201 (metadata)
GET    /api/v1/files/{id}                                       → 302 (redirect tới presigned GET / CDN)
DELETE /api/v1/files/{id}                                       → 200 (xoá mềm)
```

- Cấu hình qua env: `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`.
- `kind=CV` là **tài nguyên riêng tư**: chỉ chủ sở hữu, admin, và NTD đã nhận đơn ứng tuyển từ sinh viên đó mới đọc được (qua presigned GET có hạn).
  `AVATAR` / `LOGO` là ảnh công khai (bucket public, có thể gắn Cloudflare CDN).
- Backend xác minh **magic bytes** (không tin `Content-Type` của client) và resize ảnh về ≤ 512px.
- Frontend: `src/features/files/` (`files.service.ts` + `useUploadFile` / `useDeleteFile`) — gọi thẳng API thật.

> **Lưu ý Windows/Git Bash**: `curl -F "file=@/tmp/x.pdf"` sẽ lỗi `(26) Failed to open/read local data from file`
> vì curl native không hiểu đường dẫn POSIX. Luôn dùng **đường dẫn tương đối** trong thư mục hiện tại
> (`-F "file=@./cv.pdf"`) — `backend/scripts/smoke-api.sh` đã xử lý sẵn.

### Dữ liệu seed do backend sở hữu

Dữ liệu demo nằm trong `backend/src/main/resources/db/migration/`:
`V3__seed_demo_data.sql` (người dùng, tin tuyển dụng, đơn ứng tuyển, đánh giá, thông báo, master data)
+ `V7__seed_review_replies.sql` + `V9__seed_work_histories.sql`.

Đây là **SQL tĩnh** → checksum ổn định, không gây `Migration checksum mismatch` cho Flyway khi rebuild container.
Muốn đổi dữ liệu demo: sửa trực tiếp file SQL → `./dev.sh reset` (xoá volume `mysql-dev-data` → migrate lại từ V1).

---

## 🛠️ 5. Khởi chạy Backend local (tùy chọn — cần JDK/Maven)

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
