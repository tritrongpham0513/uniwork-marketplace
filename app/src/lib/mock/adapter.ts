import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from "axios";
import { env } from "@/config/env";
import { handleMockRequest } from "./router";
import { MockHttpError } from "./errors";

/**
 * Header của axios có thể là AxiosHeaders hoặc object thuần — chuẩn hoá về string
 */
const readHeader = (
  headers: unknown,
  name: string
): string | undefined => {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;

  const direct = record[name];
  if (typeof direct === "string") return direct;

  const found = Object.entries(record).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  return typeof found?.[1] === "string" ? found[1] : undefined;
};

/**
 * Đọc body của request.
 *
 * ⚠️ Axios chạy `transformRequest` (JSON.stringify) **trước** khi gọi adapter,
 * nên `config.data` tới đây đã là **chuỗi JSON**, không phải object.
 * Ta phải tự parse lại để router nhận đúng object (giống backend Spring Boot
 * sau khi deserialize body).
 *
 * Trường hợp `FormData` (upload file) được giữ nguyên — router đọc trực tiếp
 * qua `formData.get(...)`.
 */
const parseBody = (data: unknown): unknown => {
  if (typeof data !== "string") return data;
  const trimmed = data.trim();
  if (trimmed === "") return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Không phải JSON (ví dụ form-urlencoded) -> trả nguyên chuỗi
    return data;
  }
};

/**
 * Chuẩn hoá `FormData` thành object phẳng mà router dùng được.
 *
 * <p>File được đọc metadata (tên, mime, dung lượng) — mock không lưu nội dung.
 */
const parseFormData = (data: unknown): Record<string, unknown> => {
  if (!isFormData(data)) return {};

  const result: Record<string, unknown> = {};
  const file = data.get("file");
  if (file && typeof file === "object" && "size" in file) {
    const blob = file as Blob & { name?: string };
    result.file = {
      name: blob.name ?? "file",
      type: blob.type ?? "application/octet-stream",
      size: blob.size ?? 0,
    };
  }

  const kind = data.get("kind");
  if (typeof kind === "string") {
    result.kind = kind;
  }

  return result;
};

/** Kiểm tra `FormData` mà không phụ thuộc global có sẵn hay không. */
const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== "undefined" && value instanceof FormData;

/**
 * Đọc query params — axios vẫn giữ dạng object tới adapter,
 * nhưng ta chuẩn hoá value về string cho khớp `MockRequest`.
 */
const parseParams = (
  params: unknown
): Record<string, string> | undefined => {
  if (!params || typeof params !== "object") return undefined;
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, String(value)])
  );
};

/**
 * 🔌 Axios adapter giả lập.
 *
 * Mọi service vẫn gọi HTTP thật (axiosInstance.get/post/...) — chỉ bị
 * chặn ở tầng transport này. Bật/tắt bằng `VITE_USE_MOCK_API`.
 */
export const mockAdapter: AxiosAdapter = async (
  config: AxiosRequestConfig
): Promise<AxiosResponse> => {
  const method = (config.method ?? "get").toUpperCase();
  const url = config.url ?? "/";

  // Độ trễ mô phỏng network để UI có loading state thật
  const min = env.MOCK_MIN_DELAY;
  const max = Math.max(min, env.MOCK_MAX_DELAY);
  const delay = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    const authorization = readHeader(config.headers as never, "authorization");

    const result = handleMockRequest({
      method,
      url,
      data: isFormData(config.data)
        ? parseFormData(config.data)
        : parseBody(config.data),
      params: parseParams(config.params),
      headers: authorization ? { authorization } : undefined,
    });

    return {
      data: result.data,
      status: result.status,
      statusText: result.statusText,
      headers: result.headers ?? {},
      config,
      request: {},
    } as AxiosResponse;
  } catch (error) {
    if (error instanceof MockHttpError) {
      // Trả về response lỗi để axios interceptor xử lý như API thật
      const errorResponse: AxiosResponse = {
        data: error.body,
        status: error.status,
        statusText: error.statusText,
        headers: error.headers ?? {},
        config,
        request: {},
      } as AxiosResponse;

      // Build một AxiosError chuẩn để interceptor của repo bắt được
      const axiosError = new Error(error.body?.message ?? "Mock API error") as
        Error & {
          isAxiosError: boolean;
          config: AxiosRequestConfig;
          response: AxiosResponse;
        };
      axiosError.isAxiosError = true;
      axiosError.config = config;
      axiosError.response = errorResponse;
      throw axiosError;
    }
    throw error;
  }
};

export default mockAdapter;
