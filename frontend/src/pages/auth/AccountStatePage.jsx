import { CircleX, Clock3, MailCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import ResendVerificationForm from "../../components/auth/ResendVerificationForm";
import Logo from "../../components/common/Logo";

const stateConfig = {
  verification: {
    icon: MailCheck,
    iconClass: "bg-brand-100 text-brand-700",
    eyebrow: "One step before review",
    title: "Check your email",
    text: "Your RuWork account has been created, but your email address must be verified before your registration can be reviewed. Verification does not mean the account is approved."
  },
  pending: {
    icon: Clock3,
    iconClass: "bg-amber-100 text-amber-700",
    eyebrow: "Registration status",
    title: "Registration under review",
    text: "Your email has been verified successfully. Your RuWork registration is currently being reviewed by the administrator. You can access your account after it is approved."
  },
  rejected: {
    icon: CircleX,
    iconClass: "bg-red-100 text-red-700",
    eyebrow: "Registration status",
    title: "Registration not approved",
    text: "Your RuWork registration was not approved. No rejection reason was provided by the current login API."
  }
};

export default function AccountStatePage({ stateType }) {
  const config = stateConfig[stateType];
  const { state } = useLocation();
  const Icon = config.icon;
  const accountType = state?.accountType === "jobProvider" ? "jobProvider" : "student";
  const loginPath = accountType === "jobProvider" ? "/login/provider" : "/login/student";
  const displayText = stateType === "rejected" && state?.message ? state.message : config.text;

  return (
    <main className="min-h-screen bg-surface px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <section className="surface-card mt-10 p-6 text-center sm:p-10">
          <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${config.iconClass}`}><Icon className="size-8" aria-hidden="true" /></span>
          <p className="mt-6 text-xs font-extrabold tracking-[0.16em] text-brand-600 uppercase">{config.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink-950">{config.title}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-ink-600">{displayText}</p>
          {stateType === "verification" && state?.deliveryFailed && (
            <div className="mx-auto mt-6 max-w-md text-left">
              <Alert>{state.message}</Alert>
            </div>
          )}
          {stateType === "verification" && (
            <div className="mx-auto mt-7 max-w-md border-t border-slate-200 pt-7 text-left">
              <ResendVerificationForm accountType={accountType} initialEmail={state?.email || ""} compact />
            </div>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button as={Link} to="/" variant="secondary">Back to home</Button>
            <Button as={Link} to={loginPath}>Back to login</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
