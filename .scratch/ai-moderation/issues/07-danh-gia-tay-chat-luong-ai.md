# 07: Đánh giá tay chất lượng AI trên bộ 7 mẫu tin tuyển dụng

**What to build:** Chứng minh bằng bộ mẫu tin tuyển dụng thật rằng lớp góp ý AI đủ tin cậy để đưa vào quy trình duyệt. Bộ mẫu gồm bảy tin: yêu cầu đặt cọc tiền để giữ chỗ làm; thuê sinh viên làm thêm không cần CCCD; mời ứng tuyển qua Zalo không cần lên nền tảng; điều kiện chỉ nam, không ở trọ, dưới 20 tuổi không xét; công việc liên quan mại dâm; lương 500.000đ/giờ ở nhóm việc nhà hàng tại một tỉnh có mức trung bình 28.000đ/giờ; và một tin bình thường lương 30.000đ/giờ đủ thông tin.

Tiêu chí nghiệm thu: verdict đúng với kỳ vọng ở ít nhất 6/7 mẫu; mọi bằng chứng là câu nguyên văn có trong tin đối chiếu được tay; verdict `OK` thì danh sách lý do rỗng; tin tuyển dụng không bị thay đổi trạng thái; nhà tuyển dụng đăng tin có nội dung vi phạm vẫn không bị chặn; khi mô phỏng lỗi AI thì giao diện hiện "chưa kiểm tra" chứ không phải lỗi kỹ thuật.

**Blocked by:** 03 — Đưa xếp hạng lương và uy tín nhà tuyển dụng vào đầu vào AI. 04 — Kiểm tra AI tự động ở nền khi đăng tin và khi sửa tin đã duyệt.

**Status:** ready-for-agent

- [ ] Chạy lại đúng bảy mẫu tin tuyển dụng qua đường chạy thật của ứng dụng (không phải script độc lập ở ticket 01).
- [ ] Verdict đúng với kỳ vọng ở ít nhất 6/7 mẫu; mẫu còn lại được ghi lại lý do không đạt.
- [ ] Mọi bằng chứng trong kết quả đều là câu nguyên văn có thật trong tin, đối chiếu tay được.
- [ ] Verdict `OK` thì danh sách lý do rỗng.
- [ ] Tin tuyển dụng không bị thay đổi trạng thái sau khi có kết quả kiểm tra; quản trị viên vẫn duyệt / từ chối như trước.
- [ ] Nhà tuyển dụng đăng tin có nội dung vi phạm vẫn không bị chặn — vẫn vào hàng đợi duyệt bình thường.
- [ ] Mô phỏng lỗi AI → giao diện hiện "chưa kiểm tra" chứ không phải lỗi kỹ thuật.
- [ ] Kết quả đánh giá được ghi lại kèm theo, để dùng làm căn cứ nếu sau này cần chỉnh nội dung chỉ dẫn.

## Comments
