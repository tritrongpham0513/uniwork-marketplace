# 05: Badge mức độ vi phạm và sắp xếp nổi lên đầu trang Duyệt tin tuyển dụng

**What to build:** Trang Duyệt tin tuyển dụng phải giúp quản trị viên thấy ngay tin nào đáng soi kỹ. Tin đã có kết quả kiểm tra và bị gắn cờ nổi lên đầu danh sách; trong nhóm đó, mức `SUSPECT` trước mức `WARN`. Tin có kết quả `OK` và tin chưa kiểm tra nằm sau, theo thứ tự thời gian hiện tại. Mỗi tin có một badge màu theo mức độ: đỏ cho `SUSPECT` với nhãn "AI: cần xem", hổ phách cho `WARN` với nhãn "AI: nghi ngờ", xanh cho `OK` với nhãn "AI: ổn", xám với nhãn "Chưa kiểm tra" cho tin chưa có kết quả.

Quản trị viên cũng thấy được thời điểm AI đã kiểm tra tin, để biết kết quả còn giá trị hay không.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** done

- [x] Danh sách tin chờ duyệt sắp theo mức độ vi phạm: tin bị gắn cờ nổi lên đầu, `SUSPECT` trước `WARN`, rồi `OK` và chưa kiểm tra ở sau theo thứ tự thời gian hiện tại.
- [x] Mỗi tin có badge màu đúng theo mức độ: đỏ "AI: cần xem", hổ phách "AI: nghi ngờ", xanh "AI: ổn", xám "Chưa kiểm tra".
- [x] Hiển thị thời điểm AI kiểm tra tin tuyển dụng.
- [x] Quản trị viên thấy được mức lương của tin so với mức trung bình của ngành và tỉnh, và biết nhà tuyển dụng đã xác minh hay chưa kèm điểm uy tín.
- [x] Hàm sắp xếp là một hàm thuần trong thư mục `lib` của feature `admin`, test được độc lập.
- [x] Có bộ test Vitest cho hàm sắp xếp: `SUSPECT` trước `WARN` trước `OK` trước chưa kiểm tra; thứ tự trong cùng nhóm giữ nguyên; danh sách rỗng không lỗi.
- [x] Tin tuyển dụng không bị gắn cờ không bị ẩn hay bị loại khỏi hàng đợi duyệt — AI chỉ gợi ý, quyết định vẫn là của quản trị viên.

## Comments

**Đã làm (frontend, nhánh `feature/ai-ticket-05`):**

- `app/src/features/admin/lib/ai-review.ts` — hàm thuần `sortJobsByAiSeverity(jobs)`:
  `SUSPECT` → `WARN` → `OK` → chưa kiểm tra; giữ nguyên thứ tự trong cùng nhóm; không
  mutate mảng đầu vào; danh sách rỗng → trả về rỗng. Kèm helper
  `getAiSeverityGroup(job)` và bảng nhãn `AI_VERDICT_LABELS`.
- `app/src/features/admin/lib/ai-review.test.ts` — 6 test Vitest cho hàm sắp xếp.
- `app/src/features/admin/components/ai-review-badge.tsx` — badge 4 mức, màu/nhãn đúng
  theo `notes/01-ket-qua-thu.md` mục 4.1 (`bg-destructive/10 text-destructive`,
  `bg-amber-500/10 text-amber-700`, `bg-primary/10 text-primary`,
  `bg-muted text-muted-foreground`).
- `app/src/features/admin/components/ai-review-panel.tsx` — khối "Đánh giá của AI"
  trong dialog: verdict, tóm tắt, từng lý do (mã + trích nguyên văn + giải thích),
  thời điểm kiểm tra, và câu **"Đây là góp ý của AI, quyết định duyệt vẫn là của quản trị viên."**
  Đặt SAU nội dung tin trong dialog.
- `app/src/pages/admin/jobs.tsx` — sắp xếp theo mức độ, badge trên từng thẻ tin,
  thời điểm AI kiểm tra, nút **"Kiểm tra bằng AI"** (cả trên thẻ tin lẫn trong
  dialog) kèm chú thích _"Mỗi lần kiểm tra sẽ dùng 1 lượt AI."_. Nút Duyệt / Từ chối
  giữ nguyên, AI **không** đổi trạng thái tin.
- `app/src/features/admin/services/admin.service.ts` — thêm `reviewJobWithAi(id)` và
  `aiStatus()`.
- `app/src/features/admin/hooks/index.ts` — thêm `useAiReviewJob()` (invalidate
  `ADMIN_KEYS.all` khi thành công, lỗi AI hiện qua `showApiError` — dùng đúng
  thông điệp tiếng Việt của backend) và `useAiFeatureStatus()`.
- `app/src/features/shared/types/index.ts` — thêm `AiVerdict`, `AiViolationCode`,
  `AiReason`, `AiReview`, `AiFeatureStatus`; thêm 3 trường nullable
  `aiVerdict` / `aiReasons` / `aiCheckedAt` vào `Job`.
- `app/src/features/shared/query-keys.ts` — thêm `ADMIN_KEYS.aiStatus()`,
  `ADMIN_KEYS.benchmarks()`, `ADMIN_KEYS.employerTrust(id)`.

**Cần lưu ý:**

1. **Nút "Kiểm tra bằng AI" bị ẨN hoàn toàn khi `GET /api/v1/admin/ai/status`
   trả `enabled: false`** (backend tự tắt khi thiếu khoá API) — không hiện rồi
   báo lỗi khi bấm. Điều kiện: `aiStatus?.enabled === true`.
2. **Hai endpoint backend của ticket 02/03 phải có mặt** cho nút này chạy được:
   `POST /api/v1/admin/jobs/{id}/ai-review` và `GET /api/v1/admin/ai/status`.
   Frontend gọi đúng đường dẫn và hình dạng theo `CONTRACT.md` mục 5.6 + mục 8.
3. **Checkbox "mức lương so với trung bình ngành và tỉnh + uy tín nhà tuyển dụng"**
   cần dữ liệu mà `AdminJobResponse` (CONTRACT mục 6) **không** mang: `Job.employer`
   chỉ có `verified`, không có điểm uy tín. Vì vậy:
   - Mức lương: so sánh bằng `GET /api/v1/public/salary-benchmarks` (1 request cho
     cả danh sách) — dùng đúng bảng xếp hạng lương mà AI cũng dùng.
   - Điểm uy tín: lấy từ `GET /api/v1/public/employers/{id}` khi quản trị viên
     mở dialog xem nội dung (tránh N request cho cả danh sách).
   - Không sửa shape `AdminJobResponse` để tránh lệch hợp đồng với ticket 02.
4. **Ba file tạo thêm ngoài bảng phân công PLAN.md mục 2** (vẫn nằm trong đúng
   thư mục `features/admin` của ticket 05, không đụng file của ticket khác):
   - `app/src/features/admin/lib/salary-benchmark.ts` + `.test.ts`
   - `app/src/features/admin/components/job-trust-info.tsx`
     Lý do: `features/admin` **không được** import chéo từ `features/jobs` (ESLint
     `no-restricted-imports`), nên logic so sánh lương phải có bản riêng trong
     feature `admin` thay vì dùng lại `features/jobs/lib/salary.ts`.
5. Chưa thể kiểm chứng end-to-end với backend thật (chưa có `GEMINI_API_KEY`, và
   backend ticket 02/03 đang build song song). Đã verify: typecheck, ESLint, và
   8 file test / 138 test Vitest đều PASS.
