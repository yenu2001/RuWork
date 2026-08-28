import { useEffect, useState } from "react";
import Button from "../common/Button";
import FormField from "../common/FormField";
import Alert from "../common/Alert";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { isBasicEmail, isRuhunaEmail, normalizeEmail } from "../../utils/validation";
import useToast from "../../hooks/useToast";

export default function ResendVerificationForm({ accountType, initialEmail = "", compact = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    const valid = accountType === "student" ? isRuhunaEmail(normalized) : isBasicEmail(normalized);
    if (!valid) {
      setError(accountType === "student" ? "Enter a valid @ruh.ac.lk email address." : "Enter a valid company email address.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const response = await authService.resendVerification(accountType, normalized);
      showToast(response.message, "success");
      setCooldown(60);
    } catch (requestError) {
      const apiError = getApiError(requestError);
      setError(apiError.message);
      if (apiError.retryAfterSeconds) setCooldown(apiError.retryAfterSeconds);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "grid gap-3" : "mt-6 grid gap-4"} noValidate>
      {error && <Alert>{error}</Alert>}
      <FormField
        id="resend-email"
        label={accountType === "student" ? "University email" : "Company email"}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={accountType === "student" ? "name@ruh.ac.lk" : "name@company.com"}
        disabled={isSubmitting}
      />
      <Button type="submit" isLoading={isSubmitting} disabled={cooldown > 0} className="w-full">
        {cooldown > 0 ? `Request again in ${cooldown}s` : "Resend verification email"}
      </Button>
    </form>
  );
}
