# Bản đồ tính năng theo vai trò

Tài liệu này liệt kê tính năng + route tương ứng theo từng vai trò người dùng. Dùng để hiểu đầy đủ app và dự phòng khi viết spec mới.

---

## Sinh viên (STUDENT)

| Tính năng | Mô tả | Route | Component |
|---|---|---|---|
| **Xem danh sách công việc** | Tìm kiếm, lọc theo ngành, địa điểm, mức lương | `/jobs` | `pages/jobs.tsx` |
| Lưu tin yêu thích | Thêm/xoá tin vào danh sách "Lưu việc" | `/saved-jobs` | `pages/student/saved-jobs.tsx` |
| Xem chi tiết tin | Mô tả, yêu cầu, so sánh lương với benchmark | `/jobs/:jobId` | `pages/job-detail.tsx` |
| **Ứng tuyển** | Tạo đơn ứng tuyển (upload CV, cover letter) | `/jobs/:jobId/apply` (form) | Dialog hoặc nested route |
| Xem danh sách đơn | Trạng thái (đã nộp, đã xem, phỏng vấn, chốt) | `/applications` | `pages/student/applications.tsx` |
| Chi tiết đơn ứng tuyển | Đơn + bình luận hai chiều với NTD | `/applications/:appId` | `pages/applications/:appId.tsx` |
| **Hồ sơ cá nhân** | Thông tin, danh sách CV, lịch sử công việc | `/profile` | `pages/profile/index.tsx` |
| Quản lý CV | Tải lên, xem, xoá, đặt CV mặc định | `/profile/cvs` | `pages/profile/cvs.tsx` |
| Lịch sử công việc | Nơi làm việc trước + rating + review | `/profile/work-history` | `pages/profile/work-history.tsx` |
| **Thông báo** | Thay đổi trạng thái đơn, tin mới theo ngành yêu thích | `/notifications` | Sidebar icon + modal |
| **Xem review** | Review từ NTD cũ | `/reviews` | `pages/student/reviews.tsx` |
| Viết review | Đánh giá NTD (công ty) | Dialog | `components/shared/review-dialog.tsx` |

---

## Nhà tuyển dụng (EMPLOYER)

| Tính năng | Mô tả | Route | Component |
|---|---|---|---|
| **Đăng tin tuyển dụng** | Form tạo tin (chi tiết, yêu cầu, lương, hạn chót) | `/employer/jobs/create` | `pages/employer/create-job.tsx` |
| Danh sách tin của NTD | Trạng thái (pending, open, closed, archived) | `/employer/jobs` | `pages/employer/jobs.tsx` |
| Chi tiết tin (edit) | Chỉnh sửa, xem ứng tuyển | `/employer/jobs/:jobId` | `pages/employer/job-detail.tsx` |
| Đóng/Mở tin | Toggle trạng thái | In-line action | Inline button |
| **Xem ứng tuyển** | Danh sách SV ứng tuyển cho tin | `/employer/applications` | `pages/employer/applications.tsx` |
| Chi tiết ứng tuyển | CV, cover letter, timeline, bình luận, rating | `/employer/applications/:appId` | `pages/applications/:appId.tsx` |
| Thay đổi trạng thái | (Đã xem, phỏng vấn, chốt, từ chối) | In-line action + comment | Dialog |
| **Thông báo** | Tin mới được duyệt, có ứng tuyển mới | `/notifications` | Sidebar icon + modal |
| Hồ sơ công ty | Tên, logo, địa chỉ, lĩnh vực | `/employer/profile` | `pages/employer/profile/index.tsx` |
| Xem review | Review từ SV | `/employer/reviews` | `pages/employer/reviews.tsx` |

---

## Admin

| Tính năng | Mô tả | Route | Component |
|---|---|---|---|
| **Duyệt tin tuyển dụng** | Danh sách pending, approve/reject + note | `/admin/jobs` | `pages/admin/jobs.tsx` |
| **Quản lý user** | Danh sách SV + NTD, khoá tài khoản, xem chi tiết | `/admin/users` | `pages/admin/users.tsx` |
| **Quản lý category** | CRUD ngành nghề (IT, Bán hàng, v.v.) | `/admin/categories` | `pages/admin/categories.tsx` |
| **Thống kê review** | Danh sách, filter theo rating | `/admin/reviews` | `pages/admin/reviews.tsx` |

---

## Public (không đăng nhập)

| Tính năng | Mô tả | Route | Component |
|---|---|---|---|
| Trang chủ | Giới thiệu, danh sách tin nổi bật | `/` | `pages/index.tsx` |
| **Đăng nhập** | Email + mật khẩu (hoặc Google OAuth) | `/login` | `pages/login.tsx` |
| **Đăng ký** | Chọn vai trò (SV/NTD), form | `/signup` | `pages/signup.tsx` |
| Xác thực email | Nhập OTP hoặc link verify | `/verify-email` | `pages/verify-email.tsx` |
| Danh sách công việc (read-only) | Dùng để demo, không ứng tuyển | `/jobs` (hạn chế) | `pages/jobs.tsx` |

---

## Tổng đường dẫn chính

```
/                                    (trang chủ)
├── /auth
│   ├── /login                       (đăng nhập)
│   ├── /signup                      (đăng ký)
│   └── /verify-email                (xác thực email)
├── /jobs                            (danh sách công việc)
│   ├── /:jobId                      (chi tiết tin)
│   └── /:jobId/apply                (form ứng tuyển)
├── /student
│   ├── /saved-jobs                  (tin yêu thích)
│   ├── /applications                (danh sách đơn)
│   │   └── /:appId                  (chi tiết đơn)
│   ├── /reviews                     (xem review)
│   └── /profile                     (hồ sơ cá nhân)
│       ├── /cvs                     (quản lý CV)
│       └── /work-history            (lịch sử công việc)
├── /employer
│   ├── /jobs                        (danh sách tin)
│   │   ├── /create                  (tạo tin mới)
│   │   └── /:jobId                  (chi tiết + edit)
│   ├── /applications                (danh sách ứng tuyển)
│   │   └── /:appId                  (chi tiết + comment)
│   ├── /reviews                     (xem review)
│   └── /profile                     (hồ sơ công ty)
├── /admin
│   ├── /jobs                        (duyệt tin)
│   ├── /users                       (quản lý user)
│   ├── /categories                  (quản lý ngành)
│   └── /reviews                     (thống kê review)
├── /notifications                   (thông báo chung)
└── /dashboard                       (trang tổng quan - nếu có)
```

---

## Quyền truy cập

- **Không đăng nhập**: xem `/jobs` (read-only), `/`, `/login`, `/signup`
- **STUDENT**: mọi route `/student`, `/jobs` (đầy đủ), không vào `/employer`, `/admin`
- **EMPLOYER**: mọi route `/employer`, `/jobs` (read-only), không vào `/student`, `/admin`
- **ADMIN**: mọi route `/admin`, không vào `/student`, `/employer` (ngoài xem review)

---

## Thông báo (Notifications)

- **Real-time socket**: WebSocket `/api/v1/ws/notifications` (kết nối sau khi đăng nhập)
- **Event types**:
  - `JOB_APPROVED` → NTD: tin được duyệt
  - `JOB_REJECTED` → NTD: tin bị từ chối
  - `APPLICATION_CREATED` → NTD: có ứng tuyển mới
  - `APPLICATION_STATUS_CHANGED` → SV: trạng thái đơn thay đổi
  - `REVIEW_CREATED` → Người bị review: có review mới
  - `NEW_JOB_IN_INTEREST` → SV: công việc mới theo ngành yêu thích
