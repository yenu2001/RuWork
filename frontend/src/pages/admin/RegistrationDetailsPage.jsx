import { useEffect, useState } from "react";
import { ArrowLeft, Check, UserCheck, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Spinner from "../../components/common/Spinner";
import TextareaField from "../../components/common/TextareaField";
import AppHeader from "../../components/layout/AppHeader";
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { getApiError } from "../../utils/apiError";
import { formatJobDate } from "../../utils/jobOptions";

export default function RegistrationDetailsPage() {
  const { type, id } = useParams();
  const { showToast } = useToast();
  const [dialog, setDialog] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState({ status: "loading", registration: null, error: "", saving: false });
  useEffect(() => { let active = true; adminService.getRegistration(type, id).then((registration) => active && setState({ status: "success", registration, error: "", saving: false })).catch((error) => active && setState({ status: "error", registration: null, error: getApiError(error).message, saving: false })); return () => { active = false; }; }, [type, id]);
  async function decide(decision) {
    setState((current) => ({ ...current, saving: true, error: "" }));
    try { const data = decision === "approved" ? await adminService.approveRegistration(type, id) : await adminService.rejectRegistration(type, id, reason.trim()); setState({ status: "success", registration: data.registration, error: "", saving: false }); setDialog(""); showToast(data.message, "success"); }
    catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); }
  }
  return <div className="min-h-screen bg-surface"><AppHeader />{state.status === "loading" && <Spinner label="Loading registration…" />}{state.status === "error" && !state.registration && <main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to="/admin/registrations" variant="secondary" className="mt-5">Back to Reviews</Button></main>}{state.registration && <RegistrationDetail registration={state.registration} error={state.error} onApprove={() => setDialog("approve")} onReject={() => setDialog("reject")} />}
    <DecisionModals registration={state.registration} dialog={dialog} setDialog={setDialog} reason={reason} setReason={setReason} saving={state.saving} decide={decide} />
  </div>;
}

export function RegistrationDetail({ registration, error, onApprove, onReject }) {
  const student = registration.type === "student";
  const title = student ? `${registration.firstName} ${registration.lastName}` : registration.companyName;
  const fields = student ? [["University email", registration.email], ["University", registration.university], ["Faculty", registration.faculty], ["Field of study", registration.fieldOfStudy], ["Year of study", registration.yearOfStudy], ["Phone", registration.phoneNumber], ["Date of birth", formatJobDate(registration.dateOfBirth)], ["Gender", registration.gender]] : [["Company email", registration.companyEmail], ["Industry", registration.industry], ["Company size", registration.companySize], ["Address", registration.companyAddress], ["Phone", registration.phoneNumber], ["Website", registration.companyWebsite || "Not provided"], ["Primary contact", `${registration.firstName} ${registration.lastName}`], ["Description", registration.companyDescription]];
  return <main className="page-container py-9 sm:py-12"><Link to="/admin/registrations" className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to Registration Reviews</Link><section className="surface-card mt-6 p-6 sm:p-8"><span className="eyebrow"><UserCheck className="size-3.5" aria-hidden="true" />{student ? "Student registration" : "Provider registration"}</span><h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-950">{title}</h1><div className="mt-4 flex flex-wrap gap-2"><AccountStatusBadge type="email" value={registration.isEmailVerified} /><AccountStatusBadge type="account" value={registration.accountStatus} /></div>{error && <div className="mt-5"><Alert>{error}</Alert></div>}<dl className="mt-8 grid gap-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-extrabold tracking-wide text-ink-400 uppercase">{label}</dt><dd className="mt-2 break-words text-sm font-semibold leading-6 text-ink-800">{value || "Not provided"}</dd></div>)}</dl><p className="mt-6 text-sm text-ink-600">Registered {formatJobDate(registration.registeredAt)}</p>{registration.rejectionReason && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Rejection reason:</strong> {registration.rejectionReason}</div>}{registration.accountStatus === "pending" && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="danger" onClick={onReject}><X className="size-4" aria-hidden="true" />Reject</Button><Button type="button" onClick={onApprove} disabled={!registration.isEmailVerified}><Check className="size-4" aria-hidden="true" />Approve</Button></div>}{registration.accountStatus === "pending" && !registration.isEmailVerified && <p className="mt-3 text-right text-xs font-semibold text-amber-700">Approval becomes available after email verification.</p>}</section></main>;
}

function DecisionModals({ registration, dialog, setDialog, reason, setReason, saving, decide }) {
  if (!registration) return null;
  const name = registration.type === "student" ? `${registration.firstName} ${registration.lastName}` : registration.companyName;
  return <><Modal isOpen={dialog === "approve"} onClose={() => !saving && setDialog("")} eyebrow="Approve Registration" title="Approve this registration?" description={`${name} will receive normal ${registration.type === "student" ? "Student" : "Job Provider"} access.`}><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDialog("")} disabled={saving}>Cancel</Button><Button onClick={() => decide("approved")} isLoading={saving}>Approve Registration</Button></div></Modal><Modal isOpen={dialog === "reject"} onClose={() => !saving && setDialog("")} eyebrow="Reject Registration" title="Reject this registration?" description={`${name} will see the rejected account state. A concise reason is optional.`}><TextareaField id="registration-rejection-reason" label="Reason (optional)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} helper="Keep the explanation factual and professional." /><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDialog("")} disabled={saving}>Cancel</Button><Button variant="danger" onClick={() => decide("rejected")} isLoading={saving}>Reject Registration</Button></div></Modal></>;
}
