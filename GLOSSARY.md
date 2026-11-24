# VieJob Marketplace

Nền tảng hai chiều kết nối sinh viên đại học với nhà tuyển dụng cần lao động bán thời gian: đăng tin, tìm kiếm, ứng tuyển, theo dõi trạng thái công việc và đánh giá hai chiều sau khi hoàn thành.

Tài liệu này là **ngôn ngữ chung** của dự án. Khi viết đặc tả, review code, hoặc hỏi agent về một tính năng — hãy dùng đúng các từ ở đây. Nếu một thuật ngữ có nhiều từ đồng nghĩa trong dự án, hãy chọn từ được đánh dấu canonical và tránh những từ dưới `_Avoid_`.

## Language

### Vai trò & tài khoản

**Tài khoản**:
Một danh tính đăng nhập duy nhất, thuộc đúng một vai trò. Là gốc của mọi hồ sơ.
_Avoid_: User, account, hồ sơ người dùng

**Vai trò**:
Phân loại quyền của tài khoản: `STUDENT`, `EMPLOYER` hoặc `ADMIN`.
_Avoid_: Role, quyền, user type

**Trạng thái tài khoản**:
Vòng đời kích hoạt của tài khoản: `PENDING_VERIFY` (chờ xác thực email), `ACTIVE` (đã xác thực), `LOCKED` (bị khoá).
_Avoid_: user status, trạng thái user

**Sinh viên**:
Tài khoản có vai trò `STUDENT` — người ứng tuyển vào tin tuyển dụng.
_Avoid_: user, học sinh, ứng viên (trừ khi nói về một đơn ứng tuyển cụ thể)

**Nhà tuyển dụng**:
Tài khoản có vai trò `EMPLOYER` — bên đăng tin tuyển dụng. Có thể là `COMPANY` (doanh nghiệp) hoặc `INDIVIDUAL` (cá nhân).
_Avoid_: employer, NTD, công ty, chủ quán, khách hàng

**Quản trị viên**:
Tài khoản có vai trò `ADMIN` — duyệt tin tuyển dụng, quản lý danh mục và người dùng.
_Avoid_: admin, moderator

### Hồ sơ

**Hồ sơ sinh viên**:
Thông tin mà sinh viên khai báo về bản thân: học vấn, kỹ năng, kinh nghiệm, CV, thông tin liên hệ.
_Avoid_: profile, StudentProfile, hồ sơ ứng viên

**Hồ sơ nhà tuyển dụng**:
Thông tin nhà tuyển dụng công khai: tên hiển thị, logo, mô tả, địa chỉ, website, mã số thuế.
_Avoid_: employer profile, hồ sơ công ty, tổ chức

**Hồ sơ công khai**:
Trang hồ sơ nhà tuyển dụng xem được bởi mọi khách, kể cả chưa đăng nhập.
_Avoid_: trang nhà tuyển dụng, public profile

**CV**:
Tài liệu ứng tuyển do sinh viên tải lên (PDF hoặc DOC/DOCX), dùng để nhà tuyển dụng xem và đánh giá.
_Avoid_: hồ sơ, resume, sơ mi, file ứng tuyển

**Kỹ năng**:
Kỹ năng sinh viên tự khai (chuỗi) hoặc kỹ năng gắn với tin tuyển dụng (master data có sẵn).
_Avoid_: skill, kỹ năng mềm (chỉ dùng khi thực sự về kỹ năng mềm)

**Kinh nghiệm làm việc**:
Kinh nghiệm sinh viên tự khai trong hồ sơ (công ty, chức danh, thời gian).
_Avoid_: experience, kinh nghiệm thực tập

**Lịch sử làm việc**:
Bản ghi do hệ thống tự tạo khi một đơn ứng tuyển được đánh dấu hoàn thành — ghi lại tin tuyển dụng, chức danh, mức lương và khoảng thời gian đã làm việc.
_Avoid_: work history, workHistory, kinh nghiệm thực tế (chỉ dùng cho bản ghi tự động)

**Lưu việc**:
Tính năng sinh viên lưu một tin tuyển dụng để xem lại sau.
_Avoid_: bookmark, yêu thích, tin đã lưu

### Tin tuyển dụng

**Tin tuyển dụng**:
Một cơ hội việc do nhà tuyển dụng đăng, gồm mô tả, yêu cầu, điều lợi, địa điểm, lịch ca và mức lương.
_Avoid_: job post, tin việc làm, JobPost, tin đăng (chỉ dùng khi nói về hành động đăng)

**Nhóm việc**:
Phân loại ngành nghề cấp 1 của tin tuyển dụng (ví dụ: "Nhà hàng - Dịch vụ ăn uống").
_Avoid_: category, ngành nghề, lĩnh vực

**Vị trí công việc**:
Phân loại cấp 2, chi tiết hơn nhóm việc (ví dụ: "Nhân viên phục vụ").
_Avoid_: position, job position, chức danh (chức danh là `positionName` trong lịch sử làm việc — khác khái niệm)

**Số lượng tuyển**:
Số suất tuyển của tin tuyển dụng (`positionsCount`), và số suất đã có người (`positionsFilled`).
_Avoid_: số lượng vị trí, headcount, slot

**Lịch ca**:
Tập hợp các ca (thứ trong tuần + giờ bắt đầu/kết thúc) mà sinh viên phải làm khi được nhận vào tin tuyển dụng.
_Avoid_: schedule, lịch làm việc, shift

**Ca làm**:
Một khoảng thời gian cụ thể trong lịch ca, gắn với một ca làm việc thực tế của sinh viên.
_Avoid_: work shift, ca làm việc (dùng khi nói về `WorkAssignment`)

**Hình thức làm việc**:
Cách thức làm việc: `ONSITE`, `REMOTE`, `HYBRID`.
_Avoid_: work mode, kiểu làm việc

**Loại hình làm việc**:
Mức độ cam kết thời gian: `FULL_TIME`, `PART_TIME`, `FLEXIBLE`, `CASUAL`.
_Avoid_: employment type, kiểu việc

**Đơn vị trả lương**:
Đơn vị mà nhà tuyển dụng khai báo mức lương: `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `PER_TASK`, `NEGOTIABLE`.
_Avoid_: salary type, kiểu lương, đơn vị lương

**Mức lương**:
Khoảng lương (`salaryMin` – `salaryMax`) theo đơn vị trả lương của tin tuyển dụng.
_Avoid_: salary range, lương, giá

**Xếp hạng lương**:
Vị trí của mức lương tin tuyển dụng trong dải lương thị trường của cùng nhóm việc và tỉnh, hiển thị dạng "Top X%".
_Avoid_: salary benchmark, xếp hạng, đối chiếu lương, xếp hạng lương so với benchmark

**Trạng thái tin tuyển dụng**:
Vòng đời của tin tuyển dụng: `DRAFT` → `PENDING_REVIEW` → `OPEN` → `FILLED` → `IN_PROGRESS` → `COMPLETED`, kèm `REJECTED`, `CLOSED`, `CANCELLED`.
_Avoid_: job status, trạng thái tin

### Đơn ứng tuyển

**Đơn ứng tuyển**:
Hồ sơ sinh viên gửi cho một tin tuyển dụng, gồm CV, thư ứng tuyển, mức lương mong muốn và ngày có thể bắt đầu.
_Avoid_: application, đơn xin việc, hồ sơ ứng viên, hồ sơ (mơ hồ)

**Trạng thái đơn ứng tuyển**:
Vị trí của đơn ứng tuyển trong pipeline: `PENDING`, `SHORTLISTED`, `ACCEPTED`, `COMPLETED`, `REJECTED`, `WITHDRAWN`.
_Avoid_: application status, trạng thái hồ sơ

**Duyệt sơ bộ**:
Nhà tuyển dụng đánh dấu đơn ứng tuyển là ứng viên tiềm năng, chưa nhận vào làm.
_Avoid_: shortlist, shortlist, danh sách chốt

**Nhận ứng viên**:
Nhà tuyển dụng chốt một đơn ứng tuyển, sinh viên trở thành người làm của tin tuyển dụng đó.
_Avoid_: accept, duyệt (chỉ dùng "duyệt" cho việc quản trị viên duyệt tin)

**Rút đơn**:
Sinh viên tự hủy đơn ứng tuyển của mình.
_Avoid_: withdraw, huỷ đơn

**Dòng thời gian ứng tuyển**:
Lịch sử các lần chuyển trạng thái của đơn ứng tuyển, kèm ghi chú và thời điểm.
_Avoid_: timeline, lịch sử trạng thái, history

**Thông báo theo dõi tin**:
Đăng ký nhận thông báo khi có tin tuyển dụng mới khớp với nhóm việc + tỉnh mà sinh viên theo dõi.
_Avoid_: job notify, job notify preference, đăng ký nhận tin

### Địa điểm

**Tỉnh / Thành phố**:
Cấp hành chính cấp 1. Lưu theo mã đơn vị hành chính.
_Avoid_: province, tỉnh, thành phố

**Quận / Huyện**:
Cấp hành chính cấp 2 — **đã bị bỏ từ 01/07/2025** (Quyết định 19/2025/QĐ-TTg). Vẫn còn trong hợp đồng API để tương thích ngược, nhưng form đăng tin không cho chọn.
_Avoid_: district, quận, huyện

**Xã / Phường / Đặc khu**:
Cấp hành chính cấp 3, mã 5 chữ số (ví dụ "00004" = Phường Ba Đình). Cấp hành chính chính thức từ 01/07/2025.
_Avoid_: ward, xã, phường, địa chỉ

**Địa điểm làm việc**:
Tổ hợp tỉnh + xã/phường + địa chỉ chi tiết + tên chi nhánh của một tin tuyển dụng.
_Avoid_: location, địa điểm (khi nói chung chung)

### Đánh giá & uy tín

**Đánh giá**:
Nhận xét + điểm (1–5) của một bên dành cho bên kia sau khi công việc hoàn thành.
_Avoid_: review, feedback, nhận xét

**Đánh giá hai chiều**:
Cặp đánh giá gồm đánh giá của nhà tuyển dụng cho sinh viên và đánh giá của sinh viên cho nhà tuyển dụng.
_Avoid_: two-way review, đánh giá chéo, review 2 chiều

**Phản hồi**:
Câu trả lời của người bị đánh giá (`reply`) và phản hồi lại của người viết đánh giá (`reviewerReply`).
_Avoid_: reply, trả lời

**Điểm uy tín**:
Điểm trung bình của các đánh giá (`avgRating`) kèm số lượt đánh giá (`ratingCount`) của nhà tuyển dụng hoặc sinh viên.
_Avoid_: rating, đánh giá (trung bình), uy tín, reputation

**Đã xác minh**:
Trạng thái hồ sơ nhà tuyển dụng đã được quản trị viên xác nhận (`isVerified`).
_Avoid_: verified, xác minh (khi nói về tài khoản email)

### Thông báo

**Thông báo**:
Thông báo trong hệ thống về ứng tuyển, cập nhật trạng thái, tin tuyển dụng, đánh giá hoặc hệ thống.
_Avoid_: notification, thông báo (khi nói chung chung)

**Trung tâm thông báo**:
Trang liệt kê thông báo của tài khoản đang đăng nhập, dùng chung cho cả 3 vai trò.
_Avoid_: notification center, hộp thư

### Hệ thống

**Hợp đồng API**:
Mọi endpoint trả về `{ success, data, message, ... }` — thành công có `data`, thất bại có `error` kèm `fieldErrors`.
_Avoid_: response, kết quả API

**Mã đơn vị hành chính**:
Mã số 5 chữ số của tỉnh / xã-phường, dùng thay cho tên để ổn định khi đơn vị hành chính được sáp nhập.
_Avoid_: code, mã tỉnh, mã xã

**Slug**:
Chuỗi định danh URL thân thiện, duy nhất, sinh từ tên hiển thị — dùng thay cho id số trong URL công khai.
_Avoid_: id, đường dẫn đẹp

**Tệp lưu trữ**:
Mọi tệp người dùng tải lên (CV, avatar, logo) nằm trên Cloudflare R2, không nằm trong container.
_Avoid_: file upload, upload, file

**Xác thực hai lớp**:
Cơ chế bảo vệ API gồm access token ngắn hạn và refresh token dài hạn. Client tự động làm mới access token khi gặp `401`.
_Avoid_: JWT, token, đăng nhập
