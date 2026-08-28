import { Star } from "lucide-react";

export default function RatingSummary({ averageRating, reviewCount, label, align = "left" }) {
  const hasRating = Number.isFinite(averageRating) && reviewCount > 0;
  return <div className={align === "right" ? "text-right" : "text-left"}>
    {label ? <p className="text-xs font-extrabold tracking-wide text-ink-400 uppercase">{label}</p> : null}
    <p className={`${label ? "mt-2" : ""} inline-flex items-center gap-1.5 font-extrabold text-ink-950`}>
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      {hasRating ? averageRating.toFixed(1) : "No ratings yet"}
    </p>
    {hasRating ? <p className="mt-1 text-xs text-ink-600">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p> : null}
  </div>;
}
