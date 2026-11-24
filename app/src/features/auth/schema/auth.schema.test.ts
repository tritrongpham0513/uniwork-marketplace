import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "./auth.schema";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const data = {
        email: "user@example.com",
        password: "Password123!",
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing email", () => {
      const data = { email: "", password: "Password123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("email");
    });

    it("should reject invalid email format", () => {
      const data = { email: "not-an-email", password: "Password123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("Email");
    });

    it("should reject missing password", () => {
      const data = { email: "user@example.com", password: "" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const data = { email: "user@example.com", password: "password123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("chữ hoa"))).toBe(true);
    });

    it("should reject password without lowercase", () => {
      const data = { email: "user@example.com", password: "PASSWORD123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("chữ thường"))).toBe(true);
    });

    it("should reject password without number", () => {
      const data = { email: "user@example.com", password: "Password!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("số"))).toBe(true);
    });

    it("should reject password without special character", () => {
      const data = { email: "user@example.com", password: "Password123" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("đặc biệt"))).toBe(true);
    });

    it("should reject password with spaces", () => {
      const data = { email: "user@example.com", password: "Pass word123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("khoảng trắng"))).toBe(true);
    });

    it("should trim email whitespace", () => {
      const data = { email: "  user@example.com  ", password: "Password123!" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe("user@example.com");
    });
  });

  describe("signupSchema", () => {
    const validData = {
      fullName: "John Doe",
      email: "john@example.com",
      role: "STUDENT" as const,
      password: "Password123!",
      confirmPassword: "Password123!",
    };

    it("should accept valid signup data for student", () => {
      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid signup data for employer", () => {
      const data = {
        ...validData,
        role: "EMPLOYER" as const,
        employerType: "COMPANY" as const,
      };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing fullName", () => {
      const data = { ...validData, fullName: "" };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.path.includes("fullName"))).toBe(true);
    });

    it("should reject fullName shorter than 2 characters", () => {
      const data = { ...validData, fullName: "J" };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("2 ký tự"))).toBe(true);
    });

    it("should reject fullName longer than 150 characters", () => {
      const data = { ...validData, fullName: "a".repeat(151) };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("150"))).toBe(true);
    });

    it("should reject invalid role", () => {
      const data = { ...validData, role: "ADMIN" as unknown as typeof validData.role };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject mismatched passwords", () => {
      const data = {
        ...validData,
        password: "Password123!",
        confirmPassword: "Different123!",
      };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("trùng khớp"))).toBe(true);
    });

    it("should reject password shorter than 8 characters", () => {
      const data = {
        ...validData,
        password: "Pass1!",
        confirmPassword: "Pass1!",
      };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("8"))).toBe(true);
    });

    it("should reject password longer than 100 characters", () => {
      const longPass = "A" + "a1!" + "x".repeat(97);
      const data = {
        ...validData,
        password: longPass,
        confirmPassword: longPass,
      };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(i => i.message.includes("100"))).toBe(true);
    });

    it("should trim email whitespace", () => {
      const data = { ...validData, email: "  john@example.com  " };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe("john@example.com");
    });
  });
});
