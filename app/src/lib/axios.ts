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

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
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
    console.log("refresh_token", refresh_token);

    if (!refresh_token) {
      throw new Error("No refresh token available");
    }

    // Gọi API làm mới token bằng refreshToken hiện có
    const response = await axios.post<RefreshTokenResponse>(
      `${baseURL}auth/refresh`,
      { refresh_token }
    );

    const { access_token, refresh_token: new_refresh_token } =
      response.data.data;

    console.log("New access & refresh token", {
      access_token,
      new_refresh_token,
    });

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

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      CustomAxiosRequestConfig | undefined;

    // Skip nếu không có originalRequest hoặc không có refresh token (user chưa login)
    const userRefreshToken = getLocalRefreshToken();
    if (!originalRequest || !userRefreshToken) {
      return Promise.reject(error);
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
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
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
