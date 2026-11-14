/**
 * Lỗi HTTP giả lập — mang đúng shape envelope lỗi của backend.
 *
 * Backend trả:
 * ```json
 * { "success": false, "message": "...", "code": "...", "errors": [...] }
 * ```
 * hoặc dạng field errors:
 * ```json
 * { "timestamp": "...", "status": 400, "code": "VALIDATION_FAILED",
 *   "message": "...", "errors": [{ "field": "email", "message": "..." }] }
 * ```
 */
export interface MockErrorBody {
  timestamp?: string;
  status: number;
  success: false;
  code: string;
  message: string;
  errors?: Array<string | { field: string; message: string }>;
}

export class MockHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: MockErrorBody;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    body: Omit<MockErrorBody, "status" | "success">,
    statusText = "Error",
    headers: Record<string, string> = {}
  ) {
    super(body.message);
    this.name = "MockHttpError";
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.body = {
      timestamp: new Date().toISOString(),
      status,
      success: false,
      ...body,
    };
  }
}

/** 400 — dữ liệu không hợp lệ (có field errors để hiển thị inline) */
export const badRequest = (
  message: string,
  errors?: Array<string | { field: string; message: string }>
): MockHttpError =>
  new MockHttpError(
    400,
    { code: "VALIDATION_FAILED", message, errors },
    "Bad Request"
  );

/** 401 — chưa đăng nhập / token sai */
export const unauthorized = (
  message = "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
): MockHttpError =>
  new MockHttpError(
    401,
    { code: "UNAUTHORIZED", message },
    "Unauthorized"
  );

/** 403 — không đủ quyền */
export const forbidden = (
  message = "Bạn không có quyền thực hiện thao tác này."
): MockHttpError => new MockHttpError(403, { code: "FORBIDDEN", message }, "Forbidden");

/** 404 — không tìm thấy */
export const notFound = (
  message = "Không tìm thấy dữ liệu yêu cầu."
): MockHttpError => new MockHttpError(404, { code: "NOT_FOUND", message }, "Not Found");

/** 409 — xung đột dữ liệu */
export const conflict = (
  message = "Dữ liệu đã tồn tại.",
  code = "CONFLICT"
): MockHttpError => new MockHttpError(409, { code, message }, "Conflict");
