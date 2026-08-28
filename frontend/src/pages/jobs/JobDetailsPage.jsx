import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import PaymentInformationCard from "../../components/common/PaymentInformationCard";
import JobStatusBadge from "../../components/jobs/JobStatusBadge";
import AppHeader from "../../components/layout/AppHeader";
import ApplyToJob from "../../components/applications/ApplyToJob";
import JobReviewsSection from "../../components/reviews/JobReviewsSection";
import RatingSummary from "../../components/reviews/RatingSummary";
import useAuth from "../../hooks/useAuth";
import { applicationService } from "../../services/applicationService";
import { jobService } from "../../services/jobService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";

export default function JobDetailsPage() {
  const { id } = useParams();
  const auth = useAuth();
  const [state, setState] = useState({ status: "loading", job: null, error: "" });
  const [applicationState, setApplicationState] = useState({ status: auth.user?.role === "student" ? "loading" : "ready", application: null });

  useEffect(() => {
    let active = true;
    jobService.getJob(id)
      .then((job) => { if (active) setState({ status: "success", job, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", job: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!auth.isAuthenticated || auth.user?.role !== "student") return undefined;
    let active = true;
    applicationService.getMyApplicationForJob(id)
      .then((application) => { if (active) setApplicationState({ status: "ready", application }); })
      .catch(() => { if (active) setApplicationState({ status: "error", application: null }); });
    return () => { active = false; };
  }, [auth.isAuthenticated, auth.user?.role, id]);

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      {state.status === "loading" && <Spinner label="Loading Job details…" />}
      {state.status === "error" && <main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to="/jobs" variant="secondary" className="mt-6"><ArrowLeft className="size-4" aria-hidden="true" /> Back to Jobs</Button></main>}
      {state.status === "success" && <JobDetailsContent job={state.job} viewer={auth.user} existingApplication={applicationState.application} applicationLookupStatus={applicationState.status} onApplied={(application) => setApplicationState({ status: "ready", application })} />}
    </div>
  );
}

export function JobDetailsContent({ job, viewer = null, existingApplication = null, applicationLookupStatus = "ready", onApplied }) {
  return (
    <main className="page-container py-8 sm:py-12">
      <Link to="/jobs" className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" /> Back to Find Jobs</Link>
      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <section className="surface-card p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{job.category}</span><JobStatusBadge job={job} /></div>
                <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.045em] text-ink-950 sm:text-4xl">{job.jobTitle}</h1>
                <p className="mt-2 text-lg font-semibold text-ink-600">{job.companyName}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3"><RatingSummary averageRating={job.averageRating} reviewCount={job.reviewCount} label="Job rating" align="right" /></div>
            </div>
            <div className="mt-7 grid gap-4 border-t border-slate-200 pt-6 text-sm text-ink-600 sm:grid-cols-2">
              <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-brand-600" aria-hidden="true" />{job.location}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-brand-600" aria-hidden="true" />{job.workingHours}</span>
              <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="size-4 text-brand-600" aria-hidden="true" />Suitable for {job.suitableFor}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" aria-hidden="true" />Deadline: {formatJobDate(job.applicationDeadline)}</span>
            </div>
          </section>

          <section className="surface-card p-6 sm:p-8"><h2 className="text-xl font-extrabold text-ink-950">About this Job</h2><p className="mt-4 whitespace-pre-line leading-7 text-ink-600">{job.jobDescription}</p></section>
          <section className="surface-card p-6 sm:p-8"><h2 className="text-xl font-extrabold text-ink-950">Scope of work</h2><p className="mt-4 whitespace-pre-line leading-7 text-ink-600">{job.scope}</p><h3 className="mt-7 font-extrabold text-ink-950">Required skills</h3><div className="mt-3 flex flex-wrap gap-2">{job.requiredSkills.map((skill) => <span key={skill} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">{skill}</span>)}</div></section>
          <JobReviewsSection job={job} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="surface-card p-6">
            <p className="text-xs font-extrabold tracking-[0.14em] text-brand-600 uppercase">Job pricing</p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink-950">{formatJobPrice(job)}</p>
            <p className="mt-2 text-sm leading-6 text-ink-600">This is the Provider's advertised {job.budgetType === "hourly" ? "hourly rate" : "fixed budget"}.</p>
            <ApplyToJob job={job} viewer={viewer} existingApplication={existingApplication} lookupStatus={applicationLookupStatus} onApplied={onApplied} />
          </section>
          <PaymentInformationCard />
          <section className="surface-card p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <h2 className="mt-4 font-extrabold text-ink-950">Verified Provider</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">{job.provider?.industry || job.companyName} · RuWork account approved for publishing.</p>
            <div className="mt-5 border-t border-slate-200 pt-4"><RatingSummary averageRating={job.provider?.averageRating} reviewCount={job.provider?.reviewCount || 0} label="Provider rating" /></div>
            {job.provider?.companyWebsite && <a href={job.provider.companyWebsite} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline">Company website</a>}
          </section>
        </aside>
      </div>
    </main>
  );
}
