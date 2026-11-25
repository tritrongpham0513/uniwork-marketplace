# Bản đồ tính năng theo vai trò

Tài liệu này là **sơ đồ trang** của app: liệt kê tính năng + route + component thật sự tồn tại, theo từng vai trò người dùng.

**Nguồn sự thật**: route lấy từ `app/src/config/paths.ts`, ánh xạ tới page lấy từ `app/src/app/router.tsx`. Khi thêm route mới, cập nhật cả hai file này — nếu bản đồ lệch với code, agent sẽ đi sai chỗ.

**Thuật ngữ**: dùng đúng từ trong [`GLOSSARY.md`](../GLOSSARY.md) (ví dụ: "lưu việc" không phải "yêu thích", "tin tuyển dụng" không phải "tin việc làm", "đánh giá" không phải "review").

---

## Công khai (chưa đăng nhập)

| Tính năng                      | Mô tả                                             | Route           | Page                                |
| ------------------------------ | ------------------------------------------------- | --------------- | ----------------------------------- |
| Trang chủ                      | Giới thiệu, tin tuyển dụng nổi bật                | `/`             | `pages/home/index.tsx`              |
| Giới thiệu                     | Thông tin về nền tảng                             | `/about`        | `pages/about/index.tsx`             |
| Danh sách tin tuyển dụng       | Tìm kiếm, lọc theo nhóm việc, địa điểm, mức lương | `/jobs`         | `pages/jobs/index.tsx`              |
| Chi tiết tin tuyển dụng        | Mô tả, yêu cầu, xếp hạng lương                    | `/jobs/:id`     | `pages/job-detail/index.tsx`        |
| Hồ sơ nhà tuyển dụng công khai | Xem được bởi mọi khách, kể cả chưa đăng nhập      | `/employer/:id` | `pages/employer/public-profile.tsx` |
| Đăng nhập                      | Email + mật khẩu                                  | `/login`        | `pages/login/index.tsx`             |
| Đăng ký                        | Chọn vai trò (sinh viên / nhà tuyển dụng), form   | `/register`     | `pages/signup/index.tsx`            |
| Xác thực email                 | Nhập OTP hoặc link xác minh                       | `/verify-email` | `pages/verify-email/index.tsx`      |
| Không có quyền truy cập        | Trang 403 khi role không khớp                     | `/403`          | `pages/forbidden/index.tsx`         |
| Không tìm thấy                 | Trang 404                                         | `*`             | `pages/not-found/index.tsx`         |

---

## Sinh viên (STUDENT)

Cung cấp bởi `WorkspaceLayout` + `RequireRole(["STUDENT"])`.

| Tính năng                   | Mô tả                                                                     | Route                       | Page                                   |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------- | -------------------------------------- |
| Tổng quan                   | Thống kê nhanh, đơn ứng tuyển gần đây                                     | `/student`                  | `pages/student/index.tsx`              |
| **Hồ sơ sinh viên**         | Học vấn, kỹ năng, CV, kinh nghiệm, lịch sử làm việc                       | `/student/profile`          | `pages/student/profile.tsx`            |
| **Danh sách đơn ứng tuyển** | Trạng thái: chờ, duyệt sơ bộ, nhận ứng viên, hoàn thành, từ chối, rút đơn | `/student/applications`     | `pages/student/applications.tsx`       |
| Chi tiết đơn ứng tuyển      | Đơn + dòng thời gian + trao đổi hai chiều                                 | `/student/applications/:id` | `pages/student/application-detail.tsx` |
| **Lưu việc**                | Danh sách tin tuyển dụng đã lưu để xem lại                                | `/saved`                    | `pages/saved-jobs/index.tsx`           |
| **Đánh giá**                | Các đánh giá nhà tuyển dụng đã gửi cho mình                               | `/student/reviews`          | `pages/student/reviews.tsx`            |
| **Trung tâm thông báo**     | Thay đổi trạng thái đơn, tin tuyển dụng mới theo nhóm việc đã theo dõi    | `/notifications`            | `pages/notifications/index.tsx`        |

**Tính năng nằm trong trang, không có route riêng**:

| Tính năng                        | Mô tả                                             | Nơi chứa                                        |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Tải lên / xem / xoá CV           | CV là một mục trong hồ sơ sinh viên               | `pages/student/profile.tsx` (mục "CV")          |
| Lịch sử làm việc                 | Bản ghi tự động sinh khi đơn ứng tuyển hoàn thành | `pages/student/profile.tsx` (mục "Kinh nghiệm") |
| Ứng tuyển                        | Nộp CV + thư ứng tuyển + mức lương mong muốn      | `pages/job-apply/index.tsx` (`/jobs/:id/apply`) |
| Viết đánh giá cho nhà tuyển dụng | Chấm điểm 1–5 + nhận xét                          | `components/shared/review-dialog.tsx`           |

---

## Nhà tuyển dụng (EMPLOYER)

Cung cấp bởi `WorkspaceLayout` + `RequireRole(["EMPLOYER"])`.

| Tính năng                    | Mô tả                                                 | Route                           | Page                                    |
| ---------------------------- | ----------------------------------------------------- | ------------------------------- | --------------------------------------- |
| Tổng quan                    | Thống kê tin, đơn ứng tuyển đến                       | `/employer`                     | `pages/employer/index.tsx`              |
| **Danh sách tin tuyển dụng** | Trạng thái: chờ duyệt, đang mở, đã đóng               | `/employer/jobs`                | `pages/employer/jobs.tsx`               |
| **Đăng tin tuyển dụng**      | Form tạo tin: mô tả, yêu cầu, lịch ca, mức lương      | `/employer/jobs/new`            | `pages/employer/job-form.tsx`           |
| Sửa tin tuyển dụng           | Cùng form, nạp sẵn dữ liệu cũ                         | `/employer/jobs/:id/edit`       | `pages/employer/job-form.tsx`           |
| **Danh sách đơn ứng tuyển**  | Các đơn ứng tuyển về tin của nhà tuyển dụng           | `/employer/applications`        | `pages/employer/applications.tsx`       |
| Chi tiết đơn ứng tuyển       | Đơn + CV + dòng thời gian + trao đổi                  | `/employer/applications/:id`    | `pages/employer/application-detail.tsx` |
| Xem CV                       | Route riêng vì CV là tài liệu dài cần không gian rộng | `/employer/applications/:id/cv` | `pages/employer/application-cv.tsx`     |
| **Hồ sơ nhà tuyển dụng**     | Tên hiển thị, logo, mô tả, địa chỉ, website           | `/employer/organization`        | `pages/employer/organization.tsx`       |
| **Đánh giá**                 | Các đánh giá sinh viên đã gửi cho nhà tuyển dụng      | `/employer/reviews`             | `pages/employer/reviews.tsx`            |
| **Trung tâm thông báo**      | Tin được duyệt, có đơn ứng tuyển mới                  | `/notifications`                | `pages/notifications/index.tsx`         |

**Tính năng nằm trong trang, không có route riêng**:

| Tính năng                       | Mô tả                                         | Nơi chứa                                |
| ------------------------------- | --------------------------------------------- | --------------------------------------- |
| Đóng / mở tin tuyển dụng        | Đổi trạng thái tin                            | `pages/employer/jobs.tsx`               |
| Chuyển trạng thái đơn ứng tuyển | Duyệt sơ bộ, nhận ứng viên, từ chối + ghi chú | `pages/employer/application-detail.tsx` |
| Viết đánh giá cho sinh viên     | Chấm điểm 1–5 + nhận xét                      | `components/shared/review-dialog.tsx`   |

---

## Quản trị viên (ADMIN)

Cung cấp bởi `WorkspaceLayout` + `RequireRole(["ADMIN"])`.

| Tính năng                | Mô tả                                                | Route               | Page                         |
| ------------------------ | ---------------------------------------------------- | ------------------- | ---------------------------- |
| Tổng quan                | Số liệu toàn hệ thống                                | `/admin`            | `pages/admin/index.tsx`      |
| **Duyệt tin tuyển dụng** | Danh sách chờ duyệt, duyệt / từ chối kèm lý do       | `/admin/jobs`       | `pages/admin/jobs.tsx`       |
| **Quản lý nhóm việc**    | CRUD nhóm việc và vị trí công việc                   | `/admin/categories` | `pages/admin/categories.tsx` |
| **Quản lý tài khoản**    | Danh sách sinh viên / nhà tuyển dụng, khoá tài khoản | `/admin/users`      | `pages/admin/users.tsx`      |
| **Thống kê đánh giá**    | Danh sách đánh giá, lọc theo điểm                    | `/admin/reviews`    | `pages/admin/reviews.tsx`    |

---

## Quyền truy cập

- **Chưa đăng nhập**: `/`, `/about`, `/jobs`, `/jobs/:id`, `/employer/:id`, `/login`, `/register`, `/verify-email`
- **STUDENT**: toàn bộ `/student/*`, `/saved`, `/notifications`, `/jobs/*` (đầy đủ, gồm ứng tuyển)
- **EMPLOYER**: toàn bộ `/employer/*` (trừ hồ sơ công khai), `/notifications`, `/jobs` (chỉ xem)
- **ADMIN**: toàn bộ `/admin/*`, `/notifications`
- **Mọi vai trò đã đăng nhập**: `/notifications`

Cơ chế chặn nằm ở `app/src/components/guards/require-auth.tsx`.

---

## Trung tâm thông báo

- **Real-time**: WebSocket `/api/v1/ws/notifications` (kết nối sau khi đăng nhập)
- **Loại thông báo** (khớp `NotificationType` tại `app/src/features/shared/types/index.ts`):

| Loại                 | Khi nào phát sinh                                                                  | Đối tượng nhận                |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| `APPLICATION`        | Có đơn ứng tuyển mới, hoặc tin tuyển dụng cần duyệt                                | Nhà tuyển dụng, quản trị viên |
| `APPLICATION_STATUS` | Trạng thái đơn ứng tuyển thay đổi                                                  | Sinh viên, nhà tuyển dụng     |
| `JOB`                | Tin tuyển dụng được duyệt / bị từ chối, hoặc có tin mới khớp nhóm việc đã theo dõi | Nhà tuyển dụng, sinh viên     |
| `REVIEW`             | Có đánh giá mới                                                                    | Bên bị đánh giá               |
| `SYSTEM`             | Thông báo hệ thống                                                                 | Mọi vai trò                   |

Nhãn hiển thị: `NOTIFICATION_TYPE_LABELS` tại `app/src/features/shared/types/index.ts`.

---

## Vòng đời trạng thái

### Tin tuyển dụng

```
DRAFT → PENDING_REVIEW → OPEN → FILLED → IN_PROGRESS → COMPLETED
                      ↘ REJECTED
         OPEN → CLOSED / CANCELLED
```

Chỉ tin ở `OPEN` mới hiện trên tìm kiếm công khai. Xem `docs/adr/0003-job-requires-admin-review-before-going-live.md`.

### Đơn ứng tuyển

```
PENDING → SHORTLISTED → ACCEPTED → COMPLETED
   ↘ REJECTED (bởi nhà tuyển dụng)
   ↘ WITHDRAWN (bởi sinh viên)
```

Khi đơn chuyển sang `COMPLETED` lần đầu, hệ thống tự ghi một bản ghi **lịch sử làm việc**.
