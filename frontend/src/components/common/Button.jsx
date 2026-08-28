import { LoaderCircle } from "lucide-react";

const variants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 disabled:text-brand-300",
  inverse: "bg-white text-brand-700 shadow-sm hover:bg-brand-50 disabled:bg-white/60 disabled:text-brand-300",
  subtle: "bg-slate-100 text-ink-800 hover:bg-slate-200 disabled:text-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
};

export default function Button({
  as: Component = "button",
  variant = "primary",
  className = "",
  isLoading = false,
  children,
  disabled,
  ...props
}) {
  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition focus-visible:outline-none disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={Component === "button" ? disabled || isLoading : undefined}
      {...props}
    >
      {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
}
