**Đã làm (backend, nhánh `feature/ai-ticket-02`, đã merge vào `feature/ai-moderation`):**

**Lớp nghiệp vụ** — `backend/src/main/java/com/uniwork/service/ai/`:

- `AiProvider.java` — interface `AiReviewResult review(AiReviewInput input)`, kèm `name()`
  và `default boolean isConfigured()`. Đổi nhà cung cấp = đổi cấu hình, không sửa mã nghiệp vụ.
- `AiProviderException.java` — `reason` (`QUOTA_EXCEEDED` | `SERVICE_ERROR` | `NOT_CONFIGURED` |
  `TIMEOUT`) + thông điệp. Mọi lỗi ra ngoài từ provider đều là loại này — không lọt lỗi HTTP thô.
- `AiReviewInput.java` / `AiReviewResult.java` / `AiReason.java` — hợp đồng dữ liệu giữa
  service và provider.
- `AiPromptBuilder.java` — dựng prompt tách riêng khỏi code gọi mạng. `INSTRUCTIONS` (ASCII)
  và `DATA_BLOCK_TEMPLATE` (placeholder `{0}`) lấy **nguyên văn** `PROMPT.md` mục 5.
  `responseSchema()` trả JSON schema ép hình dạng kết quả.
- `AiEvidenceMatcher.java` — chuẩn hoá NFC → gộp khoảng trắng → không phân biệt hoa/thường;
  **không** so khớp mờ (mục tiêu: phát hiện AI bịa câu trích).
- `GeminiAiProvider.java` — `RestClient` của Spring (không thêm SDK), timeout 30 giây,
  `responseMimeType: application/json` + `responseSchema`, `temperature: 0`. Lỗi HTTP 429 →
  `QUOTA_EXCEEDED`; 4xx còn lại → `NOT_CONFIGURED`; còn lại → `SERVICE_ERROR`.
- `JobContentAssembler.java` — dựng văn bản nội dung tin (tiêu đề, mô tả, yêu cầu, quyền lợi,
  hình thức làm việc, loại hình, số suất). Đây cũng là nguồn đối chiếu bằng chứng nguyên văn.
- `AiReviewService.java` — điều phối: tải tin → dựng đầu vào → gọi provider → **kiểm chứng**
  → ghi `ai_verdict` / `ai_reasons` / `ai_checked_at` → trả `AiReviewResponse`.
- `AiStatusResponse.java` — record `(enabled, provider)`.

**Kiểm chứng trước khi ghi** (nguyên tắc: sai cấu trúc thì **không ghi gì**, chỉ log):

- `verdict` không thuộc `{OK, WARN, SUSPECT}` → từ chối ghi.
- `verdict == "OK"` mà kèm lý do → từ chối ghi.
- `code` không thuộc 6 mã hợp lệ → **loại riêng lý do đó** (không mất cả kết quả).
- `evidence` rỗng → loại lý do đó.
- `evidence` không xuất hiện nguyên văn trong nội dung tin → loại lý do đó.

**Ranh giới phân quyền** (CONTRACT.md mục 6) — tách hình dạng DTO:

- `JobResponse` (gốc) — **không** có trường AI. Đổi từ `@Builder` sang `@SuperBuilder` để
  lớp con mở rộng được.
- `AdminJobResponse extends JobResponse` — thêm `aiVerdict`, `aiReasons`, `aiCheckedAt`.
- `JobService.listForAdmin()` trả `List<AdminJobResponse>`; `JobServiceImpl.toAdminResponse()`
  map riêng, dùng chung helper `fillBase(job, builder)` với `toResponse()` nên hai hình dạng
  không lệch nhau. Endpoint công khai và endpoint nhà tuyển dụng dùng `toResponse()` → không
  thể lộ ra kết quả AI.

**Endpoint** (chỉ ADMIN — `/api/v1/admin/**` đã bị `SecurityConfig` bảo vệ → 403 tự động):

- `POST /api/v1/admin/jobs/{id}/ai-review` → `ApiResponse<AiReviewResponse>`. Tin không tồn tại → 404. AI lỗi → `AppException` 503 `AI_UNAVAILABLE` kèm thông điệp tiếng Việt **không phải 500**.
- `GET /api/v1/admin/ai/status` → `{ enabled, provider }`. `enabled = AI_ENABLED && có khoá API`.

**Cấu hình** — `app.ai.{enabled,provider,model,gemini-api-key}` trong `application.yml` và
`application-prod.yml`, đọc từ `AI_ENABLED` / `AI_PROVIDER` / `AI_MODEL` / `GEMINI_API_KEY`.
Thiếu khoá → tính năng **ẩn**, không phải lỗi. Không ghi khoá API vào log.

**Migration** — `V15__ai_review_on_job_posts.sql`: thêm `ai_verdict VARCHAR(10) NULL`,
`ai_reasons JSON NULL`, `ai_checked_at DATETIME(6) NULL` + ràng buộc `CHECK` verdict thuộc
3 giá trị hợp lệ. `ai_verdict` NULL = **chưa kiểm tra** (khác `OK`).

**Executor** — `AsyncConfig` thêm bean `aiTaskExecutor` (core=1, max=2, queue=20, tiền tố
`AiAsync-`), tách khỏi `mailTaskExecutor`.

**Test** (94 test backend PASS):

- `AiReviewServiceImplTest` (12 test) — dùng nhà cung cấp AI **giả** (`FakeAiProvider`)
  nên không bao giờ gọi mạng thật: kết quả hợp lệ thì ghi đúng 3 trường; verdict lạ → không
  ghi gì; `OK` kèm lý do → không ghi gì; bằng chứng không nguyên văn → loại lý do; mã lạ →
  loại lý do; bằng chứng rỗng → loại lý do; provider ném lỗi → 503 `AI_UNAVAILABLE` +
  không ghi gì; tin không tồn tại → 404 và **không** gọi provider; input gửi cho AI có
  đủ nội dung tin.
- `AdminAiReviewControllerTest` (5 test) — MockMvc: 200 với verdict/lý do/thời điểm;
  503 + thông điệp tiếng Việt khi hết hạn mức; 404 khi tin không tồn tại;
  `GET /ai/status`; `GET /admin/jobs` trả `AdminJobResponse` có trường `ai*`.

**Kiểm chứng parity prompt**: đối chiếu `AiPromptBuilder.INSTRUCTIONS` /
`DATA_BLOCK_TEMPLATE` với `backend/scripts/ai-moderation/prompt.mjs` bằng script Node —
**khớp byte-for-byte**. Chuẩn hoá bằng chứng cũng khớp với `normalizeText()` của script
(NFC + gộp khoảng trắng + không phân biệt hoa/thường, không fuzzy).

**Chưa làm được**: không chạy được lượt gọi AI thật (thiếu `GEMINI_API_KEY`) nên chưa
kiểm chứng end-to-end với Gemini. Đã xác minh: compile sạch, 94/94 test backend PASS.
