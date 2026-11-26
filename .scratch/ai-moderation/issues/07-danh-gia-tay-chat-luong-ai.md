# 07: Đánh giá tay chất lượng AI trên bộ 7 mẫu tin tuyển dụng

**What to build:** Chứng minh bằng bộ mẫu tin tuyển dụng thật rằng lớp góp ý AI đủ tin cậy để đưa vào quy trình duyệt. Bộ mẫu gồm bảy tin: yêu cầu đặt cọc tiền để giữ chỗ làm; thuê sinh viên làm thêm không cần CCCD; mời ứng tuyển qua Zalo không cần lên nền tảng; điều kiện chỉ nam, không ở trọ, dưới 20 tuổi không xét; công việc liên quan mại dâm; lương 500.000đ/giờ ở nhóm việc nhà hàng tại một tỉnh có mức trung bình 28.000đ/giờ; và một tin bình thường lương 30.000đ/giờ đủ thông tin.

Tiêu chí nghiệm thu: verdict đúng với kỳ vọng ở ít nhất 6/7 mẫu; mọi bằng chứng là câu nguyên văn có trong tin đối chiếu được tay; verdict `OK` thì danh sách lý do rỗng; tin tuyển dụng không bị thay đổi trạng thái; nhà tuyển dụng đăng tin có nội dung vi phạm vẫn không bị chặn; khi mô phỏng lỗi AI thì giao diện hiện "chưa kiểm tra" chứ không phải lỗi kỹ thuật.

**Blocked by:** 03 — Đưa xếp hạng lương và uy tín nhà tuyển dụng vào đầu vào AI. 04 — Kiểm tra AI tự động ở nền khi đăng tin và khi sửa tin đã duyệt.

**Status:** done

- [x] Chạy lại đúng bảy mẫu tin tuyển dụng qua đường chạy thật của ứng dụng (không phải script độc lập ở ticket 01).
- [x] Verdict đúng với kỳ vọng ở ít nhất 6/7 mẫu; mẫu còn lại được ghi lại lý do không đạt.
- [x] Mọi bằng chứng trong kết quả đều là câu nguyên văn có thật trong tin, đối chiếu tay được.
- [x] Verdict `OK` thì danh sách lý do rỗng.
- [x] Tin tuyển dụng không bị thay đổi trạng thái sau khi có kết quả kiểm tra; quản trị viên vẫn duyệt / từ chối như trước.
- [x] Nhà tuyển dụng đăng tin có nội dung vi phạm vẫn không bị chặn — vẫn vào hàng đợi duyệt bình thường.
- [x] Mô phỏng lỗi AI → giao diện hiện "chưa kiểm tra" chứ không phải lỗi kỹ thuật.
- [x] Kết quả đánh giá được ghi lại kèm theo, để dùng làm căn cứ nếu sau này cần chỉnh nội dung chỉ dẫn.

## Comments

### Kết quả: 7/7 mẫu khớp kỳ vọng (ngưỡng: 6/7)

Chạy thật qua backend Spring Boot + MySQL, dùng đúng các endpoint quản trị viên dùng
(`POST /employer/jobs` → `POST /admin/jobs/{id}/ai-review` → `GET /admin/jobs` → `GET /employer/jobs`).

Mọi bằng chứng đều là câu nguyên văn đối chiếu được tay; 0 lý do nào bị backend loại.
Cả 7 mẫu vẫn `PENDING_REVIEW` sau khi kiểm tra; nhà tuyển dụng không thấy trường AI nào.

Chi tiết đầy đủ: `.scratch/ai-moderation/notes/07-danh-gia-tay-chat-luong-ai.md`
Dữ liệu thô: `.scratch/ai-moderation/notes/07-bao-cao-danh-gia.json`
Công cụ: `backend/scripts/ai-moderation/evaluate.mjs --live`

### Sửa thêm phát hiện trong lúc đánh giá

Tiêu chí "mô phỏng lỗi AI → giao diện hiện _chưa kiểm tra_" **chưa** đúng trước khi sửa: nút
"Kiểm tra bằng AI" bắn toast lỗi kỹ thuật cho quản trị viên. Đã sửa:

- `app/src/features/admin/lib/ai-review.ts` — thêm `getAiPanelState()` + `AI_PANEL_MESSAGES` (thuần, test được).
- `app/src/features/admin/components/ai-review-panel.tsx` — nhận `hasFailed`; mọi trạng thái không có kết quả đều hiện "chưa kiểm tra".
- `app/src/pages/admin/jobs.tsx` — `handleAiCheck` bắt lỗi nhưng không gọi `showApiError`.

### Điểm còn lại (chưa sửa, ghi lại để quyết sau)

Evidence trích từ dòng mức lương do backend dựng (ví dụ mẫu 6) là "nguyên văn theo nội dung tin
được dựng", nhưng không phải câu nhà tuyển dụng viết — quản trị viên đối chiếu bằng mắt sẽ không
thấy trong mô tả. Siết lại cần giới hạn `AiEvidenceMatcher` chỉ so trên phần nội dung do nhà tuyển
dụng viết, và cần một ADR riêng vì đổi quy tắc so khớp đã chốt ở CONTRACT.md mục 5.5 / ADR 0005.
