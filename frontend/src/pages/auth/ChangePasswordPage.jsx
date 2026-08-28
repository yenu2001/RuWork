import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import PasswordField from "../../components/common/PasswordField";
import AppHeader from "../../components/layout/AppHeader";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { getPasswordError } from "../../utils/validation";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ saving: false, error: "" });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Enter your current password.";
    const passwordError = getPasswordError(form.newPassword);
    if (passwordError) next.newPassword = passwordError;
    else if (form.newPassword === form.currentPassword) next.newPassword = "Choose a password different from your current one.";
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setState({ saving: true, error: "" });
    try {
      const data = await authService.changePassword(auth.user.role, form.currentPassword, form.newPassword);
      // The server returns a token carrying the new revocation version so this session survives.
      if (data.token) auth.replaceToken(data.token);
      setForm(EMPTY_FORM);
      setState({ saving: false, error: "" });
      showToast(data.message, "success");
    } catch (error) {
      setState({ saving: false, error: getApiError(error).message });
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="page-container py-9 sm:py-12">
        <span className="eyebrow"><ShieldCheck className="size-3.5" aria-hidden="true" />Account security</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Change password</h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Changing your password signs out every other RuWork session. This device stays signed in.
        </p>
        <section className="surface-card mt-8 max-w-xl p-6 sm:p-8">
          <form onSubmit={submit} noValidate className="grid gap-5">
            {state.error ? <Alert>{state.error}</Alert> : null}
            <PasswordField
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => update("currentPassword", event.target.value)}
              error={errors.currentPassword}
              required
            />
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
              id="confirm-new-password"
              label="Confirm new password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              error={errors.confirmPassword}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={state.saving}>
                <KeyRound className="size-4" aria-hidden="true" />Change password
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
