import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ScrollToTop from "./components/common/ScrollToTop";
import NotFoundPage from "./pages/NotFoundPage";
import AccountStatePage from "./pages/auth/AccountStatePage";
import LoginPage from "./pages/auth/LoginPage";
import ProviderRegistrationPage from "./pages/auth/ProviderRegistrationPage";
import StudentRegistrationPage from "./pages/auth/StudentRegistrationPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import LandingPage from "./pages/public/LandingPage";
import FindJobsPage from "./pages/jobs/FindJobsPage";
import JobDetailsPage from "./pages/jobs/JobDetailsPage";
import JobFormPage from "./pages/provider/JobFormPage";
import MyJobsPage from "./pages/provider/MyJobsPage";
import ApplicantsPage from "./pages/provider/ApplicantsPage";
import ProviderApplicationDetailsPage from "./pages/provider/ProviderApplicationDetailsPage";
import MyApplicationsPage from "./pages/student/MyApplicationsPage";
import ApplicationDetailsPage from "./pages/student/ApplicationDetailsPage";
import StudentDashboardPage from "./pages/student/StudentDashboardPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import JobHistoryPage from "./pages/student/JobHistoryPage";
import ProviderDashboardPage from "./pages/provider/ProviderDashboardPage";
import CompanyProfilePage from "./pages/provider/CompanyProfilePage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import RegistrationReviewsPage from "./pages/admin/RegistrationReviewsPage";
import RegistrationDetailsPage from "./pages/admin/RegistrationDetailsPage";
import ProviderReviewsPage from "./pages/provider/ProviderReviewsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import MessagesPage from "./pages/messages/MessagesPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import AdminAccountsPage from "./pages/admin/AdminAccountsPage";
import AdminAccountDetailsPage from "./pages/admin/AdminAccountDetailsPage";
import AdminJobsPage from "./pages/admin/AdminJobsPage";
import AdminJobDetailsPage from "./pages/admin/AdminJobDetailsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/student" element={<LoginPage role="student" />} />
        <Route path="/login/provider" element={<LoginPage role="provider" />} />
        <Route path="/admin/login" element={<LoginPage role="admin" />} />
        <Route path="/register/student" element={<StudentRegistrationPage />} />
        <Route path="/register/provider" element={<ProviderRegistrationPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/account/verify-email" element={<AccountStatePage stateType="verification" />} />
        <Route path="/account/pending" element={<AccountStatePage stateType="pending" />} />
        <Route path="/account/rejected" element={<AccountStatePage stateType="rejected" />} />
        <Route path="/jobs" element={<FindJobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />

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
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
