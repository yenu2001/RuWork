import { useEffect, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import AppHeader from "../../components/layout/AppHeader";
import { dashboardService } from "../../services/dashboardService";
import { getApiError } from "../../utils/apiError";
import { formatApprovedApplicationPrice, formatOriginalApplicationPrice } from "../../utils/applicationOptions";
import { formatJobDate } from "../../utils/jobOptions";

const filters = [{ value: "all", label: "All history" }, { value: "completed", label: "Completed work" }, { value: "cancelled", label: "Cancelled" }, { value: "declined", label: "Declined" }, { value: "withdrawn", label: "Withdrawn" }];

export default function JobHistoryPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", applications: [], pagination: null, error: "" });
  useEffect(() => { let active = true; dashboardService.getStudentJobHistory({ status: filter, page }).then((data) => active && setState({ status: "success", applications: data.applications, pagination: data.pagination, error: "" })).catch((error) => active && setState({ status: "error", applications: [], pagination: null, error: getApiError(error).message })); return () => { active = false; }; }, [filter, page]);
  function choose(value) { setFilter(value); setPage(1); setState((current) => ({ ...current, status: "loading" })); }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><History className="size-3.5" aria-hidden="true" />Student workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Job History</h1><p className="mt-3 max-w-2xl text-ink-600">Completed engagements and Applications that reached a terminal outcome.</p><div className="mt-8 flex flex-wrap gap-2" aria-label="Filter Job History">{filters.map((item) => <button key={item.value} type="button" onClick={() => choose(item.value)} aria-pressed={filter === item.value} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item.value ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600"}`}>{item.label}</button>)}</div>
    {state.status === "loading" && <Spinner label="Loading Job History…" />}{state.status === "error" && <div className="surface-card mt-6 p-6"><Alert>{state.error}</Alert></div>}{state.status === "success" && !state.applications.length && <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No history for this filter</h2><p className="mt-2 text-sm text-ink-600">Terminal Application records will remain available here, including archived Jobs.</p></div>}{state.status === "success" && state.applications.length > 0 && <div className="mt-6 grid gap-4">{state.applications.map((application) => <article key={application.id} className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><ApplicationStatusBadge status={application.status} /><h2 className="mt-3 text-xl font-extrabold text-ink-950">{application.job?.jobTitle || "Archived Job"}</h2><p className="mt-1 font-semibold text-ink-600">{application.job?.companyName || "Provider"}{application.job?.isArchived ? " · Job post archived" : ""}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600"><span>Applied {formatJobDate(application.appliedAt)}</span><span>Original: {formatOriginalApplicationPrice(application)}</span><span>Agreed: {formatApprovedApplicationPrice(application)}</span></div></div><Button as={Link} to={`/student/applications/${application.id}`} variant="secondary">View Details <ArrowRight className="size-4" aria-hidden="true" /></Button></div></article>)}</div>}
    {state.status === "success" && state.pagination?.pages > 1 && <nav className="mt-8 flex justify-center gap-3" aria-label="Job History pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
  </main></div>;
}
