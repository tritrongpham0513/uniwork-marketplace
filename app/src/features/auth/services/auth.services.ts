import axiosInstance from "@/lib/axios";
import type { LoginResponse } from "../types";

export const authService = {
  login: async (email: string, password: string) =>
    axiosInstance.post<LoginResponse>("/auth/login", { email, password }),
};
