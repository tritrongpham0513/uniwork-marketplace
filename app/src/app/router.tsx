import AuthLayout from "@/components/layout/auth";
import { PATHS } from "@/config/paths";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
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
