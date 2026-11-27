# Tài Liệu Hiểu Toàn Bộ Hệ Thống — VieJob Marketplace

Tài liệu này tổng hợp toàn bộ **kiến trúc kỹ thuật, luồng nghiệp vụ, cách xử lý tình huống biên (edge cases)** và **các quyết định thiết kế (ADR)** của dự án **VieJob Marketplace**, giúp bạn nắm chắc hệ thống từ trong ra ngoài để tự tin trả lời mọi câu hỏi vấn đáp.

---

## 1. Kiến trúc tổng thể (Architecture)

Dự án tổ chức theo mô hình **Monorepo** gồm 2 phần tách biệt hoàn toàn:

| Thành phần               | Công nghệ chính                                                                                  | Vai trò & Ranh giới                                                                                                                              |
| :----------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend (`app/`)**    | React, TypeScript, Vite, Tailwind CSS, TanStack React Query, React Router, Zod, Axios            | Giao diện người dùng, validate form (Zod), quản lý server-state (React Query), gọi REST API và kết nối WebSocket. **Không chứa business logic**. |
| **Backend (`backend/`)** | Spring Boot, Spring Security, Spring Data JPA/Hibernate, Flyway, MySQL, Cloudflare R2, WebSocket | Toàn bộ business logic, truy vấn DB, xác thực JWT, phân quyền RBAC, kiểm duyệt AI, lưu trữ tệp, đẩy thông báo real-time.                         |

### Quy ước thiết kế xuyên suốt

- **Hợp đồng API thống nhất (`ApiResponse<T>`)**: Mọi endpoint trả về cấu trúc `{ success, data, message, error }` (thất bại có `error` kèm `fieldErrors`).
- **Dùng `slug` làm ID công khai**: Các thực thể (tin tuyển dụng `job-...`, đơn ứng tuyển `app-...`, đánh giá `rev-...`, thông báo `ntf-...`, tệp) dùng `slug` hoặc mã hành chính trong URL & API thay vì ID số tự tăng (`BIGINT`) để tránh lộ quy mô dữ liệu và tránh đoán ID.
- **Tổ chức Frontend theo Feature-Sliced (trong `app/src/features/`)**: `pages/` chỉ nhập từ `features/`, các `features/<x>/` không được import chéo nhau (chỉ dùng chung qua `features/shared/` như `query-keys.ts` và `types/`). Luật này được kiểm soát bằng ESLint `no-restricted-imports`.

---

## 2. Xác thực, Phân quyền & Bảo mật

### 2.1. Cơ chế JWT (Access Token + Refresh Token)

- Khi đăng nhập thành công, backend (`JwtService`) cấp 2 token (HMAC-SHA256):
  - **Access token**: ngắn hạn (**15 phút**), gắn vào header `Authorization: Bearer <token>`.
  - **Refresh token**: dài hạn (**7 ngày**), lưu ở DB (`refresh_tokens`) và `localStorage`.
- **Tự động làm mới (Seamless Refresh)**: Axios interceptor phía frontend tự động bắt lỗi `401`, gọi `POST /api/v1/auth/refresh` để xin access token mới, lưu lại và tự động chạy lại (retry) request ban đầu.
- **Lý do chọn `localStorage` thay vì Cookie**: Hỗ trợ deploy tách domain (cross-origin giữa Vercel và Render) không bị vướng `SameSite` cookie; backend hoàn toàn stateless. Rủi ro XSS được giảm thiểu bằng sanitize input và không dùng `eval()`.

### 2.2. Đăng ký, Xác thực Email & Google OAuth2

- **Đăng ký (`AuthServiceImpl.register`)**:
  - Chặn tuyệt đối việc tự đăng ký vai trò `ADMIN`.
  - Tạo `User` với trạng thái `PENDING_VERIFY` và tạo luôn hồ sơ (`StudentProfile` hoặc `EmployerProfile`) trong **cùng một transaction**.
  - Sinh token ngẫu nhiên 32 byte (`SecureRandom`), **chỉ lưu mã băm SHA-256** vào bảng `user_tokens` (hạn 24 giờ) — kể cả DB bị lộ cũng không ai lấy được token gốc.
  - Gửi email kích hoạt **bất đồng bộ** (`@Async` qua `mailTaskExecutor`) bằng Gmail SMTP để không làm chậm API đăng ký.
  - Gửi lại email xác thực có **rate-limit 60 giây/email** (vượt quá trả HTTP `429`).
- **Đăng nhập (`AuthServiceImpl.login`)**:
  - **Kiểm tra mật khẩu trước**, sau đó mới kiểm tra trạng thái `LOCKED` hoặc `PENDING_VERIFY`. Cách này tránh việc kẻ xấu dò email xem tài khoản có tồn tại hay đang bị khóa không.
  - Hỗ trợ đăng nhập bằng **Google OAuth2** (`GoogleTokenVerifierService` xác thực `idToken` ở phía server).

### 2.3. Phân quyền (RBAC) hai lớp

- **Backend (`SecurityConfig`)**: Chặn ở tầng filter theo prefix URL:
  - `/api/v1/student/**` → `ROLE_STUDENT`
  - `/api/v1/employer/**` → `ROLE_EMPLOYER`
  - `/api/v1/admin/**` → `ROLE_ADMIN`
  - Ngoài ra ở tầng Service luôn kiểm tra **quyền sở hữu (ownership)** (ví dụ: NTD A không thể sửa tin hoặc xem đơn ứng tuyển thuộc về tin của NTD B → ném `403 Forbidden`).
- **Frontend (`router.tsx`)**: Bọc bởi `<RequireAuth>` và `<RequireRole roles={[...]} />`, sai vai trò sẽ chuyển sang trang `/403`.

---

## 3. Các luồng nghiệp vụ cốt lõi & Xử lý tình huống biên

### 3.1. Vòng đời Tin tuyển dụng (`JobServiceImpl`)

```text
DRAFT → PENDING_REVIEW → OPEN → IN_PROGRESS → FILLED → COMPLETED
                      ↘ REJECTED
         OPEN → CLOSED / CANCELLED
```

- **Tại sao tin mới luôn phải vào `PENDING_REVIEW`? (ADR 0003)**:
  - Chống spam, tin lừa đảo, nội dung vi phạm pháp luật trước khi hiển thị công khai. Chỉ tin trạng thái `OPEN` mới xuất hiện trên trang tìm kiếm `/jobs`.
- **Khi Nhà tuyển dụng sửa tin (`update`)**:
  - Nếu tin đang ở `OPEN` hoặc `REJECTED` → sửa xong hệ thống tự động đưa về lại `PENDING_REVIEW` (để admin duyệt lại nội dung mới) và gọi lại kiểm duyệt AI nền.
  - Nếu tin vốn đang ở `PENDING_REVIEW` → sửa nội dung **không** gọi lại AI nền để tránh spam tốn hạn mức API.
- **Địa điểm làm việc (Cập nhật hành chính 2025)**:
  - Theo Quyết định 19/2025/QĐ-TTg, cấp **Quận/Huyện** đã bỏ từ 01/07/2025. Form và nghiệp vụ sử dụng **Tỉnh/Thành phố** + **Xã/Phường/Đặc khu** (lưu bằng mã đơn vị hành chính 5 chữ số để ổn định khi sáp nhập). Khi chọn xã/phường, backend tự đồng bộ tỉnh theo xã/phường đó.

### 3.2. Xếp hạng lương (Salary Benchmark)

- Để so sánh các tin có đơn vị trả lương khác nhau (`HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`), cả Backend (`SalaryUnits.java`) và Frontend (`salary.ts`) dùng **một bảng quy đổi duy nhất**:
  - `HOURLY` ÷ 1 | `DAILY` ÷ 8 | `WEEKLY` ÷ 40 | `MONTHLY` ÷ 160.
  - `PER_TASK` (theo việc) và `NEGOTIABLE` (thỏa thuận) cố tình **không quy đổi** vì không xác định được số giờ thực tế.
- **Lùi tỉnh (Fallback)**: Hệ thống tra bảng `salary_benchmarks` theo `(categoryId, provinceId)`. Nếu tỉnh đó chưa đủ mẫu dữ liệu, tự động lùi về dữ liệu của tỉnh mặc định (`79` — TP. Hồ Chí Minh) ở cả Frontend lẫn Backend AI để 2 bên nhìn cùng 1 con số.
- **Cách tính `"Top X%"`**:
  - Quy đổi vị trí mức lương trong dải `[minHourly, maxHourly]` rồi đảo ngược: `percentile = Math.round((1 - ratio) * 100)` (lương càng cao thì con số `Top X%` càng nhỏ, ví dụ `Top 5%`).
  - Phân loại `ABOVE` / `AVERAGE` / `BELOW` dựa trên ngưỡng chênh lệch **±5%** so với `avgHourly`.

### 3.3. Vòng đời Đơn ứng tuyển & Tự động hóa (`ApplicationServiceImpl` & `WorkHistoryServiceImpl`)

```text
PENDING → SHORTLISTED → ACCEPTED → COMPLETED
   ↘ REJECTED (bởi NTD)
   ↘ WITHDRAWN (bởi Sinh viên)
```

- **Xử lý khi Sinh viên rút đơn và ứng tuyển lại (`reactivate`)**:
  - Bảng `applications` có ràng buộc `UNIQUE (job_post_id, student_id)` (mỗi sinh viên chỉ có 1 dòng đơn cho 1 tin).
  - Sinh viên chỉ được **Rút đơn** khi trạng thái đang là `PENDING`.
  - Nếu sau đó sinh viên ứng tuyển lại vào đúng tin đó, backend **không insert dòng mới** (sẽ lỗi unique) mà kích hoạt lại đơn cũ (`WITHDRAWN` → `PENDING`), xóa ghi chú cũ và **giữ nguyên lịch sử dòng thời gian (`application_status_history`)**.
- **Đồng bộ số suất tuyển (`syncJobPositions`)**:
  - Mỗi lần NTD đổi trạng thái đơn, backend đếm số đơn `ACCEPTED` của tin đó để cập nhật `positionsFilled`.
  - Nếu `acceptedCount >= positionsCount` → tin tự động chuyển sang `FILLED`.
  - Nếu `acceptedCount > 0` nhưng chưa đủ → tin chuyển sang `IN_PROGRESS`.
- **Tự động sinh Lịch sử làm việc (`WorkHistoryServiceImpl.recordCompletion`)**:
  - Khi đơn chuyển sang `COMPLETED` **lần đầu tiên**, hệ thống tự động tạo 1 bản ghi trong bảng `work_assignments` (đảm bảo idempotent qua `existsByApplicationId`).
  - Dữ liệu được **snapshot** tại thời điểm hoàn thành (tên công việc, tên công ty, vị trí, mức lương) để sau này tin tuyển dụng có bị sửa hay xóa thì lịch sử làm việc của sinh viên vẫn giữ nguyên sự thật.
  - Mốc bắt đầu (`startedAt`) được tra tự động từ thời điểm đơn chuyển sang `ACCEPTED` trong bảng `application_status_history`.

### 3.4. Đánh giá hai chiều & Điểm uy tín (`ReviewServiceImpl`)

- **Điều kiện đánh giá**: Chỉ cho phép khi đơn ứng tuyển đã `COMPLETED`, và mỗi bên chỉ được đánh giá 1 lần cho 1 đơn (`existsByApplicationIdAndReviewerId`).
- **Phản hồi hai chiều**: Người bị đánh giá trả lời vào ô `reply`, và người viết đánh giá có thể phản hồi lại vào ô `reviewerReply`.
- **Tính điểm uy tín (`avgRating`, `ratingCount`)**: Tính toán lại trực tiếp trong tầng Service (không dùng trigger DB để dễ kiểm soát và test). Nếu NTD đánh giá sinh viên, điểm số đó còn được đồng bộ vào bản ghi `work_assignments` tương ứng.
- **Kiểm duyệt đánh giá**: Quản trị viên có thể ẩn đánh giá vi phạm (`isHidden = true`); các API hiển thị công khai và của NTD/SV sẽ lọc bỏ đánh giá đã ẩn.

---

## 4. Các kỹ thuật chuyên sâu nổi bật

### 4.1. Lớp kiểm duyệt tin tuyển dụng bằng AI (Gemini) — ADR 0005

Tính năng AI được thiết kế rất chặt chẽ để giải quyết bài toán thực tế khi đưa LLM vào hệ thống có người thật:

1. **Nguyên tắc: AI chỉ góp ý, con người quyết định**:
   - AI trả về `aiVerdict` (`OK` / `WARN` / `SUSPECT`), `aiReasons` và `aiSummary` tiếng Việt, giúp sắp xếp tin `SUSPECT` lên đầu hàng đợi duyệt của Admin.
   - AI **không bao giờ** tự ý duyệt (`OPEN`) hay từ chối (`REJECTED`) tin, vì mô hình xác suất có thể sai và không chịu trách nhiệm pháp lý.
2. **6 mã vi phạm cố định**:
   - `FEE_ADVANCE` (thu phí/đặt cọc trước), `UNREGISTERED_WORK` (làm việc phi chính thức, không hợp đồng/CCCD), `OFF_PLATFORM` (lôi kéo liên hệ ngoài nền tảng qua Zalo/Telegram/SĐT), `SALARY_ANOMALY` (lương bất thường), `DISCRIMINATION` (phân biệt đối xử), `ILLEGAL_WORK` (việc phạm pháp).
3. **Tách biệt cấu trúc dữ liệu (Structural Separation)**:
   - DTO `JobResponse` (dùng cho công khai & NTD) **không có** trường `ai*`. Chỉ `AdminJobResponse extends JobResponse` mới có các trường AI. Nhờ đó không bao giờ có chuyện rò rỉ kết quả AI ra ngoài.
4. **Chống Prompt Injection (Chỉ đạo nhầm)**:
   - Prompt gửi cho Gemini tách 2 khối rõ ràng: khối **System Instruction** cố định và khối **Dữ liệu tin** bọc trong thẻ `<TIN_TUYEN_DUNG>...</TIN_TUYEN_DUNG>` kèm câu nhắc mô hình bỏ qua mọi mệnh lệnh nằm bên trong nội dung tin.
5. **Chống AI "bịa" bằng chứng (Anti-Hallucination)**:
   - Mọi lý do vi phạm AI đưa ra bắt buộc phải trích dẫn `evidence` **nguyên văn** từ phần nội dung do NTD viết (cấm trích từ dòng ngữ cảnh thị trường do hệ thống sinh).
   - Khi nhận JSON từ Gemini (`temperature = 0`, ép `responseSchema`), Backend **tự kiểm chứng lại**: chuẩn hóa Unicode NFC + gộp khoảng trắng + kiểm tra `includes` (cố ý không dùng fuzzy match). Lý do nào không tìm thấy nguyên văn trong tin sẽ bị **loại bỏ**.
6. **Xử lý bất đồng bộ & Graceful Degradation**:
   - Chạy nền qua `aiTaskExecutor` riêng (không dùng chung thread pool với `mailTaskExecutor` vì AI timeout tới 30 giây).
   - Kích hoạt ở callback `afterCommit()` của DB transaction để đảm bảo luồng nền đọc được dữ liệu đã commit.
   - Nếu tắt cờ `AI_ENABLED=false`, thiếu `GEMINI_API_KEY`, hoặc Gemini lỗi/hết quota (`429`) → giao diện ẩn nút kiểm tra AI (hoặc giữ `ai_verdict = NULL` là "Chưa kiểm tra"), **tuyệt đối không làm hỏng luồng đăng tin của NTD**.

### 4.2. Lưu trữ tệp an toàn trên Cloudflare R2 — ADR 0001

- **Tại sao không lưu trực tiếp trên server?** Server deploy dạng container (Render) có ổ đĩa tạm thời (ephemeral), redeploy sẽ mất sạch file; tách sang R2 (tương thích S3) giúp lưu trữ bền vững, phân phối qua CDN và tối ưu chi phí.
- **Hai cơ chế Upload (`FileStorageServiceImpl`)**:
  1. _Multipart qua Backend_ (`store`): phù hợp file nhỏ.
  2. _Presigned URL_ (`presign` → client PUT thẳng lên R2 → `confirm`): giảm tải băng thông cho server backend.
- **Bảo vệ chống tệp giả mạo & quá tải**:
  - **Kiểm tra Magic Bytes (`FileSignatureValidator`)**: Đọc 12 byte đầu của tệp để nhận diện định dạng thực (PDF, DOCX, PNG, JPEG, WEBP...), **không tin** `Content-Type` hay đuôi file do client gửi lên (tránh trường hợp đổi đuôi `.exe` thành `.pdf`).
  - **Tự động nén & Resize ảnh (`ImageResizer`)**: Avatar và logo được resize/nén trước khi lưu.
  - **Quota & Dọn rác**: Giới hạn tối đa **20 MB / user**, file thô tối đa **12 MB**. Nếu bước `confirm` phát hiện sai định dạng hoặc quá dung lượng, khối `finally` tự động xóa object vừa PUT lên R2 để không để rác trong bucket.

### 4.3. Thông báo Real-time qua WebSocket & Cơ chế Vé (Ticket)

- **Bài toán kỹ thuật**: API `WebSocket` chuẩn của trình duyệt không hỗ trợ truyền header `Authorization: Bearer <JWT>` lúc bắt tay (handshake). Nếu nhét JWT lên query param URL thì dễ bị lộ token trong log server/proxy.
- **Giải pháp Ticket (`WsTicketController` & `WebSocketConfig`)**:
  1. Client (đã đăng nhập) gọi HTTP `POST /api/v1/ws/ticket` kèm Bearer JWT.
  2. Backend sinh một **vé dùng một lần (one-time ticket)** lưu trong RAM, hết hạn sau **60 giây**.
  3. Client mở kết nối `/ws/notifications?ticket=<ticket>`. `TicketHandshakeInterceptor` kiểm tra và tiêu thụ (xóa) vé ngay lập tức; nếu hợp lệ thì gắn `userId` vào WebSocket session.
- **Đảm bảo tính nhất quán dữ liệu (`NotificationServiceImpl`)**:
  - Bảng `notifications` trong MySQL là nguồn sự thật.
  - Việc đẩy tin nhắn qua WebSocket được bọc trong `TransactionSynchronization.afterCommit()` — đảm bảo **chỉ bắn tín hiệu real-time sau khi DB đã commit thành công** (không bao giờ gửi thông báo ma cho một transaction bị rollback).
  - Nếu kết nối WebSocket gặp lỗi, backend chỉ log warning chứ **không làm fail giao dịch chính** (như nộp đơn hay duyệt tin).
- **Theo dõi tin mới (`JobNotifyServiceImpl`)**: Sinh viên có thể bật theo dõi theo `(Nhóm việc, Tỉnh)` hoặc tất cả tỉnh (`ALL`). Khi Admin duyệt tin (`APPROVE`), hệ thống tự động tìm các sinh viên khớp tiêu chí để push thông báo.

### 4.4. Lưu ý về module Phỏng vấn (`interviews`)

- Trong cơ sở dữ liệu và backend đã thiết kế sẵn bảng `interviews` (`V18__interviews.sql`), `EmployerController` (`POST /api/v1/employer/applications/{applicationId}/interviews`) và `InterviewServiceImpl` với đầy đủ ràng buộc nghiệp vụ (chỉ mời được khi đơn đang ở `SHORTLISTED`, khung giờ `06:00–22:00`, thời lượng `15–180` phút, kiểm tra trùng lịch của NTD, mỗi đơn chỉ có tối đa 1 buổi đang `PENDING`/`CONFIRMED`).
- Tuy nhiên ở phiên bản hiện tại, **Frontend chưa mở giao diện cho tính năng này** (nếu thầy hỏi về định hướng mở rộng hoặc thấy bảng `interviews` trong DB/ERD thì bạn giải thích đây là module đã chuẩn bị sẵn tầng API/DB cho giai đoạn phát triển tiếp theo).

---

## 5. Bộ Câu Hỏi Vấn Đáp Thường Gặp (Hỏi Xoáy Đáp Xoay)

> **Câu 1: Tại sao tin tuyển dụng đăng lên không hiển thị ngay mà phải chờ Admin duyệt? Nếu nhiều tin quá thì Admin làm sao xuể?**
>
> - **Trả lời**: Đây là quyết định thiết kế (ADR 0003) để chống tin rác, tin lừa đảo (thu phí, đa cấp, việc làm phạm pháp) nhằm bảo vệ sinh viên. Để giảm tải cho Admin khi có nhiều tin, hệ thống tích hợp **lớp góp ý AI (Gemini)** tự động quét nội dung theo 6 mã vi phạm và đẩy các tin có rủi ro cao (`SUSPECT`, `WARN`) lên đầu hàng đợi duyệt, giúp Admin biết tin nào cần kiểm tra kỹ trước.

> **Câu 2: Tại sao không để AI tự từ chối luôn các tin vi phạm mà vẫn bắt Admin bấm nút?**
>
> - **Trả lời**: Vì mô hình AI mang tính xác suất, vẫn có thể nhận diện nhầm (false positive/negative) và không chịu trách nhiệm pháp lý nếu chặn nhầm doanh nghiệp uy tín. Hơn nữa hệ thống giữ nguyên tắc con người làm chủ (human-in-the-loop): AI chỉ đóng vai trò trợ lý gắn cờ và trích dẫn bằng chứng, quyết định cuối cùng vẫn là của Quản trị viên.

> **Câu 3: Làm sao chống việc AI "bịa" ra lý do vi phạm (hallucination) hoặc bị người đăng tin lừa bằng Prompt Injection?**
>
> - **Trả lời**:
>   - _Chống Prompt Injection_: Prompt tách biệt rõ khối chỉ dẫn hệ thống và khối dữ liệu người dùng bọc trong thẻ `<TIN_TUYEN_DUNG>`, kèm lệnh bỏ qua mọi chỉ thị bên trong dữ liệu.
>   - _Chống AI bịa_: Prompt ép AI phải trích dẫn nguyên văn câu vi phạm (`evidence`). Backend không tin AI ngay mà chuẩn hóa chuỗi (NFC, lowercase) và so khớp `includes` lại với nội dung gốc nhà tuyển dụng viết; bằng chứng nào không tồn tại nguyên văn trong tin thì backend tự động loại bỏ.

> **Câu 4: Khi dùng Gemini API bị lỗi mạng hoặc hết quota, chức năng đăng tin có bị chết theo không?**
>
> - **Trả lời**: Không. Việc gọi AI chạy bất đồng bộ ở một thread pool riêng (`aiTaskExecutor`) **sau khi** transaction lưu tin vào MySQL đã commit. Mọi lỗi từ AI đều được bắt lại an toàn; tin vẫn được tạo thành công với trạng thái chờ duyệt và nhãn "Chưa kiểm tra". Nếu tắt cờ `AI_ENABLED` hoặc thiếu API key, nút kiểm tra AI cũng tự ẩn sạch sẽ.

> **Câu 5: Làm sao hệ thống xử lý khi sinh viên lỡ rút đơn ứng tuyển rồi muốn nộp lại vào chính công việc đó?**
>
> - **Trả lời**: Trong DB có ràng buộc `UNIQUE(job_post_id, student_id)` để tránh một sinh viên spam nhiều đơn cho một tin. Sinh viên chỉ được rút đơn khi đơn còn đang `PENDING`. Khi sinh viên nộp lại, hệ thống không tạo dòng mới mà dùng cơ chế `reactivate`: cập nhật lại thông tin CV/thư ứng tuyển trên dòng cũ, đưa trạng thái về `PENDING` và ghi nối tiếp vào bảng `application_status_history` nên vẫn giữ trọn vẹn lịch sử.

> **Câu 6: Cách tính "Xếp hạng lương" (Top X%) hoạt động thế nào khi các tin trả lương theo giờ, ngày, tháng khác nhau?**
>
> - **Trả lời**: Hệ thống dùng chung một bảng quy ước quy đổi về đồng/giờ ở cả Frontend và Backend (`HOURLY` ÷ 1, `DAILY` ÷ 8, `WEEKLY` ÷ 40, `MONTHLY` ÷ 160). Riêng lương `PER_TASK` và `NEGOTIABLE` không quy đổi để tránh suy luận sai lệch. Sau đó đối chiếu với bảng `salary_benchmarks` theo nhóm việc và tỉnh (nếu tỉnh chưa có mẫu dữ liệu thì fallback về TP.HCM) để tính vị trí phần trăm `Top X%`.

> **Câu 7: Khi công việc hoàn thành, làm sao đảm bảo sinh viên không tự khai khống kinh nghiệm?**
>
> - **Trả lời**: Hệ thống tách bạch 2 khái niệm: _Kinh nghiệm làm việc_ (sinh viên tự khai trong hồ sơ) và _Lịch sử làm việc_ (`work_assignments`). Lịch sử làm việc **chỉ được hệ thống tự động sinh ra** khi Nhà tuyển dụng xác nhận chuyển đơn sang trạng thái `COMPLETED`, có snapshot lại tên công việc, công ty, lương và gắn kèm điểm đánh giá từ nhà tuyển dụng nên có độ tin cậy cao.

> **Câu 8: Làm sao bảo mật khi người dùng tải CV hoặc ảnh đại diện lên hệ thống?**
>
> - **Trả lời**: Tệp được lưu trên Cloudflare R2 (không lưu trên container tránh mất dữ liệu khi redeploy). Khi nhận file (kể cả qua presigned URL trực tiếp lên R2), Backend luôn đọc **12 byte đầu (magic bytes)** để xác định đúng định dạng thật của file (PDF/DOCX/ảnh) chứ không tin vào đuôi file hay `Content-Type` do client gửi. Ngoài ra mỗi tài khoản bị giới hạn tổng dung lượng 20MB và ảnh được tự động resize/nén.

> **Câu 9: Tại sao WebSocket lại phải có thêm bước cấp "Vé" (Ticket) thay vì gửi thẳng JWT?**
>
> - **Trả lời**: Vì API WebSocket trên trình duyệt không cho phép gắn custom HTTP header `Authorization: Bearer ...` khi mở kết nối. Nếu truyền JWT lên URL query string thì dễ bị lộ token trong log của trình duyệt/proxy. Do đó client dùng JWT gọi API `POST /api/v1/ws/ticket` để lấy một vé ngẫu nhiên chỉ dùng được 1 lần trong 60 giây để bắt tay WebSocket, vừa bảo mật vừa xác định chính xác `userId`.

> **Câu 10: Hệ thống làm thế nào để thông báo Real-time không bị gửi nhầm nếu giao dịch DB bị lỗi (rollback)?**
>
> - **Trả lời**: Backend sử dụng `TransactionSynchronization.afterCommit()` trong Spring. Thông báo được lưu vào bảng `notifications` trong transaction, và tín hiệu WebSocket **chỉ được bắn ra sau khi transaction đã commit thành công xuống MySQL**. Nếu DB rollback thì không bao giờ có thông báo ảo gửi tới người dùng.
