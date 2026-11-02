import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "Chưa nhập email đăng nhập" })
    .min(1, "Chưa nhập email đăng nhập")
    .email("Email không hợp lệ"),

  password: z
    .string({ message: "Chưa nhập Mật khẩu" })
    .min(1, "Chưa nhập Mật khẩu")
    .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt")
    .regex(/^\S*$/, "Mật khẩu không được chứa khoảng trắng"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z
      .string({ message: "Chưa nhập email" })
      .min(1, "Chưa nhập email")
      .email("Email không hợp lệ"),

    password: z
      .string({ message: "Chưa nhập Mật khẩu" })
      .min(1, "Chưa nhập Mật khẩu")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
      .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
      .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số")
      .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt")
      .regex(/^\S*$/, "Mật khẩu không được chứa khoảng trắng"),

    confirmPassword: z
      .string({ message: "Chưa nhập xác nhận mật khẩu" })
      .min(1, "Chưa nhập xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type SignupSchema = z.infer<typeof signupSchema>;
