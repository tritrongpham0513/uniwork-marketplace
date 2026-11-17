# VieJob Marketplace

Nền tảng kết nối việc làm bán thời gian cho sinh viên — monorepo: `app/` (React frontend), `backend/` (Spring Boot API).

## Agent skills

### Issue tracker

Local markdown — ticket/spec nằm trong `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Mặc định 5 vai trò chuẩn (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), ghi trong `Status:` line của từng file ticket. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `GLOSSARY.md` + `docs/adr/` ở repo root. See `docs/agents/domain.md`.

## Spec-driven rule

`spec/` là source of truth cho đề tài này. Trước khi viết code, đọc `spec/00-intent.md`, `spec/01-product-spec.md`, `spec/02-technical-spec.md`, `spec/03-tasks.md`.
Rule đầy đủ nằm ở `.cursor/rules/spec-driven.mdc`.

## Backend (`backend/`)

Chi tiết kỹ thuật đầy đủ: `backend/README.md` (nếu có) + `spec/02-technical-spec.md`.

### Spring Boot API (không mock)

- `backend/` là **API thật** (Spring Boot 3.3.5, Java 17, Maven, MySQL 8.4).
- Endpoint chuẩn: `/api/v1/**`, envelope `{ success, message, data }` / `{ timestamp, status, success: false, code, message, errors }`.
- Dữ liệu seed được sinh tự động từ `app/src/mocks/*` bằng `pnpm seed:sql` → `backend/src/main/resources/db/migration/V3__seed_demo_data.sql`.
- **Public ID là string slug** (`job-001`, `cat-fnb`, `emp-viejob-demo`, `hcm`, `q1`, `sk-excel`) để frontend không cần mapping id.
- Không cài Java/Maven trên máy — chạy bằng Docker:

```bash
docker compose up --build      # mysql + backend + frontend
# http://localhost:8000         -> SPA (nginx proxy /api -> backend:8080)
```

### Chế độ DEV (hot-reload, full dev trong Docker)

```bash
./dev.sh up-d                  # hoặc: docker compose -f docker-compose.dev.yml up --build
# http://localhost:5173         -> Vite dev server + HMR (proxy /api -> backend)
# http://localhost:8081         -> backend (devtools tự restart khi đổi code)
```

Bản dev chạy **song song** với bản production (port riêng: 5173/8081/3307).
Sửa code trên host → container thấy ngay qua bind-mount; backend tự compile & restart
(watcher `backend/scripts/dev-watch.sh` dùng polling vì bind-mount Windows không phát inotify).

Thêm dependency mới (`package.json` / `pom.xml`) → cần `docker compose -f docker-compose.dev.yml build frontend|backend`.

### Tài khoản demo (seed)

| Vai trò | Email | Mật khẩu | Route |
| --- | --- | --- | --- |
| Sinh viên | `student@viejob.vn` | `Student@123` | `/student/*` |
| Nhà tuyển dụng | `employer@viejob.vn` | `Employer@123` | `/employer/*` |
| Quản trị viên | `admin@viejob.vn` | `Admin@123` | `/admin/*` |

`DemoAccountInitializer` băm BCrypt cho các user seed (`password_hash = 'SEED_PENDING'`) lúc app khởi động.

### Frontend (`app/`)

Chi tiết kỹ thuật đầy đủ: `app/README.md`.

### Mock transport layer (chế độ chạy độc lập)

- `src/lib/mock/adapter.ts` — Axios adapter chặn request, mô phỏng độ trễ 250–600 ms
- `src/lib/mock/router.ts` — định tuyến path → handler
- `src/lib/mock/db.ts` — in-memory database, seed từ `src/mocks/*`
- `src/lib/mock/handlers/` — `auth.ts`, `jobs.ts`, `applications.ts`, `admin.ts`
- `src/lib/mock/errors.ts` — `MockHttpError` + envelope lỗi chuẩn backend

Bật/tắt bằng `VITE_USE_MOCK_API` (mặc định `true`). Chuyển sang API thật chỉ cần đặt `VITE_USE_MOCK_API=false` — **không sửa service nào**.

**Envelope bắt buộc** (khớp Spring Boot backend):

```json
// thành công
{ "success": true, "message": "...", "data": { } }
// lỗi
{ "timestamp": "...", "status": 400, "success": false, "code": "VALIDATION_FAILED",
  "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

### Role routing

Guard: `RequireAuth` / `RequireRole` (`src/features/auth/components/`), khai báo trong `src/app/router.tsx`.

- `/student/*` → `STUDENT`
- `/employer/*` → `EMPLOYER`
- `/admin/*` → `ADMIN`
- `/notifications` → đã đăng nhập (dùng chung)
- `/saved` → `STUDENT`
- `/profile` → đã đăng nhập (redirect theo vai trò)

### Kiểm chứng

```bash
cd app
pnpm lint      # 0 error, 0 warning
pnpm build     # tsc -b && vite build
pnpm verify    # verify:toast + verify:integration + verify:mock-api + verify:e2e
pnpm seed:sql  # sinh lại V3__seed_demo_data.sql từ app/src/mocks/*
```

`pnpm verify:mock-api` chạy `scripts/verify-mock-api.ts` — assert envelope của mọi response + 3 luồng nghiệp vụ trọn vẹn (Sinh viên ứng tuyển → NTD duyệt đơn → đánh giá 2 chiều; NTD đăng tin → Admin duyệt; Admin quản lý user/danh mục/đánh giá).

`pnpm verify:e2e` chạy `scripts/verify-e2e.ts` — đi đúng đường của app (`service` → `axiosInstance` → `mockAdapter` → `router`) để chắc chắn `ApiResponse<T>` khớp kiểu dữ liệu service khai báo.

### Smoke test backend (Docker)

```bash
docker compose up -d --build
bash backend/scripts/smoke-api.sh http://localhost:8080/api/v1
```

Script idempotent — chạy lại nhiều lần vẫn xanh (tự chọn tin chưa ứng tuyển).

### Smoke test trình duyệt (app thật + API thật qua nginx)

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:browser
```

11 test: trang chủ, login sai/sinh viên/NTD/admin, danh sách đơn, chặn khu vực admin,
quản lý tin & nhóm việc, và kiểm tra không có lỗi console. Dùng Chrome hệ thống
(`channel: "chrome"`), fallback về Chromium bundled. Ảnh chụp: `app/.tmp-smoke-live/`.

## Realtime thông báo (WebSocket)

Nguồn sự thật vẫn là bảng `notifications` trong DB. WebSocket chỉ **đẩy tín hiệu**
(payload nhẹ `{ id, type, title, body, link, unreadCount }`); client nhận frame →
cập nhật badge + hiện toast → invalidate cache TanStack Query để refetch dữ liệu chuẩn.

### Backend

- `spring-boot-starter-websocket` — WebSocket native, không Socket.IO.
- `POST /api/v1/ws/ticket` (cần Bearer JWT) → cấp **vé dùng một lần, hạn 60s**.
  Trình duyệt không gắn header `Authorization` khi mở WS nên không lộ JWT vào query string / access log.
- `GET /ws/notifications?ticket=<ticket>` — `TicketHandshakeInterceptor` validate + **consume** vé,
  set `userId` vào `WebSocketSession`; vé sai/hết hạn → HTTP 403.
- `NotificationWebSocketHandler` giữ `Map<Long, Set<WebSocketSession>>` theo user → push tới đúng người nhận.
- `RealtimePublisher` là seam giữa domain và transport (business service không import WebSocket).
- `NotificationServiceImpl.push(...)` đăng ký `TransactionSynchronizationManager` **afterCommit** →
  transaction rollback không sinh thông báo ma.

Danh mục 7 sự kiện realtime:

| # | Nghiệp vụ | Nhận | Type | Link |
| --- | --- | --- | --- | --- |
| 1 | Sinh viên ứng tuyển | Nhà tuyển dụng | `APPLICATION` | `/employer/applications/{id}` |
| 2 | NTD đổi trạng thái đơn | Sinh viên | `APPLICATION_STATUS` | `/student/applications/{id}` |
| 3 | Sinh viên rút đơn | Nhà tuyển dụng | `APPLICATION_STATUS` | `/employer/applications/{id}` |
| 4 | NTD đăng tin (`PENDING_REVIEW`) | Tất cả Admin | `JOB` | `/admin/jobs` |
| 5 | Admin duyệt tin | Nhà tuyển dụng | `JOB` | `/employer/jobs` |
| 6 | Admin từ chối tin | Nhà tuyển dụng | `JOB` | `/employer/jobs/{slug}/edit` |
| 7 | Đánh giá mới | Người bị đánh giá | `REVIEW` | `/employer/reviews` |

### Frontend

- `src/lib/realtime/notification-socket.ts` — client WS native: reconnect backoff (1s→30s), ping 25s.
- `src/lib/realtime/notification-broadcast.ts` — `BroadcastChannel("viejob:realtime:notifications")` đồng bộ nhiều tab;
  chỉ tab đang có focus mới hiện toast (`shouldShowToast()`).
- `src/features/notifications/hooks/useNotificationSocket.ts` — invalidate `NOTIFICATION_KEYS.all`,
  `APPLICATION_KEYS.all`, `EMPLOYER_JOB_KEYS.all`, `ADMIN_KEYS.jobs()`; toast có nút **"Xem"** →
  đánh dấu đã đọc + điều hướng deep link.
- `src/components/layout/notification-socket.tsx` — mount trong `MainLayout`, tự mở/đóng theo trạng thái đăng nhập.

### Reverse proxy

- `app/nginx.conf` — `location /ws/` với `Upgrade` / `Connection "upgrade"`, timeout 300s.
- `app/vite.config.ts` — proxy `"/ws": { ws: true }` cho dev server.

### Kiểm chứng realtime

```bash
cd app
node scripts/verify-realtime-ws.mjs http://localhost:8081   # 7 sự kiện qua WebSocket thật
SMOKE_BASE_URL=http://localhost:5173 SMOKE_API_URL=http://localhost:8081 \
  node scripts/smoke-realtime-browser.mjs                      # toast + nút Xem trong Chrome thật
```

`verify-realtime-ws.mjs` idempotent (mỗi lần chạy tạo tin tuyển dụng mới) và đối chiếu
`unreadCount` trong frame với REST `/api/v1/notifications/unread-count`.

