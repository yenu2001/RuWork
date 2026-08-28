import { CircleAlert, Info } from "lucide-react";

export default function Alert({ children, tone = "error", title }) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : Info;
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 text-sm ${isError ? "border-red-200 bg-red-50 text-red-800" : "border-brand-200 bg-brand-50 text-brand-800"}`} role={isError ? "alert" : "status"}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="leading-6">
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
