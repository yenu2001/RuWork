import { useEffect, useState } from "react";
import { ArrowRight, Building2, GraduationCap, Search, ShieldAlert, ShieldCheck } from "lucide-react";
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
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

const accountOptions = [{ value: "all", label: "All approval states" }, ...["approved", "pending", "rejected"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))];
const moderationOptions = [{ value: "all", label: "All moderation states" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }];
const verifiedOptions = [{ value: "all", label: "Any email state" }, { value: "true", label: "Email verified" }, { value: "false", label: "Email not verified" }];

export default function AdminAccountsPage({ type }) {
  const provider = type === "providers";
  const label = provider ? "Job Provider" : "Student";
  const { showToast } = useToast();
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", accountStatus: "all", moderationStatus: "all", verified: "all" });
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [state, setState] = useState({ status: "loading", accounts: [], pagination: null, error: "", saving: false });

  useEffect(() => {
    let active = true;
    adminService.getAccounts(type, { ...filters, page, limit: 20 }).then((data) => {
      if (active) setState({ status: "success", accounts: data.accounts, pagination: data.pagination, error: "", saving: false });
    }).catch((error) => {
      if (active) setState({ status: "error", accounts: [], pagination: null, error: getApiError(error).message, saving: false });
    });
    return () => { active = false; };
  }, [filters, page, type]);

  function changeFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }
  function submitSearch(event) { event.preventDefault(); changeFilter("q", draftSearch.trim()); }
  async function moderate(reason) {
    const nextStatus = target.action === "suspend" ? "suspended" : "active";
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const data = await adminService.moderateAccount(type, target.account.id, nextStatus, reason);
      setState((current) => ({ ...current, saving: false, accounts: current.accounts.map((account) => account.id === data.account.id ? data.account : account) }));
      setTarget(null);
      showToast(data.message, "success");
    } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); }
  }

  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow">{provider ? <Building2 className="size-3.5" aria-hidden="true" /> : <GraduationCap className="size-3.5" aria-hidden="true" />}Admin workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">{provider ? "Job Providers" : "Students"}</h1><p className="mt-3 max-w-3xl text-ink-600">Search, inspect, and reversibly moderate {label} accounts without deleting their historical records.</p>
    <form onSubmit={submitSearch} className="surface-card mt-8 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_190px_180px_auto] xl:items-end"><FormField id={`${type}-search`} label={`Search ${provider ? "company or contact" : "name, email or study field"}`} value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} maxLength={80} /><SelectField id={`${type}-approval`} label="Approval" value={filters.accountStatus} onChange={(event) => changeFilter("accountStatus", event.target.value)} options={accountOptions} /><SelectField id={`${type}-moderation`} label="Moderation" value={filters.moderationStatus} onChange={(event) => changeFilter("moderationStatus", event.target.value)} options={moderationOptions} /><SelectField id={`${type}-verified`} label="Verification" value={filters.verified} onChange={(event) => changeFilter("verified", event.target.value)} options={verifiedOptions} /><Button type="submit"><Search className="size-4" aria-hidden="true" />Search</Button></form>
    {state.error ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}{state.status === "loading" ? <Spinner label={`Loading ${provider ? "Job Providers" : "Students"}…`} /> : null}{state.status === "success" && state.accounts.length === 0 ? <EmptyAccounts label={label} /> : null}{state.status === "success" && state.accounts.length ? <section className="mt-6 grid gap-4" aria-label={`${label} accounts`}>{state.accounts.map((account) => <AccountCard key={account.id} account={account} provider={provider} type={type} onModerate={setTarget} />)}</section> : null}<AdminPagination pagination={state.pagination} page={page} onPage={setPage} label={provider ? "Job Providers" : "Students"} /></main><ModerationDialog target={target && { ...target, label: `${target.action} ${provider ? target.account.companyName : `${target.account.firstName} ${target.account.lastName}`}` }} onClose={() => setTarget(null)} onConfirm={moderate} saving={state.saving} /></div>;
}

function EmptyAccounts({ label }) { return <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No matching {label}s</h2><p className="mt-2 text-sm text-ink-600">Try changing the search or account filters.</p></div>; }

function AccountCard({ account, provider, type, onModerate }) {
  const name = provider ? account.companyName : `${account.firstName} ${account.lastName}`;
  const email = provider ? account.companyEmail : account.email;
  const detail = provider ? `${account.industry} · ${account.companySize}` : `${account.university} · ${account.fieldOfStudy} · ${account.yearOfStudy}`;
  const suspended = account.moderationStatus === "suspended";
  return <article className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><ModerationBadge status={account.moderationStatus} /><AccountStatusBadge type="account" value={account.accountStatus} /><AccountStatusBadge type="email" value={account.isEmailVerified} /></div><h2 className="mt-4 break-words text-xl font-extrabold text-ink-950">{name}</h2><p className="mt-1 break-all text-sm font-semibold text-ink-600">{email}</p><p className="mt-3 text-sm leading-6 text-ink-600">{detail}</p><p className="mt-1 text-xs font-semibold text-ink-400">Registered {formatJobDate(account.registeredAt)}</p>{account.moderationReason ? <p className="mt-3 text-sm text-red-700"><strong>Moderation reason:</strong> {account.moderationReason}</p> : null}</div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row"><Button as={Link} to={`/admin/${type}/${account.id}`} variant="secondary">View Details <ArrowRight className="size-4" aria-hidden="true" /></Button><Button variant={suspended ? "primary" : "danger"} onClick={() => onModerate({ action: suspended ? "restore" : "suspend", account })}>{suspended ? <ShieldCheck className="size-4" aria-hidden="true" /> : <ShieldAlert className="size-4" aria-hidden="true" />}{suspended ? "Restore" : "Suspend"}</Button></div></div></article>;
}
