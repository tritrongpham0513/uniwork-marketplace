# Ảnh preview tin tuyển dụng — tuỳ chọn, không crop, AI không kiểm duyệt

Mỗi tin tuyển dụng có **nhiều nhất một ảnh preview** (`preview_image_url`, tuỳ chọn). Tin không có ảnh vẫn đăng bình thường. Thứ tự hiển thị trên thẻ tin: **ảnh preview → logo tổ chức → khối chữ cái** tên nhà tuyển dụng.

**Lý do**:

1. **Không bắt buộc**: nhiều nhà tuyển dụng không có ảnh mặt tiền cửa hàng. Bắt buộc ảnh sẽ loại họ khỏi nền tảng.
2. **Không crop phía server**: server chỉ giới hạn cạnh dài (1200px) và giữ nguyên tỉ lệ gốc. Nếu server crop thành vuông, nhà tuyển dụng chụp ảnh mặt tiền theo chiều dọc sẽ mất nội dung mà không hề được báo. Phần bị che là do khung vuông ở phía client — và nhà tuyển dụng đã được xem trước đúng khung đó trong form đăng tin.
3. **Không gọi lại AI khi chỉ đổi ảnh**: tầng kiểm duyệt AI chỉ đọc **chữ** (`JobContentAssembler`). Gọi lại AI khi đổi ảnh là đốt hạn mức gọi mà kết quả không đổi. Nhưng tin vẫn phải về `PENDING_REVIEW` để quản trị viên xem ảnh — vì ảnh là nội dung nhà tuyển dụng kiểm soát được và có thể vi phạm (logo hãng khác, nội dung không liên quan).

**Quy trình**:

- Nhà tuyển dụng đăng tin → chọn ảnh (PNG/JPG/WEBP, tối đa 5MB) → server resize cạnh dài còn 1200px, giữ tỉ lệ, lưu vào bucket public.
- Sửa tin đang `OPEN` mà chỉ đổi ảnh → tin về `PENDING_REVIEW`, quản trị viên duyệt lại, **không** gọi lại AI.
- Sửa tin kèm nội dung chữ → tin về `PENDING_REVIEW` **và** gọi lại AI như bình thường.
- Tin có ảnh preview → thẻ tin hiển thị ảnh vuông; trang chi tiết có ảnh lớn + hộp thoại phóng to.

**Ràng buộc sở hữu**: backend chỉ chấp nhận `previewImageUrl` là file do **chính nhà tuyển dụng đang đăng tin** tải lên, có loại `JOB_IMAGE` và chưa bị xoá. Nhờ vậy không ai dán được ảnh của nhà tuyển dụng khác (hay ảnh ngoài hệ thống) vào tin của mình.

**Điểm chốt**: ảnh preview là **tính năng phụ trợ**, không phải điều kiện để được duyệt. Vì vậy:

- Tin không có ảnh vẫn được duyệt và hiển thị bình thường.
- Ảnh là loại tệp `JOB_IMAGE` riêng (không dùng chung `LOGO`) để quota, kích thước resize và kiểm tra sở hữu tách bạch.
- Đổi ảnh là thao tác **tốn hạn mức kiểm duyệt AI** — nên form đăng tin có hộp thoại xác nhận trước khi gửi, để nhà tuyển dụng biết tin sẽ tạm ẩn khỏi danh sách.
