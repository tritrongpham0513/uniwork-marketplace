# 08: ADR cho lớp góp ý AI và cập nhật bản đồ tính năng

**What to build:** Ghi lại quyết định kiến trúc của tính năng kiểm duyệt nội dung tin tuyển dụng bằng AI, để sau này người đọc code hiểu vì sao có lớp góp ý AI, vì sao AI không bao giờ tự quyết, và vì sao nhà tuyển dụng không được thông báo khi tin của họ bị gắn cờ. ADR 0003 (tin tuyển dụng phải duyệt quản trị viên trước khi đi live) không bị sửa đổi — tính năng này chỉ bổ sung thông tin cho quản trị viên.

Kèm theo, cập nhật bản đồ tính năng để có dòng cho kiểm duyệt nội dung bằng AI trong phần quản trị viên.

**Blocked by:** 02 — Quản trị viên kiểm tra thủ công một tin tuyển dụng bằng AI.

**Status:** done

- [x] Có một ADR mới giải thích: vì sao có lớp góp ý AI; vì sao AI không tự duyệt / tự từ chối tin tuyển dụng; vì sao nhà tuyển dụng không được thông báo về việc bị gắn cờ (chưa có đường khiếu nại); vì sao kết quả AI chỉ lưu trên bản ghi tin tuyển dụng, không có bảng riêng.
- [x] ADR nêu rõ quan hệ với ADR 0003: ADR 0003 giữ nguyên, tính năng này chỉ bổ sung thông tin.
- [x] ADR dùng đúng thuật ngữ trong `GLOSSARY.md`.
- [x] `docs/feature-map.md` có dòng cho kiểm duyệt nội dung bằng AI trong phần quản trị viên, khớp với route và component thật.

## Comments

**Kết quả (25/11/2026)**

- ADR mới: `docs/adr/0005-ai-review-layer-for-job-posts.md` — 8 mục quyết định
  (AI không tự chuyết trạng thái · chỉ quản trị viên thấy kết quả AI, tách ở tầng DTO ·
  prompt tách 2 khối chống chỉ đạo nhầm · bằng chứng nguyên văn được backend kiểm lại ·
  trừu tượng provider không thêm dependency · thiếu khoá API thì ẩn tính năng ·
  executor riêng, lỗi AI không làm hỏng luồng đăng tin · lưu trên bản ghi tin tuyển dụng),
  kèm mục Hệ quả, Giới hạn đã biết và Phương án đã cân nhắc.
- ADR nêu rõ ADR 0003 giữ nguyên; tính năng chỉ bổ sung thông tin cho quản trị viên.
- `docs/feature-map.md`: thêm mục **Kiểm duyệt nội dung bằng AI** trong phần Quản trị
  viên (route `/admin/jobs` → `pages/admin/jobs.tsx`, đã đối chiếu `paths.ts` + `router.tsx`),
  kèm bảng endpoint riêng cho quản trị viên.
