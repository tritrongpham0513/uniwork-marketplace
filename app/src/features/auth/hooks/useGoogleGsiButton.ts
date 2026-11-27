import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/provider/theme-provider";
import {
  clampGoogleButtonWidth,
  GOOGLE_BUTTON_DEFAULT_WIDTH,
  loadGoogleGsiScript,
  resolveGoogleButtonTheme,
  type GoogleButtonConfiguration,
} from "../services/google-gsi.service";

interface UseGoogleGsiButtonOptions {
  clientId?: string;
  text?: GoogleButtonConfiguration["text"];
  onCredential: (idToken: string) => void;
}

/**
 * Quản lý việc tải Google Identity Services SDK và render nút Google Sign-In
 * đồng bộ theo theme (sáng/tối) và chiều rộng khung chứa.
 */
export const useGoogleGsiButton = ({
  clientId,
  text = "signin_with",
  onCredential,
}: UseGoogleGsiButtonOptions) => {
  const { resolvedTheme } = useTheme();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);

  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [buttonWidth, setButtonWidth] = useState(GOOGLE_BUTTON_DEFAULT_WIDTH);

  const trimmedClientId = clientId?.trim() ?? "";
  const isConfigured = trimmedClientId.length > 0;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = buttonContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = clampGoogleButtonWidth(container.clientWidth);
      setButtonWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let isCancelled = false;

    loadGoogleGsiScript()
      .then((googleAccountsId) => {
        if (isCancelled) return;
        const container = buttonContainerRef.current;
        if (!container) return;

        container.innerHTML = "";
        googleAccountsId.initialize({
          client_id: trimmedClientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            }
          },
          ux_mode: "popup",
        });

        googleAccountsId.renderButton(container, {
          type: "standard",
          theme: resolveGoogleButtonTheme(resolvedTheme),
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "left",
          width: buttonWidth,
          locale: "vi",
        });

        setLoadError(null);
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Không thể tải Google Sign-In.";
        setLoadError(message);
        setIsReady(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    buttonWidth,
    isConfigured,
    resolvedTheme,
    retryCount,
    text,
    trimmedClientId,
  ]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setIsReady(false);
    setRetryCount((prev) => prev + 1);
  }, []);

  return {
    buttonContainerRef,
    isConfigured,
    isReady,
    loadError,
    retryLoad,
  };
};
