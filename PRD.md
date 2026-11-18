# PRD — VieJob Marketplace

> Mô tả ngắn: VieJob Marketplace là nền tảng web hai chiều kết nối sinh viên đại học với các nhà tuyển dụng/cá nhân có nhu cầu thuê lao động bán thời gian — đăng tin, tìm kiếm, ứng tuyển, theo dõi trạng thái công việc và đánh giá 2 chiều sau khi hoàn thành.

> **Nguồn gốc tài liệu:** viết ngược từ mã nguồn thực tế của `app/` (React SPA) + `backend/` (Spring Boot API). Phần lớn tính năng dưới đây đã được hiện thực trong code với endpoint tương ứng; các tính năng thuần UI được đánh dấu rõ. Mục **"Khoảng trống đã biết"** liệt kê các điểm PRD cũ mô tả vượt quá thực tế.
>
> **Quy mô hiện tại:** 25 feature · 14 nhóm quy tắc nghiệp vụ (143 quy tắc, mục ③.5) · 65 endpoint REST (`@*Mapping`) + 1 WebSocket handshake · 29 bảng DB (24 bảng có entity) · 30 route trong `app/src/app/router.tsx`.

---

## ① Overview

- **App name:** VieJob Marketplace
- **Tagline:** Cầu nối giữa sinh viên và việc làm bán thời gian.
- **Problem:** Sinh viên cần thu nhập thêm nhưng tin tuyển dụng part-time truyền thống thiếu minh bạch về mức lương, ca làm và độ tin cậy của nhà tuyển dụng; nhà tuyển dụng (chủ quán cà phê, cửa hàng, công ty vừa và nhỏ) khó tìm được ứng viên phù hợp lịch học và thiếu kênh quản lý hồ sơ tập trung.
- **Solution:** Một marketplace có đầy đủ vòng đời ứng tuyển: NTD đăng tin (kèm lịch ca, mức lương, xếp hạng lương so với benchmark ngành×tỉnh) → Admin duyệt tin → Sinh viên lọc/ứng tuyển 1 chạm kèm CV → NTD duyệt/từ chối theo pipeline trạng thái → Hai bên đánh giá nhau → Realtime thông báo WebSocket ở mọi bước.
- **Platform:** Web (responsive, ưu tiên desktop + mobile). Không có app native — ngoài phạm vi đề tài.

---

## ② Target User

### Persona chính: Sinh viên (STUDENT)

- **Tên / độ tuổi / nghề nghiệp:** Nguyễn Minh Anh, 20 tuổi, sinh viên năm 3 ngành Marketing, TP.HCM.
- **Họ đang làm gì hàng ngày:** Đi học 8 tiết/tuần, cần thu nhập 3–5 triệu/tháng, sẵn sàng làm thêm ca sáng/tối hoặc cuối tuần.
- **Nỗi đau cụ thể:**
  - Tin tuyển dụng trên Facebook/Zalo không có mức lương rõ ràng, không biết ca làm có hợp lịch học không.
  - Không biết nhà tuyển dụng có uy tín không; lo bị "mất tiền đặt cọc" / làm thử không lương.
  - Phải điền lại hồ sơ cho mỗi tin; không biết hồ sơ của mình đã ở đâu trong pipeline.
- **Họ dùng tool nào hiện tại:** Facebook group, Zalo, bảng tin trường — không có lịch sử, không lọc, không đánh giá.

### Persona phụ: Nhà tuyển dụng (EMPLOYER)

- **Tên / độ tuổi / nghề nghiệp:** Chủ chuỗi cà phê "The Corner" (COMPANY) hoặc freelancer thiết kế (INDIVIDUAL), 25–40 tuổi.
- **Họ đang làm gì hàng ngày:** Cần 2–3 nhân viên ca sáng/tối cho quán, thường xuyên tuyển lại vì sinh viên nghỉ học.
- **Nỗi đau cụ thể:** Rà 100 CV trên Zalo để tìm 2 người hợp ca; không có danh sách ứng viên gom lại theo từng tin; không biết ứng viên nào đã "lọt" và đang chờ.
- **Họ dùng tool nào hiện tại:** Zalo/Facebook, Google Sheets.

### Persona phụ: Quản trị viên (ADMIN)

- **Tên / độ tuổi / nghề nghiệp:** Vận hành marketplace, bảo đảm chất lượng tin đăng và uy tín người dùng.

---

## ③ Features & User Stories

> Mỗi feature gồm: Tên · Story · Done khi. Phần "Đã hiện thực" trích từ route / endpoint thật trong code.

---

### 🟢 MUST (bắt buộc có trong MVP)

#### Feature 1: Đăng ký / đăng nhập & phân quyền 3 vai trò
**Story:** Là sinh viên hoặc nhà tuyển dụng, tôi muốn tạo tài khoản và đăng nhập bằng email hoặc Google, để bắt đầu sử dụng nền tảng.

**Đã hiện thực:**
- `POST /api/v1/auth/register` — đăng ký `STUDENT` / `EMPLOYER` (chặn tuyệt đối `ADMIN`), kiểm tra mật khẩu khớp, email trùng → 409 `EMAIL_ALREADY_EXISTS`.
- Tự tạo profile tương ứng (`student_profiles` / `employer_profiles`) trong cùng transaction.
- Tài khoản mới ở trạng thái `PENDING_VERIFY`; gửi mail xác thực qua Gmail SMTP (`@Async`, lỗi SMTP không làm hỏng đăng ký).
- `GET /api/v1/auth/verify-email?token=` (HTML) + `POST /api/v1/auth/verify-email` (JSON cho client).
- `POST /api/v1/auth/resend-verification` — token 1 lần, hạn 24h, lưu SHA-256, rate limit 60s/email → 429.
- `POST /api/v1/auth/login` — kiểm tra mật khẩu **trước** (không tiết lộ sai trường nào), sau đó mới xét `LOCKED` (403 `ACCOUNT_LOCKED`) / `PENDING_VERIFY` (403 `EMAIL_NOT_VERIFIED`). Tăng `failed_login_count` khi sai.
- `POST /api/v1/auth/google` — Google OAuth2 ID token; tài khoản mới trả `needsRole=true` để client hỏi chọn vai trò; không cho tạo ADMIN qua Google. *(Backend đã sẵn sàng: `GoogleTokenVerifierService` verify ID token bằng `google-api-client`; **frontend chưa nối Google Identity Services** — nút "Đăng nhập với Google" hiện chỉ hiện toast báo cần Client ID, xem Feature 18.)*
- `POST /api/v1/auth/refresh` — refresh token hạn 30 ngày, **rotate** (thu hồi token cũ) khi dùng.
- `GET /api/v1/auth/me` — thông tin user hiện tại từ Bearer token.
- JWT HMAC-SHA256 hạn 24h, stateless session. Guard frontend `RequireAuth` / `RequireRole` theo `src/app/router.tsx`; RBAC backend `hasRole("STUDENT"|"EMPLOYER"|"ADMIN")`.

**Done khi:**
- ✅ Đăng ký → nhận mail → xác thực → đăng nhập → vào đúng dashboard theo vai trò.
- ⚠️ Đăng nhập Google **1-click** — backend đã sẵn sàng (`POST /auth/google` + `GoogleTokenVerifierService`), nhưng **frontend chưa nối Google Identity Services**: nút Google ở form đăng nhập/đăng ký hiện chỉ bật toast *"Tính năng OAuth2 đã sẵn sàng — backend cần cấu hình Client ID"*. Cần: nạp GIS script + `VITE_GOOGLE_CLIENT_ID` + truyền `idToken` vào `POST /auth/google`.
- ✅ Admin gán/khoá tài khoản — user bị khoá không đăng nhập được.
- ❌ (ngoài phạm vi) Đăng nhập bằng Facebook, số điện thoại, OTP.
- ❌ (ngoài phạm vi) Xác thực 2 lớp (2FA).

---

#### Feature 2: Nhà tuyển dụng đăng tin tuyển dụng part-time
**Story:** Là nhà tuyển dụng, tôi muốn đăng tin đầy đủ mô tả, ca làm, mức lương và địa điểm, để sinh viên biết chính xác công việc.

**Đã hiện thực:**
- `POST /api/v1/employer/jobs` — tiêu đề, mô tả, yêu cầu, quyền lợi, nhóm việc (`category`), vị trí (`position`), loại hình (`employmentType`: FULL_TIME / PART_TIME / FLEXIBLE / CASUAL), hình thức (`workMode`: ONSITE / REMOTE / HYBRID), kiểu trả lương (`salaryType`: HOURLY / DAILY / WEEKLY / MONTHLY / PER_TASK / NEGOTIABLE), khoảng lương, địa điểm (tỉnh/quận/địa chỉ/chi nhánh), số suất tuyển, lịch ca theo tuần, kỹ năng, hạn nộp.
- Tin mới **luôn** vào trạng thái `PENDING_REVIEW` — không hiển thị công khai trước khi duyệt.
- `PUT /api/v1/employer/jobs/{id}` — sửa tin; nếu tin đang `OPEN` thì **tự quay lại** `PENDING_REVIEW` để admin duyệt lại (giữ nguyên `publishedAt`).
- `DELETE /api/v1/employer/jobs/{id}` — soft-delete (`deletedAt`), ứng viên đã ứng tuyển vẫn xem lại được hồ sơ.
- Validation server: title bắt buộc, category phải tồn tại, `salaryMin ≥ 0`.
- Chỉ chủ sở hữu tin được sửa/xoá (sai → 404, không lộ tin tồn tại).
- Lịch ca lưu ở bảng `job_post_schedules` (dayOfWeek 1–7 + start/end), kỹ năng ở `job_post_skills`.

**Done khi:**
- ✅ NTD đăng tin → nhận thông báo "chờ duyệt" → Admin duyệt → tin xuất hiện trên trang tìm việc.
- ✅ NTD sửa tin đã duyệt → tin quay lại hàng đợi duyệt.
- ✅ Tin mô tả rõ ca làm, mức lương, số suất, địa điểm, kỹ năng yêu cầu.
- ✅ Nhận việc: **Tin tuyển gấp** (`isUrgent`), **hạn nộp** (`deadline`), **lịch ca theo tuần**, **tổng giờ/tuần** tự tính, **danh sách kiểm tra** trước khi đăng (Feature 25).
- ❌ (ngoài phạm vi) Đăng tin nhiều suất / đăng gói nâng cấp / quảng cáo trả phí.
- ❌ (ngoài phạm vi) Tin tuyển dụng lưu trữ nhiều vị trí (Google Jobs format).

---

#### Feature 3: Sinh viên tìm kiếm & lọc tin tuyển dụng
**Story:** Là sinh viên, tôi muốn lọc tin theo ngành, ca làm, khu vực và mức lương, để nhanh chóng tìm được việc phù hợp lịch học.

**Đã hiện thực:**
- `GET /api/v1/jobs/public` — lọc đa tiêu chí: `keyword`, `categoryIds`, `positionIds`, `provinceIds`, `districtIds`, `employmentTypes`, `workModes`, `salaryMin/salaryMax`, `sort` (`newest` / `salary_desc` / `salary_asc` / `popular`), `page`, `pageSize` (tối đa 100). Trả `JobListResponse` có `items`, `totalItems`, `currentPage`, `totalPages`.
- **Quy ước quy đổi lương thống nhất giữa FE/BE**: giờ=1, ngày=8, tuần=40, tháng=160, tác vụ=3. FE luôn quy đổi sang **đồng/giờ** trước khi gửi `salaryMin/salaryMax`.
  ⚠️ Backend **không** nhận tham số `salaryUnit` (`PublicJobController.list` chỉ khai báo `salaryMin`/`salaryMax`) — FE vẫn gửi kèm `salaryUnit` trong query nhưng Spring bỏ qua (an toàn, không lỗi).
- Bộ lọc lưu trên **URL query** (`useJobFilters`) → F5 / share link giữ nguyên bộ lọc; có chip từng filter để xoá nhanh; debounce 400ms cho ô tìm kiếm; reset về mặc định.
- Master data công khai: `GET /api/v1/public/categories | positions | provinces | districts | skills | salary-benchmarks`.
- `GET /api/v1/jobs/public/related?categoryId&excludeId&limit=6` — gợi ý tin cùng nhóm việc ở trang chi tiết.
- Bộ lọc responsive: sidebar ở desktop, `Sheet` (drawer) ở mobile kèm badge số filter đang áp dụng.

**Done khi:**
- ✅ Lọc theo nhóm việc, vị trí, tỉnh/quận, loại hình, hình thức, khoảng lương — kết hợp nhiều điều kiện.
- ✅ Sắp xếp theo mới nhất / lương tăng / lương giảm / phổ biến.
- ✅ Copy link tìm việc giữ nguyên bộ lọc.
- ❌ (ngoài phạm vi) Lưu bộ lọc thành preset cá nhân / tìm kiếm ngữ nghĩa (AI).
- ❌ (ngoài phạm vi) **Bản đồ nhúng** trong trang chi tiết tin — hiện chỉ có **link mở Google Maps** (Feature 22).

---

#### Feature 4: Xếp hạng lương minh bạch (Salary Benchmark)
**Story:** Là sinh viên, tôi muốn biết mức lương trong tin này cao hay thấp so với trung bình ngành ở địa phương, để tránh bị trả lương dưới giá.

**Đã hiện thực:**
- Bảng `salary_benchmarks` theo **ngành × tỉnh**: `avgHourly`, `minHourly`, `maxHourly`, `sampleSize`, `updatedAt`.
- `GET /api/v1/public/salary-benchmarks` — nạp toàn bộ benchmark về FE.
- `compareSalary()` (`app/src/features/jobs/lib/salary.ts`) — tính **percentile** (vị trí trong dải min–max) và `verdict` = ABOVE / BELOW / AVERAGE, ngưỡng chênh lệch 5% để không báo "cao hơn" cho sai số nhỏ; trả `diff` (chênh lệch đ/giờ so với TB).
- `findBenchmarkFor()` — ưu tiên benchmark đúng (ngành, tỉnh), fallback về tỉnh mặc định `hcm` khi không có dữ liệu.
- Hiển thị badge xếp hạng ngay trên JobCard, trang danh sách và trang chi tiết tin.

**Done khi:**
- ✅ Mỗi tin hiển thị mức lương + thẻ "cao hơn/thấp hơn/trung bình" ngành.
- ✅ Không có benchmark → ẩn badge, không hiển thị sai.
- ✅ Ngưỡng 5% tránh báo sai cho chênh lệch nhỏ.
- ❌ (ngoài phạm vi) Biểu đồ phân bố lương; cập nhật benchmark tự động từ dữ liệu ứng tuyển.

---

#### Feature 5: Hồ sơ sinh viên (CV, học vấn, kỹ năng, kinh nghiệm, mục tiêu việc làm)
**Story:** Là sinh viên, tôi muốn tạo hồ sơ một lần (kèm CV) và dùng lại để ứng tuyển nhiều tin, để không phải điền lại.

**Đã hiện thực:**
- `GET/PUT /api/v1/student/profile` — họ tên, SĐT, ngày sinh, giới tính, mã SV, trường, ngành, năm học, tỉnh, địa chỉ, giới thiệu bản thân, ảnh đại diện, CV, danh sách kỹ năng.
- `experiences[]` — danh sách kinh nghiệm (công ty, vị trí, thời gian, mô tả), sắp xếp theo `sortOrder`; cập nhật = thay thế toàn bộ.
- `jobPreferences` — nhóm việc, loại hình, khoảng lương, tỉnh (mục tiêu việc làm), lưu ở `student_job_preferences`.
- `avgRating` / `ratingCount` có trong DTO hồ sơ (BE tính sẵn) nhưng **UI hồ sơ sinh viên hiện chưa render** hai trường này (xem "Khoảng trống đã biết").
- Giao diện 2 tab: "Hồ sơ" và "Kỹ năng & kinh nghiệm".

**Done khi:**
- ✅ Lưu & tải lại hồ sơ đúng dữ liệu đã nhập.
- ✅ Upload CV (PDF/DOC/DOCX, ≤ 5MB) thành công và hiện link tải.
- ✅ Nhập nhiều kinh nghiệm và mục tiêu việc làm.
- ❌ (ngoài phạm vi) Tạo CV bằng template / xuất PDF hồ sơ / import LinkedIn.

---

#### Feature 6: Ứng tuyển 1 chạm kèm CV & thông tin bổ sung
**Story:** Là sinh viên, tôi muốn ứng tuyển nhanh bằng hồ sơ sẵn có, để tiết kiệm thời gian.

**Đã hiện thực:**
- `POST /api/v1/student/applications` — payload: `jobId`, `cvUrl`/`cvFileName`, `coverLetter`, `expectedSalary`, `experience` (kinh nghiệm liên quan), `availableFrom` (ngày có thể bắt đầu).
- Nếu không truyền `cvUrl` → lấy CV trong hồ sơ sinh viên.
- Chặn ứng tuyển trùng (đã ứng tuyển tin này rồi) và chặn khi tin không còn `OPEN`.
- Tăng `applicantCount` của tin, ghi dòng lịch sử trạng thái đầu tiên (`null → PENDING`).
- Trang ứng tuyển có nút **"Điền từ hồ sơ"** — prefill toàn bộ tên/SĐT/email/kinh nghiệm/CV, vẫn sửa được trước khi gửi.
- Bắt buộc tick cam kết trước khi gửi.

**Done khi:**
- ✅ Ứng tuyển thành công → NTD nhận thông báo ngay, đơn xuất hiện trong danh sách ứng viên.
- ✅ Ứng tuyển trùng bị từ chối với thông báo rõ ràng.
- ✅ Ứng tuyển vào tin đã đóng bị từ chối.
- ❌ (ngoài phạm vi) Trả lời nhanh (quick reply) trong hộp thư; nộp hồ sơ hàng loạt.

---

#### Feature 7: Nhà tuyển dụng duyệt hồ sơ & quản lý pipeline ứng viên
**Story:** Là nhà tuyển dụng, tôi muốn xem danh sách ứng viên theo từng tin và cập nhật trạng thái theo pipeline, để quản lý việc tuyển dụng.

**Đã hiện thực:**
- `GET /api/v1/employer/applications?jobId&status` — danh sách ứng viên, lọc theo tin hoặc trạng thái.
- `GET /api/v1/employer/applications/{id}` — chi tiết hồ sơ: học vấn, kỹ năng, CV, thư ứng tuyển, lương kỳ vọng, ngày bắt đầu, timeline trạng thái.
- `PATCH /api/v1/employer/applications/{id}` — đổi trạng thái. Pipeline: `PENDING → SHORTLISTED → ACCEPTED → COMPLETED`, cộng `REJECTED`.
- **Tự đồng bộ suất tuyển**: đếm số đơn `ACCEPTED` → cập nhật `positionsFilled`; đủ suất → tin chuyển `FILLED`; còn suất nhưng đã có người nhận → tin chuyển `IN_PROGRESS`.
- `PATCH /api/v1/employer/applications/{id}/note` — ghi chú của NTD về đơn (≤ 500 ký tự), lưu ở `employerNote`; **hiện BE trả trường này cho cả SV** (xem BR-06.17).
- Mỗi lần đổi trạng thái ghi vào `application_status_history` → dựng timeline.

**Done khi:**
- ✅ Lọc ứng viên theo tin + trạng thái; xem chi tiết hồ sơ đầy đủ.
- ✅ Đổi trạng thái → sinh viên nhận thông báo realtime kèm timeline.
- ✅ Ghi chú của NTD lưu riêng trên đơn (≤ 500 ký tự).
  ⚠️ **Lệch ý định:** PRD cũ ghi "sinh viên không xem được", nhưng BE trả `employerNote` cho **cả hai bên** và trang chi tiết đơn của **sinh viên** đang render nó ("Ghi chú từ nhà tuyển dụng"). Xem BR-06.17 để chốt lại hướng xử lý.
- ✅ Đủ suất → tin tự chuyển FILLED.
- ❌ (ngoài phạm vi) Lịch phỏng vấn / đặt lịch hẹn; gửi email hàng loạt tới ứng viên; ATS drag-drop Kanban.

---

#### Feature 8: Theo dõi trạng thái đơn & rút đơn
**Story:** Là sinh viên, tôi muốn xem trạng thái đơn của mình và rút đơn khi không còn phù hợp.

**Đã hiện thực:**
- `GET /api/v1/student/applications?status` — danh sách đơn của tôi, mới nhất trước.
- `GET /api/v1/student/applications/{id}` — chi tiết + timeline trạng thái.
- `PATCH /api/v1/student/applications/{id}/withdraw` — chỉ rút được khi đang `PENDING`; đã xử lý thì báo "liên hệ NTD".
- Rút đơn → giảm `applicantCount`, đẩy trạng thái `WITHDRAWN`, NTD nhận thông báo.
- Trang danh sách có modal xác nhận rút đơn nêu rõ hệ quả.

**Done khi:**
- ✅ SV xem được toàn bộ đơn + lịch sử trạng thái.
- ✅ Rút đơn thành công khi còn PENDING.
- ✅ Rút đơn bị chặn với thông báo giải thích khi đã xử lý.
- ❌ (ngoài phạm vi) Nhắc việc lịch học qua lịch Google; chat với NTD.

---

#### Feature 9: Đánh giá 2 chiều sau khi hoàn thành công việc
**Story:** Là sinh viên (hoặc NTD), tôi muốn đánh giá đối phương sau khi việc hoàn thành, để xây dựng uy tín cho cả hai phía.

**Đã hiện thực:**
- `POST /api/v1/reviews` — payload `{ applicationId, rating (1–5), comment }`.
- Chỉ đánh giá được khi đơn ở trạng thái `COMPLETED`; mỗi người đánh giá 1 lần cho 1 đơn.
- Chiều đánh giá tự động theo vai trò: SV đánh giá NTD (`targetType=EMPLOYER`), NTD đánh giá SV (`targetType=STUDENT`).
- Điểm trung bình (`avgRating`) & số lượt đánh gi (`ratingCount`) được **tính lại ở tầng service** (không dùng trigger CSDL) và ghi vào profile bị đánh giá.
- `POST/PATCH /api/v1/employer/reviews/{id}/reply` — NTD trả lời đánh giá.
- `GET /api/v1/reviews?targetType&targetUserId&hideHidden` — danh sách đánh giá.
- `PATCH /api/v1/admin/reviews/{id}` — Admin ẩn/hiện đánh giá vi phạm; ẩn đánh giá sẽ **tính lại điểm trung bình**.

**Done khi:**
- ✅ Chỉ đánh giá được sau khi công việc hoàn thành; đúng 1 lần/người/đơn.
- ✅ Điểm trung bình cập nhật trên profile và hiển thị công khai.
- ✅ NTD trả lời được đánh giá.
- ✅ Admin ẩn đánh giá vi phạm → điểm trung bình được tính lại.
- ❌ (ngoài phạm vi) Khiếu nại/báo cáo đánh giá; đánh giá theo tiêu chí con (giao tiếp, đúng giờ…).

---

#### Feature 10: Quản trị viên kiểm duyệt tin đăng
**Story:** Là quản trị viên, tôi muốn kiểm tra nội dung tin trước khi hiển thị công khai, để bảo đảm chất lượng & an toàn cho sinh viên.

**Đã hiện thực:**
- `GET /api/v1/admin/jobs?status` — danh sách tin theo trạng thái (mặc định sắp mới nhất).
- `PATCH /api/v1/admin/jobs/{id}/review` — `{ action: "APPROVE" | "REJECT", reason? }`.
  - APPROVE → `OPEN`, set `reviewedAt`, set `publishedAt` nếu chưa có.
  - REJECT → `REJECTED`, lưu `rejectReason`, NTD nhận thông báo kèm lý do + link sửa tin.
- Tin mới/sửa → Admin nhận thông báo "có tin chờ duyệt" (đẩy cho **toàn bộ** admin).
- Trạng thái tin: `DRAFT / PENDING_REVIEW / REJECTED / OPEN / FILLED / IN_PROGRESS / COMPLETED / CLOSED / CANCELLED`.

**Done khi:**
- ✅ Admin duyệt → tin hiển thị công khai ngay và NTD nhận thông báo.
- ✅ Admin từ chối kèm lý do → NTD biết lý do và sửa lại được.
- ✅ Tin sửa lại từ OPEN quay về hàng đợi duyệt.
- ❌ (ngoài phạm vi) AI kiểm duyệt tự động nội dung; duyệt hàng loạt (bulk).

---

#### Feature 11: Quản trị viên quản lý người dùng & danh mục
**Story:** Là quản trị viên, tôi muốn quản lý tài khoản người dùng và danh mục ngành nghề, để duy trì chất lượng dữ liệu trên sàn.

**Đã hiện thực:**
- `GET /api/v1/admin/dashboard` — tổng quan: user (SV/NTD), tin (đang tuyển/chờ duyệt), đơn ứng tuyển (tổng/chờ), đánh giá bị ẩn, số danh mục.
- `GET /api/v1/admin/users?role&keyword` — lọc theo vai trò, tìm theo tên/email.
- `PATCH /api/v1/admin/users/{id}` — khoá/mở khoá tài khoản, đổi vai trò.
- `GET/POST/PUT/DELETE /api/v1/admin/categories` — CRUD nhóm việc (ngành nghề): tên, slug (tự sinh từ tên, bỏ dấu tiếng Việt), mô tả, icon, thứ tự, trạng thái active.
- Xoá nhóm việc **đang được tin dùng** → khoá mềm (`isActive=false`) thay vì xoá cứng; xoá thật khi chưa dùng.
- Mỗi user hiển thị: email, họ tên, SĐT, trường/tổ chức, ngày tham gia (`joinedAt`), tổng số tin (NTD) / tổng số đơn (SV). ⚠️ DTO có `lastLoginAt` nhưng bảng UI hiện **chưa render** cột "lần đăng nhập cuối".

**Done khi:**
- ✅ Khoá tài khoản → user đó không đăng nhập được, NTD/SV bị chặn khỏi API theo role.
- ✅ Đổi vai trò user có hiệu lực ngay.
- ✅ Tạo/sửa/xoá nhóm việc, không phá vỡ tin đang dùng nhóm đó.
- ❌ (ngoài phạm vi) Phân quyền admin theo module; nhật ký thao tác quản trị (audit log).

---

#### Feature 12: Trung tâm thông báo + realtime WebSocket
**Story:** Là người dùng, tôi muốn nhận thông báo tức thì khi hồ sơ được duyệt hoặc tin được duyệt, để không bỏ lỡ cơ hội.

**Đã hiện thực:**
- Bảng `notifications` là **nguồn sự thật**; WebSocket chỉ đẩy tín hiệu.
- 5 loại thông báo: `APPLICATION`, `APPLICATION_STATUS`, `JOB`, `REVIEW`, `SYSTEM`.
- **7 sự kiện realtime** (bảng trong AGENTS.md): SV ứng tuyển → NTD; NTD đổi trạng thái → SV; SV rút đơn → NTD; NTD đăng tin → tất cả Admin; Admin duyệt/từ chối tin → NTD; đánh giá mới → người bị đánh giá; tin được duyệt → SV đang bật thông báo theo dõi.
- `GET /api/v1/notifications?unreadOnly` — danh sách; `GET /unread-count` — số chưa đọc; `PATCH /{id}/read`; `POST /read-all`.
- **Vé WebSocket 1 lần**: `POST /api/v1/ws/ticket` (Bearer JWT) → vé hạn 60s → `GET /ws/notifications?ticket=…`; vé sai/hết hạn → 403. Nhờ vậy JWT **không bao giờ** nằm trong query string / access log.
- `NotificationWebSocketHandler` giữ `Map<Long, Set<WebSocketSession>>` theo user → push đúng người nhận.
- `NotificationServiceImpl.push()` đăng ký `TransactionSynchronizationManager.afterCommit` → transaction rollback **không** sinh thông báo ma; lỗi realtime chỉ log warn, không làm hỏng nghiệp vụ.
- Client WS native: reconnect backoff 1s → 30s, ping 25s; `BroadcastChannel("viejob:realtime:notifications")` đồng bộ nhiều tab, chỉ tab có focus mới hiện toast.
- Toast có nút **"Xem"** → đánh dấu đã đọc + điều hướng deep link; frame invalidate cache TanStack Query để refetch dữ liệu chuẩn.
- Trung tâm thông báo `/notifications`: tab "Tất cả" / "Chưa đọc", nút "Đọc tất cả", icon theo loại, thời gian tương đối.

**Done khi:**
- ✅ 7 sự kiện đẩy đúng người nhận, badge số chưa đọc cập nhật tức thì.
- ✅ Toast realtime kèm nút "Xem" điều hướng đúng màn hình.
- ✅ Transaction rollback không tạo thông báo giả.
- ✅ WS disconnect → tự reconnect với backoff.
- ❌ (ngoài phạm vi) Push notification qua email/SMS/Zalo; chat real-time giữa 2 bên.

---

### 🔵 SHOULD (nên có, không gấp)

#### Feature 13: Lưu tin tuyển dụng (Saved Jobs)
**Story:** Là sinh viên, tôi muốn lưu lại các tin quan tâm để xem lại sau, để không bỏ lỡ.

**Đã hiện thực:**
- `GET /api/v1/student/saved-jobs` — danh sách đã lưu; `GET /saved-jobs/ids` — chỉ danh sách id (nhẹ, dùng cho trạng thái nút bookmark ở mọi JobCard).
- `POST /api/v1/student/saved-jobs` — lưu; `DELETE /api/v1/student/saved-jobs/{jobId}` — bỏ lưu.
- Trang `/saved` — lấy chi tiết theo từng id đã lưu (không lọc từ danh sách 20 tin mới nhất → không bỏ sót tin đã lưu), có empty-state riêng cho "tin đã lưu không còn tồn tại".

**Done khi:**
- ✅ Bookmark 1 chạm ở mọi JobCard, trạng thái đồng bộ giữa trang danh sách và trang chi tiết.
- ✅ Trang "Việc làm đã lưu" hiển thị đầy đủ tin đã lưu, bỏ lưu được.
- ❌ (ngoài phạm vi) Thư mục lưu do người dùng tự đặt tên.

---

#### Feature 14: Bật thông báo theo ngành & tỉnh (Job Notify Preference)
**Story:** Là sinh viên, tôi muốn bật thông báo cho nhóm việc + tỉnh mình quan tâm, để được báo khi có tin phù hợp.

**Đã hiện thực:**
- `GET/POST/DELETE /api/v1/student/job-notifications` — bật/tắt theo cặp `categoryCode` + `provinceCode`; `provinceCode` rỗng → sentinel `ALL` (mọi tỉnh).
- Khi Admin **duyệt** tin → `JobNotifyServiceImpl.notifySubscribers()` khớp các subscriber theo nhóm việc + tỉnh của tin (hoặc `ALL`) → đẩy thông báo loại `JOB` kèm link `/jobs/{slug}`.
- Lỗi đẩy thông báo cho 1 người được catch riêng → không làm hỏng luồng duyệt tin.
- **UI:** nút bật/tắt nhanh nhúng trong trang chi tiết tin (`pages/job-detail/index.tsx`) — toggle theo cặp `categoryCode` + `provinceCode` của chính tin đang xem; state lấy từ server qua `useJobNotifyPreferences` (không suy diễn client-side).

**Done khi:**
- ✅ Bật/tắt thông báo theo nhóm việc và tỉnh. ⚠️ **UI hiện chỉ có nút bật/tắt nhanh tại trang chi tiết tin** (`/jobs/{id}`, toggle theo nhóm việc + tỉnh của tin đang xem) — **chưa có màn hình quản lý danh sách** hiển thị tên nhóm việc + tên tỉnh (xem "Khoảng trống đã biết").
- ✅ Tin được duyệt khớp → subscriber nhận thông báo.
- ❌ (ngoài phạm vi) Tần suất thông báo (tổng hợp theo ngày); từ khoá theo dõi tự do.

---

#### Feature 15: Hồ sơ nhà tuyển dụng công khai + quản lý tổ chức
**Story:** Là nhà tuyển dụng, tôi muốn một trang hồ sơ công khai để sinh viên tin tưởng; là sinh viên, tôi muốn xem uy tín + tin đang tuyển của họ.

**Đã hiện thực:**
- `GET /api/v1/public/employers/{id}` — hồ sơ + **tin đang tuyển (`OPEN`)** + **đánh giá công khai (đã loại ẩn)** trong 1 response.
- Trang công khai `/employer/{id}` — ai cũng xem được (không guard, nằm ngoài `PATHS.EMPLOYER` có role guard).
- `GET/PUT /api/v1/employer/profile` — loại NTD (COMPANY / INDIVIDUAL), tên hiển thị, người liên hệ + SĐT, mã số thuế, mô tả, logo, website, tỉnh, địa chỉ; hiển thị trạng thái xác minh `isVerified`.
- `GET /api/v1/employer/reviews` — danh sách đánh giá của NTD (kèm trả lời). *(Trang `/employer/reviews` hiện gọi `GET /api/v1/reviews?targetType=EMPLOYER` rồi lọc client-side theo `targetUserId` — xem "Khoảng trống đã biết" #6.)*

**Done khi:**
- ✅ Trang công khai hiển thị đầy đủ thông tin, tin đang tuyển, đánh giá và điểm trung bình.
- ✅ NTD sửa thông tin tổ chức → hiển thị công khai cập nhật ngay.
- ❌ (ngoài phạm vi) Quy trình xác minh doanh nghiệp (upload giấy phép, duyệt hồ sơ).

---

#### Feature 16: Upload file (CV / ảnh đại diện / logo)
**Story:** Là người dùng, tôi muốn tải lên CV và ảnh/logo, để hồ sơ của tôi đầy đủ và chuyên nghiệp.

**Đã hiện thực:**
- `POST /api/v1/files/upload` — multipart `file` + `kind` (`CV` / `AVATAR` / `LOGO`).
- Giới hạn: CV ≤ 5MB (PDF/DOC/DOCX); ảnh đại diện & logo ≤ 2MB (PNG/JPG/WEBP).
- Validate **cả 2 phía**: client (`validateFile()` — kèm suy luận MIME từ extension khi trình duyệt báo rỗng) và server (`FileStorageServiceImpl` — whitelist MIME + giới hạn size).
- Tên file lưu random (`cv-<uuid>.pdf`), chặn **path traversal** bằng cách normalize + kiểm tra `startsWith(root)`.
- `GET /api/v1/files/{id}` — tải file. Quyền đọc: **CV là tài liệu riêng tư** → chỉ chủ sở hữu, Admin, hoặc NTD **đã nhận đơn ứng tuyển** từ sinh viên đó mới xem được; ảnh/logo là công khai.
- `DELETE /api/v1/files/{id}` — soft-delete, chỉ chủ sở hữu.

**Done khi:**
- ✅ Upload đúng định dạng/giới hạn → lấy URL dùng ngay trong hồ sơ và đơn ứng tuyển.
- ✅ File sai định dạng / quá lớn bị chặn kèm thông báo tiếng Việt rõ ràng.
- ✅ CV của sinh viên không bị NTD khác xem.
- ❌ (ngoài phạm vi) Virus scan; upload lên S3/cloud storage; xem trước (preview) PDF trong trang.

---

#### Feature 17: Mock transport layer (chạy độc lập không cần backend)
**Story:** Là lập trình viên/đồ án, tôi muốn chạy frontend độc lập với dữ liệu mô phỏng, để demo và kiểm thử nhanh không cần dựng backend + MySQL.

**Đã hiện thực:**
- `app/src/lib/mock/adapter.ts` — Axios adapter chặn request, mô phỏng độ trễ 250–600ms.
- `app/src/lib/mock/router.ts` — định tuyến path → handler; `db.ts` — in-memory DB seed từ `app/src/mocks/*`; `handlers/` — auth, jobs, applications, admin, files.
- `app/src/lib/mock/errors.ts` — `MockHttpError` + envelope lỗi **khớp chính xác** Spring Boot.
- Bật/tắt bằng `VITE_USE_MOCK_API` (mặc định `true`). Chuyển sang API thật chỉ đổi env — **không sửa service nào**.
- `pnpm seed:sql` sinh `V3__seed_demo_data.sql` từ `app/src/mocks/*` → dữ liệu demo của mock và DB thật giống nhau.

**Done khi:**
- ✅ `VITE_USE_MOCK_API=true` → app chạy đủ luồng không cần backend.
- ✅ `VITE_USE_MOCK_API=false` → app chạy với API thật, không đổi 1 dòng service.
- ✅ Envelope response/lỗi giống hệt nhau giữa 2 chế độ.
- ❌ (ngoài phạm vi) Ghi/đọc dữ liệu mock ra file để seed lại từ UI.

---

### 🟣 ĐÃ CÓ TRONG CODE (bổ sung ở đợt rà soát 11/2026)

> Các tính năng dưới đây **đã được hiện thực đầy đủ trong `app/`** nhưng bản PRD cũ chưa liệt kê.

#### Feature 18: Giao diện sáng/tối (Theme switcher)
**Story:** Là người dùng, tôi muốn chuyển giao diện sáng/tối/tự động theo hệ điều hành, để dùng app thoải mái về mắt.

**Đã hiện thực:**
- `app/src/provider/theme-provider.tsx` — provider quản lý 3 chế độ `light` / `dark` / `system`, lưu vào `localStorage`, theo dõi `prefers-color-scheme` khi chọn `system`.
- `app/src/components/shared/theme-toggle.tsx` — 2 biến thể: `ThemeToggle` (nút 1 chạm cycle nhanh trên header) và `ThemeModeToggleGroup` (3 nút chọn rõ ràng, dùng trong sidebar workspace).
- Gắn ở `components/layout/header.tsx` (mọi vai trò) và `components/layout/workspace-layout.tsx` (sidebar `/student`, `/employer`, `/admin`).
- Toàn bộ token màu chạy qua CSS variables của Tailwind v4 → không cần reload khi đổi chế độ.

**Done khi:**
- ✅ Đổi sáng/tối ngay lập tức, không reload trang; lựa chọn được giữ qua các phiên.
- ✅ "System" bám theo cài đặt hệ điều hành, tự đổi khi OS đổi sáng/tối.

---

#### Feature 19: Dashboard sinh viên — hoàn thiện hồ sơ, ước tính thu nhập, gợi ý việc
**Story:** Là sinh viên, tôi muốn biết hồ sơ đã hoàn thiện tới đâu, thu nhập ước tính và tin nào phù hợp với mục tiêu việc làm của tôi.

**Đã hiện thực (`app/src/pages/student/index.tsx`):**
- **Thanh tiến độ hoàn thiện hồ sơ** — `profileCompletion` tính từ 8 điều kiện (họ tên, SĐT, ảnh đại diện, CV, trường, ngành, năm học, kỹ năng); hiện phần trăm + `Progress` + nút "Hoàn thiện hồ sơ" dẫn tới `/student/profile`; dưới 100% hiện gợi ý bổ sung ảnh đại diện / CV / kinh nghiệm.
- **Ước tính thu nhập** — `estimatedIncome` cộng dồn mức lương của các đơn `ACCEPTED`/`COMPLETED`, hiển thị đơn vị "tr" (triệu đồng); số 0 → trạng thái nhấn mạnh "chưa có".
- **Widget gợi ý việc làm** — `useJobs` lọc theo `preferredCategoryIds` + `preferredProvinceIds` lấy từ `profile.jobPreferences`.
- **Card "Vòng đời đơn ứng tuyển"** — minh hoạ pipeline `PENDING → SHORTLISTED → ACCEPTED → COMPLETED` bằng component dùng chung `ApplicationTimeline`, highlight bước hiện tại theo đơn gần nhất. *(Hiển thị minh hoạ, không phải timeline thật của đơn.)*
- **Widget "Mẹo tìm việc"** — 3 gợi ý hành động cố định (ứng tuyển sớm, đính kèm CV + thư riêng, kiểm tra xếp hạng lương trước khi ứng tuyển).
- KPI tổng quan: đơn đang chờ / đã nhận / đã hoàn thành.

**Done khi:**
- ✅ Hồ sơ thiếu gì được chỉ ra (kèm nút dẫn tới trang hồ sơ để sửa).
- ✅ Thấy được ước tính thu nhập từ các đơn đã nhận.
- ✅ Tin gợi ý bám nhóm việc + tỉnh đã khai trong mục tiêu việc làm.

---

#### Feature 20: Dashboard nhà tuyển dụng — biểu đồ đăng tin theo tuần & tỷ lệ nhận
**Story:** Là nhà tuyển dụng, tôi muốn nhìn tổng quan hiệu quả tuyển dụng trong tuần, để điều chỉnh nhu cầu.

**Đã hiện thực (`app/src/pages/employer/index.tsx`):**
- **Biểu đồ cột 7 ngày** — `chart.buckets` đếm số tin đăng theo từng ngày trong tuần (`WEEK_LABELS`), scale theo giá trị max; dựng bằng CSS (không dùng thư viện chart), có `aria-label` cho từng cột.
- **Tỷ lệ được duyệt** — `acceptRate` = số đơn `ACCEPTED` / tổng số đơn, hiển thị dạng phần trăm.
- KPI: tin đang tuyển (`openJobs`), ứng viên chờ duyệt (`pendingApplicants`, highlight khi > 0), đã tuyển (`hired`).
- **Thẻ "Ứng viên mới cần xử lý"** — danh sách rút gọn ứng viên gần nhất (tên, tin đã ứng tuyển, thời gian, `StatusBadge`), click vào thẳng trang chi tiết hồ sơ; kèm nút "Xem tất cả" và empty-state riêng.
- **Badge trạng thái xác minh tổ chức** (`isVerified`) để NTD biết hồ sơ đã được xác minh hay chưa.

**Done khi:**
- ✅ NTD thấy được nhịp độ đăng tin trong tuần và tỷ lệ nhận ứng viên mà không cần vào từng trang.
- ✅ Ứng viên đang chờ có thể nhảy thẳng sang danh sách ứng viên.

---

#### Feature 21: Dashboard quản trị viên — phân bố vai trò & điều hướng nhanh
**Story:** Là quản trị viên, tôi muốn thấy cơ cấu người dùng và các điểm quản trị chính ngay trên trang đầu.

**Đã hiện thực (`app/src/pages/admin/index.tsx`):**
- **Thanh phân bố vai trò** — so sánh số lượng `STUDENT` / `EMPLOYER` / `ADMIN` (dữ liệu từ `GET /api/v1/admin/dashboard`).
- **Thẻ điều hướng nhanh** — các card trỏ tới quản lý tin đăng, người dùng, danh mục ngành nghề, kiểm duyệt đánh giá.
- KPI tổng quan hệ thống từ endpoint dashboard.

**Done khi:**
- ✅ Admin nắm được cơ cấu người dùng và điều hướng tới mọi khu vực quản trị trong 1–2 click.

---

#### Feature 22: Chi tiết tin tuyển dụng — chia sẻ, bản đồ, sao chép địa chỉ, hạn nộp, "Tuyển gấp"
**Story:** Là sinh viên, tôi muốn chia sẻ nhanh tin tuyển dụng và xem vị trí làm việc, để không bỏ lỡ cơ hội.

**Đã hiện thực (`app/src/pages/job-detail/index.tsx`):**
- **Chia sẻ** — `handleShare` dùng Web Share API nếu trình duyệt hỗ trợ, fallback copy link vào clipboard.
- **Mở Google Maps** — `buildMapUrl` dựng link tìm kiếm từ địa chỉ + quận + tỉnh.
- **Sao chép toàn bộ địa chỉ** — `handleCopyAddress` copy text địa chỉ đầy đủ vào clipboard.
- **Thông báo hạn ứng tuyển** — `Alert` hiển thị ngày hết hạn (`deadline`) định dạng `vi-VN`; hiện khi tin còn `deadline`. *(Không đếm ngược số ngày còn lại.)*
- **Badge "Tuyển gấp"** — hiện khi `job.isUrgent = true`.
- **Lượt xem** — hiển thị `job.viewCount` (backend tăng mỗi lần mở trang chi tiết).

**Done khi:**
- ✅ 1 chạm để chia sẻ tin (kể cả trên mobile không có Web Share API).
- ✅ Địa chỉ hiển thị đầy đủ + click để mở bản đồ.
- ✅ Người dùng thấy ngày hết hạn ứng tuyển và tin tuyển gấp.

---

#### Feature 23: Trang "Về chúng tôi" (/about) — cam kết an toàn 2 chiều & tiêu chuẩn VieJob Shield
**Story:** Là khách truy cập, tôi muốn hiểu nền tảng cam kết gì với sinh viên và nhà tuyển dụng trước khi đăng ký.

**Đã hiện thực (`app/src/pages/about/index.tsx`):**
- **6 tính năng nổi bật** giới thiệu ngắn (tìm việc đúng chuyên ngành, xếp hạng lương minh bạch, NTD được xác minh, lịch làm linh hoạt, đánh giá 2 chiều, ứng tuyển nhanh bằng hồ sơ).
- **Cam kết 2 chiều** — "Cam kết dành cho sinh viên" và "Cam kết dành cho nhà tuyển dụng".
- **4 tiêu chuẩn VieJob Shield** — Xác minh 2 chiều · Lương minh bạch · Đánh giá có kiểm chứng · Hỗ trợ khiếu nại.
- **3 testimonial** kèm số sao (rating 5/5/4), tên và vai trò.
- Điều hướng CTA sang đăng ký / tìm việc.

**Done khi:**
- ✅ Khách truy cập hiểu rõ tiêu chuẩn an toàn trước khi đăng ký.

---

#### Feature 24: Tài khoản demo 1 chạm & bộ khung component dùng chung
**Story:** Là người demo/giảng viên, tôi muốn đăng nhập nhanh vào 1 trong 3 vai trò, để trình bày mà không cần gõ tay.

**Đã hiện thực:**
- **Bấm 1 chạm điền sẵn tài khoản demo** — `DEMO_ACCOUNTS` hiển thị ngay trên form đăng nhập (click để điền email + mật khẩu: `student@viejob.vn` / `employer@viejob.vn` / `admin@viejob.vn`).
- **Bộ component dùng chung** — `components/shared/`: `application-timeline`, `confirm-dialog`, `date-picker` (react-day-picker), `empty-state`, `error-state`, `page-header`, `rating-stars`, `review-dialog`, `salary-benchmark-card`, `save-job-button`, `stat-card`, `status-badge`, `employer-avatar`, `theme-toggle`.
- **Bộ UI primitives (shadcn/Base UI)** — `accordion`, `alert`, `avatar`, `badge`, `calendar`, `card`, `checkbox`, `collapsible`, `combobox`, `dialog`, `dropdown-menu`, `empty`, `field`, `input`, `input-group`, `label`, `pagination`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toggle-group`, `tooltip`.
- **Interceptor refresh token** — axios interceptor tự refresh khi 401, xếp hàng request chờ, hết phiên → redirect `/login` mà không mất dữ liệu form.

**Done khi:**
- ✅ Click 1 chạm vào tài khoản demo → điền form → đăng nhập.
- ✅ Mọi trạng thái rỗng/lỗi đều có component chuẩn dùng chung, không render trang trắng.

---

#### Feature 25: Trang quản lý tin tuyển dụng — wizard 4 bước & kiểm tra trước khi đăng
**Story:** Là nhà tuyển dụng, tôi muốn điền tin tuyển dụng đầy đủ, rõ ca làm và mức lương, để sinh viên tin tưởng.

**Đã hiện thực (`app/src/pages/employer/job-form.tsx`):**
- **Wizard 4 bước** (`STEPS`): `basic` (Thông tin cơ bản) → `salary` (Lương & suất) → `location` (Địa điểm & ca) → `preview` (Xem trước). Bước đã hoàn thành hiện dấu tick.
- Trong mỗi bước, các nhóm thông tin con gồm: **mô tả & yêu cầu ứng tuyển**, **quyền lợi**, **kỹ năng** (chọn nhiều từ danh mục `skills`), **khoảng lương & suất tuyển**, **địa điểm** (tỉnh/quận/địa chỉ/chi nhánh), **lịch ca làm việc** (lưu `job_post_schedules`), **hạn nộp** (`DatePicker`).
- **Tính tổng giờ/tuần** từ lịch ca (`totalWeeklyHours`) hiển thị ngay để NTD kiểm tra tính hợp lệ.
- **Danh sách kiểm tra trước khi đăng** — chỉ ra các mục còn thiếu (tiêu đề, mô tả, yêu cầu, địa chỉ, lương, ca làm…) bằng `FieldLegend`.
- **Bước "Xem trước"** — card "Tóm tắt tin đăng" hiển thị nhóm việc, vị trí, loại hình, hình thức, lương, địa điểm, ca làm, kỹ năng, hạn nộp trước khi submit.
- Hỗ trợ cả tạo mới và sửa tin (nạp lại đầy đủ dữ liệu cũ: mô tả, yêu cầu, quyền lợi, kỹ năng, lịch ca, hạn nộp).

**Done khi:**
- ✅ NTD thấy ngay mình còn thiếu thông tin gì trước khi submit.
- ✅ Sửa tin nạp lại đúng dữ liệu cũ (mô tả, yêu cầu, quyền lợi, kỹ năng, lịch ca).

---

### ⚠️ Khoảng trống đã biết (ghi nhận ở đợt rà soát 11/2026)

> Những điểm PRD cũ mô tả là "đã xong" nhưng code **chưa** làm đủ. Đã sửa ở từng feature ở trên; danh sách tổng hợp:

| # | Khoảng trống | Backend | Frontend | Mức độ |
|---|---|---|---|---|
| 1 | Đăng nhập/đăng ký bằng Google 1-click | ✅ `POST /auth/google` + `GoogleTokenVerifierService` | ❌ nút chỉ hiện toast, chưa nối Google Identity Services | Cần Client ID + script GIS |
| 2 | Màn hình quản lý danh sách bật/tắt thông báo theo ngành/tỉnh | ✅ `GET/POST/DELETE /student/job-notifications` | ❌ chỉ có nút toggle nhúng ở trang chi tiết tin | Thiếu 1 màn hình `/student/job-notifications` |
| 3 | Hiển thị `avgRating` / `ratingCount` trên hồ sơ sinh viên | ✅ có trong DTO | ❌ UI không render | Thiếu 1 block UI |
| 4 | Hiển thị "lần đăng nhập cuối" trong bảng quản lý user | ✅ có `lastLoginAt` trong DTO | ❌ bảng chỉ render `joinedAt` | Thiếu 1 cột |
| 5 | Tham số `salaryUnit` của `GET /jobs/public` | ❌ controller không khai báo (Spring bỏ qua param lạ) | ⚠️ FE gửi kèm nhưng không cần | Vô hại — quy ước đã chuẩn hoá đ/giờ |
| 6 | `GET /api/v1/employer/reviews` | ✅ có endpoint | ⚠️ FE gọi `GET /reviews?targetType=EMPLOYER` rồi lọc client-side theo `targetUserId` | Nên dùng endpoint riêng |
| 7 | Link "Quên mật khẩu?" ở form đăng nhập | ❌ chưa có luồng reset mật khẩu | ❌ `<a href="#">` — liên kết chết | Ngoài phạm vi hiện tại |
| 8 | Link xác thực email không mang `email` → form gửi lại email thiếu tham số | ✅ có `resend-verification` | ⚠️ màn hình `/verify-email` cần email để gửi lại | Cần truyền `email` qua query |
| 9 | Điều phối `salary-benchmarks` theo tỉnh khi lọc | ⚠️ BE trả toàn bộ benchmark về FE | ⚠️ FE tự fallback về `hcm` | Chấp nhận được |

---

### 🟠 NICE TO HAVE (sau này thêm)

- [ ] **Chat real-time** giữa SV và NTD (ngoài phạm vi đề tài — đã ghi trong `de-tai.txt`).
- [ ] **Thanh toán / giao dịch tiền thật** qua cổng thanh toán (ngoài phạm vi đề tài).
- [ ] **App mobile native** (đề tài ưu tiên web responsive).
- [ ] **Lịch phỏng vấn** — đặt lịch, nhắc lịch, đồng bộ Google Calendar.
- [ ] **Báo cáo/báo cáo lừa đảo** — nút "Báo cáo tin tuyển dụng lừa đảo" (UI đã hứa trong cam kết an toàn ở trang chủ, backend chưa có).
- [ ] **Push notification qua email/SMS/Zalo** cho cập nhật đơn.
- [ ] **Kiểm duyệt nội dung bằng AI** cho tin đăng và đánh giá.
- [ ] **Trang quản lý đơn hàng theo dự án** (nhiều tin cùng lúc) + Kanban pipeline.
- [ ] **Chương trình giới thiệu / referral** cho sinh viên.
- [ ] **Xếp hạng uy tín nâng cao** — phân hạng theo số đơn hoàn thành, tỷ lệ phản hồi.
- [~] **Gợi ý việc làm** dựa trên hồ sơ + mục tiêu việc làm — **đã có bản đơn giản**: dashboard sinh viên lọc `useJobs` theo `categoryIds` + `provinceIds` từ `jobPreferences` (Feature 19). Còn thiếu: engine xếp hạng/ranking, lọc theo kỹ năng, lịch học.
- [ ] **Công cụ soạn tin tuyển dụng** — template mô tả, kiểm tra chính tả.

---

## ③.5 Quy tắc nghiệp vụ (Business Rules)

> Nguồn: trích từ tầng `backend/src/main/java/com/uniwork/service/**` (+ `repository/specification`, `util`, `config`) và `app/src/features/jobs/lib/salary.ts`.
> Mỗi quy tắc ghi rõ **nơi thực thi** và **hệ quả** để dùng làm checklist khi sửa code.
>
> Ký hiệu nguồn: `AuthServiceImpl` · `JobServiceImpl` · `ApplicationServiceImpl` · `ReviewServiceImpl` · `AdminServiceImpl` · `ProfileServiceImpl` · `SavedJobServiceImpl` · `JobNotifyServiceImpl` · `NotificationServiceImpl` · `FileStorageServiceImpl` · `MailServiceImpl` · `MasterDataServiceImpl` · `WsTicketService` · `JobPostSpecification` · `ApiErrors` · `DateTimeUtils` · `SecurityConfig` · `JwtAuthenticationFilter` · `salary.ts`

---

### BR-01 — Định danh & public ID

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-01.1 | Mọi đối tượng nghiệp vụ dùng **public ID dạng slug chuỗi**, không phải số tự tăng: tin = `job-<uuid12>`, đơn = `app-<uuid12>`, đánh giá = `rev-<uuid12>`, file = `file-<uuid16>`, thông báo = `ntf-<uuid12>`, nhóm việc = `cat-<slug>`, lưu = `saved-<uuid12>`, pref thông báo = `jnp-<id>`. | `JobServiceImpl.generateSlug`, `ApplicationServiceImpl`, `ReviewServiceImpl`, `FileStorageServiceImpl`, `NotificationServiceImpl` |
| BR-01.2 | Frontend **không cần bảng mapping id** — dùng thẳng slug (`hcm`, `cat-fnb`, `emp-viejob-demo`) làm khóa ngoại logic. | Toàn hệ thống |
| BR-01.3 | `NotificationServiceImpl.resolveId()` chấp nhận **cả slug lẫn id số**: tra slug trước, không có mới thử `Long.parseLong`; sai định dạng → 404. | `NotificationServiceImpl` |

---

### BR-02 — Xác thực & vòng đời tài khoản

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-02.1 | Email chuẩn hoá `trim().toLowerCase()` **trước mọi phép so sánh/truy vấn**. | `AuthServiceImpl` (register / login / resend / google) |
| BR-02.2 | **Không bao giờ** tạo tài khoản có vai trò `ADMIN` — chặn cả đăng ký local (`INVALID_ROLE`) lẫn Google (`INVALID_ROLE`). | `AuthServiceImpl` 1.2, 5.3 |
| BR-02.3 | Đăng ký tạo user ở trạng thái `PENDING_VERIFY` **và** tạo profile tương ứng (`student_profiles` / `employer_profiles`) **trong cùng transaction**. | `AuthServiceImpl` 1.5–1.6 |
| BR-02.4 | Token xác thực = 32 byte `SecureRandom` → Base64url không padding; DB chỉ lưu **SHA-256 hex**, hạn **24h**, dùng 1 lần (`usedAt`). | `AuthServiceImpl` 1.7–1.8, `sha256Hex` |
| BR-02.5 | Gửi lại email xác thực: rate limit **60s/email** (map in-memory `ConcurrentHashMap`) → 429 `TOO_MANY_REQUESTS`; **vô hiệu hoá toàn bộ token cũ chưa dùng** trước khi tạo token mới. | `AuthServiceImpl` 3.1–3.2 |
| BR-02.6 | `resend-verification` với email không tồn tại **không lộ thông tin** — trả về thành công im lặng (`ifPresent`). | `AuthServiceImpl` 3.2 |
| BR-02.7 | **Thứ tự kiểm tra khi đăng nhập**: (1) tìm user → (2) kiểm tra **mật khẩu trước** → (3) mới xét `LOCKED` / `PENDING_VERIFY` / `DELETED`. Sai mật khẩu tăng `failedLoginCount`; đúng mật khẩu thì reset về 0 và ghi `lastLoginAt`. | `AuthServiceImpl` 4.1–4.3 |
| BR-02.8 | Sai mật khẩu **và** email không tồn tại trả **cùng một thông điệp** `INVALID_CREDENTIALS` — không tiết lộ sai trường nào. | `AuthServiceImpl` 4.1, 4.2 |
| BR-02.9 | Đăng nhập Google: email đã có → nếu `LOCKED` thì từ chối; nếu `PENDING_VERIFY` → **kích hoạt luôn** (Google đã xác minh email); ghi `googleSub` nếu chưa có. | `AuthServiceImpl` 5.2 |
| BR-02.10 | Google tạo tài khoản mới: chưa có `role` → trả `needsRole=true` để client hỏi; có `role` → tạo user `ACTIVE`, `authProvider=GOOGLE`, mật khẩu = **UUID ngẫu nhiên không ai biết**; tài khoản NTD Google mặc định `employerType=INDIVIDUAL`. | `AuthServiceImpl` 5.3 |
| BR-02.11 | Google login **không cấp refresh token** (chỉ `accessToken`); client dùng luồng refresh chuẩn sau đó. | `AuthServiceImpl` 5.2–5.3 |
| BR-02.12 | Refresh token: lưu SHA-256, hạn **30 ngày**, **rotate** mỗi lần dùng (thu hồi token cũ, cấp token mới). Token đã thu hồi / hết hạn / user `LOCKED`|`DELETED` → 401 `INVALID_REFRESH_TOKEN`. | `AuthServiceImpl` 7, `issueRefreshToken` |
| BR-02.13 | JWT HS256, **subject = email**, claims `{ userId, role }`, hạn **24h** (`app.jwt.expiration-ms`). | `JwtService` |
| BR-02.14 | Lỗi SMTP khi gửi mail xác thực → chỉ `log.error`, **không** rollback tài khoản đã tạo. | `MailServiceImpl` |
| BR-02.15 | Gửi mail chạy `@Async("mailTaskExecutor")` — không chặn transaction đăng ký. | `MailServiceImpl` |
| BR-02.16 | HTML email **escape** toàn bộ giá trị chèn vào (`&`, `<`, `>`, `"`). | `MailServiceImpl.escapeHtml` |
| BR-02.17 | Tài khoản demo seed có `password_hash = 'SEED_PENDING'` → `DemoAccountInitializer` băm BCrypt + set `ACTIVE` + set `emailVerifiedAt` lúc app khởi động. | `DemoAccountInitializer` |

---

### BR-03 — Phân quyền & bảo mật

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-03.1 | Session **stateless** (không cookie, không CSRF). | `SecurityConfig` |
| BR-03.2 | RBAC 3 lớp: Spring Security `hasRole` (API) → `RequireRole` (route FE) → kiểm tra **sở hữu ở tầng service** (`application.getStudent().getUserId().equals(...)` → 403). | `SecurityConfig` · `router.tsx` · các `*ServiceImpl` |
| BR-03.3 | Endpoint public: `GET /jobs/public/**`, `GET /public/**`, `GET /files/**` (avatar/logo), `GET /auth/**` trừ `/me`, `POST /ws/ticket` (cần Bearer), `/ws/**` (permitAll — xác thực ở handshake), Swagger. | `SecurityConfig` |
| BR-03.4 | `/api/v1/files/**` GET là `permitAll` — quyền xem CV kiểm tra **trong service**, không ở tầng Security. | `SecurityConfig` 4b · `FileStorageServiceImpl.canRead` |
| BR-03.5 | Filter JWT: token sai format → **bỏ qua** (tiếp tục chain), không ném exception; chỉ xác thực khi `SecurityContext` còn trống. | `JwtAuthenticationFilter` |
| BR-03.6 | Header demo `admin@viejob.vn` / `admin-password` chỉ dùng cho môi trường demo; **không hardcode** email/mật khẩu admin trong mã nguồn (biến `ADMIN_INITIAL_EMAIL`/`ADMIN_INITIAL_PASSWORD`). | `DataInitializer` |
| BR-03.7 | CORS: origin lấy từ `app.cors.allowed-origins` (csv); method `GET,POST,PUT,PATCH,DELETE,OPTIONS`; header `*`; `allowCredentials=true`. | `SecurityConfig` |

---

### BR-04 — Tin tuyển dụng

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-04.1 | **Tin mới luôn `PENDING_REVIEW`** — không hiển thị công khai trước khi Admin duyệt. | `JobServiceImpl.create` |
| BR-04.2 | Sửa tin đang `OPEN` → **tự quay lại `PENDING_REVIEW`**, giữ nguyên `publishedAt`; báo lại cho toàn bộ Admin. | `JobServiceImpl.update` |
| BR-04.3 | Xoá tin = **soft-delete**: set `status=CANCELLED` + `closedAt` + `deletedAt`; ứng viên đã ứng tuyển vẫn xem lại được hồ sơ. | `JobServiceImpl.remove` |
| BR-04.4 | NTD sửa/xoá tin **không thuộc mình** → **404** (không phải 403) — không tiết lộ tin tồn tại. | `JobServiceImpl.update/remove` |
| BR-04.5 | Validate khi tạo: `title` bắt buộc, `category` bắt buộc + phải tồn tại, `salaryMin ≥ 0`. Sửa tin chỉ validate `title` ( các trường khác để nguyên nếu không truyền). | `JobServiceImpl.validate` |
| BR-04.6 | Giá trị mặc định khi thiếu: `workMode=ONSITE`, `employmentType=PART_TIME`, `salaryType=HOURLY`, `positionsCount=1`, `positionsFilled=0`, `applicantCount=0`, `viewCount=0`, `isUrgent=false`. | `JobServiceImpl.create` + `defaultStr` |
| BR-04.7 | `position` **không bắt buộc** — nếu tham chiếu không tồn tại thì để `null` (không lỗi); `category` sai thì **lỗi 400**. | `resolvePosition` vs `resolveCategory` |
| BR-04.8 | `provinceId`/`districtId` không tồn tại → để `null` (không lỗi); địa chỉ/chi nhánh lưu thẳng dạng text. | `JobServiceImpl.applyLocation` |
| BR-04.9 | Lịch ca và kỹ năng: **thay thế toàn bộ** (delete rồi insert), không merge; dòng thiếu `dayOfWeek` / giờ không hợp lệ / skill không tồn tại → **bỏ qua im lặng**. | `replaceSchedules` · `replaceSkills` |
| BR-04.10 | Lọc tin công khai (`JobPostSpecification.filter`): luôn `deletedAt IS NULL`; nếu `status` rỗng/`ALL` **và** không lọc theo NTD → chỉ lấy `status = OPEN`; nếu có `employerUserId` (NTD xem tin của mình) → không ép `OPEN`. | `JobPostSpecification` 1–2 |
| BR-04.11 | Tin có `applicationDeadline` **đã qua** → tự động **không xuất hiện** trong danh sách công khai (điều kiện `deadline >= now()` áp cho mọi lọc). | `JobPostSpecification` 3 |
| BR-04.12 | Lọc lương so sánh trên cột generated `salary_min_hourly` / `salary_max_hourly` (đồng/giờ). Tin `NEGOTIABLE` **luôn lọc qua** mọi khoảng lương. | `JobPostSpecification` 11 · `V2__marketplace_schema.sql` |
| BR-04.13 | `salaryMin` lọc theo `salary_max_hourly >= salaryMin`; `salaryMax` lọc theo `salary_min_hourly <= salaryMax` — tức so khớp theo **khoảng bao phủ**, không phải điểm tuyến tính. | `JobPostSpecification` 11 |
| BR-04.14 | Từ khoá (`keyword`) tìm trong **tiêu đề + mô tả + tên nhóm việc + tên vị trí**, không phân biệt hoa thường (`lower` + `like %kw%`). | `JobPostSpecification` 12 |
| BR-04.15 | `page` ≥ 1, `pageSize` giới hạn **1–100**, mặc định 10; `totalPages` tối thiểu 1. | `JobServiceImpl.list` |
| BR-04.16 | Sort: `newest` (mặc định) = `publishedAt DESC` · `salary_desc` = `salaryMinHourly DESC` · `salary_asc` = ASC · `popular` = `viewCount DESC`. | `JobServiceImpl.toSort` |
| BR-04.17 | Mở chi tiết tin → **tăng `viewCount` 1** (ghi trong cùng transaction). | `JobServiceImpl.detail` |
| BR-04.18 | Tin liên quan: chỉ lấy tin `OPEN`, loại trừ chính nó, **ưu tiên cùng nhóm việc** rồi `publishedAt` mới nhất; `limit` mặc định 6, tối đa 20. | `JobServiceImpl.related` |
| BR-04.19 | `positionsFilled` khi sửa tin **không được vượt quá** `positionsCount` (clamp bằng `Math.min`). | `JobServiceImpl.update` |
| BR-04.20 | Admin duyệt (`APPROVE`) → `status=OPEN`, set `reviewedAt`, set `publishedAt` **nếu chưa có**, xoá `rejectReason`. Từ chối (`REJECT`) → `status=REJECTED`, set `reviewedAt` + `rejectReason` (mặc định "Tin không đáp ứng yêu cầu."). Action khác → 400. | `JobServiceImpl.review` |

---

### BR-05 — Quy đổi & xếp hạng lương

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-05.1 | Hệ số quy đổi **giờ = 1, ngày = 8, tuần = 40, tháng = 160, tác vụ = 3, thỏa thuận = 0** — giống hệt ở FE (`salary.ts`), BE (`JobServiceImpl.HOURS_PER_UNIT`) và DB (cột generated). Ba nơi phải luôn khớp. | `salary.ts` · `JobServiceImpl` · `V2__marketplace_schema.sql` |
| BR-05.2 | `salaryMax` = null → DB lấy `salaryMin` làm trần; FE cũng phải hiển thị khoảng lương khi chỉ có mức tối thiểu. | `V2__marketplace_schema.sql` |
| BR-05.3 | Xếp hạng lương **chỉ tính khi** có benchmark khớp ngành×tỉnh, `salaryType ≠ NEGOTIABLE` và `hourly > 0`; không có → **ẩn badge**, không hiển thị sai. | `salary.ts.compareSalary` |
| BR-05.4 | Percentile = vị trí của mức lương trong dải `[minHourly, maxHourly]`, làm tròn %, tối thiểu 1. | `salary.ts.compareSalary` |
| BR-05.5 | Verdict: `ABOVE` nếu `diff > 5%` avg, `BELOW` nếu `diff < -5%` avg, còn lại `AVERAGE` — ngưỡng 5% để không báo sai cho chênh lệch nhỏ. | `salary.ts.compareSalary` |
| BR-05.6 | Benchmark fallback: ưu tiên khớp (ngành, tỉnh) → nếu không có thì **tỉnh mặc định `hcm`** cùng ngành → không có thì không hiển thị. | `salary.ts.findBenchmarkFor` |
| BR-05.7 | `salary_benchmarks` có UNIQUE `(category_id, province_id)` — mỗi cặp ngành×tỉnh chỉ 1 dòng benchmark. | `V2__marketplace_schema.sql` |

---

### BR-06 — Đơn ứng tuyển

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-06.1 | Chỉ ứng tuyển được tin có `status = OPEN`; sai → 400 "Tin tuyển dụng này đã ngừng nhận ứng tuyển." | `ApplicationServiceImpl.create` |
| BR-06.2 | **Chặn ứng tuyển trùng**: unique constraint DB `uq_application_once (job_post_id, student_id)` + kiểm tra service `existsByJobPostIdAndStudentUserId` → 400 "Bạn đã ứng tuyển vào tin tuyển dụng này rồi." | `ApplicationServiceImpl.create` · `V1__init_schema.sql` |
| BR-06.3 | Không truyền `cvUrl` → **tự động lấy CV trong hồ sơ sinh viên** (`profile.getCvUrl()`). | `ApplicationServiceImpl.create` |
| BR-06.4 | Đơn mới luôn `status=PENDING` và **ghi 1 dòng lịch sử** `null → PENDING` (fromStatus = null) để dựng timeline từ đầu. | `ApplicationServiceImpl.create` |
| BR-06.5 | Ứng tuyển → **tăng `applicantCount`** của tin; rút đơn → **giảm 1**, clamp về 0 (`Math.max(0, …)`). | `create` / `withdraw` |
| BR-06.6 | Rút đơn chỉ được khi đang `PENDING`; đã xử lý → 400 "Đơn ứng tuyển đã được xử lý, không thể rút. Vui lòng liên hệ nhà tuyển dụng." | `ApplicationServiceImpl.withdraw` |
| BR-06.7 | Xem đơn của người khác → **403** (đã đăng nhập nhưng không phải chủ sở hữu). | `detailForStudent` · `detailForEmployer` |
| BR-06.8 | Pipeline trạng thái hợp lệ: `PENDING → SHORTLISTED → ACCEPTED → COMPLETED`, cộng `REJECTED` và `WITHDRAWN`. Trạng thái ngoài danh sách → 400 với field `status`. | `VALID_STATUSES` |
| BR-06.9 | **Đồng bộ suất tuyển tự động** mỗi lần NTD đổi trạng thái: đếm đơn `ACCEPTED` → `positionsFilled = min(accepted, positionsCount)`; đủ suất → tin `FILLED`; còn suất nhưng đã có người nhận → tin `IN_PROGRESS`. | `syncJobPositions` |
| BR-06.10 | Mỗi lần đổi trạng thái → ghi `application_status_history` (`fromStatus`, `toStatus`, `changedBy`, `note`, `changedAt`) → dựng timeline. | `pushStatus` |
| BR-06.11 | Ghi chú mặc định theo trạng thái khi NTD không truyền `note`: SHORTLISTED → "Được duyệt sơ bộ", ACCEPTED → "Đã nhận ứng viên", COMPLETED → "Công việc đã hoàn thành", REJECTED → "Không phù hợp". | `DEFAULT_NOTES` |
| BR-06.12 | Mốc thời gian: `reviewedAt` set lần đầu NTD chủ động xử lý hồ sơ (`SHORTLISTED`/`REJECTED`); `decidedAt` set khi sang `ACCEPTED`/`REJECTED`/`COMPLETED`/`WITHDRAWN`. | `pushStatus` |
| BR-06.13 | Khi chuyển `REJECTED` kèm note → note được ghi vào **cả** `employerNote` lẫn `rejectReason`. | `pushStatus` |
| BR-06.14 | Ghi chú của NTD về đơn **≤ 500 ký tự**; trim; chuỗi rỗng → lưu `null`. | `ApplicationServiceImpl.updateNote` |
| BR-06.15 | Danh sách đơn của NTD: lọc theo tin (`jobId`) **hoặc** trạng thái (`status`); `status` rỗng/`ALL` → không lọc; tất cả sắp xếp `appliedAt DESC`. | `listByEmployer` |
| BR-06.16 | Danh sách đơn của SV: `status` rỗng/`ALL` → không lọc; sắp xếp `appliedAt DESC`. | `listByStudent` |
| BR-06.17 | ⚠️ **Chưa thống nhất:** `employerNote` được trả về cho **cả hai bên** (`ApplicationResponse` không phân nhánh theo vai trò) và trang chi tiết đơn của **sinh viên** đang **render** nó ("Ghi chú từ nhà tuyển dụng"), trong khi UI ghi chú gọi nhãn "Ghi chú nội bộ — riêng giữa bạn và đội ngũ tuyển dụng". | `ApplicationServiceImpl.toResponse` · `pages/student/application-detail.tsx` |

> ⚠️ **Cần chốt hướng xử lý cho BR-06.17:** PRD cũ mô tả `PATCH /employer/applications/{id}/note` là *"chỉ NTD thấy, không gửi cho sinh viên"* nhưng code đang hiển thị cho cả hai bên. Chọn 1 trong 2: **(a)** tách 2 trường riêng (`employerNote` nội bộ vs `studentNote` thông báo cho SV) — khớp nguyên tắc "ghi chú nội bộ"; hoặc **(b)** sửa PRD + đổi nhãn UI thành "Ghi chú từ nhà tuyển dụng" và bỏ chữ "nội bộ".

---

### BR-07 — Đánh giá 2 chiều

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-07.1 | Chỉ đánh giá được khi đơn `status = COMPLETED`; sai → 400 "Chỉ được đánh giá sau khi công việc đã hoàn thành." | `ReviewServiceImpl.create` |
| BR-07.2 | **Mỗi người 1 đánh giá / 1 đơn**: unique DB `uq_review_once (application_id, reviewer_id)` + check service → 400 "Bạn đã đánh giá công việc này rồi." | `ReviewServiceImpl.create` · `V1__init_schema.sql` |
| BR-07.3 | Điểm phải trong **1–5**; `comment` không được rỗng; `applicationId` bắt buộc — mỗi lỗi gắn đúng field. | `ReviewServiceImpl.create` |
| BR-07.4 | Chiều đánh giá tự động theo vai trò: SV → đánh giá NTD (`targetType=EMPLOYER`); NTD → đánh giá SV (`targetType=STUDENT`). Không cần client truyền `targetType`. | `ReviewServiceImpl.create` |
| BR-07.5 | `avgRating` / `ratingCount` **tính lại ở tầng service** (không dùng trigger CSDL): trung bình làm tròn **1 chữ số** (`HALF_UP`), chỉ tính đánh giá **chưa ẩn**. | `recalculateRating` · `ReviewRepository.averageRatingFor` |
| BR-07.6 | Tính lại rating cho **cả** `student_profiles` và `employer_profiles` (dùng `findById` cả 2 → cập nhật cái nào tồn tại). | `recalculateRating` |
| BR-07.7 | Admin ẩn/hiện đánh giá → **tính lại** `avgRating`/`ratingCount` của người bị đánh giá (điểm trung bình không còn tính đánh giá ẩn). | `ReviewServiceImpl.setHidden` |
| BR-07.8 | NTD trả lời đánh giá: chỉ **reviewee** được trả lời (403 nếu khác); reply rỗng → lưu `null`. | `ReviewServiceImpl.reply` |
| BR-07.9 | Danh sách đánh giá công khai: `hideHidden=true` → chỉ lấy đánh giá **chưa ẩn**; trang hồ sơ NTD công khai luôn lấy bản đã loại ẩn. | `ReviewServiceImpl.list` · `ProfileServiceImpl.getPublicEmployerProfile` |

---

### BR-08 — Hồ sơ

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-08.1 | Cập nhật hồ sơ theo kiểu **partial update**: chỉ set field được truyền khác `null`; `fullName`/`displayName` trim; chuỗi rỗng không ghi đè (trừ khi chủ động truyền). | `ProfileServiceImpl` |
| BR-08.2 | `experiences[]` — **thay thế toàn bộ** danh sách (delete + insert), tự gán `sortOrder` tăng dần; dòng thiếu `company` → bỏ qua. | `ProfileServiceImpl.updateStudentProfile` |
| BR-08.3 | `jobPreferences` — **upsert 1 dòng duy nhất** cho mỗi sinh viên (`student_job_preferences`), các trường con cũng partial update. | `ProfileServiceImpl` |
| BR-08.4 | `jobPreferences` **chưa có** → trả mặc định: `categoryIds=[]`, `employmentTypes=["PART_TIME"]`, `salaryMin=0`, `salaryMax=0`, `provinceIds=[]`. | `toStudentResponse` |
| BR-08.5 | `provinceId` trong request là **public id** (`"hcm"`) → service chuyển sang mã số nội bộ; response chuyển ngược lại public id. | `resolveProvinceId` / `resolveProvinceCode` |
| BR-08.6 | Tỉnh không tồn tại → `provinceId = null` (không lỗi). | `resolveProvinceId` |
| BR-08.7 | Hồ sơ NTD công khai trả **1 response** gồm: profile + tin đang tuyển (`OPEN`) + đánh giá công khai (đã loại ẩn). | `ProfileServiceImpl.getPublicEmployerProfile` |

---

### BR-09 — Tin đã lưu & thông báo theo dõi

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-09.1 | Lưu tin là **idempotent**: đã lưu rồi → trả về bản ghi cũ, không tạo trùng; unique DB `uq_saved_jobs_student_job`. | `SavedJobServiceImpl.save` |
| BR-09.2 | Bỏ lưu tin không tồn tại → **không lỗi** (idempotent). | `SavedJobServiceImpl.remove` |
| BR-09.3 | `GET /saved-jobs/ids` trả **mảng slug id** (nhẹ) để client đồng bộ trạng thái nút bookmark ở mọi JobCard. | `SavedJobServiceImpl.listIds` |
| BR-09.4 | Bật thông báo theo dõi: khớp theo cặp `categoryCode` + `provinceCode`; `provinceCode` rỗng / `ALL` / `*` → chuẩn hoá thành sentinel `ALL` (mọi tỉnh). | `JobNotifyServiceImpl.normalizeProvinceCode` |
| BR-09.5 | Bật thông báo: `categoryCode` bắt buộc + phải tồn tại; `provinceCode` phải tồn tại (trừ `ALL`) — sai → 400 với field tương ứng. | `JobNotifyServiceImpl.subscribe` |
| BR-09.6 | Bật lại cùng cặp → **upsert** (không tạo trùng); unique DB `uq_job_notify_pref (user_id, category_code, province_code)`. | `JobNotifyServiceImpl.subscribe` |
| BR-09.7 | Khi Admin **duyệt** tin → khớp subscriber theo `categoryCode` của tin **và** `provinceCode ∈ {ALL, tỉnh của tin}` → đẩy thông báo loại `JOB` kèm link `/jobs/{slug}`. | `JobNotifyServiceImpl.notifySubscribers` |
| BR-09.8 | Lỗi đẩy thông báo cho **1 người** được catch riêng → không làm hỏng luồng duyệt tin. | `JobNotifyServiceImpl.notifySubscribers` |
| BR-09.9 | Response luôn kèm `categoryName` / `provinceName` (resolve từ master data; `ALL` → "Tất cả tỉnh"; không tìm thấy → fallback code). | `JobNotifyServiceImpl.toResponse` |

---

### BR-10 — Thông báo & realtime

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-10.1 | Bảng `notifications` là **nguồn sự thật**; WebSocket chỉ đẩy tín hiệu nhẹ `{ id, type, title, body, link, unreadCount }`. | `NotificationServiceImpl` |
| BR-10.2 | Push realtime đăng ký `afterCommit` → **transaction rollback không sinh thông báo ma**. Ngoài transaction → đẩy luôn. | `publishAfterCommit` |
| BR-10.3 | `unreadCount` **cố ý để null trước commit**, điền sau commit → luôn khớp REST (tránh sai số khi nhiều thông báo ghi chung 1 transaction). | `publishAfterCommit` |
| BR-10.4 | Lỗi realtime chỉ `log.warn` — **không** làm hỏng nghiệp vụ chính. | `safePublish` |
| BR-10.5 | `push` với `userId = null` hoặc user không tồn tại → **bỏ qua im lặng**. | `NotificationServiceImpl.push` |
| BR-10.6 | Đánh dấu đã đọc: chỉ đọc được **thông báo của chính mình** (`findByIdAndUserId`); đọc lần 2 không ghi đè `readAt`. | `markRead` |
| BR-10.7 | "Đọc tất cả" trả về **số lượng** vừa đánh dấu. | `markAllRead` |
| BR-10.8 | **Vé WebSocket dùng 1 lần, hạn 60s**, lưu trong RAM (`ConcurrentHashMap`) — không cần migration/bảng. `consume()` **xoá vé khỏi map** ngay khi dùng. | `WsTicketService` |
| BR-10.9 | Vé sinh bằng 32 byte `SecureRandom` → Base64url; `purgeExpired()` dọn vé hết hạn mỗi lần cấp vé (map không phình vô hạn). | `WsTicketService` |
| BR-10.10 | Handshake WS: vé sai/hết hạn → **HTTP 403** từ `TicketHandshakeInterceptor`; hợp lệ → set `userId` vào attributes của session. | `WebSocketConfig.TicketHandshakeInterceptor` |
| BR-10.11 | 5 loại thông báo: `APPLICATION`, `APPLICATION_STATUS`, `JOB`, `REVIEW`, `SYSTEM`. | `notifications.type` |

---

### BR-11 — Upload & quyền đọc file

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-11.1 | 3 loại file: `CV` (PDF/DOC/DOCX ≤ 5MB) · `AVATAR` (PNG/JPG/WEBP ≤ 2MB) · `LOGO` (PNG/JPG/WEBP ≤ 2MB). | `FileStorageService.Kind` |
| BR-11.2 | File rỗng (0 byte) → 400 "Vui lòng chọn file cần tải lên." | `FileStorageServiceImpl.store` |
| BR-11.3 | Xác định MIME: ưu tiên header của client (bỏ `;charset=…`), nhưng **phải nằm trong whitelist**; header rỗng hoặc `application/octet-stream` → **suy luận từ extension**. | `resolveMimeType` |
| BR-11.4 | MIME sai → 400 nêu rõ danh sách định dạng chấp nhận được; quá giới hạn dung lượng → 400 nêu rõ giới hạn + dung lượng file hiện tại. | `validateMimeType` · `validateSize` |
| BR-11.5 | Tên file lưu **random**: `<kind>-<uuid-hex><ext>` trong thư mục con `<root>/<kind>/` → tránh va chạm tên, giữ extension gốc để trình duyệt xử lý đúng. | `FileStorageServiceImpl.store` |
| BR-11.6 | **Chặn path traversal** 2 lớp: `sanitizeName()` bỏ mọi ký tự `/` `\` + giới hạn 200 ký tự; sau `normalize()` kiểm tra `target.startsWith(root)` (áp dụng cả khi ghi lẫn khi đọc). | `sanitizeName` · `store` · `resolvePath` |
| BR-11.7 | Extension giữ lại chỉ khi khớp `[a-z0-9]{1,10}` — còn lại → extension rỗng. | `extractExtension` |
| BR-11.8 | **Quyền đọc**: `AVATAR`/`LOGO` **công khai**; `CV` là tài liệu riêng tư → chỉ **chủ sở hữu**, **Admin**, hoặc **NTD đã nhận đơn ứng tuyển** từ sinh viên đó (`existsByJobPostEmployerUserIdAndStudentUserId`). Không đăng nhập → 403. | `FileStorageServiceImpl.canRead` |
| BR-11.9 | Xoá file = **soft-delete** (`deletedAt`), **chỉ chủ sở hữu**; người khác → 403. | `FileStorageServiceImpl.remove` |
| BR-11.10 | URL trả về là **đường dẫn tuyệt đối**: `{app.public-base-url}{app.storage.public-path}/{slug}`. | `toResponse` |

---

### BR-12 — Quản trị viên

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-12.1 | Khoá tài khoản → `status=LOCKED` + `lockedUntil = now + 100 năm`; mở khoá → `status=ACTIVE` + `lockedUntil=null`. | `AdminServiceImpl.updateUser` |
| BR-12.2 | Đổi vai trò → role phải tồn tại trong `roles`, sai → 400 field `role`; có hiệu lực ngay (RBAC đọc từ DB mỗi request). | `AdminServiceImpl.updateUser` |
| BR-12.3 | Danh sách user lọc theo `role` (rỗng/`ALL` → tất cả) và `keyword` (khớp **tên + email**, không phân biệt hoa thường). | `AdminServiceImpl.listUsers` |
| BR-12.4 | Mỗi user hiển thị: `totalJobs` (chỉ NTD) hoặc `totalApplications` (chỉ SV) — con số kia = 0. | `toAdminUser` |
| BR-12.5 | Tạo nhóm việc: `name` bắt buộc; `slug` tuỳ chọn → tự sinh bằng `slugify` (**bỏ dấu tiếng Việt**, `đ`→`d`, khoảng trắng→`-`); slug trùng → 400 field `slug`. | `AdminServiceImpl.createCategory` |
| BR-12.6 | `code` (public id) của nhóm việc = `cat-<slug>`; nếu trùng → thêm hậu tố `-1`, `-2`… (tối đa 24 ký tự gốc). | `generateCategoryCode` |
| BR-12.7 | Mặc định nhóm việc: `icon="Briefcase"`, `sortOrder = count + 1`, `isActive=true`. | `AdminServiceImpl.createCategory` |
| BR-12.8 | **Xoá nhóm việc đang có tin dùng → khoá mềm** (`isActive=false`), không xoá cứng; chưa dùng thì xoá thật. | `AdminServiceImpl.removeCategory` |
| BR-12.9 | Sửa nhóm việc tìm theo `code` **hoặc** `slug` (fallback). | `updateCategory` / `removeCategory` |
| BR-12.10 | Dashboard Admin: tổng user (SV/NTD), tổng tin (đang mở/chờ duyệt), tổng đơn (đang chờ), đánh giá bị ẩn, số nhóm việc — **loại trừ tin đã soft-delete**. | `AdminServiceImpl.dashboard` |

---

### BR-13 — Master data & tiện ích chung

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-13.1 | Endpoint master data công khai chỉ trả bản ghi **đang hoạt động** (`isActive=true`) cho nhóm việc, vị trí, kỹ năng — trừ tỉnh/quận (không có cờ active) và benchmark. | `MasterDataServiceImpl` |
| BR-13.2 | `jobCount` của nhóm việc / vị trí đếm **chỉ tin `OPEN`** (không tính tin đã xoá). | `countOpenJobsByCategory/Position` |
| BR-13.3 | Quận/huyện: `provinceId` rỗng → trả **toàn bộ**; có `provinceId` → lọc theo tỉnh. | `listDistricts` |
| BR-13.4 | Mọi mốc thời gian trả về frontend đều là **ISO-8601 ở UTC** (`DateTimeUtils.toIso`); ngày thuần → `yyyy-MM-dd`; giờ ca làm → `HH:mm`. | `DateTimeUtils` |
| BR-13.5 | Parse ngày giờ **không throw**: sai định dạng → `null` (không làm hỏng request). | `DateTimeUtils.parseDateTime/parseDate/parseTime` |
| BR-13.6 | Lỗi nghiệp vụ luôn đi qua `ApiErrors` → envelope `{ timestamp, status, success:false, code, message, errors[] }` với `code` chuẩn: `VALIDATION_FAILED` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT`. | `ApiErrors` · `AppException` |
| BR-13.7 | Lỗi có field → gắn đúng tên field để FE hiển thị lỗi tương ứng (`ApiErrors.errors(field, message)`). | `ApiErrors` |
| BR-13.8 | Danh sách `requirements` / `benefits` lưu dạng **JSON** trong MySQL (khớp `List<String>` của entity). | `V2__marketplace_schema.sql` |
| BR-13.9 | Ca qua đêm (22:00 → 06:00) là **hợp lệ** → đã bỏ ràng buộc `end_time > start_time`. | `V2__marketplace_schema.sql` |
| BR-13.10 | Public ID của nhóm việc / tỉnh / vị trí / kỹ năng là **string slug** (`cat-fnb`, `hcm`, `sk-excel`) — FE dùng thẳng, không cần mapping. | Toàn hệ thống |

---

### BR-14 — Quy tắc liên tầng FE ↔ BE (hợp đồng dữ liệu)

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-14.1 | **Mock layer phải khớp API thật 100%** về envelope lỗi, mã HTTP và shape response — bật/tắt bằng `VITE_USE_MOCK_API` mà **không sửa service nào**. | `app/src/lib/mock/**` · `scripts/verify-mock-api.ts` |
| BR-14.2 | Hệ số quy đổi lương phải giống nhau ở **3 nơi**: `salary.ts` (FE) · `JobServiceImpl.HOURS_PER_UNIT` (BE) · cột generated trong `V2__marketplace_schema.sql`. Sửa 1 nơi phải sửa cả 3. | Xem BR-05.1 |
| BR-14.3 | Thông báo lỗi **tiếng Việt** ở cả 2 tầng; cùng câu chữ cho cùng 1 tình huống (VD "Bạn đã ứng tuyển vào tin tuyển dụng này rồi."). | `ApiErrors` · `lib/mock/errors.ts` |
| BR-14.4 | Timestamp trong seed mock phải bám `MOCK_NOW` (`src/mocks/time.ts`), **không dùng `Date.now()`** — nếu không `pnpm seed:sql` sinh ra V3 migration khác nhau mỗi lần → Flyway báo `Migration checksum mismatch`. | `src/mocks/time.ts` · `scripts/generate-seed-sql.ts` |
| BR-14.5 | WebSocket **chỉ server → client** (không chat 2 chiều); client dùng `BroadcastChannel` để đồng bộ nhiều tab, chỉ tab có focus mới hiện toast. | `lib/realtime/**` |
| BR-14.6 | Frame realtime chỉ là **tín hiệu** → client invalidate cache TanStack Query rồi refetch dữ liệu chuẩn từ REST (WebSocket không phải nguồn dữ liệu). | `useNotificationSocket` |

---

### Tóm tắt các quy tắc cốt lõi (nếu chỉ nhớ 10 điều)

1. **Tin mới luôn chờ duyệt** — sửa tin đã duyệt thì quay lại hàng đợi.
2. **Ứng tuyển trùng bị chặn** ở cả service lẫn unique constraint DB.
3. **Chỉ rút được đơn khi còn `PENDING`**; bộ đếm ứng viên clamp ≥ 0.
4. **Đủ suất → tin `FILLED`**, còn suất nhưng đã có người nhận → `IN_PROGRESS` (tự động).
5. **Chỉ đánh giá sau `COMPLETED`**, 1 người 1 đánh giá / 1 đơn; điểm TB tính lại ở tầng service.
6. **Lương luôn quy về đồng/giờ** trước khi so sánh/lọc — 3 nơi phải khớp.
7. **Mật khẩu kiểm tra trước, trạng thái tài khoản sau** — không tiết lộ sai trường nào.
8. **Refresh token rotate**, hash SHA-256, vé WebSocket 1 lần 60s — JWT không bao giờ nằm trong URL.
9. **Thông báo push sau commit** — rollback không sinh thông báo ma.
10. **NTD không sửa/xoá tin của người khác → 404** (không 403) để không lộ sự tồn tại.

---

## ④ Tech Stack

| Layer | Tech | Lý do chọn |
|---|---|---|
| Frontend | React 19.3 + Vite 8 + TypeScript 6 | SPA tốc độ build nhanh, HMR; TS bắt buộc vì domain model dùng chung FE/BE |
| UI | Tailwind CSS 4 + shadcn/ui (Base UI) + lucide-react + motion | Design system token-based, dark mode, component accessible |
| State/Server cache | TanStack Query 5 | Cache + invalidate theo key khi realtime có sự kiện |
| Forms | React Hook Form 7 + Zod 4 | Validate schema, hỗ trợ field-level error khớp envelope lỗi backend |
| Routing | React Router 8 (`createBrowserRouter`) | Route guard theo role khai báo tập trung |
| Realtime | WebSocket native (không Socket.IO) | Nhẹ, không phụ thuộc thư viện; vé 1-lần tránh lộ JWT trong URL |
| Mock API | Axios adapter tự viết (`src/lib/mock/`) | Chạy frontend độc lập, envelope khớp 100% API thật |
| Backend | Spring Boot 3.3.5, Java 17, Maven | RESTful, hệ sinh thái doanh nghiệp quen thuộc; cấu trúc controller/service/repository rõ |
| Security | Spring Security 6 + JWT HMAC-SHA256 (jjwt) | Stateless, RBAC theo role; `hasRole` map thẳng từ guard frontend |
| Database | MySQL 8.4 (utf8mb4) + Flyway (V1→V4) | Migration có version, `ddl-auto=validate` đảm bảo code khớp schema |
| ORM | Spring Data JPA / Hibernate | `Specification` cho query động (bộ lọc nhiều tiêu chí) |
| File storage | Local disk (`app.storage.upload-dir`), volume Docker | Đủ cho đồ án; tách interface `FileStorageService` để đổi sang S3 |
| Mail | Spring Mail + Gmail SMTP, `@Async` | Gửi mail xác thực không chặn transaction đăng ký |
| Realtime backend | `spring-boot-starter-websocket` native | `RealtimePublisher` là seam giữa domain và transport |
| Docs API | springdoc-openapi (Swagger UI `/swagger-ui.html`) | Tự sinh spec từ code |
| Reverse proxy | Nginx (prod `:8000`) + Vite proxy (dev `:5173`) | Cùng origin `/api` → không lo CORS ở production |
| Hosting | Docker Compose (mysql + backend + frontend) | 1 lệnh dựng trọn hệ thống; chế độ DEV song song (`docker-compose.dev.yml`) |
| Test/Verify | ESLint 10 + Prettier + Playwright + script verify (`verify:*`) | 4 lớp verify: toast, integration, mock-api, e2e; smoke test trình duyệt thật |

---

## ⑤ Integration Points

### Gmail SMTP — gửi email xác thực tài khoản
1. `POST /api/v1/auth/register` → tạo user `PENDING_VERIFY` + token 1 lần (32 bytes random, lưu SHA-256, hạn 24h).
2. `MailServiceImpl.sendVerificationEmail()` chạy bất đồng bộ (`@Async("mailTaskExecutor")`) qua Gmail SMTP (STARTTLS, timeout 5s).
3. Link email: `{APP_BASE_URL}/api/v1/auth/verify-email?token={rawToken}` → mở trực tiếp trả HTML kết quả.
4. Lỗi SMTP → log warn, **không** rollback tài khoản đã tạo.
❌ Không xử lý: hàng đợi retry mail; báo cáo mail bounced; email nhớ mật khẩu.

### Google OAuth2 — đăng nhập/đăng ký nhanh
> ⚠️ **Trạng thái:** backend đã hoàn chỉnh, **frontend chưa nối**. Nút Google ở form đăng nhập/đăng ký hiện chỉ hiện toast. Cần thêm: nạp Google Identity Services script + biến `VITE_GOOGLE_CLIENT_ID` + handler gửi `idToken`.

1. Client lấy ID token (Google Identity Services) → `POST /api/v1/auth/google` kèm `idToken` (+ `role` nếu đã chọn).
2. Server verify ID token bằng `google-api-client` (`GoogleTokenVerifierService`) — **không tin payload từ client**.
3. Email đã có trong hệ thống → đăng nhập; nếu `PENDING_VERIFY` → Google đã xác minh email nên kích hoạt luôn; nếu `LOCKED` → từ chối.
4. Email chưa có → trả `needsRole=true` (client hỏi chọn SV/NTD) → gọi lại kèm `role` → tạo user `ACTIVE`, `authProvider=GOOGLE`, mật khẩu random không ai biết.
❌ Không xử lý: liên kết/nối tài khoản Google với tài khoản local đã tồn tại; đăng nhập Google cho vai trò ADMIN; thu hồi quyền truy cập Google.

### WebSocket — thông báo realtime
1. Client đã đăng nhập → `POST /api/v1/ws/ticket` (Bearer JWT) → nhận vé 1 lần, hạn 60s.
2. Client mở `GET /ws/notifications?ticket=…` → `TicketHandshakeInterceptor` validate + **consume** vé → set `userId` vào `WebSocketSession`; vé sai/hết hạn → HTTP 403.
3. `NotificationWebSocketHandler` đẩy frame nhẹ `{ id, type, title, body, link, unreadCount }` tới đúng user.
4. Client nhận frame → cập nhật badge → hiện toast (chỉ tab có focus) → invalidate cache TanStack Query để refetch dữ liệu chuẩn.
5. Heartbeat ping 25s; reconnect backoff 1s → 30s; `BroadcastChannel` đồng bộ nhiều tab.
❌ Không xử lý: gửi tin nhắn 2 chiều qua WS (chỉ server→client); nhịp ping phía server chủ động; thông báo offline khi mở app (dùng REST list).

### File upload — CV / ảnh đại diện / logo
1. Client validate (mime + size) → `POST /api/v1/files/upload` multipart (`file`, `kind`).
2. Server resolve MIME (ưu tiên header nếu trong whitelist, suy luận từ extension nếu `application/octet-stream`), validate whitelist + size theo `kind`.
3. Lưu `<upload-dir>/<kind>/<kind>-<uuid><ext>`; chặn path traversal (normalize + `startsWith(root)`).
4. Ghi bảng `file_uploads` (slug `file-<uuid>`, owner, kind, storageKey, mime, size) → trả URL tuyệt đối `{PUBLIC_BASE_URL}/api/v1/files/{slug}`.
5. Đọc file: `GET /api/v1/files/{id}` — ảnh/logo công khai; CV kiểm tra quyền (chủ sở hữu / Admin / NTD đã nhận đơn từ SV đó).
❌ Không xử lý: virus scan; resize ảnh; thumbnail; giới hạn số file theo user; dọn file rác.

### Docker / Nginx — hạ tầng & reverse proxy
1. `docker compose up --build` → MySQL 8.4 (healthcheck) → backend (Spring Boot, `SPRING_PROFILES_ACTIVE=docker`) → frontend (Nginx SPA).
2. Nginx: `location /api/` → proxy `backend:8080`; `location /ws/` → `Upgrade`/`Connection "upgrade"`, timeout 300s.
3. Volume `mysql-data` (dữ liệu) + `uploads-data` (file upload không mất khi rebuild).
4. Chế độ DEV: `docker compose -f docker-compose.dev.yml up --build` → Vite `:5173` (HMR) + backend `:8081` (devtools auto-restart) + MySQL `:3307`, chạy song song với bản prod.
❌ Không xử lý: HTTPS/TLS terminate (dev dùng HTTP); CI/CD pipeline; multi-node scale; secret manager.

### TanStack Query — cache & realtime invalidation
1. Query theo key nhóm: `AUTH_KEYS`, `NOTIFICATION_KEYS`, `APPLICATION_KEYS`, `EMPLOYER_JOB_KEYS`, `ADMIN_KEYS.jobs()`.
2. Frame WebSocket → invalidate các key liên quan → refetch dữ liệu chuẩn từ REST (WebSocket **không** là nguồn dữ liệu).
3. `unreadCount` trong frame được server tính **sau commit** để luôn khớp REST.
❌ Không xử lý: optimistic update cho trạng thái đơn (hiện chỉ invalidate + refetch); cache persistent (không qua localStorage); phân trang vô hạn (đang dùng page/pageSize).

---

## ⑥ Non-Functional Requirements

- **Performance:**
  - Trang danh sách việc làm: mục tiêu LCP < 2.5s trên mạng 4G.
  - API: p95 < 500ms cho các endpoint đọc (list/filter/detail); < 800ms cho upload CV 5MB.
  - Mock adapter mô phỏng độ trễ 250–600ms để luyện tập loading state.
  - Phân trang server-side (`pageSize` tối đa 100), không tải toàn bộ dataset.
  - Skeleton loading thay vì spinner trên mọi danh sách.
- **Security:**
  - JWT HMAC-SHA256 hạn 24h; refresh token hạn 30 ngày, **rotate** mỗi lần dùng, thu hồi token cũ.
  - Stateless session, CSRF tắt (API không dùng cookie).
  - RBAC 3 lớp: Spring Security `hasRole` (API) + `RequireRole` (route) + kiểm tra sở hữu ở service (`application.getStudent().getUserId().equals(...)` → 403).
  - Mật khẩu BCrypt; thông báo lỗi đăng nhập **không tiết lộ** email hay mật khẩu sai.
  - Token xác thực & refresh token lưu dạng **hash SHA-256**, không lưu bản rõ.
  - Rate limit gửi lại email xác thực: 60s/email (429).
  - File: whitelist MIME + giới hạn size; chặn path traversal; CV là tài liệu riêng tư (kiểm tra quyền đọc theo vai trò).
  - SQL injection: JPA/Hibernate parameterize; query động dùng `Specification` có bind parameter.
  - WebSocket: vé 1 lần hạn 60s → JWT không nằm trong query string / access log.
  - Header tài khoản demo dùng mật khẩu riêng; JWT secret qua biến môi trường (mặc định chỉ dùng dev).
- **Responsive:** Both. Breakpoints Tailwind — mobile (drawer bộ lọc, menu hamburger), tablet, desktop (sidebar bộ lọc, bảng đa cột). Layout `max-w-7xl`; form `max-w-4xl`.
- **Concurrency:** Thiết kế chịu tải đọc cao hơn ghi nhiều (marketplace): trang danh sách có thể chịu vài nghìn concurrent reads. WebSocket giữ `Map<Long, Set<WebSocketSession>>` — giới hạn thực tế theo số phiên đăng nhập đồng thời. Ghi ứng tuyển/duyệt tin có kiểm tra tranh chấp ở tầng service (unique constraint `existsByJobPostIdAndStudentUserId`).
- **Uptime:** Không cam kết SLA trong phạm vi đồ án. Thiết kế chịu lỗi: container `restart: unless-stopped`, lỗi realtime chỉ log warn (không làm hỏng nghiệp vụ), lỗi gửi mail không rollback đăng ký, transaction rollback không sinh thông báo ma.
- **Accessibility:** Component shadcn/Base UI có focus ring & ARIA; label gắn đúng control (`FieldLabel htmlFor`); icon kèm `aria-label`; tương phản theo token theme.
- **Localization:** Toàn bộ UI tiếng Việt; định dạng ngày `vi-VN`, tiền `toLocaleString("vi-VN")`.
- **Quan sát vận hành:** Log có cấu trúc qua SLF4J; `logging.level.com.uniwork=DEBUG`; Swagger UI `/swagger-ui.html`; script `verify:mock-api` / `verify:e2e` / `smoke-api.sh` / `smoke:browser` để kiểm chứng định kỳ.

---

## ⑦ Edge Cases & Error States

> Envelope lỗi chuẩn (khớp Spring Boot):
> `{ "timestamp", "status", "success": false, "code", "message", "errors": [{ "field", "message" }] }`

| Tình huống | Hành vi mong muốn |
|---|---|
| Đăng ký email đã tồn tại | 409 `EMAIL_ALREADY_EXISTS` — "Email này đã được sử dụng trên hệ thống. Vui lòng chọn email khác hoặc Đăng nhập". Không tạo user mới. |
| Mật khẩu ≠ xác nhận | 400 `PASSWORDS_NOT_MATCH` — chặn ở form trước khi gọi API. |
| Đăng ký/thiết lập vai trò `ADMIN` | 400 `INVALID_ROLE` — chặn cả đăng ký local lẫn Google. |
| Đăng nhập sai email hoặc sai mật khẩu | 401 `INVALID_CREDENTIALS` — **thông điệp giống hệt nhau**, không tiết lộ sai trường nào. Tăng `failed_login_count`. |
| Tài khoản `PENDING_VERIFY` đăng nhập | 403 `EMAIL_NOT_VERIFIED` — kèm hướng dẫn kiểm tra hộp thư / gửi lại email. |
| Tài khoản `LOCKED` đăng nhập | 403 `ACCOUNT_LOCKED` — hướng dẫn liên hệ Admin. |
| Token xác thực hết hạn (>24h) | 400 `TOKEN_EXPIRED` — màn hình xác thực hiện nút "Gửi lại email". |
| Token xác thực đã dùng | 400 `TOKEN_ALREADY_USED`. |
| Gửi lại email quá nhanh (<60s) | 429 `TOO_MANY_REQUESTS` — hiện đếm ngược. |
| Access token hết hạn khi đang dùng | 401 → client gọi `POST /api/v1/auth/refresh` → thử lại request; refresh token cũng hết hạn → đăng nhập lại, không mất dữ liệu form đang nhập. |
| Gọi API sai vai trò (SV gọi endpoint NTD) | 403 từ Spring Security `AccessDeniedHandler` → frontend hiện trang 403 chuyên biệt (`/403`), không trả JSON thô cho người dùng. |
| Truy cập route khi chưa đăng nhập | Redirect `/login`; quay lại route cũ sau khi login. |
| Xem đơn ứng tuyển của người khác | 403 `forbidden` — không lộ nội dung hồ sơ. |
| Ứng tuyển trùng cùng 1 tin | 400 — "Bạn đã ứng tuyển vào tin tuyển dụng này rồi." |
| Ứng tuyển vào tin không còn `OPEN` | 400 — "Tin tuyển dụng này đã ngừng nhận ứng tuyển." |
| Rút đơn khi đã xử lý (không còn PENDING) | 400 — "Đơn ứng tuyển đã được xử lý, không thể rút. Vui lòng liên hệ nhà tuyển dụng." |
| Rút đơn → giảm `applicantCount` | Clamp về 0 (`Math.max(0, ...)`) — không xuống số âm. |
| Ghi chú của NTD > 500 ký tự | 400 với field `note`. |
| Đánh giá khi đơn chưa `COMPLETED` | 400 — "Chỉ được đánh giá sau khi công việc đã hoàn thành." |
| Đánh giá 2 lần cho cùng 1 đơn | 400 — "Bạn đã đánh giá công việc này rồi." |
| Điểm đánh giá ngoài 1–5 hoặc comment rỗng | 400 với field `rating` / `comment`. |
| Admin ẩn đánh giá | Tính lại `avgRating`/`ratingCount` của người bị đánh giá → điểm trung bình không còn tính đánh giá ẩn. |
| NTD sửa/xoá tin không thuộc mình | 404 (không phải 403) — không tiết lộ tin tồn tại. |
| Sửa tin đang `OPEN` | Tin quay lại `PENDING_REVIEW`; giữ nguyên `publishedAt`; Admin nhận thông báo. |
| Tin đủ suất (`positionsFilled == positionsCount`) | Tin tự chuyển `FILLED`; có người nhận nhưng còn suất → `IN_PROGRESS`. |
| Xoá nhóm việc đang có tin dùng | Khoá mềm `isActive=false` (không xoá cứng). Xoá thật khi chưa dùng. |
| Xoá file không thuộc mình | 403 — "Bạn không có quyền xoá file này." |
| Upload file sai định dạng | 400 — nêu rõ định dạng chấp nhận được (PDF/DOC/DOCX hoặc PNG/JPG/WEBP). |
| Upload file vượt giới hạn dung lượng | 400 — nêu rõ giới hạn và dung lượng file hiện tại. |
| File rỗng (0 byte) | 400 — "File rỗng, vui lòng chọn file khác." |
| Trình duyệt báo MIME rỗng với `.doc/.docx` | Suy luận MIME từ extension (cả client lẫn server). |
| File chứa path traversal trong tên | Chặn ở server: sanitize tên + normalize + kiểm tra `startsWith(root)`. |
| CV của sinh viên bị NTD khác xem | 403 — quyền đọc CV chỉ: chủ sở hữu / Admin / NTD đã nhận đơn từ SV đó. |
| Mất mạng giữa chừng khi upload | Thông báo lỗi kết nối, giữ nguyên file đã chọn để thử lại — không mất dữ liệu form. |
| API lỗi 5xx | Toast lỗi thân thiện + `ErrorState` có nút "Thử lại" gọi `refetch()`. |
| Lỗi mạng khi mở trang danh sách | `ErrorState` + nút thử lại; không render trang trắng. |
| Tin không tồn tại (đã xoá) | 404 — trang chi tiết hiện Alert "Không tìm thấy tin tuyển dụng" + nút quay lại danh sách. |
| Tin đã lưu không còn tồn tại | Empty-state riêng: "Các tin đã lưu không còn tồn tại" + CTA tìm việc mới. |
| Chưa đăng nhập mà bấm "Ứng tuyển" | Redirect `/login`, sau đó quay lại trang ứng tuyển. |
| Chưa có hồ sơ sinh viên mà bấm "Ứng tuyển nhanh" | Toast cảnh báo "Chưa có hồ sơ của bạn" + hướng dẫn tạo hồ sơ trước. |
| WebSocket rớt giữa chừng | Reconnect backoff 1s → 30s; badge số chưa đọc vẫn đúng nhờ REST fallback. |
| Vé WebSocket hết hạn (60s) khi mở | HTTP 403 → client xin vé mới và kết nối lại. |
| WebSocket đẩy thông báo lỗi (user offline) | Server log warn, không ném exception ra nghiệp vụ. |
| Nhiều tab cùng mở | `BroadcastChannel` đồng bộ; chỉ tab có focus mới hiện toast (tránh spam). |
| Transaction rollback sau khi ghi thông báo | `afterCommit` → không có frame nào được đẩy; không sinh thông báo ma. |
| Không có dữ liệu benchmark cho ngành×tỉnh | Ẩn badge xếp hạng; fallback benchmark tỉnh `hcm` nếu có. |
| Chênh lệch lương < 5% so với trung bình | Hiển thị "Trung bình", không báo "cao hơn/thấp hơn". |
| Tin có `salaryType = NEGOTIABLE` | Không tính xếp hạng lương, không hiển thị so sánh. |
| Bộ lọc ghi sai kiểu trong URL (vd `employmentTypes=XYZ`) | Lọc bỏ giá trị không hợp lệ, dùng mặc định — không lỗi trang. |
| Trang không tồn tại | Route `*` → trang 404. |
| Vào khu vực admin bằng tài khoản SV | 403 chuyên biệt, không lộ nội dung admin. |
| Trình duyệt không hỗ trợ Web Share API | `handleShare` fallback sang copy link vào clipboard + toast xác nhận. |
| Tin đã qua hạn nộp | Vẫn hiển thị; `Alert` hiện ngày hết hạn đã qua; không chặn xem. |
| Người dùng xoá hết file đã upload | Profile hiển thị empty-state riêng, không render ảnh/link hỏng. |
| Đăng nhập khi refresh token hết hạn | Interceptor xếp hàng request, refresh 1 lần rồi retry; thất bại → redirect `/login` kèm `returnTo`, không mất dữ liệu form đang nhập. |
| Người dùng bấm bất thường nhanh (spam đăng ký) | Rate limit gửi lại email xác thực 60s/email → 429 + đếm ngược ở form. |

---

## ⑧ Success Metrics

> Đo bằng dữ liệu sẵn có trong hệ thống (bảng `job_posts`, `applications`, `reviews`, `notifications`, `user`) — không cần thêm hệ thống analytics.

- **Tuần 1 (định nghĩa & đo lường):**
  - 100% 7 sự kiện realtime chạy đúng qua WebSocket thật (`verify-realtime-ws.mjs` xanh).
  - 100% endpoint trả envelope đúng chuẩn (`verify:mock-api` xanh), 0 lỗi console trong smoke test trình duyệt (`smoke:browser` xanh).
  - Tỉ lệ tin bị Admin từ chối / tổng tin đăng ≤ 30% → điều chỉnh hướng dẫn đăng tin.
- **Tháng 1:**
  - ≥ 30 NTD đăng tin; ≥ 100 sinh viên có hồ sơ đầy đủ (có CV + ≥ 1 kỹ năng).
  - Tỉ lệ tin được duyệt (APPROVE / tổng tin review) ≥ 70%.
  - Tỉ lệ ứng tuyển → được nhà tuyển dụng xử lý (≥ `SHORTLISTED`) ≥ 40%.
  - Thời gian duyệt tin trung vị ≤ 24 giờ (đo từ `postedAt` → `reviewedAt`).
  - Tỉ lệ đơn `ACCEPTED` / tổng đơn ≥ 15%.
- **Tháng 3:**
  - Tỉ lệ sinh viên quay lại (≥ 2 phiên/tháng) ≥ 40%.
  - Tỉ lệ tin tuyển dụng đạt `COMPLETED` ≥ 50% (đo chất lượng tuyển dụng).
  - Tỉ lệ đánh giá 2 chiều ≥ 60% số công việc hoàn thành → uy tín hệ sinh thái.
  - `avgRating` trung bình của NTD ≥ 4.0/5.
  - Tỉ lệ tin tuyển dụng có mức lương minh bạch (`salaryType ≠ NEGOTIABLE`) ≥ 80%.
- **Chỉ số hệ thống (theo dõi liên tục):** số tin đăng/tuần, số ứng tuyển/tuần, tỉ lệ ứng tuyển trùng (phải = 0), thời gian duyệt tin trung vị, tỉ lệ đơn rút (WITHDRAWN), số đánh giá bị ẩn, số job-notify đang bật, số phiên WebSocket đồng thời.

---

## ⑨ Constraints & Assumptions

**Giới hạn:**
- **Budget:** 0 (đồ án cá nhân). Hạ tầng chạy bằng Docker Compose local; Gmail SMTP dùng tài khoản cá nhân; Google OAuth2 dùng Client ID miễn phí.
- **Timeline:** Đồ án môn học — phạm vi cố định theo `de-tai.txt` (7 tính năng trong phạm vi, 3 ngoài phạm vi).
- **Team size:** 1 (full-stack: vừa backend vừa frontend vừa thiết kế).
- **Tech constraints:**
  - Không cài Java/Maven trên máy → build & chạy backend **bắt buộc qua Docker**.
  - Backend phải là **API thật** — không mock trong production; mock chỉ là chế độ chạy độc lập của frontend.
  - Public ID là **string slug** (`job-001`, `cat-fnb`, `emp-viejob-demo`, `hcm`, `q1`, `sk-excel`) — frontend không cần bảng mapping id.
  - File lưu local disk, chưa tích hợp object storage.
  - Chưa có hệ thống thanh toán, chat real-time, app native (đã ghi ở phần ngoài phạm vi).
  - Dữ liệu demo seed tự động từ `app/src/mocks/*` → `V3__seed_demo_data.sql` (nguồn dữ liệu mock và DB thật là một).
- **Ràng buộc nghiệp vụ:**
  - Tin mới luôn phải qua Admin duyệt trước khi công khai.
  - Chỉ đánh giá được sau khi đơn `COMPLETED`; 1 người 1 đánh giá/đơn.
  - Chỉ SV rút được đơn khi còn `PENDING`.
  - Đơn ứng tuyển và tin tuyển dụng dùng **slug** làm public id.
  - Không thu phí đăng tin, không đặt cọc, không thu phí đào tạo (cam kết công khai trên trang chủ).

**Assumptions (giả định):**
- Người dùng có tài khoản email và thiết bị có trình duyệt hiện đại (Chrome/Edge/Firefox bản mới nhất) — ưu tiên desktop nhưng hỗ trợ mobile.
- Sinh viên là nguồn cung ứng chính; NTD là doanh nghiệp vừa/nhỏ, quán ăn, cửa hàng, freelancer cá nhân (không cần pháp nhân đăng ký doanh nghiệp).
- Mức lương được quy đổi theo quy ước cố định (giờ=1, ngày=8, tuần=40, tháng=160) — áp dụng đồng nhất cho cả FE lẫn BE.
- Bảng `salary_benchmarks` được quản trị thủ công (seed sẵn), chưa tự cập nhật từ dữ liệu ứng tuyển thực tế.
- Xác minh nhà tuyển dụng (`isVerified`) hiện là trạng thái hệ thống, quy trình xác minh giấy tờ chưa được xây dựng.
- Quản trị viên được tạo qua biến môi trường `ADMIN_INITIAL_EMAIL`/`ADMIN_INITIAL_PASSWORD` và seed demo — không có đăng ký role ADMIN qua UI.
- Hạ tầng chạy ở môi trường demo/single-node; chưa cân nhắc scale ngang, CDN hay HA.

---

## Phụ lục A — Bản đồ API (đã hiện thực)

> Base: `/api/v1`. Envelope thành công `{ success, message, data }`; lỗi `{ timestamp, status, success: false, code, message, errors }`.
>
> **Tổng: 65 endpoint REST** (đếm `@Get/@Post/@Put/@Patch/@DeleteMapping` trong 10 controller) + **1 WebSocket handshake** `/ws/notifications?ticket=`.

### Auth (`/auth`) — public trừ `/me`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký SV/NTD, gửi mail xác thực |
| GET | `/auth/verify-email?token=` | Xác thực qua link email (HTML) |
| POST | `/auth/verify-email` | Xác thực qua client (JSON) |
| POST | `/auth/resend-verification` | Gửi lại email xác thực (rate limit 60s) |
| POST | `/auth/login` | Đăng nhập email/mật khẩu |
| POST | `/auth/google` | Đăng nhập/đăng ký Google OAuth2 |
| GET | `/auth/me` | Thông tin user hiện tại *(auth)* |
| POST | `/auth/refresh` | Làm mới token (rotate) |

### Public — tin việc làm & master data *(không cần token)*
| Method | Path | Mô tả |
|---|---|---|
| GET | `/jobs/public` | Danh sách tin + lọc + phân trang (không có tham số `salaryUnit`) |
| GET | `/jobs/public/{id}` | Chi tiết tin (tăng `viewCount`) |
| GET | `/jobs/public/related` | Tin gợi ý cùng nhóm việc |
| GET | `/public/categories` | Nhóm việc (ngành nghề) |
| GET | `/public/positions` | Vị trí công việc |
| GET | `/public/provinces` | Tỉnh/thành phố |
| GET | `/public/districts` | Quận/huyện (lọc theo tỉnh) |
| GET | `/public/skills` | Kỹ năng |
| GET | `/public/salary-benchmarks` | Xếp hạng lương ngành × tỉnh |
| GET | `/public/employers/{id}` | Hồ sơ NTD công khai + tin + đánh giá |

### Student (`/student`) — `hasRole("STUDENT")`
| Method | Path | Mô tả |
|---|---|---|
| GET/PUT | `/student/profile` | Hồ sơ sinh viên (kèm kinh nghiệm, mục tiêu việc làm) |
| GET | `/student/applications` | Đơn ứng tuyển của tôi (`?status=`) |
| GET | `/student/applications/{id}` | Chi tiết đơn + timeline |
| POST | `/student/applications` | Nộp đơn ứng tuyển |
| PATCH | `/student/applications/{id}/withdraw` | Rút đơn |
| GET | `/student/saved-jobs` | Tin đã lưu |
| GET | `/student/saved-jobs/ids` | Danh sách id tin đã lưu |
| POST | `/student/saved-jobs` | Lưu tin |
| DELETE | `/student/saved-jobs/{jobId}` | Bỏ lưu tin |
| GET/POST/DELETE | `/student/job-notifications` | Bật/tắt thông báo theo ngành + tỉnh |

### Employer (`/employer`) — `hasRole("EMPLOYER")`
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/employer/jobs` | Danh sách tin của tôi / đăng tin |
| PUT/DELETE | `/employer/jobs/{id}` | Sửa tin / huỷ tin |
| GET | `/employer/applications` | Danh sách ứng viên (`?jobId&status`) |
| GET | `/employer/applications/{id}` | Chi tiết hồ sơ ứng viên |
| PATCH | `/employer/applications/{id}` | Đổi trạng thái đơn |
| PATCH | `/employer/applications/{id}/note` | Ghi chú của NTD về đơn (≤ 500 ký tự) |
| GET/PUT | `/employer/profile` | Hồ sơ tổ chức |
| GET | `/employer/reviews` | Đánh giá của tôi *(FE hiện gọi `GET /reviews?targetType=EMPLOYER` + lọc client-side)* |
| POST/PATCH | `/employer/reviews/{id}/reply` | Trả lời đánh giá |

### Admin (`/admin`) — `hasRole("ADMIN")`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/admin/dashboard` | Số liệu tổng quan hệ thống |
| GET | `/admin/users` | Danh sách user (`?role&keyword`) |
| PATCH | `/admin/users/{id}` | Khoá/mở khoá, đổi vai trò |
| GET | `/admin/jobs` | Danh sách tin (`?status`) |
| PATCH | `/admin/jobs/{id}/review` | Duyệt / từ chối tin |
| GET/POST/PUT/DELETE | `/admin/categories` | CRUD nhóm việc |
| GET | `/admin/reviews` | Danh sách đánh giá |
| PATCH | `/admin/reviews/{id}` | Ẩn/hiện đánh giá |

### Dùng chung
| Method | Path | Mô tả |
|---|---|---|
| GET | `/notifications` | Danh sách thông báo (`?unreadOnly`) |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc |
| PATCH | `/notifications/{id}/read` | Đánh dấu đã đọc |
| POST | `/notifications/read-all` | Đọc tất cả |
| GET/POST | `/reviews` | Tạo / xem đánh giá |
| POST | `/files/upload` | Upload CV / ảnh / logo (multipart) |
| GET | `/files/{id}` | Tải file (CV kiểm tra quyền) |
| DELETE | `/files/{id}` | Xoá file |
| POST | `/ws/ticket` | Cấp vé WebSocket (1 lần, 60s) |
| WS | `/ws/notifications?ticket=` | Kênh thông báo realtime |

---

## Phụ lục B — Bản đồ màn hình (route → vai trò)

| Route | Màn hình | Truy cập |
|---|---|---|
| `/` | Trang chủ (hero, tìm kiếm, nhóm việc, tỉnh, xếp hạng lương) | Công khai |
| `/jobs` | Danh sách việc làm + bộ lọc (URL-driven) | Công khai |
| `/jobs/{id}` | Chi tiết tin (lịch ca, lương, benchmark, NTD, gợi ý) | Công khai |
| `/jobs/{id}/apply` | Ứng tuyển (CV, thư, lương kỳ vọng, ngày bắt đầu) | SV đăng nhập |
| `/about` | Về chúng tôi (cam kết an toàn 2 chiều, tiêu chuẩn) | Công khai |
| `/employer/{id}` | Hồ sơ NTD công khai + tin + đánh giá | Công khai |
| `/login`, `/register` | Đăng nhập / Đăng ký (email + Google) | Công khai |
| `/verify-email` | Kết quả xác thực email | Công khai |
| `/403`, `*` | Không có quyền / Không tìm thấy trang | Công khai |
| `/student` | Dashboard SV (đơn gần đây, gợi ý việc) | SV |
| `/student/profile` | Hồ sơ tìm việc (2 tab) | SV |
| `/student/applications` | Đơn ứng tuyển của tôi | SV |
| `/student/applications/{id}` | Chi tiết đơn + timeline | SV |
| `/saved` | Việc làm đã lưu | SV |
| `/employer` | Dashboard NTD (tổng quan tin + ứng viên) | NTD |
| `/employer/jobs` | Tin tuyển dụng của tôi | NTD |
| `/employer/jobs/new`, `/employer/jobs/{id}/edit` | Đăng / sửa tin (wizard 4 bước + xem trước) | NTD |
| `/employer/applications` | Danh sách ứng viên | NTD |
| `/employer/applications/{id}` | Chi tiết hồ sơ + cập nhật trạng thái + ghi chú | NTD |
| `/employer/organization` | Thông tin tổ chức | NTD |
| `/employer/reviews` | Đánh giá từ sinh viên + trả lời | NTD |
| `/admin` | Bảng điều khiển hệ thống | Admin |
| `/admin/jobs` | Duyệt tin tuyển dụng | Admin |
| `/admin/categories` | Quản lý danh mục ngành nghề | Admin |
| `/admin/users` | Quản lý người dùng (khoá/đổi role) | Admin |
| `/admin/reviews` | Kiểm duyệt đánh giá | Admin |
| `/notifications` | Trung tâm thông báo (tab Tất cả / Chưa đọc) | Mọi vai trò đã đăng nhập |

---

## Phụ lục C — Mô hình dữ liệu (29 bảng)

> **29 bảng** được tạo bởi các migration `V1__init_schema.sql` → `V4__file_uploads_and_job_notify.sql`.
> Trong đó **24 bảng đang được JPA entity dùng** (`ddl-auto=validate`), 5 bảng còn lại là schema V1 **legacy/không dùng** nhưng vẫn được tạo trong DB.

**Nhóm người dùng:** `users`, `roles`, `refresh_tokens`, `user_tokens`, `student_profiles`, `employer_profiles`, `student_experiences`, `student_job_preferences`

**Nhóm việc làm:** `job_posts`, `job_categories`, `job_positions`, `job_post_schedules`, `job_post_skills`, `skills`, `provinces`, `districts`, `salary_benchmarks`, `saved_jobs`

**Nhóm tương tác:** `applications`, `application_status_history`, `reviews`, `notifications`, `job_notify_preferences`, `file_uploads`

**Nhóm legacy (V1, không có entity — giữ lại để tương thích):** `student_skills`, `student_resumes`, `work_assignments`, `reports`, `audit_logs`
> Ghi chú: bảng `reports` được nhắc tới trong UI cam kết "báo cáo tin lừa đảo" nhưng **chưa có entity/service dùng** — xem phần NICE TO HAVE.

**Enum chính:**
- `Role`: `STUDENT` / `EMPLOYER` / `ADMIN`
- `UserStatus`: `PENDING_VERIFY` / `ACTIVE` / `LOCKED` / `DELETED`
- `AuthProvider`: `LOCAL` / `GOOGLE`
- `EmployerType`: `COMPANY` / `INDIVIDUAL`
- `JobStatus`: `DRAFT` / `PENDING_REVIEW` / `REJECTED` / `OPEN` / `FILLED` / `IN_PROGRESS` / `COMPLETED` / `CLOSED` / `CANCELLED`
- `ApplicationStatus`: `PENDING` / `SHORTLISTED` / `ACCEPTED` / `COMPLETED` / `REJECTED` / `WITHDRAWN`
- `WorkMode`: `ONSITE` / `REMOTE` / `HYBRID`
- `EmploymentType`: `FULL_TIME` / `PART_TIME` / `FLEXIBLE` / `CASUAL`
- `SalaryType`: `HOURLY` / `DAILY` / `WEEKLY` / `MONTHLY` / `PER_TASK` / `NEGOTIABLE`
- `ReviewTargetType`: `EMPLOYER` / `STUDENT`
- `NotificationType`: `APPLICATION` / `APPLICATION_STATUS` / `JOB` / `REVIEW` / `SYSTEM`
- `FileKind`: `CV` / `AVATAR` / `LOGO`

---

## Changelog

| Ngày | Thay đổi | Người cập nhật |
|---|---|---|
| 18/11/2026 | v1 — viết ngược từ mã nguồn `app/` + `backend/` (17 feature, 55 endpoint, 22 bảng) | AI (Composer) |
| 18/11/2026 | v2 — rà soát đối chiếu PRD ↔ code (`app/` + `backend/`): sửa 8 điểm PRD mô tả vượt quá thực tế (Google OAuth, job-notify UI, `salaryUnit`, `lastLoginAt`, `avgRating`, số bảng, số endpoint, gợi ý việc làm); **bổ sung 8 feature còn thiếu** (18–25); thêm mục "Khoảng trống đã biết" | AI (Composer) |
| 18/11/2026 | v3 — **thêm mục ③.5 "Quy tắc nghiệp vụ"** (14 nhóm, 143 quy tắc) trích từ tầng `backend/.../service/**`, `JobPostSpecification`, `SecurityConfig` và `app/.../salary.ts`; ghi nhận 1 lệch FE↔BE về `employerNote` (BR-06.17) | AI (Composer) |
| 18/11/2026 | v4 — **gỡ trạng thái `VIEWED` khỏi đơn ứng tuyển**: pipeline rút gọn còn `PENDING → SHORTLISTED → ACCEPTED → COMPLETED` (+ `REJECTED`/`WITHDRAWN`); thêm migration `V5__remove_viewed_application_status.sql`; `reviewed_at` nay đánh dấu lần đầu NTD xử lý hồ sơ | AI (Composer) |
