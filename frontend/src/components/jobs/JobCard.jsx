import { ArrowRight, BriefcaseBusiness, CalendarDays, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";

export default function JobCard({ job }) {
  const hasRating = Number.isFinite(job.averageRating) && job.reviewCount > 0;
  return (
    <article className="surface-card grid gap-6 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft sm:p-6 lg:grid-cols-[minmax(0,1fr)_190px]" data-testid="job-card">
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-[-0.025em] text-ink-950">{job.jobTitle}</h2>
            <p className="mt-1 font-semibold text-ink-600">{job.companyName}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-brand-500" aria-hidden="true" />{job.location}</span>
          <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="size-4 text-brand-500" aria-hidden="true" />{job.category}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-brand-500" aria-hidden="true" />Apply by {formatJobDate(job.applicationDeadline)}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {job.requiredSkills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-600">{skill}</span>)}
        </div>
        <p className="mt-6 text-base font-extrabold text-brand-700">{formatJobPrice(job)}</p>
      </div>
      <aside className="flex flex-row items-center justify-between gap-4 border-t border-slate-200 pt-5 lg:flex-col lg:items-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6" data-testid="job-rating">
        <div className="lg:text-right">
          <p className="inline-flex items-center gap-1.5 font-extrabold text-ink-950 lg:justify-end">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            {hasRating ? job.averageRating.toFixed(1) : "No ratings yet"}
          </p>
          {hasRating && <p className="mt-1 text-xs text-ink-600">{job.reviewCount} {job.reviewCount === 1 ? "review" : "reviews"}</p>}
        </div>
        <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-2 rounded-xl font-bold text-brand-700 hover:text-brand-800">View Job <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </aside>
    </article>
  );
}
