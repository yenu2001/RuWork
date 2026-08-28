import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Spinner from "../common/Spinner";

const loginRoutes = {
  student: "/login/student",
  Job_Provider: "/login/provider",
  admin: "/admin/login"
};

const dashboardRoutes = {
  student: "/student/dashboard",
  Job_Provider: "/provider/dashboard",
  admin: "/admin/dashboard"
};

export default function ProtectedRoute({ allowedRoles }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isRestoring) return <Spinner label="Restoring your session…" />;
  if (!auth.isAuthenticated) {
    return <Navigate to={loginRoutes[allowedRoles[0]] || "/"} replace state={{ from: location.pathname }} />;
  }
  if (!allowedRoles.includes(auth.user.role)) {
    return <Navigate to={dashboardRoutes[auth.user.role] || "/"} replace />;
  }
  return <Outlet />;
}
