import { useEffect, useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import AdminPagination from "../../components/admin/AdminPagination";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import SelectField from "../../components/common/SelectField";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

const AUDIT_ACTIONS = [
  "REGISTRATION_APPROVED", "REGISTRATION_REJECTED",
  "STUDENT_SUSPENDED", "STUDENT_RESTORED",
  "PROVIDER_SUSPENDED", "PROVIDER_RESTORED",
  "JOB_HIDDEN", "JOB_RESTORED",
  "REVIEW_HIDDEN", "REVIEW_RESTORED", "REVIEW_DELETED",
  "SETTINGS_UPDATED"
];
const AUDIT_ENTITY_TYPES = [
  { value: "registration", label: "Registrations" },
  { value: "student", label: "Students" },
  { value: "jobProvider", label: "Job Providers" },
  { value: "job", label: "Jobs" },
  { value: "review", label: "Reviews" },
  { value: "settings", label: "Settings" }
];

const readable = (action) => action.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const actionOptions = [{ value: "all", label: "All actions" }, ...AUDIT_ACTIONS.map((value) => ({ value, label: readable(value) }))];
const entityOptions = [{ value: "all", label: "All record types" }, ...AUDIT_ENTITY_TYPES];

function summarize(audit) {
  const metadata = audit.metadata || {};
  const changes = Object.keys(metadata.changes || {});
  if (changes.length) return `Changed ${changes.join(", ")}`;
  if (metadata.reason) return `Reason: ${metadata.reason}`;
  if (metadata.from && metadata.to) return `${metadata.from} → ${metadata.to}`;
  if (metadata.decision) return `Decision: ${metadata.decision}`;
  return "No additional detail recorded";
}

export default function AdminAuditTrailPage() {
  const [filters, setFilters] = useState({ action: "all", entityType: "all" });
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "loading", audits: [], pagination: null, error: "" });
  useEffect(() => {
    let active = true;
    adminService.getAudits({ ...filters, page, limit: 20 })
      .then((data) => active && setState({ status: "success", audits: data.audits, pagination: data.pagination, error: "" }))
      .catch((error) => active && setState({ status: "error", audits: [], pagination: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [filters, page, retry]);
  function changeFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><ShieldCheck className="size-3.5" aria-hidden="true" />Admin workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Audit Trail</h1><p className="mt-3 max-w-3xl text-ink-600">Every Admin decision is recorded by the server with its own identity and timestamp. Records are read-only and cannot be edited or removed.</p><div className="surface-card mt-8 grid gap-4 p-5 sm:grid-cols-2"><SelectField id="audit-action" label="Action" value={filters.action} onChange={(event) => changeFilter("action", event.target.value)} options={actionOptions} /><SelectField id="audit-entity" label="Record type" value={filters.entityType} onChange={(event) => changeFilter("entityType", event.target.value)} options={entityOptions} /></div>{state.status === "error" ? <div className="surface-card mt-6 p-6"><Alert>{state.error}</Alert><Button className="mt-5" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div> : null}{state.status === "loading" ? <Spinner label="Loading audit records…" /> : null}{state.status === "success" && !state.audits.length ? <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No matching audit records</h2><p className="mt-2 text-sm text-ink-600">No Admin action has been recorded for this action and record type.</p></div> : null}{state.status === "success" && state.audits.length ? <ol className="mt-6 grid gap-4" aria-label="Audit records">{state.audits.map((audit) => <AuditRecord key={audit.id} audit={audit} />)}</ol> : null}<AdminPagination pagination={state.pagination} page={page} onPage={setPage} label="Audit trail" /></main></div>;
}

function AuditRecord({ audit }) {
  return <li className="surface-card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700"><History className="size-3.5" aria-hidden="true" />{readable(audit.action)}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-ink-600 capitalize">{audit.entityType}</span></div><p className="mt-3 text-sm font-semibold text-ink-800">{summarize(audit)}</p><p className="mt-2 break-all text-xs text-ink-500">Record {audit.entityId}</p></div><div className="shrink-0 text-sm lg:text-right"><p className="font-extrabold text-ink-900">{audit.admin?.email || "Admin"}</p><p className="mt-1 text-xs text-ink-500">{formatJobDate(audit.createdAt)}</p></div></div></li>;
}
