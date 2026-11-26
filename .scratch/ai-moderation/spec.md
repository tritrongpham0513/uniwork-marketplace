# Spec — Kiểm duyệt nội dung tin tuyển dụng bằng AI

> Tài liệu đặc tả cho tính năng **AI kiểm duyệt nội dung tin tuyển dụng** phía quản trị viên.
> Nguồn sự thật về thuật ngữ: [`../GLOSSARY.md`](../GLOSSARY.md).
> Quyết định kiến trúc liên quan: [`../docs/adr/0003-job-requires-admin-review-before-going-live.md`](../docs/adr/0003-job-requires-admin-review-before-going-live.md).

**Trạng thái:** đã chốt thiết kế, chưa implement.
**Phạm vi:** đúng **một** tính năng — AI gắn cờ vi phạm cho tin tuyển dụng. AI **không** bao giờ tự quyết định thay quản trị viên.

---

## Problem Statement

Hiện tại, mọi tin tuyển dụng do nhà tuyển dụng đăng đều phải chờ quản trị viên đọc thủ công ở trang **Duyệt tin tuyển dụng** (`/admin/jobs`). Với một số nhóm việc có nhiều tin (nhà hàng, dịch vụ ăn uống, bán hàng…), việc đọc từng tin tốn thời gian của quản trị viên, và các tin có nội dung vi phạm — yêu cầu tiền trước, tuyển lao động phi chính quyền, phân biệt đối xử, tuyển ngoài nền tảng — lọt qua dễ dàng vì người đọc không có đủ thời gian.

Quản trị viên cũng không có công cụ nào để biết một tin nào "có vấn đề" mà phải tự phân tích. Trong khi đó, hệ thống **đã có sẵn** những dữ liệu có thể giúp phán đoán khách quan: **bảng xếp hạng lương** theo nhóm việc × Tỉnh / Thành phố, và **điểm uy tín** của nhà tuyển dụng. Nhưng những dữ liệu đó hiện chỉ dùng để hiển thị, chưa ai dùng để đánh giá chất lượng nội dung tin.

Vấn đề cần giải quyết: **làm sao để quản trị viên nhanh chóng biết tin nào cần soi kỹ, mà vẫn giữ nguyên quy trình quyết định cuối cùng là của con người.**

---

## Solution

Bổ sung một lớp **gợi ý bằng AI** vào quy trình duyệt tin tuyển dụng:

- Khi nhà tuyển dụng **đăng tin mới** hoặc **sửa tin đã được duyệt** (tin quay lại trạng thái chờ duyệt), hệ thống **tự động** gửi nội dung tin cho AI kiểm tra ở chế độ nền, không chặn thao tác của nhà tuyển dụng.
- AI phân loại tin theo **6 mã vi phạm** đã định nghĩa sẵn, mỗi lý do phải kèm **câu trích nguyên văn** có trong tin làm bằng chứng.
- Kết quả được ghi vào chính bản ghi tin tuyển dụng. Quản trị viên vào trang duyệt thấy **tin bị gắn cờ nổi lên đầu danh sách**, kèm badge màu theo mức độ, và đọc được từng lý do kèm bằng chứng.
- Nếu AI không chạy được (lỗi mạng, hết hạn mức, chưa cấu hình khóa), tin **vẫn hiển thị bình thường trong hàng đợi duyệt** và được đánh dấu "chưa kiểm tra"; quản trị viên có nút kiểm tra thủ công.
- **AI không bao giờ tự chuyển trạng thái tin.** Tin vẫn ở trạng thái chờ duyệt, quản trị viên vẫn bấm Duyệt / Từ chối như hiện tại. Nhà tuyển dụng không được thông báo rằng tin của họ bị gắn cờ.

**Ràng buộc chi phí:** dùng free tier của Google AI Studio (`gemini-3.5-flash-lite`, 500 lượt/ngày). Không nạp tiền, không cần thẻ tín dụng.

---

## User Stories

### Nhà tuyển dụng (EMPLOYER)

1. As a nhà tuyển dụng, I want đăng tin tuyển dụng mà không phải chờ hệ thống kiểm tra AI, so that tôi đăng tin nhanh và không bị gián đoạn.
2. As a nhà tuyển dụng, I want tin của tôi không bị chặn vì AI gắn cờ, so that tôi không mất tin đã đăng.
3. As a nhà tuyển dụng, I want tin của tôi vẫn được gửi tới quản trị viên như bình thường, so that quy trình duyệt tin không thay đổi.
4. As a nhà tuyển dụng, I want không bị thông báo "tin của bạn bị AI gắn cờ", so that tôi không phải xử lý khiếu nại mà hệ thống chưa có đường thoát.
5. As a nhà tuyển dụng, I want biết nội dung tin của tôi sẽ được kiểm tra tự động, so that tôi hiểu vì sao tin lọt qua bộ lọc.
6. As a nhà tuyển dụng, I want sửa lại tin đã được duyệt thì tin vẫn được kiểm tra lại, so that nội dung mới không lọt qua.
7. As a nhà tuyển dụng, I want hệ thống không gọi AI lại khi sửa tin vẫn đang chờ duyệt, so that tôi không tiêu tốn hạn mức của hệ thống một cách vô ích.
8. As a nhà tuyển dụng, I want tin của tôi không bị gắn cờ oan một cách âm thầm, so that tôi tin tưởng quy trình duyệt tin.

### Quản trị viên (ADMIN)

9. As a quản trị viên, I want xem các tin bị gắn cờ nổi lên đầu danh sách chờ duyệt, so that tôi xử lý tin đáng ngờ trước.
10. As a quản trị viên, I want thấy mức độ vi phạm bằng badge màu, so that tôi biết tin nào cần soi kỹ và tin nào có thể duyệt nhanh.
11. As a quản trị viên, I want đọc được lý do cụ thể kèm câu trích nguyên văn trong tin, so that tôi tự kiểm chứng được chứ không phải tin theo AI.
12. As a quản trị viên, I want biết AI đã kiểm tra tin lúc nào, so that tôi biết kết quả có còn giá trị hay không.
13. As a quản trị viên, I want thấy "chưa kiểm tra" khi AI không chạy được, so that tôi không tưởng tin đó đã an toàn.
14. As a quản trị viên, I want bấm kiểm tra thủ công một tin, so that tôi vẫn có kết quả khi AI tự động không chạy.
15. As a quản trị viên, I want kiểm tra lại một tin đã có kết quả, so that tôi đối chiếu được khi nghi ngờ kết quả cũ.
16. As a quản trị viên, I want thấy mức lương tin được so với mức trung bình ngành và tỉnh, so that tôi nhận ra tin trả lương bất thường.
17. As a quản trị viên, I want biết nhà tuyển dụng đã được xác minh và có điểm uy tín bao nhiêu, so that tôi cân nhắc uy tín khi duyệt tin.
18. As a quản trị viên, I want bấm Duyệt / Từ chối y hệt hiện tại, so that quy trình duyệt tin không bị thay đổi.
19. As a quản trị viên, I want tin tuyển dụng không bị AI tự ý chuyển trạng thái, so that quyết định cuối cùng luôn là của tôi.
20. As a quản trị viên, I want biết góp ý AI chỉ là góp ý, so that tôi không hiểu nhầm là quyết định của hệ thống.
21. As a quản trị viên, I want không phải đăng nhập lại để xem kết quả kiểm tra AI, so that quy trình duyệt không bị gián đoạn.

### Vận hành / người kỹ thuật

22. As a người kỹ thuật, I want chỉ cấu hình một khóa API là tính năng chạy, so that việc triển khai đơn giản.
23. As a người kỹ thuật, I want đổi nhà cung cấp AI qua cấu hình mà không sửa mã nghiệp vụ, so that tôi không bị kẹt với một provider.
24. As a người kỹ thuật, I want đo được số lượt AI đã gọi và chi phí phát sinh, so that tôi không vô tình vượt hạn mức miễn phí.
25. As a người kỹ thuật, I want AI lỗi không được làm hỏng luồng đăng tin, so that lỗi của AI không thành lỗi của hệ thống.
26. As a người kỹ thuật, I want lỗi hạn mức của AI được trả về thông điệp tiếng Việt dễ hiểu, so that người dùng không thấy lỗi 500 kỹ thuật.
27. As a người kỹ thuật, I want nội dung tin do người dùng nhập không thể ra lệnh cho AI, so that không thể chèn hướng dẫn để lái kết quả.
28. As a người kỹ thuật, I want mọi lý do AI nêu đều có thể đối chiếu nguyên văn với tin, so that kết quả không bị bịa đặt.

---

## Implementation Decisions

### 1. Phạm vi và ranh giới

- Tính năng duy nhất trong đợt này: **AI kiểm duyệt nội dung tin tuyển dụng**.
- Không mở rộng sang viết thư ứng tuyển, viết mô tả tin tuyển dụng, gợi ý ứng viên, hay tìm kiếm ngữ nghĩa. (Những tính năng đó đã được cân nhắc và loại khỏi phạm vi.)
- Không có bảng dữ liệu mới. Kết quả kiểm tra lưu trên chính bản ghi tin tuyển dụng.
- Không tạo feature frontend mới; logic nằm trong feature `admin` hiện có.

### 2. Vòng đời vẫn theo ADR 0003

- Tin mới đăng → trạng thái chờ duyệt → AI kiểm tra nền → gắn cờ → quản trị viên quyết định.
- **AI không có quyền chuyển trạng thái tin.** Không tự duyệt, không tự từ chối. Nút Duyệt / Từ chối của quản trị viên giữ nguyên.
- ADR 0003 không bị sửa đổi. Tính năng này chỉ **bổ sung thông tin** cho quản trị viên, không thay đổi quy trình. Sẽ có một ADR riêng giải thích vì sao lớp gợi ý AI nằm ngoài quyết định duyệt tin.

### 3. Điểm chạy AI

- **Tạo tin mới**: chạy kiểm tra AI.
- **Sửa tin**: chạy kiểm tra AI **chỉ khi** tin đã được duyệt và bị sửa thành bản chờ duyệt. Sửa một tin vốn đang chờ duyệt thì **không** chạy lại (tránh tiêu hạn mức vô ích).
- Xóa/hủy tin: không cần kiểm tra.
- Kiểm tra AI chạy **bất đồng bộ**, sau khi response HTTP đã trả về cho nhà tuyển dụng.

### 4. Hạ tầng bất đồng bộ

- Dùng cơ chế `@Async` với một executor riêng cho tác vụ AI, tách khỏi executor gửi email đang có.
- Hệ thống **không có** hàng đợi bền vững (không có Redis/BullMQ). Vì vậy tác vụ nền có thể mất nếu instance bị đánh thức/ngủ giữa chừng.
- Hệ quả được chấp nhận: tin không có kết quả AI sẽ hiển thị "chưa kiểm tra", và quản trị viên có thể kiểm tra thủ công.
- **Không** thêm cơ chế quét lại theo lịch — chi phí triển khai không tương xứng với phạm vi demo.

### 5. Provider AI

- Provider mặc định: **Google AI Studio** (free tier), model `gemini-3.5-flash-lite`.
- Model nằm trong cấu hình, không hardcode trong mã nghiệp vụ.
- Kiến trúc provider trung lập: một interface cho lớp kiểm duyệt, một hiện thực cho Gemini. Đổi sang nhà cung cấp khác chỉ cần thêm hiện thực mới + đổi cấu hình.
- Backend gọi provider qua HTTP client sẵn có của Spring. **Không thêm dependency mới** — dùng `RestClient`/`RestTemplate`, không nhét thư viện SDK của hệ sinh thái AI vào dự án Java.
- Endpoint dùng: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` với `responseMimeType: application/json` và `responseSchema`.
- Timeout: 30 giây. Hết giờ → coi như lỗi (không ghi kết quả).
- Khóa API đọc từ biến môi trường. **Không** có trong mã nguồn, không ghi log.

### 6. Cấu trúc đầu vào cho AI

Đầu vào gồm, lấy từ dữ liệu sẵn có:

- Tiêu đề, mô tả, danh sách yêu cầu, danh sách quyền lợi của tin.
- Mức lương đã quy đổi về **đồng/giờ** (dùng bảng quy đổi hiện có của hệ thống) kèm đơn vị trả lương gốc.
- Địa điểm: Tỉnh / Thành phố, xã/phường, địa chỉ chi tiết.
- **Bảng xếp hạng lương** của nhóm việc × tỉnh: mức trung bình, thấp nhất, cao nhất, cỡ mẫu — làm căn cứ để phán đoán mức lương bất thường.
- **Uy tín nhà tuyển dụng**: đã xác minh hay chưa, điểm uy tín trung bình, số lượt đánh giá.
- Kỹ năng yêu cầu, số suất tuyển, hình thức làm việc, loại hình làm việc.

**Không** gửi dữ liệu cá nhân của sinh viên — tính năng này không đụng tới hồ sơ sinh viên, hồ sơ CV hay đơn ứng tuyển.

### 7. Mã vi phạm

Sáu mã, cố định:

| Mã                  | Nghĩa                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| `FEE_ADVANCE`       | Yêu cầu tiền trước (đặt cọc, nộp phí, mua dụng cụ trước khi làm)                    |
| `UNREGISTERED_WORK` | Tuyển lao động phi chính quyền (không cần CCCD, không ký hợp đồng, không cần hồ sơ) |
| `OFF_PLATFORM`      | Tuyển ngoài nền tảng (liên hệ Zalo/telegram/SĐT, gửi CV qua email)                  |
| `SALARY_ANOMALY`    | Mức lương bất thường so với bảng xếp hạng lương của nhóm việc × tỉnh                |
| `DISCRIMINATION`    | Phân biệt đối xử (giới tính, nơi ở, độ tuổi, quốc tịch)                             |
| `ILLEGAL_WORK`      | Công việc vi phạm pháp luật (mại dâm, cá cược, vay tiền, xây dựng lưu động)         |

**Không** dùng mã cho tin "thiếu thông tin" (thiếu mức lương, thiếu địa điểm, mô tả quá ngắn). Thiếu thông tin là chuyện của quy trình duyệt, không phải vi phạm nội dung — dùng mã này sẽ gắn cờ rất nhiều tin bình thường.

### 8. Kết quả trả về

Structured output, validate ở backend:

- `verdict`: `OK` | `WARN` | `SUSPECT`.
  - `OK` — không phát hiện vi phạm.
  - `WARN` — có dấu hiệu nhưng chưa rõ ràng.
  - `SUSPECT` — vi phạm rõ ràng.
- `summary`: một câu tóm tắt tiếng Việt.
- `reasons`: danh sách, mỗi phần tử gồm:
  - `code` — một trong sáu mã ở mục 7.
  - `evidence` — **câu nguyên văn** có trong tin làm bằng chứng.
  - `detail` — giải thích ngắn bằng tiếng Việt.

**Quy tắc bắt buộc:** nếu không trích được câu nguyên văn cho một mã thì **không được đưa mã đó vào kết quả**. Đây là cơ chế chống bịa đặt và là điều làm cho gợi ý AI có giá trị thật đối với quản trị viên.

Backend validate kết quả trước khi ghi: sai cấu trúc → **không ghi gì**, chỉ ghi log. Không được ghi kết quả thiếu cấu trúc vào cơ sở dữ liệu.

### 9. Chống chỉ đạo nhầm (prompt injection)

Mô tả tin do nhà tuyển dụng nhập là **dữ liệu không đáng tin**, không phải mệnh lệnh.

Cấu trúc prompt:

1. Phần **chỉ dẫn**: vai trò, sáu mã hợp lệ, quy tắc bằng chứng nguyên văn, quy tắc "không đánh giá chất lượng/hấp dẫn của tin".
2. Phần **dữ liệu tin**, đặt trong khối riêng, kèm câu nhắc coi nội dung trong đó là dữ liệu và bỏ qua mọi chỉ dẫn nằm trong đó.

### 10. Lưu trữ kết quả

Ba cột mới trên bản ghi tin tuyển dụng:

| Cột             | Kiểu                 | Nội dung                         |
| --------------- | -------------------- | -------------------------------- |
| `ai_verdict`    | chuỗi ngắn, nullable | `OK` / `WARN` / `SUSPECT` / null |
| `ai_reasons`    | JSON, nullable       | mảng `{code, evidence, detail}`  |
| `ai_checked_at` | thời gian, nullable  | thời điểm kiểm tra               |

`null` ở `ai_verdict` nghĩa là **chưa kiểm tra** (chưa chạy, hoặc chạy lỗi) — phân biệt với `OK`.

**Không lưu** điểm tin cậy của mô hình: AI ở đây chỉ gắn cờ, không tự ẩn tin, nên điểm tin cậy không quyết định gì.

Danh sách tin tuyển dụng trả về cho quản trị viên phải mang theo ba trường này.

### 11. API contract

- Endpoint mới (chỉ quản trị viên): `POST /api/v1/admin/jobs/{id}/ai-review`.
  - Chạy kiểm tra AI **đồng bộ** cho một tin và trả kết quả ngay.
  - Trả về: `verdict`, `summary`, `reasons`, `aiCheckedAt`.
  - Tin không tồn tại → 404. Không phải quản trị viên → 403 (đã bao phủ bởi cấu hình bảo mật hiện có).
  - AI lỗi → thông điệp tiếng Việt nói rõ nguyên nhân (hết hạn mức / lỗi dịch vụ), **không** phải lỗi 500.
- Endpoint duyệt tin hiện có **không đổi** shape.
- Hợp đồng API chung giữ nguyên: thành công có `data`, thất bại có `error` kèm `fieldErrors`.

### 12. Quy tắc phân quyền

- Chỉ quản trị viên được gọi endpoint kiểm tra AI và được xem kết quả.
- Nhà tuyển dụng **không** được xem kết quả AI của tin mình — kể cả trong hồ sơ công khai.
- Nhà tuyển dụng **không** nhận thông báo về việc AI gắn cờ tin của họ.
  - Lý do: báo tin bị gắn cờ mà không có đường khiếu nại khiến nhà tuyển dụng chỉ còn hai lựa chọn là im lặng hoặc bỏ nền tảng. Cơ chế báo cáo tin lừa đảo chưa tồn tại trong hệ thống.
- Trang danh sách tin tuyển dụng công khai **không** hiển thị cờ AI.

### 13. Giao diện quản trị viên

Trang Duyệt tin tuyển dụng:

- **Sắp xếp**: tin đã có kết quả AI và bị gắn cờ nổi lên đầu danh sách. Trong nhóm đó, `SUSPECT` trước `WARN`. Tin `OK` và tin chưa kiểm tra nằm sau, theo thứ tự thời gian hiện tại.
- **Badge** trên mỗi tin:
  - `SUSPECT` → đỏ, nhãn "AI: cần xem"
  - `WARN` → hổ phách, nhãn "AI: nghi ngờ"
  - `OK` → xanh, nhãn "AI: ổn"
  - chưa có kết quả → xám, nhãn "Chưa kiểm tra"
- **Dialog xem nội dung**: hiện phần đánh giá của AI gồm verdict, tóm tắt, và từng lý do với mã, câu trích bằng chứng, giải thích. Bên dưới ghi rõ: **đây là góp ý của AI, quyết định vẫn là của quản trị viên**.
- **Nút "Kiểm tra bằng AI"**: gọi endpoint kiểm tra thủ công, hiện kết quả ngay trong dialog. Mỗi lần bấm là **một lượt AI**. Dùng được cho cả tin chưa kiểm tra lẫn tin đã có kết quả (để kiểm tra lại).
- Thứ tự hiển thị trong dialog: nội dung tin trước, góp ý AI sau — để quản trị viên tự đối chiếu.

### 14. Giao diện nhà tuyển dụng

- Form đăng tin tuyển dụng: thêm **một dòng** thông báo cho biết nội dung tin sẽ được kiểm tra tự động bằng AI.
- **Không** hiện kết quả, mức độ, hay mã vi phạm cho nhà tuyển dụng.
- **Không** hiện cờ AI trên tin trong danh sách của nhà tuyển dụng.

### 15. Cấu hình

| Biến             | Mặc định                           | Ý nghĩa                   |
| ---------------- | ---------------------------------- | ------------------------- |
| `AI_ENABLED`     | `false` ở production, `true` ở dev | Bật/tắt toàn bộ tính năng |
| `AI_PROVIDER`    | `gemini`                           | Nhà cung cấp AI           |
| `AI_MODEL`       | `gemini-3.5-flash-lite`            | Model dùng cho kiểm duyệt |
| `GEMINI_API_KEY` | rỗng                               | Khóa API                  |

- Thiếu khóa API → tính năng **ẩn**, không phải lỗi. Nhà tuyển dụng đăng tin bình thường, quản trị viên không thấy nút.
- Mặc định tắt ở production để tránh tiêu hạn mức miễn phí ngoài ý muốn.
- Khóa phải được khai báo trong môi trường triển khai dưới dạng **bí mật** (không ghi trong tệp cấu hình theo dõi phiên bản).

### 16. Chi phí và hạn mức

- Free tier của Google AI Studio: model `gemini-3.5-flash-lite` — 15 lượt/phút, 500 lượt/ngày, reset lúc 00:00 giờ Thái Bình Dương.
- Chi phí tiền mặt: **0**.
- Một lượt kiểm tra tiêu khoảng 400–600 token đầu vào và 200–400 token đầu ra.
- Rủi ro hết hạn mức thấp ở phạm vi demo, nhưng **phải** xử lý lỗi hạn mức bằng thông điệp tiếng Việt.
- Nếu sau này chuyển sang trả phí, cùng model đó có giá khoảng $0,30 / 1M token đầu vào và $2,50 / 1M token đầu ra → một lượt khoảng $0,0013.
- Số lượt AI đã gọi **không** lưu thành bảng riêng. Với phạm vi demo, đủ để theo dõi qua log ứng dụng. Nếu cần báo cáo chi phí thì thêm bảng sau.

### 17. Kiến trúc module

**Backend** — lớp kiểm duyệt AI nằm cạnh các service hiện có:

- Interface provider: nhận đầu vào đã dựng sẵn, trả về kết quả đã phân tích.
- Hiện thực Gemini: dựng prompt + schema, gọi HTTP, parse JSON.
- Service kiểm duyệt tin: điều phối — tải tin, dựng đầu vào (kèm bảng xếp hạng lương và uy tín nhà tuyển dụng), gọi provider, validate, ghi kết quả.
- Service dựng prompt: tách riêng để có thể chỉnh nội dung chỉ dẫn mà không đụng code gọi HTTP.
- Gọi AI sau khi tạo/sửa tin nằm trong service tin tuyển dụng hiện có, ở một điểm gọi duy nhất.

**Frontend** — không tạo feature mới:

- Kiểu dữ liệu và nhãn hiển thị: trong feature `admin`.
- Hàm gọi API + hook: trong feature `admin` hiện có, theo đúng mẫu service/hook sẵn có.
- Hàm sắp xếp theo mức độ vi phạm: một hàm thuần trong thư mục `lib` của feature `admin`, để test được độc lập.

### 18. Hợp đồng giữa các tầng

- Tất cả endpoint trả về theo hợp đồng API chung của hệ thống.
- Kiểm tra AI thủ công trả về cùng hình dạng với kết quả lưu trong bản ghi tin, để giao diện render một chỗ.
- Kết quả AI tải về từ danh sách tin tuyển dụng phải khớp với kết quả từ endpoint kiểm tra thủ công.

### 19. Tài liệu

- Một ADR mới: vì sao có lớp gợi ý AI, vì sao AI không tự quyết, vì sao không báo nhà tuyển dụng.
- Cập nhật bản đồ tính năng: thêm dòng cho kiểm duyệt nội dung bằng AI trong phần quản trị viên.

---

## Testing Decisions

### Nguyên tắc

Chỉ kiểm tra **hành vi bên ngoài** (kết quả quan sát được từ API hoặc từ giao diện), không kiểm tra cấu trúc nội bộ. Không assert lời gọi vào provider nội bộ; thay vào đó dùng một provider giả trả về kết quả cố định.

### Điểm cắt (seam) để kiểm thử

Ưu tiên dùng seam đã có sẵn; chỉ thêm seam mới ở mức cao nhất cần thiết.

**Seam 1 — service tin tuyển dụng (đã có, dùng lại).**
Tồn tại bộ test service tin tuyển dụng với Mockito. Bổ sung một bộ giả cho lớp kiểm duyệt AI vào đó, rồi kiểm tra: đăng tin mới có phát sinh lệnh kiểm tra; sửa tin đã duyệt có phát sinh lệnh kiểm tra; sửa tin vẫn đang chờ duyệt thì **không** phát sinh. Seam này đã có sẵn, không thêm gì.

**Seam 2 — lớp kiểm duyệt AI với provider giả (mới, mức cao nhất cần thiết).**
Provider giả trả về JSON cố định. Kiểm tra:

- Kết quả hợp lệ → `ai_verdict`, `ai_reasons`, `ai_checked_at` được ghi đúng vào bản ghi tin.
- Provider trả về cấu trúc sai → **không ghi gì** vào bản ghi tin, `ai_verdict` giữ nguyên `null`.
- Provider ném lỗi (mô phỏng hết hạn mức) → `ai_verdict` giữ nguyên `null`, hàm không ném lỗi ra ngoài.
- Tin không tồn tại → trả về lỗi nghiệp vụ 404.

**Seam 3 — endpoint quản trị viên (đã có, dùng lại).**
Tồn tại bộ test controller dùng MockMvc với `GlobalExceptionHandler`. Bổ sung: gọi endpoint kiểm tra AI trả về đúng mã và hình dạng; lỗi hạn mức của AI trả về thông điệp tiếng Việt chứ không phải 500.

**Seam 4 — hàm sắp xếp ở frontend (mới, hàm thuần).**
Một hàm thuần sắp xếp danh sách tin theo mức độ vi phạm. Bộ test Vitest cho hàm này: tin `SUSPECT` trước `WARN` trước `OK` trước chưa kiểm tra; thứ tự trong cùng nhóm giữ nguyên; danh sách rỗng không lỗi. Đây là seam hẹ nhất nhưng là nơi dễ sai nhất, nên tách riêng.

**Không** kiểm thử: cấu trúc prompt (nội dung chỉ dẫn) bằng test tự động — đây là thứ cần đánh giá tay bằng bộ mẫu thật, không phải test tự động.

### Bộ mẫu dùng để đánh giá tay chất lượng AI

Bảy mẫu tin thật, đánh giá tay trước khi trình bày:

| #   | Nội dung tin                                                                  | Kỳ vọng                                                   |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Yêu cầu đặt cọc tiền để giữ chỗ làm                                           | `SUSPECT` + `FEE_ADVANCE`, bằng chứng là câu có "đặt cọc" |
| 2   | Thuê sinh viên làm thêm, không cần CCCD                                       | `SUSPECT` + `UNREGISTERED_WORK`                           |
| 3   | Mời ứng tuyển qua Zalo, không cần lên nền tảng                                | `SUSPECT` + `OFF_PLATFORM`                                |
| 4   | Điều kiện chỉ nam, không ở trọ, dưới 20 tuổi không xét                        | `SUSPECT` + `DISCRIMINATION`                              |
| 5   | Công việc liên quan mại dâm                                                   | `SUSPECT` + `ILLEGAL_WORK`                                |
| 6   | Lương 500.000đ/giờ ở nhóm nhà hàng tại một tỉnh có mức trung bình 28.000đ/giờ | `WARN` hoặc `SUSPECT` + `SALARY_ANOMALY`                  |
| 7   | Tin bình thường, lương 30.000đ/giờ, đủ thông tin                              | `OK`, danh sách lý do rỗng                                |

**Tiêu chí nghiệm thu:**

1. Verdict đúng với kỳ vọng ở ít nhất 6/7 mẫu.
2. Mọi bằng chứng là **câu nguyên văn** có trong tin — đối chiếu tay.
3. Verdict `OK` thì danh sách lý do rỗng.
4. Tin tuyển dụng không bị thay đổi trạng thái; quản trị viên vẫn quyết định như trước.
5. Nhà tuyển dụng đăng tin có nội dung vi phạm vẫn **không bị chặn** — vẫn vào hàng đợi duyệt bình thường.
6. Khi mô phỏng lỗi AI, giao diện hiện "chưa kiểm tra" chứ không phải lỗi kỹ thuật.

---

## Out of Scope

- **Viết thư ứng tuyển bằng AI** cho sinh viên.
- **Viết mô tả tin tuyển dụng bằng AI** cho nhà tuyển dụng.
- **Gợi ý ứng viên phù hợp** cho nhà tuyển dụng.
- **Tìm kiếm ngữ nghĩa** / gợi ý tìm kiếm — cần vector embedding và kho vector, nằm ngoài phạm vi.
- **Kiểm duyệt đánh giá hai chiều** bằng AI.
- **Tự động duyệt / tự động từ chối** tin tuyển dụng — AI không bao giờ tự quyết.
- **Cơ chế khiếu nại** cho nhà tuyển dụng khi tin bị gắn cờ — chưa có, và là lý do nhà tuyển dụng không được thông báo.
- **Cơ chế báo cáo tin lừa đảo** — chưa tồn tại trong hệ thống.
- **Bảng lịch sử các lần kiểm tra AI** — chỉ lưu kết quả gần nhất trên bản ghi tin.
- **Bộ đếm số lượt AI đã gọi / báo cáo chi phí** — theo dõi qua log ứng dụng.
- **Hàng đợi bền vững** cho tác vụ AI — dùng cơ chế bất đồng bộ sẵn có của ứng dụng.
- **Tự động kiểm tra lại** các tin chưa có kết quả — quản trị viên kiểm tra thủ công.
- **Streaming** kết quả — chờ trả về một lần.
- **Bộ lọc mức độ vi phạm bằng luật trước khi gọi AI** — đã cân nhắc và loại bỏ, làm theo mô hình "AI thuần".
- **Gửi CV hoặc dữ liệu cá nhân của sinh viên** cho AI — tính năng này không đụng tới.
- **Ứng dụng di động** và các tính năng ngoài web.

---

## Further Notes

### Đối chiếu với một dự án tham khảo

Dự án `Costy-social-network` (mạng xã hội) đã làm một tính năng gần giống: phân loại nội dung bài viết bằng AI. Bốn ý đáng mượn:

1. **Lỗi AI không bao giờ làm hỏng luồng chính** — lỗi trả về kết quả rỗng, nội dung vẫn đăng bình thường. Nguyên tắc này được giữ nguyên ở đây.
2. **Structured output có schema cứng** — dùng schema để bắt buộc model trả đúng hình dạng, thay vì parse văn bản tự do.
3. **Cấu hình bật/tắt qua biến môi trường** — có thể tắt tính năng khi thiếu khóa API, không sinh lỗi.
4. **Kiểm tra có tính idempotent** — không tạo kết quả trùng lặp cho cùng một tin.

Hai điểm **không** mượn:

- Họ dùng hàng đợi bền vững (BullMQ + Redis); dự án này không có, nên dùng cơ chế bất đồng bộ sẵn có.
- Họ tự ẩn nội dung khi độ tin cậy vượt ngưỡng; ở đây, tin tuyển dụng **đã** bị chặn sẵn cho tới khi quản trị viên duyệt, nên tự ẩn là vô nghĩa — chỉ cần gắn cờ.
- Họ có bảng trường hợp kiểm duyệt riêng kèm cơ chế khiếu nại; ở đây lưu kết quả ngay trên bản ghi tin tuyển dụng, không thêm bảng.

### Ba việc cần làm trước khi viết mã

1. **Lấy khóa API** từ Google AI Studio (miễn phí, không cần thẻ tín dụng). Xác minh hạn mức thật của dự án tại trang giới hạn của AI Studio — con số 500 lượt/ngày đến từ nguồn thứ ba, không phải con số chính thức từ Google, và hạn mức thực tế có thể thấp hơn.
2. **Thử prompt bằng script Node độc lập** trước khi đưa vào ứng dụng Java: kiểm tra JSON có parse được không, bằng chứng có thật sự là câu nguyên văn không, phán đoán có đúng không. Thử prompt rẻ hơn thử mã.
3. **Chốt câu chữ thông báo** cho nhà tuyển dụng ở form đăng tin, và xác nhận lại câu chữ nhãn hiển thị cho quản trị viên.

### Rủi ro còn lại

| Rủi ro                                          | Mức          | Giảm thiểu                                                                                                            |
| ----------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Tác vụ nền bị mất khi instance ngủ              | Trung bình   | `ai_verdict` null hiển thị rõ "chưa kiểm tra"; nút kiểm tra thủ công                                                  |
| AI gắn cờ oát tin tốt                           | Trung bình   | Phân biệt `WARN` với `SUSPECT`; chỉ `SUSPECT` mới nổi lên đầu; quản trị viên vẫn quyết định                           |
| Chỉ dẫn trong nội dung tin lái kết quả          | Thấp         | Tách khối dữ liệu khỏi phần chỉ dẫn; yêu cầu bằng chứng nguyên văn                                                    |
| Hết hạn mức miễn phí                            | Thấp         | Thông điệp tiếng Việt rõ ràng; đổi model qua cấu hình                                                                 |
| Nội dung tin tuyển dụng đến với nhà cung cấp AI | Thấp         | Đây là dữ liệu do nhà tuyển dụng nhập, không phải dữ liệu cá nhân của sinh viên; có dòng thông báo cho nhà tuyển dụng |
| Quên khai báo khóa khi triển khai               | Cao nếu quên | `AI_ENABLED` mặc định tắt ở production; thiếu khóa → ẩn tính năng, không lỗi                                          |

### Ghi chú về thuật ngữ

Bản spec này dùng đúng thuật ngữ của `GLOSSARY.md`: "tin tuyển dụng", "nhà tuyển dụng", "quản trị viên", "trạng thái tin tuyển dụng", "bảng xếp hạng lương", "Tỉnh / Thành phố", "điểm uy tín", "đã xác minh", "lợi ích" → gọi là **quyền lợi** theo trường dữ liệu `benefits`.
