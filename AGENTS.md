# Agent Navigation & Steering

File này là điểm khởi đầu cho agent mỗi lần làm việc với repo. Hãy đọc phần liên quan tới task trước khi bắt tay.

---

## Cấu trúc monorepo

```
student-job-marketplace/
├── app/                     # Frontend (Vite + React)
│   ├── src/
│   │   ├── pages/           # Trang route-level (không chứa logic)
│   │   ├── features/        # Feature modules (tính năng hoàn chỉnh)
│   │   │   ├── auth/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── employer/
│   │   │   ├── admin/
│   │   │   ├── notifications/
│   │   │   ├── saved-jobs/
│   │   │   ├── profile/
│   │   │   ├── reviews/
│   │   │   ├── work-history/
│   │   │   ├── files/
│   │   │   └── shared/      # Types + common logic (mọi feature import được)
│   │   ├── components/      # UI components & layout (không có business logic)
│   │   ├── lib/             # Pure utilities (axios, date, toast, utils)
│   │   └── config/          # Env + paths
│   ├── package.json
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   └── tsconfig.json
├── backend/                 # Spring Boot API
│   ├── src/
│   │   ├── main/java/com/uniwork/
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── entity/
│   │   │   ├── repository/
│   │   │   ├── security/
│   │   │   ├── storage/     # Cloudflare R2
│   │   │   ├── dto/
│   │   │   └── exception/
│   │   └── test/java/
│   ├── src/main/resources/db/migration/   # Flyway SQL
│   ├── pom.xml
│   └── render.yaml          # Deploy descriptor
├── GLOSSARY.md              # Ngôn ngữ chung (bắt buộc đọc)
├── CODING_STANDARDS.md      # Chuẩn code (đọc khi review)
├── AGENTS.md                # File này
├── docs/
│   ├── adr/                 # Architecture decisions (đọc nếu tò mò tại sao)
│   ├── agents/
│   │   └── domain.md        # Pointer tới GLOSSARY + ADR
│   └── feature-map.md       # Tính năng theo vai trò + route
└── vercel.json              # Deploy frontend

```

---

## Trước khi code

### 1. Đọc GLOSSARY.md nếu không hiểu thuật ngữ

Dự án dùng các từ cụ thể: "tin tuyển dụng", "đơn ứng tuyển", "nhà tuyển dụng", "xếp hạng lương". Nếu cần viết spec hoặc hỏi về tính năng — hãy dùng đúng từ từ `GLOSSARY.md`. Ví dụ:

- **Sai**: "cần thêm tính năng yêu thích tin"
- **Đúng**: "cần thêm tính năng lưu việc cho tin tuyển dụng"

### 2. Đọc docs/adr/ nếu tò mò tại sao

Nếu ngạc nhiên vì quyết định nào (ví dụ "tại sao phải duyệt tin qua admin?"), hãy đọc:

- `docs/adr/0003-job-requires-admin-review-before-going-live.md`

### 3. Kiểm tra CODING_STANDARDS.md khi review

---

## Lệnh chạy

### Frontend

```bash
cd app/

# Cài dependencies
pnpm install

# Dev server (port 5173)
pnpm dev

# Lint + tsc + test
pnpm typecheck        # Type check
pnpm lint             # ESLint
pnpm test             # Vitest (interactive)
pnpm check            # typecheck + lint + test (CI mode)

# Build
pnpm build            # Vite production build
```

### Backend

```bash
cd backend/

# Cài dependencies
./mvnw install

# Dev server (port 8080)
./mvnw spring-boot:run

# Test
./mvnw test

# Build
./mvnw clean package
```

> **Máy chưa cài Maven?** Chạy test backend qua Docker (Maven + JDK 17 có sẵn trong image):
>
> ```bash
> # từ gốc repo
> docker run --rm \
>   -v "$(pwd)/backend:/app" \
>   -v "$HOME/.m2:/root/.m2" \
>   -w /app maven:3.9-eclipse-temurin-17 mvn -B test
> ```
>
> Trên Windows (Git Bash) dùng đường dẫn Windows + `MSYS_NO_PATHCONV=1`:
>
> ```bash
> MSYS_NO_PATHCONV=1 docker run --rm \
>   -v "d:/code/Project/student-job-marketplace/backend:/app" \
>   -v "C:/Users/<user>/.m2:/root/.m2" \
>   -w /app maven:3.9-eclipse-temurin-17 mvn -B test
> ```

---

## Ranh giới import

**Luật**: `pages/` → `features/` (một chiều), không đảo chiều.

```
pages/jobs.tsx
  ↓ (import được từ)
features/jobs/hooks/useJobs.ts
features/jobs/services/jobs.service.ts
features/jobs/types/index.ts

features/jobs/hooks/useJobs.ts
  ↓ (import được từ)
features/shared/types/   (chỉ cấp này)
features/shared/query-keys.ts
lib/                      (utilities)
```

**Cấm**:

- `features/jobs/` import từ `features/applications/` (trừ qua `features/shared`)
- `features/jobs/` import từ `pages/`
- `lib/` không import từ `features/` (libraries phải pure)

**ESLint rule** (mức warning) sẽ catch các vi phạm:

- `no-restricted-imports` chặn `@/pages/*` bên trong `features/`.
- `no-restricted-imports` chặn import chéo giữa các `features/<x>` (trừ `shared`).
- `no-restricted-imports` chặn `features/` & `pages/` bên trong `lib/`.
- `no-console` chặn `console.log` bên trong `src/` (cho phép `warn`/`error`).

### Query key dùng chung

Một feature có thể cần invalidate cache của feature khác (ví dụ: thông báo "đơn ứng tuyển
đổi trạng thái" -> danh sách đơn của nhà tuyển dụng phải refetch).

**Luật**: **toàn bộ định nghĩa query key nằm ở `features/shared/query-keys.ts`**.
Mỗi feature chỉ re-export phần của mình (`export { JOB_KEYS }`), và import từ
`@/features/shared/query-keys` khi cần dùng.

```
features/shared/query-keys.ts   <- nguồn sự thật duy nhất
  ↓ re-export
features/jobs/hooks/useJobs.ts        export { JOB_KEYS }
features/notifications/hooks/invalidate.ts   import { APPLICATION_KEYS, ... } từ shared
```

Thêm feature mới -> thêm key vào `features/shared/query-keys.ts`, **không** tạo import chéo.

---

## Cấu trúc 1 feature

Mỗi feature nằm trong `app/src/features/<name>/` với:

```
features/<name>/
├── types/           # Interfaces riêng của feature (nếu có)
│   └── index.ts
├── services/        # Logic nghiệp vụ (service layer)
│   └── <name>.service.ts
├── hooks/           # React hooks (gọi service, state management)
│   ├── index.ts
│   ├── use<Feature>.ts
│   └── ...
└── components/      # UI components (nếu feature có)
    ├── <component>.tsx
    └── ...
```

**Quy tắc**:

- Logic nghiệp vụ nằm ở `services/`, không nằm trong component.
- Mỗi component không có `useEffect` nếu có thể tính toán được từ state/props.
- Comment: chỉ giải thích _tại sao_, không giải thích _cái gì_.

---

## Ranh giới Frontend / Backend

| Phần                 | Frontend            | Backend              |
| -------------------- | ------------------- | -------------------- |
| **Giao diện**        | ✅ React components | ❌                   |
| **Form validation**  | ✅ Zod schema       | ✅ Validation DTO    |
| **Business logic**   | ❌                  | ✅ Service classes   |
| **Database queries** | ❌                  | ✅ Repository        |
| **State management** | ✅ React Query      | ❌                   |
| **API calls**        | ✅ axios            | ❌                   |
| **JWT generation**   | ❌                  | ✅ JwtService        |
| **File upload**      | ✅ presigned URL    | ✅ verify + R2 store |

---

## Cấm tuyệt đối

1. **Không `any`**: thay bằng generic hoặc `unknown`.
2. **Không `@ts-ignore`**: fix root cause.
3. **Không comment "workaround"**: nếu làm hack, viết ADR giải thích rõ.
4. **Không logic trong JSX**: tách ra service hoặc hook.
5. **Không `console.log` trong code shipped**: dùng logger hoặc xoá trước commit (ESLint `no-console` sẽ catch).

---

## Kiểm chứng

Mỗi lần commit, hãy chạy:

```bash
# Frontend
cd app && pnpm check   # typecheck + lint + test

# Backend
cd backend && ./mvnw test
```

Nếu fail, sửa trước khi push.

---

## Hỏi nghi vấn?

1. **Thuật ngữ không hiểu?** → Đọc `GLOSSARY.md`
2. **Tại sao làm như vậy?** → Đọc `docs/adr/`
3. **Chuẩn code?** → Đọc `CODING_STANDARDS.md`
4. **Tính năng nào?** → Xem `docs/feature-map.md`

Nếu vẫn không rõ, hãy hỏi người quản lý dự án.
