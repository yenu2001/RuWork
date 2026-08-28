import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function Modal({ isOpen, onClose, title, description, children, eyebrow = "RuWork" }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    panel?.querySelector(focusableSelector)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const focusable = [...panel.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-lg rounded-3xl border border-white/50 bg-white p-6 shadow-soft sm:p-8"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-ink-950" aria-label="Close dialog">
          <X className="size-5" aria-hidden="true" />
        </button>
        <div className="pr-10">
          <p className="mb-2 text-xs font-extrabold tracking-[0.16em] text-brand-600 uppercase">{eyebrow}</p>
          <h2 id={titleId} className="text-2xl font-extrabold tracking-tight text-ink-950">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-ink-600">{description}</p>}
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
