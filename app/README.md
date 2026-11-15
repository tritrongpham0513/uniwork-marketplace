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
    └── admin.ts      # dashboard, user, nhóm việc, master data
```

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
| Sinh viên      | `GET/PUT /student/profile`, `GET/POST /student/applications`, `GET /student/applications/{id}`, `PATCH /student/applications/{id}/withdraw`, `GET/POST/DELETE /student/saved-jobs`                                        |
| Nhà tuyển dụng | `GET/POST /employer/jobs`, `PUT/DELETE /employer/jobs/{id}`, `GET /employer/applications`, `GET/PATCH /employer/applications/{id}`, `GET/PUT /employer/profile`, `POST /employer/reviews/{id}/reply`                      |
| Đánh giá       | `POST /reviews`, `GET /reviews?targetType=&targetUserId=`                                                                                                                                                                 |
| Thông báo      | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`                                                                                                 |
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

Chạy 3 suite:

| Suite         | Script                    | Nội dung                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast & Error | `pnpm verify:toast`       | `normalizeApiError` (mapping status → kind), toast facade (dedupe theo `id`, merge trong 2s, rate limit), `showApiError` (bỏ qua validation/handled/silent)                                                                                                                                                |
| Tích hợp HTTP | `pnpm verify:integration` | Chạy HTTP server thật trong Node, kiểm tra interceptor, normalize lỗi, retry, header Authorization                                                                                                                                                                                                         |
| **Mock API**  | `pnpm verify:mock-api`    | **47 test**: envelope `{ success, message, data }` & envelope lỗi; đăng nhập/đăng ký 3 vai trò; phân quyền 401/403/404; lọc & phân trang tin; NTD đăng tin → Admin duyệt → SV ứng tuyển → NTD duyệt đơn → đánh giá 2 chiều → trả lời đánh giá; quản lý thông báo; CRUD nhóm việc; khoá/đổi role người dùng |
| **E2E**       | `pnpm verify:e2e`         | **20 test**: chạy đúng đường đi của app — `service` → `axiosInstance` → `mockAdapter` → `router` — assert `ApiResponse<T>` khớp kiểu dữ liệu mà service khai báo (đặc biệt `data.accessToken`, `data.user`), qua lại 3 vai trò                                                                             |

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

## 7. Tích hợp backend (khi API thật sẵn sàng)

1. Đặt `VITE_USE_MOCK_API=false` và `VITE_API_URL_DEV=http://localhost:8000` trong `.env`.
2. Backend phải trả đúng envelope:
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
3. Không cần sửa service nào — `src/features/*/services/*` đã dùng đúng đường dẫn & kiểu dữ liệu mong đợi.
4. Token: `Authorization: Bearer <access_token>`; refresh qua `POST /api/v1/auth/refresh` với body `{ refresh_token }`.

---

## 8. Trước khi nộp báo cáo / bảo vệ đồ án

```bash
pnpm lint      # 0 error, 0 warning
pnpm build     # type-check + production build
pnpm verify    # 4/4 suite PASSED (toast, integration, mock API, E2E)
```

Demo nên trình bày theo thứ tự: **Sinh viên tìm & ứng tuyển tin → Nhà tuyển dụng duyệt đơn → đánh giá 2 chiều → Quản trị viên duyệt tin & quản lý danh mục/người dùng**.
