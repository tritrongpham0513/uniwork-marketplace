# 🎬 Bộ dữ liệu DEMO để quay video

Bộ dữ liệu này **độc lập hoàn toàn** với dữ liệu dev của Flyway, được nạp bằng **một lệnh riêng**.

## Chạy

```bash
./dev.sh seed          # nạp vào DB dev  (docker-compose.dev.yml, port 3307)
./dev.sh seed-prod     # nạp vào DB prod (docker-compose.yml,     port 3306)

# hoặc gọi trực tiếp
./seed/seed-demo.sh
./seed/seed-demo.sh --prod
./seed/seed-demo.sh --host 127.0.0.1 --port 3306 --user root --password secret
```

Chạy lại bao nhiêu lần cũng cho cùng kết result (idempotent) — an toàn để quay video nhiều lần.

## Nội dung

| Nhóm | Số lượng |
| --- | --- |
| Người dùng (43 SV + 9 nhà tuyển dụng + 2 admin) | 54 |
| Hồ sơ sinh viên / nhà tuyển dụng | 43 / 9 |
| Tin tuyển dụng (8 nhóm việc, 9 trạng thái) | 48 |
| Lịch ca làm việc | 76 |
| Đơn ứng tuyển (đủ 6 trạng thái pipeline) | 118 |
| Lịch sử chuyển trạng thái đơn | 215 |
| Đánh giá 2 chiều (có cả trả lời) | 12 |
| Kinh nghiệm làm việc (tự ghi nhận) | 20 |
| Tin đã lưu | 10 |
| Thông báo | 22 |
| Báo cáo vi phạm | 3 |
| Nhật ký hệ thống (audit log) | 15 |
| Bảng xếp hạng lương (ngành × tỉnh) | 28 |

## Đặc điểm dữ liệu

- **Mỗi tin đang tuyển có 2-4 ứng viên THẬT** — ứng viên được chọn theo mức độ phù hợp
  (kỹ năng + cùng tỉnh + mục tiêu việc làm đã khai), nên hồ sơ nhìn "có lý do".
- **Bộ đếm luôn khớp với dữ liệu gốc**: `applicant_count`, `positions_filled`, `view_count`,
  `avg_rating`, `rating_count` đều được **tính lại** từ chính các dòng đơn / đánh giá
  trong DB ở Section 16 — không có con số nào được chế tác thủ công.
- **Trạng thái tin bám theo đơn ứng tuyển**: tin có người được nhận → `IN_PROGRESS`,
  tuyển đủ suất → `FILLED`, hết hạn → `CLOSED`. Tin còn `OPEN` thì vẫn `OPEN`.
- **Timeline đơn khớp trạng thái**: bước cuối trong `application_status_history`
  luôn bằng `applications.status`.
- Có **Section 16.3** gồm 15 truy vấn tự kiểm tra — chạy seed xong sẽ in kết quả,
  tất cả đều phải bằng `0` (không có sai lệch nào).

## Tài khoản đăng nhập

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Sinh viên (main) | `student@viejob.vn` | `Student@123` |
| Sinh viên | `hoa.nguyen@sv.edu.vn` | `Student@123` |
| Nhà tuyển dụng (main) | `employer@viejob.vn` | `Employer@123` |
| Nhà tuyển dụng | `quan.lym@viejob.demo` | `Employer@123` |
| Quản trị viên | `admin@viejob.vn` | `Admin@123` |

Mọi tài khoản demo còn lại dùng chung mật khẩu theo vai trò
(`Student@123` / `Employer@123` / `Admin@123`).

## Khi nào KHÔNG cần dùng

- **Lập trình tính năng mới** — dev dùng DB riêng, seed `V3`/`V7`/`V9` của Flyway là đủ.
- **CI/CD hay deploy thật** — Flyway lo.

## Nguyên tắc kỹ thuật

- File `seed/demo_seed.sql` là **SQL tĩnh**, không nằm trong `db/migration/` →
  **không** làm thay đổi checksum Flyway, không gây `Migration checksum mismatch`.
- Bước vệ sinh đầu file xoá toàn bộ dữ liệu demo cũ (bao gồm cả bản ghi seed `V3`/`V7`/`V9`)
  rồi nạp lại → sau khi chạy, app chỉ có **một câu chuyện duy nhất**, nhất quán với nhau
  khi quay video.
- Master data (tỉnh, xã/phường, nhóm việc, vị trí, kỹ năng) do Flyway quản lý —
  file này chỉ **tham chiếu**, không tạo lại.
- Muốn đưa DB về trạng thái gốc từ đầu: `./dev.sh reset`
  (xoá volume MySQL → Flyway migrate lại từ V1).

## Sinh lại khối đơn ứng tuyển chéo

Khối **Section 7b** (93 đơn ứng tuyển chéo, ID 1200+) được sinh bằng script
`.tmp-seed/gen-apps.js` chạy trên Node.js. Quy trình:

```bash
bash seed/seed-demo.sh          # nạp dữ liệu nền (chưa có đơn chéo)
bash .tmp-seed/export.sh        # export jobs/students/skills từ DB ra .tmp-seed/*.tsv
node .tmp-seed/gen-apps.js      # sinh seed/gen_applications.sql
node .tmp-seed/merge-gen.js     # chèn khải 7b vào seed/demo_seed.sql
bash seed/seed-demo.sh          # nạp lại + tự kiểm tra 15 mục
```

Script đọc dữ liệu THẬT từ DB nên đơn sinh ra luôn khớp với kỹ năng, tỉnh và
mục tiêu việc làm của từng sinh viên.
