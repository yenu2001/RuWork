import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, GraduationCap, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import ProviderApplicationActions from "../../components/applications/ProviderApplicationActions";
import AppHeader from "../../components/layout/AppHeader";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { APPLICATION_STATUS_OPTIONS, formatOriginalApplicationPrice } from "../../utils/applicationOptions";
import { formatJobDate } from "../../utils/jobOptions";

export default function ApplicantsPage() {
  const { jobId } = useParams();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({ status: "loading", job: null, applications: [], pagination: null, error: "" });

  useEffect(() => {
    let active = true;
    applicationService.getJobApplications(jobId, { status: filter, page })
      .then((data) => { if (active) setState({ status: "success", job: data.job, applications: data.applications, pagination: data.pagination, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", job: null, applications: [], pagination: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [jobId, filter, page, retryKey]);

  function chooseFilter(value) {
    setFilter(value);
    setPage(1);
    setState((current) => ({ ...current, status: "loading", error: "" }));
  }

  function updateApplication(updated) {
    setState((current) => ({ ...current, applications: current.applications.map((application) => application.id === updated.id ? { ...application, ...updated, student: application.student } : application) }));
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="page-container py-9 sm:py-12">
        <Link to="/provider/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to My Jobs</Link>
        <div className="mt-6"><span className="eyebrow"><Users className="size-3.5" aria-hidden="true" />Applicant management</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">{state.job?.jobTitle || "Job Applicants"}</h1><p className="mt-3 text-ink-600">Review Student applications and manage each engagement through completion.</p></div>
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter applicants">{APPLICATION_STATUS_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => chooseFilter(option.value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${filter === option.value ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"}`} aria-pressed={filter === option.value}>{option.label}</button>)}</div>

        <section className="mt-6" aria-live="polite">
          {state.status === "loading" && <Spinner label="Loading applicants…" />}
          {state.status === "error" && <div className="surface-card p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRetryKey((key) => key + 1)}>Try again</Button></div>}
          {state.status === "success" && state.applications.length === 0 && <div className="surface-card px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Users className="size-6" aria-hidden="true" /></span><h2 className="mt-5 text-xl font-extrabold text-ink-950">No applications have been received{filter === "all" ? "" : " with this status"}</h2><p className="mt-2 text-sm text-ink-600">New Applications will appear here without exposing private account data.</p></div>}
          {state.status === "success" && state.applications.length > 0 && <div className="grid gap-4">{state.applications.map((application) => <ApplicantCard key={application.id} application={application} onUpdated={updateApplication} />)}</div>}
          {state.status === "success" && state.pagination.pages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Applicant pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
        </section>
      </main>
    </div>
  );
}

function ApplicantCard({ application, onUpdated }) {
  const student = application.student;
  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><ApplicationStatusBadge status={application.status} /><h2 className="mt-3 text-xl font-extrabold text-ink-950">{student.firstName} {student.lastName}</h2><p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-ink-600"><GraduationCap className="size-4 text-brand-600" aria-hidden="true" />{student.fieldOfStudy} · {student.yearOfStudy}</p><p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-ink-600">{application.applicationNote}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink-400"><span>Applied {formatJobDate(application.appliedAt)}</span><span>{formatOriginalApplicationPrice(application)}</span></div></div>
        <div className="flex flex-wrap gap-2"><Button as={Link} to={`/provider/applications/${application.id}`} variant="secondary">View Details <ArrowRight className="size-4" aria-hidden="true" /></Button><ProviderApplicationActions application={application} onUpdated={onUpdated} /></div>
      </div>
    </article>
  );
}
