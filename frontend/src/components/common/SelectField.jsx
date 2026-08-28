export default function SelectField({ id, label, error, helper, options, className = "", ...props }) {
  const messageId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <select
        id={id}
        className={`field-control ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {(error || helper) && <p id={messageId} className={`field-message ${error ? "text-red-700" : "text-ink-600"}`}>{error || helper}</p>}
    </div>
  );
}
