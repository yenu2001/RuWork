import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import PasswordField from "../../components/common/PasswordField";
import AuthShell from "../../components/layout/AuthShell";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { getPasswordError } from "../../utils/validation";

const LOGIN_PATHS = { student: "/login/student", jobProvider: "/login/provider" };

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const accountType = params.get("type") === "jobProvider" ? "jobProvider" : "student";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ status: "idle", error: "" });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const next = {};
    const passwordError = getPasswordError(form.newPassword);
    if (passwordError) next.newPassword = passwordError;
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setState({ status: "saving", error: "" });
    try {
      await authService.resetPassword(accountType, token, form.newPassword);
      setState({ status: "done", error: "" });
    } catch (error) {
      setState({ status: "idle", error: getApiError(error).message });
    }
  }

  if (!token) {
    return (
      <AuthShell eyebrow="Password recovery" title="Reset link required" description="This page needs a valid reset link from your email.">
        <div className="grid gap-5">
          <Alert>This password reset link is incomplete. Request a new link and use the most recent email.</Alert>
          <Button as={Link} to="/forgot-password/student" variant="secondary">Request a new link</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Choose a new password"
      description="Your new password must contain at least 8 characters, one uppercase letter, and one number."
    >
      {state.status === "done" ? (
        <div className="grid gap-5">
          <Alert tone="info">Password reset successfully. All other RuWork sessions have been signed out.</Alert>
          <Button as={Link} to={LOGIN_PATHS[accountType]}>Sign in with your new password</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          {state.error ? <Alert>{state.error}</Alert> : null}
          <PasswordField
            id="new-password"
            label="New password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => update("newPassword", event.target.value)}
            error={errors.newPassword}
            helper="At least 8 characters, one uppercase letter, and one number."
            required
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" isLoading={state.status === "saving"}>Reset password</Button>
        </form>
      )}
    </AuthShell>
  );
}
