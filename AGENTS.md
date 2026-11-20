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
- Dữ liệu demo nằm trong `backend/src/main/resources/db/migration/V3__seed_demo_data.sql` (+ `V7`, `V9`) — **SQL tĩnh do backend sở hữu**.
- **Public ID là string slug** (`job-001`, `cat-fnb`, `emp-viejob-demo`, `hcm`, `q1`, `sk-excel`) để frontend không cần mapping id.
- **Flyway**: `V1__init_schema.sql` → `V2__marketplace_schema.sql` → `V3__seed_demo_data.sql` → `V4__file_uploads_and_job_notify.sql` → `V5__remove_viewed_application_status.sql` → `V6__review_two_way_replies.sql` → `V7__seed_review_replies.sql` → `V8__student_work_histories.sql` → `V9__seed_work_histories.sql` → `V10__file_upload_bucket_and_checksum.sql`.
  Các file seed là **SQL tĩnh** → checksum ổn định, không bị `Migration checksum mismatch` khi rebuild.
- **Lưu file upload**: **Cloudflare R2** là nơi lưu trữ duy nhất (S3-compatible, 10 GB free + egress miễn phí).
  Không còn provider `local` → container không ghi file xuống đĩa, không mất dữ liệu khi restart trên PaaS có disk ephemeral.
  Cấu hình qua `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` + `R2_BUCKET_PUBLIC` / `R2_BUCKET_PRIVATE`.
  Xem mục "Lưu trữ file (V10)".
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

> **Sửa file migration V3/V4/V5 đã apply** → Flyway báo `Migration checksum mismatch` và backend dev
> crash loop. Dùng `./dev.sh reset` để xoá volume `mysql-dev-data` và migrate lại từ V1.

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

Frontend **luôn gọi API thật** — không có tầng mock nào trong bất kỳ bản build nào.

- `src/lib/axios.ts` — Axios instance dùng chung (gắn `Authorization`, tự refresh token).
- `src/config/env.ts` — `API_URL_DEV` **rỗng mặc định** → request chạy **cùng origin** với app:
  - dev: Vite proxy `/api` → backend (xem `vite.config.ts`)
  - production: nginx proxy `/api` → backend (xem `nginx.conf`)
  Chỉ đặt `VITE_API_URL_DEV` khi app chạy ở origin khác hẳn với API.
- WebSocket thông báo: `src/lib/realtime/notification-socket.ts` — khi base URL rỗng thì suy ra từ `window.location.origin`.
- Dữ liệu demo do **backend migration** quản lý → muốn đổi dữ liệu thì sửa SQL trong `backend/src/main/resources/db/migration/`.

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
pnpm verify    # verify:toast + verify:integration + verify:e2e
```

`pnpm verify:e2e` chạy `scripts/verify-e2e.ts` — đi đúng đường của app (`service` → `axiosInstance` → HTTP → backend → MySQL)
để chắc chắn `ApiResponse<T>` khớp kiểu dữ liệu service khai báo.

> **Cần backend đang chạy** (`docker compose up --build` hoặc `./dev.sh up-d`).
> Mặc định gọi `http://localhost:8080`; đổi bằng `API_URL=http://localhost:8081` cho bản dev.
> Script **không idempotent** (tạo tin tuyển dụng, ghi chú, bật/tắt job-notify trên DB thật) →
> reset DB (`docker compose down -v`) khi cần chạy lại từ trạng thái sạch.

### Smoke test backend (Docker)

```bash
docker compose up -d --build
BASE_URL=http://localhost:8080/api/v1 bash backend/scripts/smoke-api.sh
```

> Script đọc base URL từ biến môi trường `BASE_URL` (mặc định `http://localhost:8080/api/v1`).
> Chạy bản dev: `BASE_URL=http://localhost:8081/api/v1 bash backend/scripts/smoke-api.sh`.

Script idempotent — chạy lại nhiều lần vẫn xanh (tự chọn tin chưa ứng tuyển).

### Endpoint bổ sung (V4)

| Nhóm         | Endpoint                                                                                       | Ghi chú                                                        |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| File         | `POST /api/v1/files/upload?kind=CV\|AVATAR\|LOGO` (multipart `file`)                            | Trả `201` + `{ id, url, fileName, mimeType, sizeBytes, kind, bucket }` |
| File         | `POST /api/v1/files/presign?kind=&contentType=`                                                  | Cấp URL upload trực tiếp (presigned PUT) → client PUT thẳng lên R2 |
| File         | `POST /api/v1/files/confirm` (body `storageKey`, `kind`, `fileName`)                             | Xác nhận file đã upload → backend kiểm tra magic bytes + ghi metadata |
| File         | `GET /api/v1/files/{id}` · `DELETE /api/v1/files/{id}`                                           | CV là tài nguyên riêng tư (chủ sở hữu / admin / NTD đã nhận đơn) |
| Ghi chú NTD  | `PATCH /api/v1/employer/applications/{id}/note`                                                  | Ghi chú nội bộ, chỉ NTD sở hữu tin + admin                    |
| Thông báo    | `GET/POST/DELETE /api/v1/student/job-notifications` (`categoryCode`, `provinceCode`)             | Bật/tắt thông báo tin tuyển dụng theo nhóm việc + tỉnh       |
| Tin đã lưu   | `GET /api/v1/student/saved-jobs/ids`                                                            | Trả mảng id để client fetch theo id thay vì lọc client-side |

### Lưu trữ file (V10) — local disk hoặc Cloudflare R2

Tầng lưu trữ nằm sau interface `StorageProvider`
(`backend/src/main/java/com/uniwork/storage/`). Triển khai duy nhất: `R2StorageProvider`
(Cloudflare R2, S3-compatible) — 10 GB storage free + egress miễn phí.

> **Không còn provider `local`.** Mọi file (CV / avatar / logo) nằm trên R2 → deploy
> lên Render/Railway (disk ephemeral) không mất dữ liệu khi restart.

**Hai bucket tách bạch** (`app.storage.r2.bucket-public` / `bucket-private`):

- `public` — avatar / logo → URL ổn định, có thể gắn Cloudflare CDN.
- `private` — CV → **không** đưa URL tĩnh vào DB, tải qua presigned GET (TTL 5 phút).

**Luồng presigned (backend không nhận file):**

1. `POST /api/v1/files/presign?kind=CV&contentType=application/pdf` → `{ uploadUrl, storageKey, contentType, expiresInSeconds }`
2. Client `PUT uploadUrl` với file, header `Content-Type` **đúng bằng** giá trị đã ký → sai là `403 SignatureDoesNotMatch`.
3. `POST /api/v1/files/confirm` → backend `headObject` + kiểm tra magic bytes → ghi `file_uploads`.

`storageKey` có dạng `{kind}/{ownerUserId}/{uuid}.{ext}` → chặt chồng user, backend xác minh
chủ sở hữu chỉ bằng cách so tiền tố.

**Kiểm chứng nội dung file (magic bytes, không tin `Content-Type` của client):**

`FileSignatureValidator` đọc chữ ký nhị phân → PDF `%PDF`, PNG `89 50 4E 47`, JPEG `FF D8 FF`,
WEBP `RIFF....WEBP`, DOCX = ZIP `PK 03 04`, DOC = OLE2 `D0 CF 11 E0`. File giả dạng
(đổi tên `.exe` → `.png`) bị chặn `400`. Extension được đặt lại theo mime **đã xác minh**.

**Quota mỗi user:** tối đa 10 file mỗi loại, tổng ≤ 20 MB → vượt thì `400`.

**Resize ảnh server-side** (`ImageResizer`): avatar/logo resize về cạnh dài ≤ 512px +
nén lại (ảnh 1600×1200 692 KB → 512×384 60 KB). CV giữ nguyên.

**CORS bắt buộc trên R2 bucket** (client PUT trực tiếp):

```
AllowedOrigins: http://localhost:5173, http://localhost:8000, https://<domain>
AllowedMethods: PUT, GET, HEAD
AllowedHeaders: Content-Type
```

> ⚠️ Token **`Object Read & Write` KHÔNG đủ** để set CORS (`PutBucketCors` → `403 Access Denied`).
> Phải dùng token **`Admin Read & Write`**, hoặc set CORS thủ công trên dashboard
> (bucket → Settings → CORS). Script `backend/scripts/SetupR2Cors.java` chạy 1 lần
> với token admin để set cho cả 2 bucket.

> ⚠️ `R2_PUBLIC_BASE_URL` (subdomain `r2.dev`) → URL ảnh dạng `https://<domain>/<key>`,
> **không** có tên bucket trong path. Nếu để trống → dùng endpoint S3 path-style
> (`/<bucket>/<key>`) → URL đó **yêu cầu chữ ký** → `<img>` sẽ 403. Luôn bật r2.dev
> cho bucket `viejob-public`.

**Kiểm chứng:**

```bash
cd app
API_URL=http://localhost:8080/api/v1 pnpm verify:files-storage
API_URL=http://localhost:8081/api/v1 pnpm verify:files-storage
```

15 assert: upload CV, bucket private, storageKey có cấu trúc, quyền tải CV (chủ /
khách / NTD), magic bytes chặn file giả, resize ảnh, xoá file + giải phóng quota.

Kiểm chứng trên UI thật (Chrome):

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:files-upload
SMOKE_BASE_URL=http://localhost:5173 pnpm smoke:files-upload
```

7 assert: upload avatar + CV qua trang hồ sơ, file giả dạng bị chặn, không lỗi console.
Ảnh chụp: `app/.tmp-verify-files/`.

### Endpoint đánh giá 2 chiều

| Nhóm       | Endpoint                                                     | Ghi chú                                                            |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Sinh viên  | `GET /api/v1/student/reviews`                               | Đánh giá SV đã nhận từ NTD (chỉ chưa ẩn) → trang `/student/reviews` |
| Sinh viên  | `POST /api/v1/student/reviews/{id}/reply`                   | SV phản hồi đánh giá đã nhận → ghi vào ô `reply` (phía reviewee)  |
| NTD        | `GET /api/v1/employer/reviews`                              | Đánh giá dành cho NTD đang đăng nhập (chỉ chưa ẩn)                |
| NTD        | `GET /api/v1/employer/applications/{id}/reviews`             | Uy tín ứng viên — chỉ NTD sở hữu tin của đơn, sai thì `403`        |
| NTD        | `POST/PATCH /api/v1/employer/reviews/{id}/reply`            | NTD phản hồi đánh giá mình **đã nhận** → ghi vào ô `reply`          |
| NTD        | `POST /api/v1/employer/reviews/{id}/reviewer-reply`         | NTD phản hồi đánh giá **mình đã viết** → ghi vào ô `reviewerReply`  |
| Chung      | `GET /api/v1/reviews?targetType=&targetUserId=&hideHidden=` | **Đã ràng buộc theo vai trò**: SV/NTD chỉ thấy đánh giá của chính mình, `targetUserId` bị bỏ qua |

> `GET /api/v1/reviews` chỉ dành cho nội bộ/tra cứu — Admin kiểm duyệt qua `/api/v1/admin/reviews`.

#### Phản hồi 2 chiều (BR-07.11)

Bảng `reviews` có **2 cột phản hồi** — mỗi bên 1 ô riêng, không ghi đè lẫn nhau:

| Cột | Ai ghi | Service method |
| --- | --- | --- |
| `reply` | Người **bị đánh giá** (reviewee) | `replyAsReviewee(reviewId, text, userId)` |
| `reviewer_reply` | Người **viết đánh giá** (reviewer) | `replyAsReviewer(reviewId, text, userId)` |

Sai vai trò → `403`. Ghi chuỗi rỗng → lưu `null`.

> Migration: `V6__review_two_way_replies.sql` (thêm cột) + `V7__seed_review_replies.sql` (dữ liệu seed,
> SQL tĩnh trong `backend/src/main/resources/db/migration/` — V3 chạy trước V6 nên không thể INSERT cột mới).

Frontend dùng chung component `app/src/components/shared/review-thread.tsx` (`canReply` = `"reviewee" | "reviewer" | null`).

> `POST /student/job-notifications` trả **HTTP 201** (không phải 200).

### Endpoint kinh nghiệm làm việc (BR-07.12)

Khi NTD đánh dấu đơn ứng tuyển là `COMPLETED`, hệ thống **tự động** ghi 1 dòng
kinh nghiệm làm việc cho sinh viên vào bảng `work_assignments` (bảng có sẵn từ V1,
`UNIQUE(application_id)` → idempotent). Nội dung là **snapshot** tại thời điểm hoàn
thành (tên tin, NTD, chức danh, lương) nên tin tuyển dụng sửa/xoá sau này không ảnh
hưởng lịch sử.

| Nhóm | Endpoint | Ghi chú |
| ---- | -------- | ------- |
| NTD | `GET /api/v1/employer/applications/{applicationId}/work-history` | Chỉ NTD sở hữu tin của đơn **hoặc** đã từng nhận đơn của SV đó (cùng quy tắc đọc CV) → sai thì `403` |
| Sinh viên | `GET /api/v1/student/work-history` | Lịch sử làm việc của chính mình |
| Admin | `GET /api/v1/admin/work-history?studentId=` | Tra cứu lịch sử của 1 sinh viên |

Hồ sơ sinh viên (`GET /api/v1/student/profile`) cũng trả kèm mảng `workHistories`.

> `startedAt` lấy từ `application_status_history` (lúc đơn chuyển `ACCEPTED`).
> Điểm đánh giá của NTD đánh giá SV được ghi ngược vào dòng kinh nghiệm tương ứng.
>
> Migration: `V8__student_work_histories.sql` (thêm cột) + `V9__seed_work_histories.sql`
> (dữ liệu seed, SQL tĩnh trong `backend/src/main/resources/db/migration/` — V3 chạy trước V8).

Frontend: `app/src/features/work-history/` (service + hooks `WORK_HISTORY_KEYS`),
Card "Kinh nghiệm làm việc" ở `/employer/applications/{id}`, section read-only ở
`/student/profile`. Thông báo loại `APPLICATION_STATUS` invalidate `WORK_HISTORY_KEYS.all`.

### Smoke test trình duyệt (app thật + API thật qua nginx)

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:browser
```

11 test: trang chủ, login sai/sinh viên/NTD/admin, danh sách đơn, chặn khu vực admin,
quản lý tin & nhóm việc, và kiểm tra không có lỗi console. Dùng Chrome hệ thống
(`channel: "chrome"`), fallback về Chromium bundled. Ảnh chụp: `app/.tmp-smoke-live/`.

### Kiểm chứng toàn diện (42 test — bản "chốt chốt")

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm verify:full-app   # bản production
SMOKE_BASE_URL=http://localhost:5173 pnpm verify:full-app    # bản dev
```

`scripts/verify-full-app.mjs` mở Chrome thật và đi qua **toàn bộ** luồng của 3 vai trò:
guest (9 test) · sinh viên (14 test) · nhà tuyển dụng (10 test) · admin (9 test).
Mỗi test: mở route thật → thao tác thật (bấm, nhập, chọn dropdown, submit) →
assert nội dung render + **gom lỗi console và HTTP 4xx/5xx**. Ảnh chụp: `.tmp-verify-full/`.

Script tự loại trừ các lỗi *dự kiến* do chính test tạo ra (401 khi test login sai,
403 khi test route guard chặn vai trò) — mọi lỗi còn lại đều là lỗi thật.

> **Khi backend dev báo 404 cho endpoint có trong source** → container dev đang chạy
> class cũ. `docker exec viejob-backend-dev sh -c "cd /build && mvn -B -q compile"`
> rồi chờ devtools restart. Watcher polling **không** phát hiện thay đổi khi
> file được sửa bằng tool editor nhanh (mtime cập nhật nhưng checksum race).

### Kiểm chứng riêng các lỗi UI đã sửa

```bash
cd app
SMOKE_BASE_URL=http://localhost:8000 pnpm verify:ui-fixes
```

Script này chốt 2 bug từng gây ảnh hưởng người dùng:
tìm kiếm ở hero trang chủ **phải** truyền `keyword` sang `/jobs`, và số liệu
"việc làm theo tỉnh" phải khớp API (Hà Nội 5, Đà Nẵng 3, Cần Thơ 2, Bình Dương 1,
Đắk Lắk 1) — **không** được tính từ 6 tin mới nhất.

### Kiểm chứng biểu đồ "Tin đăng theo tuần" (dashboard NTD)

```bash
cd app
SMOKE_BASE_URL=http://localhost:5173 pnpm verify:employer-chart
```

Script này chốt bug biểu đồ cột ở `/employer`: trước đây dùng `items-end` nên
`height: %` của thanh cột **không resolve** → thanh về 0px, người dùng chỉ thấy
con số + nhãn ngày, tưởng "không có cột biểu đồ".

Script assert: 7 thanh có `boundingBox().height > 0` (thanh có số liệu phải > 4px),
thanh cao nhất > 20px, và nhãn ngày phải khớp thứ trong tuần **thật** — ô cuối là
hôm nay, ô đầu là 6 ngày trước (trước đây nhãn `T2…CN` hardcode còn `index` tính từ
"hôm nay" → hôm nay luôn ra `CN`; tin đăng cũ hơn 7 ngày cũng bị gộp nhầm vào ô `T2`).

> Biểu đồ là **SVG thuần** — dựng bằng flex + `height: %`.
> Cột cha **phải** có chiều cao xác định (dùng `items-stretch` + `flex-col justify-end`),
> nếu không `height: %` sẽ không có gốc để tính.

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
| 7 | Đánh giá mới | Người bị đánh giá | `REVIEW` | `/employer/reviews` (NTD) · `/student/reviews` (sinh viên) |

### Frontend

- `src/lib/realtime/notification-socket.ts` — client WS native: reconnect backoff (1s→30s), ping 25s.
- `src/lib/realtime/notification-broadcast.ts` — `BroadcastChannel("viejob:realtime:notifications")` đồng bộ nhiều tab;
  chỉ tab đang có focus mới hiện toast (`shouldShowToast()`).
- `src/features/notifications/hooks/useNotificationSocket.ts` — invalidate theo **loại thông báo**;
  toast có nút **"Xem"** → invalidate **trước** khi điều hướng + đánh dấu đã đọc + điều hướng deep link.
- `src/features/notifications/hooks/invalidate.ts` — bảng ánh xạ `loại thông báo → query key cần đồng bộ`:

  | Loại | Query key invalidate |
  | --- | --- |
  | `APPLICATION` / `APPLICATION_STATUS` | `APPLICATION_KEYS.all` |
  | `JOB` | `EMPLOYER_JOB_KEYS.all` + `ADMIN_KEYS.jobs()` |
  | `REVIEW` | `REVIEW_KEYS.all` + `PROFILE_KEYS.all` (điểm TB / số lượt đánh giá trên hồ sơ) |

  > **Bắt buộc**: bảng này phải đầy đủ. Thiếu `REVIEW` thì SV bấm thông báo "Bạn nhận được đánh giá mới"
  > sẽ tới `/student/reviews` nhưng vẫn thấy **cache cũ** (`staleTime` 60s) — không có đánh giá mới.
- `src/components/layout/notification-socket.tsx` — mount trong `MainLayout` + `WorkspaceLayout`, tự mở/đóng theo trạng thái đăng nhập.

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

> **Bảo đảm dữ liệu mới hiện sau khi bấm thông báo**: `staleTime` mặc định là 60s, nên
> trang đích **phải** được invalidate trước khi điều hướng. Nếu quên, người dùng thấy
> danh sách cũ và tưởng thông báo "không có dữ liệu". Áp dụng cho mọi loại thông báo
> có deep-link (`REVIEW` → `/student/reviews`, `/employer/reviews`).

### Kiểm chứng phản hồi 2 chiều cho đánh giá

```bash
cd app
pnpm verify:review-two-way                                  # API thật (Docker, :8080)
SMOKE_BASE_URL=http://localhost:8000 pnpm smoke:review-two-way   # UI thật trong Chrome
```

`verify:review-two-way` kiểm tra 8 trường hợp: SV phản hồi được, NTD phản hồi được,
2 ô `reply` / `reviewerReply` không ghi đè lẫn nhau, sai vai trò → `403`, và bên nhận
phản hồi nhận được thông báo loại `REVIEW`.

> Script **không idempotent** — mỗi lần chạy ghi đè phản hồi của review đầu tiên.
> Chạy lại được (vì ô phản hồi cho phép sửa) nhưng sẽ thay nội dung cũ.


