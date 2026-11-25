# Ke hoa phan cong (seam) — ai so gi vao file nao

> **Bat buoc doc file nay truoc khi code.**
> Muc tieu: 6 implementer chay song song **khong tranh chấp file**, va ket qua
> khi merge lai van chay duoc.

---

## 1. Nguyen tac

1. **Chi sua file duoc phan bo cho minh** (bang ben duoi).
2. Can sua file cua ticket khac -> **dung**, bao cao lai de nguoi dieu phoi quyet dinh.
3. **Moi file tao ra phai noi ten day du** theo dung contract.
4. Het ticket -> `git add` + `git commit` trong worktree cua ban.
5. Trước khi bao cao xong: merge integration branch vao branch ban, resolve conflict
   (neu co) theo contract, chay lai test.

---

## 2. Ban do file theo ticket

### Ticket 01 — Cong cu thu prompt (doc lap, ngoai app)

| Loai | File                                             |
| ---- | ------------------------------------------------ |
| TAO  | `backend/scripts/ai-moderation/prompt.mjs`       |
| TAO  | `backend/scripts/ai-moderation/samples.mjs`      |
| TAO  | `backend/scripts/ai-moderation/run.mjs`          |
| TAO  | `backend/scripts/ai-moderation/README.md`        |
| TAO  | `.scratch/ai-moderation/notes/01-ket-qua-thu.md` |

**KHONG** sua file Java/TS. Cong cu chay bang Node 24 (da co san), doc
`GEMINI_API_KEY` tu bien moi truong.

### Ticket 02 — Backend lop kiem duyet AI + endpoint thu cong

| Loai | File                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------- |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiProvider.java`                                 |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiProviderException.java`                        |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiReviewInput.java`                              |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiReviewResult.java`                             |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiReason.java`                                   |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiPromptBuilder.java`                            |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/GeminiAiProvider.java`                           |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/AiReviewService.java`                            |
| TAO  | `backend/src/main/java/com/uniwork/dto/response/AiReasonResponse.java`                         |
| TAO  | `backend/src/main/java/com/uniwork/dto/response/AiReviewResponse.java`                         |
| TAO  | `backend/src/main/java/com/uniwork/dto/response/AdminJobResponse.java`                         |
| TAO  | `backend/src/test/java/com/uniwork/service/AiReviewServiceImplTest.java`                       |
| TAO  | `backend/src/test/java/com/uniwork/controller/AdminAiReviewControllerTest.java`                |
| SUA  | `backend/src/main/java/com/uniwork/entity/JobPost.java` (them 3 truong ai_*)                   |
| SUA  | `backend/src/main/java/com/uniwork/controller/AdminController.java` (endpoint moi)             |
| SUA  | `backend/src/main/java/com/uniwork/service/JobService.java` (listForAdmin -> AdminJobResponse) |
| SUA  | `backend/src/main/java/com/uniwork/service/impl/JobServiceImpl.java` (map admin response)      |
| SUA  | `backend/src/main/resources/db/migration/V15__ai_review_on_job_posts.sql` (TAO file moi)       |
| SUA  | `backend/src/main/resources/application.yml` (khoa `app.ai`)                                   |
| SUA  | `backend/src/main/resources/application-prod.yml` (AI_ENABLED mac dinh false)                  |
| SUA  | `backend/src/main/java/com/uniwork/config/AsyncConfig.java` (bean aiTaskExecutor)              |
| SUA  | `backend/src/main/java/com/uniwork/service/AdminService.java` (neu can)                        |

**KHONG** sua: `JobServiceImpl.create()`, `JobServiceImpl.update()` — thuoc ticket 04.

### Ticket 03 — Xep hang luong + uy tin vao dau vao AI

| Loai | File                                                                                          |
| ---- | --------------------------------------------------------------------------------------------- |
| SUA  | `backend/src/main/java/com/uniwork/service/ai/AiReviewInput.java` (them truong)               |
| SUA  | `backend/src/main/java/com/uniwork/service/ai/AiPromptBuilder.java` (dung cac truong moi)     |
| SUA  | `backend/src/main/java/com/uniwork/service/ai/AiReviewService.java` (dung benchmark + uy tin) |
| TAO  | `backend/src/test/java/com/uniwork/service/AiSalaryAnomalyTest.java`                          |

**KHONG** sua: `JobServiceImpl.create/update` (ticket 04), `AdminController` (ticket 02).

### Ticket 04 — Kiem tra AI o nen khi dang tin / sua tin

| Loai | File                                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| SUA  | `backend/src/main/java/com/uniwork/service/impl/JobServiceImpl.java` (create/update)     |
| TAO  | `backend/src/main/java/com/uniwork/service/ai/JobAiReviewScheduler.java` (facade @Async) |
| TAO  | `backend/src/test/java/com/uniwork/service/JobServiceAiReviewTest.java`                  |

**LUU Y:** ticket 02 va 04 **cung sua `JobServiceImpl.java`**.
`JobServiceImplTest.java` (test hien co) **KHONG sua** — neu can them mock,
dung `@Mock` moi trong file test rieng cua ticket 04.

### Ticket 05 — Badge muc do + sap xep (frontend)

| Loai | File                                                    |
| ---- | ------------------------------------------------------- |
| TAO  | `app/src/features/admin/lib/ai-review.ts` (ham thuan)   |
| TAO  | `app/src/features/admin/lib/ai-review.test.ts`          |
| TAO  | `app/src/features/admin/components/ai-review-badge.tsx` |
| TAO  | `app/src/features/admin/components/ai-review-panel.tsx` |
| SUA  | `app/src/features/admin/services/admin.service.ts`      |
| SUA  | `app/src/features/admin/hooks/index.ts`                 |
| SUA  | `app/src/pages/admin/jobs.tsx`                          |
| SUA  | `app/src/features/shared/types/index.ts` (kieu AI)      |

### Ticket 06 — Nha tuyen dung khong thay co AI

| Loai | File                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| SUA  | `app/src/pages/employer/job-form.tsx` (dong thong bao)                                                      |
| SUA  | `backend/src/main/java/com/uniwork/dto/response/PublicEmployerProfileResponse.java` (dam bao khong co ai_*) |
| TAO  | `backend/src/test/java/com/uniwork/controller/PublicJobNoAiLeakTest.java`                                   |

**KHONG** sua: `app/src/pages/admin/jobs.tsx` (ticket 05).

### Ticket 07 — Danh gia tay chat luong AI

| Loai | File                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------- |
| TAO  | `.scratch/ai-moderation/notes/07-danh-gia-tay.md`                                              |
| SUA  | `.scratch/ai-moderation/issues/07-danh-gia-tay-chat-luong-ai.md` (tick checkbox + ghi ket qua) |

**KHONG** sua code (chi danh gia). Neu can chay lai dung cong cu ticket 01.

### Ticket 08 — ADR + cap nhat ban do tinh nang

| Loai | File                                                       |
| ---- | ---------------------------------------------------------- |
| TAO  | `docs/adr/0005-ai-review-layer-for-job-posts.md`           |
| SUA  | `docs/feature-map.md` (them dong trong phan quan tri vien) |

---

## 3. Files bi sua boi NHIEU ticket (can merge co chu dong)

| File                                  | Ticket nao sua                        | Cach giai quyet                                                                                       |
| ------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `JobServiceImpl.java`                 | 02 (mapper admin), 04 (create/update) | 02 chi them method mapping; 04 them loi goi AI. Merge thuong khong conflict vi o vung code khac nhau. |
| `AiReviewInput.java`                  | 02 (tao), 03 (them truong)            | 03 sua tren nen 02.                                                                                   |
| `AiPromptBuilder.java`                | 02 (tao), 03 (dung truong moi)        | 03 sua tren nen 02.                                                                                   |
| `AiReviewService.java`                | 02 (tao), 03 (bo sung du lieu)        | 03 sua tren nen 02.                                                                                   |
| `admin.service.ts` / `hooks/index.ts` | 05 (chi)                              | —                                                                                                     |
| `features/shared/types/index.ts`      | 05 (chi)                              | —                                                                                                     |
| `docs/feature-map.md`                 | 08 (chi)                              | —                                                                                                     |

**Thu tu merge bat buoc:** 01 → 02 → 03 → 04 → 05 → 06 → 08.
(Ticket 07 chay sau 03+04.)

---

## 4. Kiem chung truoc khi merge

```bash
# Backend
cd "d:/code/Project/student-job-marketplace"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "d:/code/Project/student-job-marketplace/backend:/app" \
  -v "C:/Users/HOANGVINH/.m2:/root/.m2" \
  -w /app maven:3.9-eclipse-temurin-17 mvn -B test

# Frontend
cd "d:/code/Project/student-job-marketplace/app" && pnpm check
```

Ca hai phai PASS.
