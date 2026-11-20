import { env } from "@/config/env";
import {
  clearTokens,
  getLocalAccessToken,
  getLocalRefreshToken,
  saveLocalAccessToken,
  saveLocalRefreshToken,
} from "@/utils/authStorage";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  Method,
} from "axios";
import axios from "axios";
import {
  markApiErrorHandled,
  markApiErrorSilent,
  normalizeApiError,
  type ApiError,
} from "@/lib/api-error";
import { toast } from "@/lib/toast";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  /** Request này không được sinh toast khi lỗi (mặc định false). */
  skipErrorToast?: boolean;
}

interface FailedQueueItem {
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: unknown) => void;
}

interface RefreshTokenResponseData {
  access_token: string;
  refresh_token: string;
}

interface RefreshTokenResponse {
  data: RefreshTokenResponseData;
  message?: string;
  statusCode?: number;
}

// ============================================
// PHẦN 1: TẠO HTTP CLIENT CƠ BẢN
// ============================================

const baseURL: string = env.API_URL_DEV;

export const axiosInstance: AxiosInstance = axios.create({
  baseURL,
});

// ============================================
// PHẦN 2: TỰ ĐỘNG GẮN TOKEN VÀO MỖI REQUEST
// ============================================

// Interceptor request: chạy TRƯỚC KHI gửi bất kỳ request nào
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Lấy accessToken từ localStorage
    const accessToken = getLocalAccessToken();

    // Nếu có token, thì tự động đính kèm vào header của request
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Instance riêng cho luồng refresh token.
 *
 * Tách khỏi `axiosInstance` chính để:
 *   - không bị interceptor response của `axiosInstance` xử lý lại
 *     (tránh vòng lặp refresh vô hạn khi token hết hạn),
 *   - không cần gắn `Authorization` (chỉ dùng refresh token trong body).
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL,
});

// ============================================
// PHẦN 3: XỬ LÝ LÀM MỚI TOKEN TỰ ĐỘNG
// ============================================

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

// Hàm xử lý tất cả request đang chờ trong hàng đợi
const processQueue = (error: unknown = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// Hàm thực hiện việc làm mới token
const refreshToken = async (): Promise<void> => {
  try {
    const refresh_token = getLocalRefreshToken();

    if (!refresh_token) {
      throw new Error("No refresh token available");
    }

    // Gọi API làm mới token bằng refreshToken hiện có
    const response = await refreshClient.post<RefreshTokenResponse>(
      "/api/v1/auth/refresh",
      { refresh_token }
    );

    const { access_token, refresh_token: new_refresh_token } =
      response.data.data;

    // Lưu cặp token mới vào localStorage
    saveLocalAccessToken(access_token);
    saveLocalRefreshToken(new_refresh_token);

    // Thông báo thành công cho tất cả request đang chờ
    processQueue(null);
  } catch (error) {
    console.error("Refresh token failed:", error);
    clearTokens();
    processQueue(error);
    throw error;
  }
};

// Hàm điều phối việc lấy token mới
const getNewToken = async (): Promise<void> => {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      await refreshToken();
    } finally {
      isRefreshing = false;
    }
    return;
  }

  // Nếu đã có request khác đang làm mới token, xếp hàng chờ
  return new Promise<void>((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  });
};

// ============================================
// PHẦN 4: XỬ LÝ RESPONSE VÀ LÀM MỚI TOKEN
// ============================================

/** Đường dẫn trang đăng nhập — dùng để điều hướng khi phiên hết hạn. */
const LOGIN_PATH = "/login";

/** Đánh dấu đã điều hướng để không redirect lặp nhiều lần. */
let isRedirectingToLogin = false;

/**
 * Đặt lại cờ chuyển hướng. Gọi khi người dùng đăng nhập lại thành công
 * để các lỗi hết phiên sau này vẫn có thể chuyển hướng bình thường.
 */
export const resetSessionRedirectFlag = (): void => {
  isRedirectingToLogin = false;
};

/**
 * Xử lý khi phiên đăng nhập không còn hợp lệ:
 * - Xoá token khỏi localStorage
 * - Hiển thị 1 toast thông báo
 * - Điều hướng về trang đăng nhập
 *
 * Trả về `ApiError` đã đánh dấu `handled = true` để tầng dưới (TanStack Query)
 * KHÔNG bắn toast lần nữa.
 */
const handleSessionExpired = (): ApiError => {
  clearTokens();

  toast.error("Phiên đăng nhập đã hết hạn", {
    description: "Vui lòng đăng nhập lại để tiếp tục.",
    id: "auth:session-expired",
  });

  if (!isRedirectingToLogin) {
    isRedirectingToLogin = true;
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith(LOGIN_PATH)) {
        window.location.assign(LOGIN_PATH);
      }
    }
  }

  return markApiErrorHandled(
    normalizeApiError({
      response: {
        status: 401,
        data: {
          status: 401,
          code: "SESSION_EXPIRED",
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        },
      },
    })
  );
};

/**
 * Chuẩn hoá lỗi, đồng thời tôn trọng cờ `skipErrorToast` trên config của request.
 * Request được đánh dấu im lặng sẽ không sinh toast ở tầng global.
 */
const applySilentFlag = (
  error: AxiosError,
  config?: CustomAxiosRequestConfig
): ApiError => {
  const normalized = normalizeApiError(error);
  return config?.skipErrorToast ? markApiErrorSilent(normalized) : normalized;
};

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | CustomAxiosRequestConfig
      | undefined;

    // Skip nếu không có originalRequest hoặc không có refresh token (user chưa login)
    const userRefreshToken = getLocalRefreshToken();
    if (!originalRequest || !userRefreshToken) {
      return Promise.reject(applySilentFlag(error, originalRequest));
    }

    // Kiểm tra xem có nên làm mới token không: lỗi 401 và chưa từng retry
    const shouldRenewToken =
      error.response?.status === 401 && !originalRequest._retry;

    if (shouldRenewToken) {
      originalRequest._retry = true;

      try {
        await getNewToken();
        // Thử lại request ban đầu với token mới (interceptor request sẽ gắn token mới)
        return axiosInstance(originalRequest);
      } catch {
        // Refresh token hỏng -> phiên hết hạn -> xử lý ở tầng global
        return Promise.reject(handleSessionExpired());
      }
    }

    return Promise.reject(applySilentFlag(error, originalRequest));
  }
);

// ============================================
// CÁC HÀM TIỆN ÍCH ĐỂ GỌI API (GENERIC WRAPPER)
// ============================================

const _send = async <T = unknown, D = unknown>(
  method: Method | string,
  path: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<T> => {
  const response = await axiosInstance.request<T>({
    ...config,
    method,
    url: path,
    data,
  });

  return response.data;
};

const get = async <T = unknown>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  return await _send<T>("get", path, undefined, config);
};

const post = async <T = unknown, D = unknown>(
  path: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<T> => {
  return await _send<T, D>("post", path, data, config);
};

const put = async <T = unknown, D = unknown>(
  path: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<T> => {
  return await _send<T, D>("put", path, data, config);
};

const patch = async <T = unknown, D = unknown>(
  path: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): Promise<T> => {
  return await _send<T, D>("patch", path, data, config);
};

const del = async <T = unknown>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  return await _send<T>("delete", path, undefined, config);
};

export interface HttpClient {
  get: <T = unknown>(path: string, config?: AxiosRequestConfig) => Promise<T>;
  post: <T = unknown, D = unknown>(
    path: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ) => Promise<T>;
  put: <T = unknown, D = unknown>(
    path: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ) => Promise<T>;
  patch: <T = unknown, D = unknown>(
    path: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ) => Promise<T>;
  del: <T = unknown>(path: string, config?: AxiosRequestConfig) => Promise<T>;
  delete: <T = unknown>(
    path: string,
    config?: AxiosRequestConfig
  ) => Promise<T>;
}

const http: HttpClient = {
  get,
  post,
  put,
  patch,
  del,
  delete: del,
};

export default http;
