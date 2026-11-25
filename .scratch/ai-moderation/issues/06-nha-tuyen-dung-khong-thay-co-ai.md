# 06: Nhà tuyển dụng biết tin sẽ được kiểm tra tự động, không thấy cờ AI

**What to build:** Ở form đăng tin tuyển dụng, nhà tuyển dụng thấy một dòng thông báo cho biết nội dung tin sẽ được kiểm tra tự động bằng AI. Đó là tất cả nhà tuyển dụng được biết.

Đồng thời phải bảo đảm ranh giới phân quyền của đặt tả: nhà tuyển dụng **không** được xem kết quả AI của tin mình — kể cả trong hồ sơ công khai và danh sách tin của họ; nhà tuyển dụng **không** nhận thông báo nào về việc AI gắn cờ tin của họ; và danh sách tin tuyển dụng công khai **không** hiển thị cờ AI.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** ready-for-agent

- [ ] Form đăng tin tuyển dụng có một dòng thông báo nội dung tin sẽ được kiểm tra tự động bằng AI (dùng câu chữ đã chốt ở ticket 01).
- [ ] Nhà tuyển dụng không thấy verdict, mức độ, mã vi phạm, hay bất kỳ kết quả AI nào trên tin của họ.
- [ ] Danh sách tin tuyển dụng công khai không hiển thị cờ AI.
- [ ] Hồ sơ công khai của nhà tuyển dụng không hiển thị cờ AI.
- [ ] Nhà tuyển dụng không nhận thông báo nào về việc AI gắn cờ tin của họ.
- [ ] Dữ liệu trả về cho quản trị viên và dữ liệu trả về cho nhà tuyển dụng là hai hình dạng tách biệt, để kết quả AI không thể lọt ra ngoài nhầm lẫn.
- [ ] Tin tuyển dụng đăng với nội dung vi phạm vẫn không bị chặn — vẫn vào hàng đợi duyệt bình thường.

## Comments
