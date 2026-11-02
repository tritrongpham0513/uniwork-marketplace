import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "Chưa nhập email đăng nhập" })
    .trim()
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
    fullName: z
      .string({ message: "Vui lòng nhập họ và tên" })
      .trim()
      .min(2, "Họ và tên phải có ít nhất 2 ký tự")
      .max(150, "Họ và tên không quá 150 ký tự"),

    email: z
      .string({ message: "Vui lòng nhập email" })
      .trim()
      .min(1, "Vui lòng nhập email")
      .email("Địa chỉ email không đúng định dạng"),

    role: z.enum(["STUDENT", "EMPLOYER"], {
      message: "Vui lòng chọn vai trò",
    }),

    employerType: z.enum(["COMPANY", "INDIVIDUAL"]).optional(),

    password: z
      .string({ message: "Vui lòng nhập mật khẩu" })
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .max(100, "Mật khẩu không vượt quá 100 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ cái viết hoa")
      .regex(/[a-z]/, "Cần ít nhất 1 chữ cái viết thường")
      .regex(/[0-9]/, "Cần ít nhất 1 chữ số")
      .regex(/[^a-zA-Z0-9]/, "Cần ít nhất 1 ký tự đặc biệt (!@#$%...)")
      .regex(/^\S*$/, "Mật khẩu không được chứa khoảng trắng"),

    confirmPassword: z
      .string({ message: "Vui lòng xác nhận mật khẩu" })
      .min(1, "Vui lòng xác nhận lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "EMPLOYER" && !data.employerType) {
        return false;
      }
      return true;
    },
    {
      message: "Vui lòng chọn loại hình nhà tuyển dụng",
      path: ["employerType"],
    }
  );

export type SignupSchema = z.infer<typeof signupSchema>;
