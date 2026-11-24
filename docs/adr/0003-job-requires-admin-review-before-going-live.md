# Tin tuyển dụng phải duyệt admin trước khi đi live

Tin tuyển dụng do nhà tuyển dụng đăng sẽ ở trạng thái `PENDING_REVIEW` cho đến khi quản trị viên duyệt (chuyển sang `OPEN`) hoặc từ chối (chuyển sang `REJECTED`). Chỉ tin ở trạng thái `OPEN` mới hiện trên tìm kiếm công khai.

**Lý do**:
1. **Chống spam**: tránh tin giả, nội dung không phù hợp được phát tán trước khi moderator kịp xem.
2. **Chất lượng**: admin có cơ hội kiểm tra tin có đúng định dạng, không chứa quảng cáo lợi dụng platform.
3. **Pháp lý**: một số ngành (như du lịch) cần lệnh cấp trên — duyệt tạo điểm kiểm soát.

**Quy trình**: 
- Nhà tuyển dụng đăng tin → tin ở `PENDING_REVIEW`.
- Quản trị viên vào `/admin/jobs` → xem danh sách chờ duyệt → approve/reject.
- Tin được duyệt → `OPEN` → hiển thị công khai (sinh viên có thể tìm thấy và ứng tuyển).
- Tin bị từ chối → `REJECTED` → không hiển thị, nhà tuyển dụng thấy được lý do từ chối (note).

**Điểm chốt**: trạng thái `PENDING_REVIEW` tồn tại để vật cắn giữa muốn công khai nhanh (`OPEN` luôn) và muốn an toàn tuyệt đối (không cho phép đăng ngay).
