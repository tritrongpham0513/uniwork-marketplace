# 05: Badge mức độ vi phạm và sắp xếp nổi lên đầu trang Duyệt tin tuyển dụng

**What to build:** Trang Duyệt tin tuyển dụng phải giúp quản trị viên thấy ngay tin nào đáng soi kỹ. Tin đã có kết quả kiểm tra và bị gắn cờ nổi lên đầu danh sách; trong nhóm đó, mức `SUSPECT` trước mức `WARN`. Tin có kết quả `OK` và tin chưa kiểm tra nằm sau, theo thứ tự thời gian hiện tại. Mỗi tin có một badge màu theo mức độ: đỏ cho `SUSPECT` với nhãn "AI: cần xem", hổ phách cho `WARN` với nhãn "AI: nghi ngờ", xanh cho `OK` với nhãn "AI: ổn", xám với nhãn "Chưa kiểm tra" cho tin chưa có kết quả.

Quản trị viên cũng thấy được thời điểm AI đã kiểm tra tin, để biết kết quả còn giá trị hay không.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** ready-for-agent

- [ ] Danh sách tin chờ duyệt sắp theo mức độ vi phạm: tin bị gắn cờ nổi lên đầu, `SUSPECT` trước `WARN`, rồi `OK` và chưa kiểm tra ở sau theo thứ tự thời gian hiện tại.
- [ ] Mỗi tin có badge màu đúng theo mức độ: đỏ "AI: cần xem", hổ phách "AI: nghi ngờ", xanh "AI: ổn", xám "Chưa kiểm tra".
- [ ] Hiển thị thời điểm AI kiểm tra tin tuyển dụng.
- [ ] Quản trị viên thấy được mức lương của tin so với mức trung bình của ngành và tỉnh, và biết nhà tuyển dụng đã xác minh hay chưa kèm điểm uy tín.
- [ ] Hàm sắp xếp là một hàm thuần trong thư mục `lib` của feature `admin`, test được độc lập.
- [ ] Có bộ test Vitest cho hàm sắp xếp: `SUSPECT` trước `WARN` trước `OK` trước chưa kiểm tra; thứ tự trong cùng nhóm giữ nguyên; danh sách rỗng không lỗi.
- [ ] Tin tuyển dụng không bị gắn cờ không bị ẩn hay bị loại khỏi hàng đợi duyệt — AI chỉ gợi ý, quyết định vẫn là của quản trị viên.

## Comments
