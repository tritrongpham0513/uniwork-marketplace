# Công cụ thử prompt kiểm duyệt tin tuyển dụng

Script Node độc lập (không nằm trong ứng dụng Java) dựng **đúng** prompt + response
schema mà backend sẽ dùng, rồi chạy trên bộ 7 mẫu tin tuyển dụng tiếng Việt.

Mục đích: chốt nội dung chỉ dẫn và hình dạng kết quả **trước khi** viết mã Java.
Thử prompt rẻ hơn thử mã (xem `.scratch/ai-moderation/spec.md` → "Ba việc cần làm trước
khi viết mã", mục 2).

---

## 1. Yêu cầu

- **Node.js 24+** (dùng `fetch` có sẵn của Node — không cài thêm package).
- Không cần build step, không cần `npm install`.

## 2. Chạy

Từ thư mục gốc repo:

```bash
# In prompt + response schema, KHÔNG gọi mạng, KHÔNG cần khóa API
node backend/scripts/ai-moderation/run.mjs --dry-run

# In prompt + schema cho riêng một mẫu
node backend/scripts/ai-moderation/run.mjs --dry-run --sample mau-01-dat-coc

# Liệt kê các mẫu có sẵn (kèm kỳ vọng)
node backend/scripts/ai-moderation/run.mjs --list

# Chạy thật trên cả 7 mẫu (CẦN GEMINI_API_KEY)
export GEMINI_API_KEY=<khóa-api-của-bạn>
node backend/scripts/ai-moderation/run.mjs

# Chạy thật trên một mẫu
node backend/scripts/ai-moderation/run.mjs --sample mau-06-luong-anh
```

Trên PowerShell:

```powershell
$env:GEMINI_API_KEY = '<khóa-api-của-bạn>'
node backend/scripts/ai-moderation/run.mjs
```

### Khóa API **bắt buộc** đến từ biến môi trường

- Khóa được đọc bằng `process.env.GEMINI_API_KEY` — **không** có khóa nào nằm trong mã
  nguồn này.
- Khóa **không** được ghi vào log, in ra màn hình, hay lưu vào báo cáo JSON.
- Thiếu khóa → công cụ in hướng dẫn và thoát với mã lỗi `1`; **không** phải lỗi 500
  ngầm.
- Nếu cần khóa cho lần chạy trong CI, hãy khai báo nó ở kho bí mật của CI, không commit
  vào `.env` nào đã theo dõi phiên bản.

### Tuỳ chọn khác

| Tuỳ chọn | Ý nghĩa |
| --- | --- |
| `--report <đường dẫn>` | Nơi ghi báo cáo JSON (mặc định `.scratch/ai-moderation/notes/01-báo-cao-thu.json`) |
| `--model <tên model>` | Model dùng (mặc định `gemini-3.5-flash-lite`, đọc từ `AI_MODEL` nếu có) |

## 3. Cấu trúc thư mục

```
backend/scripts/ai-moderation/
├── prompt.mjs   # INSTRUCTIONS, buildDataBlock, buildPrompt, RESPONSE_SCHEMA, VIOLATION_CODES
├── samples.mjs  # SAMPLES — 7 mẫu tin tuyển dụng + kỳ vọng của từng mẫu
├── run.mjs      # CLI: gọi Gemini, kiểm tra bằng chứng, in báo cáo, ghi file JSON
└── README.md    # File này
```

`prompt.mjs` là **nguồn sự thật** cho phần prompt dùng chung. Backend Java (ticket 02,
`AiPromptBuilder`) phải dùng **nguyên văn** nội dung `INSTRUCTIONS` và
`DATA_BLOCK_TEMPLATE` trong `.scratch/ai-moderation/PROMPT.md` mục 5 — không tự viết lại.

## 4. Kết quả đầu ra

Với mỗi mẫu, công cụ in:

| Phần | Ý nghĩa |
| --- | --- |
| `Verdict nhận được` | `OK` / `WARN` / `SUSPECT` do AI trả về |
| `Tóm tắt` | Một câu tóm tắt tiếng Việt |
| `Lý do được giữ` | Danh sách `{code, evidence, detail}` — mỗi lý do kèm mã vi phạm và câu trích |
| `Lý do bị LOẠI BÓ` | Các lý do vi phạm quy tắc bằng chứng nguyên văn (xem mục 5) |
| `Đánh giá tay` | 3 dòng tự đối chiếu: verdict có khớp kỳ vọng không, bằng chứng có nguyên văn không, verdict `OK` có reasons rỗng không |

Sau khi chạy hết, công cụ ghi báo cáo JSON (mảng `results`) để đối chiếu tay hoặc
làm căn cứ cho ticket đánh giá chất lượng AI (ticket 07).

### Cách đọc verdict

- `OK` — không phát hiện vi phạm. `reasons` phải rỗng.
- `WARN` — có dấu hiệu vi phạm nhưng chưa rõ ràng.
- `SUSPECT` — vi phạm rõ ràng.

## 5. Quy tắc bằng chứng nguyên văn (chống bịa đặt)

Đây là cơ chế quan trọng nhất của tính năng: **mọi lý do AI nêu phải kèm một câu trích
nguyên văn có thật trong tin tuyển dụng**. Lý do không trích được câu nguyên văn thì
**không được đưa vào kết quả**.

Công cụ thực thi quy tắc này theo 2 lớp:

1. **Lớp schema** — `RESPONSE_SCHEMA` giới hạn `code` trong đúng 6 mã hợp lệ, nên
   model không thể tự sinh mã lạ.
2. **Lớp validate** — sau khi parse JSON, mỗi `reason` được kiểm tra:
   - `code` phải thuộc 6 mã hợp lệ → nếu không thì **loại bỏ** lý do đó.
   - `evidence` phải khác rỗng → nếu không thì **loại bỏ** lý do đó.
   - `evidence` phải xuất hiện **nguyên văn** trong nội dung tin → nếu không thì **loại bỏ**
     lý do đó và **báo cáo rõ** trong mục "Lý do bị LOẠI BÓ".

Cách so khớp: chuỗi được chuẩn hoá Unicode (NFC), gộp khoảng trắng thành một dấu cách,
và so sánh không phân biệt hoa/thường. **Không** dùng so khớp "mờ" (fuzzy) — vì mục
tiêu là phát hiện AI **bịa** câu trích, mà so khớp mờ sẽ không phát hiện được điều đó.
Bù lại, chuẩn hoá khoảng trắng + hoa/thường tránh việc loại oan lý do hợp lệ chỉ vì AI
đổi cách viết hoa một từ.

> **Lưu ý cho backend Java (ticket 02/03):** hãy hiện thực đúng quy tắc này trong
> `AiReviewService.validate(...)`. Lý do bị loại **không được ghi vào DB** (chỉ ghi log),
> và lý do bị loại **không được tính vào kết quả trả về cho quản trị viên** — nếu không
> thì quản trị viên sẽ thấy bằng chứng bịa đặt mà tin tuyển dụng không có câu đó.

## 6. Hạn mức gọi miễn phí

**Quan trọng — hãy đọc kỹ đoạn này trước khi tin vào bất kỳ con số nào.**

Trang hạn mức chính thức của Google (<https://ai.google.dev/gemini-api/docs/rate-limits>)
**không còn công bố bảng hạn mức free tier theo từng model**. Trang đó chỉ còn bảng hạn
mức theo mức sử dụng (spend-based), điều kiện nâng tier, hạn mức Batch API — rồi trỏ
người đọc tới **trang Rate Limits trong AI Studio** để xem hạn mức thật của project,
và ghi rõ: *"Specified rate limits are not guaranteed and actual capacity may vary."*

Con số **15 lượt/phút, 250.000 token/phút, 500 lượt/ngày** cho `gemini-3.5-flash-lite`
là giá trị **quan sát được từ bảng hạn mức trong AI Studio** (được nhiều nhà phát triển
ghi lại vào tháng 9 và tháng 10 năm 2026), **không** phải bảng do Google công bố. Hai
nguồn quan sát độc lập cho cùng một kết quả, nên con số này đáng tin — nhưng vẫn phải
xem lại ở AI Studio của project thật.

Các quy tắc **do Google công bố** (chắc chắn):

- Hạn mức tính **theo project**, không phải theo khóa API — tạo thêm khóa trong cùng
  project không tăng hạn mức.
- Hạn mức ngày (RPD) **reset lúc 00:00 giờ Thái Bình Dương**.
- Hạn mức được đo theo 3 chiều: lượt/phút (RPM), token/phút (TPM), lượt/ngày (RPD).
  Vượt **bất kỳ** chiều nào cũng nhận lỗi `429 RESOURCE_EXHAUSTED`, kể cả khi hai chiều
  còn lại còn dư.

Nguồn: <https://ai.google.dev/gemini-api/docs/rate-limits> (quy tắc chung),
<https://ai.google.dev/gemini-api/docs/pricing> (giá `gemini-3.5-flash-lite`: miễn phí ở
free tier; trả phí $0,30 / 1M token đầu vào và $2,50 / 1M token đầu ra).

Một lần chạy đủ 7 mẫu = 7 lượt — tức là khoảng **1,4%** hạn mức 500 lượt/ngày.

Nếu gặp `429 RESOURCE_EXCEEDED`, công cụ in thông báo lỗi của Gemini — không phải
stack trace. Backend Java cần dịch lỗi này thành thông điệp tiếng Việt
(`QUOTA_EXCEEDED` → "Đã hết hạn mức gọi AI. Vui lòng thử lại sau.") theo `CONTRACT.md`
mục 5.2.

## 7. Ghi chú

- Công cụ **không** gọi API nào ngoài Gemini `generateContent`.
- Không có state, không cần database, không cần build.
- Script dùng `import.meta.url` để tự nhận biết có được chạy trực tiếp hay không, nên
  có thể `import` các hàm (`isEvidenceVerbatim`, `filterReasons`, `validateShape`) từ
  `run.mjs` để viết script kiểm chung nhanh mà không kích hoạt CLI.
