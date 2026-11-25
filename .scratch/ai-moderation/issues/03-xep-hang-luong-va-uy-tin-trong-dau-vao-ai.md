# 03: Đưa xếp hạng lương và uy tín nhà tuyển dụng vào đầu vào AI

**What to build:** Khi AI kiểm tra một tin tuyển dụng, ngoài nội dung tin nó còn cần biết mức lương của tin đó có bất thường so với thị trường hay không, và nhà tuyển dụng có đáng tin hay không. Sau ticket này, đầu vào cho AI có thêm: mức lương đã quy đổi về đồng/giờ kèm đơn vị trả lương gốc, mức trung bình / thấp nhất / cao nhất / cỡ mẫu của bảng xếp hạng lương cho nhóm việc × Tỉnh / Thành phố, và trạng thái đã xác minh cùng điểm uy tín trung bình và số lượt đánh giá của nhà tuyển dụng.

Hệ quả quan sát được: mã vi phạm `SALARY_ANOMALY` trở nên phát hiện được — một tin trả lương 500.000đ/giờ ở nhóm việc nhà hàng tại một tỉnh có mức trung bình 28.000đ/giờ phải ra `WARN` hoặc `SUSPECT`, thay vì `OK`.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** ready-for-agent

- [ ] Đầu vào cho AI có mức lương đã quy đổi về đồng/giờ theo bảng quy đổi sẵn có của hệ thống, kèm đơn vị trả lương gốc mà nhà tuyển dụng khai báo.
- [ ] Đầu vào cho AI có bốn số của bảng xếp hạng lương theo nhóm việc × Tỉnh / Thành phố: mức trung bình, thấp nhất, cao nhất, và cỡ mẫu.
- [ ] Đầu vào cho AI có trạng thái đã xác minh của nhà tuyển dụng, điểm uy tín trung bình, và số lượt đánh giá.
- [ ] Không gửi bất kỳ dữ liệu cá nhân của sinh viên nào — không có CV, không có hồ sơ sinh viên, không có đơn ứng tuyển.
- [ ] Tin tuyển dụng không có bảng xếp hạng lương tương ứng thì vẫn kiểm tra được, chỉ là thiếu căn cứ so sánh lương.
- [ ] Có bộ test chứng minh một tin lương bất thường so với bảng xếp hạng lương của nhóm việc × Tỉnh / Thành phố bị gắn cờ `SALARY_ANOMALY`.

## Comments
