import { useEffect, useState } from "react";
import { ArrowRight, Building2, GraduationCap, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPagination from "../../components/admin/AdminPagination";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

const typeFilters = [{ value: "all", label: "All types" }, { value: "student", label: "Students" }, { value: "jobProvider", label: "Job Providers" }];
const statusFilters = ["pending", "approved", "rejected"];

export default function RegistrationReviewsPage() {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("pending");
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", registrations: [], pagination: null, error: "" });
  useEffect(() => { let active = true; adminService.getRegistrations({ status, type: type === "all" ? undefined : type, page, limit: 20 }).then((data) => active && setState({ status: "success", registrations: data.registrations, pagination: data.pagination, error: "" })).catch((error) => active && setState({ status: "error", registrations: [], pagination: null, error: getApiError(error).message })); return () => { active = false; }; }, [type, status, page, retry]);
  function choose(setter, value) { setter(value); setPage(1); setState((current) => ({ ...current, status: "loading" })); }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><UserCheck className="size-3.5" aria-hidden="true" />Admin workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Registration Reviews</h1><p className="mt-3 text-ink-600">Inspect real registration information before approving or rejecting access.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><fieldset><legend className="mb-2 text-xs font-extrabold tracking-wide text-ink-600 uppercase">Account type</legend><div className="flex flex-wrap gap-2">{typeFilters.map((item) => <button type="button" key={item.value} onClick={() => choose(setType, item.value)} aria-pressed={type === item.value} className={`rounded-full px-4 py-2 text-sm font-bold ${type === item.value ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600"}`}>{item.label}</button>)}</div></fieldset><fieldset><legend className="mb-2 text-xs font-extrabold tracking-wide text-ink-600 uppercase">Review state</legend><div className="flex flex-wrap gap-2">{statusFilters.map((item) => <button type="button" key={item} onClick={() => choose(setStatus, item)} aria-pressed={status === item} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${status === item ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-ink-600"}`}>{item}</button>)}</div></fieldset></div>
    {state.status === "loading" && <Spinner label="Loading registrations…" />}{state.status === "error" && <div className="surface-card mt-6 p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>}{state.status === "success" && !state.registrations.length && <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No matching registrations</h2><p className="mt-2 text-sm text-ink-600">There are no accounts in this review state for the selected type.</p></div>}{state.status === "success" && state.registrations.length > 0 && <div className="mt-6 grid gap-4">{state.registrations.map((registration) => <RegistrationCard key={`${registration.type}-${registration.id}`} registration={registration} />)}</div>}
    <AdminPagination pagination={state.pagination} page={page} onPage={setPage} label="Registrations" />
  </main></div>;
}

function RegistrationCard({ registration }) {
  const student = registration.type === "student";
  const title = student ? `${registration.firstName} ${registration.lastName}` : registration.companyName;
  const email = student ? registration.email : registration.companyEmail;
  return <article className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700">{student ? <GraduationCap className="size-3.5" aria-hidden="true" /> : <Building2 className="size-3.5" aria-hidden="true" />}{student ? "Student" : "Job Provider"}</span><AccountStatusBadge type="email" value={registration.isEmailVerified} /><AccountStatusBadge type="account" value={registration.accountStatus} /></div><h2 className="mt-4 text-xl font-extrabold text-ink-950">{title}</h2><p className="mt-1 text-sm font-semibold text-ink-600">{email}</p><p className="mt-3 text-sm text-ink-600">{student ? `${registration.fieldOfStudy} · ${registration.yearOfStudy}` : `${registration.industry} · ${registration.companySize}`} · Registered {formatJobDate(registration.registeredAt)}</p></div><Button as={Link} to={`/admin/registrations/${registration.type}/${registration.id}`} variant="secondary">View Details <ArrowRight className="size-4" aria-hidden="true" /></Button></div></article>;
}
