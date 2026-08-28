import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import ToastContext from "./toastContextValue";
let nextToastId = 0;

const toastIcons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, tone = "info") => {
    const id = ++nextToastId;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.tone] || Info;
          return (
            <div key={toast.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <Icon className={toast.tone === "error" ? "mt-0.5 size-5 text-red-600" : "mt-0.5 size-5 text-brand-600"} aria-hidden="true" />
              <p className="flex-1 text-sm leading-6 text-ink-800">{toast.message}</p>
              <button type="button" onClick={() => removeToast(toast.id)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Dismiss notification">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
