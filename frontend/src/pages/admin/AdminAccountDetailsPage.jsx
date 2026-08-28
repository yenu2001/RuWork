import { useEffect, useState } from "react";
import { ArrowLeft, Building2, GraduationCap, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ModerationBadge from "../../components/admin/ModerationBadge";
import ModerationDialog from "../../components/admin/ModerationDialog";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

export default function AdminAccountDetailsPage({ type }) {
  const { id } = useParams();
  const provider = type === "providers";
  const { showToast } = useToast();
  const [target, setTarget] = useState(null);
  const [state, setState] = useState({ status: "loading", account: null, error: "", saving: false });
  useEffect(() => { let active = true; adminService.getAccount(type, id).then((account) => active && setState({ status: "success", account, error: "", saving: false })).catch((error) => active && setState({ status: "error", account: null, error: getApiError(error).message, saving: false })); return () => { active = false; }; }, [id, type]);
  async function moderate(reason) { const status = target.action === "suspend" ? "suspended" : "active"; setState((current) => ({ ...current, saving: true, error: "" })); try { const data = await adminService.moderateAccount(type, id, status, reason); setState({ status: "success", account: data.account, error: "", saving: false }); setTarget(null); showToast(data.message, "success"); } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); } }
  const account = state.account;
  const name = account ? (provider ? account.companyName : `${account.firstName} ${account.lastName}`) : "account";
  const fields = account ? (provider ? [["Company email", account.companyEmail], ["Industry", account.industry], ["Company size", account.companySize], ["Address", account.companyAddress], ["Phone", account.phoneNumber], ["Website", account.companyWebsite], ["Primary contact", `${account.firstName} ${account.lastName}`], ["Description", account.companyDescription]] : [["University email", account.email], ["University", account.university], ["Faculty", account.faculty], ["Field of study", account.fieldOfStudy], ["Year of study", account.yearOfStudy], ["Phone", account.phoneNumber], ["Date of birth", formatJobDate(account.dateOfBirth)], ["Gender", account.gender]]) : [];
  return <div className="min-h-screen bg-surface"><AppHeader />{state.status === "loading" ? <Spinner label="Loading account…" /> : null}{state.status === "error" && !account ? <main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to={`/admin/${type}`} variant="secondary" className="mt-5">Back</Button></main> : null}{account ? <main className="page-container py-9 sm:py-12"><Link to={`/admin/${type}`} className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to {provider ? "Job Providers" : "Students"}</Link><section className="surface-card mt-6 p-6 sm:p-8"><span className="eyebrow">{provider ? <Building2 className="size-3.5" aria-hidden="true" /> : <GraduationCap className="size-3.5" aria-hidden="true" />}{provider ? "Job Provider" : "Student"} account</span><h1 className="mt-4 break-words text-3xl font-extrabold text-ink-950">{name}</h1><div className="mt-4 flex flex-wrap gap-2"><ModerationBadge status={account.moderationStatus} /><AccountStatusBadge type="account" value={account.accountStatus} /><AccountStatusBadge type="email" value={account.isEmailVerified} /></div>{state.error ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}<dl className="mt-8 grid gap-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-extrabold tracking-wide text-ink-400 uppercase">{label}</dt><dd className="mt-2 break-words text-sm font-semibold leading-6 text-ink-800">{value || "Not provided"}</dd></div>)}</dl><p className="mt-6 text-sm text-ink-600">Registered {formatJobDate(account.registeredAt)}{account.reviewedAt ? ` · Reviewed ${formatJobDate(account.reviewedAt)}` : ""}</p>{account.moderationReason ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Moderation reason:</strong> {account.moderationReason}</div> : null}<div className="mt-8 flex justify-end"><Button variant={account.moderationStatus === "suspended" ? "primary" : "danger"} onClick={() => setTarget({ action: account.moderationStatus === "suspended" ? "restore" : "suspend" })}>{account.moderationStatus === "suspended" ? <ShieldCheck className="size-4" aria-hidden="true" /> : <ShieldAlert className="size-4" aria-hidden="true" />}{account.moderationStatus === "suspended" ? "Restore Account" : "Suspend Account"}</Button></div></section></main> : null}<ModerationDialog target={target && { ...target, label: name }} onClose={() => setTarget(null)} onConfirm={moderate} saving={state.saving} /></div>;
}
