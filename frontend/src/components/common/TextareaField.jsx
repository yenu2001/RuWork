export default function TextareaField({ id, label, error, helper, className = "", ...props }) {
  const messageId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea
        id={id}
        className={`field-control min-h-28 resize-y py-3 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      />
      {(error || helper) && <p id={messageId} className={`field-message ${error ? "text-red-700" : "text-ink-600"}`}>{error || helper}</p>}
    </div>
  );
}
