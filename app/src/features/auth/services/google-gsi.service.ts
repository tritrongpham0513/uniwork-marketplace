import type { ResolvedTheme } from "@/provider/theme-provider";

export const GOOGLE_GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
export const GOOGLE_BUTTON_MIN_WIDTH = 200;
export const GOOGLE_BUTTON_MAX_WIDTH = 400;
export const GOOGLE_BUTTON_DEFAULT_WIDTH = 320;

export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
  clientId?: string;
}

export interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: "popup" | "redirect";
}

export interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    options: GoogleButtonConfiguration
  ) => void;
  cancel?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

let gisLoadPromise: Promise<GoogleAccountsId> | null = null;

/** Đặt lại cache loader — chỉ dùng trong unit test giữa các test case. */
export const resetGoogleGsiLoaderForTest = (): void => {
  gisLoadPromise = null;
};

/**
 * Nạp Google Identity Services SDK một lần duy nhất và trả về `google.accounts.id`.
 * Nếu tải thất bại, xoá promise cache để người dùng có thể thử lại.
 */
export const loadGoogleGsiScript = (): Promise<GoogleAccountsId> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      new Error("Google Sign-In chỉ khả dụng trên trình duyệt.")
    );
  }

  const existingApi = window.google?.accounts?.id;
  if (existingApi) {
    return Promise.resolve(existingApi);
  }

  if (gisLoadPromise) {
    return gisLoadPromise;
  }

  gisLoadPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GIS_SCRIPT_SRC}"]`
    );

    const handleLoad = () => {
      const api = window.google?.accounts?.id;
      if (api) {
        resolve(api);
      } else {
        gisLoadPromise = null;
        reject(new Error("Không thể khởi tạo Google Identity Services."));
      }
    };

    const handleError = () => {
      gisLoadPromise = null;
      reject(new Error("Không thể tải Google Sign-In SDK."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  return gisLoadPromise;
};

/** Chọn theme nút Google khớp với giao diện sáng/tối hiện tại của app. */
export const resolveGoogleButtonTheme = (
  resolvedTheme: ResolvedTheme
): NonNullable<GoogleButtonConfiguration["theme"]> => {
  return resolvedTheme === "dark" ? "filled_black" : "outline";
};

/**
 * Giới hạn chiều rộng nút Google trong khoảng GIS hỗ trợ (200–400px)
 * để nút khớp chiều rộng form mà không bị Google SDK cắt bớt.
 */
export const clampGoogleButtonWidth = (containerWidth: number): number => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return GOOGLE_BUTTON_DEFAULT_WIDTH;
  }
  return Math.min(
    GOOGLE_BUTTON_MAX_WIDTH,
    Math.max(GOOGLE_BUTTON_MIN_WIDTH, Math.round(containerWidth))
  );
};
