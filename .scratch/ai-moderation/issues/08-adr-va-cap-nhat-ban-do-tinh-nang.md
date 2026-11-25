# 08: ADR cho lớp góp ý AI và cập nhật bản đồ tính năng

**What to build:** Ghi lại quyết định kiến trúc của tính năng kiểm duyệt nội dung tin tuyển dụng bằng AI, để sau này người đọc code hiểu vì sao có lớp góp ý AI, vì sao AI không bao giờ tự quyết, và vì sao nhà tuyển dụng không được thông báo khi tin của họ bị gắn cờ. ADR 0003 (tin tuyển dụng phải duyệt quản trị viên trước khi đi live) không bị sửa đổi — tính năng này chỉ bổ sung thông tin cho quản trị viên.

Kèm theo, cập nhật bản đồ tính năng để có dòng cho kiểm duyệt nội dung bằng AI trong phần quản trị viên.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** ready-for-agent

- [ ] Có một ADR mới giải thích: vì sao có lớp góp ý AI; vì sao AI không tự duyệt / tự từ chối tin tuyển dụng; vì sao nhà tuyển dụng không được thông báo về việc bị gắn cờ (chưa có đường khiếu nại); vì sao kết quả AI chỉ lưu trên bản ghi tin tuyển dụng, không có bảng riêng.
- [ ] ADR nêu rõ quan hệ với ADR 0003: ADR 0003 giữ nguyên, tính năng này chỉ bổ sung thông tin.
- [ ] ADR dùng đúng thuật ngữ trong `GLOSSARY.md`.
- [ ] `docs/feature-map.md` có dòng cho kiểm duyệt nội dung bằng AI trong phần quản trị viên, khớp với route và component thật.

## Comments
