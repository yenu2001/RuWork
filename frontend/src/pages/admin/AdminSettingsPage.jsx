import { useEffect, useState } from "react";
import { History, Save, Settings } from "lucide-react";
import AdminPagination from "../../components/admin/AdminPagination";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

const settingDefinitions = [
  { key: "studentRegistrationOpen", label: "Student registration", description: "Allow new Student accounts to be submitted." },
  { key: "providerRegistrationOpen", label: "Job Provider registration", description: "Allow new Job Provider accounts to be submitted." },
  { key: "jobPostingOpen", label: "Job posting", description: "Allow eligible Providers to create new Jobs." }
];

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", settings: null, initial: null, audits: [], pagination: null, error: "", saving: false });
  useEffect(() => {
    let active = true;
    Promise.all([adminService.getSettings(), adminService.getAudits({ entityType: "settings", page, limit: 10 })]).then(([settings, history]) => {
      if (active) setState((current) => ({ ...current, status: "success", settings, initial: current.initial || settings, audits: history.audits, pagination: history.pagination, error: "" }));
    }).catch((error) => {
      if (active) setState((current) => ({ ...current, status: "error", error: getApiError(error).message }));
    });
    return () => { active = false; };
  }, [page]);
  async function save() {
    const payload = Object.fromEntries(settingDefinitions.map(({ key }) => [key, state.settings[key]]));
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const data = await adminService.updateSettings(payload);
      const history = await adminService.getAudits({ entityType: "settings", page: 1, limit: 10 });
      setPage(1);
      setState((current) => ({ ...current, settings: data.settings, initial: data.settings, audits: history.audits, pagination: history.pagination, saving: false }));
      showToast(data.message, "success");
    } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); }
  }
  const dirty = state.settings && settingDefinitions.some(({ key }) => state.settings[key] !== state.initial?.[key]);
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><Settings className="size-3.5" aria-hidden="true" />Admin workspace</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Settings</h1><p className="mt-3 max-w-3xl text-ink-600">Control the small allowlisted set of runtime business policies. Security and infrastructure configuration remains environment-managed.</p>{state.error ? <div className="mt-6"><Alert>{state.error}</Alert></div> : null}{state.status === "loading" ? <Spinner label="Loading Settings…" /> : null}{state.settings ? <section className="surface-card mt-8 p-6 sm:p-8"><div className="grid gap-4">{settingDefinitions.map((definition) => <SettingToggle key={definition.key} definition={definition} checked={state.settings[definition.key]} onChange={(checked) => setState((current) => ({ ...current, settings: { ...current.settings, [definition.key]: checked } }))} />)}</div><div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>Environment-managed:</strong> JWT secrets, MongoDB credentials, SMTP credentials, Admin passwords, and encryption values are intentionally unavailable here.</div><div className="mt-6 flex justify-end"><Button onClick={save} disabled={!dirty} isLoading={state.saving}><Save className="size-4" aria-hidden="true" />Save Settings</Button></div></section> : null}<section id="activity" className="surface-card mt-8 p-6 sm:p-8"><h2 className="flex items-center gap-2 text-xl font-extrabold text-ink-950"><History className="size-5 text-brand-600" aria-hidden="true" />Settings audit trail</h2>{state.status === "success" && !state.audits.length ? <p className="mt-5 text-sm text-ink-600">No Settings changes have been recorded yet.</p> : <ol className="mt-5 grid gap-3">{state.audits.map((audit) => <li key={audit.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-extrabold text-ink-900">Settings updated</p><p className="mt-1 text-xs text-ink-500">{audit.admin?.email || "Admin"} · {formatJobDate(audit.createdAt)}</p><p className="mt-2 break-words text-xs text-ink-600">{Object.keys(audit.metadata?.changes || {}).join(", ") || "Allowlisted Settings changed"}</p></li>)}</ol>}<AdminPagination pagination={state.pagination} page={page} onPage={setPage} label="Settings audit" /></section></main></div>;
}

function SettingToggle({ definition, checked, onChange }) { return <label className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><span><span className="block font-extrabold text-ink-950">{definition.label}</span><span className="mt-1 block text-sm leading-6 text-ink-600">{definition.description}</span></span><span className="flex shrink-0 items-center gap-3"><span className={`text-sm font-bold ${checked ? "text-emerald-700" : "text-red-700"}`}>{checked ? "Open" : "Closed"}</span><input type="checkbox" className="size-5 accent-brand-600" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={definition.label} /></span></label>; }
