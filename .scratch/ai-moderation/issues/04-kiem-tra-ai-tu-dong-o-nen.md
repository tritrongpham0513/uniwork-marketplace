# 04: Kiểm tra AI tự động ở nền khi đăng tin và khi sửa tin đã duyệt

**What to build:** Nhà tuyển dụng đăng tin tuyển dụng thì hệ thống tự động kiểm tra nội dung tin bằng AI ở chế độ nền, không chặn thao tác của nhà tuyển dụng và không làm tin phải chờ. Tin tuyển dụng vẫn vào hàng đợi duyệt bình thường, vẫn ở trạng thái chờ duyệt, quản trị viên vẫn bấm Duyệt / Từ chối như hiện tại.

Quy tắc tiết kiệm hạn mức: sửa một tin vốn đang chờ duyệt thì **không** chạy kiểm tra lại; chỉ khi sửa một tin đã được duyệt (tin quay lại hàng đợi chờ duyệt) thì mới chạy lại, để nội dung mới không lọt qua.

Khi AI không chạy được, tin tuyển dụng vẫn hiển thị bình thường trong hàng đợi duyệt và được đánh dấu "chưa kiểm tra".

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** ready-for-agent

- [ ] Đăng tin tuyển dụng mới → hệ thống tự động kiểm tra bằng AI ở nền, sau khi response HTTP đã trả về cho nhà tuyển dụng.
- [ ] Sửa một tin tuyển dụng đã được duyệt (tin quay lại hàng đợi chờ duyệt) → hệ thống kiểm tra lại bằng AI.
- [ ] Sửa một tin tuyển dụng vốn đang chờ duyệt → **không** gọi lại AI.
- [ ] Xoá hoặc huỷ tin tuyển dụng → không gọi AI.
- [ ] Có executor riêng cho tác vụ AI, tách khỏi executor gửi email đang có.
- [ ] AI lỗi (lỗi mạng, hết hạn mức, chưa cấu hình khóa) thì luồng đăng tin không hỏng: tin vẫn đăng bình thường, kết quả kiểm duyệt giữ nguyên rỗng (chưa kiểm tra), không có lỗi 500 cho nhà tuyển dụng.
- [ ] Tin tuyển dụng không bao giờ bị AI tự chuyển trạng thái.
- [ ] Có bộ test trên lớp nghiệp vụ tin tuyển dụng: đăng tin mới thì có phát sinh lệnh kiểm tra; sửa tin đã duyệt thì có phát sinh; sửa tin vẫn đang chờ duyệt thì không phát sinh.
- [ ] Có thể theo dõi số lượt AI đã gọi qua log ứng dụng (chưa cần bảng đếm riêng).

## Comments
