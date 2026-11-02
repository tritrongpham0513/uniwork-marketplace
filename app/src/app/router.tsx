import AuthLayout from "@/components/layout/auth";
import MainLayout from "@/components/layout/main-layout";
import { PATHS } from "@/config/paths";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  // 1. Giao diện chính (Public & Protected Pages có Header chung)
  {
    element: <MainLayout />,
    children: [
      {
        path: PATHS.HOME,
        element: <HomePage />,
      },
    ],
  },

  // 2. Phân hệ Xác thực (Login / Register dùng AuthLayout riêng)
  {
    element: <AuthLayout />,
    children: [
      {
        path: PATHS.AUTH.LOGIN,
        element: <LoginPage />,
      },
      {
        path: PATHS.AUTH.REGISTER,
        element: <SignupPage />,
      },
    ],
  },
]);
