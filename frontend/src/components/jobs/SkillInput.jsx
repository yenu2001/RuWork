import { useState } from "react";
import { Plus, X } from "lucide-react";
import Button from "../common/Button";

export default function SkillInput({ value, onChange, error }) {
  const [draft, setDraft] = useState("");

  function addSkill() {
    const skill = draft.trim();
    if (!skill || value.length >= 10 || value.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    onChange([...value, skill]);
    setDraft("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill();
    }
  }

  return (
    <div>
      <label htmlFor="job-skill-entry" className="field-label">Required skills</label>
      <div className="flex gap-2">
        <input
          id="job-skill-entry"
          className={`field-control ${error ? "border-red-400" : ""}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={50}
          placeholder="e.g. Figma"
          aria-describedby={error ? "job-skills-error" : "job-skills-help"}
        />
        <Button type="button" variant="secondary" onClick={addSkill} disabled={!draft.trim() || value.length >= 10} aria-label="Add skill">
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
      </div>
      <p id={error ? "job-skills-error" : "job-skills-help"} className={`field-message ${error ? "text-red-700" : "text-ink-600"}`}>
        {error || `${value.length}/10 skills added. Press Enter or select Add.`}
      </p>
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected skills">
          {value.map((skill) => (
            <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1.5 pr-1.5 pl-3 text-sm font-semibold text-brand-700">
              {skill}
              <button type="button" onClick={() => onChange(value.filter((item) => item !== skill))} className="grid size-6 place-items-center rounded-full hover:bg-brand-100" aria-label={`Remove ${skill}`}>
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
