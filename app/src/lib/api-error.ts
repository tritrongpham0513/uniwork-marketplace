/**
 * 🧩 Chuẩn hoá lỗi từ Backend về một kiểu lỗi duy nhất.
 *
 * Backend (Spring Boot) trả về envelope:
 *   { "timestamp", "status", "code"?, "message", "errors"?: [{ field, message }] }
 *
 * LƯU Ý QUAN TRỌNG:
 * - `code` CÓ THỂ là `null` (ErrorResponse.code là String nullable).
 * - `code` CÓ THỂ là bất kỳ chuỗi nào (AppException fallback sinh `HttpStatus.name()`),
 *   không phải một catalog cố định.
 * - `errors[]` chỉ xuất hiện với lỗi validation (`MethodArgumentNotValidException`).
 *
 * Vì vậy mapping ở đây là PHÂN TẦNG, đa cấp:
 *   1. `errors[]` có phần tử  -> kind = "validation" (hiển thị inline tại field, KHÔNG toast)
 *   2. `code` khớp bảng biết  -> message fallback theo code
 *   3. suy ra từ HTTP `status` -> message fallback theo status
 *   4. fallback chung
 *
 * Backend có thể đổi message/code bất cứ lúc nào mà app vẫn chạy đúng.
 */

// ============================================
// TYPES
// ============================================

export type ApiErrorKind =
  | "validation"
  | "auth"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "rateLimit"
  | "server"
  | "network"
  | "timeout"
  | "unknown";

export interface FieldErrorDetail {
  field: string;
  message: string;
}

/** Cấu trúc lỗi trả về từ Backend (khớp com.uniwork.dto.response.ErrorResponse) */
export interface ErrorResponse {
  timestamp: string;
  status: number;
  code?: string | null;
  message: string;
  errors?: FieldErrorDetail[] | null;
}

export interface ApiError {
  /** Phân loại lỗi, dùng để quyết định cách hiển thị */
  kind: ApiErrorKind;
  /** HTTP status, null nếu không có response (network/timeout) */
  status: number | null;
  /** Error code từ backend, có thể null */
  code: string | null;
  /** Message tiếng Việt để hiển thị */
  message: string;
  /** Lỗi chi tiết theo từng field (chỉ có với lỗi validation) */
  fieldErrors: FieldErrorDetail[];
  /** Lỗi gốc, giữ lại để debug / logging */
  raw: unknown;
  /** true nếu lỗi đã được xử lý ở tầng global (để tránh bắn toast trùng) */
  handled: boolean;
  /** true nếu request được đánh dấu im lặng -> không được sinh toast */
  silent?: boolean;
}

// ============================================
// FALLBACK MESSAGES (KHÔNG phải contract - chỉ là dự phòng)
// ============================================

/** Fallback theo `code` của backend. */
const MESSAGES_BY_CODE: Record<string, string> = {
  VALIDATION_FAILED: "Dữ liệu bạn nhập chưa hợp lệ. Vui lòng kiểm tra lại.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
  UNAUTHORIZED: "Yêu cầu xác thực tài khoản để truy cập tính năng này.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu bạn yêu cầu.",
  CONFLICT: "Dữ liệu đã tồn tại hoặc xung đột với dữ liệu hiện có.",
  EMAIL_ALREADY_EXISTS: "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
  USER_LOCKED: "Tài khoản của bạn đang bị khoá. Vui lòng liên hệ hỗ trợ.",
  USER_NOT_VERIFIED: "Vui lòng xác thực email của bạn trước khi tiếp tục.",
  RATE_LIMITED: "Bạn thao tác quá nhiều. Vui lòng thử lại sau ít phút.",
  BAD_REQUEST: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  SERVICE_UNAVAILABLE: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
};

/** Fallback theo HTTP status. */
const MESSAGES_BY_STATUS: Record<number, string> = {
  400: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.",
  401: "Yêu cầu xác thực tài khoản để truy cập tính năng này.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu bạn yêu cầu.",
  409: "Dữ liệu đã tồn tại hoặc xung đột với dữ liệu hiện có.",
  413: "Tệp tải lên quá lớn. Vui lòng chọn tệp nhỏ hơn.",
  422: "Dữ liệu bạn nhập chưa hợp lệ. Vui lòng kiểm tra lại.",
  429: "Bạn thao tác quá nhiều. Vui lòng thử lại sau ít phút.",
  500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Máy chủ đang tạm thời không phản hồi. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
  504: "Yêu cầu quá thời gian chờ. Vui lòng thử lại sau.",
};

const DEFAULT_MESSAGE =
  "Đã xảy ra lỗi không xác định. Vui lòng thử lại hoặc liên hệ hỗ trợ.";
const NETWORK_MESSAGE =
  "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.";
const TIMEOUT_MESSAGE =
  "Yêu cầu quá thời gian chờ. Vui lòng thử lại sau.";

// ============================================
// TYPE GUARDS
// ============================================

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBackendErrorResponse = (value: unknown): value is ErrorResponse =>
  isRecord(value) && typeof value.message === "string" && "status" in value;

/** Type guard cho chính `ApiError` đã được chuẩn hoá trước đó. */
export const isApiError = (error: unknown): error is ApiError =>
  isRecord(error) && typeof error.kind === "string" && "fieldErrors" in error;

// ============================================
// CORE
// ============================================

/** Suy ra `kind` từ HTTP status. */
const kindFromStatus = (status: number): ApiErrorKind => {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 429) return "rateLimit";
  if (status >= 500) return "server";
  if (status >= 400) return "unknown";
  return "unknown";
};

const parseFieldErrors = (raw: unknown): FieldErrorDetail[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && typeof item.field === "string"
    )
    .map((item) => ({
      field: String(item.field),
      message:
        typeof item.message === "string" ? item.message : "Dữ liệu không hợp lệ.",
    }));
};

/**
 * Chuẩn hoá bất kỳ lỗi nào (AxiosError, Error, ApiError, lỗi ngẫu nhiên)
 * thành một `ApiError` thống nhất.
 *
 * Hàm này là idempotent: gọi lại với một `ApiError` sẽ trả về chính nó.
 */
export const normalizeApiError = (error: unknown): ApiError => {
  // 1. Đã chuẩn hoá rồi -> trả về luôn
  if (isApiError(error)) return error;

  // 2. Bóc AxiosError
  const axiosLike = isRecord(error) ? error : null;
  const response = axiosLike?.response;
  const responseData = isRecord(response) ? response.data : undefined;
  const status =
    isRecord(response) && typeof response.status === "number"
      ? response.status
      : null;

  // 3. Network / Timeout (không có response)
  if (!status) {
    const rawCode = axiosLike?.code;
    const isTimeout =
      rawCode === "ECONNABORTED" ||
      rawCode === "ETIMEDOUT" ||
      (typeof axiosLike?.message === "string" &&
        axiosLike.message.toLowerCase().includes("timeout"));

    const message =
      typeof axiosLike?.message === "string" && axiosLike.message.trim()
        ? axiosLike.message
        : isTimeout
          ? TIMEOUT_MESSAGE
          : NETWORK_MESSAGE;

    return {
      kind: isTimeout ? "timeout" : "network",
      status: null,
      code: typeof rawCode === "string" ? rawCode : null,
      message,
      fieldErrors: [],
      raw: error,
      handled: false,
    };
  }

  // 4. Có response -> đọc envelope của backend
  const backendData = isBackendErrorResponse(responseData)
    ? responseData
    : null;

  const fieldErrors = parseFieldErrors(backendData?.errors);
  const code =
    typeof backendData?.code === "string" && backendData.code
      ? backendData.code
      : null;

  // 5. Suy ra kind
  let kind: ApiErrorKind;
  if (fieldErrors.length > 0) {
    kind = "validation";
  } else {
    kind = kindFromStatus(status);
  }

  // 6. Suy ra message (thang tầng)
  const message =
    (backendData?.message?.trim() ? backendData.message : undefined) ??
    (code ? MESSAGES_BY_CODE[code] : undefined) ??
    MESSAGES_BY_STATUS[status] ??
    DEFAULT_MESSAGE;

  return {
    kind,
    status,
    code,
    message,
    fieldErrors,
    raw: error,
    handled: false,
  };
};

/** Đánh dấu lỗi đã được xử lý ở tầng global (dùng để tránh toast trùng). */
export const markApiErrorHandled = (error: ApiError): ApiError => ({
  ...error,
  handled: true,
});

/** Đánh dấu lỗi "im lặng" — request được cấu hình không sinh toast. */
export const markApiErrorSilent = (error: ApiError): ApiError => ({
  ...error,
  silent: true,
});

/** Lấy message đã chuẩn hoá từ bất kỳ lỗi nào. */
export const getApiErrorMessage = (error: unknown): string =>
  normalizeApiError(error).message;
