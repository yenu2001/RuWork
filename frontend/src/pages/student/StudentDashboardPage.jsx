import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import JobCard from "../../components/jobs/JobCard";
import AppHeader from "../../components/layout/AppHeader";
import WorkspaceStatCard from "../../components/workspace/WorkspaceStatCard";
import { dashboardService } from "../../services/dashboardService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

export default function StudentDashboardPage() {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  useEffect(() => {
    let active = true;
    dashboardService.getStudentDashboard()
      .then((data) => active && setState({ status: "success", data, error: "" }))
      .catch((error) => active && setState({ status: "error", data: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [retry]);

  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12">
    <span className="eyebrow"><BriefcaseBusiness className="size-3.5" aria-hidden="true" />Student workspace</span>
    <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Dashboard</h1>
    <p className="mt-3 text-ink-600">A live overview of your Applications and current opportunities.</p>
    {state.status === "loading" && <Spinner label="Loading your dashboard…" />}
    {state.status === "error" && <div className="surface-card mt-8 p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>}
    {state.status === "success" && <DashboardContent data={state.data} />}
  </main></div>;
}

export function DashboardContent({ data }) {
  const { summary, recentApplications, recentJobs } = data;
  return <>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Application summary">
      <WorkspaceStatCard label="Pending Applications" value={summary.pendingApplications} icon={Clock3} tone="amber" />
      <WorkspaceStatCard label="In Progress" value={summary.inProgress} icon={BriefcaseBusiness} tone="blue" />
      <WorkspaceStatCard label="Completed Jobs" value={summary.completedJobs} icon={CheckCircle2} tone="emerald" />
      <WorkspaceStatCard label="Total Applications" value={summary.totalApplications} icon={FileText} />
    </section>
    <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-ink-950">Recent Applications</h2><p className="mt-1 text-sm text-ink-600">Your latest submitted Applications and decisions.</p></div><Link className="text-sm font-bold text-brand-700 hover:underline" to="/student/applications">View all</Link></div>
      {recentApplications.length ? <div className="mt-5 grid gap-3">{recentApplications.map((application) => <article key={application.id} className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><ApplicationStatusBadge status={application.status} /><h3 className="mt-3 font-extrabold text-ink-950">{application.job?.jobTitle || "Archived Job"}</h3><p className="mt-1 text-sm text-ink-600">{application.job?.companyName || "Provider"} · Applied {formatJobDate(application.appliedAt)}</p></div><Button as={Link} to={`/student/applications/${application.id}`} variant="secondary">View <ArrowRight className="size-4" aria-hidden="true" /></Button></article>)}</div> : <div className="surface-card mt-5 p-8 text-center"><p className="font-bold text-ink-950">No Applications yet</p><p className="mt-2 text-sm text-ink-600">Start with an open opportunity that fits your schedule.</p><Button as={Link} to="/jobs" className="mt-5">Find Jobs</Button></div>}
    </section>
    <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-ink-950">Recent opportunities</h2><p className="mt-1 text-sm text-ink-600">Recently published Jobs suitable for your current year.</p></div><Link className="text-sm font-bold text-brand-700 hover:underline" to="/jobs">Find Jobs</Link></div>
      {recentJobs.length ? <div className="mt-5 grid gap-4">{recentJobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className="surface-card mt-5 p-8 text-center text-sm text-ink-600">No suitable open Jobs are available right now.</div>}
    </section>
  </>;
}
