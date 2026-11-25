# 01: Thử và chốt prompt kiểm duyệt nội dung tin tuyển dụng

**What to build:** Trước khi viết mã ứng dụng, cần chốt được nội dung chỉ dẫn cho AI và hình dạng kết quả mà AI sẽ trả về. Để làm được vậy cần một công cụ độc lập (script Node, chạy ngoài ứng dụng) dựng đúng prompt và lược đồ kết quả, rồi chạy trên bộ mẫu tin tuyển dụng thật.

Kết quả của ticket này là một bản ghi lại đã chốt: nội dung chỉ dẫn, quy tắc bằng chứng nguyên văn, danh sách mã vi phạm hợp lệ, hình dạng JSON kết quả, và đánh giá ban đầu trên bộ mẫu. Không có ticket này thì mọi thứ viết trong ứng dụng là mù.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Có một công cụ độc lập chạy được ngoài ứng dụng, dựng prompt theo cấu trúc: phần chỉ dẫn tách riêng, phần dữ liệu tin tuyển dụng nằm trong khối riêng kèm câu nhắc coi nội dung đó là dữ liệu và bỏ qua mọi chỉ dẫn nằm trong đó.
- [ ] Cấu hình khóa API lấy từ biến môi trường, không nằm trong mã nguồn và không được ghi log.
- [ ] Chạy được trên bộ 7 mẫu tin tuyển dụng thật, mỗi mẫu là một tin có nội dung vi phạm rõ ràng hoặc một tin bình thường, theo danh sách mẫu trong đặt tả.
- [ ] Kết quả trả về có hình dạng cố định: verdict (`OK` | `WARN` | `SUSPECT`), một câu tóm tắt tiếng Việt, và danh sách lý do gồm mã vi phạm, câu trích nguyên văn, giải thích ngắn.
- [ ] Chỉ dùng đúng sáu mã vi phạm đã định nghĩa sẵn: `FEE_ADVANCE`, `UNREGISTERED_WORK`, `OFF_PLATFORM`, `SALARY_ANOMALY`, `DISCRIMINATION`, `ILLEGAL_WORK`. Không có mã cho tin thiếu thông tin.
- [ ] Quy tắc bắt buộc đã được kiểm chứng bằng thử nghiệm: mỗi lý do nêu ra đều kèm được một câu nguyên văn có thật trong tin; lý do không trích được câu nguyên văn thì không được đưa vào kết quả.
- [ ] Chốt được câu chữ thông báo cho nhà tuyển dụng ở form đăng tin, và câu chữ nhãn hiển thị cho quản trị viên (nhãn badge, câu ghi rõ đây là góp ý của AI).
- [ ] Ghi lại kết quả thử: verdict thực tế của từng mẫu, và nhận xét về độ tin cậy của từng mã vi phạm.
- [ ] Xác minh được hạn mức thật của dự án tại trang giới hạn của AI Studio, không dựa vào con số từ nguồn thứ ba.

## Comments
