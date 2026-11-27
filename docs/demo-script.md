# Kịch Bản Quay Video Demo Sản Phẩm — VieJob Marketplace

Tài liệu này là kịch bản chi tiết, sắp xếp theo **trình tự thời gian thực tế** của một vòng đời tuyển dụng khép kín trên **VieJob Marketplace**, giúp bạn quay video demo mượt mà, dễ theo dõi và **không bỏ sót bất kỳ tính năng nào** đã xây dựng.

---

## 0. Chuẩn bị trước khi quay

- **Môi trường**: Đảm bảo cả Backend (Spring Boot) và Frontend (React + Vite) đang chạy ổn định.
- **Trình duyệt**: Mở sẵn **3 cửa sổ trình duyệt** (hoặc 1 cửa sổ thường + 1 ẩn danh + 1 profile khác) để đăng nhập sẵn 3 vai trò:
  1. **Sinh viên** (`STUDENT`)
  2. **Nhà tuyển dụng** (`EMPLOYER`)
  3. **Quản trị viên** (`ADMIN`)
     _(Mẹo: Mở song song giúp bạn quay cảnh **Thông báo Real-time qua WebSocket** cực kỳ ấn tượng mà không cần đăng xuất/đăng nhập lại nhiều lần)._
- **Dữ liệu mẫu**: Chuẩn bị sẵn ít nhất 1 tệp CV mẫu (PDF) trên máy để demo tải lên.

---

## Phần 1: Khách vãng lai (Chưa đăng nhập) — Khám phá nền tảng

**Mục tiêu**: Giới thiệu tổng quan giao diện công khai, khả năng tìm kiếm và minh bạch thông tin.

1. **Trang chủ (`/`)**
   - Mở trang chủ, giới thiệu nhanh nền tảng VieJob Marketplace kết nối sinh viên với nhà tuyển dụng bán thời gian.
   - Lướt qua các **tin tuyển dụng nổi bật**.
2. **Trang Giới thiệu (`/about`)**
   - Bấm vào mục Giới thiệu để cho thấy thông tin về nền tảng.
3. **Danh sách tin tuyển dụng (`/jobs`)**
   - Thử **tìm kiếm** theo từ khóa.
   - Thử **lọc** theo: Nhóm việc, Địa điểm (Tỉnh/Thành phố, Xã/Phường), Mức lương.
4. **Chi tiết tin tuyển dụng (`/jobs/:id`)**
   - Bấm vào một tin bất kỳ để xem: Mô tả công việc, Yêu cầu, Lịch ca làm việc, và đặc biệt là **Xếp hạng lương** (ví dụ: _Top X%_ so với thị trường).
5. **Hồ sơ công khai của Nhà tuyển dụng (`/employer/:id`)**
   - Bấm vào tên nhà tuyển dụng từ chi tiết tin để xem trang hồ sơ công khai (logo, mô tả, địa chỉ, website, điểm uy tín và các đánh giá trước đó).
6. **Đăng ký (`/register`), Xác thực email (`/verify-email`) & Đăng nhập (`/login`)**
   - Mở trang Đăng ký, chỉ vào tùy chọn chọn vai trò (**Sinh viên** / **Nhà tuyển dụng**).
   - _(Nếu quay nhanh, có thể giải thích luồng xác thực email `/verify-email` bằng OTP/link rồi chuyển sang Đăng nhập `/login`)_.
7. **Bảo mật & Phân quyền (`/403`, `/404`)** _(Tùy chọn lướt nhanh 5 giây)_
   - Gõ thử một đường dẫn sai để hiện trang **404 Không tìm thấy**, hoặc vào route không đúng quyền để hiện **403 Không có quyền truy cập**.

---

## Phần 2: Nhà tuyển dụng (`EMPLOYER`) — Thiết lập hồ sơ & Đăng tin

**Mục tiêu**: Cho thấy luồng tạo tin tuyển dụng và quản lý tin của nhà tuyển dụng.

1. **Tổng quan Nhà tuyển dụng (`/employer`)**
   - Đăng nhập (hoặc chuyển sang tab Nhà tuyển dụng), xem các số liệu thống kê tin và đơn ứng tuyển đến.
2. **Hồ sơ nhà tuyển dụng (`/employer/organization`)**
   - Vào phần Hồ sơ nhà tuyển dụng: cập nhật tên hiển thị, logo, mô tả, địa chỉ, website.
3. **Đăng tin tuyển dụng (`/employer/jobs/new`)**
   - Điền form tạo tin mới: Tiêu đề, Nhóm việc/Vị trí, Mô tả, Yêu cầu, **Lịch ca**, **Mức lương & Đơn vị trả lương**, **Địa điểm làm việc** (chọn Tỉnh/Thành phố và Xã/Phường).
   - Bấm Đăng tin → API phản hồi **ngay lập tức** (không bắt nhà tuyển dụng phải chờ), tin chuyển vào trạng thái **Chờ duyệt (`PENDING_REVIEW`)**.
   - **Điểm nhấn kỹ thuật (nói khi quay)**: Ngay sau khi lưu tin thành công xuống DB, **backend tự động kích hoạt AI (Gemini) quét nội dung bất đồng bộ ở nền (`aiTaskExecutor`)** theo 6 mã vi phạm mà không làm nghẽn luồng đăng tin. Toàn bộ kết quả AI đều được ẩn khỏi giao diện nhà tuyển dụng.
   - _(Mẹo quay: Bạn có thể đăng 1 tin bình thường để ứng tuyển ở Phần 4, và thử đăng nhanh thêm 1 tin có từ khóa nhạy cảm như "yêu cầu đặt cọc 500k" hoặc "liên hệ qua Zalo" để lát sang tab Admin thấy AI tự động gắn cờ `SUSPECT`/`WARN`)._
4. **Danh sách tin tuyển dụng (`/employer/jobs`)**
   - Kiểm tra tin vừa đăng đang nằm ở trạng thái chờ duyệt (không lộ bất kỳ thông tin AI nào).
   - Chỉ vào các nút thao tác: **Sửa tin (`/employer/jobs/:id/edit`)** _(lưu ý: nếu sửa tin đang `OPEN` hoặc `REJECTED`, tin sẽ quay lại `PENDING_REVIEW` và AI tự động quét lại nền)_ và **Đóng / Mở tin tuyển dụng**.

---

## Phần 3: Quản trị viên (`ADMIN`) — Kiểm duyệt AI & Quản trị hệ thống

**Mục tiêu**: Nhấn mạnh cơ chế AI tự động quét bất đồng bộ, góp ý trực quan và các công cụ quản trị.

1. **Tổng quan Quản trị viên (`/admin`)**
   - Chuyển sang tab Quản trị viên, xem bảng số liệu toàn hệ thống.
2. **Duyệt tin tuyển dụng & Kiểm duyệt AI (`/admin/jobs`)**
   - Mở danh sách tin chờ duyệt: chỉ vào **kết quả AI đã tự động quét nền sẵn** từ lúc nhà tuyển dụng đăng tin ở Phần 2! Các tin có badge cảnh báo (`SUSPECT` → `WARN` → `OK` → chưa kiểm tra) được **tự động sắp xếp nổi lên đầu danh sách**.
   - Mở dialog xem nội dung tin bị gắn cờ (hoặc tin vừa đăng): show **panel phân tích AI** (tóm tắt tiếng Việt, mã vi phạm, **bằng chứng trích nguyên văn** từ tin đã được backend đối chiếu chống AI bịa).
   - Chỉ thêm nút **"Kiểm tra bằng AI"** trong dialog: giải thích đây là nút dùng khi muốn **kiểm tra lại thủ công** (hoặc khi admin mở xem quá sớm lúc tác vụ nền chưa chạy xong — trạng thái "Chưa kiểm tra").
   - Bấm **Duyệt** tin bình thường (và có thể bấm **Từ chối kèm lý do** cho tin vi phạm) → Tin được duyệt chuyển sang **`OPEN`**, hiển thị công khai và bắn thông báo cho nhà tuyển dụng (cũng như sinh viên đang bật theo dõi nhóm việc này). _(Nhấn mạnh: AI chỉ góp ý, Quản trị viên mới là người ra quyết định cuối cùng)_.
3. **Quản lý nhóm việc (`/admin/categories`)**
   - Mở trang Quản lý nhóm việc, cho thấy khả năng thêm/sửa/xóa (CRUD) Nhóm việc và Vị trí công việc.
4. **Quản lý tài khoản (`/admin/users`)**
   - Mở danh sách tài khoản Sinh viên / Nhà tuyển dụng, chỉ vào tính năng **Khóa / Mở khóa tài khoản**.
5. **Thống kê đánh giá (`/admin/reviews`)**
   - Mở trang Thống kê đánh giá, thử lọc đánh giá theo số điểm.

---

## Phần 4: Sinh viên (`STUDENT`) — Hoàn thiện hồ sơ, Lưu việc & Ứng tuyển

**Mục tiêu**: Trải nghiệm trọn vẹn của sinh viên từ lúc chuẩn bị hồ sơ đến khi nộp đơn.

1. **Tổng quan Sinh viên (`/student`)**
   - Chuyển sang tab Sinh viên, xem thống kê nhanh và các đơn ứng tuyển gần đây.
2. **Hồ sơ sinh viên & Quản lý CV (`/student/profile`)**
   - Cập nhật thông tin Học vấn, Kỹ năng, Kinh nghiệm làm việc.
   - Tại mục **CV**: Tải lên tệp CV mẫu (PDF), xem lại CV và chỉ nút Xóa CV (lưu trữ trên Cloudflare R2).
3. **Lưu việc & Bật thông báo tin mới (`/jobs` → `/saved` & `/jobs/:id`)**
   - Vào lại `/jobs`, tìm tin tuyển dụng vừa được Admin duyệt ở Phần 3.
   - Bấm nút **Lưu việc**, sau đó vào trang **Lưu việc (`/saved`)** để kiểm tra tin đã được lưu lại.
   - Mở trang chi tiết tin (`/jobs/:id`), chỉ nút **Bật thông báo** (theo dõi tin tuyển dụng mới theo nhóm việc & tỉnh — khi có tin mới khớp được Admin duyệt, hệ thống sẽ tự gửi thông báo).
4. **Ứng tuyển (`/jobs/:id/apply`)**
   - Từ tin đã lưu (hoặc trang chi tiết tin), bấm **Ứng tuyển**.
   - Chọn CV đã tải lên, nhập Thư ứng tuyển, Mức lương mong muốn → Bấm gửi đơn.
5. **Danh sách đơn & Chi tiết đơn (`/student/applications`, `/student/applications/:id`)**
   - Vào danh sách đơn ứng tuyển, xem trạng thái `PENDING`.
   - Bấm vào chi tiết đơn để xem **Dòng thời gian ứng tuyển** và khung trao đổi hai chiều (và chỉ nút **Rút đơn** nếu sinh viên muốn hủy).

---

## Phần 5: Quy trình tuyển dụng khép kín & Thông báo Real-time

**Mục tiêu**: Chứng minh sự kết nối hai chiều real-time và tự động hóa lịch sử làm việc.

1. **Thông báo Real-time (Nhà tuyển dụng)**
   - Chuyển sang tab **Nhà tuyển dụng**, chỉ vào biểu tượng chuông thông báo (hoặc trang **`/notifications`**) vừa nhảy thông báo mới qua WebSocket: _"Có đơn ứng tuyển mới"_.
2. **Xem CV & Xử lý đơn (`/employer/applications`, `/employer/applications/:id`)**
   - Mở chi tiết đơn ứng tuyển của sinh viên.
   - Bấm **Xem CV** để mở trang xem CV chuyên biệt (`/employer/applications/:id/cv`).
   - Thực hiện chuyển trạng thái đơn tuần tự:
     - **Duyệt sơ bộ (`SHORTLISTED`)** kèm ghi chú.
     - **Nhận ứng viên (`ACCEPTED`)**.
     - **Hoàn thành (`COMPLETED`)** sau khi công việc kết thúc.
3. **Thông báo Real-time & Lịch sử làm việc tự động (Sinh viên)**
   - Chuyển sang tab **Sinh viên**, mở **Trung tâm thông báo (`/notifications`)** để thấy các thông báo cập nhật trạng thái đơn real-time.
   - Vào lại **Hồ sơ sinh viên (`/student/profile`)** → mục **Lịch sử làm việc**: chỉ ra bản ghi lịch sử làm việc đã được **hệ thống tự động sinh ra** khi đơn chuyển sang `COMPLETED`.

---

## Phần 6: Đánh giá hai chiều (Two-way Review)

**Mục tiêu**: Hoàn thiện vòng đời uy tín của cả hai bên sau khi hoàn thành công việc.

1. **Sinh viên đánh giá Nhà tuyển dụng**
   - Tại đơn đã hoàn thành, Sinh viên mở hộp thoại **Viết đánh giá**, chấm điểm (1–5 sao) và nhập nhận xét.
   - Kiểm tra đánh giá hiển thị tại **`/student/reviews`** và trên **Hồ sơ công khai nhà tuyển dụng (`/employer/:id`)**.
2. **Nhà tuyển dụng đánh giá Sinh viên**
   - Nhà tuyển dụng viết đánh giá cho Sinh viên.
   - Kiểm tra đánh giá hiển thị tại **`/employer/reviews`** (và tính năng phản hồi đánh giá nếu có).

---

## Bảng Checklist Kiểm Tra (Đảm bảo không sót tính năng)

Hãy đánh dấu `[x]` sau khi quay xong từng mục:

- [ ] **Công khai**: Trang chủ (`/`), Giới thiệu (`/about`), Tìm & lọc tin (`/jobs`), Chi tiết tin & Xếp hạng lương (`/jobs/:id`), Hồ sơ NTD công khai (`/employer/:id`), Đăng ký (`/register`), Xác thực email (`/verify-email`), Đăng nhập (`/login`), Trang 403/404.
- [ ] **Nhà tuyển dụng**: Tổng quan (`/employer`), Hồ sơ NTD (`/employer/organization`), Đăng tin & **kích hoạt AI quét nền bất đồng bộ** (`/employer/jobs/new`), Sửa & Đóng/mở tin (`/employer/jobs`), Danh sách & Chi tiết đơn (`/employer/applications/:id`), Xem CV (`/employer/applications/:id/cv`), Chuyển trạng thái đơn, Đánh giá (`/employer/reviews`).
- [ ] **Quản trị viên**: Tổng quan (`/admin`), Duyệt tin, **xem kết quả AI tự động quét nền** & **kiểm tra thủ công bằng AI** (`/admin/jobs`), Quản lý nhóm việc (`/admin/categories`), Quản lý tài khoản (`/admin/users`), Thống kê đánh giá (`/admin/reviews`).
- [ ] **Sinh viên**: Tổng quan (`/student`), Hồ sơ & Tải/xem/xóa CV (`/student/profile`), Lịch sử làm việc tự động, Lưu việc (`/saved`), Bật thông báo theo dõi tin mới (`/jobs/:id`), Ứng tuyển (`/jobs/:id/apply`), Danh sách & Chi tiết đơn + Rút đơn (`/student/applications/:id`), Đánh giá (`/student/reviews`).
- [ ] **Hệ thống**: Trung tâm thông báo Real-time WebSocket (`/notifications`) cho các vai trò.
