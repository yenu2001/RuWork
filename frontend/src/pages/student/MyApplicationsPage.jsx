import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import StudentApplicationActions from "../../components/applications/StudentApplicationActions";
import AppHeader from "../../components/layout/AppHeader";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { APPLICATION_STATUS_OPTIONS, formatApprovedApplicationPrice, formatOriginalApplicationPrice } from "../../utils/applicationOptions";
import { formatJobDate } from "../../utils/jobOptions";

export default function MyApplicationsPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", applications: [], pagination: null, error: "" });

  useEffect(() => {
    let active = true;
    applicationService.getMyApplications({ status: filter, page })
      .then((data) => { if (active) setState({ status: "success", applications: data.applications, pagination: data.pagination, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", applications: [], pagination: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [filter, page, refreshKey]);

  function chooseFilter(value) {
    setFilter(value);
    setPage(1);
    setState((current) => ({ ...current, status: "loading", error: "" }));
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="page-container py-9 sm:py-12">
        <span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" />Student workspace</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">My Applications</h1>
        <p className="mt-3 max-w-2xl text-ink-600">Track Provider decisions, agreed pricing, and the progress of your work.</p>

        <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter Applications">
          {APPLICATION_STATUS_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => chooseFilter(option.value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${filter === option.value ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"}`} aria-pressed={filter === option.value}>{option.label}</button>)}
        </div>

        <section className="mt-6" aria-live="polite">
          {state.status === "loading" && <Spinner label="Loading your Applications…" />}
          {state.status === "error" && <div className="surface-card p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRefreshKey((key) => key + 1)}>Try again</Button></div>}
          {state.status === "success" && state.applications.length === 0 && <div className="surface-card px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Search className="size-6" aria-hidden="true" /></span><h2 className="mt-5 text-xl font-extrabold text-ink-950">You haven&apos;t applied for any {filter === "all" ? "" : `${APPLICATION_STATUS_OPTIONS.find((item) => item.value === filter)?.label.toLowerCase()} `}Jobs yet</h2><p className="mt-2 text-sm text-ink-600">Explore currently open opportunities that fit your studies.</p><Button as={Link} to="/jobs" className="mt-6">Find Jobs</Button></div>}
          {state.status === "success" && state.applications.length > 0 && <div className="grid gap-4">{state.applications.map((application) => <StudentApplicationCard key={application.id} application={application} onUpdated={() => setRefreshKey((key) => key + 1)} />)}</div>}
          {state.status === "success" && state.pagination.pages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Application pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
        </section>
      </main>
    </div>
  );
}

function StudentApplicationCard({ application, onUpdated }) {
  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <ApplicationStatusBadge status={application.status} />
          <h2 className="mt-3 text-xl font-extrabold text-ink-950">{application.job?.jobTitle || "Archived Job"}</h2>
          <p className="mt-1 font-semibold text-ink-600">{application.job?.companyName || "Provider"}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" aria-hidden="true" />Applied {formatJobDate(application.appliedAt)}</span><span>Original: {formatOriginalApplicationPrice(application)}</span>{application.status !== "pending_review" && <span>Agreed: {formatApprovedApplicationPrice(application)}</span>}</div>
        </div>
        <div className="flex flex-wrap gap-2"><Button as={Link} to={`/student/applications/${application.id}`} variant="secondary">View Details <ArrowRight className="size-4" aria-hidden="true" /></Button><StudentApplicationActions application={application} onUpdated={onUpdated} /></div>
      </div>
    </article>
  );
}
