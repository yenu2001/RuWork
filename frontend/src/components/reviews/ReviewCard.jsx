import { Star } from "lucide-react";
import { formatJobDate } from "../../utils/jobOptions";

export default function ReviewCard({ review, showJob = false, actions = null }) {
  const studentName = review.student ? `${review.student.firstName} ${review.student.lastName}` : "RuWork Student";
  return <article className="surface-card p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-extrabold text-ink-950"><Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />{review.rating}.0</span>
          <span className="text-sm font-semibold text-ink-600">{studentName}</span>
        </div>
        {showJob && review.job ? <p className="mt-2 text-sm font-bold text-brand-700">{review.job.jobTitle}{review.job.isArchived ? " · Archived Job" : ""}</p> : null}
        {review.provider ? <p className="mt-1 text-sm text-ink-600">{review.provider.companyName}</p> : null}
        {review.comment ? <p className="mt-4 whitespace-pre-line leading-7 text-ink-700">{review.comment}</p> : <p className="mt-4 text-sm italic text-ink-500">No written comment.</p>}
        <p className="mt-4 text-xs font-semibold text-ink-400">Reviewed {formatJobDate(review.createdAt)}</p>
      </div>
      {actions}
    </div>
  </article>;
}
