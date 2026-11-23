# VieJob Marketplace — Frontend

Frontend của đồ án **VieJob Marketplace** — nền tảng kết nối việc làm bán thời gian cho sinh viên.

> Frontend **luôn gọi API thật** của backend Spring Boot (MySQL) qua reverse proxy — không có tầng mock nào trong bất kỳ bản build nào.

- **Stack**: React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · TanStack Query v5 · React Router v8 · shadcn UI (`@base-ui/react`)
- **Design system**: shadcn preset chuẩn (`base-luma`, base color `zinc`) — không hardcode `amber-*` / `orange-*`

---

## 1. Chạy dự án

```bash
cd app
pnpm install          # hoặc npm install
pnpm dev              # http://localhost:5173
```

| Script         | Mô tả                                                             |
| -------------- | ----------------------------------------------------------------- |
| `pnpm dev`     | Dev server (HMR)                                                  |
| `pnpm build`   | `tsc -b && vite build` — kiểm tra type + build production         |
| `pnpm preview` | Chạy thử bản build                                                |
| `pnpm lint`    | ESLint (flat config + React Compiler rules) — 0 error, 0 warning  |
| `pnpm format`  | Prettier                                                          |
| `pnpm verify`  | Chạy toàn bộ bộ kiểm chứng (toast → integration → E2E qua API thật) |

### Biến môi trường

File `.env` ở thư mục `app/`:

```env
VITE_API_URL_DEV=
```

| Biến                    | Mặc định | Ý nghĩa                                                                       |
| ----------------------- | -------- | ----------------------------------------------------------------------------- |
| `VITE_API_URL_DEV`      | rỗng     | Base URL của backend. Rỗng = **same-origin** → request đi qua reverse proxy  |
| `VITE_CLIENT_ID_GOOGLE` | —        | Client ID Google OAuth (dùng cho luồng đăng nhập Google)                       |

**Rỗng = same-origin** là cấu hình mặc định và là cách chạy đúng:

- dev (`pnpm dev`): Vite proxy `/api` → backend (xem `vite.config.ts`)
- production: nginx proxy `/api` → backend (xem `nginx.conf`)

Chỉ đặt `VITE_API_URL_DEV` khi chạy app ở origin **khác hẳn** với API (ví dụ `pnpm dev` ngoài Docker
trong khi backend chạy ở port khác) — khi đó request sẽ là cross-origin và CORS của backend quyết định.

### Giao diện sáng / tối

- Nút đổi giao diện ở header chỉ cần **1 lần bấm** để chuyển Sáng ↔ Tối; trên mobile là segmented control trong menu mở rộng.
- Hai chế độ: **Sáng** / **Tối** (mặc định `dark` để giữ nhận diện thương hiệu). Giá trị `system` cũ trong `localStorage` vẫn được đọc và tự quy về chế độ đang hiển thị.
- Lựa chọn lưu ở `localStorage` key `vite-ui-theme`; `ThemeProvider` (`src/provider/theme-provider.tsx`) áp class `light`/`dark` lên `<html>` và đồng bộ `color-scheme` + `meta[name="theme-color"]`.
- `index.html` có inline script chạy trước khi React mount để tránh nháy giao diện (FOUC) khi tải lại trang.

---

## 2. Tài khoản demo

| Vai trò        | Email                | Mật khẩu       | Khu vực vào |
| -------------- | -------------------- | -------------- | ----------- |
| Sinh viên      | `student@viejob.vn`  | `Student@123`  | `/student`  |
| Nhà tuyển dụng | `employer@viejob.vn` | `Employer@123` | `/employer` |
| Quản trị viên  | `admin@viejob.vn`    | `Admin@123`    | `/admin`    |

Ở màn hình đăng nhập có nút bấm nhanh để điền sẵn tài khoản demo (hằng số ở `src/features/auth/constants/demo-accounts.ts`).
Dữ liệu demo do **backend migration** seed (`V3__seed_demo_data.sql` + `V7` + `V9`) — dữ liệu nằm trong MySQL nên **không bị reset khi F5**.

---

## 3. Tầng API (transport)

Mọi service gọi qua `axiosInstance` tại `src/lib/axios.ts`:

- Gắn header `Authorization: Bearer <access_token>` tự động.
- Tự refresh token khi gặp `401` (dùng `refreshClient` riêng để tránh vòng lặp).
- Chuẩn hoá mọi lỗi về `ApiError` thống nhất (`src/lib/api-error.ts`).

**Envelope bắt buộc** (khớp Spring Boot backend):

- Thành công: `{ success: true, message: string, data: T }`
- Lỗi: `{ timestamp, status, success: false, code, message, errors?: [{ field, message }] }`

### Bảng định tuyến API (rút gọn)

| Nhóm           | Endpoint                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/refresh`, `GET /auth/me`                                                         |
| Public         | `GET /jobs/public`, `GET /jobs/public/{id}`, `GET /jobs/public/related`, `GET /public/{categories,positions,provinces,districts,skills,salary-benchmarks}`                                                                |
| Sinh viên      | `GET/PUT /student/profile`, `GET/POST /student/applications`, `GET /student/applications/{id}`, `GET /student/applications/job/{jobId}`, `PATCH /student/applications/{id}/withdraw`, `GET/POST/DELETE /student/saved-jobs`, `GET /student/saved-jobs/ids`, `GET/POST/DELETE /student/job-notifications` |
| Nhà tuyển dụng | `GET/POST /employer/jobs`, `PUT/DELETE /employer/jobs/{id}`, `GET /employer/applications`, `GET/PATCH /employer/applications/{id}`, `PATCH /employer/applications/{id}/note`, `GET/PUT /employer/profile`, `POST /employer/reviews/{id}/reply` |
| Đánh giá       | `POST /reviews`, `GET /reviews?targetType=&targetUserId=`                                                                                                                                                                 |
| Thông báo      | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`                                                                                                 |
| WebSocket      | `POST /ws/ticket` — cấp vé kết nối 1 lần, hạn 60s (xem mục 7.5)                                                                                                                                                        |
| File           | `POST /files/upload?kind=CV\|AVATAR\|LOGO`, `POST /files/presign?kind=&contentType=`, `POST /files/confirm`, `GET /files/{id}`, `DELETE /files/{id}`                                                                            |
| Quản trị       | `GET /admin/dashboard`, `GET /admin/users`, `PATCH /admin/users/{id}`, `GET /admin/jobs`, `PATCH /admin/jobs/{id}/review`, `GET/POST /admin/categories`, `PUT/DELETE /admin/categories/{id}`, `PATCH /admin/reviews/{id}` |

---

## 4. Phân tuyến theo vai trò

Guard nằm ở `src/app/router.tsx` (`RequireAuth` / `RequireRole` trong `src/features/auth/components/`):

```
/                     Trang chủ · danh sách tin tuyển dụng công khai
/jobs/:id             Chi tiết tin tuyển dụng
/login · /register · /forgot-password · /verify-email

/student/*            RequireRole(STUDENT)   — dashboard, tìm việc, hồ sơ, đơn ứng tuyển, tin đã lưu
/employer/*           RequireRole(EMPLOYER)  — dashboard, tin tuyển dụng, ứng viên, tổ chức, đánh giá
/admin/*              RequireRole(ADMIN)     — dashboard, duyệt tin, nhóm việc, người dùng, đánh giá

/notifications        RequireAuth            — hộp thư (dùng chung cho 3 vai trò)
/saved                RequireRole(STUDENT)   — tin tuyển dụng đã lưu
/profile              RequireAuth            — chuyển hướng theo vai trò
```

Người dùng đã đăng nhập bị chặn ở `/login` và `/register` → chuyển hướng về dashboard theo vai trò.

---

## 5. Cấu trúc mã nguồn

```
src/
├── app/                # router, providers, layouts
├── components/
│   ├── layout/         # header, footer, main-layout, dashboard-layout
│   ├── shared/         # job-card, empty-state, rating-stars, review-dialog...
│   └── ui/             # shadcn components (button, dialog, select, table...)
├── config/             # paths, env
├── features/           # auth, jobs, applications, employer, admin, reviews, notifications, profile, saved-jobs
├── hooks/              # useDebounce, useMediaQuery, useLocalStorage...
├── lib/                # axios, api-error, toast, query-client, realtime/*
├── pages/              # 1 file = 1 route (public / student / employer / admin)
├── types/              # global ambient types
└── utils/              # authStorage, format helpers
```

**Quy ước quan trọng**

- **Types**: nguồn sự thật duy nhất là `src/features/shared/types/index.ts` (mirror entity JPA của backend). Các feature khác re-export từ đây.
- **Data fetching**: TanStack Query. Mỗi feature có `services/` (gọi HTTP) + `hooks/` (query/mutation) — component không gọi service trực tiếp.
- **Lỗi API**: interceptor trong `src/lib/axios.ts` chuẩn hoá về `ApiError` (`src/lib/api-error.ts`); `showApiError()` trong `src/lib/toast.ts` bắn toast — **trừ** lỗi validation (hiển thị inline dưới field) và lỗi đã `handled`/`silent`.

---

## 6. Kiểm chứng

```bash
pnpm verify
```

Chạy 3 suite:

| Suite         | Script                    | Nội dung                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast & Error | `pnpm verify:toast`       | `normalizeApiError` (mapping status → kind), toast facade (dedupe theo `id`, merge trong 2s, rate limit), `showApiError` (bỏ qua validation/handled/silent)                                                                                                                                                |
| Tích hợp HTTP | `pnpm verify:integration` | Chạy HTTP server thật trong Node, kiểm tra interceptor, normalize lỗi, retry, header Authorization                                                                                                                                                                                                         |
| **E2E**       | `pnpm verify:e2e`         | **33 test**: chạy đúng đường đi của app — `service` → `axiosInstance` → HTTP → **backend thật** → MySQL — assert `ApiResponse<T>` khớp kiểu dữ liệu mà service khai báo (đặc biệt `data.accessToken`, `data.user`), qua lại 3 vai trò; gồm nộp đơn → rút đơn, ghi chú NTD, đăng tin → Admin duyệt, upload file, bật/tắt thông báo tin tuyển dụng, danh sách id tin đã lưu, phân quyền 403, endpoint lỗi 404 |

> **Cần backend đang chạy** cho `verify:e2e`: `docker compose up --build` (bản production, `:8080`)
> hoặc `./dev.sh up-d` (bản dev, `:8081`). Mặc định gọi `http://localhost:8080`;
> đổi bằng `API_URL=http://localhost:8081 pnpm verify:e2e`.
> Script **không idempotent** (ghi vào DB thật) → reset DB (`docker compose down -v`) khi cần chạy lại từ trạng thái sạch.

Ngoài ra có 2 script realtime (cần backend đang chạy, xem mục 7.5):

```bash
node scripts/verify-realtime-ws.mjs http://localhost:8081    # 7 sự kiện WebSocket
SMOKE_BASE_URL=http://localhost:5173 SMOKE_API_URL=http://localhost:8081 \
  node scripts/smoke-realtime-browser.mjs                    # toast + nút "Xem" trong Chrome
```

### Kiểm chứng ứng tuyển lại sau khi rút đơn

```bash
cd app
SMOKE_BASE_URL=http://localhost:5173 SMOKE_API_URL=http://localhost:8081/api/v1 \
  pnpm verify:reapply
```

6 assert trên Chrome thật: trang chi tiết tin hiện nút **"Ứng tuyển lại"** cho đơn
đã rút → form ứng tuyển đổi tiêu đề/nút submit → gửi lại thành công → đơn cũ được
**tái kích hoạt** (không tạo dòng mới) → trang chi tiết tin chuyển sang
"Đã ứng tuyển" → không có lỗi console / HTTP 4xx-5xx.

> Script tự tạo dữ liệu nền qua API (ứng tuyển → rút) rồi thao tác trên UI.
> Nếu SV demo đã ứng tuyển hết các tin `OPEN`, script tự **tạo tin mới + Admin duyệt**.
> Cần backend dev (`:8081`) + frontend dev (`:5173`).

### Smoke test trình duyệt (tùy chọn)

`scripts/smoke-browser.mjs` chạy Chromium (Playwright) thật để kiểm tra:
trang chủ render, đăng nhập sai → toast lỗi, đăng nhập đúng 3 vai trò → vào đúng dashboard,
route guard chặn sinh viên khỏi `/admin`, và không có lỗi runtime trong console.

```bash
pnpm build
pnpm preview &                 # http://localhost:4173
pnpm smoke:browser             # cần `npm i -D playwright` + `npx playwright install chromium`
```

Ảnh chụp màn hình được lưu vào `.tmp-smoke/` (đã gitignore).

---

## 7. Tích hợp backend (API thật đã sẵn sàng)

> Backend Spring Boot 3 đã được implement đầy đủ trong `../backend/` — xem `../README.md` mục "Khởi chạy nhanh bằng Docker".

### 7.1. Chạy full-stack bằng Docker (khuyến nghị)

```bash
# ở thư mục gốc repo
docker compose up --build
```

- SPA: <http://localhost:8000> (nginx reverse proxy `/api` → backend)
- Swagger: <http://localhost:8080/swagger-ui.html>

App gọi **API thật** qua nginx reverse proxy (cùng origin → không lo CORS).

Tài khoản demo:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Sinh viên | `student@viejob.vn` | `Student@123` |
| Nhà tuyển dụng | `employer@viejob.vn` | `Employer@123` |
| Quản trị viên | `admin@viejob.vn` | `Admin@123` |

### 7.1b. Chế độ DEV trong Docker (hot-reload)

```bash
# ở thư mục gốc repo
./dev.sh up-d
# hoặc
docker compose -f docker-compose.dev.yml up --build
```

- SPA (HMR): <http://localhost:5173> — Vite dev server, sửa `src/` là reload ngay
- Backend: <http://localhost:8081> — `mvn spring-boot:run` + devtools, tự compile & restart khi đổi code
- MySQL: `localhost:3307` (volume riêng, không đụng bản production)

Chạy song song với bản production ở mục 7.1. Xem chi tiết ở `../README.md` mục "4b".

Biến môi trường dev (đặt trong `docker-compose.dev.yml`):

| Biến                    | Giá trì                    | Ý nghĩa                                                     |
| ----------------------- | -------------------------- | ----------------------------------------------------------- |
| `VITE_DEV_PROXY_TARGET` | `http://backend:8080`      | Đích proxy **bên trong container** (tên service DNS)       |
| `VITE_DEV_POLLING`      | `true`                     | Bật polling cho watcher (Docker Desktop trên Windows)       |

> `VITE_API_URL_DEV` **không cần đặt** ở bản dev → request chạy cùng origin với Vite dev server
> và được proxy `/api` chuyển tiếp tới backend.

> **Lưu ý**: thêm dependency mới trong `package.json` → phải rebuild image
> (`docker compose -f docker-compose.dev.yml build frontend`), vì `node_modules`
> của host là bản Windows không chạy được trong container Linux.

### 7.2. Chạy frontend dev ngoài Docker

1. Backend phải đang chạy (bản dev `:8081` hoặc production `:8080`).
2. `pnpm dev` → Vite proxy `/api` → `http://localhost:8080` (đổi đích proxy bằng `VITE_DEV_PROXY_TARGET`).

### 7.3. Contract API

Backend phải trả đúng envelope:
```json
{ "success": true, "message": "...", "data": {} }
```
và lỗi:
```json
{
  "timestamp": "...",
  "status": 400,
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "...",
  "errors": [{ "field": "email", "message": "..." }]
}
```

Không cần sửa service nào — `src/features/*/services/*` đã dùng đúng đường dẫn & kiểu dữ liệu mong đợi.

Token: `Authorization: Bearer <access_token>`; refresh qua `POST /api/v1/auth/refresh` với body `{ refresh_token }`.

### 7.4. Dữ liệu seed

Dữ liệu demo do **backend migration** quản lý — nằm trong
`../backend/src/main/resources/db/migration/`:
`V3__seed_demo_data.sql` (user, hồ sơ, tin tuyển dụng, đơn ứng tuyển + timeline, đánh giá, thông báo, tin đã lưu, master data)
+ `V7__seed_review_replies.sql` + `V9__seed_work_histories.sql`.

Đây là **SQL tĩnh** → checksum ổn định, không gây `Migration checksum mismatch` khi rebuild container.
Muốn đổi dữ liệu demo: sửa trực tiếp file SQL → `docker compose down -v && docker compose up --build`
(hoặc `./dev.sh reset` cho bản dev) để Flyway migrate lại từ V1.

### 7.4b. Upload file (CV / ảnh đại diện / logo)

Không dùng URL giả (`pravatar.cc`, `ui-avatars.com`, `viejob.vn/cv/...`) — file được upload thật qua API:

```ts
// src/features/files/services/files.service.ts
const res = await filesService.upload(file, "CV"); // kind: CV | AVATAR | LOGO
// → { id, url, fileName, mimeType, sizeBytes, kind, bucket }
```

| Hook                        | Việc                                    |
| --------------------------- | --------------------------------------- |
| `useUploadFile()`           | Upload + validate phía client + toast   |
| `useDownloadFile()`         | Tải CV qua API có `Authorization`       |
| `useDeleteFile()`           | Xoá file đã upload                      |

Nơi dùng: hồ sơ sinh viên (CV + ảnh đại diện), hồ sơ tổ chức (logo NTD), trang ứng tuyển (CV).
Ảnh đại diện & logo là ảnh công khai; CV là tài nguyên riêng tư (chỉ chủ sở hữu, admin và NTD đã nhận đơn mới đọc được).

**Luồng upload (2 bước, backend không nhận file):**

1. `POST /api/v1/files/presign?kind=CV&contentType=application/pdf` → `{ uploadUrl, storageKey, contentType, expiresInSeconds }`
2. Client `PUT uploadUrl` với file — header `Content-Type` **phải đúng bằng** giá trị backend đã ký (sai là `403 SignatureDoesNotMatch`).
3. `POST /api/v1/files/confirm` (body `storageKey`, `kind`, `fileName`) → backend kiểm tra magic bytes + ghi metadata → trả `{ id, url, ... }`.

> Nơi lưu trữ file duy nhất là **Cloudflare R2**. Luồng multipart (`POST /files/upload`)
> vẫn còn (backend đọc bytes rồi đẩy lên R2) nhưng client không dùng.

**Quy ước quan trọng (V11):**

- `url` trả về **tương đối**: `/api/v1/files/{slug}` — không ghép domain, nên cùng một DB chạy
  đúng ở dev `:5173`, prod `:8000` và domain deploy thật.
- CV là tài nguyên riêng tư → **không** dùng `<a href={cvUrl}>` (trình duyệt không gắn
  `Authorization` → 403). Dùng `useDownloadFile()` / component `CvFileRow`
  (`app/src/components/shared/cv-file-row.tsx`): axios blob → object URL → `<a download>`.
- Cập nhật hồ sơ: `null` = *không đổi*, chuỗi rỗng `""` = *xoá file* (backend chuẩn hoá
  qua `FileUrlValidator`, chặn URL ngoài bằng `400`).
- Upload xong mà rời trang không lưu → file vừa upload bị xoá khi unmount.
- **CV / avatar / logo đều lưu ngay vào DB** (không đợi bấm "Lưu hồ sơ") và file cũ bị xoá
  ngay lúc thay thế — không còn trạng thái "đã upload nhưng chưa lưu" sinh file rác.
  Xoá khỏi hồ sơ cũng ghi ngay `""` (xoá pointer) + xoá file, nên bấm xoá rồi F5 không
  còn giữ lại file cũ.
- **Không giới hạn số lượng file** — chỉ giới hạn tổng dung lượng 20MB/user
  (blob giữ lại cho đơn ứng tuyển cũng vẫn tính vào quota).
  Xoá CV đã gửi kèm đơn ứng tuyển vẫn được (backend giữ blob, xem mục backend).
- `cleanupReplacedFile` báo toast cảnh báo khi xoá file cũ thất bại (bỏ qua 404/409).

**Kiểm chứng:**

```bash
cd app
API_URL=http://localhost:8080/api/v1 pnpm verify:files-storage
API_URL=http://localhost:8081/api/v1 pnpm verify:files-storage
```

23 assert: upload CV, bucket private, cấu trúc `storageKey`, URL tương đối, CV stream 200 kèm
tên gốc, quyền tải CV (chủ sở hữu / khách / NTD), magic bytes chặn file giả dạng, resize ảnh ≤ 512px,
ảnh công khai redirect 302 sang CDN, xoá file + giải phóng quota.

Kiểm chứng trên UI thật (Chrome):

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:files-upload
```

7 assert: upload avatar + CV qua trang hồ sơ, file giả dạng bị chặn, không lỗi console.

> Chi tiết cấu hình R2 (2 bucket, CORS, quota) xem `AGENTS.md` → mục "Lưu trữ file (V10)".

### 7.5. Realtime thông báo (WebSocket)

Nguồn sự thật vẫn là bảng `notifications` ở backend. WebSocket chỉ **đẩy tín hiệu** nhẹ
(`{ id, type, title, body, link, unreadCount }`); client nhận frame → cập nhật badge → hiện toast →
invalidate cache TanStack Query để refetch dữ liệu chuẩn từ REST.

**Luồng kết nối**

```
Client                          Backend
  │ POST /api/v1/ws/ticket  (Bearer JWT) ──▶  cấp vé 1 lần, TTL 60s
  │ GET /ws/notifications?ticket=<ticket> ──▶  validate + consume vé → set userId
  │ ◀── frame { id, type, title, ... } ────  (mỗi khi có thông báo mới)
```

Trình duyệt không gắn header `Authorization` khi mở WebSocket → JWT không bao giờ lọt vào query string
hay access log. Vé sai/hết hạn → handshake bị từ chối với HTTP 403.

**Mã nguồn liên quan**

| File                                          | Vai trò                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/realtime/notification-socket.ts`     | Client WebSocket native: reconnect backoff 1s→30s, ping 25s                    |
| `src/lib/realtime/notification-broadcast.ts`  | `BroadcastChannel` đồng bộ nhiều tab, chỉ tab có focus mới hiện toast        |
| `src/features/notifications/hooks/useNotificationSocket.ts` | Invalidate query cache + toast có nút **"Xem"** (đánh dấu đã đọc + điều hướng) |
| `src/components/layout/notification-socket.tsx` | Mount trong `MainLayout`, tự mở/đóng socket theo trạng thái đăng nhập       |
| `vite.config.ts` (`/ws` proxy) · `nginx.conf` (`location /ws/`) | Proxy WebSocket cho dev & production                        |

**7 sự kiện realtime**

| # | Nghiệp vụ                   | Nhận            | Type               | Link                            |
| - | --------------------------- | --------------- | ------------------ | ------------------------------- |
| 1 | Sinh viên ứng tuyển         | Nhà tuyển dụng  | `APPLICATION`      | `/employer/applications/{id}`   |
| 2 | NTD đổi trạng thái đơn      | Sinh viên       | `APPLICATION_STATUS` | `/student/applications/{id}`  |
| 3 | Sinh viên rút đơn           | Nhà tuyển dụng  | `APPLICATION_STATUS` | `/employer/applications/{id}`   |
| 4 | NTD đăng tin (chờ duyệt)    | Tất cả Admin    | `JOB`              | `/admin/jobs`                   |
| 5 | Admin duyệt tin             | Nhà tuyển dụng  | `JOB`              | `/employer/jobs`                |
| 6 | Admin từ chối tin           | Nhà tuyển dụng  | `JOB`              | `/employer/jobs/{slug}/edit`    |
| 7 | Đánh giá mới                | Người bị đánh giá | `REVIEW`          | `/employer/reviews`             |

**Kiểm chứng**

```bash
node scripts/verify-realtime-ws.mjs http://localhost:8081
# 7 sự kiện qua WebSocket thật + đối chiếu unreadCount với REST

SMOKE_BASE_URL=http://localhost:5173 SMOKE_API_URL=http://localhost:8081 \
  node scripts/smoke-realtime-browser.mjs
# Chrome thật: toast hiện lên, bấm "Xem" → điều hướng đúng, kho thông báo có dữ liệu
```

---

## 8. Trước khi nộp báo cáo / bảo vệ đồ án

```bash
pnpm lint      # 0 error, 0 warning
pnpm build     # type-check + production build
pnpm verify    # 3/3 suite PASSED (toast, integration, E2E qua API thật)
```

Demo nên trình bày theo thứ tự: **Sinh viên tìm & ứng tuyển tin → Nhà tuyển dụng duyệt đơn → đánh giá 2 chiều → Quản trị viên duyệt tin & quản lý danh mục/người dùng**.
