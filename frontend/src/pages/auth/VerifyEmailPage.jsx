import { useEffect, useState } from "react";
import { CircleAlert, CircleCheckBig } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../components/common/Button";
import Logo from "../../components/common/Logo";
import Spinner from "../../components/common/Spinner";
import ResendVerificationForm from "../../components/auth/ResendVerificationForm";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const accountType = searchParams.get("type") || "";
  const validType = ["student", "jobProvider"].includes(accountType);
  const [status, setStatus] = useState(token && validType ? "verifying" : "invalid");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !validType) return;
    let active = true;
    authService.verifyEmail(accountType, token)
      .then((response) => {
        if (!active) return;
        setMessage(response.message);
        setStatus("success");
      })
      .catch((error) => {
        if (!active) return;
        const apiError = getApiError(error, "The verification link could not be used.");
        setMessage(apiError.message);
        setStatus(apiError.code === "INVALID_OR_EXPIRED_VERIFICATION_TOKEN" ? "invalidOrExpired" : "error");
      });
    return () => { active = false; };
  }, [accountType, token, validType]);

  if (status === "verifying") {
    return <main className="min-h-screen bg-surface"><Spinner label="Verifying your email…" /></main>;
  }

  const success = status === "success";
  const title = success ? "Email verified" : status === "invalidOrExpired" ? "Verification link is invalid or expired" : "Email verification unavailable";
  const body = success
    ? "Your email has been successfully verified. Your registration is now waiting for administrator approval."
    : message || "This verification link is incomplete. Open the complete link from your RuWork verification email.";

  return (
    <main className="min-h-screen bg-surface px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <section className="surface-card mt-10 p-6 text-center sm:p-10">
          <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {success ? <CircleCheckBig className="size-8" aria-hidden="true" /> : <CircleAlert className="size-8" aria-hidden="true" />}
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.04em] text-ink-950">{title}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-ink-600">{body}</p>
          {!success && validType && (
            <div className="mx-auto mt-7 max-w-md border-t border-slate-200 pt-7 text-left">
              <p className="mb-4 text-center text-sm font-semibold text-ink-800">Request a new link</p>
              <ResendVerificationForm accountType={accountType} compact />
            </div>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button as={Link} to="/" variant="secondary">Back to home</Button>
            <Button as={Link} to={accountType === "jobProvider" ? "/login/provider" : "/login/student"}>Go to login</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
