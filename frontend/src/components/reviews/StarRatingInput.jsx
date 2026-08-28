import { useId } from "react";
import { Star } from "lucide-react";

const RATINGS = [1, 2, 3, 4, 5];

export default function StarRatingInput({ value, onChange, error = "" }) {
  const name = useId();
  const errorId = `${name}-error`;
  return <fieldset aria-describedby={error ? errorId : undefined}>
    <legend className="text-sm font-bold text-ink-800">Rating</legend>
    <div className="mt-3 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      {RATINGS.map((rating) => <label key={rating} className="cursor-pointer rounded-xl p-1 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2" title={`${rating} ${rating === 1 ? "star" : "stars"}`}>
        <input className="sr-only" type="radio" name={name} value={rating} checked={value === rating} onChange={() => onChange(rating)} aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`} />
        <Star className={`size-8 ${rating <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} aria-hidden="true" />
      </label>)}
    </div>
    {error ? <p id={errorId} className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
  </fieldset>;
}
