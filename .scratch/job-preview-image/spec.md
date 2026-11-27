# Spec — Ảnh preview tin tuyển dụng

> Tài liệu đặc tả cho tính năng **ảnh preview của tin tuyển dụng**.
> Nguồn sự thật về thuật ngữ: [`../../GLOSSARY.md`](../../GLOSSARY.md).
> Quyết định kiến trúc liên quan: [`../../docs/adr/0003-job-requires-admin-review-before-going-live.md`](../../docs/adr/0003-job-requires-admin-review-before-going-live.md), [`../../docs/adr/0001-cloudflare-r2-for-file-storage.md`](../../docs/adr/0001-cloudflare-r2-for-file-storage.md).

**Trạng thái:** đã chốt thiết kế, chưa implement.
**Phạm vi:** đúng một tính năng — mỗi tin tuyển dụng có **tối đa một ảnh preview** do nhà tuyển dụng tải lên. Không có gallery, không crop phía client, không thư viện ảnh.

---

## Problem Statement

Hiện tại thẻ tin tuyển dụng chỉ có đúng một chỗ có thể hiển thị ảnh: `EmployerAvatar` ở `app/src/features/jobs/components/job-card.tsx:79-85`, tức **logo của tổ chức**. Toàn bộ hệ thống **không có khái niệm ảnh thuộc về tin tuyển dụng**:

- `job_posts` không có cột ảnh; `JobPost`, `JobUpsertRequest`, `JobResponse`, type `Job` không có field ảnh.
- `FileStorageService.Kind` chỉ có `CV`, `AVATAR`, `LOGO`; check constraint `ck_file_uploads_kind` chỉ cho 3 giá trị này.
- Form đăng tin `app/src/pages/employer/job-form.tsx` không có ô upload ảnh.

Hệ quả: nhà tuyển dụng chưa tải logo thì thẻ tin là một khối chữ cái viết tắt, không có gì để sinh viên hình dung nơi mình sẽ làm việc. Với nhóm việc phổ thông (quán ăn, trà sữa, cửa hàng, gia sư), nơi làm việc **là** thông tin quyết định ứng tuyển, nhưng nó chỉ tồn tại dưới dạng chữ trong mô tả.

---

## Solution

Cho nhà tuyển dụng tải lên **một ảnh preview** khi đăng/sửa tin. Ảnh là tuỳ chọn; khi thiếu, thẻ tin dùng logo tổ chức như hiện tại, thiếu logo thì dùng khối chữ cái.

- Thẻ tin đổi sang **layout 2 cột**: ảnh vuông bên trái, nội dung bên phải — áp dụng cho cả 5 nơi dùng `JobCard`.
- Trang chi tiết hiển thị ảnh vuông trong sidebar phải, bấm vào mở ảnh lớn.
- Quản trị viên thấy ảnh ngay trong hộp thoại duyệt tin — ảnh duyệt **cùng tin**, không có hàng đợi duyệt riêng.
- Ảnh được **thu nhỏ nhưng không cắt**: giữ nguyên tỉ lệ gốc, chỉ giới hạn cạnh dài để feed không tải file 5MB.

---

## User Stories

### Nhà tuyển dụng (EMPLOYER)

1. As a nhà tuyển dụng, I want tải lên một ảnh quán/không gian/món ăn khi đăng tin, so that sinh viên thấy được chỗ làm trước khi ứng tuyển.
2. As a nhà tuyển dụng, I want bỏ trống ảnh mà vẫn đăng được tin, so that tôi không bị chặn khi chưa kịp chụp ảnh.
3. As a nhà tuyển dụng, I want ảnh của tôi giữ đúng tỉ lệ và không bị cắt mất mặt tiền quán, so that ảnh tôi chụp không bị hỏng bố cục.
4. As a nhà tuyển dụng, I want thấy trước ảnh sẽ hiển thị thế nào trên thẻ tin, so that tôi biết phần nào bị che khi cắt vuông bằng CSS.
5. As a nhà tuyển dụng, I want được cảnh báo rằng đổi ảnh trên tin đang hiển thị sẽ tạm ẩn tin chờ duyệt lại, so that tôi không bất ngờ vì tin biến mất.
6. As a nhà tuyển dụng, I want thay ảnh mới thì file cũ được dọn khỏi kho, so that dung lượng tài khoản không bị ăn dần.
7. As a nhà tuyển dụng, I want biết tin có ảnh được xem nhiều hơn, so that tôi có lý do bỏ công chụp ảnh.
8. As a nhà tuyển dụng, I want đăng nhiều tin cho cùng một quán mà không phải quản lý thư viện ảnh phức tạp, so that thao tác vẫn nhanh.

### Sinh viên (STUDENT)

9. As a sinh viên, I want thấy ảnh thật của nơi làm việc ngay trên thẻ tin, so that tôi loại được những chỗ không phù hợp mà không phải mở từng tin.
10. As a sinh viên, I want thẻ tin không bị nhảy layout khi ảnh tải xong, so that tôi cuộn danh sách không bị mất vị trí.
11. As a sinh viên, I want xem ảnh ở kích thước lớn ở trang chi tiết, so that tôi nhìn rõ điều kiện làm việc.
12. As a sinh viên, I want danh sách vẫn tải nhanh trên 4G, so that tôi không tốn data vì ảnh gốc nhiều megabyte.

### Quản trị viên (ADMIN)

13. As a quản trị viên, I want thấy ảnh preview trong hộp thoại duyệt tin, so that tôi duyệt được cả nội dung ảnh chứ không chỉ chữ.
14. As a quản trị viên, I want ảnh thay đổi cũng đưa tin về chờ duyệt, so that nhà tuyển dụng không thể đổi ảnh phản cảm sau khi tin đã được duyệt.
15. As a quản trị viên, I want một quy tắc rõ ràng để từ chối ảnh, so that tôi không phải tự đoán thế nào là ảnh không phù hợp.

### Kỹ thuật / vận hành

16. As a người kỹ thuật, I want ảnh preview là một loại file riêng (`JOB_IMAGE`), so that giới hạn dung lượng, resize và quota không lẫn với logo.
17. As a người kỹ thuật, I want backend kiểm tra ảnh gắn vào tin thuộc sở hữu của chính nhà tuyển dụng, so that không ai dán URL ảnh của người khác vào tin.
18. As a người kỹ thuật, I want ảnh được nén trước khi lưu, so that feed không tải file gốc 5MB cho khung 120px.
19. As a người kỹ thuật, I want sửa ảnh không đốt hạn mức AI kiểm duyệt vô ích, so that free tier không bị tiêu vào việc AI không đọc được.

---

## Implementation Decisions

### 1. Khái niệm và giới hạn

- Mỗi tin có **0 hoặc 1** ảnh preview. Không gallery trong vòng này.
- Ảnh là **tuỳ chọn** ở mọi trạng thái; không có validation bắt buộc.
- Nội dung ảnh nhà tuyển dụng muốn gì cũng được (ảnh quán, món, không gian, đội ngũ) — nhưng phải qua duyệt của quản trị viên (xem mục 11).
- Tên chính thức: **ảnh preview**, field `previewImageUrl`, nhãn UI "Ảnh preview".

### 2. Dữ liệu

Migration mới `backend/src/main/resources/db/migration/V18__job_preview_image.sql`:

```sql
ALTER TABLE job_posts
    ADD COLUMN preview_image_url VARCHAR(500) NULL AFTER title;
```

- Không FK sang `file_uploads`: cột lưu URL công khai (giống `employer_profiles.logo_url`, `student_profiles.avatar_url`).
- Thêm `previewImageUrl` vào:
  - `backend/src/main/java/com/uniwork/entity/JobPost.java`
  - `backend/src/main/java/com/uniwork/dto/request/JobUpsertRequest.java`
  - `backend/src/main/java/com/uniwork/dto/response/JobResponse.java`
  - `backend/src/main/java/com/uniwork/dto/response/AdminJobResponse.java` (dùng lại của `JobResponse`)
  - `app/src/features/shared/types/index.ts` (`Job`), re-export sẵn qua `features/jobs/types`
- Mapping: `JobServiceImpl.toResponse` (~dòng 653) và `toAdminResponse`; set trong `create` (~207) và `update` (~259).

### 3. Loại file mới `JOB_IMAGE`

- `FileStorageService.Kind`: thêm `JOB_IMAGE(List.of("image/png","image/jpeg","image/webp"), 5L * 1024 * 1024)`, `isPublic() == true`.
- `FileUploadController.parseKind` — nhận thêm `JOB_IMAGE`.
- `ConfirmUploadRequest.kind` regex — thêm `JOB_IMAGE`.
- Migration đổi check constraint (trong cùng `V18`):

```sql
ALTER TABLE file_uploads DROP CHECK ck_file_uploads_kind;
ALTER TABLE file_uploads
    ADD CONSTRAINT ck_file_uploads_kind
    CHECK (kind IN ('CV','AVATAR','LOGO','JOB_IMAGE'));
```

> MariaDB/MySQL có thể cần `DROP CONSTRAINT` thay vì `DROP CHECK` — kiểm tra phiên bản trong `docker-compose.dev.yml` trước khi viết.
> Kiểm tra cả `FileSignatureValidator` xem `JOB_IMAGE` có đi qua nhánh kiểm tra magic bytes của ảnh hay không (dự kiến chỉ cần map theo `isPublic`/kind ảnh).

- Frontend: `app/src/features/files/services/files.service.ts`
  - `FileKind` thêm `"JOB_IMAGE"`
  - `FILE_SIZE_LIMITS.JOB_IMAGE = 5 * 1024 * 1024`
  - `ACCEPTED_MIME.JOB_IMAGE = ["image/png","image/jpeg","image/webp"]`

### 4. Nén ảnh: thu nhỏ, không cắt

`ImageResizer` hiện có một hằng số duy nhất `MAX_DIMENSION = 512` và `resize(byte[])` không nhận tham số. Cần:

- Đổi thành `resize(byte[] content, int maxDimension)`; giữ overload `resize(byte[])` gọi với 512 để không phải sửa chỗ dùng avatar/logo.
- `MAX_DIMENSION_AVATAR_LOGO = 512`, `MAX_DIMENSION_JOB_IMAGE = 1200`.
- **Không crop**: giữ nguyên tỉ lệ, chỉ scale theo cạnh dài (đúng hành vi hiện tại của `ImageResizer.resize`).
- Đầu ra PNG (có alpha) hoặc JPEG — JDK không có WebP writer, giữ nguyên hiện trạng, không thêm dependency.
- `FileStorageServiceImpl.resizeImage(...)` truyền đúng max dimension theo kind. Ảnh đã nhỏ hơn 1200px vẫn được encode lại (hành vi hiện tại) — chấp nhận.
- Không thêm Cloudflare Image Resizing.

### 5. Quota

- Quota giữ nguyên **20MB/user** (`FileStorageServiceImpl:64`).
- **Bắt buộc** thêm `JOB_IMAGE` vào danh sách kind được cộng dồn ở `enforceQuota` (`FileStorageServiceImpl:539`). Nếu bỏ qua bước này, ảnh preview sẽ vô tình miễn quota — trái với quyết định.
- Nhờ resize về 1200px, ảnh lưu thực tế ~150–400KB → 20MB chứa được khoảng 30–50 ảnh, đủ dùng.
- Áp dụng cho cả upload trực tiếp và luồng `presign → PUT → confirm` (cả hai đều đi qua `enforceQuota`).

### 6. Ràng buộc sở hữu ảnh

Khi lưu tin (`create`/`update`), nếu `previewImageUrl` khác null:

- Backend resolve `file_uploads` theo URL, yêu cầu: `kind = JOB_IMAGE`, `owner_user_id = employerUserId` của tin, file chưa bị đánh dấu xoá.
- Sai → `400` với thông điệp "Ảnh preview không hợp lệ."
- Mục đích: chặn dán URL ảnh từ tin của nhà tuyển dụng khác hoặc ảnh ngoài hệ thống.

### 7. API contract

`JobResponse` thêm:

```json
{ "previewImageUrl": "https://cdn.../job_image/42/ab12...jpg" }
```

- `null` khi tin chưa có ảnh.
- `JobUpsertRequest.previewImageUrl`: `String`, nullable, tối đa 500 ký tự.
- Không thêm endpoint mới. Dùng lại `POST /api/v1/files/presign`, `POST /api/v1/files/confirm`, `DELETE /api/v1/files/{id}`.

### 8. Form đăng tin

`app/src/pages/employer/job-form.tsx`, bước **basic**:

- Ô "Ảnh preview" cạnh/ dưới tiêu đề:
  - Chưa có ảnh: khung vuông nét đứt, nút "Chọn ảnh", mô tả "PNG, JPG, WEBP — tối đa 5MB. Ảnh sẽ được hiển thị vuông, phần thừa hai bên bị che."
  - Có ảnh: xem trước trong khung vuông `object-cover` + nút "Đổi ảnh" / "Xoá ảnh".
- Upload qua `useUploadFile({ kind: "JOB_IMAGE" })` (hook có sẵn), lưu URL vào `FormState.previewImageUrl`.
- Xoá ảnh: gọi `useDeleteFile` (hoặc chỉ bỏ URL rồi dọn khi lưu — chọn cách đơn giản hơn, xem mục 12).
- Dòng gợi ý: "Tin có ảnh preview thường được xem nhiều hơn."
- Khi sửa tin đang `OPEN` và ảnh bị thay đổi: hộp thoại xác nhận "Đổi ảnh sẽ đưa tin về trạng thái chờ duyệt và tạm ẩn khỏi danh sách." Chỉ hiện khi thực sự đổi ảnh, không hiện ở tin nháp.
- Không thêm thư viện chọn ảnh cũ.

### 9. Thẻ tin — layout 2 cột

Sửa duy nhất `app/src/features/jobs/components/job-card.tsx`, áp cho cả 5 nơi dùng: `pages/home`, `pages/jobs`, `pages/saved-jobs`, `pages/student`, `pages/job-detail` (việc tương tự).

```
┌─────────────────────────────────────────┐
│ [badge] [badge] [badge] ...             │
│ ┌──────┐  Tiêu đề tin                   │
│ │ ảnh  │  LogoQuán Tên quán ✓           │
│ └──────┘                       [lưu]    │
│ [Lương][Loại hình][Cần tuyển][Địa điểm] │
│ ... meta                                 │
└─────────────────────────────────────────┘
```

- Khung ảnh: vuông **96px** (mobile) / **120px** (≥sm), `rounded-lg`, `object-cover`, `shrink-0`.
- Fallback theo thứ tự: `previewImageUrl` → `employer.logoUrl` → khối chữ cái (`EmployerAvatar` hiện tại).
- Khi có ảnh preview: logo tổ chức thu về **20px** hiển thị cạnh tên quán (giữ dấu xác minh thương hiệu).
- Khi không có ảnh preview: giữ nguyên `EmployerAvatar size="md"` như hiện tại trong cùng khung để layout không lệch.
- Ảnh: `loading="lazy"`, `decoding="async"`, `alt` = tiêu đề tin, khung có kích thước cố định để không nhảy layout.
- Cập nhật `job-card-skeleton.tsx`: thêm khối vuông 96/120px bên trái.
- Không badge "Có ảnh" trên feed.

### 10. Trang chi tiết + lightbox

`app/src/pages/job-detail/index.tsx`:

- Ảnh vuông đặt trong **sidebar phải**, phía trên thẻ lương/ứng tuyển, rộng hết sidebar, `object-cover`, bo góc.
- Bấm ảnh → hộp thoại phóng to (dùng `Dialog` sẵn có trong `components/ui`), ảnh `object-contain`, tối đa 90vh.
- Không có ảnh → không render khối này (không để khung trống).

### 11. Màn admin duyệt tin

`app/src/pages/admin/jobs.tsx`, hộp thoại `preview` (~445-520):

- Hiển thị ảnh preview ngay dưới tiêu đề, khung tối đa ~240px, bấm mở lightbox như trang chi tiết.
- Không có ảnh → dòng mờ "Tin không có ảnh preview."
- **Checklist duyệt ảnh** (hiển thị dạng ghi chú nhỏ trong hộp thoại), từ chối khi ảnh:
  1. Không liên quan đến công việc/nơi làm việc (ảnh meme, ảnh người khác, ảnh stock có watermark).
  2. Chứa số điện thoại, QR, link, tên kênh liên hệ ngoài nền tảng.
  3. Phản cảm, bạo lực, đồ uống có cồn nhắm vào người chưa đủ tuổi, nội dung phân biệt đối xử.
  4. Là ảnh chụp giấy tờ/CCCD hoặc chứa dữ liệu cá nhân.

> Checklist này là đề xuất vận hành, **cần bạn xác nhận** trước khi đưa vào UI.

### 12. Vòng đời duyệt và vòng đời file

- Ảnh duyệt **cùng tin**, không có trạng thái riêng cho ảnh.
- `JobServiceImpl.update` đã đưa tin `OPEN`/`REJECTED` về `PENDING_REVIEW` với **mọi** thay đổi (dòng 320-323). Vì vậy đổi ảnh tự động ẩn tin — không cần thêm logic trạng thái, chỉ thêm hộp thoại xác nhận ở form (mục 8).
- **Bỏ gọi AI kiểm duyệt lại khi chỉ ảnh thay đổi**: `scheduleAiReview` hiện chạy cho mọi lần sửa; AI chỉ đọc chữ (`JobContentAssembler`) nên gọi lại là đốt hạn mức vô ích. So sánh `previewImageUrl` cũ/mới để quyết định.
- Đổi ảnh → xoá file cũ khỏi R2 bằng `cleanupReplacedFile` (đã có ở `features/files/hooks/index.ts:115-133`), giải phóng quota.
- Xoá tin (soft delete) → **giữ** file, vì tin có thể khôi phục.
- Xoá ảnh khỏi tin đang sửa → xoá file ngay sau khi lưu thành công.

### 13. Gợi ý cho nhà tuyển dụng (không làm phiền sinh viên)

- Form: dòng "Tin có ảnh preview thường được xem nhiều hơn."
- Trang `/employer/jobs`: tin thiếu ảnh có dòng nhỏ "Chưa có ảnh preview" trong cột tiêu đề (có thể kèm icon ảnh mờ).
- Không badge, không bộ lọc, không sắp xếp ưu tiên tin có ảnh ở feed công khai.

### 14. Seed và tài liệu

- Seed: thêm ảnh preview cho một phần tin mẫu (V17 hoặc migration seed mới), ảnh **tự host** trong R2/local seed, **không hotlink** từ site khác, ghi rõ là dữ liệu demo.
- `GLOSSARY.md`: thêm mục **"Ảnh preview tin tuyển dụng"** — ảnh do nhà tuyển dụng tải lên, hiển thị vuông trên thẻ tin và trang chi tiết, không bắt buộc.
- `docs/feature-map.md`: cập nhật mô tả form đăng tin, trang chi tiết, màn duyệt tin.
- ADR mới: `docs/adr/000X-job-preview-image-optional-and-uncropped.md` — vì sao ảnh tuỳ chọn (không chặn NTD nhỏ), vì sao không crop (giữ mặt tiền quán), vì sao duyệt cùng tin thay vì hàng đợi riêng.

### 15. Thứ tự triển khai

1. Migration `V18` + entity + DTO + mapping.
2. Kind `JOB_IMAGE` + `ImageResizer` theo max dimension + quota + kiểm tra sở hữu.
3. Form đăng tin (upload, xem trước, xoá, hộp thoại xác nhận).
4. Thẻ tin 2 cột + skeleton.
5. Trang chi tiết + lightbox.
6. Màn admin duyệt + checklist.
7. Seed ảnh + `GLOSSARY` + `feature-map` + ADR.

---

## Testing Decisions

### Nguyên tắc

- Kiểm tra **hành vi**, không kiểm tra implementation detail.
- Mọi test backend nằm trong `backend/src/test/java/com/uniwork/`; frontend trong `app/src/**/*.test.tsx` theo pattern hiện có.

### Backend

1. Upload `kind=JOB_IMAGE` với PNG hợp lệ → 200, file public, URL CDN trả về.
2. Upload `kind=JOB_IMAGE` với PDF → 400 (magic bytes không khớp).
3. Upload ảnh > 5MB → 400.
4. Ảnh 4000×3000 sau confirm → cạnh dài ≤ 1200, **tỉ lệ giữ nguyên** (không crop, không pad).
5. Quota: upload ảnh JOB_IMAGE làm tổng vượt 20MB → 400 (chứng minh kind đã nằm trong quota).
6. `create` tin với `previewImageUrl` là file của nhà tuyển dụng khác → 400.
7. `create`/`update` với URL không tồn tại trong `file_uploads` → 400.
8. `update` tin `OPEN` chỉ đổi ảnh → status `PENDING_REVIEW`, **không** gọi AI (mock `AiReviewService` verify không tương tác).
9. `GET /jobs/{id}` trả `previewImageUrl` đúng; tin không có ảnh trả `null`.

### Frontend

10. `JobCard`: có `previewImageUrl` → render `<img>` với `alt` = tiêu đề, logo quán hiển thị 20px.
11. `JobCard`: không có ảnh, có `logoUrl` → render logo trong khung vuông.
12. `JobCard`: không có cả hai → khối chữ cái, không có `<img>`.
13. `JobCard` skeleton có khối ảnh cùng kích thước (chống nhảy layout).
14. Trang chi tiết: không có ảnh → không render khối ảnh.
15. Form: chọn ảnh → hiện xem trước; xoá → biến mất; lưu → payload có `previewImageUrl`.

### Kiểm tra tay

- Ảnh 3:4 và 16:9 hiển thị đúng trong khung vuông (phần thừa bị che, ảnh gốc không méo).
- Feed 20 tin có ảnh: kích thước tải < 10MB, không giật khi cuộn.
- Sửa ảnh trên tin `OPEN` → hộp thoại xác nhận → tin biến khỏi feed → duyệt lại → hiện lại.
- Admin thấy ảnh trong hộp thoại duyệt.
- File cũ biến mất khỏi R2 sau khi đổi ảnh.

---

## Out of Scope

- Nhiều ảnh / gallery cho một tin.
- Crop vuông phía client (thư viện crop, kéo thả).
- Thư viện ảnh tái sử dụng của nhà tuyển dụng.
- Hàng đợi duyệt ảnh riêng, trạng thái duyệt riêng cho ảnh.
- OG image / ảnh share Facebook, Zalo.
- Bộ lọc "chỉ tin có ảnh", badge "có ảnh", xếp hạng ưu tiên tin có ảnh.
- Cloudflare Images / Image Resizing on-the-fly.
- Feature flag bật/tắt tính năng.
- Tự động phát hiện ảnh có số điện thoại/QR bằng AI.

---

## Further Notes

### Rủi ro còn lại

- **Quota 20MB vẫn là trần cứng**: nhà tuyển dụng đăng nhiều tin + giữ nhiều CV có thể chạm trần. Nếu thực tế chạm thường xuyên, nâng lên 100MB là thay đổi một hằng số.
- **Không crop nghĩa là ảnh dọc/ngang bị che phần lớn** trong khung vuông. Xem trước trong form phải dùng đúng `object-cover` để nhà tuyển dụng thấy trước kết quả.
- **Ảnh là kênh duyệt mù với AI**: khối lượng duyệt tay tăng lên; nếu số tin tăng, cần tính tới kiểm tra ảnh tự động.
- **Checklist duyệt ảnh (mục 11) chưa được xác nhận** — cần chốt trước khi làm UI admin.

### Câu hỏi đã chốt trong phiên thiết kế

| #   | Quyết định                                                       |
| --- | ---------------------------------------------------------------- |
| Q1  | Là tính năng mới, không phải khôi phục field bị mất              |
| Q2  | Ảnh do nhà tuyển dụng tự chọn nội dung; app gọi là "ảnh preview" |
| Q3  | Tuỳ chọn, không bắt buộc; fallback logo tổ chức                  |
| Q4  | Hiển thị: thẻ tin, trang chi tiết, màn admin duyệt               |
| Q5  | Một ảnh mỗi tin                                                  |
| Q6  | Thẻ tin layout 2 cột, ảnh vuông 96/120px                         |
| Q7  | Trang chi tiết: sidebar phải + lightbox                          |
| Q8  | Ảnh duyệt cùng tin; đổi ảnh → tin về chờ duyệt                   |
| Q9  | Không crop, dùng `object-cover`                                  |
| Q10 | Giữ quota 20MB/user, ảnh tính vào quota                          |
| Q11 | Seed có ảnh placeholder tự host                                  |
| Q12 | Đổi ảnh xoá file cũ; xoá tin mềm giữ file                        |
| Q13 | Có nén: thu nhỏ cạnh dài 1200px, không cắt, đầu vào ≤ 5MB        |
| Q14 | Chấp nhận tin bị ẩn khi đổi ảnh, kèm hộp thoại xác nhận          |
| Q15 | `previewImageUrl` / "Ảnh preview tin tuyển dụng"                 |
| Q16 | Không thư viện ảnh; kiểm tra sở hữu file ở backend               |
| Q17 | Layout 2 cột áp cho cả 5 nơi dùng `JobCard`                      |
| Q18 | Không badge/bộ lọc công khai; nhắc kín đáo cho nhà tuyển dụng    |
| Q19 | Không feature flag, ship một lần                                 |
