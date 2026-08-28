import { useEffect, useState } from "react";
import { Archive, BriefcaseBusiness, Eye, FilePenLine, Plus, Power, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Spinner from "../../components/common/Spinner";
import JobStatusBadge from "../../components/jobs/JobStatusBadge";
import AppHeader from "../../components/layout/AppHeader";
import useToast from "../../hooks/useToast";
import { jobService } from "../../services/jobService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";
import ModerationBadge from "../../components/admin/ModerationBadge";

const filters = ["all", "draft", "open", "closed"];

export default function MyJobsPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ status: "loading", jobs: [], pagination: null, error: "" });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionId, setActionId] = useState("");

  useEffect(() => {
    let active = true;
    jobService.getMyJobs({ status: filter, page })
      .then((data) => { if (active) setState({ status: "success", jobs: data.jobs, pagination: data.pagination, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", jobs: [], pagination: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [filter, page, refreshKey]);

  function chooseFilter(next) {
    setFilter(next);
    setPage(1);
    setState((current) => ({ ...current, status: "loading", error: "" }));
  }

  async function changeStatus(job, status) {
    setActionId(job.id);
    try {
      await jobService.updateJob(job.id, { status });
      showToast(status === "open" ? "Job is now open." : "Job closed successfully.", "success");
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getApiError(error).message, "error");
    } finally {
      setActionId("");
    }
  }

  async function confirmDelete() {
    setActionId(pendingDelete.id);
    try {
      await jobService.deleteJob(pendingDelete.id);
      showToast("Job archived successfully. Application history is preserved.", "success");
      setPendingDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(getApiError(error).message, "error");
      setActionId("");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="page-container py-9 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" />Provider workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">My Jobs</h1><p className="mt-3 text-ink-600">Manage drafts and control which opportunities students can discover.</p></div>
          <Button as={Link} to="/provider/jobs/new"><Plus className="size-4" aria-hidden="true" />Post a Job</Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter your Jobs">
          {filters.map((item) => <button key={item} type="button" onClick={() => chooseFilter(item)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${filter === item ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"}`} aria-pressed={filter === item}>{item}</button>)}
        </div>

        <section className="mt-6" aria-live="polite">
          {state.status === "loading" && <Spinner label="Loading your Jobs…" />}
          {state.status === "error" && <div className="surface-card p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRefreshKey((key) => key + 1)}>Try again</Button></div>}
          {state.status === "success" && state.jobs.length === 0 && <div className="surface-card px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><BriefcaseBusiness className="size-6" aria-hidden="true" /></span><h2 className="mt-5 text-xl font-extrabold text-ink-950">No {filter === "all" ? "" : `${filter} `}Jobs yet</h2><p className="mt-2 text-sm text-ink-600">Create an opportunity and preview it before publishing.</p><Button as={Link} to="/provider/jobs/new" className="mt-6">Post a Job</Button></div>}
          {state.status === "success" && state.jobs.length > 0 && <div className="grid gap-4">{state.jobs.map((job) => <ProviderJobCard key={job.id} job={job} actionId={actionId} onChangeStatus={changeStatus} onDelete={setPendingDelete} />)}</div>}
          {state.status === "success" && state.pagination.pages > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="My Jobs pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>}
        </section>
      </main>

      <Modal isOpen={Boolean(pendingDelete)} onClose={() => !actionId && setPendingDelete(null)} eyebrow="Archive Job" title="Archive this Job?" description={pendingDelete ? `“${pendingDelete.jobTitle}” will leave Job listings and My Jobs. Existing Application history will remain available to both parties.` : ""}>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setPendingDelete(null)} disabled={Boolean(actionId)}>Cancel</Button><Button type="button" variant="danger" onClick={confirmDelete} isLoading={Boolean(actionId)}><Archive className="size-4" aria-hidden="true" />Archive Job</Button></div>
      </Modal>
    </div>
  );
}

function ProviderJobCard({ job, actionId, onChangeStatus, onDelete }) {
  const busy = actionId === job.id;
  const canView = job.status !== "draft" && job.moderationStatus !== "hidden" && !job.providerSuspended;
  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3"><JobStatusBadge job={job} />{job.moderationStatus === "hidden" ? <ModerationBadge status="hidden" content /> : null}{job.providerSuspended ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">Hidden while account is suspended</span> : null}<span className="text-xs font-bold text-ink-400">{job.category}</span></div>
          <h2 className="mt-3 text-xl font-extrabold text-ink-950">{job.jobTitle}</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600"><span>{formatJobPrice(job)}</span><span>Deadline: {formatJobDate(job.applicationDeadline)}</span><span>{job.location}</span></div>
          {job.moderationReason ? <p className="mt-3 text-sm text-red-700"><strong>Admin moderation reason:</strong> {job.moderationReason}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canView && <Button as={Link} to={`/jobs/${job.id}`} variant="subtle"><Eye className="size-4" aria-hidden="true" />View</Button>}
          <Button as={Link} to={`/provider/jobs/${job.id}/applications`} variant="subtle"><Users className="size-4" aria-hidden="true" />{job.applicationCount || 0} {job.applicationCount === 1 ? "Applicant" : "Applicants"}</Button>
          <Button as={Link} to={`/provider/jobs/${job.id}/edit`} variant="secondary"><FilePenLine className="size-4" aria-hidden="true" />Edit</Button>
          {job.status === "open" ? <Button type="button" variant="secondary" onClick={() => onChangeStatus(job, "closed")} isLoading={busy}><Power className="size-4" aria-hidden="true" />Close</Button> : <Button type="button" variant="secondary" onClick={() => onChangeStatus(job, "open")} isLoading={busy}><Power className="size-4" aria-hidden="true" />{job.status === "draft" ? "Publish" : "Reopen"}</Button>}
          <Button type="button" variant="danger" onClick={() => onDelete(job)} disabled={busy} aria-label={`Archive ${job.jobTitle}`}><Archive className="size-4" aria-hidden="true" />Archive</Button>
        </div>
      </div>
    </article>
  );
}
