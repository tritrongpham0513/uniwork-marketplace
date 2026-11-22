import AuthLayout from "@/components/layout/auth";
import MainLayout from "@/components/layout/main-layout";
import WorkspaceLayout from "@/components/layout/workspace-layout";
import { RequireAuth, RequireRole } from "@/components/guards/require-auth";
import { PATHS } from "@/config/paths";
import HomePage from "@/pages/home";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import ApplyJobPage from "@/pages/job-apply";
import AboutPage from "@/pages/about";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import NotificationsPage from "@/pages/notifications";
import SavedJobsPage from "@/pages/saved-jobs";
import ForbiddenPage from "@/pages/forbidden";
import VerifyEmailPage from "@/pages/verify-email";
import StudentDashboardPage from "@/pages/student";
import StudentProfilePage from "@/pages/student/profile";
import StudentApplicationsPage from "@/pages/student/applications";
import StudentApplicationDetailPage from "@/pages/student/application-detail";
import StudentReviewsPage from "@/pages/student/reviews";
import EmployerDashboardPage from "@/pages/employer";
import EmployerJobsPage from "@/pages/employer/jobs";
import EmployerJobFormPage from "@/pages/employer/job-form";
import EmployerApplicationsPage from "@/pages/employer/applications";
import EmployerApplicationDetailPage from "@/pages/employer/application-detail";
import EmployerApplicationCvPage from "@/pages/employer/application-cv";
import EmployerOrganizationPage from "@/pages/employer/organization";
import EmployerReviewsPage from "@/pages/employer/reviews";
import PublicEmployerPage from "@/pages/employer/public-profile";
import AdminDashboardPage from "@/pages/admin";
import AdminJobsPage from "@/pages/admin/jobs";
import AdminCategoriesPage from "@/pages/admin/categories";
import AdminUsersPage from "@/pages/admin/users";
import AdminReviewsPage from "@/pages/admin/reviews";
import NotFoundPage from "@/pages/not-found";
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
      {
        path: PATHS.JOBS.ROOT,
        element: <JobsPage />,
      },
      {
        path: PATHS.JOBS.DETAIL(),
        element: <JobDetailPage />,
      },
      {
        path: PATHS.JOBS.APPLY(),
        element: <ApplyJobPage />,
      },
      {
        path: PATHS.ABOUT,
        element: <AboutPage />,
      },
      {
        path: PATHS.FORBIDDEN,
        element: <ForbiddenPage />,
      },
      {
        // Hồ sơ nhà tuyển dụng công khai — ai cũng xem được
        path: PATHS.EMPLOYER.PUBLIC_PROFILE(),
        element: <PublicEmployerPage />,
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
      {
        path: PATHS.AUTH.VERIFY_EMAIL,
        element: <VerifyEmailPage />,
      },
    ],
  },

  // 3. Khu vực SINH VIÊN
  {
    element: (
      <RequireAuth>
        <RequireRole roles={["STUDENT"]}>
          <WorkspaceLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      {
        path: PATHS.STUDENT.ROOT,
        element: <StudentDashboardPage />,
      },
      {
        path: PATHS.STUDENT.PROFILE,
        element: <StudentProfilePage />,
      },
      {
        path: PATHS.STUDENT.APPLICATIONS,
        element: <StudentApplicationsPage />,
      },
      {
        path: PATHS.STUDENT.APPLICATION_DETAIL(),
        element: <StudentApplicationDetailPage />,
      },
      {
        path: PATHS.SAVED,
        element: <SavedJobsPage />,
      },
      {
        path: PATHS.STUDENT.REVIEWS,
        element: <StudentReviewsPage />,
      },
    ],
  },

  // 4. Khu vực NHÀ TUYỂN DỤNG
  {
    element: (
      <RequireAuth>
        <RequireRole roles={["EMPLOYER"]}>
          <WorkspaceLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      {
        path: PATHS.EMPLOYER.ROOT,
        element: <EmployerDashboardPage />,
      },
      {
        path: PATHS.EMPLOYER.JOBS,
        element: <EmployerJobsPage />,
      },
      {
        path: PATHS.EMPLOYER.JOB_NEW,
        element: <EmployerJobFormPage />,
      },
      {
        path: PATHS.EMPLOYER.JOB_EDIT(),
        element: <EmployerJobFormPage />,
      },
      {
        path: PATHS.EMPLOYER.APPLICATIONS,
        element: <EmployerApplicationsPage />,
      },
      {
        path: PATHS.EMPLOYER.APPLICATION_DETAIL(),
        element: <EmployerApplicationDetailPage />,
      },
      {
        path: PATHS.EMPLOYER.APPLICATION_CV(),
        element: <EmployerApplicationCvPage />,
      },
      {
        path: PATHS.EMPLOYER.ORGANIZATION,
        element: <EmployerOrganizationPage />,
      },
      {
        path: PATHS.EMPLOYER.REVIEWS,
        element: <EmployerReviewsPage />,
      },
    ],
  },

  // 5. Khu vực QUẢN TRỊ VIÊN
  {
    element: (
      <RequireAuth>
        <RequireRole roles={["ADMIN"]}>
          <WorkspaceLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      {
        path: PATHS.ADMIN.ROOT,
        element: <AdminDashboardPage />,
      },
      {
        path: PATHS.ADMIN.JOBS,
        element: <AdminJobsPage />,
      },
      {
        path: PATHS.ADMIN.CATEGORIES,
        element: <AdminCategoriesPage />,
      },
      {
        path: PATHS.ADMIN.USERS,
        element: <AdminUsersPage />,
      },
      {
        path: PATHS.ADMIN.REVIEWS,
        element: <AdminReviewsPage />,
      },
    ],
  },

  // 6. Trung tâm thông báo — dùng chung cho mọi vai trò (vẫn trong workspace shell)
  {
    element: (
      <RequireAuth>
        <WorkspaceLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: PATHS.NOTIFICATIONS,
        element: <NotificationsPage />,
      },
    ],
  },

  // 7. 404 — bắt mọi đường dẫn không tồn tại
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);