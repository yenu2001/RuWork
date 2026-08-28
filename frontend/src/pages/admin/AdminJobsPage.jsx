import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, Search } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPagination from "../../components/admin/AdminPagination";
import ModerationBadge from "../../components/admin/ModerationBadge";
import ModerationDialog from "../../components/admin/ModerationDialog";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import SelectField from "../../components/common/SelectField";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import JobStatusBadge from "../../components/jobs/JobStatusBadge";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

const statusOptions = [{ value: "all", label: "All lifecycle states" }, ...["draft", "open", "closed"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))];
const moderationOptions = [{ value: "all", label: "All moderation states" }, { value: "visible", label: "Visible" }, { value: "hidden", label: "Hidden" }];
const archivedOptions = [{ value: "all", label: "Current and archived" }, { value: "false", label: "Current only" }, { value: "true", label: "Archived only" }];

export default function AdminJobsPage() {
  const { showToast } = useToast();
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "all", moderationStatus: "all", archived: "all" });
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [state, setState] = useState({ status: "loading", jobs: [], pagination: null, error: "", saving: false });
  useEffect(() => { let active = true; adminService.getJobs({ ...filters, page, limit: 20 }).then((data) => active && setState({ status: "success", jobs: data.jobs, pagination: data.pagination, error: "", saving: false })).catch((error) => active && setState({ status: "error", jobs: [], pagination: null, error: getApiError(error).message, saving: false })); return () => { active = false; }; }, [filters, page]);
  function changeFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }
  function search(event) { event.preventDefault(); changeFilter("q", draftSearch.trim()); }
  async function moderate(reason) { const status = target.action === "hide" ? "hidden" : "visible"; setState((current) => ({ ...current, saving: true, error: "" })); try { const data = await adminService.moderateJob(target.job.id, status, reason); setState((current) => ({ ...current, saving: false, jobs: current.jobs.map((job) => job.id === data.job.id ? data.job : job) })); setTarget(null); showToast(data.message, "success"); } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); } }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" />Admin workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Job Moderation</h1><p className="mt-3 max-w-3xl text-ink-600">Inspect Jobs across all Providers and control public visibility without changing Provider-authored content or deleting history.</p><form onSubmit={search} className="surface-card mt-8 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_185px_185px_180px_auto] xl:items-end"><FormField id="admin-job-search" label="Search title, company or location" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} maxLength={80} /><SelectField id="admin-job-status" label="Lifecycle" value={filters.status} onChange={(event) => changeFilter("status", event.target.value)} options={statusOptions} /><SelectField id="admin-job-moderation" label="Moderation" value={filters.moderationStatus} onChange={(event) => changeFilter("moderationStatus", event.target.value)} options={moderationOptions} /><SelectField id="admin-job-archived" label="Archive" value={filters.archived} onChange={(event) => changeFilter("archived", event.target.value)} options={archivedOptions} /><Button type="submit"><Search className="size-4" aria-hidden="true" />Search</Button></form>{state.error ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}{state.status === "loading" ? <Spinner label="Loading Jobs…" /> : null}{state.status === "success" && !state.jobs.length ? <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No matching Jobs</h2><p className="mt-2 text-sm text-ink-600">Try changing the moderation, lifecycle, archive, or search filter.</p></div> : null}{state.status === "success" && state.jobs.length ? <section className="mt-6 grid gap-4" aria-label="Jobs">{state.jobs.map((job) => <JobCard key={job.id} job={job} onModerate={setTarget} />)}</section> : null}<AdminPagination pagination={state.pagination} page={page} onPage={setPage} label="Jobs" /></main><ModerationDialog target={target && { ...target, label: target.job.jobTitle }} onClose={() => setTarget(null)} onConfirm={moderate} saving={state.saving} /></div>;
}

function JobCard({ job, onModerate }) { const hidden = job.moderationStatus === "hidden"; return <article className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><ModerationBadge status={job.moderationStatus} content /><JobStatusBadge status={job.status} isArchived={Boolean(job.archivedAt)} />{job.providerSuspended ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">Provider suspended</span> : null}</div><h2 className="mt-4 break-words text-xl font-extrabold text-ink-950">{job.jobTitle}</h2><p className="mt-1 text-sm font-semibold text-brand-700">{job.provider?.companyName || job.companyName}</p><p className="mt-2 text-sm text-ink-600">{job.category} · {job.location} · Deadline {formatJobDate(job.applicationDeadline)}</p>{job.moderationReason ? <p className="mt-3 text-sm text-red-700"><strong>Moderation reason:</strong> {job.moderationReason}</p> : null}</div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row"><Button as={Link} to={`/admin/jobs/${job.id}`} variant="secondary">Inspect <ArrowRight className="size-4" aria-hidden="true" /></Button><Button variant={hidden ? "primary" : "danger"} onClick={() => onModerate({ action: hidden ? "restore" : "hide", job })}>{hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}{hidden ? "Restore" : "Hide"}</Button></div></div></article>; }
