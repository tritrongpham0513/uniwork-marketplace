# 07 — Kết quả đánh giá tay chất lượng AI trên bộ 7 mẫu

**Ngày chạy:** 26/11/2026
**Mô hình:** `gemini-3.5-flash-lite` (`temperature: 0`, `responseSchema` cố định)
**Đường chạy:** backend Spring Boot thật + MySQL 8.4, qua đúng các endpoint mà quản trị viên dùng.

---

## 1. Đường chạy — khác gì so với ticket 01

Ticket 01 thử prompt bằng script độc lập (`backend/scripts/ai-moderation/run.mjs`) — gọi thẳng Gemini.

Bài đánh giá này chạy qua **đường chạy thật của ứng dụng**:

| Bước | Endpoint                                 | Ai thực hiện                                                                |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 1    | `POST /api/v1/employer/jobs`             | Nhà tuyển dụng đăng tin → tin vào `PENDING_REVIEW`                          |
| 2    | _(nền)_                                  | AI chạy nền (ticket 04) → ghi `ai_verdict` / `ai_reasons` / `ai_checked_at` |
| 3    | `POST /api/v1/admin/jobs/{id}/ai-review` | Quản trị viên bấm "Kiểm tra bằng AI"                                        |
| 4    | `GET /api/v1/admin/jobs`                 | Đọc lại kết quả **đã lưu trên bản ghi tin**                                 |
| 5    | `GET /api/v1/employer/jobs`              | Kiểm tra nhà tuyển dụng không thấy trường AI                                |

Cùng một mã dùng chung với lúc người dùng bấm nút: `JobPost` → `AiContextAssembler` →
`JobContentAssembler` → `AiPromptBuilder` → `GeminiAiProvider` → `AiEvidenceMatcher` → ghi vào DB.

Công cụ: `backend/scripts/ai-moderation/evaluate.mjs` (`--live`).

---

## 2. Kết quả từng mẫu

| #   | Mẫu                          | Kỳ vọng                       | Verdict   | Mã vi phạm                                                       | Đạt |
| --- | ---------------------------- | ----------------------------- | --------- | ---------------------------------------------------------------- | --- |
| 1   | `mau-01-dat-coc`             | SUSPECT + FEE_ADVANCE         | `SUSPECT` | FEE_ADVANCE                                                      | ✅  |
| 2   | `mau-02-khong-can-cccd`      | SUSPECT + UNREGISTERED_WORK   | `SUSPECT` | UNREGISTERED_WORK                                                | ✅  |
| 3   | `mau-03-tuyen-qua-zalo`      | SUSPECT + OFF_PLATFORM        | `SUSPECT` | OFF_PLATFORM                                                     | ✅  |
| 4   | `mau-04-chi-nam-duoi-20-tui` | SUSPECT + DISCRIMINATION      | `SUSPECT` | DISCRIMINATION ×4 + SALARY_ANOMALY                               | ✅  |
| 5   | `mau-05-lien-quan-mai-dam`   | SUSPECT + ILLEGAL_WORK        | `SUSPECT` | ILLEGAL_WORK + UNREGISTERED_WORK + OFF_PLATFORM + DISCRIMINATION | ✅  |
| 6   | `mau-06-luong-anh`           | WARN/SUSPECT + SALARY_ANOMALY | `SUSPECT` | SALARY_ANOMALY                                                   | ✅  |
| 7   | `mau-07-tin-binh-thuong`     | OK, reasons rỗng              | `OK`      | _(rỗng)_                                                         | ✅  |

**Kết quả: 7/7 mẫu có verdict khớp kỳ vọng** (ngưỡng nghiệm thu: 6/7).

### Bằng chứng thực tế AI trích dẫn (đối chiếu tay được)

| Mẫu | Evidence AI trả về                                                                                                        | Có thật trong tin?                          |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | `Đặt cọc 500.000đ để giữ chỗ làm, hoàn lại khi làm xong.`                                                                 | ✅ nguyên văn                               |
| 2   | `- Không cần CCCD, không ký hợp đồng, làm thì công.`                                                                      | ✅ nguyên văn                               |
| 3   | `Ứng viên liên hệ Zalo 0903 456 789, gửi CV qua email nangcong123@gmail.com, không cần lên nền tảng.`                     | ✅ nguyên văn                               |
| 4   | `Chỉ tuyển nam.` / `Không ở trọ, phải tự tìm chỗ ở.` / `Dưới 20 tuổi không xét.` / `Ưu tiên người có hộ chiếu Hồng Kông.` | ✅ nguyên văn ×4                            |
| 5   | `Công việc liên quan mại dâm, đánh giá và đưa khách đi giải trí.`                                                         | ✅ nguyên văn                               |
| 6   | `Muc luong: HOURLY, tu 500000 den 500000 VND (quy doi 500000 - 500000 VND/gio)`                                           | ✅ nguyên văn (dòng mức lương backend dựng) |
| 7   | _(không có lý do)_                                                                                                        | ✅ reasons rỗng                             |

Mọi evidence đều được backend kiểm lại bằng `AiEvidenceMatcher` (NFC → gộp khoảng trắng → không phân biệt hoa thường → `includes`) trước khi ghi vào DB. Trong lần chạy này **không có lý do nào bị loại** — AI không bịa câu trích dẫn.

---

## 3. Đối chiếu tiêu chí nghiệm thu

| Tiêu chí                                   | Kết quả                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Chạy qua đường chạy thật của ứng dụng      | ✅ Có — bảng ở mục 1                                                                                 |
| Verdict đúng ở ≥ 6/7 mẫu                   | ✅ **7/7**                                                                                           |
| Mọi bằng chứng là câu nguyên văn trong tin | ✅ 7/7 (0 lý do bị loại)                                                                             |
| Verdict `OK` → reasons rỗng                | ✅ Mẫu 7 có `reasons: []`                                                                            |
| Tin không bị thay đổi trạng thái           | ✅ Cả 7 mẫu vẫn `PENDING_REVIEW` sau khi kiểm tra                                                    |
| Nhà tuyển dụng không thấy kết quả AI       | ✅ `GET /employer/jobs` không có khoá `ai*` nào                                                      |
| Tin vi phạm vẫn không bị chặn              | ✅ Tin vi phạm tạo qua `POST /employer/jobs` vẫn được tạo bình thường, không lỗi, vào hàng đợi duyệt |
| Lỗi AI → giao diện hiện "chưa kiểm tra"    | ✅ Xem mục 4                                                                                         |
| Kết quả được ghi lại kèm theo              | ✅ File này + `.scratch/ai-moderation/notes/07-bao-cao-danh-gia.json`                                |

---

## 4. Mô phỏng lỗi AI

**Cách mô phỏng:** đặt `AI_MODEL=gemini-model-that-does-not-exist` → nhà cung cấp trả lỗi → backend dịch thành `503 AI_UNAVAILABLE`.

**Kết quả quan sát được trên API:**

```
HTTP 503 | code: AI_UNAVAILABLE | message: Tính năng kiểm duyệt AI chưa được cấu hình.
aiVerdict: null | aiReasons: null | aiCheckedAt: null
status: PENDING_REVIEW
Employer thay khoa AI: []
```

Tức là: lỗi AI **không ghi gì** vào bản ghi tin (`NULL` = chưa kiểm tra), **không** đổi trạng thái tin, và nhà tuyển dụng không thấy gì.

**Hành vi giao diện:** trước khi sửa, nút "Kiểm tra bằng AI" bắn toast lỗi kỹ thuật cho quản trị viên
(`showApiError`). Điều này vi phạm tiêu chí "giao diện hiện _chưa kiểm tra_ chứ không phải lỗi kỹ thuật".

Đã sửa trong ticket này:

- `app/src/features/admin/lib/ai-review.ts` — thêm `getAiPanelState()` + `AI_PANEL_MESSAGES` (hàm thuần, test được).
- `app/src/features/admin/components/ai-review-panel.tsx` — nhận `hasFailed`; mọi trạng thái không có kết quả đều hiện "chưa kiểm tra", **không** trạng thái nào lộ lỗi kỹ thuật.
- `app/src/pages/admin/jobs.tsx` — `handleAiCheck` bắt lỗi nhưng **không** gọi `showApiError`; set `hasAiFailed = true` để panel hiện "chưa kiểm tra".

Badge mức độ cũng hiện `Chưa kiểm tra` vì `aiVerdict` vẫn là `null` sau lỗi.

Có test bảo vệ hành vi này (`app/src/features/admin/lib/ai-review.test.ts`): 5 test cho `getAiPanelState` +
1 test khẳng định **không** thông điệp nào chứa từ mang tính lỗi kỹ thuật.

---

## 5. Nhận xét và điểm cần lưu ý

### 5.1 AI phát hiện được nhiều mã trong một mẫu

Mẫu 4 (`mau-04-chi-nam-duoi-20-tui`) trả về **5 lý do**: 4 lý do `DISCRIMINATION` (giới tính, nơi ở, độ tuổi, quốc tịch) + 1 lý do `SALARY_ANOMALY`. Mẫu 5 trả về 4 mã khác nhau.

Đây là hành vi **đúng** — mỗi điều kiện phân biệt đối xử là một lý do riêng, quản trị viên cần thấy
từng điều kiện để biết cần sửa cái nào. Nhưng nó đặt ra yêu cầu về giao diện: khối "Đánh giá của AI"
phải hiển thị được danh sách lý do dài mà vẫn đọc được (đã đáp ứng — mỗi lý do là một `<li>` riêng).

### 5.2 `SALARY_ANOMALY` dựa trên dòng mức lương do backend dựng

Với mẫu 6, AI trích dẫn dòng `Muc luong: HOURLY, tu 500000 den 500000 VND (quy doi 500000 - 500000 VND/gio)`
— dòng này **do backend dựng** (`JobContentAssembler`), không phải do nhà tuyển dụng viết.

Về mặt kỹ thuật, nó vẫn là "nguyên văn trong nội dung tin" theo đúng quy tắc backend đang áp dụng
(`AiEvidenceMatcher` so trên toàn bộ nội dung tin dựng ra). Nhưng nó **không phải câu nhà tuyển dụng viết** —
quản trị viên đối chiếu bằng mắt sẽ không tìm thấy dòng đó trong mô tả tin.

Đây là hệ quả của việc đưa ngữ cảnh thị trường vào cùng khối dữ liệu (ticket 03). **Chưa sửa** vì:

- Sửa ở đây sẽ đụng tới quy tắc "evidence là câu nguyên văn" đã chốt ở `CONTRACT.md` mục 5.5 và ADR 0005.
- Hiện tại hành vi vẫn **an toàn** (không bịa bằng chứng) và vẫn hữu ích (quản trị viên thấy con số 500.000đ/giờ
  ngay trong khối đánh giá).

**Nếu sau này muốn siết**: giới hạn `AiEvidenceMatcher` chỉ so khớp trên phần _nội dung do nhà tuyển dụng viết_
(tiêu đề, mô tả, yêu cầu, quyền lợi), tách khỏi phần _ngữ cảnh hệ thống_ (mức lương, bảng xếp hạng, uy tín).
Việc này cần một ADR riêng vì đổi quy tắc so khớp.

### 5.3 Nhà cung cấp AI trả 503 tạm thời

Trong lúc chạy, một lượt gọi thủ công nhận `503` (Gemini báo _"This model is currently experiencing high demand"_).
Lượt gọi nền (ticket 04) cho cùng tin đó vẫn thành công vài giây sau.

Hệ quả cho sản phẩm: nút "Kiểm tra bằng AI" **có thể** thất bại tạm thời dù hệ thống vẫn hoạt động.
Đã xử lý ở giao diện (hiện "chưa kiểm tra" thay vì lỗi) và ở công cụ đánh giá (thử lại tối đa 3 lần).

`model` mặc định trong `application.yml` là `gemini-3.5-flash-lite` — đã xác nhận hoạt động ổn định
trong lần chạy này. Lưu ý: `gemini-2.0-flash` và `gemini-3.8-flash` **không** dùng được với khoá này
(404 / 503 tương ứng).

### 5.4 Số mẫu còn lại không đạt

Không có — 7/7 đều đạt.

---

## 6. Cách tái lập

```bash
# 1. MySQL
docker run -d --name viejob-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=parttime_marketplace -p 3306:3306 mysql:8.4

# 2. Backend (co GEMINI_API_KEY + AI_ENABLED=true + AI_MODEL=gemini-3.5-flash-lite)
./mvnw package -DskipTests
docker run -d --name viejob-backend -p 8080:8080 --env-file .env \
  -e DB_URL="jdbc:mysql://host.docker.internal:3306/parttime_marketplace?..." \
  -e DB_USERNAME=root -e DB_PASSWORD=root \
  -e AI_ENABLED=true -e AI_MODEL=gemini-3.5-flash-lite \
  -v backend/target:/app maven:3.9-eclipse-temurin-17 \
  java -jar /app/uniwork-backend-0.0.1-SNAPSHOT.jar

# 3. Chay danh gia
node backend/scripts/ai-moderation/evaluate.mjs --live \
  --report .scratch/ai-moderation/notes/07-bao-cao-danh-gia.json
```

Tài khoản demo: `admin@viejob.vn` / `Admin@123`, `employer@viejob.vn` / `Employer@123`.

---

## 7. Kết luận

Lớp góp ý AI đạt tiêu chí nghiệm thu ở **7/7 mẫu** (vượt ngưỡng 6/7), với mọi bằng chứng đều là câu
nguyên văn đối chiếu được tay. AI không thay đổi trạng thái tin, nhà tuyển dụng không thấy gì, và lỗi AI
không làm hỏng luồng đăng tin.

**Khuyến nghị**: đưa vào quy trình duyệt với vai trò **tín hiệu ưu tiên** — tin bị gắn cờ được sắp lên đầu
hàng đợi duyệt (đã làm ở ticket 05), tuyệt đối không tự động từ chối.

**Chưa giải quyết** (xem mục 5.2): evidence trích từ dòng ngữ cảnh hệ thống (mức lương quy đổi) chưa
tách bạch với nội dung do nhà tuyển dụng viết. Cần một ADR nếu muốn siết.
