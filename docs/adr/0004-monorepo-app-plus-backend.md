# Monorepo: app (Vite + React) + backend (Spring Boot)

Dự án tách rõ frontend và backend trong cùng một git repo, với deployment riêng lẻ:

- **`app/`**: React SPA chạy trên Vite. Deploy tới Vercel (CDN + serverless functions cho API proxy nếu cần).
- **`backend/`**: Spring Boot REST API. Deploy tới Render (hoặc tương đương — máy chủ Linux chạy JAR).

**Lý do chọn**:
1. **Tách biệt deployment**: frontend update không làm reset connection của user; backend update có thể fail mà không ảnh hưởng SPA cache.
2. **Developer experience**: chỉnh sửa FE không cần tái biên dịch backend; chỉnh backend không cần rebuild Vite.
3. **Khả năng mở rộng**: nếu sau này cần mobile app (React Native), có thể tái dùng backend API mà không ảnh hưởng web.

**Cấu trúc**:
```
student-job-marketplace/
├── app/                    # Frontend (pnpm install, pnpm dev, pnpm build)
│   ├── src/
│   │   ├── pages/          # Route pages (topmost)
│   │   ├── features/       # Feature modules (business logic)
│   │   │   ├── jobs/
│   │   │   ├── auth/
│   │   │   ├── applications/
│   │   │   └── shared/     # Shared types & common logic
│   │   └── lib/            # Pure utilities (axios, date, toast, etc.)
│   └── vitest.config.ts
├── backend/                # API (mvn install, ./mvnw spring-boot:run, ./mvnw test)
│   ├── src/
│   │   ├── main/java/com/uniwork/
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── entity/
│   │   │   ├── repository/
│   │   │   ├── security/
│   │   │   └── storage/    # R2 integration
│   │   └── test/java/      # JUnit 5 + Mockito
│   └── pom.xml
├── GLOSSARY.md             # Shared domain language
├── AGENTS.md               # Navigation for agents
├── CODING_STANDARDS.md     # Coding conventions
└── docs/
    ├── adr/                # Architecture decisions
    ├── agents/
    │   └── domain.md       # Pointer to GLOSSARY + ADR
    └── feature-map.md      # UI routes & user journeys
```

**Ranh giới**:
- Frontend: giao diện, state management, form validation (Zod), gọi API qua axios.
- Backend: business logic, DB queries, JWT generation, file storage, event publishing.
- Chung: GLOSSARY (từ vựng), ADR (quyết định chung), CI/CD scripts.

**API hợp đồng**: mọi endpoint trả `ApiResponse<T>` chứa `{ success, data, message, error }`.
