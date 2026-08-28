import { Link } from "react-router-dom";

export default function Logo({ compact = false, className = "" }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 rounded-lg ${className}`} aria-label="RuWork home">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 32 32" className="size-6" fill="none">
          <path d="M6 8.5A2.5 2.5 0 0 1 8.5 6H16a6.5 6.5 0 0 1 0 13h-4v5H6V8.5Z" fill="white" />
          <path d="M12 11h4a2 2 0 1 1 0 4h-4v-4Z" fill="#A78BFA" />
          <path d="m17.5 17 7 7h-7L12 19h4c.5 0 1-.06 1.5-.16V17Z" fill="#DDD6FE" />
        </svg>
      </span>
      {!compact && <span className="text-xl font-extrabold tracking-[-0.04em] text-ink-950">Ru<span className="text-brand-600">Work</span></span>}
    </Link>
  );
}
