export default function RegistrationSection({ number, title, description, children }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <legend className="px-2 text-sm font-extrabold text-ink-950">
        <span className="mr-2 inline-grid size-7 place-items-center rounded-lg bg-brand-100 text-xs text-brand-700">{number}</span>
        {title}
      </legend>
      {description && <p className="mb-5 mt-1 text-sm leading-6 text-ink-600">{description}</p>}
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
