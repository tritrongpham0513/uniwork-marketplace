import { getDb } from "./db";
import { MockHttpError, notFound } from "./errors";
import { authHandlers, resolveUserId } from "./handlers/auth";
import { jobHandlers, type JobQuery } from "./handlers/jobs";
import {
  applicationHandlers,
  notificationHandlers,
  profileHandlers,
  reviewHandlers,
  savedJobHandlers,
} from "./handlers/applications";
import { adminHandlers, metaHandlers } from "./handlers/admin";

// ============================================
// TYPES
// ============================================

export interface MockRequest {
  method: string;
  url: string;
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string | undefined>;
}

export interface MockResponse {
  data: unknown;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
}

/** Chuẩn hoá URL: bỏ query string, bỏ dấu / cuối */
const normalizePath = (url: string): string => {
  const path = url.split("?")[0] ?? "";
  return path.replace(/\/+$/, "") || "/";
};

const ok = <T>(data: T, message = "Thành công"): MockResponse => ({
  data: { success: true, message, data },
  status: 200,
  statusText: "OK",
});

const created = <T>(data: T, message = "Thành công"): MockResponse => ({
  data: { success: true, message, data },
  status: 201,
  statusText: "Created",
});

const readHeader = (
  headers: Record<string, string | undefined> | undefined,
  name: string
): string | undefined => {
  if (!headers) return undefined;
  const direct = headers[name];
  if (typeof direct === "string") return direct;
  const found = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  return typeof found?.[1] === "string" ? found[1] : undefined;
};

// ============================================
// ROUTER
// ============================================

export const handleMockRequest = (
  req: MockRequest
): MockResponse => {
  const method = req.method.toUpperCase();
  const path = normalizePath(req.url);
  const params = (req.params ?? {}) as Record<string, string>;
  const body = (req.data ?? {}) as Record<string, unknown>;

  const authorization = readHeader(req.headers, "authorization");
  const userId = resolveUserId(authorization);
  const db = getDb();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------
  if (path === "/api/v1/auth/register" && method === "POST") {
    return created(authHandlers.register(body as never), "Đăng ký thành công.");
  }

  if (path === "/api/v1/auth/login" && method === "POST") {
    return ok(authHandlers.login(body as never), "Đăng nhập thành công.");
  }

  if (path === "/api/v1/auth/google" && method === "POST") {
    return ok(authHandlers.googleLogin(body as never), "Đăng nhập thành công.");
  }

  if (path === "/api/v1/auth/verify-email" && method === "POST") {
    return ok(authHandlers.verifyEmail(body as never), "Xác thực thành công.");
  }

  if (path === "/api/v1/auth/resend-verification" && method === "POST") {
    return ok(
      authHandlers.resendVerification(body as never),
      "Đã gửi lại email kích hoạt."
    );
  }

  if (path === "/api/v1/auth/me" && method === "GET") {
    return ok(authHandlers.me(userId));
  }

  if (path === "/api/v1/auth/refresh" && method === "POST") {
    return ok(authHandlers.refresh(String(body.refresh_token ?? "")));
  }

  // ---------------------------------------------------------
  // PUBLIC JOBS
  // ---------------------------------------------------------
  if (path === "/api/v1/jobs/public" && method === "GET") {
    return ok(jobHandlers.list(params as JobQuery));
  }

  if (path === "/api/v1/jobs/public/related" && method === "GET") {
    return ok(
      jobHandlers.related(
        params.categoryId ?? "",
        params.excludeId ?? "",
        Number(params.limit ?? 6)
      )
    );
  }

  if (path.startsWith("/api/v1/jobs/public/") && method === "GET") {
    const id = path.replace("/api/v1/jobs/public/", "");
    return ok(jobHandlers.detail(id));
  }

  // ---------------------------------------------------------
  // MASTER DATA
  // ---------------------------------------------------------
  if (path === "/api/v1/public/categories" && method === "GET") {
    return ok(metaHandlers.categories());
  }

  if (path === "/api/v1/public/positions" && method === "GET") {
    return ok(metaHandlers.positions());
  }

  if (path === "/api/v1/public/provinces" && method === "GET") {
    return ok(metaHandlers.provinces());
  }

  if (path === "/api/v1/public/districts" && method === "GET") {
    return ok(metaHandlers.districts(params.provinceId));
  }

  if (path === "/api/v1/public/salary-benchmarks" && method === "GET") {
    return ok(metaHandlers.salaryBenchmarks());
  }

  if (path === "/api/v1/public/skills" && method === "GET") {
    return ok(metaHandlers.skills());
  }

  if (path.startsWith("/api/v1/public/employers/") && method === "GET") {
    const id = path.replace("/api/v1/public/employers/", "");
    return ok(profileHandlers.getEmployerPublic(id));
  }

  // ---------------------------------------------------------
  // STUDENT — APPLICATIONS
  // ---------------------------------------------------------
  if (path === "/api/v1/student/applications" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return created(
      applicationHandlers.create(body as never, userId),
      "Gửi đơn ứng tuyển thành công."
    );
  }

  if (path === "/api/v1/student/applications" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(
      applicationHandlers.listByStudent(userId, params.status)
    );
  }

  if (path.startsWith("/api/v1/student/applications/") && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const id = path.replace("/api/v1/student/applications/", "");
    return ok(applicationHandlers.detailForStudent(id, userId));
  }

  if (
    path.endsWith("/withdraw") &&
    path.startsWith("/api/v1/student/applications/") &&
    method === "PATCH"
  ) {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const id = path.replace("/api/v1/student/applications/", "").replace(/\/withdraw$/, "");
    return ok(applicationHandlers.withdraw(id, userId), "Đã rút đơn ứng tuyển.");
  }

  // ---------------------------------------------------------
  // STUDENT — PROFILE & SAVED JOBS
  // ---------------------------------------------------------
  if (path === "/api/v1/student/profile" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(profileHandlers.getStudent(userId));
  }

  if (path === "/api/v1/student/profile" && method === "PUT") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(profileHandlers.updateStudent(userId, body as never), "Đã cập nhật hồ sơ.");
  }

  if (path === "/api/v1/student/saved-jobs" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(savedJobHandlers.list(userId));
  }

  if (path === "/api/v1/student/saved-jobs" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(savedJobHandlers.save(String(body.jobId ?? ""), userId), "Đã lưu tin.");
  }

  if (path.startsWith("/api/v1/student/saved-jobs/") && method === "DELETE") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const jobId = path.replace("/api/v1/student/saved-jobs/", "");
    savedJobHandlers.remove(jobId, userId);
    return ok(null, "Đã bỏ lưu tin.");
  }

  // ---------------------------------------------------------
  // EMPLOYER — JOBS
  // ---------------------------------------------------------
  if (path === "/api/v1/employer/jobs" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const result = jobHandlers.list({
      ...(params as JobQuery),
      employerId: profile.id,
      // NTD không phân trang -> lấy toàn bộ tin
      pageSize: "100",
      // NTD xem được toàn bộ tin (mọi trạng thái), không chỉ tin OPEN
      status: params.status ?? "ALL",
    });
    // NTD không phân trang -> trả về mảng tin tuyển dụng
    return ok(result.items);
  }

  if (path === "/api/v1/employer/jobs" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const employer = db.employerProfiles.find((e) => e.userId === userId);
    return created(
      jobHandlers.create(
        {
          ...body,
          employer: {
            id: profile.id,
            name: profile.displayName,
            logoVariant: "primary",
            verified: profile.isVerified,
          },
          employerId: profile.id,
        } as never,
        employer?.id ?? ""
      ),
      "Đã gửi tin tuyển dụng, đang chờ duyệt."
    );
  }

  if (path.startsWith("/api/v1/employer/jobs/") && method === "PUT") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const id = path.replace("/api/v1/employer/jobs/", "");
    return ok(
      jobHandlers.update(id, body as never, profile.id),
      "Đã cập nhật tin tuyển dụng."
    );
  }

  if (path.startsWith("/api/v1/employer/jobs/") && method === "DELETE") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const id = path.replace("/api/v1/employer/jobs/", "");
    jobHandlers.remove(id, profile.id);
    return ok(null, "Đã huỷ tin tuyển dụng.");
  }

  // ---------------------------------------------------------
  // EMPLOYER — APPLICATIONS / PROFILE
  // ---------------------------------------------------------
  if (path === "/api/v1/employer/applications" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    return ok(
      applicationHandlers.listByEmployer(profile.id, {
        jobId: params.jobId,
        status: params.status,
      })
    );
  }

  if (path.startsWith("/api/v1/employer/applications/") && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const id = path.replace("/api/v1/employer/applications/", "");
    return ok(applicationHandlers.detailForEmployer(id, profile.id));
  }

  if (path.startsWith("/api/v1/employer/applications/") && method === "PATCH") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const id = path.replace("/api/v1/employer/applications/", "");
    return ok(
      applicationHandlers.updateStatus(
        id,
        body as never,
        profile.id
      ),
      "Đã cập nhật trạng thái đơn ứng tuyển."
    );
  }

  if (path === "/api/v1/employer/profile" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(profileHandlers.getEmployer(userId));
  }

  if (path === "/api/v1/employer/profile" && method === "PUT") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(
      profileHandlers.updateEmployer(userId, body as never),
      "Đã cập nhật thông tin tổ chức."
    );
  }

  // ---------------------------------------------------------
  // REVIEWS
  // ---------------------------------------------------------
  if (path === "/api/v1/reviews" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const role = db.users.find((u) => u.id === userId)?.role ?? "STUDENT";
    return created(
      reviewHandlers.create(body as never, userId, role),
      "Cảm ơn bạn đã đánh giá!"
    );
  }

  if (path === "/api/v1/reviews" && method === "GET") {
    return ok(
      reviewHandlers.list({
        targetType: params.targetType,
        targetUserId: params.targetUserId,
        hideHidden: params.hideHidden === "true",
      })
    );
  }

  if (path.startsWith("/api/v1/employer/reviews/") && path.endsWith("/reply")) {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const profile = profileHandlers.getEmployer(userId);
    const id = path.replace("/api/v1/employer/reviews/", "").replace(/\/reply$/, "");
    return ok(
      reviewHandlers.reply(id, String(body.reply ?? ""), profile.id),
      "Đã gửi trả lời."
    );
  }

  // ---------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------
  if (path === "/api/v1/notifications" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok(notificationHandlers.list(userId, params.unreadOnly));
  }

  if (path === "/api/v1/notifications/unread-count" && method === "GET") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok({ count: notificationHandlers.unreadCount(userId) });
  }

  if (path.startsWith("/api/v1/notifications/") && path.endsWith("/read") && method === "PATCH") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const id = path.replace("/api/v1/notifications/", "").replace(/\/read$/, "");
    return ok(notificationHandlers.markRead(id, userId));
  }

  if (path === "/api/v1/notifications/read-all" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    const count = notificationHandlers.markAllRead(userId);
    return ok({ count }, `Đã đánh dấu ${count} thông báo là đã đọc.`);
  }

  // ---------------------------------------------------------
  // ADMIN
  // ---------------------------------------------------------
  if (path === "/api/v1/admin/dashboard" && method === "GET") {
    return ok(adminHandlers.dashboard());
  }

  if (path === "/api/v1/admin/users" && method === "GET") {
    return ok(
      adminHandlers.listUsers({
        role: params.role,
        keyword: params.keyword,
      })
    );
  }

  if (path.startsWith("/api/v1/admin/users/") && method === "PATCH") {
    const id = path.replace("/api/v1/admin/users/", "");
    return ok(adminHandlers.updateUser(id, body as never), "Đã cập nhật người dùng.");
  }

  if (path === "/api/v1/admin/categories" && method === "GET") {
    return ok(adminHandlers.listCategories());
  }

  if (path === "/api/v1/admin/categories" && method === "POST") {
    return created(adminHandlers.createCategory(body as never), "Đã tạo nhóm việc.");
  }

  if (path.startsWith("/api/v1/admin/categories/") && method === "PUT") {
    const id = path.replace("/api/v1/admin/categories/", "");
    return ok(adminHandlers.updateCategory(id, body as never), "Đã cập nhật nhóm việc.");
  }

  if (path.startsWith("/api/v1/admin/categories/") && method === "DELETE") {
    const id = path.replace("/api/v1/admin/categories/", "");
    return ok(adminHandlers.removeCategory(id), "Đã xoá nhóm việc.");
  }

  if (path === "/api/v1/admin/jobs" && method === "GET") {
    return ok(adminHandlers.listJobs(params.status));
  }

  if (path.startsWith("/api/v1/admin/jobs/") && path.endsWith("/review") && method === "PATCH") {
    const id = path.replace("/api/v1/admin/jobs/", "").replace(/\/review$/, "");
    return ok(
      jobHandlers.review(id, body as never),
      body.action === "APPROVE" ? "Đã duyệt tin tuyển dụng." : "Đã từ chối tin tuyển dụng."
    );
  }

  if (path.startsWith("/api/v1/admin/reviews/") && method === "PATCH") {
    const id = path.replace("/api/v1/admin/reviews/", "");
    return ok(
      reviewHandlers.setHidden(id, Boolean(body.isHidden)),
      "Đã cập nhật đánh giá."
    );
  }

  // ---------------------------------------------------------
  // WEBSOCKET (ticket)
  // ---------------------------------------------------------
  // Chế độ mock không có WebSocket server thật, nhưng vẫn trả vé để UI
  // không báo lỗi. Client sẽ bỏ qua việc kết nối khi bật mock
  // (xem `useNotificationSocket`).
  if (path === "/api/v1/ws/ticket" && method === "POST") {
    if (!userId) throw new MockHttpError(401, { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, "Unauthorized");
    return ok({ ticket: `mock-ticket-${userId}`, expiresIn: 60 });
  }

  // ---------------------------------------------------------
  // FALLBACK
  // ---------------------------------------------------------
  throw notFound(`Endpoint không tồn tại: ${method} ${path}`);
};
