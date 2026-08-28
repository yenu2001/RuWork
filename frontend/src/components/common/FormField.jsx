export default function FormField({
  id,
  label,
  error,
  helper,
  className = "",
  inputClassName = "",
  ...props
}) {
  const messageId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        className={`field-control ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""} ${inputClassName}`}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      />
      {(error || helper) && (
        <p id={messageId} className={`field-message ${error ? "text-red-700" : "text-ink-600"}`}>
          {error || helper}
        </p>
      )}
    </div>
  );
}
