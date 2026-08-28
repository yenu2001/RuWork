import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import AuthShell from "../../components/layout/AuthShell";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { isBasicEmail, isRuhunaEmail } from "../../utils/validation";

const ACCOUNT_TYPES = {
  student: {
    label: "Student",
    field: "University email",
    placeholder: "name@ruh.ac.lk",
    validate: (value) => (isRuhunaEmail(value) ? "" : "Enter your @ruh.ac.lk University email."),
    loginPath: "/login/student"
  },
  jobProvider: {
    label: "Job Provider",
    field: "Company email",
    placeholder: "you@company.lk",
    validate: (value) => (isBasicEmail(value) ? "" : "Enter the company email used to register."),
    loginPath: "/login/provider"
  }
};

export default function ForgotPasswordPage({ accountType = "student" }) {
  const definition = ACCOUNT_TYPES[accountType];
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [state, setState] = useState({ status: "idle", error: "" });

  async function submit(event) {
    event.preventDefault();
    const validationError = definition.validate(email);
    setFieldError(validationError);
    if (validationError) return;
    setState({ status: "sending", error: "" });
    try {
      await authService.requestPasswordReset(accountType, email.trim());
      setState({ status: "sent", error: "" });
    } catch (error) {
      setState({ status: "idle", error: getApiError(error).message });
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description={`Enter the ${definition.field.toLowerCase()} for your ${definition.label} account and we will send a single-use reset link if an account exists.`}
    >
      {state.status === "sent" ? (
        <div className="grid gap-5">
          <Alert tone="info">
            If an account exists for that address, a password reset link has been sent. The link expires shortly and can be used only once.
          </Alert>
          <p className="text-sm leading-6 text-ink-600">
            Check your inbox and spam folder. For your security, RuWork does not confirm whether an address is registered.
          </p>
          <Button as={Link} to={definition.loginPath} variant="secondary">Back to sign in</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          {state.error ? <Alert>{state.error}</Alert> : null}
          <FormField
            id="reset-email"
            label={definition.field}
            type="email"
            autoComplete="email"
            value={email}
            placeholder={definition.placeholder}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldError}
            required
          />
          <Button type="submit" isLoading={state.status === "sending"}>Send reset link</Button>
          <p className="text-sm text-ink-600">
            Remembered it? <Link to={definition.loginPath} className="font-bold text-brand-700 hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
