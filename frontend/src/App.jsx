import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ScrollToTop from "./components/common/ScrollToTop";
import Spinner from "./components/common/Spinner";
import NotFoundPage from "./pages/NotFoundPage";
import AccountStatePage from "./pages/auth/AccountStatePage";
import LoginPage from "./pages/auth/LoginPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import LandingPage from "./pages/public/LandingPage";
import FindJobsPage from "./pages/jobs/FindJobsPage";
import JobDetailsPage from "./pages/jobs/JobDetailsPage";

/**
 * Phase 10 performance work. The public entry (landing, login, browse, Job Details) stays in the
 * initial bundle because it is what a first-time visitor loads. Registration forms and the three
 * authenticated workspaces are split out, so a Student never downloads the Admin workspace and
 * the initial payload drops below Vite's chunk-size advisory.
 */
const StudentRegistrationPage = lazy(() => import("./pages/auth/StudentRegistrationPage"));
const ProviderRegistrationPage = lazy(() => import("./pages/auth/ProviderRegistrationPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const ChangePasswordPage = lazy(() => import("./pages/auth/ChangePasswordPage"));

const StudentDashboardPage = lazy(() => import("./pages/student/StudentDashboardPage"));
const MyApplicationsPage = lazy(() => import("./pages/student/MyApplicationsPage"));
const ApplicationDetailsPage = lazy(() => import("./pages/student/ApplicationDetailsPage"));
const JobHistoryPage = lazy(() => import("./pages/student/JobHistoryPage"));
const StudentProfilePage = lazy(() => import("./pages/student/StudentProfilePage"));

const ProviderDashboardPage = lazy(() => import("./pages/provider/ProviderDashboardPage"));
const MyJobsPage = lazy(() => import("./pages/provider/MyJobsPage"));
const JobFormPage = lazy(() => import("./pages/provider/JobFormPage"));
const ApplicantsPage = lazy(() => import("./pages/provider/ApplicantsPage"));
const ProviderApplicationDetailsPage = lazy(() => import("./pages/provider/ProviderApplicationDetailsPage"));
const CompanyProfilePage = lazy(() => import("./pages/provider/CompanyProfilePage"));
const ProviderReviewsPage = lazy(() => import("./pages/provider/ProviderReviewsPage"));

const MessagesPage = lazy(() => import("./pages/messages/MessagesPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const RegistrationReviewsPage = lazy(() => import("./pages/admin/RegistrationReviewsPage"));
const RegistrationDetailsPage = lazy(() => import("./pages/admin/RegistrationDetailsPage"));
const AdminAccountsPage = lazy(() => import("./pages/admin/AdminAccountsPage"));
const AdminAccountDetailsPage = lazy(() => import("./pages/admin/AdminAccountDetailsPage"));
const AdminJobsPage = lazy(() => import("./pages/admin/AdminJobsPage"));
const AdminJobDetailsPage = lazy(() => import("./pages/admin/AdminJobDetailsPage"));
const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminAuditTrailPage = lazy(() => import("./pages/admin/AdminAuditTrailPage"));

const ANY_SIGNED_IN_ROLE = ["student", "Job_Provider", "admin"];

export default function App() {
  return (
    <>
      <ScrollToTop />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white">
        Skip to main content
      </a>
      {/* tabIndex allows the skip link to actually move keyboard focus into the content. */}
      <div id="main-content" tabIndex={-1} className="outline-none">
        <Suspense fallback={<Spinner label="Loading RuWork…" />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login/student" element={<LoginPage role="student" />} />
            <Route path="/login/provider" element={<LoginPage role="provider" />} />
            <Route path="/admin/login" element={<LoginPage role="admin" />} />
            <Route path="/register/student" element={<StudentRegistrationPage />} />
            <Route path="/register/provider" element={<ProviderRegistrationPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password/student" element={<ForgotPasswordPage accountType="student" />} />
            <Route path="/forgot-password/provider" element={<ForgotPasswordPage accountType="jobProvider" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/account/verify-email" element={<AccountStatePage stateType="verification" />} />
            <Route path="/account/pending" element={<AccountStatePage stateType="pending" />} />
            <Route path="/account/rejected" element={<AccountStatePage stateType="rejected" />} />
            <Route path="/jobs" element={<FindJobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailsPage />} />

            <Route element={<ProtectedRoute allowedRoles={ANY_SIGNED_IN_ROLE} />}>
              <Route path="/account/password" element={<ChangePasswordPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/applications" element={<MyApplicationsPage />} />
              <Route path="/student/applications/:id" element={<ApplicationDetailsPage />} />
              <Route path="/student/job-history" element={<JobHistoryPage />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
              <Route path="/student/messages" element={<MessagesPage />} />
              <Route path="/student/messages/:applicationId" element={<MessagesPage />} />
              <Route path="/student/notifications" element={<NotificationsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["Job_Provider"]} />}>
              <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
              <Route path="/provider/jobs" element={<MyJobsPage />} />
              <Route path="/provider/jobs/new" element={<JobFormPage />} />
              <Route path="/provider/jobs/:id/edit" element={<JobFormPage />} />
              <Route path="/provider/jobs/:jobId/applications" element={<ApplicantsPage />} />
              <Route path="/provider/applications/:id" element={<ProviderApplicationDetailsPage />} />
              <Route path="/provider/profile" element={<CompanyProfilePage />} />
              <Route path="/provider/reviews" element={<ProviderReviewsPage />} />
              <Route path="/provider/messages" element={<MessagesPage />} />
              <Route path="/provider/messages/:applicationId" element={<MessagesPage />} />
              <Route path="/provider/notifications" element={<NotificationsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/registrations" element={<RegistrationReviewsPage />} />
              <Route path="/admin/registrations/:type/:id" element={<RegistrationDetailsPage />} />
              <Route path="/admin/students" element={<AdminAccountsPage type="students" />} />
              <Route path="/admin/students/:id" element={<AdminAccountDetailsPage type="students" />} />
              <Route path="/admin/providers" element={<AdminAccountsPage type="providers" />} />
              <Route path="/admin/providers/:id" element={<AdminAccountDetailsPage type="providers" />} />
              <Route path="/admin/jobs" element={<AdminJobsPage />} />
              <Route path="/admin/jobs/:id" element={<AdminJobDetailsPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/audits" element={<AdminAuditTrailPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
