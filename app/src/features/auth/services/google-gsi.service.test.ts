import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampGoogleButtonWidth,
  GOOGLE_BUTTON_DEFAULT_WIDTH,
  GOOGLE_BUTTON_MAX_WIDTH,
  GOOGLE_BUTTON_MIN_WIDTH,
  GOOGLE_GIS_SCRIPT_SRC,
  loadGoogleGsiScript,
  resetGoogleGsiLoaderForTest,
  resolveGoogleButtonTheme,
  type GoogleAccountsId,
} from "./google-gsi.service";

describe("google-gsi.service", () => {
  beforeEach(() => {
    resetGoogleGsiLoaderForTest();
    document.head.innerHTML = "";
    delete window.google;
  });

  afterEach(() => {
    resetGoogleGsiLoaderForTest();
    delete window.google;
    vi.restoreAllMocks();
  });

  describe("resolveGoogleButtonTheme", () => {
    it("should return filled_black for dark theme", () => {
      expect(resolveGoogleButtonTheme("dark")).toBe("filled_black");
    });

    it("should return outline for light theme", () => {
      expect(resolveGoogleButtonTheme("light")).toBe("outline");
    });
  });

  describe("clampGoogleButtonWidth", () => {
    it("should return default width for invalid or non-positive widths", () => {
      expect(clampGoogleButtonWidth(0)).toBe(GOOGLE_BUTTON_DEFAULT_WIDTH);
      expect(clampGoogleButtonWidth(-120)).toBe(GOOGLE_BUTTON_DEFAULT_WIDTH);
      expect(clampGoogleButtonWidth(Number.NaN)).toBe(
        GOOGLE_BUTTON_DEFAULT_WIDTH
      );
    });

    it("should clamp width within Google GIS supported bounds", () => {
      expect(clampGoogleButtonWidth(120)).toBe(GOOGLE_BUTTON_MIN_WIDTH);
      expect(clampGoogleButtonWidth(384)).toBe(384);
      expect(clampGoogleButtonWidth(640)).toBe(GOOGLE_BUTTON_MAX_WIDTH);
    });
  });

  describe("loadGoogleGsiScript", () => {
    it("should resolve immediately if window.google.accounts.id already exists", async () => {
      const mockApi: GoogleAccountsId = {
        initialize: vi.fn(),
        renderButton: vi.fn(),
      };
      window.google = { accounts: { id: mockApi } };

      const result = await loadGoogleGsiScript();
      expect(result).toBe(mockApi);
      expect(document.querySelectorAll("script").length).toBe(0);
    });

    it("should inject script once for concurrent calls and resolve when loaded", async () => {
      const mockApi: GoogleAccountsId = {
        initialize: vi.fn(),
        renderButton: vi.fn(),
      };

      const p1 = loadGoogleGsiScript();
      const p2 = loadGoogleGsiScript();

      const scripts = document.querySelectorAll<HTMLScriptElement>(
        `script[src="${GOOGLE_GIS_SCRIPT_SRC}"]`
      );
      expect(scripts.length).toBe(1);

      window.google = { accounts: { id: mockApi } };
      scripts[0].dispatchEvent(new Event("load"));

      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toBe(mockApi);
      expect(res2).toBe(mockApi);
    });

    it("should reset cached promise on script error so retries can succeed", async () => {
      const p1 = loadGoogleGsiScript();
      const firstScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_GIS_SCRIPT_SRC}"]`
      );
      expect(firstScript).not.toBeNull();

      firstScript?.dispatchEvent(new Event("error"));
      await expect(p1).rejects.toThrow("Không thể tải Google Sign-In SDK.");

      const mockApi: GoogleAccountsId = {
        initialize: vi.fn(),
        renderButton: vi.fn(),
      };
      const p2 = loadGoogleGsiScript();
      window.google = { accounts: { id: mockApi } };
      firstScript?.dispatchEvent(new Event("load"));

      await expect(p2).resolves.toBe(mockApi);
    });
  });
});
