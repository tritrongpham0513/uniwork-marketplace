import { describe, it, expect } from "vitest";
import { normalizeApiError, isApiError, type ApiError } from "./api-error";

describe("api-error utilities", () => {
  describe("isApiError", () => {
    it("should recognize ApiError type", () => {
      const error: ApiError = {
        kind: "validation",
        status: 422,
        code: "VALIDATION_FAILED",
        message: "Dữ liệu không hợp lệ",
        fieldErrors: [{ field: "email", message: "Email không hợp lệ" }],
        raw: {},
        handled: false,
      };
      expect(isApiError(error)).toBe(true);
    });

    it("should reject non-ApiError objects", () => {
      expect(isApiError({})).toBe(false);
      expect(isApiError({ kind: "unknown" })).toBe(false);
      expect(isApiError("error string")).toBe(false);
      expect(isApiError(null)).toBe(false);
    });
  });

  describe("normalizeApiError", () => {
    describe("network errors", () => {
      it("should normalize plain Error as network error", () => {
        const error = new Error("Network Error");
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("network");
        expect(normalized.status).toBeNull();
        expect(normalized.raw).toBe(error);
      });

      it("should detect timeout errors by message", () => {
        const error = new Error("timeout of 30000ms exceeded");
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("timeout");
      });

      it("should detect timeout errors by ECONNABORTED code", () => {
        const error = { code: "ECONNABORTED", message: "Connection aborted" };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("timeout");
      });

      it("should detect timeout errors by ETIMEDOUT code", () => {
        const error = { code: "ETIMEDOUT", message: "Timed out" };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("timeout");
      });
    });

    describe("AxiosError with response", () => {
      it("should normalize 422 as validation error", () => {
        const error = {
          response: {
            status: 422,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 422,
              code: "VALIDATION_FAILED",
              message: "Validation failed",
              errors: [
                { field: "email", message: "Email không hợp lệ" },
                { field: "password", message: "Mật khẩu tối thiểu 6 ký tự" },
              ],
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("validation");
        expect(normalized.status).toBe(422);
        expect(normalized.fieldErrors.length).toBeGreaterThan(0);
      });

      it("should normalize 401 as auth error", () => {
        const error = {
          response: {
            status: 401,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 401,
              code: "UNAUTHORIZED",
              message: "Unauthorized",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("auth");
        expect(normalized.status).toBe(401);
      });

      it("should normalize 403 as forbidden error", () => {
        const error = {
          response: {
            status: 403,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 403,
              code: "FORBIDDEN",
              message: "Forbidden",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("forbidden");
        expect(normalized.status).toBe(403);
      });

      it("should normalize 404 as notFound error", () => {
        const error = {
          response: {
            status: 404,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 404,
              code: "NOT_FOUND",
              message: "Not found",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("notFound");
      });

      it("should normalize 409 as conflict error", () => {
        const error = {
          response: {
            status: 409,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 409,
              code: "CONFLICT",
              message: "Conflict",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("conflict");
      });

      it("should normalize 429 as rateLimit error", () => {
        const error = {
          response: {
            status: 429,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 429,
              code: "RATE_LIMITED",
              message: "Too many requests",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("rateLimit");
      });

      it("should normalize 500+ as server error", () => {
        const error = {
          response: {
            status: 500,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 500,
              code: "INTERNAL_SERVER_ERROR",
              message: "Internal server error",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.kind).toBe("server");
      });
    });

    describe("message fallback", () => {
      it("should use backend message if provided", () => {
        const error = {
          response: {
            status: 400,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 400,
              code: null,
              message: "Custom backend message",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.message).toContain("Custom backend message");
      });

      it("should use code-based fallback if available", () => {
        const error = {
          response: {
            status: 409,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 409,
              code: "EMAIL_ALREADY_EXISTS",
              message: "",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.message).toContain("Email");
      });

      it("should use status-based fallback if no code match", () => {
        const error = {
          response: {
            status: 401,
            data: {
              timestamp: "2025-01-15T10:00:00Z",
              status: 401,
              code: null,
              message: "",
            },
          },
        };
        const normalized = normalizeApiError(error);
        expect(normalized.message).toBeDefined();
      });
    });

    describe("idempotency", () => {
      it("should return same ApiError if called again", () => {
        const original: ApiError = {
          kind: "validation",
          status: 422,
          code: "VALIDATION_FAILED",
          message: "Invalid",
          fieldErrors: [],
          raw: {},
          handled: false,
        };
        const result = normalizeApiError(original);
        expect(result).toBe(original);
      });
    });

    describe("raw error preservation", () => {
      it("should preserve raw error for debugging", () => {
        const originalError = new Error("Original error");
        const normalized = normalizeApiError(originalError);
        expect(normalized.raw).toBe(originalError);
      });
    });
  });
});
