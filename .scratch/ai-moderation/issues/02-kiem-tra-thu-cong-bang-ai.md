# 02: Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI

**What to build:** Quản trị viên mở hộp thoại xem nội dung một tin tuyển dụng trong trang Duyệt tin tuyển dụng, bấm "Kiểm tra bằng AI", và ngay trong hộp thoại đó thấy phần đánh giá của AI: verdict, một câu tóm tắt, và từng lý do gồm mã vi phạm, câu trích nguyên văn trong tin, cùng giải thích ngắn. Bên dưới ghi rõ đây là góp ý của AI, quyết định vẫn là của quản trị viên. Thứ tự hiển thị: nội dung tin trước, góp ý AI sau, để quản trị viên tự đối chiếu.

Kết quả kiểm tra được lưu ngay trên bản ghi tin tuyển dụng, nên quản trị viên không phải đăng nhập lại hay làm mới trang để xem. Nút Duyệt / Từ chối giữ nguyên, AI không bao giờ tự chuyển trạng thái tin tuyển dụng.

**Blocked by:** 01 — Chốt và chạy thử prompt kiểm duyệt nội dung tin tuyển dụng.

**Status:** done

- [x] Tin tuyển dụng lưu được ba thông tin kiểm duyệt: verdict, danh sách lý do, và thời điểm kiểm tra. Verdict rỗng nghĩa là **chưa kiểm tra** — phân biệt được với kết quả `OK`.
- [x] Có một interface cho nhà cung cấp AI và một hiện thực cho Gemini; đổi nhà cung cấp chỉ cần đổi cấu hình, không sửa mã nghiệp vụ.
- [x] Hiện thực Gemini gọi HTTP bằng HTTP client sẵn có của Spring, không thêm thư viện SDK mới; dùng `responseMimeType` và `responseSchema` để ép hình dạng kết quả; timeout 30 giây.
- [x] Có lớp dựng prompt tách riêng khỏi lớp gọi HTTP, để chỉnh nội dung chỉ dẫn không phải đụng code gọi mạng.
- [x] Backend kiểm tra hình dạng kết quả trước khi ghi: sai cấu trúc thì **không ghi gì** vào bản ghi tin tuyển dụng, chỉ ghi log.
- [x] Có endpoint kiểm tra thủ công dành riêng cho quản trị viên, trả về cùng hình dạng với kết quả lưu trong bản ghi tin tuyển dụng để giao diện render một chỗ.
- [x] Tin không tồn tại trả về 404; tài khoản không phải quản trị viên trả về 403.
- [x] Khi AI lỗi (hết hạn mức, lỗi dịch vụ), trả về thông điệp tiếng Việt nói rõ nguyên nhân, **không** phải lỗi 500.
- [x] Cấu hình đọc từ biến môi trường: bật/tắt toàn bộ tính năng, tên nhà cung cấp AI, tên model, và khóa API. Thiếu khóa API thì tính năng **ẩn**, không phải lỗi.
- [x] Nút "Kiểm tra bằng AI" dùng được cho cả tin chưa kiểm tra lẫn tin đã có kết quả, để quản trị viên kiểm tra lại được tin đã có kết quả. Mỗi lần bấm là một lượt AI.
- [x] Tin tuyển dụng không đổi trạng thái dù kết quả là gì; nút Duyệt / Từ chối giữ nguyên hành vi.
- [x] Có bộ test với một nhà cung cấp AI giả trả kết quả cố định: kết quả hợp lệ thì ba thông tin kiểm duyệt được ghi đúng; nhà cung cấp trả về cấu trúc sai thì không ghi gì; nhà cung cấp ném lỗi thì kết quả giữ nguyên rỗng và hàm không ném lỗi ra ngoài; tin không tồn tại thì trả lỗi 404.
- [x] Có bộ test endpoint với MockMvc: gọi endpoint kiểm tra AI trả về đúng mã và hình dạng; lỗi hạn mức của AI trả về thông điệp tiếng Việt chứ không phải 500.

## Comments

**Đã làm (backend, nhánh `feature/ai-ticket-02`, đã merge vào `feature/ai-moderation`).**

Chi tiết đầy đủ: `.scratch/ai-moderation/notes/02-backend-kiem-duyet-ai.md`.

Tóm tắt:

- Lớp mới `com.uniwork.service.ai`: `AiProvider` (interface), `GeminiAiProvider`
  (RestClient, timeout 30s, `responseMimeType` + `responseSchema`, `temperature: 0`),
  `AiPromptBuilder` (prompt tách khỏi code gọi mạng, lấy nguyên văn `PROMPT.md` mục 5),
  `AiEvidenceMatcher` (chuẩn hoá NFC + gộp khoảng trắng + không phân biệt hoa/thường,
  **không** so khớp mờ), `AiReviewService` (điều phối + kiểm chứng), `JobContentAssembler`,
  `AiProviderException`, `AiReviewInput` / `AiReviewResult` / `AiReason` / `AiStatusResponse`.
- **Kiểm chứng trước khi ghi**: verdict lạ → không ghi gì; `OK` kèm lý do → không ghi gì;
  mã vi phạm lạ / bằng chứng rỗng / bằng chứng không nguyên văn → loại riêng lý do đó.
- **Ranh giới phân quyền**: `JobResponse` gốc không có trường AI; `AdminJobResponse extends
JobResponse` thêm `aiVerdict` / `aiReasons` / `aiCheckedAt`. Chỉ `GET /api/v1/admin/jobs`
  dùng hình dạng có AI.
- **Endpoint**: `POST /api/v1/admin/jobs/{id}/ai-review` (404 khi tin không tồn tại; lỗi AI →
  503 `AI_UNAVAILABLE` với thông điệp tiếng Việt, **không** phải 500) và
  `GET /api/v1/admin/ai/status` (`{ enabled, provider }`).
- **Cấu hình**: `app.ai.{enabled,provider,model,gemini-api-key}` từ `AI_ENABLED` /
  `AI_PROVIDER` / `AI_MODEL` / `GEMINI_API_KEY`. Thiếu khoá → tính năng **ẩn**, không lỗi.
- **Migration** `V15__ai_review_on_job_posts.sql`: `ai_verdict` (NULL = chưa kiểm tra),
  `ai_reasons` (JSON), `ai_checked_at` + ràng buộc `CHECK` verdict.
- **Executor** `aiTaskExecutor` riêng trong `AsyncConfig`, tách khỏi executor gửi email.
- **Test**: 12 test service + 5 test controller = **94/94 test backend PASS**. Kiểm chứng
  parity prompt với `backend/scripts/ai-moderation/prompt.mjs` bằng script Node — khớp
  byte-for-byte.
- **Chưa làm được**: không chạy được lượt gọi AI thật vì thiếu `GEMINI_API_KEY`, nên chưa
  kiểm chứng end-to-end với Gemini.
