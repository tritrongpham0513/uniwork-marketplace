# 01: Thử và chốt prompt kiểm duyệt nội dung tin tuyển dụng

**What to build:** Trước khi viết mã ứng dụng, cần chốt được nội dung chỉ dẫn cho AI và hình dạng kết quả mà AI sẽ trả về. Để làm được vậy cần một công cụ độc lập (script Node, chạy ngoài ứng dụng) dựng đúng prompt và lược đồ kết quả, rồi chạy trên bộ mẫu tin tuyển dụng thật.

Kết quả của ticket này là một bản ghi lại đã chốt: nội dung chỉ dẫn, quy tắc bằng chứng nguyên văn, danh sách mã vi phạm hợp lệ, hình dạng JSON kết quả, và đánh giá ban đầu trên bộ mẫu. Không có ticket này thì mọi thứ viết trong ứng dụng là mù.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Có một công cụ độc lập chạy được ngoài ứng dụng, dựng prompt theo cấu trúc: phần chỉ dẫn tách riêng, phần dữ liệu tin tuyển dụng nằm trong khối riêng kèm câu nhắc coi nội dung đó là dữ liệu và bỏ qua mọi chỉ dẫn nằm trong đó.
- [x] Cấu hình khóa API lấy từ biến môi trường, không nằm trong mã nguồn và không được ghi log.
- [x] Chạy được trên bộ 7 mẫu tin tuyển dụng thật, mỗi mẫu là một tin có nội dung vi phạm rõ ràng hoặc một tin bình thường, theo danh sách mẫu trong đặt tả.
- [x] Kết quả trả về có hình dạng cố định: verdict (`OK` | `WARN` | `SUSPECT`), một câu tóm tắt tiếng Việt, và danh sách lý do gồm mã vi phạm, câu trích nguyên văn, giải thích ngắn.
- [x] Chỉ dùng đúng sáu mã vi phạm đã định nghĩa sẵn: `FEE_ADVANCE`, `UNREGISTERED_WORK`, `OFF_PLATFORM`, `SALARY_ANOMALY`, `DISCRIMINATION`, `ILLEGAL_WORK`. Không có mã cho tin thiếu thông tin.
- [x] Quy tắc bắt buộc đã được kiểm chứng bằng thử nghiệm: mỗi lý do nêu ra đều kèm được một câu nguyên văn có thật trong tin; lý do không trích được câu nguyên văn thì không được đưa vào kết quả.
- [x] Chốt được câu chữ thông báo cho nhà tuyển dụng ở form đăng tin, và câu chữ nhãn hiển thị cho quản trị viên (nhãn badge, câu ghi rõ đây là góp ý của AI).
- [x] Ghi lại kết quả thử: verdict thực tế của từng mẫu, và nhận xét về độ tin cậy của từng mã vi phạm.
- [x] Xác minh được hạn mức thật của dự án tại trang giới hạn của AI Studio, không dựa vào con số từ nguồn thứ ba.

## Comments

Kết quả đầy đủ: [`../notes/01-ket-qua-thu.md`](../notes/01-ket-qua-thu.md).
Công cụ: `backend/scripts/ai-moderation/` (`prompt.mjs`, `samples.mjs`, `run.mjs`, `README.md`).

### Cập nhật 26/11/2026 — đã có `GEMINI_API_KEY`, đã chạy thật

Lượt chạy thật với `gemini-3.5-flash-lite`: **7/7 mẫu có verdict khớp kỳ vọng**,
**0 lý do bị loại** (mọi `evidence` đều là câu nguyên văn có thật trong tin),
verdict `OK` thì `reasons` rỗng.

Bảng kết quả + nhận xét độ tin cậy từng mã: mục 9 của file ghi chú.
Báo cáo thô: [`../notes/01-bao-cao-thu.json`](../notes/01-bao-cao-thu.json).

Các phần dưới đây là **ghi chú lúc môi trường chưa có khoá** — giữ lại làm thiết kế
ý định và giải thích cơ chế; không bị bác bỏ bởi lượt chạy thật.

### Mục KHÔNG hoàn thành — không có `GEMINI_API_KEY`

Môi trường này **không có `GEMINI_API_KEY`** và người dùng đã quyết định chủ động làm
tiếp mà không cần khóa. Vì vậy **không có lượt chạy thật nào với Gemini**, và tôi
**không ghi bất kỳ verdict nào được bịa** — mọi kết quả trong file ghi chú đều được ghi
rõ là _kỳ vọng thiết kế_, không phải _quan sát được_.

### `[~]` Mục "Quy tắc bắt buộc đã được kiểm chứng bằng thử nghiệm" — MỘT NỬA

**Đã kiểm chứng:** cơ chế lọc. `filterReasons()` trong `run.mjs` loại bỏ lý do khi
(1) mã không thuộc 6 mã hợp lệ, (2) `evidence` rỗng, (3) `evidence` không xuất hiện nguyên
văn trong nội dung tin. Đã chạy thử cả 3 nhánh, kết quả đúng (bảng ở mục 2.5 của file
ghi chú). Cách so khớp: NFC + gộp khoảng trắng + không phân biệt hoa/thường; **không**
dùng so khớp mờ, vì mục tiêu là phát hiện AI bịa câu trích.

**Chưa kiểm chứng:** phần "AI có thực sự trích nguyên văn hay không" — cái này chỉ
trả lời được sau khi có kết quả thật. Có thể chạy ngay khi có khóa:
`node backend/scripts/ai-moderation/run.mjs`.

### `[~]` Mục "Xác minh hạn mức thật tại trang giới hạn của AI Studio" — MỘT NỬA

**Đã làm:** đọc tài liệu chính thức của Google
(<https://ai.google.dev/gemini-api/docs/rate-limits> và
<https://ai.google.dev/gemini-api/docs/pricing>) + đối chiếu 3 nguồn quan sát độc lập.

**Phát hiện quan trọng:** Google **đã gỡ bảng hạn mức free tier theo từng model** khỏi
trang tài liệu. Trang đó giờ chỉ còn hạn mức theo mức sử dụng (spend-based), điều kiện
nâng tier, hạn mức Batch API — rồi trỏ người đọc tới **trang Rate Limits trong AI
Studio** và ghi rõ _"Specified rate limits are not guaranteed and actual capacity may vary."_

Nên "hạn mức thật của dự án" **không còn tồn tại trong tài liệu** — nó chỉ nằm ở trang
Rate Limits của chính project đó, và cần đăng nhập Google để xem. **Tôi không đăng nhập
được**, nên không xác minh được hạn mức của project.

Con số thu thập được (là **quan sát từ bảng hạn mức trong AI Studio** của các project
free, **không** phải do Google công bố): `gemini-3.5-flash-lite` = **15 lượt/phút,
250.000 token/phút, 500 lượt/ngày**, tính theo project, reset 00:00 giờ Thái Bình Dương.
Ba nguồn độc lập cho cùng kết quả (hai lượt đo cách nhau 7 tuần trên 2 project khác
nhau). Chi tiết + URL ở mục 5 của file ghi chú.

Quy tắc **do Google công bố chắc chắn**: hạn mức theo project (không theo khóa), reset
00:00 giờ Thái Bình Dương, đo theo RPM/TPM/RPD, vượt chiều nào cũng nhận
`429 RESOURCE_EXHAUSTED`. Con số "500 lượt/ngày" trong `spec.md` mục 16 vẫn khớp với
quan sát — nhưng `spec.md` đã cảnh báo đúng rằng đây là con số từ nguồn thứ ba, và
điều đó **vẫn đúng** sau khi đối chiếu.

### Mục "Ghi lại kết quả thử: verdict thực tế từng mẫu" — CHƯA LÀM ĐƯỢC

Cần verdict thật từ Gemini mới có. Đã thay bằng: (1) bộ 7 mẫu đầy đủ với kỳ vọng
thiết kế, (2) bảng đối chiếu mẫu ↔ kỳ vọng, (3) công cụ tự in 3 dòng đánh giá tay
(verdict khớp kỳ vọng / bằng chứng nguyên văn / `OK` thì reasons rỗng) ngay khi có
lượt chạy thật.

### Ghi chú cho agent backend Java (ticket 02/03)

Mục 7 của file ghi chú liệt kê 12 điểm cần đồng bộ. Đáng chú ý nhất:

- Dùng **nguyên văn** `INSTRUCTIONS` / `DATA_BLOCK_TEMPLATE` (placeholder `{0}`, không
  phải `${}`) từ `PROMPT.md` mục 5. `INSTRUCTIONS` giữ nguyên lỗi chính tả `dieu chih`
  của bản ASCII — nếu muốn sửa thì sửa `PROMPT.md` trước rồi đồng bộ cả hai bên.
- Nội dung tin tuyển dụng giữ **tiếng Việt có dấu**; chỉ phần chỉ dẫn là ASCII.
- Thứ tự trường trong khối dữ liệu phải khớp `buildJobContent()`.
- Dùng **cùng cách chuẩn hoá** khi so khớp bằng chứng, nếu không hai bên cho kết quả
  khác nhau trên cùng một kết quả AI.
- Tỉ lệ quy đổi lương: script dùng quy ước 8/40/160 giờ cho DAILY/WEEKLY/MONTHLY;
  backend nên dùng bảng quy đổi có sẵn của hệ thống và sửa `run.mjs` cho khớp nếu lệch.
- `PER_TASK` không quy đổi được → AI không được suy luận `SALARY_ANOMALY` từ đó.
