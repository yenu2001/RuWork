import { BadgeCheck, Clock3, MailWarning, XCircle } from "lucide-react";

export default function AccountStatusBadge({ type, value }) {
  const verified = type === "email" && value;
  const approved = type === "account" && value === "approved";
  const rejected = type === "account" && value === "rejected";
  const Icon = verified || approved ? BadgeCheck : rejected ? XCircle : type === "email" ? MailWarning : Clock3;
  const label = type === "email"
    ? value ? "Email verified" : "Email not verified"
    : approved ? "Account approved" : rejected ? "Account rejected" : "Approval pending";
  const classes = verified || approved
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : rejected ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${classes}`}><Icon className="size-3.5" aria-hidden="true" />{label}</span>;
}
