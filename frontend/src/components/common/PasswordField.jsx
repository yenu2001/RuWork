import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ id, label, error, helper, className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  const messageId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`field-control pr-12 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={messageId}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink-800"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      </div>
      {(error || helper) && <p id={messageId} className={`field-message ${error ? "text-red-700" : "text-ink-600"}`}>{error || helper}</p>}
    </div>
  );
}
