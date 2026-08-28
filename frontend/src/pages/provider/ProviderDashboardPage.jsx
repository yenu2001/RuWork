import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import JobStatusBadge from "../../components/jobs/JobStatusBadge";
import AppHeader from "../../components/layout/AppHeader";
import WorkspaceStatCard from "../../components/workspace/WorkspaceStatCard";
import { dashboardService } from "../../services/dashboardService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate, formatJobPrice } from "../../utils/jobOptions";

export default function ProviderDashboardPage() {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  useEffect(() => { let active = true; dashboardService.getProviderDashboard().then((data) => active && setState({ status: "success", data, error: "" })).catch((error) => active && setState({ status: "error", data: null, error: getApiError(error).message })); return () => { active = false; }; }, [retry]);
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" />Provider workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Dashboard</h1><p className="mt-3 text-ink-600">Live activity across your Jobs and Student engagements.</p>{state.status === "loading" && <Spinner label="Loading Provider dashboard…" />}{state.status === "error" && <div className="surface-card mt-8 p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>}{state.status === "success" && <ProviderDashboardContent data={state.data} />}</main></div>;
}

export function ProviderDashboardContent({ data }) {
  const { summary, recentJobs, recentApplications } = data;
  return <><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Provider summary"><WorkspaceStatCard label="Open Jobs" value={summary.openJobs} icon={BriefcaseBusiness} /><WorkspaceStatCard label="Total Applicants" value={summary.totalApplicants} icon={Users} tone="amber" /><WorkspaceStatCard label="In Progress" value={summary.inProgress} icon={FileText} tone="blue" /><WorkspaceStatCard label="Completed Engagements" value={summary.completedEngagements} icon={CheckCircle2} tone="emerald" /></section>
    <div className="mt-10 grid gap-8 xl:grid-cols-2"><section><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-ink-950">Recent Jobs</h2><p className="mt-1 text-sm text-ink-600">Your most recently created active Job records.</p></div><Link to="/provider/jobs" className="text-sm font-bold text-brand-700 hover:underline">My Jobs</Link></div>{recentJobs.length ? <div className="mt-5 grid gap-3">{recentJobs.map((job) => <article key={job.id} className="surface-card p-5"><JobStatusBadge job={job} /><h3 className="mt-3 font-extrabold text-ink-950">{job.jobTitle}</h3><p className="mt-1 text-sm text-ink-600">{formatJobPrice(job)} · Deadline {formatJobDate(job.applicationDeadline)}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-bold text-ink-600">{job.applicationCount} {job.applicationCount === 1 ? "Applicant" : "Applicants"}</span><Link className="inline-flex items-center gap-1 text-sm font-bold text-brand-700" to={`/provider/jobs/${job.id}/applications`}>Manage <ArrowRight className="size-4" aria-hidden="true" /></Link></div></article>)}</div> : <EmptyCard text="No Jobs yet. Publish your first opportunity to receive Applications." action="Post a Job" to="/provider/jobs/new" />}</section>
      <section><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-ink-950">Recent Applications</h2><p className="mt-1 text-sm text-ink-600">Latest Student activity across your Jobs.</p></div></div>{recentApplications.length ? <div className="mt-5 grid gap-3">{recentApplications.map((application) => <article key={application.id} className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><ApplicationStatusBadge status={application.status} /><h3 className="mt-3 font-extrabold text-ink-950">{application.student ? `${application.student.firstName} ${application.student.lastName}` : "Student"}</h3><p className="mt-1 text-sm text-ink-600">{application.job?.jobTitle || "Archived Job"} · {formatJobDate(application.appliedAt)}</p></div><Button as={Link} to={`/provider/applications/${application.id}`} variant="secondary">View</Button></article>)}</div> : <EmptyCard text="No Student Applications have been received yet." />}</section></div>
  </>;
}

function EmptyCard({ text, action, to }) { return <div className="surface-card mt-5 p-8 text-center"><p className="text-sm text-ink-600">{text}</p>{action && <Button as={Link} to={to} className="mt-5">{action}</Button>}</div>; }
