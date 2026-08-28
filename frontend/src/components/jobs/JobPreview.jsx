import { CalendarDays, Clock3, MapPin, Star } from "lucide-react";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";

export default function JobPreview({ job, companyName = "Your verified company profile" }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-label="Job preview">
      <div className="bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white sm:p-8">
        <p className="text-xs font-extrabold tracking-[0.16em] text-brand-100 uppercase">Student view preview</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">{job.jobTitle}</h2>
        <p className="mt-2 font-semibold text-brand-100">{companyName}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{job.category}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Suitable for {job.suitableFor}</span>
        </div>
      </div>
      <div className="grid gap-7 p-6 sm:p-8">
        <div className="grid gap-3 text-sm text-ink-600 sm:grid-cols-3">
          <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-brand-600" aria-hidden="true" />{job.location}</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-brand-600" aria-hidden="true" />{job.workingHours}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" aria-hidden="true" />{formatJobDate(job.applicationDeadline)}</span>
        </div>
        <div>
          <h3 className="font-extrabold text-ink-950">About this Job</h3>
          <p className="mt-2 whitespace-pre-line leading-7 text-ink-600">{job.jobDescription}</p>
        </div>
        <div>
          <h3 className="font-extrabold text-ink-950">Scope of work</h3>
          <p className="mt-2 whitespace-pre-line leading-7 text-ink-600">{job.scope}</p>
        </div>
        <div className="flex flex-wrap gap-2">{job.requiredSkills.map((skill) => <span key={skill} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">{skill}</span>)}</div>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-extrabold text-brand-700">{formatJobPrice(job)}</p>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600"><Star className="size-4 text-slate-400" aria-hidden="true" />No ratings yet</p>
        </div>
      </div>
    </article>
  );
}
