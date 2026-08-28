import { Eye, EyeOff, ShieldCheck, ShieldX } from "lucide-react";

export default function ModerationBadge({ status, content = false }) {
  const restricted = status === "suspended" || status === "hidden";
  const label = restricted ? (content ? "Hidden by Admin" : "Suspended") : (content ? "Visible" : "Active");
  const Icon = restricted ? (content ? EyeOff : ShieldX) : (content ? Eye : ShieldCheck);
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${restricted ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><Icon className="size-3.5" aria-hidden="true" />{label}</span>;
}
