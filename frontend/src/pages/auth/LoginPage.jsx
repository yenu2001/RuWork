import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import PasswordField from "../../components/common/PasswordField";
import AuthShell from "../../components/layout/AuthShell";
import useAuth from "../../hooks/useAuth";
import { getApiError } from "../../utils/apiError";
import { isBasicEmail, isRuhunaEmail, normalizeEmail } from "../../utils/validation";

const configs = {
  student: {
    expectedRole: "student",
    eyebrow: "Student access",
    title: "Welcome back",
    description: "Log in with your official University of Ruhuna email to continue.",
    emailLabel: "University email",
    emailName: "email",
    emailPlaceholder: "name@ruh.ac.lk",
    validateEmail: isRuhunaEmail,
    dashboard: "/student/dashboard",
    registration: "/register/student",
    accountType: "student"
  },
  provider: {
    expectedRole: "Job_Provider",
    eyebrow: "Job Provider access",
    title: "Welcome back",
    description: "Log in to continue with your approved RuWork provider account.",
    emailLabel: "Company email",
    emailName: "companyEmail",
    emailPlaceholder: "name@company.com",
    validateEmail: isBasicEmail,
    dashboard: "/provider/dashboard",
    registration: "/register/provider",
    accountType: "jobProvider"
  },
  admin: {
    expectedRole: "admin",
    eyebrow: "Secure Admin access",
    title: "RuWork administration",
    description: "Use your privately provisioned Admin credentials. Public Admin registration is unavailable.",
    emailLabel: "Admin email",
    emailName: "email",
    emailPlaceholder: "admin@example.com",
    validateEmail: isBasicEmail,
    dashboard: "/admin/dashboard",
    accountType: "admin"
  }
};

export default function LoginPage({ role }) {
  const config = configs[role];
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!config.validateEmail(form.email)) nextErrors.email = role === "student" ? "Enter your official @ruh.ac.lk email address." : "Enter a valid email address.";
    if (!form.password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setRequestError("");
    setIsSubmitting(true);
    const email = normalizeEmail(form.email);
    try {
      await login(config.expectedRole, { [config.emailName]: email, password: form.password });
      navigate(config.dashboard, { replace: true });
    } catch (error) {
      const apiError = getApiError(error, "Login failed. Please try again.");
      const state = { email, accountType: config.accountType, message: apiError.message };
      if (apiError.code === "EMAIL_NOT_VERIFIED") navigate("/account/verify-email", { state });
      else if (apiError.code === "ACCOUNT_PENDING") navigate("/account/pending", { state });
      else if (apiError.code === "ACCOUNT_REJECTED") navigate("/account/rejected", { state });
      else setRequestError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow={config.eyebrow} title={config.title} description={config.description} admin={role === "admin"}>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {requestError && <Alert>{requestError}</Alert>}
        <FormField id={`${role}-email`} label={config.emailLabel} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={config.emailPlaceholder} error={errors.email} disabled={isSubmitting} />
        <PasswordField id={`${role}-password`} label="Password" autoComplete="current-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} error={errors.password} disabled={isSubmitting} />
        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">Log in</Button>
      </form>
      {role !== "admin" && (
        <p className="mt-7 text-center text-sm text-ink-600">New to RuWork? <Link to={config.registration} className="font-bold text-brand-700 underline-offset-4 hover:underline">Create an account</Link></p>
      )}
      {role === "admin" && <p className="mt-7 rounded-xl bg-slate-100 p-3 text-center text-xs leading-5 text-ink-600">Admin accounts are created privately by an authorized operator.</p>}
    </AuthShell>
  );
}
