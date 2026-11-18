# VieJob Marketplace — Frontend

Frontend của đồ án **VieJob Marketplace** — nền tảng kết nối việc làm bán thời gian cho sinh viên.

> Ứng dụng chạy độc lập hoàn toàn: toàn bộ API được **mock ở tầng transport (Axios adapter)** với in-memory database, trong khi backend Spring Boot được phát triển song song.

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
| `pnpm verify`  | Chạy toàn bộ bộ kiểm chứng (toast → integration → mock API → E2E) |

### Biến môi trường

File `.env` ở thư mục `app/`:

```env
VITE_API_URL_DEV=http://localhost:8000
VITE_USE_MOCK_API=true
```

| Biến                    | Mặc định                | Ý nghĩa                                                            |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `VITE_USE_MOCK_API`     | `true`                  | `true` → dùng mock adapter; `false` → gọi API thật của Spring Boot |
| `VITE_API_URL_DEV`      | `http://localhost:8000` | Base URL của backend khi tắt mock                                  |
| `VITE_MOCK_MIN_DELAY`   | `250`                   | Độ trễ mô phỏng network tối thiểu (ms)                             |
| `VITE_MOCK_MAX_DELAY`   | `600`                   | Độ trễ mô phỏng network tối đa (ms)                                |
| `VITE_CLIENT_ID_GOOGLE` | —                       | Client ID Google OAuth (dùng cho luồng đăng nhập Google)           |

**Chuyển sang API thật** chỉ cần đặt `VITE_USE_MOCK_API=false` — không phải sửa một dòng service nào, vì mọi service đều gọi qua `axiosInstance` tại `src/lib/axios.ts`.

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

Ở màn hình đăng nhập có nút bấm nhanh để điền sẵn tài khoản demo. Ngoài ra, mock API **tự tạo tài khoản** khi đăng nhập bằng email lạ chưa tồn tại (vai trò được suy ra từ tiền tố email: `admin*` → ADMIN, `employer*`/`company*` → EMPLOYER, còn lại → STUDENT) — thuận tiện cho việc demo nhanh.

Dữ liệu mock nằm trong RAM nên **F5 sẽ reset về trạng thái seed** (đủ dữ liệu để demo đầy đủ luồng).

---

## 3. Tầng MOCK API

```
src/lib/mock/
├── adapter.ts        # Axios adapter — chặn request ở tầng transport
├── router.ts         # Định tuyến path → handler
├── db.ts             # In-memory database (seed từ src/mocks/*)
├── errors.ts         # MockHttpError + envelope lỗi chuẩn backend
└── handlers/
    ├── auth.ts       # đăng ký / đăng nhập / Google / /me / refresh
    ├── jobs.ts       # danh sách, lọc, chi tiết, CRUD tin (NTD + Admin duyệt)
    ├── applications.ts # ứng tuyển, duyệt đơn, đánh giá, thông báo, hồ sơ, tin lưu
    ├── admin.ts      # dashboard, user, nhóm việc, master data
    └── files.ts      # upload/xoá file, ghi chú NTD, bật thông báo tin tuyển dụng, saved-jobs/ids
```

> `src/mocks/time.ts` là **đồng hồ deterministic** (`MOCK_NOW`) — mọi timestamp seed đều bám về đây
> nên `pnpm seed:sql` cho ra file giống nhau mọi lần (tránh lỗi Flyway checksum mismatch).

### Nguyên tắc thiết kế

1. **Mock ở tầng transport, không phải ở tầng service.** Toàn bộ `src/features/*/services/*` vẫn gọi `http.get/post/...` như bình thường — chỉ có `axiosInstance` bị gắn `mockAdapter`.
2. **Envelope giống hệt backend Spring Boot.**
   - Thành công: `{ success: true, message: string, data: T }`
   - Lỗi: `{ timestamp, status, success: false, code, message, errors?: [{ field, message }] }`
3. **Stateful.** Đăng tin → Admin duyệt → Sinh viên ứng tuyển → Nhà tuyển dụng duyệt đơn → đánh giá 2 chiều đều có hiệu lực ngay trong phiên.
4. **Có độ trễ mô phỏng** (250–600 ms) để UI hiển thị loading state thật.
5. **Phân quyền thật trong router**: route yêu cầu token sẽ trả `401` nếu thiếu/sai token; handler kiểm tra chủ sở dữ liệu và trả `403` nếu truy cập chéo vai trò.

### Bảng định tuyến mock (rút gọn)

| Nhóm           | Endpoint                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/refresh`, `GET /auth/me`                                                         |
| Public         | `GET /jobs/public`, `GET /jobs/public/{id}`, `GET /jobs/public/related`, `GET /public/{categories,positions,provinces,districts,skills,salary-benchmarks}`                                                                |
| Sinh viên      | `GET/PUT /student/profile`, `GET/POST /student/applications`, `GET /student/applications/{id}`, `PATCH /student/applications/{id}/withdraw`, `GET/POST/DELETE /student/saved-jobs`, `GET /student/saved-jobs/ids`, `GET/POST/DELETE /student/job-notifications` |
| Nhà tuyển dụng | `GET/POST /employer/jobs`, `PUT/DELETE /employer/jobs/{id}`, `GET /employer/applications`, `GET/PATCH /employer/applications/{id}`, `PATCH /employer/applications/{id}/note`, `GET/PUT /employer/profile`, `POST /employer/reviews/{id}/reply` |
| Đánh giá       | `POST /reviews`, `GET /reviews?targetType=&targetUserId=`                                                                                                                                                                 |
| Thông báo      | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`                                                                                                 |
| WebSocket      | `POST /ws/ticket` — cấp vé kết nối 1 lần, hạn 60s (xem mục 7.5)                                                                                                                                                        |
| File           | `POST /files/upload?kind=CV\|AVATAR\|LOGO`, `GET /files/{id}`, `DELETE /files/{id}`                                                                                                                                     |
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
├── lib/                # axios, api-error, toast, query-client, mock/*
├── mocks/              # Dữ liệu seed: users, employers, jobs, categories, applications, reviews, notifications
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

Chạy 4 suite:

| Suite         | Script                    | Nội dung                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast & Error | `pnpm verify:toast`       | `normalizeApiError` (mapping status → kind), toast facade (dedupe theo `id`, merge trong 2s, rate limit), `showApiError` (bỏ qua validation/handled/silent)                                                                                                                                                |
| Tích hợp HTTP | `pnpm verify:integration` | Chạy HTTP server thật trong Node, kiểm tra interceptor, normalize lỗi, retry, header Authorization                                                                                                                                                                                                         |
| **Mock API**  | `pnpm verify:mock-api`    | **47 test**: envelope `{ success, message, data }` & envelope lỗi; đăng nhập/đăng ký 3 vai trò; phân quyền 401/403/404; lọc & phân trang tin; NTD đăng tin → Admin duyệt → SV ứng tuyển → NTD duyệt đơn → đánh giá 2 chiều → trả lời đánh giá; quản lý thông báo; CRUD nhóm việc; khoá/đổi role người dùng |
| **E2E**       | `pnpm verify:e2e`         | **26 test**: chạy đúng đường đi của app — `service` → `axiosInstance` → `mockAdapter` → `router` — assert `ApiResponse<T>` khớp kiểu dữ liệu mà service khai báo (đặc biệt `data.accessToken`, `data.user`), qua lại 3 vai trò; gồm upload file, ghi chú NTD, bật/tắt thông báo tin tuyển dụng, danh sách id tin đã lưu |

> Mock seed dùng **đồng hồ cố định** (`src/mocks/time.ts` → `MOCK_NOW`) để `pnpm seed:sql` luôn sinh ra
> `V3__seed_demo_data.sql` giống hệt nhau → Flyway không báo `Migration checksum mismatch` khi rebuild container.

Ngoài ra có 2 script realtime (cần backend đang chạy, xem mục 7.5):

```bash
node scripts/verify-realtime-ws.mjs http://localhost:8081    # 7 sự kiện WebSocket
SMOKE_BASE_URL=http://localhost:5173 SMOKE_API_URL=http://localhost:8081 \
  node scripts/smoke-realtime-browser.mjs                    # toast + nút "Xem" trong Chrome
```

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

Compose build frontend với `VITE_USE_MOCK_API=false` → app gọi **API thật**.

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

| Biến                    | Giá trị                    | Ý nghĩa                                                     |
| ----------------------- | -------------------------- | ----------------------------------------------------------- |
| `VITE_USE_MOCK_API`     | `false`                    | Gọi API thật (Vite proxy chuyển tiếp tới backend)          |
| `VITE_API_URL_DEV`      | `http://localhost:5173`    | Base URL browser dùng — cùng origin nên đi qua proxy       |
| `VITE_DEV_PROXY_TARGET` | `http://backend:8080`      | Đích proxy **bên trong container** (tên service DNS)       |
| `VITE_DEV_POLLING`      | `true`                     | Bật polling cho watcher (Docker Desktop trên Windows)       |

> **Lưu ý**: thêm dependency mới trong `package.json` → phải rebuild image
> (`docker compose -f docker-compose.dev.yml build frontend`), vì `node_modules`
> của host là bản Windows không chạy được trong container Linux.

### 7.2. Chạy frontend dev độc lập (vẫn dùng mock)

1. Đặt `VITE_USE_MOCK_API=true` trong `.env` (mặc định).
2. `pnpm dev`

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

### 7.4. Sinh lại dữ liệu seed

```bash
pnpm seed:sql
```

Sinh `../backend/src/main/resources/db/migration/V3__seed_demo_data.sql` từ đúng `src/mocks/*` (full parity: user, hồ sơ, tin tuyển dụng, đơn ứng tuyển + timeline, đánh giá, thông báo, tin đã lưu, master data). Sau khi đổi dataset mock, nhớ `docker compose down -v && docker compose up --build` để Flyway seed lại từ đầu.

> **Deterministic**: seed dùng đồng hồ cố định `src/mocks/time.ts` (`MOCK_NOW`) → file SQL sinh ra **giống nhau mọi lần**,
> nên rebuild container không bị lỗi `Migration checksum mismatch for migration version 3`.

### 7.4b. Upload file (CV / ảnh đại diện / logo)

Không dùng URL giả (`pravatar.cc`, `ui-avatars.com`, `viejob.vn/cv/...`) — file được upload thật qua API:

```ts
// src/features/files/services/files.service.ts
const res = await filesService.upload(file, "CV"); // kind: CV | AVATAR | LOGO
// → { id, url, fileName, mimeType, sizeBytes, kind }
```

| Hook                        | Việc                                    |
| --------------------------- | --------------------------------------- |
| `useUploadFile()`           | Upload + validate phía client + toast   |
| `useDeleteFile()`           | Xoá file đã upload                      |

Nơi dùng: hồ sơ sinh viên (CV + ảnh đại diện), hồ sơ tổ chức (logo NTD), trang ứng tuyển (CV).
Ảnh đại diện & logo là ảnh công khai; CV là tài nguyên riêng tư (chỉ chủ sở hữu, admin và NTD đã nhận đơn mới đọc được).

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
pnpm verify    # 4/4 suite PASSED (toast, integration, mock API, E2E)
```

Demo nên trình bày theo thứ tự: **Sinh viên tìm & ứng tuyển tin → Nhà tuyển dụng duyệt đơn → đánh giá 2 chiều → Quản trị viên duyệt tin & quản lý danh mục/người dùng**.
