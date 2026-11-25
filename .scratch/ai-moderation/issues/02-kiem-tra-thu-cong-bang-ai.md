# 02: Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI

**What to build:** Quản trị viên mở hộp thoại xem nội dung một tin tuyển dụng trong trang Duyệt tin tuyển dụng, bấm "Kiểm tra bằng AI", và ngay trong hộp thoại đó thấy phần đánh giá của AI: verdict, một câu tóm tắt, và từng lý do gồm mã vi phạm, câu trích nguyên văn trong tin, cùng giải thích ngắn. Bên dưới ghi rõ đây là góp ý của AI, quyết định vẫn là của quản trị viên. Thứ tự hiển thị: nội dung tin trước, góp ý AI sau, để quản trị viên tự đối chiếu.

Kết quả kiểm tra được lưu ngay trên bản ghi tin tuyển dụng, nên quản trị viên không phải đăng nhập lại hay làm mới trang để xem. Nút Duyệt / Từ chối giữ nguyên, AI không bao giờ tự chuyển trạng thái tin tuyển dụng.

**Blocked by:** 01 — Chốt và chạy thử prompt kiểm duyệt nội dung tin tuyển dụng.

**Status:** ready-for-agent

- [ ] Tin tuyển dụng lưu được ba thông tin kiểm duyệt: verdict, danh sách lý do, và thời điểm kiểm tra. Verdict rỗng nghĩa là **chưa kiểm tra** — phân biệt được với kết quả `OK`.
- [ ] Có một interface cho nhà cung cấp AI và một hiện thực cho Gemini; đổi nhà cung cấp chỉ cần đổi cấu hình, không sửa mã nghiệp vụ.
- [ ] Hiện thực Gemini gọi HTTP bằng HTTP client sẵn có của Spring, không thêm thư viện SDK mới; dùng `responseMimeType` và `responseSchema` để ép hình dạng kết quả; timeout 30 giây.
- [ ] Có lớp dựng prompt tách riêng khỏi lớp gọi HTTP, để chỉnh nội dung chỉ dẫn không phải đụng code gọi mạng.
- [ ] Backend kiểm tra hình dạng kết quả trước khi ghi: sai cấu trúc thì **không ghi gì** vào bản ghi tin tuyển dụng, chỉ ghi log.
- [ ] Có endpoint kiểm tra thủ công dành riêng cho quản trị viên, trả về cùng hình dạng với kết quả lưu trong bản ghi tin tuyển dụng để giao diện render một chỗ.
- [ ] Tin không tồn tại trả về 404; tài khoản không phải quản trị viên trả về 403.
- [ ] Khi AI lỗi (hết hạn mức, lỗi dịch vụ), trả về thông điệp tiếng Việt nói rõ nguyên nhân, **không** phải lỗi 500.
- [ ] Cấu hình đọc từ biến môi trường: bật/tắt toàn bộ tính năng, tên nhà cung cấp AI, tên model, và khóa API. Thiếu khóa API thì tính năng **ẩn**, không phải lỗi.
- [ ] Nút "Kiểm tra bằng AI" dùng được cho cả tin chưa kiểm tra lẫn tin đã có kết quả, để quản trị viên kiểm tra lại được tin đã có kết quả. Mỗi lần bấm là một lượt AI.
- [ ] Tin tuyển dụng không đổi trạng thái dù kết quả là gì; nút Duyệt / Từ chối giữ nguyên hành vi.
- [ ] Có bộ test với một nhà cung cấp AI giả trả kết quả cố định: kết quả hợp lệ thì ba thông tin kiểm duyệt được ghi đúng; nhà cung cấp trả về cấu trúc sai thì không ghi gì; nhà cung cấp ném lỗi thì kết quả giữ nguyên rỗng và hàm không ném lỗi ra ngoài; tin không tồn tại thì trả lỗi 404.
- [ ] Có bộ test endpoint với MockMvc: gọi endpoint kiểm tra AI trả về đúng mã và hình dạng; lỗi hạn mức của AI trả về thông điệp tiếng Việt chứ không phải 500.

## Comments
